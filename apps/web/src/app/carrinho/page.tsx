'use client';

import Header from '@/components/layout/header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart, CartItem } from '@/lib/cart-context';
import { Trash2, Plus, Minus, Store, ChevronLeft, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { cart, updateQuantity, removeFromCart, cartTotal, isMounted } = useCart();

  // Valor do frete fixo simulado para o MVP
  const shippingValue = cart.length > 0 ? 15.00 : 0.00;
  const grandTotal = cartTotal + shippingValue;

  // Agrupa os itens do carrinho por vendedor
  const groupedItems = isMounted
    ? cart.reduce((acc, item) => {
        if (!acc[item.vendorId]) {
          acc[item.vendorId] = {
            storeName: item.storeName,
            items: [],
          };
        }
        acc[item.vendorId].items.push(item);
        return acc;
      }, {} as Record<string, { storeName: string; items: CartItem[] }>)
    : {};

  const vendorsList = Object.entries(groupedItems);

  const handleCheckout = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      router.push('/checkout');
    } else {
      router.push('/checkout/cadastro');
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meu Carrinho</h1>
          <p className="text-slate-500 text-sm mt-1">
            Revise e organize os itens antes de prosseguir para o checkout.
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-slate-50 border border-slate-150 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Seu carrinho está vazio</h2>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                Nenhum produto foi adicionado ainda. Explore nossa vitrine para encontrar as melhores ofertas.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white font-semibold text-sm shadow-md transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar para a Vitrine
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Listagem de Itens Agrupados */}
            <div className="lg:col-span-2 space-y-6">
              {vendorsList.map(([vendorId, data]) => (
                <div key={vendorId} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Nome da Loja Vendedora */}
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <Store className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                      Loja: {data.storeName}
                    </h3>
                  </div>

                  {/* Itens da Loja */}
                  <div className="divide-y divide-slate-100">
                    {data.items.map((item) => (
                      <div key={item.id} className="py-4 flex flex-col sm:flex-row items-center gap-4 justify-between first:pt-0 last:pb-0">
                        {/* Imagem e Nome */}
                        <div className="flex items-center gap-4 w-full sm:max-w-md">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 rounded-xl border border-slate-200 object-cover bg-slate-50"
                          />
                          <div>
                            <Link href={`/produtos/${item.id}`} className="font-bold text-slate-900 hover:text-indigo-650 transition-colors line-clamp-2">
                              {item.name}
                            </Link>
                            <p className="text-xs text-slate-450 mt-1 font-semibold">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / un
                            </p>
                          </div>
                        </div>

                        {/* Quantidade e Preço Total do Item */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                          {/* Seletor de Quantidade */}
                          <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-inner">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-2 hover:bg-slate-50 text-slate-500 transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-3 text-xs font-extrabold text-slate-900 min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-2 hover:bg-slate-50 text-slate-500 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Preço Total do Lote de Itens */}
                          <div className="text-right min-w-[100px]">
                            <p className="font-extrabold text-slate-900">
                              R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>

                          {/* Botão de Remover */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Remover produto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Continuar Comprando
              </Link>
            </div>

            {/* Resumo Financeiro (Checkout info) */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3">Resumo do Pedido</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal dos produtos:</span>
                    <span className="font-bold text-slate-800">
                      R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Frete unificado:</span>
                    <span className="font-bold text-emerald-600">
                      {shippingValue === 0 ? 'Grátis' : `R$ ${shippingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-between text-base">
                    <span className="font-extrabold text-slate-900">Total a pagar:</span>
                    <span className="font-black text-slate-900 text-lg">
                      R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-755 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:shadow-indigo-650/20 transition-all duration-200"
                >
                  Fechar Compra <ArrowRight className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Informação sobre Split / Segurança */}
              <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                <div className="p-2 bg-indigo-600 rounded-xl text-white mt-0.5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Compra Garantida Ofertix</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Pague com Pix, boleto ou cartão em um único pagamento unificado. O Asaas dividirá automaticamente o valor com cada vendedor com segurança.
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
