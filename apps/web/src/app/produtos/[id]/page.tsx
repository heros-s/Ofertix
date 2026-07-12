import Header from '@/components/layout/header';
import ProductDetailBuy from './product-detail-buy';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, Star, ThumbsUp, ShieldCheck, Truck, RefreshCw, Store } from 'lucide-react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  // 1. Busca os detalhes do produto no backend NestJS
  let product = null;
  let errorMsg = null;

  try {
    const response = await fetch(`${backendUrl}/products/${id}`, { cache: 'no-store' });
    if (response.ok) {
      product = await response.json();
    } else {
      errorMsg = 'O produto solicitado não foi encontrado no servidor.';
    }
  } catch (err: any) {
    errorMsg = `Erro ao conectar ao servidor do backend: ${err.message}`;
  }

  if (errorMsg || !product) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Produto não encontrado</h2>
            <p className="text-slate-500 text-sm">{errorMsg || 'Este produto pode ter sido inativado ou removido pelo vendedor.'}</p>
            <Link
              href="/"
              className="inline-flex justify-center items-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-2.5 px-4 text-sm font-semibold text-white hover:from-primary-600 hover:to-primary-800 transition-all duration-200"
            >
              Voltar para a Vitrine
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const categoryName = product.categories?.name || 'Geral';
  const storeName = product.vendors?.store_name || 'Loja Parceira';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header />

      {/* Navegação Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-primary-700 transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/?category=${product.category_id}`} className="hover:text-primary-700 transition-colors">
            {categoryName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Botão Voltar */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar para a Vitrine
        </Link>

        {/* Bloco do Topo (Compra e Fotos) */}
        <ProductDetailBuy product={product} />

        {/* Ficha técnica / Descrição */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-slate-200 pt-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">Descrição do Produto</h2>
              <p className="text-slate-650 text-sm leading-relaxed whitespace-pre-line font-medium">
                {product.description || 'Nenhuma descrição fornecida para este produto pelo vendedor.'}
              </p>
            </div>

            {/* Garantias Ofertix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-xl text-primary-600 mt-0.5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Compra Segura</p>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Garantia Ofertix de repasse seguro após envio.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-xl text-primary-600 mt-0.5">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Frete Único</p>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Adicione itens de vários vendedores e pague um frete fixo.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-50 rounded-xl text-primary-600 mt-0.5">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-slate-900">Estorno Facilitado</p>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Atendimento rápido para devoluções via Asaas.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ficha Vendedor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-900">Sobre o Vendedor</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary-100 text-primary-700 font-bold rounded-xl flex items-center justify-center">
                  {storeName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-950">{storeName}</p>
                  <p className="text-xs text-slate-500">Parceiro ativo no marketplace</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total de produtos:</span>
                  <span className="font-semibold text-slate-800">Mais de 10 cadastros</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tempo de entrega médio:</span>
                  <span className="font-semibold text-slate-800">3 a 5 dias úteis</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <Link
                  href={`/loja/${product.vendor_id}`}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl border border-primary-600 text-primary-600 hover:bg-primary-50 py-2.5 px-4 text-xs font-bold transition-all duration-200"
                >
                  <Store className="h-4 w-4" /> Visitar Loja Completa
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Avaliações do Produto (Mock Estético Premium) */}
        <div className="border-t border-slate-200 pt-10 space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-slate-900">Avaliações dos Clientes</h2>
            <span className="text-xs text-slate-400 font-semibold">(2 avaliações no total)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Resumo de Avaliações */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center space-y-3">
              <p className="text-5xl font-black text-slate-900 leading-none">4.5</p>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
                <Star className="h-5 w-5 text-amber-400 fill-current opacity-30" />
              </div>
              <p className="text-xs text-slate-550 font-medium">Recomendado por 100% dos compradores</p>
            </div>

            {/* Comentários Mock */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-850">Carlos H.</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
                    <span className="text-[10px] text-slate-400 font-semibold">Compra verificada</span>
                  </div>
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  "Excelente produto! A entrega foi super rápida, chegou bem embalado. A qualidade me surpreendeu bastante, condiz perfeitamente com a descrição do vendedor. Recomendo muito!"
                </p>
                <button className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 transition-colors">
                  <ThumbsUp className="h-3 w-3" /> Útil (4)
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-850">Mariana S.</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
                    <span className="text-[10px] text-slate-400 font-semibold">Compra verificada</span>
                  </div>
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-current opacity-30" />
                  </div>
                </div>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                  "O produto é ótimo e atende muito bem. Tive um pequeno atraso na transportadora mas a Ofertix me deu suporte rápido. O vendedor respondeu minhas mensagens de dúvidas. Recomendo!"
                </p>
                <button className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-450 hover:text-slate-700 transition-colors">
                  <ThumbsUp className="h-3 w-3" /> Útil (1)
                </button>
              </div>
            </div>
          </div>
        </div>
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
