import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set(['/login', '/forgot-password', '/auth/confirm']);

function applyNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return new NextResponse('Supabase configuration is missing.', { status: 500 });
  }

  let response = applyNoStore(NextResponse.next({ request }));
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = applyNoStore(NextResponse.next({ request }));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isPublicPath = PUBLIC_PATHS.has(request.nextUrl.pathname);

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return applyNoStore(NextResponse.redirect(loginUrl));
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/forgot-password')) {
    const portalUrl = request.nextUrl.clone();
    portalUrl.pathname = '/';
    portalUrl.search = '';
    return applyNoStore(NextResponse.redirect(portalUrl));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
