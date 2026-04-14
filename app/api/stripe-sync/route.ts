import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vzzzqsmqqaoilkmskadl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6enpxc21xcWFvaWxrbXNrYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjYzMjQsImV4cCI6MjA5MTQ0MjMyNH0.vYkiz5BeoJlhNzcEiiGQfsHLE5UfqJbTTBjNXk1xxJs'
);

const STRIPE_PRODUCT_NAMES: Record<string, string> = {
  'prod_UJNsyKvUudgKWR': 'BrandPulse Brand Audit',
  'prod_UJNs0DBX4uBSQ4': 'Clarity Engine',
  'prod_UJNsAxEVeVGqAk': 'Flagged',
  'prod_UJOGTCyiHRLhDT': 'Freedom Era Audit',
  'prod_UJOHbf9IdHUzXt': 'Business Ops Fixer',
  'prod_UJo3Yx1v2Z3kV6': 'The Burned-Out Professional Reset',
  'prod_UJo3VvhBnUWHZ8': 'We Need to Talk: The Couples Clarity Course',
  'prod_UJo3Pd9AaY2650': 'First-Gen Table: Monthly Execution Circle',
};

function getStripeKey(): string {
  // Try direct key first, then split key
  const direct = process.env.STRIPE_SECRET_KEY || '';
  if (direct) return direct;
  const a = process.env.STRIPE_KEY_A || '';
  const b = process.env.STRIPE_KEY_B || '';
  return a + b;
}

export async function POST(req: NextRequest) {
  const stripeKey = getStripeKey();

  if (!stripeKey || stripeKey.length < 20) {
    return NextResponse.json({
      error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Vercel environment variables.',
      synced: 0,
      setup_required: true
    }, { status: 200 });
  }

  try {
    // Fetch charges from Stripe
    const stripeRes = await fetch('https://api.stripe.com/v1/charges?limit=100&expand[]=data.payment_intent', {
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      return NextResponse.json({ error: `Stripe API error: ${stripeRes.status}`, synced: 0 }, { status: 200 });
    }

    const stripeData = await stripeRes.json();
    const charges = (stripeData.data || []).filter((c: any) => c.status === 'succeeded');

    let synced = 0;
    let skipped = 0;

    for (const charge of charges) {
      // Check if already synced
      const { data: existing } = await supabase
        .from('stripe_sync_log')
        .select('id')
        .eq('stripe_payment_id', charge.id)
        .single();

      if (existing) { skipped++; continue; }

      // Resolve product name
      let productName = 'C.H.A. LLC Product';
      const pi = charge.payment_intent;
      if (pi?.metadata?.product_name) productName = pi.metadata.product_name;
      else if (charge.metadata?.product_name) productName = charge.metadata.product_name;
      else if (charge.description) productName = charge.description;
      else if (pi?.description) productName = pi.description;

      // Try to match by product ID if present
      const productId = pi?.metadata?.product_id || charge.metadata?.product_id;
      if (productId && STRIPE_PRODUCT_NAMES[productId]) productName = STRIPE_PRODUCT_NAMES[productId];

      const amount = charge.amount / 100;
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];

      // Log the sync
      await supabase.from('stripe_sync_log').insert([{
        stripe_payment_id: charge.id,
        product_name: productName,
        amount,
        currency: charge.currency,
        customer_email: charge.billing_details?.email || charge.receipt_email,
        status: charge.status,
        stripe_created_at: new Date(charge.created * 1000).toISOString(),
      }]);

      // Add to revenue table
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
      total_charges_found: charges.length,
      message: synced > 0
        ? `✅ Synced ${synced} new payment${synced !== 1 ? 's' : ''} to revenue`
        : `No new payments (${skipped} already recorded, ${charges.length} total in Stripe)`
    });

  } catch (err: any) {
    console.error('Stripe sync error:', err);
    return NextResponse.json({ error: err.message, synced: 0 }, { status: 200 });
  }
}

export async function GET() {
  const { data: syncLog } = await supabase
    .from('stripe_sync_log')
    .select('*')
    .order('stripe_created_at', { ascending: false })
    .limit(20);

  const { data: revenueFromStripe } = await supabase
    .from('revenue')
    .select('*')
    .eq('source', 'Stripe')
    .order('date', { ascending: false })
    .limit(10);

  const stripeKey = getStripeKey();

  return NextResponse.json({
    configured: stripeKey.length > 20,
    total_synced_payments: syncLog?.length || 0,
    recent_synced: syncLog || [],
    recent_stripe_revenue: revenueFromStripe || [],
  });
}
