import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/favicon.ico', '/manifest.json', '/sw.js'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static files
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('cha_admin_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verify token with Supabase
  const SUPA_URL = 'https://vzzzqsmqqaoilkmskadl.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs';

  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/verify_admin_session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` },
      body: JSON.stringify({ p_token: token }),
    });
    const result = await res.json();
    if (!result?.valid) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.set('cha_admin_token', '', { maxAge: 0, path: '/' });
      return response;
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)'],
};
