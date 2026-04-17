'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { SkeletonKPI, SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import { supabase } from '@/lib/supabase';
import { buildPersonalInserts, buildBusinessExpenseInserts } from '@/lib/docRouting';

const DIVISIONS = ['Consulting','Tea Time Network','Digital Tools','Books'];
const DIV_COLORS: Record<string,string> = { Consulting:'#C9A84C', 'Tea Time Network':'#9B5DE5', 'Digital Tools':'#2A9D8F', Books:'#C1121F' };
const CAT_COLORS = ['#C9A84C','#9B5DE5','#2A9D8F','#C1121F','#3a86ff','#f4a261','#06d6a0','#ef476f','#ffd166','#e9c46a','#8ecae6','#023047'];
const CAT_ICONS: Record<string,string> = {
  'Housing / Rent':'🏠','Food & Groceries':'🛒','Transportation':'🚗','Health & Wellness':'💊','Entertainment':'🎭','Credit Card Payments':'💳','Savings':'🏦','Emergency Fund':'🛡️','Federal Income Tax':'🏛️','State Income Tax':'🏛️','Social Security':'🔐','Medicare':'🏥','Taxes':'🏛️','Personal Care':'🧴','Other Income':'💰','Salary / Wages':'💵','Banking Transfers':'🏧','Digital Services':'📱','Investments':'📈','Miscellaneous':'📦','Money Transfers':'💸','Software & Subscriptions':'💻','Additional Income':'💰','Business Income':'🏢','Freelance':'🖥️','Primary Income':'💼',
};
const ACCENT = '#C9A84C';
const card = (extra = {}) => ({ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'1.5rem', ...extra });

type Mode = 'business'|'personal';

