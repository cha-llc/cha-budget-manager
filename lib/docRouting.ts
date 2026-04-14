/**
 * docRouting.ts
 * Single source of truth for ALL document routing logic.
 * Business rules enforced here — nowhere else.
 *
 * RULES:
 * - Pay stubs ALWAYS → personal only (net pay + deductions)
 * - Bank statements ALWAYS → personal only (all transactions)
 * - Tax forms (W2/1099) ALWAYS → personal only
 * - Credit card statements → personal only
 * - Business receipts/invoices → business only
 * - User can override destination at upload time
 */

export type BudgetDestination = 'personal' | 'business' | 'both' | 'none';

// Normalize any doc_type string to a canonical value
export function normalizeDocType(raw: string): string {
  const s = (raw || '').toLowerCase().replace(/[_\-\s]+/g, '_');
  if (s.includes('pay') || s.includes('stub') || s.includes('paycheck') || s.includes('payroll')) return 'paycheck_stub';
  if (s.includes('bank') || s.includes('checking') || s.includes('savings') || s.includes('statement')) return 'bank_statement';
  if (s.includes('credit_card') || s.includes('creditcard') || s.includes('quicksilver') || s.includes('visa') || s.includes('mastercard')) return 'credit_card';
  if (s.includes('w2') || s.includes('1099') || s.includes('tax_form') || s.includes('tax form')) return 'tax_form';
  if (s.includes('receipt') || s.includes('invoice') || s.includes('bill')) return 'receipt';
  if (s.includes('investment') || s.includes('brokerage') || s.includes('portfolio')) return 'investment';
  return 'other';
}

// Default destination for a given doc type (user can always override)
export function defaultDestination(docType: string): BudgetDestination {
  const norm = normalizeDocType(docType);
  switch (norm) {
    case 'paycheck_stub': return 'personal';
    case 'bank_statement': return 'personal';
    case 'credit_card': return 'personal';
    case 'tax_form': return 'personal';
    case 'investment': return 'personal';
    case 'receipt': return 'business';
    default: return 'personal';
  }
}

// Smart category matcher for personal transactions
export function matchPersonalCategory(description: string, type: 'income' | 'expense'): string {
  const d = (description || '').toLowerCase();
  if (type === 'income') {
    if (d.includes('salary') || d.includes('payroll') || d.includes('regular pay') || d.includes('wage') || d.includes('net pay') || d.includes('direct deposit') || d.includes('paycheck')) return 'Salary / Wages';
    if (d.includes('interest') || d.includes('dividend') || d.includes('apy') || d.includes('interest paid')) return 'Other Income';
    if (d.includes('refund') || d.includes('customer redemption') || d.includes('cashback')) return 'Other Income';
    if (d.includes('transfer') || d.includes('ach')) return 'Other Income';
    return 'Other Income';
  } else {
    // Tax-related
    if (d.includes('federal') || d.includes('state tax') || d.includes('fica') || d.includes('social security') || d.includes('medicare') || d.includes('income tax')) return 'Taxes';
    // Insurance / health
    if (d.includes('medical') || d.includes('dental') || d.includes('vision') || d.includes('health insurance') || d.includes('hospital insurance') || d.includes('125 medical')) return 'Health & Wellness';
    // Retirement / savings
    if (d.includes('401k') || d.includes('401(k)') || d.includes('retirement') || d.includes('emergency fund')) return 'Emergency Fund';
    if (d.includes('deposit to savings') || d.includes('savings deposit') || d.includes('savings account')) return 'Savings';
    // Housing
    if (d.includes('rent') || d.includes('mortgage') || d.includes('lease') || d.includes('housing')) return 'Housing / Rent';
    // Food
    if (d.includes('grocery') || d.includes('food') || d.includes('walmart') || d.includes('kroger') || d.includes('publix') || d.includes('aldi') || d.includes('whole foods') || d.includes('trader joe') || d.includes('restaurant') || d.includes('dining') || d.includes('doordash') || d.includes('grubhub') || d.includes('ubereats')) return 'Food & Groceries';
    // Transportation
    if (d.includes('uber') || d.includes('lyft') || d.includes('gas') || d.includes('fuel') || d.includes('airline') || d.includes('flight') || d.includes('avianca') || d.includes('parking') || d.includes('transit') || d.includes('transport') || d.includes('auto')) return 'Transportation';
    // Health services (not insurance)
    if (d.includes('pharmacy') || d.includes('cvs') || d.includes('walgreen') || d.includes('doctor') || d.includes('clinic')) return 'Health & Wellness';
    // Entertainment
    if (d.includes('netflix') || d.includes('spotify') || d.includes('hulu') || d.includes('disney') || d.includes('amazon prime') || d.includes('entertainment') || d.includes('apple tv')) return 'Entertainment';
    // Credit card payments
    if (d.includes('capital one') || d.includes('credit card') || d.includes('electronic payment') || d.includes('autopay') || d.includes('card payment')) return 'Credit Card Payments';
    // Insurance general
    if (d.includes('insurance') || d.includes('id theft')) return 'Health & Wellness';
    return 'Personal Care';
  }
}

