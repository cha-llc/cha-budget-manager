import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  // Verify Budget Manager session cookie
  const token = req.cookies.get('cha_admin_token')?.value;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { app } = await req.json();
  if (!['nova', 'reckoning'].includes(app)) {
    return NextResponse.json({ error: 'Invalid app' }, { status: 400 });
  }

  // Generate access token — 24h expiry
  const { data, error } = await sb
    .from('app_access_tokens')
    .insert({ app, expires_at: new Date(Date.now() + 86400000).toISOString() })
    .select('token')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }

  return NextResponse.json({ token: data.token });
}
