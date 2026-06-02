import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

import { API as APIURLS } from "../utils/api";
const API = APIURLS.budget;

const CATEGORIES = ["Food","Travel","Shopping","Bills","Entertainment","Health","Others"];
const CAT_META = {
  Food:          { emoji:"🍔", color:"#f59e0b" },
  Travel:        { emoji:"✈️",  color:"#60a5fa" },
  Shopping:      { emoji:"🛍️",  color:"#a78bfa" },
  Bills:         { emoji:"🧾",  color:"#fb923c" },
  Entertainment: { emoji:"🎬",  color:"#f472b6" },
  Health:        { emoji:"🏥",  color:"#34d399" },
  Others:        { emoji:"📦",  color:"#94a3b8" },
};
const fmt = n => `₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:0})}`;
const thisMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

// ── Animated progress bar ─────────────────────────────────────────────────────
function ProgressBar({ pct, color, animate = true }) {
  const capped = Math.min(pct, 100);
  const over   = pct > 100;
  const c = over ? "#ff4d6d" : color || "#a78bfa";
  return (
    <div style={{ height:7, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
      <div style={{
        height:"100%", borderRadius:99,
        width: animate ? `${capped}%` : 0,
        background: over
          ? "linear-gradient(90deg,#ff4d6d,#ff7043)"
          : `linear-gradient(90deg,${c}aa,${c})`,
        transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: over ? "0 0 8px rgba(255,77,109,0.5)" : `0 0 6px ${c}55`,
      }} />
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ pct }) {
  if (pct >= 100) return <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"rgba(255,77,109,0.15)",color:"#ff8a80",border:"1px solid rgba(255,77,109,0.3)",fontWeight:700}}>Over Budget</span>;
  if (pct >= 80)  return <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"rgba(251,146,60,0.15)",color:"#fb923c",border:"1px solid rgba(251,146,60,0.3)",fontWeight:700}}>Near Limit</span>;
  return <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"rgba(74,222,128,0.1)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.2)",fontWeight:700}}>On Track</span>;
}

