import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '../product-form';
import { createProduct } from '../actions';
import { Store, ChevronLeft } from 'lucide-react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default async function NewProductPage() {
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

  // 4. Busca categorias no backend NestJS para popular o formulário
  let categories = [];
  try {
    const response = await fetch(`${backendUrl}/categories`, {
      cache: 'force-cache', // Pode fazer cache, já que categorias mudam pouco
      next: { revalidate: 3600 } // Revalida a cada 1 hora
    });
    if (response.ok) {
      categories = await response.json();
    }
  } catch (err) {
    console.error('Erro ao buscar categorias para o form:', err);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
              <Store className="h-5 w-5" />
            </div>
            <Link href="/produtos" className="text-xl font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors">
              Ofertix Vendedor
            </Link>
          </div>

          <Link
            href="/produtos"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar para Meus Produtos
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Novo Produto
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre os detalhes do produto para colocá-lo à venda na Ofertix.
          </p>
        </div>

        <ProductForm categories={categories} action={createProduct} />
      </main>
    </div>
  );
}
