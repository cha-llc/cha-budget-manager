import { NextRequest, NextResponse } from 'next/server';
import getConfig from 'next/config';

// Next.js 14 App Router: set max duration for large PDF processing
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverRuntimeConfig } = getConfig() || {};
    const keyA = process.env.ANTHROPIC_KEY_A || serverRuntimeConfig?.ANTHROPIC_KEY_A || '';
    const keyB = process.env.ANTHROPIC_KEY_B || serverRuntimeConfig?.ANTHROPIC_KEY_B || '';
    const apiKey = process.env.ANTHROPIC_API_KEY || (keyA && keyB ? keyA + keyB : '');

    if (!apiKey || apiKey.length < 20) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-6',
        max_tokens: body.max_tokens || 2000,
        system: body.system,
        messages: body.messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return NextResponse.json({ error: `Anthropic error: ${response.status} - ${err}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('AI route error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