// Smart category matcher for business expenses
export function matchBusinessCategory(description: string): string {
  const d = (description || '').toLowerCase();
  if (d.includes('software') || d.includes('subscription') || d.includes('saas') || d.includes('hosting') || d.includes('domain') || d.includes('vercel') || d.includes('supabase') || d.includes('github')) return 'Software & Tools';
  if (d.includes('marketing') || d.includes('ad') || d.includes('facebook') || d.includes('google ads') || d.includes('meta') || d.includes('instagram') || d.includes('social')) return 'Marketing & Ads';
  if (d.includes('travel') || d.includes('flight') || d.includes('hotel') || d.includes('airbnb') || d.includes('uber') || d.includes('transport')) return 'Travel';
  if (d.includes('meal') || d.includes('restaurant') || d.includes('food') || d.includes('dining') || d.includes('coffee')) return 'Meals & Entertainment';
  if (d.includes('equipment') || d.includes('hardware') || d.includes('device') || d.includes('laptop') || d.includes('computer')) return 'Equipment';
  if (d.includes('consulting') || d.includes('legal') || d.includes('accountant') || d.includes('lawyer') || d.includes('attorney') || d.includes('contractor')) return 'Professional Services';
  if (d.includes('education') || d.includes('course') || d.includes('training') || d.includes('book') || d.includes('conference')) return 'Education';
  return 'Other';
}

// Route a fully-analyzed document's transactions to the right tables
export interface RoutingInput {
  parsed: any;         // AI response
  destination: BudgetDestination;
  fileName: string;
  docId: string | null;
}

