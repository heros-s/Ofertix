import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas de requisição exceto:
     * - Arquivos estáticos (_next/static)
     * - Otimização de imagens (_next/image)
     * - Favicon (favicon.ico)
     * - Arquivos de mídia (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
