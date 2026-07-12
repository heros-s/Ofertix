// Rota que processa o retorno do OAuth do Supabase (troca o code pela sessão e redireciona)
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // "next" é um parâmetro opcional para redirecionar para uma página específica após login
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Obtém o usuário para decidir para onde redirecionar
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('type')
          .eq('id', user.id)
          .single();

        if (profile?.type === 'VENDOR') {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
        return NextResponse.redirect(`${origin}/`);
      }
    }
  }

  // Fallback em caso de erro na troca do code
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
