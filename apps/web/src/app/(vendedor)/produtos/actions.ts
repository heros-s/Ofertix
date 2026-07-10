'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Cria um novo produto no backend NestJS.
 */
export async function createProduct(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const categoryId = formData.get('categoryId') as string;
  const priceStr = formData.get('price') as string;
  const stockStr = formData.get('stock') as string;
  
  // Captura todas as URLs de imagens inseridas no formulário (inputs ocultos name="images")
  const images = formData.getAll('images') as string[];

  if (!name || !categoryId || !priceStr || !stockStr) {
    return { error: 'Nome, categoria, preço e estoque são obrigatórios.' };
  }

  const price = parseFloat(priceStr);
  const stock = parseInt(stockStr, 10);

  if (isNaN(price) || price <= 0) {
    return { error: 'O preço deve ser um número maior que zero.' };
  }

  if (isNaN(stock) || stock < 0) {
    return { error: 'O estoque não pode ser negativo.' };
  }

  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { error: 'Sessão expirada. Faça login novamente.' };
  }

  const jwtToken = session.access_token;

  try {
    const response = await fetch(`${backendUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        name,
        description: description || undefined,
        categoryId,
        price,
        stock,
        images,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return { error: responseData.message || 'Falha ao cadastrar o produto.' };
    }
  } catch (err: any) {
    return { error: `Erro de conexão com o servidor: ${err.message}` };
  }

  revalidatePath('/produtos');
  redirect('/produtos');
}

/**
 * Atualiza um produto existente no backend NestJS.
 */
export async function updateProduct(productId: string, prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const categoryId = formData.get('categoryId') as string;
  const priceStr = formData.get('price') as string;
  const stockStr = formData.get('stock') as string;
  const activeStr = formData.get('active') as string;
  
  // Captura todas as URLs das imagens
  const images = formData.getAll('images') as string[];

  if (!name || !categoryId || !priceStr || !stockStr) {
    return { error: 'Nome, categoria, preço e estoque são obrigatórios.' };
  }

  const price = parseFloat(priceStr);
  const stock = parseInt(stockStr, 10);
  const active = activeStr === 'true';

  if (isNaN(price) || price <= 0) {
    return { error: 'O preço deve ser um número maior que zero.' };
  }

  if (isNaN(stock) || stock < 0) {
    return { error: 'O estoque não pode ser negativo.' };
  }

  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { error: 'Sessão expirada. Faça login novamente.' };
  }

  const jwtToken = session.access_token;

  try {
    const response = await fetch(`${backendUrl}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        name,
        description: description || undefined,
        categoryId,
        price,
        stock,
        images,
        active,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return { error: responseData.message || 'Falha ao atualizar o produto.' };
    }
  } catch (err: any) {
    return { error: `Erro de conexão com o servidor: ${err.message}` };
  }

  revalidatePath('/produtos');
  redirect('/produtos');
}

/**
 * Exclui fisicamente um produto.
 */
export async function deleteProduct(productId: string) {
  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const jwtToken = session.access_token;

  try {
    const response = await fetch(`${backendUrl}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.message || 'Falha ao excluir o produto.');
    }
  } catch (err: any) {
    throw new Error(err.message || 'Erro ao conectar ao servidor.');
  }

  revalidatePath('/produtos');
}

/**
 * Inativa (desativa logicamente) um produto para que ele não apareça mais na vitrine.
 */
export async function inactivateProduct(productId: string) {
  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const jwtToken = session.access_token;

  try {
    const response = await fetch(`${backendUrl}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ active: false }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.message || 'Falha ao inativar o produto.');
    }
  } catch (err: any) {
    throw new Error(`Erro ao inativar produto: ${err.message}`);
  }

  revalidatePath('/produtos');
}

/**
 * Reativa um produto inativo.
 */
export async function reactivateProduct(productId: string) {
  const supabase = await createClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const jwtToken = session.access_token;

  try {
    const response = await fetch(`${backendUrl}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ active: true }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.message || 'Falha ao reativar o produto.');
    }
  } catch (err: any) {
    throw new Error(`Erro ao reativar produto: ${err.message}`);
  }

  revalidatePath('/produtos');
}
