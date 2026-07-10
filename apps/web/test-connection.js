const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carrega variáveis de ambiente do .env local manualmente
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error("❌ Arquivo .env não encontrado em:", envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("==========================================");
console.log("🔍 Diagnóstico de Conexão com Supabase");
console.log("==========================================");
console.log("URL do Supabase :", url);
console.log("Anon Key        :", key ? `Presente (${key.substring(0, 15)}...)` : "Ausente");

if (!url || !key) {
  console.error("❌ Erro: Credenciais NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes no .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function runTest() {
  try {
    // 1. Testa leitura simples do banco de dados na tabela pública
    console.log("\n1. Testando leitura no banco de dados (tabela 'categories')...");
    const { data: readData, error: readError } = await supabase.from('categories').select('*').limit(1);
    
    if (readError) {
      console.error("❌ Erro ao consultar tabela 'categories':", readError.message);
      console.error("Detalhes do erro do banco:", readError);
    } else {
      console.log("✅ Conexão e leitura no banco de dados OK!");
      console.log("Dados lidos de categories:", readData);
    }

    // 2. Testa criação de conta no Supabase Auth
    console.log("\n2. Testando criação de conta no Supabase Auth...");
    const testEmail = `teste-${Date.now()}@ofertix.com`;
    const testPassword = "senhaTeste123456";
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: "Teste de Diagnóstico",
          type: "CONSUMER"
        }
      }
    });

    if (authError) {
      console.error("❌ Falha ao registrar no Supabase Auth:", authError.message);
      console.error("Status:", authError.status);
      console.error("Objeto do erro:", authError);
    } else {
      console.log("✅ Cadastro no Supabase Auth realizado com sucesso!");
      console.log("ID do Usuário Criado:", authData.user?.id);
      console.log("E-mail Cadastrado   :", authData.user?.email);
      console.log("Status da Confirmação:", authData.user?.identities?.[0]?.identity_data?.email_verified ? "Confirmado" : "Pendente (Verificação de e-mail ativa)");
      
      // 3. Testa se o perfil público correspondente foi inserido pela trigger do banco
      console.log("\n3. Verificando se a trigger criou o perfil em 'public.users'...");
      // Espera 1.5 segundos para garantir que a trigger executou
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const adminSupabase = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile, error: profileError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("❌ Erro ao buscar perfil em 'public.users':", profileError.message);
      } else if (!profile) {
        console.error("❌ Perfil NÃO encontrado na tabela 'public.users'. A trigger falhou ou não disparou!");
      } else {
        console.log("✅ Perfil público criado com sucesso pela trigger!");
        console.log("Dados do Perfil:", profile);
      }
    }
  } catch (err) {
    console.error("❌ Erro inesperado ao executar o diagnóstico:", err);
  }
}

runTest();
