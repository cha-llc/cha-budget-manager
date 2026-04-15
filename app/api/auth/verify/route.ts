import { NextRequest, NextResponse } from 'next/server';

const SUPA_URL = 'https://vzzzqsmqqaoilkmskadl.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('cha_admin_token')?.value;
  if (!token) return NextResponse.json({ valid: false }, { status: 401 });
  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/verify_admin_session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` },
    body: JSON.stringify({ p_token: token }),
  });
  const result = await res.json();
  if (!result?.valid) return NextResponse.json({ valid: false }, { status: 401 });
  return NextResponse.json({ valid: true, email: result.email });
}
