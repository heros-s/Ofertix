import Header from '@/components/layout/header';
import ProductCard from '@/components/product/product-card';
import HeroBannerCarousel from '@/components/home/hero-banner-carousel';
import Link from 'next/link';
import { ShoppingBag, SearchX } from 'lucide-react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface HomePageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const { search, category } = await searchParams;

  // 1. Busca produtos ativos aplicando filtros de busca e categoria no backend NestJS
  let products = [];
  let fetchError = null;

  let productsUrl = `${backendUrl}/products?active=true`;
  if (search) {
    productsUrl += `&search=${encodeURIComponent(search)}`;
  }
  if (category) {
    productsUrl += `&categoryId=${encodeURIComponent(category)}`;
  }

  try {
    const response = await fetch(productsUrl, { cache: 'no-store' });
    if (response.ok) {
      products = await response.json();
    } else {
      fetchError = 'Falha ao buscar produtos da vitrine.';
    }
  } catch (err: any) {
    fetchError = `Não foi possível conectar com o backend: ${err.message}`;
  }

  // 2. Busca categoria ativa se houver filtro para exibir no título
  let activeCategoryName = '';
  if (category) {
    try {
      const catRes = await fetch(`${backendUrl}/categories`, { cache: 'force-cache' });
      if (catRes.ok) {
        const categories = await catRes.json();
        const activeCat = categories.find((c: any) => c.id === category);
        if (activeCat) {
          activeCategoryName = activeCat.name;
        }
      }
    } catch (e) {
      // Ignora erro do nome da categoria
    }
  }

  const isFiltered = !!(search || category);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header do Marketplace */}
      <Header />

      {/* Hero Banner (Apenas se não houver busca/filtros ativos para manter foco nos resultados) */}
      {!isFiltered && <HeroBannerCarousel />}

      {/* Seção da Vitrine */}
      <main id="vitrine" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Título da Vitrine / Resultados de Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between border-b border-slate-200 pb-5 gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {search && `Resultados para "${search}"`}
              {category && !search && `Categoria: ${activeCategoryName}`}
              {!isFiltered && 'Nossos Produtos'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isFiltered 
                ? `Encontramos ${products.length} ${products.length === 1 ? 'produto correspondente' : 'produtos correspondentes'}.`
                : 'Descubra os produtos incríveis publicados pelos nossos vendedores parceiros.'
              }
            </p>
          </div>

          {isFiltered && (
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 transition-colors border-b-2 border-primary-600 pb-0.5"
            >
              Limpar Filtros
            </Link>
          )}
        </div>

        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-semibold text-center">
            {fetchError}
          </div>
        )}

        {/* Listagem em Grid */}
        {products.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <SearchX className="h-8 w-8 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Nenhum produto encontrado</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Tente ajustar os termos de pesquisa ou escolha outra categoria para encontrar o que procura.
              </p>
            </div>
            {isFiltered && (
              <Link
                href="/"
                className="inline-flex justify-center items-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 py-2.5 px-5 text-sm font-semibold text-white shadow transition-all duration-200"
              >
                Voltar para Vitrine Completa
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-10 mt-20 text-slate-400 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="font-semibold text-slate-300">Ofertix Marketplace Multi-vendedor — Projeto MVP</p>
          <p>© 2026 Ofertix. Todos os direitos reservados. Split de pagamentos automatizado via Asaas Sandbox.</p>
        </div>
      </footer>
    </div>
  );
}