export function buildPersonalInserts(parsed: any, fileName: string, docId: string | null): any[] {
  const docType = normalizeDocType(parsed.doc_type || '');
  const fallbackDate = parsed.transactions?.[0]?.date || new Date().toISOString().split('T')[0];
  const inserts: any[] = [];
  const kf = parsed.key_figures || [];

  if (docType === 'paycheck_stub') {
    // Find net pay from key_figures — never use gross
    const netPayFig = kf.find((k: any) =>
      k.label?.toLowerCase().includes('net pay') ||
      k.label?.toLowerCase() === 'net amount' ||
      k.label?.toLowerCase() === 'amount paid'
    );
    const netPay = netPayFig
      ? parseFloat(netPayFig.value?.replace(/[$,]/g, '') || '0')
      : parseFloat(parsed.net_cashflow || '0');

    const payDate = parsed.transactions?.[0]?.date || fallbackDate;
    if (netPay > 0) {
      inserts.push({
        description: `Net Pay — ${parsed.period || 'Pay Period'}`,
        amount: netPay, type: 'income', category_name: 'Salary / Wages',
        date: payDate, source: `document:${fileName}`, source_doc_id: docId,
      });
    }
    // Deductions only — skip deposit/transfer lines
    const skipDeductions = ['deposit to checking', 'deposit to savings', 'direct deposit', 'savings deposit', 'checking deposit'];
    (parsed.transactions || []).filter((t: any) => {
      if (t.type !== 'debit') return false;
      const d = (t.description || '').toLowerCase();
      return !skipDeductions.some(s => d.includes(s));
    }).forEach((t: any) => {
      const amount = Math.abs(parseFloat(t.amount) || 0);
      if (amount === 0) return;
      inserts.push({
        description: t.description,
        amount,
        type: 'expense',
        category_name: matchPersonalCategory(t.description, 'expense'),
        date: t.date || payDate,
        source: `document:${fileName}`,
        source_doc_id: docId,
      });
    });

  } else if (docType === 'tax_form') {
    const box1 = kf.find((k: any) =>
      k.label?.toLowerCase().includes('box 1') ||
      k.label?.toLowerCase().includes('wages') ||
      k.label?.toLowerCase().includes('compensation') ||
      k.label?.toLowerCase().includes('nonemployee')
    );
    const withheld = kf.find((k: any) =>
      k.label?.toLowerCase().includes('withheld') ||
      k.label?.toLowerCase() === 'federal income tax withheld'
    );
    if (box1) inserts.push({ description: `W2/1099 Income — ${parsed.period || fileName}`, amount: parseFloat(box1.value?.replace(/[$,]/g, '') || '0'), type: 'income', category_name: 'Salary / Wages', date: fallbackDate, source: `document:${fileName}`, source_doc_id: docId });
    if (withheld) inserts.push({ description: `Federal Tax Withheld — ${parsed.period || fileName}`, amount: parseFloat(withheld.value?.replace(/[$,]/g, '') || '0'), type: 'expense', category_name: 'Taxes', date: fallbackDate, source: `document:${fileName}`, source_doc_id: docId });
    // Fallback to transactions if no key_figures
    if (!box1 && (parsed.transactions || []).length > 0) {
      (parsed.transactions || []).filter((t: any) => Math.abs(parseFloat(t.amount) || 0) > 0).forEach((t: any) => {
        const type = t.type === 'credit' ? 'income' : 'expense';
        inserts.push({ description: t.description || 'Tax Form Entry', amount: Math.abs(parseFloat(t.amount) || 0), type, category_name: type === 'income' ? 'Salary / Wages' : 'Taxes', date: t.date || fallbackDate, source: `document:${fileName}`, source_doc_id: docId });
      });
    }

  } else {
    // Bank statement, credit card, investment, other
    (parsed.transactions || []).filter((t: any) => Math.abs(parseFloat(t.amount) || 0) > 0).forEach((t: any) => {
      const type = t.type === 'credit' ? 'income' : 'expense';
      inserts.push({
        description: t.description || 'Transaction',
        amount: Math.abs(parseFloat(t.amount) || 0),
        type,
        category_name: matchPersonalCategory(t.description || '', type),
        date: t.date || fallbackDate,
        source: `document:${fileName}`,
        source_doc_id: docId,
      });
    });
  }

  return inserts;
}

export function buildBusinessExpenseInserts(parsed: any, fileName: string): any[] {
  const debits = (parsed.transactions || []).filter((t: any) => t.type === 'debit' && Math.abs(parseFloat(t.amount) || 0) > 0);
  const fallbackDate = new Date().toISOString().split('T')[0];
  return debits.map((t: any) => ({
    division: 'Consulting',
    category: matchBusinessCategory(t.description || ''),
    amount: Math.abs(parseFloat(t.amount) || 0),
    description: t.description || 'Document Import',
    date: t.date || fallbackDate,
    source: 'document_import',
    doc_source: fileName,
    is_business: true,
  }));
}

export function buildBusinessRevenueInserts(parsed: any): any[] {
  const credits = (parsed.transactions || []).filter((t: any) => t.type === 'credit' && Math.abs(parseFloat(t.amount) || 0) > 0);
  const fallbackDate = new Date().toISOString().split('T')[0];
  return credits.map((t: any) => ({
    product_name: t.description || 'Business Income',
    amount: Math.abs(parseFloat(t.amount) || 0),
    source: parsed.doc_type || 'Document Import',
    date: t.date || fallbackDate,
  }));
}
