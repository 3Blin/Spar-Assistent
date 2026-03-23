import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const supabase = createSSRClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Auth failed – redirect to sign-in with error hint
  return NextResponse.redirect(new URL('/auth?error=invalid_link', request.url));
}
