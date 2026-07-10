import Header from '@/components/layout/header';
import ProductCard from '@/components/product/product-card';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, Store, PackageX, Sparkles, Calendar } from 'lucide-react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface VendorStorePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorStorePage({ params }: VendorStorePageProps) {
  const { id } = await params;

  // 1. Busca perfil do vendedor na API pública
  let vendor = null;
  let products = [];
  let errorMsg = null;

  try {
    const vendorRes = await fetch(`${backendUrl}/vendors/${id}`, { cache: 'no-store' });
    if (vendorRes.ok) {
      vendor = await vendorRes.json();
      
      // Se encontrou o vendedor, busca seus produtos ativos
      const productsRes = await fetch(`${backendUrl}/products?active=true&vendorId=${id}`, { cache: 'no-store' });
      if (productsRes.ok) {
        products = await productsRes.json();
      }
    } else {
      errorMsg = 'A loja solicitada não foi encontrada ou não está ativa.';
    }
  } catch (err: any) {
    errorMsg = `Erro ao conectar com o servidor do marketplace: ${err.message}`;
  }

  if (errorMsg || !vendor) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">Loja Indisponível</h2>
            <p className="text-slate-500 text-sm">{errorMsg || 'Esta loja pode ter sido suspensa ou não existe.'}</p>
            <Link
              href="/"
              className="inline-flex justify-center items-center rounded-xl bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-indigo-700 transition-all duration-200"
            >
              Voltar para a Vitrine
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const creationDate = new Date(vendor.createdAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-indigo-650 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-400">Lojas Parceiras</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-semibold truncate max-w-[200px]">
            {vendor.storeName}
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Botão Voltar */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar para a Vitrine
        </Link>

        {/* Banner da Loja */}
        <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl overflow-hidden relative border border-white/10 shadow-lg p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left z-10">
            {/* Logo da Loja */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/20 select-none">
              {vendor.storeName.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {vendor.storeName}
              </h1>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg uppercase tracking-wider">
                  Vendedor Ativo
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Parceiro desde {creationDate}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center sm:text-right z-10 text-xs">
            <p className="text-slate-400 font-semibold uppercase tracking-wider">Total do Catálogo</p>
            <p className="text-2xl font-black text-white mt-0.5">{products.length} {products.length === 1 ? 'produto' : 'produtos'}</p>
          </div>
        </section>

        {/* Grade de Produtos */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Todos os Produtos Desta Loja</h2>
            <p className="text-slate-500 text-xs mt-1">Navegue pelas ofertas publicadas diretamente por este vendedor.</p>
          </div>

          {products.length === 0 ? (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <PackageX className="h-8 w-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Catálogo Vazio</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Este vendedor ainda não possui nenhum produto ativo cadastrado ou disponível em estoque no momento.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
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
