'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart-context';
import { ChevronLeft, MapPin, CreditCard, QrCode, Receipt, ShieldCheck, CheckCircle2, Loader2, Landmark } from 'lucide-react';

interface Address {
  id: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, clearCart, isMounted, addToCart } = useCart();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Opções de pagamento
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  
  // Status de finalização
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [simulatedPixKey, setSimulatedPixKey] = useState('');
  
  // Recomendações de produtos (cross-selling)
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  // Busca dados do usuário logado e seus endereços
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // Se não logado, envia para cadastro
        router.push('/checkout/cadastro');
        return;
      }
      setUser(user);

      // Busca perfil público
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(userProfile);

      // Busca endereço padrão do usuário
      const { data: addresses } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (addresses && addresses.length > 0) {
        setAddress(addresses[0]);
      }
      setLoading(false);
    });
  }, [router]);

  // Se o carrinho estiver vazio e a compra não foi concluída, volta para home
  useEffect(() => {
    if (isMounted && cart.length === 0 && !orderSuccess) {
      router.push('/');
    }
  }, [cart, isMounted, orderSuccess, router]);

  // Busca produtos recomendados (que não estejam no carrinho e que tenham estoque)
  useEffect(() => {
    if (!isMounted) return;
    
    fetch(`${backendUrl}/products?active=true`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Falha ao buscar produtos');
      })
      .then((data) => {
        const cartIds = new Set(cart.map(item => item.id));
        const filtered = data.filter((p: any) => !cartIds.has(p.id) && p.stock > 0);
        
        // Se após filtrar os itens do carrinho não restar nenhum produto real cadastrado,
        // geramos produtos mock elegantes para demonstração do MVP
        if (filtered.length === 0) {
          const mocks = [
            {
              id: 'mock-recomenda-1',
              name: 'Smartwatch Sport Fit',
              price: 199.90,
              images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'],
              stock: 10,
              vendor_id: 'mock-vendor',
              vendors: { store_name: 'Tech Store' }
            },
            {
              id: 'mock-recomenda-2',
              name: 'Fone de Ouvido Bluetooth Premium',
              price: 349.90,
              images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80'],
              stock: 5,
              vendor_id: 'mock-vendor',
              vendors: { store_name: 'Audio Hub' }
            },
            {
              id: 'mock-recomenda-3',
              name: 'Óculos de Sol Classic Polarized',
              price: 129.90,
              images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&auto=format&fit=crop&q=80'],
              stock: 8,
              vendor_id: 'mock-vendor',
              vendors: { store_name: 'Style Vision' }
            },
            {
              id: 'mock-recomenda-4',
              name: 'Garrafa Térmica Inox Vacuum 750ml',
              price: 89.90,
              images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80'],
              stock: 15,
              vendor_id: 'mock-vendor',
              vendors: { store_name: 'Active Life' }
            }
          ];
          setRecommendedProducts(mocks.slice(0, 2)); // Mostra 2 mocks
        } else {
          setRecommendedProducts(filtered.slice(0, 4));
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar produtos recomendados:', err);
        // Se a requisição falhar (ex: backend offline), também ativa mocks para o MVP continuar testável
        const mocks = [
          {
            id: 'mock-recomenda-1',
            name: 'Smartwatch Sport Fit',
            price: 199.90,
            images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'],
            stock: 10,
            vendor_id: 'mock-vendor',
            vendors: { store_name: 'Tech Store' }
          },
          {
            id: 'mock-recomenda-2',
            name: 'Fone de Ouvido Bluetooth Premium',
            price: 349.90,
            images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80'],
            stock: 5,
            vendor_id: 'mock-vendor',
            vendors: { store_name: 'Audio Hub' }
          }
        ];
        setRecommendedProducts(mocks);
      });
  }, [cart, isMounted, backendUrl]);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    
    // Simula a criação do pagamento/split no Asaas Sandbox
    setTimeout(async () => {
      if (paymentMethod === 'PIX') {
        setSimulatedPixKey('00020126360014br.gov.bcb.pix0114ofertixcheckoutmvp2026520400005303986540615.005802BR5907Ofertix6009Sao Paulo62070503***6304ABCD');
      }
      
      setIsSubmitting(false);
      setOrderSuccess(true);
      clearCart(); // Esvazia o carrinho local do cliente
    }, 1500);
  };

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </main>
      </div>
    );
  }

  const shippingValue = 15.00;
  const grandTotal = cartTotal + shippingValue;

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        <Header />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pedido Recebido com Sucesso!</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Seu pedido foi registrado. A cobrança foi gerada na conta Ofertix com split configurado para os respectivos vendedores.
            </p>
          </div>

          {/* Pix QR Code simulation */}
          {paymentMethod === 'PIX' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-sm mx-auto space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                <QrCode className="h-4.5 w-4.5 text-indigo-600" /> Pagamento via PIX (Simulação)
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 inline-block">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ofertix-sandbox-pix-split-mvp"
                  alt="PIX QR Code"
                  className="mx-auto h-36 w-36"
                />
              </div>
              <div className="space-y-1.5 text-left text-xs">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Chave Copia e Cola:</p>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg break-all font-mono text-[10px] select-all text-slate-700">
                  {simulatedPixKey}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'BOLETO' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-sm mx-auto space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                <Receipt className="h-4.5 w-4.5 text-indigo-600" /> Cobrança em Boleto (Simulação)
              </h3>
              <p className="text-xs text-slate-500">O boleto em sandbox do Asaas foi emitido. Em produção, o cliente recebe o PDF para pagamento.</p>
              <button className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all">
                Visualizar Boleto Simulado
              </button>
            </div>
          )}

          {paymentMethod === 'CREDIT_CARD' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-sm mx-auto space-y-4">
              <p className="text-sm text-slate-600">
                Pagamento pré-autorizado via cartão de crédito. O split de pagamentos do Asaas creditará os valores líquidos nas subcontas automaticamente.
              </p>
            </div>
          )}

          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex justify-center items-center rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 px-6 font-bold text-sm text-white shadow transition-all duration-200"
            >
              Voltar para a Vitrine
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <Link
            href="/carrinho"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para o carrinho
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-3">Finalizar Compra</h1>
          <p className="text-slate-500 text-sm mt-1">
            Escolha a forma de pagamento para consolidar seu pedido multi-vendedor.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dados de Pagamento e Envio */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Seção Endereço */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                <MapPin className="h-5 w-5 text-indigo-600" /> Endereço de Entrega
              </h2>

              {address ? (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mt-0.5">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">{address.street}, Nº {address.number}</p>
                    {address.complement && <p className="text-slate-500 text-xs">{address.complement}</p>}
                    <p className="text-slate-500 text-xs">{address.neighborhood} — {address.city}/{address.state}</p>
                    <p className="text-slate-400 text-xs font-semibold mt-1">CEP {address.zip_code.replace(/(\d{5})(\d{3})/, "$1-$2")}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-slate-500">Nenhum endereço de entrega cadastrado.</p>
                  <Link
                    href="/checkout/cadastro"
                    className="inline-flex py-2 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    Cadastrar Endereço
                  </Link>
                </div>
              )}
            </div>

            {/* Seção Forma de Pagamento */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="h-5 w-5 text-indigo-600" /> Forma de Pagamento
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all ${
                    paymentMethod === 'PIX'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <QrCode className="h-6 w-6" />
                  <span className="text-xs font-bold">PIX (Split Asaas)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-xs font-bold">Cartão de Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('BOLETO')}
                  className={`flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all ${
                    paymentMethod === 'BOLETO'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Receipt className="h-6 w-6" />
                  <span className="text-xs font-bold">Boleto Bancário</span>
                </button>
              </div>
            </div>

            {/* Produtos Recomendados (Cross-selling) */}
            {recommendedProducts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    Aproveite para Adicionar
                  </h2>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Recomendações
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedProducts.map((product) => {
                    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
                    const hasImages = product.images && product.images.length > 0;
                    const imageUrl = hasImages ? product.images[0] : '/placeholder-product.svg';
                    const storeName = product.vendors?.store_name || 'Loja Parceira';
                    
                    return (
                      <div 
                        key={product.id} 
                        className="flex gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all duration-250 group"
                      >
                        <div className="relative h-16 w-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200/60">
                          <img 
                            src={imageUrl} 
                            alt={product.name} 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 truncate leading-snug" title={product.name}>
                              {product.name}
                            </h4>
                            <p className="text-[9px] font-semibold text-slate-400 truncate uppercase mt-0.5">
                              {storeName}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-1.5 mt-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                addToCart({
                                  id: product.id,
                                  name: product.name,
                                  price: price,
                                  image: imageUrl,
                                  vendorId: product.vendor_id,
                                  storeName: storeName,
                                  stock: product.stock,
                                });
                              }}
                              className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-sm hover:shadow hover:shadow-indigo-600/10 active:scale-95 transition-all"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Resumo da Compra & Fechar Pedido */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
                Resumo do Pedido
              </h3>

              <div className="max-h-60 overflow-y-auto space-y-3.5 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-3 text-xs justify-between items-center">
                    <img src={item.image} alt={item.name} className="h-10 w-10 object-cover rounded-lg border border-slate-100" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-slate-400 text-[10px]">Qtd: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-slate-900">
                      R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Frete unificado:</span>
                  <span className="font-bold text-emerald-600">
                    R$ {shippingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-3.5 flex justify-between text-sm">
                  <span className="font-extrabold text-slate-900">Total a pagar:</span>
                  <span className="font-black text-slate-950 text-base">
                    R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !address}
                className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    Confirmar Pagamento
                  </>
                )}
              </button>
            </div>

            {/* Informação sobre Split / Segurança */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-sm flex items-start gap-4">
              <div className="p-2 bg-indigo-600 rounded-xl text-white mt-0.5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs">Compra Segura Asaas</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Transações protegidas por criptografia SSL. Split automático processado em conformidade com as regras do Asaas Gateway.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
