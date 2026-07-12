'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Realiza o login do usuário com e-mail e senha com tratamento robusto de erros.
 */
export async function login(prevState: any, formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'E-mail e senha são obrigatórios.' };
    }

    const supabase = await createClient();

    // 1. Efetua a autenticação no Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    const user = data.user;

    // 2. Busca o tipo do usuário na tabela pública 'users'
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Perfil de usuário não encontrado na base de dados.' };
    }

    // 3. Redireciona conforme o tipo de conta
    if (profile.type === 'VENDOR') {
      redirect('/dashboard');
    } else {
      redirect('/');
    }
  } catch (err: any) {
    // Relança a exceção de redirecionamento interno do Next.js para que o framework faça o redirect
    if (err.digest?.startsWith('NEXT_REDIRECT') || err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return { error: err.message || 'Ocorreu um erro inesperado no login.' };
  }
}

/**
 * Cadastra um novo usuário com tratamento robusto de erros.
 */
export async function signup(prevState: any, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const type = formData.get('type') as 'CONSUMER' | 'VENDOR';

    if (!name || !email || !password || !type) {
      return { error: 'Todos os campos são obrigatórios.' };
    }

    if (password.length < 6) {
      return { error: 'A senha deve possuir pelo menos 6 caracteres.' };
    }

    const supabase = await createClient();

    // Efetua o cadastro no Supabase Auth passando os metadados
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          type,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Ocorreu um erro inesperado no cadastro.' };
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Realiza o login do usuário com e-mail e senha com tratamento robusto de erros.
 */
export async function login(prevState: any, formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'E-mail e senha são obrigatórios.' };
    }

    const supabase = await createClient();

    // 1. Efetua a autenticação no Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    const user = data.user;

    // 2. Busca o tipo do usuário na tabela pública 'users'
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Perfil de usuário não encontrado na base de dados.' };
    }

    // 3. Redireciona conforme o tipo de conta
    if (profile.type === 'VENDOR') {
      redirect('/dashboard');
    } else {
      redirect('/');
    }
  } catch (err: any) {
    // Relança a exceção de redirecionamento interno do Next.js para que o framework faça o redirect
    if (err.digest?.startsWith('NEXT_REDIRECT') || err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return { error: err.message || 'Ocorreu um erro inesperado no login.' };
  }
}

/**
 * Cadastra um novo usuário com tratamento robusto de erros.
 */
export async function signup(prevState: any, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const type = formData.get('type') as 'CONSUMER' | 'VENDOR';

    if (!name || !email || !password || !type) {
      return { error: 'Todos os campos são obrigatórios.' };
    }

    if (password.length < 6) {
      return { error: 'A senha deve possuir pelo menos 6 caracteres.' };
    }

    const supabase = await createClient();

    // Efetua o cadastro no Supabase Auth passando os metadados
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          type,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Ocorreu um erro inesperado no cadastro.' };
  }
}

/**
 * Efetua o encerramento da sessão (logout) do usuário.
 */
export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    // ignore error on logout
  }
  redirect('/login');
}
export async function signInWithProvider(provider: 'google' | 'microsoft' | 'apple') {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error('NEXT_PUBLIC_SITE_URL is not set');
    throw new Error('Site URL not configured');
  }
  const redirectUrl = `${siteUrl}/api/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl },
  });
  if (error) {
    console.error('OAuth signInWithProvider error:', error);
    throw error;
  }
  // data.url contains the URL to redirect the user for OAuth flow
  redirect(data.url);
}
