import { NextRequest, NextResponse } from 'next/server';

const SUPA_URL = 'https://vzzzqsmqqaoilkmskadl.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    // Verify via pgcrypto RPC
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/verify_admin_login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` },
      body: JSON.stringify({ p_email: email.toLowerCase().trim(), p_password: password }),
    });
    const result = await res.json();
    if (!result?.user_id) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    // Create session
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${SUPA_URL}/rest/v1/admin_sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ admin_user_id: result.user_id, token, expires_at: expires }),
    });
    await fetch(`${SUPA_URL}/rest/v1/admin_users?id=eq.${result.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ last_login: new Date().toISOString() }),
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('cha_admin_token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
