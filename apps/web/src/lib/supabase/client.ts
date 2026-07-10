import { createBrowserClient } from '@supabase/ssr';

/**
 * Cria um cliente do Supabase para uso em Client Components (executados no navegador).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
