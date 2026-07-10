# Guia de Auditoria e Validação de RLS (Row Level Security)

Este documento detalha quais políticas de segurança no nível de linha (RLS) devem estar ativas no Supabase para o estado atual da aplicação Ofertix, além de fornecer um passo a passo prático de como testar e validar se elas estão de fato bloqueando acessos indevidos.

---

## 1. RLS Críticas para o Módulo Atual

Com a implementação do cadastro de consumidores e endereços no checkout, estas são as políticas fundamentais que devem estar aplicadas:

| Tabela | Operação | Regra de Negócio | Expressão SQL da Política |
| :--- | :--- | :--- | :--- |
| **`users`** | `SELECT` | Qualquer usuário logado pode ler seu próprio perfil. | `(auth.uid() = id)` |
| | `UPDATE` | Um usuário só pode atualizar os seus próprios dados (ex: CPF, Telefone). | `(auth.uid() = id)` |
| **`user_addresses`** | `ALL` (CRUD) | Somente o dono do endereço pode visualizar, cadastrar, alterar ou excluir. | `(auth.uid() = user_id)` |
| **`products`** | `SELECT` | Qualquer visitante pode ver produtos ativos. O vendedor dono pode ver os dele mesmo inativos. | `(active = true OR auth.uid() = vendor_id)` |
| | `INSERT/UPDATE` | Apenas o vendedor dono do produto pode criá-lo ou modificá-lo. | `(auth.uid() = vendor_id)` |
| **`categories`** | `SELECT` | Qualquer pessoa (mesmo deslogada) pode listar categorias. | `true` (Acesso público de leitura) |

> [!IMPORTANT]
> Lembre-se de sempre habilitar a RLS na tabela antes de criar as políticas. Se a RLS não estiver habilitada com `ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;`, a tabela continuará totalmente pública e ignorará as políticas.

---

## 2. Como Validar se as RLS estão Aplicadas

Existem duas formas principais de validar o comportamento das regras: pelo **Console de Consultas SQL do Supabase** (mais seguro/técnico) ou diretamente pelo **Console do Navegador** no frontend.

### Método A: Validação via SQL Editor (Supabase Dashboard)

Você pode simular o comportamento de um usuário logado usando blocos de transação SQL. Execute o seguinte script no SQL Editor para testar a segurança da tabela `user_addresses`:

```sql
-- Inicia uma transação temporária para podermos testar e dar Rollback (não salvar sujeira)
BEGIN;

-- 1. Cria um usuário fictício de teste "A" e outro "B" na auth.users
INSERT INTO auth.users (id, email) 
VALUES 
  ('00000000-0000-0000-0000-00000000000a', 'userA@test.com'),
  ('00000000-0000-0000-0000-00000000000b', 'userB@test.com')
ON CONFLICT DO NOTHING;

-- Garante perfil correspondente na public.users
INSERT INTO public.users (id, email, name, type)
VALUES 
  ('00000000-0000-0000-0000-00000000000a', 'userA@test.com', 'Usuário A', 'CONSUMER'),
  ('00000000-0000-0000-0000-00000000000b', 'userB@test.com', 'Usuário B', 'CONSUMER')
ON CONFLICT DO NOTHING;

-- 2. Insere um endereço para o Usuário A
INSERT INTO public.user_addresses (user_id, zip_code, street, number, neighborhood, city, state)
VALUES ('00000000-0000-0000-0000-00000000000a', '01310-000', 'Av. Paulista', '100', 'Bela Vista', 'São Paulo', 'SP');

-- 3. SIMULAÇÃO DE RLS: Vamos fingir que somos o Usuário B
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b"}';

-- TESTE 1: Tentar ler o endereço do Usuário A (deve retornar 0 registros devido à RLS)
SELECT * FROM public.user_addresses; 

-- TESTE 2: Tentar invadir e inserir um endereço em nome do Usuário A (deve falhar e dar erro de permissão)
INSERT INTO public.user_addresses (user_id, zip_code, street, number, neighborhood, city, state)
VALUES ('00000000-0000-0000-0000-00000000000a', '20040-002', 'Av. Rio Branco', '50', 'Centro', 'Rio de Janeiro', 'RJ');

-- Desfaz todas as inserções de teste e simulações automaticamente
ROLLBACK;
```

---

### Método B: Validação rápida pelo Console do Navegador

Quando você estiver logado no sistema com uma conta de teste no navegador:

1. Abra o **Console do Desenvolvedor** (F12 ou Ctrl+Shift+I).
2. Execute o código abaixo para tentar obter endereços de outro ID de usuário:
   ```javascript
   // Substitua por um UUID aleatório de outro usuário que você saiba que existe
   const outroUserId = 'coloque-um-uuid-de-outro-usuario-aqui';
   
   // Importa o client do supabase instanciado no seu app
   const supabase = window.supabase; // ou obtenha do contexto do React
   
   const { data, error } = await supabase
     .from('user_addresses')
     .select('*')
     .eq('user_id', outroUserId);
     
   console.log('Dados recebidos:', data);
   console.log('Erro retornado:', error);
   ```

3. **Como interpretar os resultados**:
   * **Se RLS estiver ativa e funcionando**: `data` retornará um array vazio (`[]`) e nenhum erro. O Postgres filtra silenciosamente linhas que o usuário não tem permissão de ver.
   * **Se RLS não estiver ativa**: você verá a lista com todos os endereços daquele outro usuário.
   * Ao tentar um `UPDATE` ou `INSERT` no console para dados de outro usuário, o Supabase retornará um erro explícito de violação de política ou não afetará nenhuma linha.
