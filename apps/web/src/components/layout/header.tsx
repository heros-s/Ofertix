'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { createClient } from '@/lib/supabase/client';
import { ShoppingBag, Search, User, LogOut, ChevronDown, Store } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartItemsCount, isMounted } = useCart();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const supabase = createClient();

  // Carrega autenticação e categorias
  useEffect(() => {
    // 1. Carrega dados do usuário
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Busca perfil do usuário para saber se é VENDOR ou CONSUMER
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    });

    // 2. Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(data);
      } else {
        setUserProfile(null);
      }
    });

    // 3. Carrega categorias da API NestJS
    fetch(`${backendUrl}/categories`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Falha ao buscar categorias');
      })
      .then((data) => setCategories(data))
      .catch((err) => console.error('Erro no fetch de categorias:', err));

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sincroniza valor de busca com a URL
  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push('/');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="p-1.5 bg-indigo-600 rounded-xl text-white">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Ofertix
          </span>
        </Link>

        {/* Barra de Pesquisa */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative hidden md:block">
          <input
            type="text"
            placeholder="O que você está procurando hoje?"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-slate-800 text-white placeholder-slate-400 text-sm rounded-xl py-3 pl-4 pr-10 border border-slate-700/50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
          />
          <button type="submit" className="absolute right-3 top-3 text-slate-400 hover:text-indigo-400 transition-colors">
            <Search className="h-5 w-5" />
          </button>
        </form>

        {/* Ações */}
        <div className="flex items-center gap-4">
          {/* Link para o Dashboard Vendedor se for VENDEDOR */}
          {userProfile?.type === 'VENDOR' && (
            <Link
              href="/dashboard"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10"
            >
              <Store className="h-3.5 w-3.5" /> Painel de Vendas
            </Link>
          )}

          {/* Carrinho */}
          <Link
            href="/carrinho"
            className="p-2 hover:bg-slate-800 rounded-xl transition-all duration-200 relative text-slate-300 hover:text-white"
            title="Ver carrinho de compras"
          >
            <ShoppingBag className="h-6 w-6" />
            {isMounted && cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-in zoom-in-50 duration-200">
                {cartItemsCount}
              </span>
            )}
          </Link>

          {/* Usuário / Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-1 hover:bg-slate-800 rounded-xl transition-all duration-200 text-left focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-xs max-w-[120px] truncate">
                  <p className="font-semibold text-white leading-tight">{userProfile?.name || 'Usuário'}</p>
                  <p className="text-slate-400 text-[10px] truncate">{userProfile?.type === 'VENDOR' ? 'Vendedor' : 'Consumidor'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 text-sm text-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-700 text-xs text-slate-400 truncate">
                    {user.email}
                  </div>
                  {userProfile?.type === 'VENDOR' && (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700 transition-colors"
                    >
                      <Store className="h-4 w-4" /> Painel de Vendedor
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-rose-900/30 hover:text-rose-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white font-semibold text-sm shadow-md transition-all duration-200"
              >
                Cadastrar
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sub-header de Categorias Rápidas */}
      {categories.length > 0 && (
        <div className="border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-x-auto scrolling-touch">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-6 text-xs text-slate-300 whitespace-nowrap">
            <Link href="/" className="hover:text-white transition-colors font-semibold">
              Todos os Produtos
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className="hover:text-white transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="p-1.5 bg-indigo-600 rounded-xl text-white">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
              Ofertix
            </span>
          </div>
          <div className="h-8 bg-slate-800 rounded-xl w-32 animate-pulse" />
        </div>
      </div>
    }>
      <HeaderContent />
    </Suspense>
  );
}
