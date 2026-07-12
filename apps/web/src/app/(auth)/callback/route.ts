// This route handles the OAuth callback from Supabase and redirects the user appropriately

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Fetch user type from public users table
    const { data: profile } = await supabase
      .from('users')
      .select('type')
      .eq('id', user.id)
      .single();

    if (profile?.type === 'VENDOR') {
      redirect('/dashboard');
    } else {
      redirect('/');
    }
  }

  // Fallback if no user (e.g., error)
  redirect('/login');
}
