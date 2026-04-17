'use client';
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const G = '#C9A84C'; // gold
const PRODUCTS = [
  {name:'BrandPulse',price:47},{name:'Clarity Engine',price:37},{name:'Flagged',price:4.99},
  {name:'Freedom Era Audit',price:150},{name:'Business Ops Fixer',price:497},
  {name:'Burnout Reset',price:67},{name:'Couples Clarity',price:97},{name:'First-Gen Table',price:17},
];

function KPI({label,value,sub,color,icon,delay=''}:{label:string,value:string,sub?:string,color:string,icon:string,delay?:string}) {
  return (
    <div className={`glass glass-hover fade-up${delay}`} style={{padding:'1.5rem',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,right:0,width:'80px',height:'80px',background:`radial-gradient(circle at top right, ${color}15, transparent 70%)`,pointerEvents:'none'}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
        <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.7px',fontWeight:'600'}}>{label}</p>
        <span style={{fontSize:'18px',opacity:0.7}}>{icon}</span>
      </div>
      <p className="mono" style={{margin:0,fontSize:'26px',fontWeight:'700',color,lineHeight:1,letterSpacing:'-0.5px'}}>{value}</p>
      {sub&&<p style={{margin:'6px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.3)',lineHeight:1.4}}>{sub}</p>}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:'2px',background:`linear-gradient(90deg,${color}66,transparent)`}}/>
    </div>
  );
}

