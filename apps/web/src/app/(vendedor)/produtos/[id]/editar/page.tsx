import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '../../product-form';
import { updateProduct } from '../../actions';
import { Store, ChevronLeft, AlertCircle } from 'lucide-react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
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

  // 4. Busca o produto a ser editado no backend NestJS
  let product = null;
  let productError = null;

  try {
    const response = await fetch(`${backendUrl}/products/${id}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      product = await response.json();

      // Segurança: garante que o produto pertence ao vendedor autenticado
      if (product.vendor_id !== vendor.user_id) {
        redirect('/produtos');
      }
    } else {
      productError = 'Produto não encontrado.';
    }
  } catch (err: any) {
    productError = `Erro ao carregar detalhes do produto: ${err.message}`;
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center font-sans p-6">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="h-12 w-12 text-rose-600 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Erro de Carregamento</h2>
          <p className="text-slate-500 text-sm">{productError || 'O produto selecionado não pôde ser encontrado.'}</p>
          <Link
            href="/produtos"
            className="inline-flex justify-center items-center rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 py-2.5 px-4 text-sm font-semibold text-white hover:from-primary-600 hover:to-primary-800 transition-all duration-200"
          >
            Voltar para Meus Produtos
          </Link>
        </div>
      </div>
    );
  }

  // 5. Busca categorias no backend NestJS para popular o formulário
  let categories = [];
  try {
    const response = await fetch(`${backendUrl}/categories`, {
      cache: 'force-cache',
      next: { revalidate: 3600 }
    });
    if (response.ok) {
      categories = await response.json();
    }
  } catch (err) {
    console.error('Erro ao buscar categorias para o form de edição:', err);
  }

  // Faz o bind do ID do produto na Server Action de update
  const updateProductAction = updateProduct.bind(null, id);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg border border-primary-100 text-primary-600">
              <Store className="h-5 w-5" />
            </div>
            <Link href="/produtos" className="text-xl font-bold tracking-tight text-slate-900 hover:text-primary-600 transition-colors">
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
            Editar Produto
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Altere as especificações, preço, fotos ou estoque do produto.
          </p>
        </div>

        <ProductForm
          categories={categories}
          initialData={{
            id: product.id,
            name: product.name,
            description: product.description || '',
            category_id: product.category_id || '',
            price: parseFloat(product.price),
            stock: product.stock,
            images: product.images || [],
            active: product.active,
          }}
          action={updateProductAction}
        />
      </main>
    </div>
  );
}
