import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Server-side client with service role (for API routes – no auth context) ──
// Safe to import in both server and client contexts (does not use next/headers)
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceKey || supabaseAnon, {
    auth: { persistSession: false },
  });
}

// ── Browser client for 'use client' components ───────────────────────────────
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnon);
}

// Legacy singleton (kept for backward compatibility)
export const supabase = createClient(supabaseUrl, supabaseAnon);
