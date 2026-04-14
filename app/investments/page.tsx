'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const TYPES=['Stock','ETF','Crypto','Bond','REIT','Mutual Fund','Index Fund','Other'];
const TYPE_COLORS:Record<string,string>={Stock:'#C9A84C',ETF:'#2A9D8F',Crypto:'#f4a261',Bond:'#9B5DE5',REIT:'#3a86ff','Mutual Fund':'#06d6a0','Index Fund':'#ffd166',Other:'#8ecae6'};

export default function Investments() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');
  const [form, setForm] = useState({name:'',ticker:'',type:'Stock',shares:'',purchase_price:'',current_price:'',purchase_date:''});

  useEffect(()=>{ load(); },[]);

  const load = async () => { setLoading(true); const {data}=await supabase.from('investments').select('*').order('created_at',{ascending:false}); if(data) setInvestments(data); setLoading(false); };

  const add = async () => {
    if(!form.name||!form.shares) return; setSaving(true);
    const {data}=await supabase.from('investments').insert([{name:form.name,ticker:form.ticker,type:form.type,shares:parseFloat(form.shares),purchase_price:parseFloat(form.purchase_price)||0,current_price:parseFloat(form.current_price)||0,purchase_date:form.purchase_date||null}]).select();
    if(data){setInvestments(prev=>[data[0],...prev]);setForm({name:'',ticker:'',type:'Stock',shares:'',purchase_price:'',current_price:'',purchase_date:''});setShowForm(false);} setSaving(false);
  };

  const updatePrice = async (id:string) => {
    const val=parseFloat(editVal); if(isNaN(val)) return;
    await supabase.from('investments').update({current_price:val}).eq('id',id);
    setInvestments(prev=>prev.map(i=>i.id===id?{...i,current_price:val}:i)); setEditId(null);
  };

  const del = async (id:string) => { await supabase.from('investments').delete().eq('id',id); setInvestments(prev=>prev.filter(i=>i.id!==id)); };

  const getAnalysis = async () => {
    setAnalyzing(true); setAnalysis('');
    const summary=investments.map(i=>{ const mv=i.shares*i.current_price; const cost=i.shares*i.purchase_price; const gain=mv-cost; return `${i.name}(${i.type}): ${i.shares} shares, cost $${cost.toFixed(0)}, current $${mv.toFixed(0)}, gain $${gain.toFixed(0)}`; }).join('; ');
    try {
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:300,messages:[{role:'user',content:`My portfolio: ${summary||'No investments'}. Total value $${totalValue.toFixed(0)}, total cost $${totalCost.toFixed(0)}. Give 3 specific portfolio insights. Be direct, no markdown.`}]})});
      const d=await res.json(); setAnalysis(d.content?.find((c:any)=>c.type==='text')?.text||'');
    } catch {} setAnalyzing(false);
  };

  // Computed
  const totalValue = investments.reduce((s,i)=>s+(i.shares*i.current_price),0);
  const totalCost = investments.reduce((s,i)=>s+(i.shares*i.purchase_price),0);
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost>0?(totalGain/totalCost)*100:0;

  // By type
  const byType:Record<string,number> = {};
  investments.forEach(i=>{ byType[i.type]=(byType[i.type]||0)+(i.shares*i.current_price); });
  const typeEntries = Object.entries(byType).sort((a,b)=>b[1]-a[1]);

  return (
    <Layout activeTab="investments">
      <div style={{maxWidth:'1280px'}}>
        <div className="fade-up" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h2 style={{margin:'0 0 4px',fontSize:'24px',fontWeight:'700',fontFamily:"'Lora',serif",color:'#fff'}}>Portfolio</h2>
            <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>{investments.length} positions tracked</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-ghost" onClick={getAnalysis} disabled={analyzing} style={{padding:'9px 18px',borderRadius:'10px',fontSize:'12px'}}>{analyzing?'✨ Analyzing...':'✨ AI Analysis'}</button>
            <button className="btn btn-gold" onClick={()=>setShowForm(!showForm)} style={{padding:'9px 18px',borderRadius:'10px',fontSize:'12px'}}>+ Add Position</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="fade-up" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
          {[
            {label:'Portfolio Value',value:`$${totalValue.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${investments.length} positions`,color:'#C9A84C'},
            {label:'Total Cost Basis',value:`$${totalCost.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:'amount invested',color:'rgba(255,255,255,0.4)'},
            {label:'Total Gain/Loss',value:`${totalGain>=0?'+':''}$${Math.abs(totalGain).toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`${gainPct>=0?'+':''}${gainPct.toFixed(1)}%`,color:totalGain>=0?'#2A9D8F':'#ef4444'},
            {label:'Best Performer',value:investments.length>0?(() => { const best=investments.map(i=>({...i,pct:i.purchase_price>0?((i.current_price-i.purchase_price)/i.purchase_price)*100:0})).sort((a,b)=>b.pct-a.pct)[0]; return best?`${best.pct>=0?'+':''}${best.pct.toFixed(0)}%`:'—'; })():'—',sub:investments.length>0?investments.map(i=>({...i,pct:i.purchase_price>0?((i.current_price-i.purchase_price)/i.purchase_price)*100:0})).sort((a,b)=>b.pct-a.pct)[0]?.name||'—':'—',color:'#2A9D8F'},
          ].map(k=>(
            <div key={k.label} className="glass" style={{padding:'1.25rem',borderLeft:`3px solid ${k.color}`}}>
              <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.7px',fontWeight:'600'}}>{k.label}</p>
              <p className="mono" style={{margin:0,fontSize:'22px',fontWeight:'700',color:k.color}}>{k.value}</p>
              <p style={{margin:'4px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Allocation bar */}
        {typeEntries.length>0&&(
          <div className="glass fade-up" style={{padding:'1.5rem',marginBottom:'1.5rem'}}>
            <p style={{margin:'0 0 12px',fontSize:'12px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.7px',fontWeight:'600'}}>Portfolio Allocation</p>
            <div style={{display:'flex',height:'24px',borderRadius:'8px',overflow:'hidden',gap:'2px',marginBottom:'12px'}}>
              {typeEntries.map(([type,val])=>(
                <div key={type} title={`${type}: $${val.toFixed(0)}`} style={{flex:val/totalValue,background:TYPE_COLORS[type]||'#666',minWidth:'4px',transition:'flex 0.6s ease'}}/>
              ))}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}>
              {typeEntries.map(([type,val])=>(
                <span key={type} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'rgba(255,255,255,0.5)'}}>
                  <span style={{width:'10px',height:'10px',borderRadius:'3px',background:TYPE_COLORS[type]||'#666',display:'inline-block'}}/>{type}: <span className="mono" style={{color:TYPE_COLORS[type]||'#fff',fontWeight:'700'}}>{totalValue>0?((val/totalValue)*100).toFixed(0):0}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI analysis */}
        {analysis&&<div className="glass fade-up" style={{padding:'1rem 1.25rem',marginBottom:'1.5rem',borderColor:'rgba(155,93,229,0.3)',background:'rgba(155,93,229,0.06)'}}><p style={{margin:0,color:'rgba(255,255,255,0.8)',fontSize:'13px',lineHeight:'1.7'}}>✨ {analysis}</p></div>}

        {/* Add form */}
        {showForm&&(
          <div className="glass fade-up" style={{padding:'1.5rem',marginBottom:'1.5rem',borderColor:'rgba(201,168,76,0.3)'}}>
            <h3 style={{margin:'0 0 1.25rem',color:'#C9A84C',fontSize:'14px',fontWeight:'600'}}>+ New Position</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem'}}>
              <div style={{gridColumn:'span 2'}}><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Apple Inc."/></div>
              <div><label>Ticker</label><input value={form.ticker} onChange={e=>setForm({...form,ticker:e.target.value.toUpperCase()})} placeholder="AAPL"/></div>
              <div><label>Type</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label>Shares / Units</label><input type="number" value={form.shares} onChange={e=>setForm({...form,shares:e.target.value})} placeholder="10"/></div>
              <div><label>Purchase Price ($)</label><input type="number" value={form.purchase_price} onChange={e=>setForm({...form,purchase_price:e.target.value})} placeholder="150.00"/></div>
              <div><label>Current Price ($)</label><input type="number" value={form.current_price} onChange={e=>setForm({...form,current_price:e.target.value})} placeholder="175.00"/></div>
              <div><label>Purchase Date</label><input type="date" value={form.purchase_date} onChange={e=>setForm({...form,purchase_date:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
              <button className="btn btn-gold" onClick={add} disabled={saving} style={{padding:'9px 22px',borderRadius:'10px',fontSize:'13px'}}>{saving?'Saving...':'Add Position'}</button>
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)} style={{padding:'9px 16px',borderRadius:'10px',fontSize:'13px'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Positions table */}
        {loading?<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'3rem'}}>Loading...</p>
        :investments.length===0?<div className="glass" style={{padding:'4rem',textAlign:'center'}}><p style={{fontSize:'48px',margin:'0 0 1rem'}}>📈</p><p style={{color:'rgba(255,255,255,0.3)',fontSize:'14px'}}>No positions tracked yet. Add your first investment above.</p></div>:(
          <div className="glass fade-up" style={{padding:'1.5rem'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  {['Name','Type','Shares','Cost Basis','Market Value','Gain/Loss','Return',''].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:h===''?'center':'left',color:'rgba(255,255,255,0.3)',fontWeight:'600',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investments.map(inv=>{
                  const mv=inv.shares*inv.current_price;
                  const cost=inv.shares*inv.purchase_price;
                  const gain=mv-cost;
                  const pct=cost>0?(gain/cost)*100:0;
                  return(
                    <tr key={inv.id} className="tbl-row">
                      <td style={{padding:'12px'}}>
                        <p style={{margin:0,fontWeight:'600',color:'#fff',fontSize:'13px'}}>{inv.name}</p>
                        {inv.ticker&&<p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.35)',fontFamily:'JetBrains Mono,monospace'}}>{inv.ticker}</p>}
                      </td>
                      <td style={{padding:'12px'}}><span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',background:`${TYPE_COLORS[inv.type]||'#666'}18`,color:TYPE_COLORS[inv.type]||'#fff'}}>{inv.type}</span></td>
                      <td style={{padding:'12px'}}><span className="mono" style={{color:'rgba(255,255,255,0.6)'}}>{parseFloat(inv.shares||0).toLocaleString()}</span></td>
                      <td style={{padding:'12px'}}><span className="mono" style={{color:'rgba(255,255,255,0.6)'}}>${cost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></td>
                      <td style={{padding:'12px'}}><span className="mono" style={{color:'#fff',fontWeight:'700'}}>${mv.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></td>
                      <td style={{padding:'12px'}}><span className="mono" style={{color:gain>=0?'#2A9D8F':'#ef4444',fontWeight:'700'}}>{gain>=0?'+':''}${gain.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span></td>
                      <td style={{padding:'12px'}}>
                        <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',background:pct>=0?'rgba(42,157,143,0.15)':'rgba(239,68,68,0.15)',color:pct>=0?'#2A9D8F':'#ef4444'}}>{pct>=0?'+':''}{pct.toFixed(1)}%</span>
                      </td>
                      <td style={{padding:'12px',textAlign:'center'}}>
                        {editId===inv.id?(
                          <div style={{display:'flex',gap:'4px'}}>
                            <input type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} style={{width:'90px'}} autoFocus onKeyDown={e=>e.key==='Enter'&&updatePrice(inv.id)}/>
                            <button className="btn btn-gold" onClick={()=>updatePrice(inv.id)} style={{padding:'4px 8px',borderRadius:'6px',fontSize:'11px'}}>✓</button>
                          </div>
                        ):(
                          <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                            <button className="btn btn-ghost" onClick={()=>{setEditId(inv.id);setEditVal(inv.current_price?.toString()||'0');}} style={{padding:'5px 10px',borderRadius:'6px',fontSize:'11px'}}>📝</button>
                            <button onClick={()=>del(inv.id)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.15)',cursor:'pointer',fontSize:'16px',padding:'4px 6px'}}>×</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
