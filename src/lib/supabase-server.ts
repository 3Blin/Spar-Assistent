// SERVER-ONLY – never import this from a 'use client' component.
// Uses next/headers (cookies) which is only available in Server Components
// and Route Handlers.
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createSSRClient() {
  const cookieStore = cookies();
  return createSSRServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll()     { return cookieStore.getAll(); },
      setAll(list) {
        try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* read-only context (e.g. Server Component render), ignore */ }
      },
    },
  });
}
