'use client';
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const DIVISIONS = ['Consulting', 'Tea Time Network', 'Digital Tools', 'Books'];
const BIZ_CATEGORIES = ['Software & Tools','Marketing & Ads','Hosting & Infrastructure','Payroll','Content & Media','Travel','Equipment','Professional Services','Education','Meals & Entertainment','Other'];
const PERS_CATEGORIES = ['Housing / Rent','Food & Groceries','Transportation','Health & Wellness','Entertainment','Credit Card Payments','Savings','Emergency Fund','Federal Income Tax','State Income Tax','Social Security','Medicare','Taxes','Personal Care','Other Income','Salary / Wages'];
const DIV_COLORS: Record<string,string> = { Consulting:'#C9A84C', 'Tea Time Network':'#9B5DE5', 'Digital Tools':'#2A9D8F', Books:'#C1121F' };
const CAT_ICONS: Record<string,string> = {
  'Software & Tools':'💻','Marketing & Ads':'📣','Hosting & Infrastructure':'🖥️','Payroll':'👥','Content & Media':'🎬','Travel':'✈️','Equipment':'🔧','Professional Services':'⚖️','Education':'📚','Meals & Entertainment':'🍽️','Other':'📦',
  'Housing / Rent':'🏠','Food & Groceries':'🛒','Transportation':'🚗','Health & Wellness':'💊','Entertainment':'🎭','Credit Card Payments':'💳','Savings':'🏦','Emergency Fund':'🛡️','Federal Income Tax':'🏛️','State Income Tax':'🏛️','Social Security':'🔐','Medicare':'🏥','Taxes':'🏛️','Personal Care':'🧴','Other Income':'💰','Salary / Wages':'💵',
};
const ACCENT = '#C9A84C';
const card = (extra = {}) => ({ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'1.5rem', ...extra });

type Mode = 'business'|'personal';

