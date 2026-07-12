'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart-context';
import { ChevronLeft, User, Phone, Mail, FileText, Lock, MapPin, Loader2, ArrowRight } from 'lucide-react';

export default function CheckoutRegisterPage() {
  const router = useRouter();
  const { cart, cartTotal, isMounted } = useCart();
  const supabase = createClient();

  // Estados dos inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  
  // Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Garante que o usuário logado não consiga acessar essa tela
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/checkout');
      }
    });
  }, [router]);

  // Se o carrinho estiver vazio, volta para a home
  useEffect(() => {
    if (isMounted && cart.length === 0) {
      router.push('/');
    }
  }, [cart, isMounted, router]);

  // Auxiliares de Formatação
  const formatPhone = (val: string) => {
    const num = val.replace(/\D/g, '');
    if (num.length <= 2) return num;
    if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`;
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`;
  };

  const formatCPF = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 11);
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)}.${num.slice(3)}`;
    if (num.length <= 9) return `${num.slice(0, 3)}.${num.slice(3, 6)}.${num.slice(6)}`;
    return `${num.slice(0, 3)}.${num.slice(3, 6)}.${num.slice(6, 9)}-${num.slice(9)}`;
  };

  const formatCEP = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 8);
    if (num.length <= 5) return num;
    return `${num.slice(0, 5)}-${num.slice(5)}`;
  };

  // Validador de CPF
  const validateCPF = (rawCpf: string) => {
    const cleanCPF = rawCpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    let sum = 0;
    let rest;

    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  };

  // Hook para busca de CEP
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setCepLoading(true);
      setErrorMsg('');
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (data.erro) {
            setErrorMsg('CEP não encontrado. Por favor, preencha manualmente.');
          } else {
            setStreet(data.logradouro || '');
            setNeighborhood(data.bairro || '');
            setCity(data.localidade || '');
            setState(data.uf || '');
            // Limpa o erro caso tenha sido preenchido com sucesso
            setValidationErrors((prev) => {
              const next = { ...prev };
              delete next.cep;
              return next;
            });
          }
        })
        .catch(() => {
          setErrorMsg('Erro ao buscar CEP. Preencha o endereço manualmente.');
        })
        .finally(() => {
          setCepLoading(false);
        });
    }
  }, [cep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setValidationErrors({});

    // Validações
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Nome completo é obrigatório';
    if (!email.trim()) errors.email = 'E-mail é obrigatório';
    if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Telefone inválido';
    if (!validateCPF(cpf)) errors.cpf = 'CPF inválido';
    if (password.length < 6) errors.password = 'A senha deve ter no mínimo 6 caracteres';
    if (cep.replace(/\D/g, '').length !== 8) errors.cep = 'CEP inválido';
    if (!street.trim()) errors.street = 'Rua/Avenida é obrigatória';
    if (!number.trim()) errors.number = 'Número é obrigatório';
    if (!neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório';
    if (!city.trim()) errors.city = 'Cidade é obrigatória';
    if (state.trim().length !== 2) errors.state = 'UF deve ter 2 caracteres';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // 1. Cadastra no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            type: 'CONSUMER',
          },
        },
      });

      if (signUpError || !signUpData.user) {
        throw new Error(signUpError?.message || 'Falha ao cadastrar usuário.');
      }

      const userId = signUpData.user.id;

      // 2. Atualiza o perfil na tabela pública 'users'
      const { error: profileError } = await supabase
        .from('users')
        .update({
          phone: phone.replace(/\D/g, ''),
          cpf: cpf.replace(/\D/g, ''),
        })
        .eq('id', userId);

      if (profileError) {
        throw new Error(`Falha ao salvar dados de CPF e telefone: ${profileError.message}`);
      }

      // 3. Insere o endereço na tabela 'user_addresses'
      const { error: addressError } = await supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          zip_code: cep.replace(/\D/g, ''),
          street,
          number,
          complement: complement.trim() || null,
          neighborhood,
          city,
          state: state.toUpperCase(),
          is_default: isDefault,
        });

      if (addressError) {
        throw new Error(`Falha ao salvar endereço de entrega: ${addressError.message}`);
      }

      // 4. Sucesso! Redireciona para o checkout
      router.push('/checkout');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar o seu cadastro.');
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  const shippingValue = cart.length > 0 ? 15.00 : 0.00;
  const grandTotal = cartTotal + shippingValue;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Botão Voltar */}
        <div>
          <Link
            href="/carrinho"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para o carrinho
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-3">Dados para Entrega</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre-se rapidamente para preencher seus dados de envio e pagamento.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário (Col 1 e 2) */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            
            {/* Seção 1: Dados Pessoais */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                <User className="h-5 w-5 text-primary-600" /> Dados Pessoais
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nome Completo</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full bg-slate-50 border ${
                        validationErrors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-primary-500'
                      } text-sm rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all`}
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                  {validationErrors.name && <p className="text-xs text-rose-500 font-semibold">{validationErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">E-mail</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-slate-50 border ${
                        validationErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-primary-500'
                      } text-sm rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all`}
                      placeholder="exemplo@email.com"
                    />
                  </div>
                  {validationErrors.email && <p className="text-xs text-rose-500 font-semibold">{validationErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Telefone Celular</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className={`w-full bg-slate-50 border ${
                        validationErrors.phone ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-primary-500'
                      } text-sm rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all`}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  {validationErrors.phone && <p className="text-xs text-rose-500 font-semibold">{validationErrors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">CPF</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className={`w-full bg-slate-50 border ${
                        validationErrors.cpf ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-primary-500'
                      } text-sm rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all`}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  {validationErrors.cpf && <p className="text-xs text-rose-500 font-semibold">{validationErrors.cpf}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Senha de Acesso</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-slate-50 border ${
                        validationErrors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-primary-500'
                      } text-sm rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all`}
                      placeholder="No mínimo 6 dígitos"
                    />
                  </div>
                  {validationErrors.password && <p className="text-xs text-rose-500 font-semibold">{validationErrors.password}</p>}
                </div>
              </div>
            </div>

            {/* Seção 2: Endereço de Entrega */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                <MapPin className="h-5 w-5 text-primary-600" /> Endereço de Entrega
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(formatCEP(e.target.value))}
                      className={`w-full bg-slate-50 border ${
                        validationErrors.cep ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:border-primary-500'
                      } text-sm rounded-xl py-3 px-4 focus:outline-none focus:ring-1 transition-all`}
                      placeholder="00000-000"
                    />
                    {cepLoading && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                  {validationErrors.cep && <p className="text-xs text-rose-500 font-semibold">{validationErrors.cep}</p>}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Rua / Logradouro</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className={`w-full bg-slate-50 border ${
                      validationErrors.street ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'
                    } text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-primary-500 transition-all`}
                    placeholder="Av. Paulista, etc."
                  />
                  {validationErrors.street && <p className="text-xs text-rose-500 font-semibold">{validationErrors.street}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className={`w-full bg-slate-50 border ${
                      validationErrors.number ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'
                    } text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-primary-500 transition-all`}
                    placeholder="123"
                  />
                  {validationErrors.number && <p className="text-xs text-rose-500 font-semibold">{validationErrors.number}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Complemento</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-primary-500 transition-all"
                    placeholder="Apto 45, Bloco B (Opcional)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className={`w-full bg-slate-50 border ${
                      validationErrors.neighborhood ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'
                    } text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-primary-500 transition-all`}
                    placeholder="Centro"
                  />
                  {validationErrors.neighborhood && <p className="text-xs text-rose-500 font-semibold">{validationErrors.neighborhood}</p>}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full bg-slate-50 border ${
                      validationErrors.city ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'
                    } text-sm rounded-xl py-3 px-4 focus:outline-none focus:border-primary-500 transition-all`}
                    placeholder="São Paulo"
                  />
                  {validationErrors.city && <p className="text-xs text-rose-500 font-semibold">{validationErrors.city}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado / UF</label>
                  <input
                    type="text"
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className={`w-full bg-slate-50 border ${
                      validationErrors.state ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200'
                    } text-sm rounded-xl py-3 px-4 text-center focus:outline-none focus:border-primary-500 transition-all`}
                    placeholder="SP"
                  />
                  {validationErrors.state && <p className="text-xs text-rose-500 font-semibold">{validationErrors.state}</p>}
                </div>
              </div>

              {/* Checkbox Tornar Padrão */}
              <div className="flex items-center gap-2.5 pt-4">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer"
                />
                <label htmlFor="isDefault" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Salvar este endereço como meu endereço de entrega padrão
                </label>
              </div>
            </div>

            {/* Botão de Enviar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-primary-600/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" /> Processando Cadastro...
                </>
              ) : (
                <>
                  Salvar e Ir para Pagamento <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Resumo da Compra (Col 3) */}
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
                    {shippingValue === 0 ? 'Grátis' : `R$ ${shippingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-3.5 flex justify-between text-sm">
                  <span className="font-extrabold text-slate-900">Total:</span>
                  <span className="font-black text-slate-950 text-base">
                    R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