export default function Budgets() {
  const [mode, setMode] = useState<Mode>('business');
  // Data
  const [bizBudgets, setBizBudgets] = useState<any[]>([]);
  const [bizExpenses, setBizExpenses] = useState<any[]>([]);
  const [persCats, setPersCats] = useState<any[]>([]);
  const [persTxs, setPersTxs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  // UI
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string|null>(null);
  const [importMsg, setImportMsg] = useState('');
  const [clearConfirm, setClearConfirm] = useState<'idle'|'confirm'|'clearing'>('idle');
  const [clearMsg, setClearMsg] = useState('');
  const [buildingFromDocs, setBuildingFromDocs] = useState(false);
  const [buildMsg, setBuildMsg] = useState('');
  const [editBudgetId, setEditBudgetId] = useState<string|null>(null);
  const [editBudgetVal, setEditBudgetVal] = useState('');
  const [editDivId, setEditDivId] = useState<string|null>(null);
  const [editDivVal, setEditDivVal] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat, setNewCat] = useState({ name:'', type:'expense' as 'income'|'expense', budgeted_amount:'', icon:'💰' });
  const [aiBuilding, setAiBuilding] = useState(false);
  const [activeTrendDiv, setActiveTrendDiv] = useState('All');
  const [monthlyView, setMonthlyView] = useState<'spending'|'cashflow'>('spending');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [br,er,cr,tr,dr] = await Promise.all([
      supabase.from('division_budgets').select('*'),
      supabase.from('expenses').select('*').order('date',{ascending:false}),
      supabase.from('personal_budget_categories').select('*').order('type').order('name'),
      supabase.from('personal_transactions').select('*').order('date',{ascending:false}),
      supabase.from('budget_documents').select('*').order('uploaded_at',{ascending:false}),
    ]);
    if (br.data) setBizBudgets(br.data);
    if (er.data) setBizExpenses(er.data);
    if (cr.data) setPersCats(cr.data);
    if (tr.data) setPersTxs(tr.data);
    if (dr.data) setDocuments(dr.data);
    setLoading(false);
  };

  // ── BUSINESS COMPUTED ──
  const getBizDiv = (div: string) => {
    const b = bizBudgets.find(x=>x.division===div);
    const spent = bizExpenses.filter(e=>e.division===div).reduce((s,e)=>s+parseFloat(e.amount||0),0);
    const budget = parseFloat(b?.monthly_budget||0);
    return { budget, spent, remaining: Math.max(0,budget-spent), pct: budget>0?(spent/budget)*100:0, id: b?.id };
  };
  const totalBizBudget = DIVISIONS.reduce((s,d)=>s+getBizDiv(d).budget,0);
  const totalBizSpent = bizExpenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);

  // ── PERSONAL COMPUTED ──
  const totalPersIncome = persTxs.filter(t=>t.type==='income').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const totalPersExpense = persTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const totalPersBudgeted = persCats.filter(c=>c.type==='expense').reduce((s,c)=>s+parseFloat(c.budgeted_amount||0),0);
  const spendByPersCat: Record<string,number> = {};
  persTxs.filter(t=>t.type==='expense').forEach(t=>{ spendByPersCat[t.category_name]=(spendByPersCat[t.category_name]||0)+parseFloat(t.amount||0); });
  const incomeByPersCat: Record<string,number> = {};
  persTxs.filter(t=>t.type==='income').forEach(t=>{ incomeByPersCat[t.category_name]=(incomeByPersCat[t.category_name]||0)+parseFloat(t.amount||0); });

  // ── 6-MONTH TREND ──
  const buildMonthly6 = (source: 'biz'|'pers') => {
    const months: Record<string,{inc:number,exp:number,label:string,key:string}> = {};
    const now = new Date();
    for (let i=5;i>=0;i--) {
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      const key = d.toISOString().slice(0,7);
      months[key] = {inc:0,exp:0,label:d.toLocaleString('default',{month:'short'}),key};
    }
    if (source==='biz') {
      const filtered = activeTrendDiv==='All'?bizExpenses:bizExpenses.filter(e=>e.division===activeTrendDiv);
      filtered.forEach(e=>{ const k=(e.date||'').slice(0,7); if(months[k]) months[k].exp+=parseFloat(e.amount||0); });
    } else {
      persTxs.forEach(t=>{ const k=(t.date||'').slice(0,7); if(!months[k]) return; if(t.type==='income') months[k].inc+=parseFloat(t.amount||0); else months[k].exp+=parseFloat(t.amount||0); });
    }
    return Object.values(months);
  };

  // Donut data for personal spending
  const topPersSpend = Object.entries(spendByPersCat).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const totalPersSpendCalc = topPersSpend.reduce((s,[,a])=>s+(a as number),0)||1;

  // Budget vs actual for personal
  const catsWithBudget = persCats.filter(c=>parseFloat(c.budgeted_amount||0)>0 || spendByPersCat[c.name]>0);

  // Division budget save
  const saveDivBudget = async (div: string) => {
    const val = parseFloat(editDivVal);
    if (isNaN(val)) return;
    const { data } = await supabase.from('division_budgets').upsert({ division:div, monthly_budget:val }).select();
    if (data) { setBizBudgets(prev => { const filtered=prev.filter(b=>b.division!==div); return [...filtered,...data]; }); }
    setEditDivId(null);
  };

  const savePersBudget = async (id: string) => {
    const val = parseFloat(editBudgetVal);
    if (isNaN(val)) return;
    await supabase.from('personal_budget_categories').update({ budgeted_amount:val }).eq('id',id);
    setPersCats(prev=>prev.map(c=>c.id===id?{...c,budgeted_amount:val}:c));
    setEditBudgetId(null);
  };

  const addCategory = async () => {
    if (!newCat.name) return;
    const { data } = await supabase.from('personal_budget_categories').insert([{ name:newCat.name, type:newCat.type, budgeted_amount:parseFloat(newCat.budgeted_amount||'0'), icon:newCat.icon, color:'#C9A84C' }]).select();
    if (data) { setPersCats(prev=>[...prev,...data]); setShowAddCat(false); setNewCat({ name:'',type:'expense',budgeted_amount:'',icon:'💰' }); }
  };

  const importDocToPersonal = async (doc: any) => {
    setImporting(doc.id); setImportMsg('');
    try {
      const inserts = buildPersonalInserts(doc, doc.file_name, doc.id);
      if (!inserts.length) { setImportMsg('No importable transactions found.'); setImporting(null); return; }
      const { data, error } = await supabase.from('personal_transactions').insert(inserts).select();
      if (error) throw error;
      if (data) {
        setPersTxs(prev=>[...data,...prev]);
        await supabase.from('budget_documents').update({ imported_to_budget:true, imported_at:new Date().toISOString() }).eq('id',doc.id);
        setDocuments(prev=>prev.map(d=>d.id===doc.id?{...d,imported_to_budget:true}:d));
        setImportMsg(`✅ Imported ${data.length} transactions from "${doc.file_name}"`);
      }
    } catch(e:any) { setImportMsg('Import failed: '+(e?.message||'unknown')); }
    setImporting(null);
    setTimeout(()=>setImportMsg(''),8000);
  };

  const buildBudgetFromDocs = async () => {
    setAiBuilding(true); setBuildMsg('');
    try {
      const totalIncome = documents.reduce((s,d)=>{
        const dt=(d.doc_type||'').toLowerCase();
        if (dt.includes('pay')||dt.includes('stub')||dt.includes('paycheck')) {
          const kf=d.key_figures||[];
          const nf=kf.find((k:any)=>k.label?.toLowerCase().includes('net pay'));
          return s+parseFloat(nf?.value?.replace(/[$,]/g,'')||d.net_cashflow||d.total_income||'0');
        }
        return s+parseFloat(d.total_income||'0');
      },0);
      const totalExp = documents.reduce((s,d)=>s+parseFloat(d.total_expenses||'0'),0);
      const allTxSample = documents.flatMap(d=>(d.transactions||[]).slice(0,15)).slice(0,60);
      const res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        model:'claude-sonnet-4-6', max_tokens:1500,
        system:'You are a personal finance AI. Return ONLY valid JSON: {"summary":"string","category_budgets":[{"name":"string","type":"income|expense","suggested_amount":0,"icon":"emoji","reasoning":"string"}],"monthly_income_estimate":0,"monthly_expense_estimate":0,"savings_rate":"string","insights":["string"]}. No markdown.',
        messages:[{ role:'user', content:`Build a personal budget from ${documents.length} uploaded documents. Net income: $${totalIncome.toFixed(0)}, expenses: $${totalExp.toFixed(0)}. Sample transactions: ${JSON.stringify(allTxSample)}. Create realistic monthly budget categories.` }]
      })});
      const d = await res.json();
      const text = d.content?.find((c:any)=>c.type==='text')?.text||'';
      const result = JSON.parse(text.replace(/```json|```/g,'').trim());
      let added=0;
      for (const cat of result.category_budgets||[]) {
        const existing = persCats.find(c=>c.name.toLowerCase()===cat.name.toLowerCase());
        if (existing) await supabase.from('personal_budget_categories').update({ budgeted_amount:cat.suggested_amount }).eq('id',existing.id);
        else { await supabase.from('personal_budget_categories').insert([{ name:cat.name, type:cat.type, budgeted_amount:cat.suggested_amount, icon:cat.icon||'💰', color:'#C9A84C' }]); added++; }
      }
      await loadAll();
      setBuildMsg(`✅ Budget built from ${documents.length} docs. ${added} new categories. ${result.summary}`);
    } catch(e:any) { setBuildMsg('Build failed. Make sure you have uploaded documents first.'); }
    setAiBuilding(false);
  };

  const clearAllData = async () => {
    setClearConfirm('clearing');
    try {
      await supabase.from('personal_transactions').delete().like('source','document:%');
      await supabase.from('budget_documents').delete().neq('id','00000000-0000-0000-0000-000000000000');
      await supabase.from('personal_budget_categories').update({ budgeted_amount:0 }).neq('id','00000000-0000-0000-0000-000000000000');
      await loadAll();
      setClearMsg('✅ Cleared. Upload fresh documents to start over.');
      setClearConfirm('idle');
      setTimeout(()=>setClearMsg(''),8000);
    } catch(e:any) { setClearMsg('❌ Failed: '+(e?.message||'error')); setClearConfirm('idle'); }
  };

  const bizMonthly = buildMonthly6('biz');
  const persMonthly = buildMonthly6('pers');
  const monthly = mode==='business'?bizMonthly:persMonthly;
  const maxBar = Math.max(...monthly.map(m=>Math.max(m.inc,m.exp)),1);

  const inputStyle = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:'8px', padding:'8px 12px', fontSize:'13px', width:'100%', fontFamily:'Poppins,sans-serif', outline:'none' };

  if (loading) return (
    <Layout activeTab="budgets">
      <div style={{maxWidth:'1280px'}}>
        <div style={{marginBottom:'2rem',height:'36px',width:'240px',borderRadius:'8px',background:'rgba(255,255,255,0.05)'}} />
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
          <SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
        </div>
        <SkeletonCard height="240px" lines={5} />
        <div style={{marginTop:'1.25rem'}}><SkeletonTable rows={7} /></div>
      </div>
    </Layout>
  );

  return (
    <Layout activeTab="budgets">
      <style>{`
        input,select { ${Object.entries(inputStyle).map(([k,v])=>`${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')} }
        input:focus,select:focus { border-color:${ACCENT}!important; }
        label { display:block; font-size:11px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:5px; font-weight:600; }
        .hover-row:hover { background:rgba(255,255,255,0.04)!important; }
        .budget-bar { transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
      <div style={{maxWidth:'1280px'}}>

        {/* HEADER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h2 style={{margin:'0 0 4px',color:'#fff',fontSize:'24px',fontWeight:'700',fontFamily:"'Lora',serif",letterSpacing:'-0.3px'}}>Budgets</h2>
            <p style={{margin:0,color:'rgba(255,255,255,0.4)',fontSize:'13px'}}>
              {mode==='business'?`$${totalBizSpent.toLocaleString(undefined,{maximumFractionDigits:0})} spent of $${totalBizBudget.toLocaleString(undefined,{maximumFractionDigits:0})} budgeted across ${DIVISIONS.length} divisions`:`$${totalPersExpense.toLocaleString(undefined,{maximumFractionDigits:0})} spent of $${totalPersBudgeted.toLocaleString(undefined,{maximumFractionDigits:0})} budgeted`}
            </p>
          </div>
          <div style={{display:'flex',gap:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'5px'}}>
            {(['business','personal'] as Mode[]).map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{padding:'10px 24px',borderRadius:'8px',border:'none',cursor:'pointer',background:mode===m?(m==='business'?ACCENT:'#9B5DE5'):'transparent',color:mode===m?(m==='business'?'#1A1A2E':'#fff'):'rgba(255,255,255,0.45)',fontWeight:mode===m?'700':'400',fontSize:'13px',fontFamily:'Poppins,sans-serif',transition:'all 0.2s'}}>
                {m==='business'?'🏢 Business':'🧾 Personal'}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════ BUSINESS MODE ══════════ */}
        {mode==='business' && (
          <div>
            {/* KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
              {[
                {label:'Total Budgeted',value:`$${totalBizBudget.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:'monthly',color:ACCENT},
                {label:'Total Spent',value:`$${totalBizSpent.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${bizExpenses.length} transactions`,color:'#C1121F'},
                {label:'Remaining',value:`$${Math.max(0,totalBizBudget-totalBizSpent).toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:totalBizBudget>0?`${Math.max(0,100-(totalBizSpent/totalBizBudget*100)).toFixed(0)}% left`:'',color:'#2A9D8F'},
                {label:'Budget Health',value:totalBizBudget>0?totalBizSpent>totalBizBudget?'Over':'On Track':'No Budget',sub:totalBizBudget>0?`${((totalBizSpent/totalBizBudget)*100).toFixed(0)}% used`:'',color:totalBizSpent>totalBizBudget?'#C1121F':'#2A9D8F'},
              ].map(k=>(
                <div key={k.label} style={{...card(),borderLeft:`3px solid ${k.color}`}}>
                  <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.6px'}}>{k.label}</p>
                  <p style={{margin:0,fontSize:'22px',fontWeight:'700',color:k.color,lineHeight:1}}>{k.value}</p>
                  {k.sub&&<p style={{margin:'4px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Division budget bars + trend chart */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>
              {/* Division budgets */}
              <div style={card()}>
                <h3 style={{margin:'0 0 1.25rem',color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Division Budgets</h3>
                {DIVISIONS.map(div=>{
                  const {budget,spent,pct,id} = getBizDiv(div);
                  const over = spent > budget && budget > 0;
                  const barColor = over?'#C1121F':pct>75?'#f4a261':DIV_COLORS[div];
                  return (
                    <div key={div} style={{marginBottom:'1.25rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                        <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'50%',background:DIV_COLORS[div],boxShadow:`0 0 8px ${DIV_COLORS[div]}66`,display:'inline-block'}}/>
                          <span style={{fontSize:'13px',color:'#fff',fontWeight:'600'}}>{div}</span>
                        </span>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          {editDivId===div ? (
                            <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                              <input type="number" value={editDivVal} onChange={e=>setEditDivVal(e.target.value)} style={{width:'90px',padding:'4px 8px',fontSize:'12px'}} autoFocus onKeyDown={e=>e.key==='Enter'&&saveDivBudget(div)} />
                              <button onClick={()=>saveDivBudget(div)} style={{padding:'4px 10px',borderRadius:'6px',border:'none',background:ACCENT,color:'#1A1A2E',fontWeight:'700',fontSize:'11px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>✓</button>
                              <button onClick={()=>setEditDivId(null)} style={{padding:'4px 8px',borderRadius:'6px',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',fontSize:'11px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>✗</button>
                            </div>
                          ) : (
                            <button onClick={()=>{setEditDivId(div);setEditDivVal(budget.toString());}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.2)',cursor:'pointer',fontSize:'12px',fontFamily:'Poppins,sans-serif'}}>✏️ ${budget>0?budget.toLocaleString():'Set budget'}</button>
                          )}
                        </div>
                      </div>
                      <div style={{height:'8px',background:'rgba(255,255,255,0.07)',borderRadius:'6px',overflow:'hidden',marginBottom:'6px'}}>
                        <div className="budget-bar" style={{height:'100%',width:`${Math.min(100,pct)}%`,background:barColor,borderRadius:'6px',boxShadow:`0 0 8px ${barColor}44`}}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}>
                        <span style={{color:over?'#C1121F':'rgba(255,255,255,0.4)'}}>
                          ${spent.toLocaleString(undefined,{maximumFractionDigits:0})} spent{over?` ⚠️ $${(spent-budget).toFixed(0)} over`:''}
                        </span>
                        {budget>0&&<span style={{color:'rgba(255,255,255,0.3)'}}>${budget.toLocaleString()} budget</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 6-month trend */}
              <div style={card()}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:'0.5rem'}}>
                  <h3 style={{margin:0,color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Spend Trend</h3>
                  <div style={{display:'flex',gap:'4px'}}>
                    {['All',...DIVISIONS].map(d=>(
                      <button key={d} onClick={()=>setActiveTrendDiv(d)} style={{padding:'3px 10px',borderRadius:'20px',border:`1px solid ${activeTrendDiv===d?DIV_COLORS[d]||ACCENT:'rgba(255,255,255,0.1)'}`,background:activeTrendDiv===d?`${DIV_COLORS[d]||ACCENT}22`:'transparent',color:activeTrendDiv===d?DIV_COLORS[d]||ACCENT:'rgba(255,255,255,0.4)',fontSize:'10px',fontWeight:'600',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                        {d==='All'?'All':d.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'140px'}}>
                  {bizMonthly.map((m,i)=>(
                    <div key={m.key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',height:'100%',justifyContent:'flex-end'}}>
                      {m.exp>0&&<span style={{fontSize:'9px',color:i===5?ACCENT:'rgba(255,255,255,0.3)',fontWeight:'600'}}>${m.exp.toFixed(0)}</span>}
                      <div style={{width:'100%',background:i===5?`${ACCENT}bb`:`${ACCENT}33`,borderRadius:'4px 4px 0 0',height:`${(m.exp/maxBar)*120}px`,minHeight:m.exp>0?'4px':'0',transition:'height 0.6s ease'}}/>
                      <span style={{fontSize:'10px',color:i===5?ACCENT:'rgba(255,255,255,0.3)',fontWeight:i===5?'700':'400'}}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ PERSONAL MODE ══════════ */}
        {mode==='personal' && (
          <div>
            {/* Clear All bar */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.85rem 1.25rem',background:'rgba(193,18,31,0.06)',border:'1px solid rgba(193,18,31,0.2)',borderRadius:'12px',marginBottom:'1.5rem',flexWrap:'wrap',gap:'0.75rem'}}>
              <div>
                <p style={{margin:0,color:'rgba(255,255,255,0.7)',fontSize:'13px',fontWeight:'600'}}>🔄 Start Over with Fresh Data</p>
                <p style={{margin:'2px 0 0',color:'rgba(255,255,255,0.35)',fontSize:'11px'}}>Clears all uploaded documents, imported transactions, and resets budgets to $0</p>
              </div>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
                {clearMsg&&<span style={{fontSize:'12px',color:clearMsg.startsWith('✅')?'#2A9D8F':'#C1121F',fontWeight:'600'}}>{clearMsg}</span>}
                {clearConfirm==='idle'&&<button onClick={()=>setClearConfirm('confirm')} style={{padding:'8px 18px',borderRadius:'8px',border:'1px solid rgba(193,18,31,0.6)',background:'rgba(193,18,31,0.12)',color:'#C1121F',fontWeight:'700',fontSize:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif',whiteSpace:'nowrap'}}>🗑️ Clear All & Start Fresh</button>}
                {clearConfirm==='confirm'&&(
                  <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:'12px',color:'#f4a261',fontWeight:'600'}}>⚠️ Cannot undo.</span>
                    <button onClick={clearAllData} style={{padding:'8px 18px',borderRadius:'8px',border:'none',background:'#C1121F',color:'#fff',fontWeight:'700',fontSize:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>Yes, Clear Everything</button>
                    <button onClick={()=>setClearConfirm('idle')} style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'rgba(255,255,255,0.6)',fontSize:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>Cancel</button>
                  </div>
                )}
                {clearConfirm==='clearing'&&<span style={{fontSize:'12px',color:ACCENT,fontWeight:'600'}}>⏳ Clearing...</span>}
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
              {[
                {label:'Total Income',value:`$${totalPersIncome.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${persTxs.filter(t=>t.type==='income').length} transactions`,color:'#2A9D8F'},
                {label:'Total Expenses',value:`$${totalPersExpense.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${persTxs.filter(t=>t.type==='expense').length} transactions`,color:'#C1121F'},
                {label:'Net Cash Flow',value:`${(totalPersIncome-totalPersExpense)>=0?'+':''}$${Math.abs(totalPersIncome-totalPersExpense).toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:(totalPersIncome-totalPersExpense)>=0?'Positive ✓':'Negative ✗',color:(totalPersIncome-totalPersExpense)>=0?'#2A9D8F':'#C1121F'},
                {label:'Total Budgeted',value:`$${totalPersBudgeted.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${persCats.filter(c=>parseFloat(c.budgeted_amount||0)>0).length} categories`,color:'#9B5DE5'},
              ].map(k=>(
                <div key={k.label} style={{...card(),borderLeft:`3px solid ${k.color}`}}>
                  <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.6px'}}>{k.label}</p>
                  <p style={{margin:0,fontSize:'22px',fontWeight:'700',color:k.color,lineHeight:1}}>{k.value}</p>
                  {k.sub&&<p style={{margin:'4px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Charts row: Cash Flow Trend + Where Money Goes */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>
              {/* Cash flow chart */}
              <div style={card()}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
                  <h3 style={{margin:0,color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>6-Month Cash Flow</h3>
                  <div style={{display:'flex',gap:'4px'}}>
                    {(['spending','cashflow'] as const).map(v=>(
                      <button key={v} onClick={()=>setMonthlyView(v)} style={{padding:'3px 10px',borderRadius:'20px',border:`1px solid ${monthlyView===v?ACCENT:'rgba(255,255,255,0.1)'}`,background:monthlyView===v?`${ACCENT}22`:'transparent',color:monthlyView===v?ACCENT:'rgba(255,255,255,0.4)',fontSize:'10px',fontWeight:'600',cursor:'pointer',fontFamily:'Poppins,sans-serif',textTransform:'capitalize'}}>{v}</button>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'140px'}}>
                  {persMonthly.map((m,i)=>(
                    <div key={m.key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
                      {monthlyView==='cashflow' ? (
                        <div style={{width:'100%',display:'flex',gap:'2px',alignItems:'flex-end',height:'120px'}}>
                          <div style={{flex:1,background:`rgba(42,157,143,${i===5?0.7:0.35})`,borderRadius:'3px 3px 0 0',height:`${(m.inc/maxBar)*120}px`,minHeight:m.inc>0?'3px':'0',transition:'height 0.6s ease'}}/>
                          <div style={{flex:1,background:`rgba(193,18,31,${i===5?0.7:0.35})`,borderRadius:'3px 3px 0 0',height:`${(m.exp/maxBar)*120}px`,minHeight:m.exp>0?'3px':'0',transition:'height 0.6s ease'}}/>
                        </div>
                      ) : (
                        <div style={{width:'100%',background:`rgba(193,18,31,${i===5?0.7:0.3})`,borderRadius:'4px 4px 0 0',height:`${(m.exp/maxBar)*120}px`,minHeight:m.exp>0?'4px':'0',transition:'height 0.6s ease'}}/>
                      )}
                      <span style={{fontSize:'10px',color:i===5?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.3)',fontWeight:i===5?'700':'400'}}>{m.label}</span>
                    </div>
                  ))}
                </div>
                {monthlyView==='cashflow'&&(
                  <div style={{display:'flex',gap:'1rem',marginTop:'0.75rem',justifyContent:'center'}}>
                    {[['#2A9D8F','Income'],['#C1121F','Spending']].map(([c,l])=>(
                      <span key={l} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
                        <span style={{width:'10px',height:'10px',borderRadius:'2px',background:c,display:'inline-block'}}/>{l}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Where money goes — visual donut-style breakdown */}
              <div style={card()}>
                <h3 style={{margin:'0 0 1.25rem',color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Where Your Money Goes</h3>
                {topPersSpend.length===0 ? (
                  <p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>No expense data yet. Upload documents or add transactions.</p>
                ) : (
                  <div>
                    {/* Visual percentage blocks */}
                    <div style={{display:'flex',height:'24px',borderRadius:'8px',overflow:'hidden',marginBottom:'1rem',gap:'2px'}}>
                      {topPersSpend.map(([cat,amt],i)=>(
                        <div key={cat} title={`${cat}: $${(amt as number).toFixed(0)}`} style={{flex:(amt as number)/totalPersSpendCalc,background:CAT_COLORS[i%12],minWidth:'4px',transition:'flex 0.5s ease'}}/>
                      ))}
                    </div>
                    {topPersSpend.map(([cat,amt],i)=>(
                      <div key={cat} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'0.5rem'}}>
                        <span style={{width:'10px',height:'10px',borderRadius:'3px',background:CAT_COLORS[i%12],flexShrink:0,display:'inline-block'}}/>
                        <span style={{fontSize:'12px',color:'rgba(255,255,255,0.6)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{CAT_ICONS[cat]||'📦'} {cat}</span>
                        <span style={{fontSize:'12px',color:'#fff',fontWeight:'600',whiteSpace:'nowrap'}}>${(amt as number).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                        <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',width:'30px',textAlign:'right'}}>{(((amt as number)/totalPersSpendCalc)*100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Budget vs Actual progress bars */}
            {catsWithBudget.length > 0 && (
              <div style={{...card(),marginBottom:'1.5rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
                  <h3 style={{margin:0,color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Budget vs Actual</h3>
                  <button onClick={()=>setShowAddCat(!showAddCat)} style={{padding:'6px 14px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.5)',fontSize:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>+ Add Category</button>
                </div>
                {showAddCat && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem',padding:'1rem',background:'rgba(255,255,255,0.03)',borderRadius:'10px',marginBottom:'1rem'}}>
                    <div><label>Category Name</label><input value={newCat.name} onChange={e=>setNewCat({...newCat,name:e.target.value})} placeholder="e.g. Dining Out"/></div>
                    <div><label>Type</label><select value={newCat.type} onChange={e=>setNewCat({...newCat,type:e.target.value as any})}><option value="expense">Expense</option><option value="income">Income</option></select></div>
                    <div><label>Monthly Budget ($)</label><input type="number" value={newCat.budgeted_amount} onChange={e=>setNewCat({...newCat,budgeted_amount:e.target.value})} placeholder="0"/></div>
                    <div><label>Icon</label><input value={newCat.icon} onChange={e=>setNewCat({...newCat,icon:e.target.value})} placeholder="💰"/></div>
                    <div style={{gridColumn:'span 4',display:'flex',gap:'0.5rem'}}>
                      <button onClick={addCategory} style={{padding:'8px 20px',borderRadius:'8px',border:'none',background:ACCENT,color:'#1A1A2E',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>Add</button>
                      <button onClick={()=>setShowAddCat(false)} style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',fontSize:'13px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1rem'}}>
                  {catsWithBudget.map((cat,i) => {
                    const spent = spendByPersCat[cat.name]||0;
                    const budget = parseFloat(cat.budgeted_amount||0);
                    const pct = budget>0?Math.min(100,(spent/budget)*100):0;
                    const over = spent>budget && budget>0;
                    const barColor = over?'#C1121F':pct>80?'#f4a261':'#2A9D8F';
                    return (
                      <div key={cat.id} className="hover-row" style={{padding:'1rem',background:'rgba(255,255,255,0.02)',borderRadius:'12px',border:`1px solid ${over?'rgba(193,18,31,0.3)':'rgba(255,255,255,0.06)'}`,transition:'background 0.15s'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontSize:'18px'}}>{cat.icon||CAT_ICONS[cat.name]||'💰'}</span>
                            <div>
                              <p style={{margin:0,fontSize:'13px',color:'#fff',fontWeight:'600'}}>{cat.name}</p>
                              <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.4px'}}>{cat.type}</p>
                            </div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            {editBudgetId===cat.id ? (
                              <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                                <input type="number" value={editBudgetVal} onChange={e=>setEditBudgetVal(e.target.value)} style={{width:'80px',padding:'4px 8px',fontSize:'12px'}} autoFocus onKeyDown={e=>e.key==='Enter'&&savePersBudget(cat.id)} />
                                <button onClick={()=>savePersBudget(cat.id)} style={{padding:'4px 8px',borderRadius:'5px',border:'none',background:ACCENT,color:'#1A1A2E',fontWeight:'700',fontSize:'11px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>✓</button>
                              </div>
                            ) : (
                              <button onClick={()=>{setEditBudgetId(cat.id);setEditBudgetVal(cat.budgeted_amount?.toString()||'0');}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.2)',cursor:'pointer',fontSize:'11px',fontFamily:'Poppins,sans-serif',textAlign:'right',padding:0}}>
                                {budget>0?`$${budget.toLocaleString()} ✏️`:'Set budget ✏️'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{height:'6px',background:'rgba(255,255,255,0.07)',borderRadius:'4px',overflow:'hidden',marginBottom:'6px'}}>
                          <div className="budget-bar" style={{height:'100%',width:`${Math.min(100,pct)}%`,background:barColor,borderRadius:'4px',boxShadow:`0 0 6px ${barColor}44`}}/>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}>
                          <span style={{color:over?'#C1121F':barColor,fontWeight:'600'}}>${spent.toLocaleString(undefined,{maximumFractionDigits:0})} spent{over?` ⚠️`:''}</span>
                          <span style={{color:'rgba(255,255,255,0.3)'}}>{budget>0?`$${(budget-spent>0?budget-spent:0).toLocaleString(undefined,{maximumFractionDigits:0})} left • ${pct.toFixed(0)}%`:'No budget set'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Build + Import Documents */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>
              <div style={{...card(),borderColor:'rgba(155,93,229,0.25)',background:'rgba(155,93,229,0.04)'}}>
                <h3 style={{margin:'0 0 0.5rem',color:'#9B5DE5',fontSize:'14px',fontWeight:'600'}}>🤖 AI Budget Builder</h3>
                <p style={{margin:'0 0 1rem',color:'rgba(255,255,255,0.4)',fontSize:'12px',lineHeight:'1.6'}}>Upload documents first, then let AI analyze your actual spending and build a realistic monthly budget automatically.</p>
                <button onClick={buildBudgetFromDocs} disabled={aiBuilding||documents.length===0}
                  style={{padding:'10px 20px',borderRadius:'10px',border:'none',background:aiBuilding?'rgba(155,93,229,0.2)':'#9B5DE5',color:'#fff',fontWeight:'700',fontSize:'13px',cursor:aiBuilding||documents.length===0?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif',width:'100%',opacity:documents.length===0?0.5:1}}>
                  {aiBuilding?'🤖 Building Budget...':'🤖 Build Budget from Documents'}
                </button>
                {buildMsg&&<p style={{margin:'0.75rem 0 0',fontSize:'12px',color:buildMsg.startsWith('✅')?'#2A9D8F':'#C1121F',lineHeight:'1.5'}}>{buildMsg}</p>}
                {documents.length===0&&<p style={{margin:'0.5rem 0 0',fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>No documents yet — upload bank statements or pay stubs first.</p>}
              </div>

              {/* Import from document */}
              <div style={card()}>
                <h3 style={{margin:'0 0 1rem',color:'#fff',fontSize:'14px',fontWeight:'600'}}>📥 Import from Document</h3>
                {importMsg&&<div style={{padding:'8px 12px',background:'rgba(42,157,143,0.1)',border:'1px solid rgba(42,157,143,0.3)',borderRadius:'8px',color:'#2A9D8F',fontSize:'12px',marginBottom:'0.75rem'}}>{importMsg}</div>}
                {documents.length===0 ? (
                  <p style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>No documents uploaded. Go to Documents to upload files first.</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',maxHeight:'280px',overflowY:'auto'}}>
                    {documents.map(doc=>{
                      const txCount=(doc.transactions||[]).length;
                      const imported=doc.imported_to_budget===true;
                      const dt=(doc.doc_type||'').toLowerCase();
                      const isPayStub=dt.includes('pay')||dt.includes('stub');
                      const incAmt=isPayStub?(() => {const kf=doc.key_figures||[];const nf=kf.find((k:any)=>k.label?.toLowerCase().includes('net pay'));return parseFloat(nf?.value?.replace(/[$,]/g,'')||doc.net_cashflow||doc.total_income||'0');})():parseFloat(doc.total_income||0);
                      return (
                        <div key={doc.id} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'0.75rem',alignItems:'center',padding:'0.7rem 0.85rem',background:imported?'rgba(42,157,143,0.05)':'rgba(255,255,255,0.03)',borderRadius:'8px',border:`1px solid ${imported?'rgba(42,157,143,0.2)':'rgba(255,255,255,0.06)'}`}}>
                          <div style={{minWidth:0}}>
                            <p style={{margin:0,color:'#fff',fontWeight:'500',fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.file_name}</p>
                            <p style={{margin:'1px 0 0',color:'rgba(255,255,255,0.3)',fontSize:'10px'}}>{doc.doc_type}{doc.period?` • ${doc.period}`:''} • {txCount} tx</p>
                          </div>
                          <span style={{fontSize:'11px',color:'#2A9D8F',fontWeight:'600',whiteSpace:'nowrap'}}>+${incAmt.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                          <span style={{fontSize:'11px',color:'#C1121F',fontWeight:'600',whiteSpace:'nowrap'}}>-${parseFloat(doc.total_expenses||0).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                          {imported ? (
                            <span style={{padding:'3px 10px',borderRadius:'20px',background:'rgba(42,157,143,0.15)',color:'#2A9D8F',fontSize:'10px',fontWeight:'700',whiteSpace:'nowrap'}}>✅ Done</span>
                          ) : txCount===0 ? (
                            <span style={{padding:'3px 10px',borderRadius:'20px',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.2)',fontSize:'10px',whiteSpace:'nowrap'}}>No data</span>
                          ) : (
                            <button onClick={()=>importDocToPersonal(doc)} disabled={importing===doc.id}
                              style={{padding:'4px 12px',borderRadius:'20px',border:'none',background:importing===doc.id?'rgba(155,93,229,0.2)':'#9B5DE5',color:'#fff',fontWeight:'700',fontSize:'10px',cursor:'pointer',fontFamily:'Poppins,sans-serif',whiteSpace:'nowrap'}}>
                              {importing===doc.id?'⏳':'Import'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
