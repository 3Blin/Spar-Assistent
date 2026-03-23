import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'blinow.erich@googlemail.com';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()       { return request.cookies.getAll(); },
        setAll(list: { name: string; value: string; options?: Record<string, unknown> }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Bon upload requires any authenticated user
  if (path.startsWith('/bon') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Admin routes require admin e-mail
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    const adminList = ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase());
    if (!adminList.includes((user.email ?? '').toLowerCase())) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/bon/:path*', '/admin/:path*'],
};
