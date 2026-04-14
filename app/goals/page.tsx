'use client';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';

const G='#C9A84C';
const CATS=['Savings','Emergency Fund','Business','Travel','Investment','Debt Payoff','Education','Property','Retirement','Other'];
const CAT_ICONS:Record<string,string>={Savings:'🏦','Emergency Fund':'🛡️',Business:'🏢',Travel:'✈️',Investment:'📈','Debt Payoff':'💳',Education:'📚',Property:'🏠',Retirement:'👴',Other:'🎯'};
const CAT_COLORS:Record<string,string>={Savings:'#2A9D8F','Emergency Fund':'#3a86ff',Business:'#C9A84C',Travel:'#f4a261',Investment:'#9B5DE5','Debt Payoff':'#C1121F',Education:'#06d6a0',Property:'#ffd166',Retirement:'#8ecae6',Other:'#C9A84C'};

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [editVal, setEditVal] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [form, setForm] = useState({ name:'', target:'', current_amount:'', deadline:'', category:'Savings', monthly_contribution:'' });

  useEffect(()=>{ load(); },[]);

  const load = async () => { setLoading(true); const {data}=await supabase.from('goals').select('*').order('created_at',{ascending:false}); if(data) setGoals(data); setLoading(false); };

  const addGoal = async () => {
    if(!form.name||!form.target) return;
    setSaving(true);
    const {data}=await supabase.from('goals').insert([{ name:form.name, target:parseFloat(form.target), current_amount:parseFloat(form.current_amount)||0, deadline:form.deadline||null, category:form.category, monthly_contribution:parseFloat(form.monthly_contribution)||0 }]).select();
    if(data){ setGoals(prev=>[data[0],...prev]); setForm({name:'',target:'',current_amount:'',deadline:'',category:'Savings',monthly_contribution:''}); setShowForm(false); }
    setSaving(false);
  };

  const updateAmount = async (id:string) => {
    const val=parseFloat(editVal); if(isNaN(val)) return;
    await supabase.from('goals').update({current_amount:val}).eq('id',id);
    setGoals(prev=>prev.map(g=>g.id===id?{...g,current_amount:val}:g)); setEditId(null);
  };

  const deleteGoal = async (id:string) => { await supabase.from('goals').delete().eq('id',id); setGoals(prev=>prev.filter(g=>g.id!==id)); };

  const getAiAdvice = async () => {
    setLoadingAi(true); setAiAdvice('');
    const summary = goals.map(g=>{ const pct=g.target>0?(g.current_amount/g.target)*100:0; return `${g.name}: ${pct.toFixed(0)}% complete, target $${g.target}, monthly $${g.monthly_contribution||0}`; }).join('; ');
    try {
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:300,messages:[{role:'user',content:`My financial goals: ${summary}. Give 3 specific, actionable tips to accelerate these goals. Be direct. No markdown.`}]})});
      const d=await res.json(); setAiAdvice(d.content?.find((c:any)=>c.type==='text')?.text||'');
    } catch {} setLoadingAi(false);
  };

  const totalTarget = goals.reduce((s,g)=>s+parseFloat(g.target||0),0);
  const totalSaved = goals.reduce((s,g)=>s+parseFloat(g.current_amount||0),0);
  const completed = goals.filter(g=>parseFloat(g.current_amount||0)>=parseFloat(g.target||0)).length;
  const overallPct = totalTarget>0?(totalSaved/totalTarget)*100:0;

  const daysUntil = (deadline:string) => {
    if(!deadline) return null;
    const d = Math.ceil((new Date(deadline).getTime()-Date.now())/(1000*60*60*24));
    return d;
  };

  const monthsToGoal = (g:any) => {
    const remaining = parseFloat(g.target)-parseFloat(g.current_amount||0);
    const monthly = parseFloat(g.monthly_contribution||0);
    if(monthly<=0||remaining<=0) return null;
    return Math.ceil(remaining/monthly);
  };

  return (
    <Layout activeTab="goals">
      <div style={{maxWidth:'1280px'}}>
        {/* Header */}
        <div className="fade-up" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h2 style={{margin:'0 0 4px',fontSize:'24px',fontWeight:'700',fontFamily:"'Lora',serif",color:'#fff'}}>Goals</h2>
            <p style={{margin:0,fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>{goals.length} goals · ${totalSaved.toLocaleString(undefined,{maximumFractionDigits:0})} saved of ${totalTarget.toLocaleString(undefined,{maximumFractionDigits:0})} target</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-ghost" onClick={getAiAdvice} disabled={loadingAi} style={{padding:'9px 18px',borderRadius:'10px',fontSize:'12px'}}>{loadingAi?'✨ Analyzing...':'✨ AI Advice'}</button>
            <button className="btn btn-gold" onClick={()=>setShowForm(!showForm)} style={{padding:'9px 18px',borderRadius:'10px',fontSize:'12px'}}>+ New Goal</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="fade-up" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'1.5rem'}}>
          {[
            {label:'Total Goals',value:String(goals.length),sub:'tracking',color:'#9B5DE5'},
            {label:'Total Saved',value:`$${totalSaved.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:`of $${totalTarget.toLocaleString(undefined,{maximumFractionDigits:0})}`,color:G},
            {label:'Overall Progress',value:`${overallPct.toFixed(0)}%`,sub:'across all goals',color:'#2A9D8F'},
            {label:'Completed',value:String(completed),sub:`${goals.length-completed} active`,color:completed>0?'#2A9D8F':'rgba(255,255,255,0.3)'},
          ].map(k=>(
            <div key={k.label} className="glass" style={{padding:'1.25rem',borderLeft:`3px solid ${k.color}`}}>
              <p style={{margin:'0 0 6px',fontSize:'11px',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.7px',fontWeight:'600'}}>{k.label}</p>
              <p className="mono" style={{margin:0,fontSize:'24px',fontWeight:'700',color:k.color}}>{k.value}</p>
              <p style={{margin:'4px 0 0',fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        {goals.length>0&&(
          <div className="glass fade-up" style={{padding:'1.25rem',marginBottom:'1.5rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',fontSize:'12px'}}>
              <span style={{color:'rgba(255,255,255,0.5)'}}>Overall Progress</span>
              <span className="mono" style={{color:G,fontWeight:'700'}}>{overallPct.toFixed(1)}%</span>
            </div>
            <div className="progress-track" style={{height:'12px'}}>
              <div className="progress-fill" style={{height:'100%',width:`${Math.min(100,overallPct)}%`,background:`linear-gradient(90deg,${G},#9B5DE5)`}}/>
            </div>
          </div>
        )}

        {/* AI Advice */}
        {aiAdvice&&<div className="glass fade-up" style={{padding:'1rem 1.25rem',marginBottom:'1.5rem',borderColor:'rgba(155,93,229,0.3)',background:'rgba(155,93,229,0.06)'}}><p style={{margin:0,color:'rgba(255,255,255,0.8)',fontSize:'13px',lineHeight:'1.7'}}>✨ {aiAdvice}</p></div>}

        {/* Add Form */}
        {showForm&&(
          <div className="glass fade-up" style={{padding:'1.5rem',marginBottom:'1.5rem',borderColor:'rgba(201,168,76,0.3)'}}>
            <h3 style={{margin:'0 0 1.25rem',color:G,fontSize:'14px',fontWeight:'600'}}>+ New Goal</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
              <div style={{gridColumn:'span 2'}}><label>Goal Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Emergency Fund"/></div>
              <div><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label>Target Amount ($)</label><input type="number" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} placeholder="10000"/></div>
              <div><label>Current Amount ($)</label><input type="number" value={form.current_amount} onChange={e=>setForm({...form,current_amount:e.target.value})} placeholder="0"/></div>
              <div><label>Monthly Contribution ($)</label><input type="number" value={form.monthly_contribution} onChange={e=>setForm({...form,monthly_contribution:e.target.value})} placeholder="500"/></div>
              <div><label>Target Date</label><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></div>
            </div>
            <div style={{display:'flex',gap:'0.75rem',marginTop:'1.25rem'}}>
              <button className="btn btn-gold" onClick={addGoal} disabled={saving} style={{padding:'9px 22px',borderRadius:'10px',fontSize:'13px'}}>{saving?'Saving...':'Save Goal'}</button>
              <button className="btn btn-ghost" onClick={()=>setShowForm(false)} style={{padding:'9px 16px',borderRadius:'10px',fontSize:'13px'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Goals grid */}
        {loading?<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'3rem'}}>Loading...</p>
        :goals.length===0?<div className="glass" style={{padding:'4rem',textAlign:'center'}}><p style={{fontSize:'48px',margin:'0 0 1rem'}}>🎯</p><p style={{color:'rgba(255,255,255,0.3)',fontSize:'14px'}}>No goals yet. Click <strong style={{color:G}}>+ New Goal</strong> to start tracking your financial milestones.</p></div>:(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'1.25rem'}}>
            {goals.map(g=>{
              const target=parseFloat(g.target||0);
              const current=parseFloat(g.current_amount||0);
              const pct=target>0?Math.min(100,(current/target)*100):0;
              const done=current>=target;
              const color=done?'#2A9D8F':CAT_COLORS[g.category]||G;
              const days=daysUntil(g.deadline);
              const months=monthsToGoal(g);
              return(
                <div key={g.id} className="glass glass-hover" style={{padding:'1.5rem',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(90deg,${color},${color}44)`}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'40px',height:'40px',borderRadius:'12px',background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>{CAT_ICONS[g.category]||'🎯'}</div>
                      <div>
                        <p style={{margin:0,fontSize:'14px',fontWeight:'700',color:'#fff'}}>{g.name}</p>
                        <span className="chip" style={{background:`${color}18`,color,fontSize:'10px',padding:'2px 8px'}}>{g.category}</span>
                      </div>
                    </div>
                    {done&&<span style={{fontSize:'20px'}}>🏆</span>}
                  </div>

                  {/* Big percentage ring visual */}
                  <div style={{display:'flex',alignItems:'center',gap:'1.25rem',marginBottom:'1rem'}}>
                    <div style={{position:'relative',flexShrink:0}}>
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"/>
                        <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
                          strokeDasharray={`${2*Math.PI*32}`}
                          strokeDashoffset={`${2*Math.PI*32*(1-pct/100)}`}
                          strokeLinecap="round" transform="rotate(-90 40 40)" style={{transition:'stroke-dashoffset 1s ease'}}/>
                      </svg>
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span className="mono" style={{fontSize:'14px',fontWeight:'700',color}}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p style={{margin:'0 0 4px',fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>Saved</p>
                      <p className="mono" style={{margin:'0 0 8px',fontSize:'18px',fontWeight:'700',color:'#fff'}}>${current.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                      <p style={{margin:0,fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>of <span className="mono" style={{color}}>${target.toLocaleString(undefined,{maximumFractionDigits:0})}</span></p>
                    </div>
                  </div>

                  <div className="progress-track" style={{height:'6px',marginBottom:'1rem'}}>
                    <div className="progress-fill" style={{height:'100%',width:`${pct}%`,background:color,boxShadow:`0 0 8px ${color}44`}}/>
                  </div>

                  <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',fontSize:'11px',color:'rgba(255,255,255,0.35)',marginBottom:'0.85rem'}}>
                    {days!==null&&<span style={{color:days<30?'#f4a261':'rgba(255,255,255,0.35)'}}>📅 {days>0?`${days} days left`:'Past deadline'}</span>}
                    {months!==null&&<span>📆 ~{months}mo to goal</span>}
                    {g.monthly_contribution>0&&<span className="mono">+${g.monthly_contribution}/mo</span>}
                  </div>

                  <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                    {editId===g.id?(
                      <div style={{display:'flex',gap:'4px',flex:1}}>
                        <input type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} style={{flex:1}} autoFocus onKeyDown={e=>e.key==='Enter'&&updateAmount(g.id)}/>
                        <button className="btn btn-gold" onClick={()=>updateAmount(g.id)} style={{padding:'6px 12px',borderRadius:'8px',fontSize:'11px',flexShrink:0}}>✓</button>
                        <button className="btn btn-ghost" onClick={()=>setEditId(null)} style={{padding:'6px 10px',borderRadius:'8px',fontSize:'11px',flexShrink:0}}>✗</button>
                      </div>
                    ):(
                      <button className="btn btn-ghost" onClick={()=>{setEditId(g.id);setEditVal(current.toString());}} style={{padding:'7px 14px',borderRadius:'8px',fontSize:'11px',flex:1}}>Update Progress</button>
                    )}
                    <button onClick={()=>deleteGoal(g.id)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.15)',cursor:'pointer',fontSize:'16px',padding:'4px 6px'}}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
