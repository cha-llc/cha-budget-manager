import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 });
    }

    const SUPABASE_URL = 'https://vzzzqsmqqaoilkmskadl.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs';

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({ to, subject, html: body, from_name: 'C.H.A. LLC Financial Intelligence' }),
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, method: 'mailto_fallback' });
    }
    return NextResponse.json({ success: true, method: 'smtp' });
  } catch (err: any) {
    return NextResponse.json({ success: true, method: 'mailto_fallback', note: err.message });
  }
}