export default function Expenses() {
  const [mode, setMode] = useState<Mode>('business');
  // Business
  const [bizExpenses, setBizExpenses] = useState<any[]>([]);
  // Personal
  const [persTxs, setPersTxs] = useState<any[]>([]);
  // UI state
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterDiv, setFilterDiv] = useState('All');
  const [sortBy, setSortBy] = useState<'date'|'amount'>('date');
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  // Forms
  const [bizForm, setBizForm] = useState({ division:'Consulting', category:'Software & Tools', amount:'', description:'', date: new Date().toISOString().split('T')[0] });
  const [persForm, setPersForm] = useState({ category_name:'Personal Care', type:'expense' as 'income'|'expense', amount:'', description:'', date: new Date().toISOString().split('T')[0] });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [er, tr] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('personal_transactions').select('*').order('date', { ascending: false }),
    ]);
    if (er.data) setBizExpenses(er.data);
    if (tr.data) setPersTxs(tr.data);
    setLoading(false);
  };

  const saveBiz = async () => {
    if (!bizForm.description || !bizForm.amount) return;
    setSaving(true);
    const { data } = await supabase.from('expenses').insert([{ division:bizForm.division, category:bizForm.category, amount:parseFloat(bizForm.amount), description:bizForm.description, date:bizForm.date, is_business:true }]).select();
    if (data) { setBizExpenses(prev => [data[0],...prev]); setBizForm({ division:'Consulting', category:'Software & Tools', amount:'', description:'', date:new Date().toISOString().split('T')[0] }); setShowForm(false); }
    setSaving(false);
  };

  const savePers = async () => {
    if (!persForm.description || !persForm.amount) return;
    setSaving(true);
    const { data } = await supabase.from('personal_transactions').insert([{ category_name:persForm.category_name, type:persForm.type, amount:parseFloat(persForm.amount), description:persForm.description, date:persForm.date, source:'manual', is_personal:true }]).select();
    if (data) { setPersTxs(prev => [data[0],...prev]); setPersForm({ category_name:'Personal Care', type:'expense', amount:'', description:'', date:new Date().toISOString().split('T')[0] }); setShowForm(false); }
    setSaving(false);
  };

  const deleteRow = async (id: string, table: string) => {
    await supabase.from(table).delete().eq('id', id);
    if (table === 'expenses') setBizExpenses(prev => prev.filter(e => e.id !== id));
    else setPersTxs(prev => prev.filter(t => t.id !== id));
    setDeleteId(null);
  };

  const getAiInsight = async () => {
    setLoadingAi(true); setAiInsight('');
    const isBiz = mode === 'business';
    const data_summary = isBiz
      ? `Business expenses: ${filteredBiz.length} items, total $${totalBiz.toFixed(0)}. Top categories: ${topBizCats.slice(0,4).map(([c,a])=>`${c} $${(a as number).toFixed(0)}`).join(', ')}.`
      : `Personal transactions: ${filteredPers.length} items. Income: $${persIncome.toFixed(0)}, Expenses: $${persExpense.toFixed(0)}, Net: $${(persIncome-persExpense).toFixed(0)}. Top categories: ${topPersCats.slice(0,4).map(([c,a])=>`${c} $${(a as number).toFixed(0)}`).join(', ')}.`;
    try {
      const res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:300, messages:[{ role:'user', content:`${data_summary} Give 2-3 sharp, specific financial insights. Be direct, no fluff. Plain text, no markdown.` }] }) });
      const d = await res.json();
      setAiInsight(d.content?.find((c:any)=>c.type==='text')?.text || '');
    } catch {}
    setLoadingAi(false);
  };

  const exportCSV = () => {
    const rows = mode === 'business'
      ? [['Date','Division','Category','Description','Amount'], ...filteredBiz.map((e:any)=>[e.date,e.division,e.category,e.description,e.amount])]
      : [['Date','Type','Category','Description','Amount'], ...filteredPers.map((t:any)=>[t.date,t.type,t.category_name,t.description,t.amount])];
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `cha-${mode}-expenses-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // Business computed
  const filteredBiz = bizExpenses.filter(e =>
    (filterDiv === 'All' || e.division === filterDiv) &&
    (filterCat === 'All' || e.category === filterCat) &&
    (!search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.category?.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b) => sortBy === 'amount' ? b.amount - a.amount : b.date?.localeCompare(a.date));
  const totalBiz = filteredBiz.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const bizCatTotals: Record<string,number> = {};
  filteredBiz.forEach(e => { bizCatTotals[e.category] = (bizCatTotals[e.category]||0) + parseFloat(e.amount||0); });
  const topBizCats = Object.entries(bizCatTotals).sort((a,b)=>b[1]-a[1]);
  const bizDivTotals: Record<string,number> = {};
  bizExpenses.forEach(e => { bizDivTotals[e.division] = (bizDivTotals[e.division]||0) + parseFloat(e.amount||0); });
  const totalAllBiz = bizExpenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);

  // Personal computed
  const filteredPers = persTxs.filter(t =>
    (filterCat === 'All' || t.category_name === filterCat) &&
    (!search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category_name?.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b) => sortBy === 'amount' ? b.amount - a.amount : b.date?.localeCompare(a.date));
  const persIncome = filteredPers.filter(t=>t.type==='income').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const persExpense = filteredPers.filter(t=>t.type==='expense').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const persCatTotals: Record<string,number> = {};
  filteredPers.filter(t=>t.type==='expense').forEach(t => { persCatTotals[t.category_name] = (persCatTotals[t.category_name]||0)+parseFloat(t.amount||0); });
  const topPersCats = Object.entries(persCatTotals).sort((a,b)=>b[1]-a[1]);
  const maxPers = topPersCats[0]?.[1] || 1;

  // 6-month bar chart
  const buildMonthly = () => {
    const months: Record<string,{inc:number,exp:number,label:string}> = {};
    const now = new Date();
    for (let i=5;i>=0;i--) {
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      const key = d.toISOString().slice(0,7);
      months[key] = {inc:0,exp:0,label:d.toLocaleString('default',{month:'short'})};
    }
    if (mode==='business') {
      bizExpenses.forEach(e=>{ const k=(e.date||'').slice(0,7); if(months[k]) months[k].exp+=parseFloat(e.amount||0); });
    } else {
      persTxs.forEach(t=>{ const k=(t.date||'').slice(0,7); if(!months[k]) return; if(t.type==='income') months[k].inc+=parseFloat(t.amount||0); else months[k].exp+=parseFloat(t.amount||0); });
    }
    return Object.values(months);
  };
  const monthly = buildMonthly();
  const maxBar = Math.max(...monthly.map(m=>Math.max(m.inc,m.exp)),1);

  const catColors = ['#C9A84C','#9B5DE5','#2A9D8F','#C1121F','#3a86ff','#f4a261','#06d6a0','#ef476f','#ffd166','#e9c46a'];

  return (
    <Layout activeTab="expenses">
      <style>{`
        .exp-row:hover { background: rgba(255,255,255,0.05) !important; }
        .toggle-btn { transition: all 0.2s ease; }
        .toggle-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
        input, select { background:rgba(255,255,255,0.06)!important; border:1px solid rgba(255,255,255,0.12)!important; color:#fff!important; border-radius:8px!important; padding:9px 12px!important; font-size:13px!important; width:100%; font-family:Poppins,sans-serif; outline:none; }
        input:focus, select:focus { border-color:${ACCENT}!important; }
        label { display:block; font-size:11px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:5px; font-weight:600; }
      `}</style>
      <div style={{maxWidth:'1280px'}}>

        {/* ── HEADER ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h2 style={{margin:'0 0 4px',color:'#fff',fontSize:'24px',fontWeight:'700',fontFamily:"'Lora',serif",letterSpacing:'-0.3px'}}>Expenses</h2>
            <p style={{margin:0,color:'rgba(255,255,255,0.4)',fontSize:'13px'}}>
              {mode==='business' ? `${bizExpenses.length} business transactions • $${totalAllBiz.toLocaleString(undefined,{maximumFractionDigits:0})} total` : `${persTxs.length} personal transactions`}
            </p>
          </div>
          {/* Mode Toggle */}
          <div style={{display:'flex',gap:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'5px'}}>
            {(['business','personal'] as Mode[]).map(m => (
              <button key={m} className="toggle-btn" onClick={()=>{ setMode(m); setFilterCat('All'); setFilterDiv('All'); setSearch(''); }}
                style={{padding:'10px 24px',borderRadius:'8px',border:'none',cursor:'pointer',background:mode===m ? (m==='business'?ACCENT:'#9B5DE5') : 'transparent',color:mode===m?(m==='business'?'#1A1A2E':'#fff'):'rgba(255,255,255,0.45)',fontWeight:mode===m?'700':'400',fontSize:'13px',fontFamily:'Poppins,sans-serif'}}>
                {m==='business'?'🏢 Business':'🧾 Personal'}
              </button>
            ))}
          </div>
        </div>

        {/* ── BUSINESS MODE ── */}
        {mode === 'business' && (
          <div>
            {/* KPI row */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
              {[
                {label:'Total Spent',value:`$${totalBiz.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${filteredBiz.length} transactions`,color:'#C1121F'},
                {label:'Top Category',value:topBizCats[0]?.[0]||'—',sub:topBizCats[0]?`$${(topBizCats[0][1] as number).toFixed(0)}`:'',color:ACCENT},
                {label:'Avg per Transaction',value:filteredBiz.length?`$${(totalBiz/filteredBiz.length).toFixed(0)}`:'—',sub:'mean',color:'#9B5DE5'},
                {label:'This Month',value:`$${monthly[5]?.exp.toLocaleString(undefined,{maximumFractionDigits:0})||'0'}`,sub:monthly[5]?.label||'',color:'#2A9D8F'},
              ].map(k=>(
                <div key={k.label} style={{...card(),borderLeft:`3px solid ${k.color}`}}>
                  <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.6px'}}>{k.label}</p>
                  <p style={{margin:0,fontSize:'22px',fontWeight:'700',color:k.color,lineHeight:1}}>{k.value}</p>
                  {k.sub&&<p style={{margin:'4px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Division breakdown + Chart */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>
              {/* Division cards */}
              <div style={card()}>
                <h3 style={{margin:'0 0 1.25rem',color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>By Division</h3>
                {DIVISIONS.map(div=>{
                  const spent = bizDivTotals[div]||0;
                  const pct = totalAllBiz>0?(spent/totalAllBiz)*100:0;
                  return (
                    <div key={div} style={{marginBottom:'1rem',cursor:'pointer'}} onClick={()=>setFilterDiv(filterDiv===div?'All':div)}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',alignItems:'center'}}>
                        <span style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'50%',background:DIV_COLORS[div],display:'inline-block',boxShadow:`0 0 8px ${DIV_COLORS[div]}66`}}/>
                          <span style={{fontSize:'13px',color:filterDiv===div?DIV_COLORS[div]:'rgba(255,255,255,0.75)',fontWeight:filterDiv===div?'700':'400'}}>{div}</span>
                        </span>
                        <span style={{fontSize:'13px',color:'#fff',fontWeight:'600'}}>${spent.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                      </div>
                      <div style={{height:'6px',background:'rgba(255,255,255,0.07)',borderRadius:'4px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:DIV_COLORS[div],borderRadius:'4px',transition:'width 0.5s ease',boxShadow:`0 0 8px ${DIV_COLORS[div]}44`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 6-month bar chart */}
              <div style={card()}>
                <h3 style={{margin:'0 0 1.25rem',color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Monthly Spend Trend</h3>
                <div style={{display:'flex',alignItems:'flex-end',gap:'8px',height:'140px',padding:'0 4px'}}>
                  {monthly.map((m,i)=>(
                    <div key={m.label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
                      <div style={{width:'100%',background:i===5?`${ACCENT}cc`:'rgba(201,168,76,0.3)',borderRadius:'4px 4px 0 0',height:`${(m.exp/maxBar)*120}px`,minHeight:m.exp>0?'4px':'0',transition:'height 0.5s ease',position:'relative'}}>
                        {i===5&&m.exp>0&&<div style={{position:'absolute',top:'-20px',left:'50%',transform:'translateX(-50%)',fontSize:'10px',color:ACCENT,fontWeight:'700',whiteSpace:'nowrap'}}>${m.exp.toFixed(0)}</div>}
                      </div>
                      <span style={{fontSize:'10px',color:i===5?ACCENT:'rgba(255,255,255,0.35)',fontWeight:i===5?'700':'400'}}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category donut / breakdown */}
            <div style={{...card(),marginBottom:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:'0.75rem'}}>
                <h3 style={{margin:0,color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Expense Breakdown</h3>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {['All',...DIVISIONS].map(d=>(
                    <button key={d} onClick={()=>setFilterDiv(d)}
                      style={{padding:'4px 12px',borderRadius:'20px',border:`1px solid ${filterDiv===d?DIV_COLORS[d]||ACCENT:'rgba(255,255,255,0.1)'}`,background:filterDiv===d?`${DIV_COLORS[d]||ACCENT}22`:'transparent',color:filterDiv===d?DIV_COLORS[d]||ACCENT:'rgba(255,255,255,0.4)',fontSize:'11px',fontWeight:'600',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
                {topBizCats.map(([cat,amt],i)=>(
                  <div key={cat} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',background:'rgba(255,255,255,0.03)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',borderColor:filterCat===cat?catColors[i%10]:'rgba(255,255,255,0.06)'}}
                    onClick={()=>setFilterCat(filterCat===cat?'All':cat)}>
                    <div style={{width:'36px',height:'36px',borderRadius:'10px',background:`${catColors[i%10]}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{CAT_ICONS[cat]||'📦'}</div>
                    <div style={{minWidth:0}}>
                      <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.7)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{cat}</p>
                      <p style={{margin:'2px 0 0',fontSize:'14px',fontWeight:'700',color:catColors[i%10]}}>${(amt as number).toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                    </div>
                  </div>
                ))}
                {topBizCats.length===0&&<p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',gridColumn:'1/-1'}}>No expenses yet — add your first one.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── PERSONAL MODE ── */}
        {mode === 'personal' && (
          <div>
            {/* KPI row */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
              {[
                {label:'Total Income',value:`$${persIncome.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${filteredPers.filter(t=>t.type==='income').length} transactions`,color:'#2A9D8F'},
                {label:'Total Expenses',value:`$${persExpense.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${filteredPers.filter(t=>t.type==='expense').length} transactions`,color:'#C1121F'},
                {label:'Net Cash Flow',value:`${(persIncome-persExpense)>=0?'+':''}$${Math.abs(persIncome-persExpense).toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:(persIncome-persExpense)>=0?'Positive ✓':'Negative ✗',color:(persIncome-persExpense)>=0?'#2A9D8F':'#C1121F'},
                {label:'Savings Rate',value:persIncome>0?`${((persIncome-persExpense)/persIncome*100).toFixed(0)}%`:'—',sub:'of income kept',color:'#9B5DE5'},
              ].map(k=>(
                <div key={k.label} style={{...card(),borderLeft:`3px solid ${k.color}`}}>
                  <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.6px'}}>{k.label}</p>
                  <p style={{margin:0,fontSize:'22px',fontWeight:'700',color:k.color,lineHeight:1}}>{k.value}</p>
                  {k.sub&&<p style={{margin:'4px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.35)'}}>{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Income vs Expense chart + Category breakdown */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>
              <div style={card()}>
                <h3 style={{margin:'0 0 1.25rem',color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Monthly Cash Flow</h3>
                <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'140px'}}>
                  {monthly.map((m,i)=>(
                    <div key={m.label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
                      <div style={{width:'100%',display:'flex',gap:'2px',alignItems:'flex-end',height:'120px'}}>
                        <div style={{flex:1,background:'rgba(42,157,143,0.6)',borderRadius:'3px 3px 0 0',height:`${(m.inc/maxBar)*120}px`,minHeight:m.inc>0?'3px':'0',transition:'height 0.5s ease'}}/>
                        <div style={{flex:1,background:'rgba(193,18,31,0.6)',borderRadius:'3px 3px 0 0',height:`${(m.exp/maxBar)*120}px`,minHeight:m.exp>0?'3px':'0',transition:'height 0.5s ease'}}/>
                      </div>
                      <span style={{fontSize:'10px',color:i===5?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.3)',fontWeight:i===5?'700':'400'}}>{m.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'1rem',marginTop:'0.75rem',justifyContent:'center'}}>
                  {[['#2A9D8F','Income'],['#C1121F','Expenses']].map(([c,l])=>(
                    <span key={l} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
                      <span style={{width:'10px',height:'10px',borderRadius:'2px',background:c,display:'inline-block'}}/>{l}
                    </span>
                  ))}
                </div>
              </div>

              <div style={card()}>
                <h3 style={{margin:'0 0 1.25rem',color:'#fff',fontSize:'14px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'0.5px'}}>Where Your Money Goes</h3>
                {topPersCats.slice(0,6).map(([cat,amt],i)=>(
                  <div key={cat} style={{marginBottom:'0.7rem',cursor:'pointer'}} onClick={()=>setFilterCat(filterCat===cat?'All':cat)}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px',alignItems:'center'}}>
                      <span style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',display:'flex',alignItems:'center',gap:'6px'}}>
                        <span style={{fontSize:'14px'}}>{CAT_ICONS[cat]||'📦'}</span>{cat}
                      </span>
                      <span style={{fontSize:'12px',color:catColors[i%10],fontWeight:'700'}}>${(amt as number).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                    </div>
                    <div style={{height:'5px',background:'rgba(255,255,255,0.07)',borderRadius:'3px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${((amt as number)/maxPers)*100}%`,background:catColors[i%10],borderRadius:'3px',transition:'width 0.5s ease'}}/>
                    </div>
                  </div>
                ))}
                {topPersCats.length===0&&<p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px'}}>No expense transactions yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── SHARED: Controls + AI + Table ── */}
        <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'}}>
          <input placeholder="🔍 Search transactions..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{flex:'1',minWidth:'200px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'9px 14px',color:'#fff',fontSize:'13px',fontFamily:'Poppins,sans-serif',outline:'none'}} />
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{width:'auto'}}>
            <option value="All">All Categories</option>
            {(mode==='business'?BIZ_CATEGORIES:PERS_CATEGORIES).map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{width:'auto'}}>
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
          </select>
          <button onClick={getAiInsight} disabled={loadingAi}
            style={{padding:'9px 16px',borderRadius:'10px',border:'none',background:'rgba(155,93,229,0.2)',color:'#9B5DE5',fontWeight:'600',fontSize:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif',whiteSpace:'nowrap'}}>
            {loadingAi?'✨ Analyzing...':'✨ AI Insight'}
          </button>
          <button onClick={exportCSV}
            style={{padding:'9px 14px',borderRadius:'10px',border:'1px solid rgba(201,168,76,0.3)',background:'transparent',color:ACCENT,fontWeight:'600',fontSize:'12px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
            ↓ CSV
          </button>
          <button onClick={()=>setShowForm(!showForm)}
            style={{padding:'9px 20px',borderRadius:'10px',border:'none',background:ACCENT,color:'#1A1A2E',fontWeight:'700',fontSize:'13px',cursor:'pointer',fontFamily:'Poppins,sans-serif',whiteSpace:'nowrap'}}>
            + Add {mode==='business'?'Expense':'Transaction'}
          </button>
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div style={{padding:'1rem 1.25rem',background:'rgba(155,93,229,0.08)',border:'1px solid rgba(155,93,229,0.25)',borderRadius:'12px',marginBottom:'1.25rem'}}>
            <p style={{margin:0,color:'rgba(255,255,255,0.8)',fontSize:'13px',lineHeight:'1.7'}}>✨ {aiInsight}</p>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div style={{...card(),borderColor:`rgba(201,168,76,0.3)`,marginBottom:'1.25rem'}}>
            <h3 style={{margin:'0 0 1.25rem',color:ACCENT,fontSize:'14px',fontWeight:'600'}}>
              {mode==='business'?'+ New Business Expense':'+ New Personal Transaction'}
            </h3>
            {mode==='business' ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
                <div><label>Division</label><select value={bizForm.division} onChange={e=>setBizForm({...bizForm,division:e.target.value})}>{DIVISIONS.map(d=><option key={d}>{d}</option>)}</select></div>
                <div><label>Category</label><select value={bizForm.category} onChange={e=>setBizForm({...bizForm,category:e.target.value})}>{BIZ_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label>Amount ($)</label><input type="number" value={bizForm.amount} onChange={e=>setBizForm({...bizForm,amount:e.target.value})} placeholder="0.00"/></div>
                <div style={{gridColumn:'span 2'}}><label>Description</label><input value={bizForm.description} onChange={e=>setBizForm({...bizForm,description:e.target.value})} placeholder="What was this for?"/></div>
                <div><label>Date</label><input type="date" value={bizForm.date} onChange={e=>setBizForm({...bizForm,date:e.target.value})}/></div>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
                <div><label>Type</label><select value={persForm.type} onChange={e=>setPersForm({...persForm,type:e.target.value as any})}><option value="expense">Expense</option><option value="income">Income</option></select></div>
                <div><label>Category</label><select value={persForm.category_name} onChange={e=>setPersForm({...persForm,category_name:e.target.value})}>{PERS_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label>Amount ($)</label><input type="number" value={persForm.amount} onChange={e=>setPersForm({...persForm,amount:e.target.value})} placeholder="0.00"/></div>
                <div style={{gridColumn:'span 2'}}><label>Description</label><input value={persForm.description} onChange={e=>setPersForm({...persForm,description:e.target.value})} placeholder="What was this?"/></div>
                <div><label>Date</label><input type="date" value={persForm.date} onChange={e=>setPersForm({...persForm,date:e.target.value})}/></div>
              </div>
            )}
            <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
              <button onClick={mode==='business'?saveBiz:savePers} disabled={saving}
                style={{padding:'10px 24px',borderRadius:'10px',border:'none',background:saving?'rgba(201,168,76,0.3)':ACCENT,color:'#1A1A2E',fontWeight:'700',fontSize:'13px',cursor:saving?'not-allowed':'pointer',fontFamily:'Poppins,sans-serif'}}>
                {saving?'Saving...':'Save'}
              </button>
              <button onClick={()=>setShowForm(false)}
                style={{padding:'10px 16px',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',fontSize:'13px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        <div style={card()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <h3 style={{margin:0,color:'#fff',fontSize:'14px',fontWeight:'600'}}>
              {mode==='business'?`Business Transactions (${filteredBiz.length})`:`Personal Transactions (${filteredPers.length})`}
            </h3>
          </div>
          {loading ? (
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',textAlign:'center',padding:'2rem 0'}}>Loading...</p>
          ) : (mode==='business'?filteredBiz:filteredPers).length === 0 ? (
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:'13px',textAlign:'center',padding:'2rem 0'}}>No transactions found. {showForm?'':'Click + Add to get started.'}</p>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                    <th style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.35)',fontWeight:'500',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Date</th>
                    {mode==='business'&&<th style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.35)',fontWeight:'500',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Division</th>}
                    <th style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.35)',fontWeight:'500',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Category</th>
                    <th style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.35)',fontWeight:'500',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Description</th>
                    {mode==='personal'&&<th style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.35)',fontWeight:'500',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Type</th>}
                    <th style={{padding:'8px 12px',textAlign:'right',color:'rgba(255,255,255,0.35)',fontWeight:'500',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Amount</th>
                    <th style={{padding:'8px 12px',width:'40px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(mode==='business'?filteredBiz:filteredPers).slice(0,50).map((row:any)=>(
                    <tr key={row.id} className="exp-row" style={{borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.15s'}}>
                      <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.4)',fontSize:'12px',whiteSpace:'nowrap'}}>{row.date||'—'}</td>
                      {mode==='business'&&(
                        <td style={{padding:'10px 12px'}}>
                          <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',background:`${DIV_COLORS[row.division]||ACCENT}22`,color:DIV_COLORS[row.division]||ACCENT}}>{row.division}</span>
                        </td>
                      )}
                      <td style={{padding:'10px 12px'}}>
                        <span style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'rgba(255,255,255,0.65)'}}>
                          <span>{CAT_ICONS[mode==='business'?row.category:row.category_name]||'📦'}</span>
                          {mode==='business'?row.category:row.category_name}
                        </span>
                      </td>
                      <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.75)',maxWidth:'240px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.description||'—'}</td>
                      {mode==='personal'&&(
                        <td style={{padding:'10px 12px'}}>
                          <span style={{padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',background:row.type==='income'?'rgba(42,157,143,0.2)':'rgba(193,18,31,0.15)',color:row.type==='income'?'#2A9D8F':'#C1121F'}}>{row.type}</span>
                        </td>
                      )}
                      <td style={{padding:'10px 12px',textAlign:'right',fontWeight:'700',fontSize:'14px',color:mode==='personal'&&row.type==='income'?'#2A9D8F':'#C1121F',whiteSpace:'nowrap'}}>
                        {mode==='personal'&&row.type==='income'?'+':'−'}${parseFloat(row.amount||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        {deleteId===row.id ? (
                          <div style={{display:'flex',gap:'4px'}}>
                            <button onClick={()=>deleteRow(row.id,mode==='business'?'expenses':'personal_transactions')} style={{padding:'2px 8px',borderRadius:'4px',border:'none',background:'#C1121F',color:'#fff',fontSize:'11px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>✓</button>
                            <button onClick={()=>setDeleteId(null)} style={{padding:'2px 8px',borderRadius:'4px',border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',fontSize:'11px',cursor:'pointer',fontFamily:'Poppins,sans-serif'}}>✗</button>
                          </div>
                        ) : (
                          <button onClick={()=>setDeleteId(row.id)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.15)',cursor:'pointer',fontSize:'15px',lineHeight:1,padding:'2px 6px'}} title="Delete">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(mode==='business'?filteredBiz:filteredPers).length>50&&(
                <p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:'12px',marginTop:'1rem'}}>Showing first 50 of {(mode==='business'?filteredBiz:filteredPers).length} • Export CSV for full data</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
