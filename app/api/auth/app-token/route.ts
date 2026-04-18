import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL  = 'https://vzzzqsmqqaoilkmskadl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('cha_admin_token')?.value;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const app  = body?.app;
  if (!['nova','reckoning'].includes(app)) {
    return NextResponse.json({ error: 'Invalid app' }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/app_access_tokens`,
    {
      method:  'POST',
      headers: {
        apikey:          SUPABASE_ANON,
        Authorization:   `Bearer ${SUPABASE_ANON}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify({ app }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('Token insert failed:', err);
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }

  const rows = await res.json();
  const tokenValue = rows?.[0]?.token;
  if (!tokenValue) {
    return NextResponse.json({ error: 'No token returned' }, { status: 500 });
  }

  return NextResponse.json({ token: tokenValue });
}
