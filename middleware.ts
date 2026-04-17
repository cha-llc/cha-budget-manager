import { NextRequest, NextResponse } from 'next/server';

// Public paths — no auth needed
const PUBLIC_PATHS = ['/login', '/favicon.ico', '/manifest.json', '/sw.js'];

// JWT secret for fast local verification (no Supabase round-trip)
// We sign the session token with a simple HMAC so middleware can verify
// it purely in-memory at the edge without any network call.
// The token stored in the cookie IS the session UUID from admin_sessions.
// We verify it exists by checking a short-lived in-memory cache, OR
// fall back to a lightweight cookie presence check + let the API route
// do the heavy verification when data is actually requested.

// FAST PATH: just check cookie presence in middleware.
// Full DB verification happens at the API/data layer.
// This eliminates the 150-300ms Supabase round-trip on every page nav.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always pass: static files, Next internals, all API routes, public pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check cookie presence — fast, zero network latency
  const token = req.cookies.get('cha_admin_token')?.value;
  if (!token || token.length < 32) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Token present — allow through. The verify_admin_session RPC
  // is called by individual API routes when needed, not on every nav.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)'],
};
