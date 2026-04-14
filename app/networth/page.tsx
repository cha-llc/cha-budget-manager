'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const G='#C9A84C';
const ASSET_SUBS=['Cash','Checking/Savings','Investments','Stocks','Crypto','Retirement/401k','Real Estate','Business Value','Vehicles','Other Assets'];
const LIAB_SUBS=['Credit Cards','Student Loans','Auto Loan','Mortgage','Business Debt','Medical Debt','Personal Loans','Other Debt'];
const SUB_ICONS:Record<string,string>={'Cash':'💵','Checking/Savings':'🏦','Investments':'📈','Stocks':'📊','Crypto':'₿','Retirement/401k':'👴','Real Estate':'🏠','Business Value':'🏢','Vehicles':'🚗','Other Assets':'◆','Credit Cards':'💳','Student Loans':'🎓','Auto Loan':'🚙','Mortgage':'🏠','Business Debt':'📋','Medical Debt':'🏥','Personal Loans':'💰','Other Debt':'❌'};

export default function NetWorth() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'asset'|'liability'>('asset');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');
  const [form, setForm] = useState({name:'',subcategory:'Cash',value:''});

  useEffect(()=>{ load(); },[]);

  const load = async () => { setLoading(true); const {data}=await supabase.from('networth_items').select('*').order('category').order('created_at'); if(data) setItems(data); setLoading(false); };

  const addItem = async () => {
    if(!form.name||!form.value) return; setSaving(true);
    const {data}=await supabase.from('networth_items').insert([{name:form.name,category:type,subcategory:form.subcategory,value:parseFloat(form.value)}]).select();
    if(data){setItems(prev=>[...prev,data[0]]);setForm({name:'',subcategory:'Cash',value:''});setShowForm(false);} setSaving(false);
  };

  const updateValue = async (id:string) => {
    const val=parseFloat(editVal); if(isNaN(val)) return;
    await supabase.from('networth_items').update({value:val}).eq('id',id);
    setItems(prev=>prev.map(i=>i.id===id?{...i,value:val}:i)); setEditId(null);
  };

  const removeItem = async (id:string) => { await supabase.from('networth_items').delete().eq('id',id); setItems(prev=>prev.filter(i=>i.id!==id)); };

  const assets = items.filter(i=>i.category==='asset');
  const liabilities = items.filter(i=>i.category==='liability');
  const totalAssets = assets.reduce((s,i)=>s+parseFloat(i.value||0),0);
  const totalLiabilities = liabilities.reduce((s,i)=>s+parseFloat(i.value||0),0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAsset = totalAssets>0?(totalLiabilities/totalAssets)*100:0;

  // Group by subcategory
  const groupBy = (arr:any[]) => {
    const groups:Record<string,{items:any[],total:number}> = {};
    arr.forEach(i=>{ if(!groups[i.subcategory]) groups[i.subcategory]={items:[],total:0}; groups[i.subcategory].items.push(i); groups[i.subcategory].total+=parseFloat(i.value||0); });
    return Object.entries(groups).sort((a,b)=>b[1].total-a[1].total);
  };
  const assetGroups = groupBy(assets);
  const liabGroups = groupBy(liabilities);

  const COLORS=['#2A9D8F','#C9A84C','#9B5DE5','#3a86ff','#06d6a0','#f4a261','#ffd166','#ef476f','#8ecae6','#023047'];

  return (
    <Layout activeTab="networth">
      <div style={{maxWidth:'1280px'}}>
        <div className="fade-up" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h2 style={{margin:'0 0 4px',fontSize:'24px',fontWeight:'700',fontFamily:"'Lora',serif",color:'#fff'}}>Net Worth</h2>
            <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>{items.length} items tracked</p>
          </div>
          <div style={{display:'flex',gap:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'5px'}}>
            {(['asset','liability'] as const).map(t=>(
              <button key={t} onClick={()=>{setType(t);setShowForm(true);}} style={{padding:'9px 20px',borderRadius:'8px',border:'none',cursor:'pointer',background:type===t&&showForm?t==='asset'?'#2A9D8F':'#ef4444':'transparent',color:type===t&&showForm?'#fff':'rgba(255,255,255,0.45)',fontWeight:'600',fontSize:'12px',fontFamily:'Poppins,sans-serif',transition:'all 0.2s'}}>
                {t==='asset'?'+ Add Asset':'+ Add Liability'}
              </button>
            ))}
          </div>
        </div>

        {/* Net Worth Hero */}
        <div className="fade-up" style={{padding:'2rem',borderRadius:'20px',background:'linear-gradient(135deg,rgba(42,157,143,0.12),rgba(201,168,76,0.08))',border:'1px solid rgba(42,157,143,0.2)',marginBottom:'1.5rem',textAlign:'center'}}>
          <p style={{margin:'0 0 4px',fontSize:'12px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px'}}>Total Net Worth</p>
          <p className="mono" style={{margin:'0 0 12px',fontSize:'48px',fontWeight:'700',color:netWorth>=0?'#2A9D8F':'#ef4444',letterSpacing:'-1px'}}>
            {netWorth>=0?'+':''}{netWorth<0?'-':''}${Math.abs(netWorth).toLocaleString(undefined,{maximumFractionDigits:0})}
          </p>
          <div style={{display:'flex',justifyContent:'center',gap:'3rem',flexWrap:'wrap'}}>
            {[{l:'Total Assets',v:`$${totalAssets.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#2A9D8F'},{l:'Total Liabilities',v:`$${totalLiabilities.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#ef4444'},{l:'Debt Ratio',v:`${debtToAsset.toFixed(0)}%`,c:debtToAsset>50?'#ef4444':G}].map(m=>(
              <div key={m.l}>
                <p style={{margin:'0 0 2px',fontSize:'11px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{m.l}</p>
                <p className="mono" style={{margin:0,fontSize:'22px',fontWeight:'700',color:m.c}}>{m.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Asset allocation bar */}
        {totalAssets>0&&(
          <div className="glass fade-up" style={{padding:'1.25rem',marginBottom:'1.5rem'}}>
            <p style={{margin:'0 0 10px',fontSize:'12px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.7px'}}>Asset Allocation</p>
            <div style={{display:'flex',height:'20px',borderRadius:'10px',overflow:'hidden',gap:'2px',marginBottom:'12px'}}>
              {assetGroups.map(([sub,{total}],i)=>(
                <div key={sub} title={`${sub}: $${total.toFixed(0)}`} style={{flex:total/totalAssets,background:COLORS[i%10],minWidth:'4px',transition:'flex 0.6s ease'}}/>
              ))}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem'}}>
              {assetGroups.map(([sub,{total}],i)=>(
                <span key={sub} style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'rgba(255,255,255,0.5)'}}>
                  <span style={{width:'10px',height:'10px',borderRadius:'3px',background:COLORS[i%10],display:'inline-block'}}/>{sub}: <span className="mono" style={{color:COLORS[i%10],fontWeight:'700'}}>${total.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm&&(
          <div className="glass fade-up" style={{padding:'1.5rem',marginBottom:'1.5rem',borderColor:type==='asset'?'rgba(42,157,143,0.3)':'rgba(239,68,68,0.3)'}}>
            <h3 style={{margin:'0 0 1.25rem',color:type==='asset'?'#2A9D8F':'#ef4444',fontSize:'14px',fontWeight:'600'}}>+ Add {type==='asset'?'Asset':'Liability'}</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
              <div style={{gridColumn:'span 1'}}><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={type==='asset'?'Savings account':'Student loan'}/></div>
              <div><label>Category</label><select value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})}>{(type==='asset'?ASSET_SUBS:LIAB_SUBS).map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label>Value ($)</label><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="0"/></div>
            </div>
            <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
              <button className="btn" onClick={addItem} disabled={saving} style={{padding:'9px 22px',borderRadius:'10px',fontSize:'13px',background:type==='asset'?'#2A9D8F':'#ef4444',color:'#fff'}}>{saving?'Saving...':'Add'}</button>
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)} style={{padding:'9px 16px',borderRadius:'10px',fontSize:'13px'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Assets + Liabilities columns */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
          {[{title:'Assets',groups:assetGroups,total:totalAssets,color:'#2A9D8F'},{title:'Liabilities',groups:liabGroups,total:totalLiabilities,color:'#ef4444'}].map(side=>(
            <div key={side.title} className="glass fade-up" style={{padding:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
                <h3 style={{margin:0,fontSize:'14px',fontWeight:'600',color:'#fff',textTransform:'uppercase',letterSpacing:'0.5px'}}>{side.title}</h3>
                <span className="mono" style={{fontSize:'18px',fontWeight:'700',color:side.color}}>${side.total.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
              </div>
              {side.groups.length===0?<p style={{color:'rgba(255,255,255,0.25)',fontSize:'13px',textAlign:'center',padding:'1.5rem 0'}}>None added</p>:(
                side.groups.map(([sub,{items:groupItems,total}],gi)=>(
                  <div key={sub} style={{marginBottom:'1rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      <span style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'rgba(255,255,255,0.55)',fontWeight:'600'}}>
                        <span>{SUB_ICONS[sub]||'◆'}</span>{sub}
                      </span>
                      <span className="mono" style={{fontSize:'12px',color:COLORS[gi%10],fontWeight:'700'}}>${total.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                    </div>
                    <div className="progress-track" style={{height:'4px',marginBottom:'8px'}}>
                      <div className="progress-fill" style={{height:'100%',width:`${side.total>0?(total/side.total)*100:0}%`,background:COLORS[gi%10]}}/>
                    </div>
                    {groupItems.map(item=>(
                      <div key={item.id} className="tbl-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingLeft:'12px',padding:'6px 0 6px 12px'}}>
                        <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{item.name}</span>
                        {editId===item.id?(
                          <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                            <input type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} style={{width:'100px'}} autoFocus onKeyDown={e=>e.key==='Enter'&&updateValue(item.id)}/>
                            <button className="btn" onClick={()=>updateValue(item.id)} style={{padding:'4px 10px',borderRadius:'6px',background:side.color,color:'#fff',fontSize:'11px'}}>✓</button>
                          </div>
                        ):(
                          <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                            <button onClick={()=>{setEditId(item.id);setEditVal(item.value?.toString()||'0');}} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
                              <span className="mono" style={{fontSize:'13px',fontWeight:'700',color:'#fff'}}>${parseFloat(item.value||0).toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                            </button>
                            <button onClick={()=>removeItem(item.id)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.15)',cursor:'pointer',fontSize:'14px',padding:'2px'}}>×</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