export default function Dashboard() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [persTxs, setPersTxs] = useState<any[]>([]);
  const [networthItems, setNetworthItems] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [er,rr,br,tr,nr,gr] = await Promise.all([
      supabase.from('expenses').select('id,amount,date,description,category,division').order('date',{ascending:false}).limit(200),
      supabase.from('revenue').select('id,amount,date,product_name,source'),
      supabase.from('division_budgets').select('id,division,monthly_budget'),
      supabase.from('personal_transactions').select('*'),
      supabase.from('networth_items').select('id,category,subcategory,value,name'),
      supabase.from('goals').select('id,name,target,current_amount,category,deadline,monthly_contribution'),
    ]);
    if(er.data) setExpenses(er.data);
    if(rr.data) setRevenue(rr.data);
    if(br.data) setBudgets(br.data);
    if(tr.data) setPersTxs(tr.data);
    if(nr.data) setNetworthItems(nr.data);
    if(gr.data) setGoals(gr.data);
    setLoading(false);
  };

  const syncStripe = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/stripe-sync',{method:'POST'});
      const d = await res.json();
      setSyncMsg(d.message||(d.error?`Error: ${d.error}`:'Sync complete'));
      if(d.synced>0) { const {data:rev}=await supabase.from('revenue').select('*'); if(rev) setRevenue(rev); }
    } catch { setSyncMsg('Sync failed.'); }
    setSyncing(false); setTimeout(()=>setSyncMsg(''),5000);
  };

  const getInsight = async () => {
    setLoadingInsight(true); setAiInsight('');
    try {
      const res = await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        model:'claude-sonnet-4-6',max_tokens:250,
        messages:[{role:'user',content:`C.H.A. LLC snapshot: Revenue $${totalRevenue.toFixed(0)}, Business expenses $${totalBizExp.toFixed(0)}, Personal income $${persIncome.toFixed(0)}, Personal spending $${persSpend.toFixed(0)}, Net worth estimate $${netWorth.toFixed(0)}. 8 products live. Give 2 sharp sentences of CFO-level insight. No markdown.`}]
      })});
      const d=await res.json();
      setAiInsight(d.content?.find((c:any)=>c.type==='text')?.text||'');
    } catch {}
    setLoadingInsight(false);
  };

  // ── COMPUTED ──
  const totalRevenue = revenue.reduce((s,r)=>s+parseFloat(r.amount||0),0);
  const totalBizExp = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const bizNet = totalRevenue - totalBizExp;
  const persIncome = persTxs.filter(t=>t.type==='income').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const persSpend = persTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+parseFloat(t.amount||0),0);
  const totalAssets = networthItems.filter(i=>i.category==='asset').reduce((s,i)=>s+parseFloat(i.value||0),0);
  const totalLiabilities = networthItems.filter(i=>i.category==='liability').reduce((s,i)=>s+parseFloat(i.value||0),0);
  const netWorth = totalAssets - totalLiabilities;
  const totalBizBudget = budgets.reduce((s,b)=>s+parseFloat(b.monthly_budget||0),0);
  const budgetUsed = totalBizBudget>0?Math.min(100,(totalBizExp/totalBizBudget)*100):0;
  const savingsRate = persIncome>0?Math.max(0,((persIncome-persSpend)/persIncome)*100):0;
  const goalsActive = goals.filter(g=>parseFloat(g.current_amount||0)<parseFloat(g.target||0)).length;

  // 6-month biz trend
  const buildTrend = () => {
    const m: Record<string,{rev:number,exp:number,label:string}> = {};
    const now = new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); const k=d.toISOString().slice(0,7); m[k]={rev:0,exp:0,label:d.toLocaleString('default',{month:'short'})}; }
    revenue.forEach(r=>{ const k=(r.date||'').slice(0,7); if(m[k]) m[k].rev+=parseFloat(r.amount||0); });
    expenses.forEach(e=>{ const k=(e.date||'').slice(0,7); if(m[k]) m[k].exp+=parseFloat(e.amount||0); });
    return Object.values(m);
  };
  const trend = buildTrend();
  const maxTrend = Math.max(...trend.map(t=>Math.max(t.rev,t.exp)),1);

  // Financial health score (0-100)
  const healthScore = Math.min(100, Math.round(
    (bizNet>=0?20:0) + (savingsRate>20?20:savingsRate) + (totalRevenue>0?20:0) + (budgetUsed<80?20:10) + (netWorth>0?20:Math.max(0,20+(netWorth/1000)))
  ));
  const healthColor = healthScore>=80?'#2A9D8F':healthScore>=60?G:healthScore>=40?'#f4a261':'#ef4444';
  const healthLabel = healthScore>=80?'Excellent':healthScore>=60?'Good':healthScore>=40?'Fair':'Needs Attention';

  // Recent txs combined
  const recentBiz = expenses.slice(0,3).map(e=>({...e,_type:'biz',_label:e.description||e.category,_amt:-e.amount}));
  const recentPers = persTxs.slice(0,3).map(t=>({...t,_type:'pers',_label:t.description||t.category_name,_amt:t.type==='income'?t.amount:-t.amount}));
  const recent = [...recentBiz,...recentPers].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);

  return (
    <Layout activeTab="dashboard">
      {/* ── PAGE HEADER ── */}
      <div className="fade-up" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
        <div>
          <h2 style={{margin:'0 0 4px',fontSize:'26px',fontWeight:'700',fontFamily:"'Lora',serif",color:'#fff',letterSpacing:'-0.5px'}}>
            Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, CJ
          </h2>
          <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>Here's your complete financial picture for {new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button className="btn btn-ghost" onClick={getInsight} disabled={loadingInsight}
            style={{padding:'9px 18px',borderRadius:'10px',fontSize:'12px'}}>
            {loadingInsight?'✨ Thinking...':'✨ AI Insight'}
          </button>
          <button className="btn btn-gold" onClick={syncStripe} disabled={syncing}
            style={{padding:'9px 18px',borderRadius:'10px',fontSize:'12px'}}>
            {syncing?'⏳ Syncing...':'⚡ Sync Stripe'}
          </button>
        </div>
      </div>

      {/* Sync / AI messages */}
      {syncMsg&&<div className="fade-up glass" style={{padding:'10px 16px',marginBottom:'1.5rem',borderColor:'rgba(42,157,143,0.3)',color:'#2A9D8F',fontSize:'13px'}}>{syncMsg}</div>}
      {aiInsight&&<div className="fade-up glass" style={{padding:'1rem 1.25rem',marginBottom:'1.5rem',borderColor:'rgba(155,93,229,0.3)',background:'rgba(155,93,229,0.06)'}}>
        <p style={{margin:0,color:'rgba(255,255,255,0.8)',fontSize:'13px',lineHeight:'1.7'}}>✨ {aiInsight}</p>
      </div>}

      {/* ── FINANCIAL HEALTH SCORE ── */}
      <div className="fade-up glass" style={{padding:'1.5rem',marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:'2rem',flexWrap:'wrap'}}>
        <div style={{flexShrink:0}}>
          <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.7px',fontWeight:'600'}}>Financial Health</p>
          <div style={{display:'flex',alignItems:'baseline',gap:'8px'}}>
            <span className="mono" style={{fontSize:'48px',fontWeight:'700',color:healthColor,lineHeight:1}}>{healthScore}</span>
            <span style={{fontSize:'14px',color:'rgba(255,255,255,0.3)'}}>/100</span>
          </div>
          <span style={{padding:'3px 12px',borderRadius:'20px',background:`${healthColor}18`,color:healthColor,fontSize:'11px',fontWeight:'700'}}>{healthLabel}</span>
        </div>
        <div style={{flex:1,minWidth:'200px'}}>
          <div className="progress-track" style={{height:'8px',marginBottom:'8px'}}>
            <div className="progress-fill" style={{height:'100%',width:`${healthScore}%`,background:`linear-gradient(90deg,${healthColor},${healthColor}88)`}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
            {[
              {label:'Business',ok:bizNet>=0,val:`$${Math.abs(bizNet).toFixed(0)} ${bizNet>=0?'profit':'loss'}`},
              {label:'Savings Rate',ok:savingsRate>10,val:`${savingsRate.toFixed(0)}%`},
              {label:'Budget Use',ok:budgetUsed<80,val:`${budgetUsed.toFixed(0)}%`},
              {label:'Net Worth',ok:netWorth>=0,val:`$${Math.abs(netWorth).toFixed(0)}`},
            ].map(m=>(
              <div key={m.label}>
                <p style={{margin:'0 0 2px',fontSize:'10px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{m.label}</p>
                <p className="mono" style={{margin:0,fontSize:'13px',fontWeight:'600',color:m.ok?'#2A9D8F':'#ef4444'}}>{m.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
        <KPI label="Business Revenue" value={`$${totalRevenue.toLocaleString(undefined,{maximumFractionDigits:0})}`} sub={`${revenue.length} sales recorded`} color="#2A9D8F" icon="↗" delay=" fade-up-1"/>
        <KPI label="Business Expenses" value={`$${totalBizExp.toLocaleString(undefined,{maximumFractionDigits:0})}`} sub={`${expenses.length} transactions`} color="#ef4444" icon="↙" delay=" fade-up-2"/>
        <KPI label="Personal Income" value={`$${persIncome.toLocaleString(undefined,{maximumFractionDigits:0})}`} sub={`Savings rate ${savingsRate.toFixed(0)}%`} color={G} icon="◎" delay=" fade-up-3"/>
        <KPI label="Net Worth" value={`${netWorth>=0?'+':''}$${Math.abs(netWorth).toLocaleString(undefined,{maximumFractionDigits:0})}`} sub={`${networthItems.length} items tracked`} color={netWorth>=0?'#2A9D8F':'#ef4444'} icon="◆" delay=" fade-up-4"/>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>

        {/* Revenue vs Expenses chart */}
        <div className="glass fade-up" style={{padding:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
            <h3 style={{margin:0,fontSize:'14px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>Business Trend — 6 Months</h3>
            <div style={{display:'flex',gap:'1rem'}}>
              {[['#2A9D8F','Revenue'],['#ef4444','Expenses']].map(([c,l])=>(
                <span key={l} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
                  <span style={{width:'10px',height:'10px',borderRadius:'2px',background:c,display:'inline-block'}}/>{l}
                </span>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'flex-end',height:'160px'}}>
            {trend.map((m,i)=>(
              <div key={m.label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',height:'100%',justifyContent:'flex-end'}}>
                <div style={{width:'100%',display:'flex',gap:'3px',alignItems:'flex-end',height:'140px'}}>
                  <div style={{flex:1,background:i===5?'#2A9D8F':'rgba(42,157,143,0.3)',borderRadius:'4px 4px 0 0',height:`${(m.rev/maxTrend)*140}px`,minHeight:m.rev>0?'3px':'0',transition:'height 0.8s ease'}}/>
                  <div style={{flex:1,background:i===5?'#ef4444':'rgba(239,68,68,0.3)',borderRadius:'4px 4px 0 0',height:`${(m.exp/maxTrend)*140}px`,minHeight:m.exp>0?'3px':'0',transition:'height 0.8s ease'}}/>
                </div>
                <span style={{fontSize:'10px',color:i===5?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.25)',fontWeight:i===5?'700':'400'}}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget health + Goals */}
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="glass fade-up fade-up-1" style={{padding:'1.5rem',flex:1}}>
            <h3 style={{margin:'0 0 1rem',fontSize:'13px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>Budget Health</h3>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)'}}>Used</span>
              <span className="mono" style={{fontSize:'12px',color:budgetUsed>80?'#ef4444':G,fontWeight:'600'}}>{budgetUsed.toFixed(0)}%</span>
            </div>
            <div className="progress-track" style={{height:'10px',marginBottom:'12px'}}>
              <div className="progress-fill" style={{height:'100%',width:`${Math.min(100,budgetUsed)}%`,background:budgetUsed>80?'linear-gradient(90deg,#ef4444,#ff6b6b)':'linear-gradient(90deg,#C9A84C,#2A9D8F)'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px'}}>
              <span style={{color:'rgba(255,255,255,0.3)'}}>Spent: <span className="mono" style={{color:'#ef4444'}}>${totalBizExp.toFixed(0)}</span></span>
              <span style={{color:'rgba(255,255,255,0.3)'}}>Budget: <span className="mono" style={{color:G}}>${totalBizBudget.toFixed(0)}</span></span>
            </div>
          </div>
          <div className="glass fade-up fade-up-2" style={{padding:'1.5rem',flex:1}}>
            <h3 style={{margin:'0 0 1rem',fontSize:'13px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>Active Goals</h3>
            {goals.slice(0,3).map(g=>{
              const pct=parseFloat(g.target)>0?Math.min(100,(parseFloat(g.current_amount||0)/parseFloat(g.target))*100):0;
              return(
                <div key={g.id} style={{marginBottom:'0.85rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                    <span style={{fontSize:'12px',color:'rgba(255,255,255,0.65)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{g.name}</span>
                    <span className="mono" style={{fontSize:'11px',color:G,fontWeight:'600',flexShrink:0,marginLeft:'8px'}}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track" style={{height:'5px'}}>
                    <div className="progress-fill" style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${G},#9B5DE5)`}}/>
                  </div>
                </div>
              );
            })}
            {goals.length===0&&<p style={{fontSize:'12px',color:'rgba(255,255,255,0.25)'}}>No goals yet. <Link href="/goals" style={{color:G,textDecoration:'none'}}>Add one →</Link></p>}
          </div>
        </div>
      </div>

      {/* ── PRODUCTS + RECENT ACTIVITY ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>
        {/* Products */}
        <div className="glass fade-up" style={{padding:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <h3 style={{margin:0,fontSize:'13px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>Live Products</h3>
            <span className="chip chip-income">8 Live</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
            {PRODUCTS.map((p,i)=>{
              const revenueForProduct = revenue.filter(r=>r.product_name?.toLowerCase().includes(p.name.toLowerCase())).reduce((s,r)=>s+parseFloat(r.amount||0),0);
              return(
                <div key={p.name} className="glass-hover" style={{padding:'0.75rem',borderRadius:'10px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                  <p style={{margin:'0 0 3px',fontSize:'12px',fontWeight:'600',color:'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                    <span className="mono" style={{fontSize:'11px',color:G}}>${p.price}</span>
                    {revenueForProduct>0&&<span className="mono" style={{fontSize:'10px',color:'#2A9D8F'}}>${revenueForProduct.toFixed(0)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="glass fade-up fade-up-1" style={{padding:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <h3 style={{margin:0,fontSize:'13px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>Recent Activity</h3>
            <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{recent.length} transactions</span>
          </div>
          {recent.length===0?<p style={{fontSize:'12px',color:'rgba(255,255,255,0.25)',textAlign:'center',padding:'1.5rem 0'}}>No transactions yet</p>:(
            <div>
              {recent.map((t,i)=>(
                <div key={`${t.id}-${i}`} className="tbl-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.65rem 0'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'8px',background:t._type==='biz'?'rgba(201,168,76,0.1)':'rgba(155,93,229,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>
                      {t._type==='biz'?'🏢':'👤'}
                    </div>
                    <div style={{minWidth:0}}>
                      <p style={{margin:0,fontSize:'12px',color:'rgba(255,255,255,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(t._label||'').slice(0,30)}</p>
                      <p style={{margin:0,fontSize:'10px',color:'rgba(255,255,255,0.25)'}}>{t.date||'—'}</p>
                    </div>
                  </div>
                  <span className="mono" style={{fontSize:'13px',fontWeight:'700',color:parseFloat(t._amt)>=0?'#2A9D8F':'#ef4444',flexShrink:0,marginLeft:'8px'}}>
                    {parseFloat(t._amt)>=0?'+':''}${Math.abs(parseFloat(t._amt)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="glass fade-up" style={{padding:'1.5rem'}}>
        <h3 style={{margin:'0 0 1rem',fontSize:'13px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>Quick Actions</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'0.75rem'}}>
          {[
            {href:'/documents',icon:'⬆',label:'Upload Doc',color:'#C9A84C'},
            {href:'/expenses',icon:'↙',label:'Add Expense',color:'#ef4444'},
            {href:'/revenue',icon:'↗',label:'Log Revenue',color:'#2A9D8F'},
            {href:'/goals',icon:'◈',label:'Set Goal',color:'#9B5DE5'},
            {href:'/budgets',icon:'◎',label:'Budgets',color:'#C9A84C'},
            {href:'/tax',icon:'⬡',label:'Tax Plan',color:'#f4a261'},
          ].map(a=>(
            <Link key={a.href} href={a.href} style={{textDecoration:'none'}}>
              <div className="glass-hover" style={{padding:'1rem',borderRadius:'12px',textAlign:'center',border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'10px',background:`${a.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',margin:'0 auto 8px'}}>{a.icon}</div>
                <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.5)',fontWeight:'500'}}>{a.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
