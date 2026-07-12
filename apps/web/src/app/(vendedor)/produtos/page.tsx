import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProductActions from './product-actions';
import { Store, Plus, Edit, LayoutDashboard, AlertCircle } from 'lucide-react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default async function ProductsListPage() {
  const supabase = await createClient();

  // 1. Verifica autenticação no servidor
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Busca perfil e verifica se é VENDEDOR (VENDOR)
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.type !== 'VENDOR') {
    redirect('/login');
  }

  // 3. Busca dados do vendedor (para ver se concluiu onboarding)
  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!vendor) {
    redirect('/dashboard');
  }

  // 4. Busca todos os produtos do vendedor no backend NestJS (incluindo inativos)
  let products = [];
  let fetchError = null;

  try {
    const response = await fetch(`${backendUrl}/products?vendorId=${vendor.user_id}&active=false`, {
      cache: 'no-store',
    });
    if (response.ok) {
      products = await response.json();
    } else {
      fetchError = 'Não foi possível carregar a lista de produtos.';
    }
  } catch (err: any) {
    fetchError = `Erro ao conectar com o backend: ${err.message}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg border border-primary-100 text-primary-600">
              <Store className="h-5 w-5" />
            </div>
            <Link href="/dashboard" className="text-xl font-bold tracking-tight text-slate-900 hover:text-primary-600 transition-colors">
              Ofertix Vendedor
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-200"
            >
              <LayoutDashboard className="h-4 w-4" /> Painel Geral
            </Link>
            <Link
              href="/produtos/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-semibold text-sm shadow-md hover:shadow-primary-600/10 transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Novo Produto
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Meus Produtos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gerencie os produtos publicados na vitrine do marketplace Ofertix.
            </p>
          </div>
        </div>

        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="h-5 w-5" /> {fetchError}
          </div>
        )}

        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-6 mt-8">
            <div className="w-16 h-16 bg-slate-50 border border-slate-150 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Store className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Nenhum produto cadastrado</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                Você ainda não publicou nenhum item na Ofertix. Cadastre seu primeiro produto para começar a vender.
              </p>
            </div>
            <Link
              href="/produtos/novo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-semibold text-sm shadow-md transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Cadastrar Meu Primeiro Produto
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Produto</th>
                    <th className="py-4 px-6">Categoria</th>
                    <th className="py-4 px-6">Preço</th>
                    <th className="py-4 px-6">Estoque</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {products.map((product: any) => {
                    const hasImages = product.images && product.images.length > 0;
                    const imageUrl = hasImages ? product.images[0] : '/placeholder-product.svg';

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                            {hasImages ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Store className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {product.categories?.name || 'Sem Categoria'}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          R$ {parseFloat(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-semibold ${product.stock === 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            {product.stock} {product.stock === 1 ? 'unidade' : 'unidades'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            product.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-150 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${product.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {product.active ? 'Visível' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                          <Link
                            href={`/produtos/${product.id}/editar`}
                            className="inline-flex items-center gap-1 p-2 border border-slate-200 hover:border-primary-600 hover:bg-primary-50 text-slate-600 hover:text-primary-600 rounded-lg text-xs font-semibold transition-all duration-200"
                            title="Editar produto"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <ProductActions productId={product.id} active={product.active} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
