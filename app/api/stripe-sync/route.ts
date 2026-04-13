import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vzzzqsmqqaoilkmskadl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs'
);

const STRIPE_PRODUCTS: Record<string, string> = {
  'prod_UJNsyKvUudgKWR': 'BrandPulse Brand Audit',
  'prod_UJNs0DBX4uBSQ4': 'Clarity Engine',
  'prod_UJNsAxEVeVGqAk': 'Flagged',
  'prod_UJOGTCyiHRLhDT': 'Freedom Era Audit',
  'prod_UJOHbf9IdHUzXt': 'Business Ops Fixer',
  'prod_UJo3Yx1v2Z3kV6': 'The Burned-Out Professional Reset',
  'prod_UJo3VvhBnUWHZ8': 'We Need to Talk: The Couples Clarity Course',
  'prod_UJo3Pd9AaY2650': 'First-Gen Table: Monthly Execution Circle',
};

export async function POST(req: NextRequest) {
  try {
    const keyA = process.env.ANTHROPIC_KEY_A || '';
    const keyB = process.env.ANTHROPIC_KEY_B || '';
    // Use Stripe secret key from env
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured', synced: 0 }, { status: 200 });
    }

    // Fetch recent charges from Stripe
    const stripeRes = await fetch('https://api.stripe.com/v1/charges?limit=100&expand[]=data.payment_intent', {
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    });

    if (!stripeRes.ok) {
      return NextResponse.json({ error: 'Stripe API error', synced: 0 }, { status: 200 });
    }

    const stripeData = await stripeRes.json();
    const charges = stripeData.data || [];

    let synced = 0;
    let skipped = 0;

    for (const charge of charges) {
      if (charge.status !== 'succeeded') continue;

      // Check if already synced
      const { data: existing } = await supabase
        .from('stripe_sync_log')
        .select('id')
        .eq('stripe_payment_id', charge.id)
        .single();

      if (existing) { skipped++; continue; }

      // Determine product name
      let productName = 'C.H.A. LLC Product';
      if (charge.metadata?.product_name) {
        productName = charge.metadata.product_name;
      } else if (charge.description) {
        productName = charge.description;
      } else {
        // Try to match from payment intent metadata
        const pi = charge.payment_intent;
        if (pi?.metadata?.product_name) productName = pi.metadata.product_name;
      }

      const amount = charge.amount / 100;
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];

      // Save to stripe_sync_log
      await supabase.from('stripe_sync_log').insert([{
        stripe_payment_id: charge.id,
        product_name: productName,
        amount,
        currency: charge.currency,
        customer_email: charge.billing_details?.email || charge.receipt_email,
        status: charge.status,
        stripe_created_at: new Date(charge.created * 1000).toISOString(),
      }]);

      // Save to revenue table
      await supabase.from('revenue').insert([{
        product_name: productName,
        amount,
        source: 'Stripe',
        date,
      }]);

      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total_charges: charges.length,
      message: synced > 0
        ? `Synced ${synced} new Stripe payment${synced !== 1 ? 's' : ''} to revenue`
        : `No new payments to sync (${skipped} already recorded)`
    });
  } catch (err: any) {
    console.error('Stripe sync error:', err);
    return NextResponse.json({ error: err.message, synced: 0 }, { status: 200 });
  }
}

export async function GET() {
  // Return current sync status
  const { data: syncLog } = await supabase
    .from('stripe_sync_log')
    .select('*')
    .order('stripe_created_at', { ascending: false })
    .limit(20);

  const { data: revenue } = await supabase
    .from('revenue')
    .select('*')
    .eq('source', 'Stripe')
    .order('date', { ascending: false })
    .limit(5);

  return NextResponse.json({
    stripe_records: syncLog?.length || 0,
    recent_synced: syncLog || [],
    recent_revenue: revenue || [],
  });
}
