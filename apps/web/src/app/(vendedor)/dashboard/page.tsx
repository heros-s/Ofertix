import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { logout } from '../../(auth)/actions';
import OnboardingForm from './onboarding-form';
import { LayoutDashboard, Store, DollarSign, ShoppingBag, TrendingUp, LogOut, Plus } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Verifica autenticação no servidor
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Verifica se o usuário é do tipo VENDEDOR (VENDOR)
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.type !== 'VENDOR') {
    redirect('/login');
  }

  // 3. Busca dados cadastrais do vendedor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header do Painel */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              Ofertix Vendedor
            </span>
          </div>

          <div className="flex items-center gap-4">
            {vendor && (
              <Link
                href="/produtos"
                className="text-sm font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors mr-2"
              >
                <ShoppingBag className="h-4 w-4" /> Meus Produtos
              </Link>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {vendor?.store_name || profile.name}
              </p>
              <p className="text-xs text-slate-500">
                {profile.email}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600 transition-all duration-200"
                title="Sair da conta"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!vendor ? (
          // Caso o vendedor ainda não tenha feito onboarding
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-slate-250 rounded-2xl p-6 sm:p-10 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Bem-vindo à Ofertix!
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Para começar a vender e receber repasses diretos, precisamos criar sua subconta de vendedor no Asaas. Por favor, preencha os dados da sua loja abaixo.
                </p>
              </div>

              {/* Formulário Interativo de Onboarding (Client Component) */}
              <OnboardingForm />
            </div>
          </div>
        ) : (
          // Caso o onboarding esteja concluído
          <div className="space-y-8">
            {/* Boas vindas */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Olá, {vendor.store_name}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Acompanhe aqui o faturamento e o status das suas vendas.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Conta Ativa no Asaas
              </div>
            </div>

            {/* Grid de Indicadores */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card Faturamento Bruto */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Faturamento Bruto
                  </p>
                  <p className="text-2xl font-bold text-slate-900">R$ 0,00</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              {/* Card Faturamento Líquido */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Faturamento Líquido (95%)
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">R$ 0,00</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              {/* Card Total de Vendas */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total de Pedidos
                  </p>
                  <p className="text-2xl font-bold text-slate-900">0</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <ShoppingBag className="h-6 w-6" />
                </div>
              </div>

              {/* Card Ticket Médio */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ticket Médio
                  </p>
                  <p className="text-2xl font-bold text-slate-900">R$ 0,00</p>
                </div>
                <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">Gerenciar Catálogo</h3>
                  <p className="text-slate-500 text-sm">Cadastre novos produtos ou edite os preços, estoque e fotos do seu catálogo ativo.</p>
                </div>
                <div className="flex gap-3">
                  <Link href="/produtos" className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-200">
                    Ver Meus Produtos
                  </Link>
                  <Link href="/produtos/novo" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all duration-200">
                    <Plus className="h-4 w-4" /> Adicionar Produto
                  </Link>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">Kits Promocionais</h3>
                  <p className="text-slate-500 text-sm">Crie kits agrupando múltiplos produtos com descontos percentuais para impulsionar suas vendas.</p>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs font-semibold select-none cursor-not-allowed">
                    Gerenciar Kits (Em breve)
                  </span>
                </div>
              </div>
            </div>

            {/* Informações da Subconta */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Detalhes da Integração Financeira
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-slate-400">CPF / CNPJ da Loja</p>
                  <p className="text-slate-800 font-mono mt-1">
                    {vendor.cpf_cnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Asaas Wallet ID (Split)</p>
                  <p className="text-slate-800 font-mono mt-1 select-all bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                    {vendor.asaas_wallet_id}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Status Cadastral</p>
                  <p className="text-slate-800 mt-1 capitalize">
                    {vendor.status === 'ACTIVE' ? 'Ativo (Homologado)' : 'Pendente'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