// ── Overview ring ─────────────────────────────────────────────────────────────
function OverviewRing({ pct, spent, total, remaining }) {
  const r = 58; const circ = 2*Math.PI*r;
  const capped = Math.min(pct, 100);
  const offset = circ - (capped/100)*circ;
  const over   = pct > 100;
  const color  = over ? "#ff4d6d" : pct >= 80 ? "#fb923c" : "#4ade80";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{position:"relative",width:140,height:140}}>
        <svg width="140" height="140" style={{transform:"rotate(-90deg)"}}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8}/>
          <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{transition:"stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,color,lineHeight:1}}>{pct.toFixed(0)}%</span>
          <span style={{fontSize:10,color:"#5c5f72",marginTop:2}}>used</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,width:"100%"}}>
        {[{l:"Spent",v:fmt(spent),c:"#ff8a80"},{l:"Remaining",v:total>0?fmt(remaining):"—",c:"#4ade80"}].map(({l,v,c})=>(
          <div key={l} style={{textAlign:"center",padding:"10px 12px",borderRadius:12,background:"#0d0e17",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:11,color:"#3a3d52",marginBottom:4}}>{l}</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Budget form ───────────────────────────────────────────────────────────────
function BudgetForm({ initial, month, onSaved, token }) {
  const [total, setTotal] = useState(String(initial?.totalBudget||""));
  const [cats,  setCats]  = useState(() => {
    const map = {};
    (initial?.categoryBudgets||[]).forEach(cb=>{ map[cb.category]=String(cb.limit); });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const categoryBudgets = CATEGORIES
        .filter(c => cats[c] && Number(cats[c]) > 0)
        .map(c => ({ category: c, limit: Number(cats[c]) }));
      await axios.put(API, { month, totalBudget: Number(total)||0, categoryBudgets },
        { headers: { authorization:`Bearer ${token}` }});
      setMsg("✅ Budget saved!");
      onSaved();
    } catch(e) {
      setMsg("❌ " + (e.response?.data?.error||"Save failed."));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save}>
      <div style={{marginBottom:20}}>
        <label className="fk-label">Total Monthly Budget</label>
        <input className="fk-input" type="number" min="0" placeholder="e.g. 50000"
          value={total} onChange={e=>setTotal(e.target.value)}
          style={{fontSize:16,fontWeight:600}}/>
      </div>
      <div style={{marginBottom:6}}>
        <div className="fk-label" style={{marginBottom:12}}>Category Budgets (optional)</div>
        <div style={{display:"grid",gap:10}}>
          {CATEGORIES.map(cat=>{
            const m = CAT_META[cat]||CAT_META.Others;
            return (
              <div key={cat} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:9,flexShrink:0,
                  background:`${m.color}18`,border:`1px solid ${m.color}30`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
                  {m.emoji}
                </div>
                <span style={{fontSize:13,color:"#a0a3b1",width:110,flexShrink:0}}>{cat}</span>
                <input className="fk-input" type="number" min="0" placeholder="No limit"
                  value={cats[cat]||""}
                  onChange={e=>setCats(p=>({...p,[cat]:e.target.value}))}
                  style={{flex:1}}/>
              </div>
            );
          })}
        </div>
      </div>
      {msg && <div className={`fk-alert ${msg.startsWith("✅")?"fk-alert-success":"fk-alert-error"}`} style={{marginTop:12,fontSize:13}}>{msg}</div>}
      <button className="fk-btn fk-btn-primary" type="submit" disabled={saving}
        style={{marginTop:16,width:"100%",padding:"13px"}}>
        {saving ? <><div className="fk-spinner" style={{marginRight:8}}/>Saving…</> : "💾 Save Budget Goals"}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const [data,     setData]     = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [month,    setMonth]    = useState(thisMonth());
  const [editing,  setEditing]  = useState(false);
  const token = localStorage.getItem("token");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b,h] = await Promise.all([
        axios.get(`${API}?month=${month}`,{headers:{authorization:`Bearer ${token}`}}),
        axios.get(`${API}/history?months=6`,{headers:{authorization:`Bearer ${token}`}}),
      ]);
      setData(b.data);
      setHistory(h.data.data||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [month, token]);

  useEffect(()=>{ load(); },[load]);

  // Bar chart: budget vs actual (6 months)
  const chartData = {
    labels: history.map(h=>h.label),
    datasets:[
      { label:"Budget",  data:history.map(h=>h.budget), backgroundColor:"rgba(167,139,250,0.25)", borderColor:"#a78bfa", borderWidth:2, borderRadius:6 },
      { label:"Spent",   data:history.map(h=>h.spent),  backgroundColor:"rgba(255,77,109,0.25)",  borderColor:"#ff4d6d", borderWidth:2, borderRadius:6 },
    ],
  };
  const chartOpts = {
    responsive:true,
    plugins:{
      legend:{ labels:{ color:"#a0a3b1",font:{family:"Inter,system-ui",size:12},boxWidth:12 } },
      tooltip:{
        backgroundColor:"#10111c",borderColor:"rgba(255,255,255,0.08)",borderWidth:1,
        titleColor:"#fff",bodyColor:"#a0a3b1",padding:12,
        callbacks:{ label: ctx=>`  ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}` },
      },
    },
    scales:{
      x:{ ticks:{color:"#5c5f72"},grid:{color:"rgba(255,255,255,0.04)"},border:{color:"transparent"} },
      y:{ ticks:{color:"#5c5f72"},grid:{color:"rgba(255,255,255,0.04)"},border:{color:"transparent"} },
    },
  };

  const hasTotal = data?.totalBudget > 0;
  const hasCats  = (data?.categoryBudgets||[]).some(c=>c.limit>0);

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif"}} className="anim-fadeup">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:28}}>
        <div>
          <h1 style={{fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",margin:0}}>
            Budget Goals
          </h1>
          <p style={{color:"#a0a3b1",fontSize:14,marginTop:6}}>Set spending limits and track your budget in real time</p>
        </div>
        {/* Month picker */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <label className="fk-label" style={{margin:0}}>Month</label>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            className="fk-input" style={{width:"auto",padding:"8px 12px",fontSize:13}}/>
        </div>
      </div>

      {loading ? (
        <div style={{padding:"60px",textAlign:"center",color:"#5c5f72"}}>
          <div className="fk-spinner" style={{width:28,height:28,borderWidth:3,margin:"0 auto 14px"}}/>
          <p>Loading budget data…</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:18}}>

          {/* Left: Overview + Category bars */}
          <div style={{display:"grid",gap:18}}>
            {/* Overview card */}
            <div className="fk-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:"#fff",margin:0}}>
                  Monthly Overview
                </h2>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {hasTotal && <StatusBadge pct={data.totalPct}/>}
                  <button className="fk-btn fk-btn-ghost"
                    onClick={()=>setEditing(e=>!e)}
                    style={{padding:"6px 12px",fontSize:12,borderRadius:9}}>
                    {editing ? "✕ Cancel" : "✏️ Edit"}
                  </button>
                </div>
              </div>

              {hasTotal ? (
                <OverviewRing
                  pct={data.totalPct}
                  spent={data.totalSpent}
                  total={data.totalBudget}
                  remaining={data.totalRemaining}
                />
              ) : (
                <div style={{textAlign:"center",padding:"24px 0"}}>
                  <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                  <p style={{fontSize:14,color:"#5c5f72",marginBottom:16}}>No budget set for this month</p>
                  <button className="fk-btn fk-btn-primary" onClick={()=>setEditing(true)}
                    style={{padding:"10px 20px",fontSize:13}}>
                    + Set Budget
                  </button>
                </div>
              )}

              {hasTotal && !editing && (
                <div style={{marginTop:18,padding:"14px 16px",borderRadius:14,
                  background:"#0d0e17",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:13,color:"#6b6e85"}}>Total budget</span>
                    <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{fmt(data.totalBudget)}</span>
                  </div>
                  <ProgressBar pct={data.totalPct} color="#a78bfa"/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                    <span style={{fontSize:11,color:"#3a3d52"}}>{fmt(data.totalSpent)} spent</span>
                    <span style={{fontSize:11,color:"#3a3d52"}}>{data.totalPct.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Edit form */}
            {editing && (
              <div className="fk-card" style={{animation:"fk-fadein 0.3s ease both"}}>
                <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 18px"}}>
                  Set Budget Goals
                </h2>
                <BudgetForm initial={data} month={month} token={token}
                  onSaved={()=>{ setEditing(false); load(); }}/>
              </div>
            )}

            {/* History chart */}
            {history.length > 0 && (
              <div className="fk-card">
                <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 18px"}}>
                  Budget vs Actual (6 months)
                </h2>
                <Bar data={chartData} options={chartOpts}/>
              </div>
            )}
          </div>

          {/* Right: Category breakdown */}
          <div className="fk-card">
            <h2 style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 18px"}}>
              Category Budgets
            </h2>

            {(data?.categoryBudgets||[]).length === 0 ? (
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:36,marginBottom:12}}>📂</div>
                <p style={{fontSize:14,color:"#5c5f72"}}>No spending recorded this month</p>
              </div>
            ) : (
              <div style={{display:"grid",gap:16}}>
                {(data?.categoryBudgets||[]).map((cb,i)=>{
                  const m = CAT_META[cb.category]||CAT_META.Others;
                  const hasLimit = cb.limit > 0;
                  const pct = hasLimit ? cb.pct : 0;
                  const remaining = hasLimit ? Math.max(cb.limit - cb.spent, 0) : 0;

                  return (
                    <div key={cb.category}
                      style={{animation:`fk-fadein 0.3s ease ${i*0.05}s both`,
                        padding:"14px 16px",borderRadius:14,
                        background:pct>=100?"rgba(255,77,109,0.04)":pct>=80?"rgba(251,146,60,0.03)":"rgba(255,255,255,0.02)",
                        border:pct>=100?"1px solid rgba(255,77,109,0.15)":pct>=80?"1px solid rgba(251,146,60,0.12)":"1px solid rgba(255,255,255,0.05)",
                        transition:"all 0.18s",
                      }}>

                      {/* Header row */}
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:34,height:34,borderRadius:9,flexShrink:0,
                          background:`${m.color}18`,border:`1px solid ${m.color}30`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                          {m.emoji}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{cb.category}</span>
                            {hasLimit && <StatusBadge pct={pct}/>}
                          </div>
                          <div style={{fontSize:12,color:"#3a3d52",marginTop:2}}>
                            {hasLimit
                              ? `${fmt(cb.spent)} of ${fmt(cb.limit)}`
                              : `${fmt(cb.spent)} spent — no limit set`}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {hasLimit && (
                        <>
                          <ProgressBar pct={pct} color={m.color}/>
                          <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                            <span style={{fontSize:11,color:"#3a3d52"}}>
                              {pct.toFixed(0)}% used
                            </span>
                            <span style={{fontSize:11,
                              color:pct>=100?"#ff8a80":pct>=80?"#fb923c":"#3a3d52"}}>
                              {pct>=100
                                ? `⚠️ Over by ${fmt(cb.spent-cb.limit)}`
                                : `${fmt(remaining)} left`}
                            </span>
                          </div>
                          {/* "X% of budget used" message */}
                          {pct >= 80 && (
                            <div style={{marginTop:8,fontSize:12,padding:"7px 10px",borderRadius:9,
                              background:pct>=100?"rgba(255,77,109,0.08)":"rgba(251,146,60,0.08)",
                              color:pct>=100?"#ff8a80":"#fb923c",
                              border:`1px solid ${pct>=100?"rgba(255,77,109,0.2)":"rgba(251,146,60,0.2)"}`}}>
                              {pct>=100
                                ? `🔴 ${pct.toFixed(0)}% of ${cb.category} budget exceeded`
                                : `⚠️ ${pct.toFixed(0)}% of ${cb.category} budget used`}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary footer */}
            {hasCats && (
              <div style={{marginTop:18,padding:"12px 14px",borderRadius:12,
                background:"#0a0b13",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#5c5f72"}}>Categories over budget</span>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,
                    color:(data?.categoryBudgets||[]).filter(c=>c.limit>0&&c.pct>=100).length>0?"#ff8a80":"#4ade80"}}>
                    {(data?.categoryBudgets||[]).filter(c=>c.limit>0&&c.pct>=100).length} / {(data?.categoryBudgets||[]).filter(c=>c.limit>0).length}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
