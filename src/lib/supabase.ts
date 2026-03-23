import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Server-side client with service role (for API routes – no auth context) ──
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceKey || supabaseAnon, {
    auth: { persistSession: false },
  });
}

// ── SSR-aware client for Server Components / Route Handlers (reads cookies) ──
export function createSSRClient() {
  const cookieStore = cookies();
  return createSSRServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll()        { return cookieStore.getAll(); },
      setAll(list) {
        try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* readonly context, ignore */ }
      },
    },
  });
}

// ── Browser client (for 'use client' components) ─────────────────────────────
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnon);
}

// Legacy singleton for existing code that imports `supabase` directly
export const supabase = createClient(supabaseUrl, supabaseAnon);
