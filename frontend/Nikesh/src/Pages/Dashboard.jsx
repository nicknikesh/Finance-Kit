import { useCallback, useEffect, useMemo, useState } from "react";
import StatementUpload  from "../components/StatementUpload";
import AIInsights       from "../components/AIInsights";
import SpendingAlerts   from "../components/SpendingAlerts";
import axios from "axios";
import { Pie, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

// ── Category metadata (mirrors backend categoryRules.js) ──────────────────────
const CATEGORY_META = {
  Food:          { emoji: "🍔", color: "#f59e0b",  bg: "rgba(245,158,11,0.15)"  },
  Travel:        { emoji: "✈️",  color: "#60a5fa",  bg: "rgba(96,165,250,0.15)"  },
  Shopping:      { emoji: "🛍️",  color: "#a78bfa",  bg: "rgba(167,139,250,0.15)" },
  Bills:         { emoji: "🧾",  color: "#fb923c",  bg: "rgba(251,146,60,0.15)"  },
  Salary:        { emoji: "💰",  color: "#4ade80",  bg: "rgba(74,222,128,0.15)"  },
  Entertainment: { emoji: "🎬",  color: "#f472b6",  bg: "rgba(244,114,182,0.15)" },
  Health:        { emoji: "🏥",  color: "#34d399",  bg: "rgba(52,211,153,0.15)"  },
  Others:        { emoji: "📦",  color: "#94a3b8",  bg: "rgba(148,163,184,0.15)" },
  // Legacy / extra categories from older data
  Healthcare:    { emoji: "🏥",  color: "#34d399",  bg: "rgba(52,211,153,0.15)"  },
  Housing:       { emoji: "🏠",  color: "#fb923c",  bg: "rgba(251,146,60,0.15)"  },
  "EMI/Loan":    { emoji: "💳",  color: "#f87171",  bg: "rgba(248,113,113,0.15)" },
  Utilities:     { emoji: "💡",  color: "#fbbf24",  bg: "rgba(251,191,36,0.15)"  },
  Cash:          { emoji: "💵",  color: "#6ee7b7",  bg: "rgba(110,231,183,0.15)" },
};

function getCategoryColor(cat)  { return (CATEGORY_META[cat] || CATEGORY_META.Others).color; }
function getCategoryEmoji(cat)  { return (CATEGORY_META[cat] || CATEGORY_META.Others).emoji; }
function getCategoryBg(cat)     { return (CATEGORY_META[cat] || CATEGORY_META.Others).bg; }

const TF = [{ k:"daily", l:"7 Days" }, { k:"monthly", l:"6 Months" }, { k:"yearly", l:"3 Years" }];

function Stat({ label, value, color, sub, icon }) {
  return (
    <div className="fk-stat" style={{ flex:1, minWidth:150 }}>
      {icon && <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>}
      <div className="fk-stat-label">{label}</div>
      <div className="fk-stat-value" style={{ color }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#3a3d52", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

const chartTooltip = {
  backgroundColor:"#10111c",
  borderColor:"rgba(255,255,255,0.08)", borderWidth:1,
  titleColor:"#fff", bodyColor:"#a0a3b1", padding:12,
  titleFont:{ family:"Outfit,Inter,system-ui", size:13 },
  bodyFont:{ family:"Inter,system-ui", size:12 },
};

export default function Dashboard() {
  const [txs,        setTxs]        = useState([]);
  const [timeframe,  setTimeframe]  = useState("monthly");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartMode,  setChartMode]  = useState("pie"); // "pie" | "bar"
  const token = localStorage.getItem("token");

  const loadTxs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get("http://localhost:5000/api/transactions?limit=500", {
        headers: { authorization: `Bearer ${token}` },
      });
      setTxs(r.data.data || []);
    } catch { setError("Unable to load dashboard data."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadTxs(); }, [loadTxs, refreshKey]);

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const income  = useMemo(() => txs.filter(t=>t.type==="income" ).reduce((s,t)=>s+Number(t.amount),0), [txs]);
  const expense = useMemo(() => txs.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0), [txs]);
  const balance = income - expense;

  const topCat = useMemo(() => {
    const c = {};
    txs.filter(t=>t.type==="expense").forEach(t=>{ c[t.category]=(c[t.category]||0)+Number(t.amount); });
    return Object.entries(c).sort((a,b)=>b[1]-a[1])[0] || ["—", 0];
  }, [txs]);

  const now = useMemo(()=>new Date(),[]);

  const thisMonthExp = useMemo(() =>
    txs.filter(t=>t.type==="expense").filter(t=>{
      const d=new Date(t.date||t.createdAt||now);
      return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
    }).reduce((s,t)=>s+Number(t.amount),0), [txs,now]);

  const lastMonthExp = useMemo(() => {
    const p=new Date(now.getFullYear(),now.getMonth()-1,1);
    return txs.filter(t=>t.type==="expense").filter(t=>{
      const d=new Date(t.date||t.createdAt||now);
      return d.getFullYear()===p.getFullYear()&&d.getMonth()===p.getMonth();
    }).reduce((s,t)=>s+Number(t.amount),0);
  }, [txs,now]);

  const timeline = useMemo(() => {
    const n = timeframe==="daily"?7:timeframe==="monthly"?6:3;
    const bucket = {};
    for(let i=n-1;i>=0;i--){
      const d=new Date(now);
      if(timeframe==="daily") d.setDate(now.getDate()-i);
      else if(timeframe==="monthly") d.setMonth(now.getMonth()-i);
      else d.setFullYear(now.getFullYear()-i);
      const lbl = timeframe==="daily"
        ? d.toLocaleDateString("en-US",{month:"short",day:"numeric"})
        : timeframe==="monthly"
          ? d.toLocaleDateString("en-US",{month:"short",year:"numeric"})
          : String(d.getFullYear());
      bucket[lbl]={inc:0,exp:0};
    }
    txs.forEach(t=>{
      const d=new Date(t.date||t.createdAt||now);
      const key = timeframe==="daily"
        ? d.toLocaleDateString("en-US",{month:"short",day:"numeric"})
        : timeframe==="monthly"
          ? d.toLocaleDateString("en-US",{month:"short",year:"numeric"})
          : String(d.getFullYear());
      if(key in bucket) bucket[key][t.type==="income"?"inc":"exp"]+=Number(t.amount);
    });
    return { labels:Object.keys(bucket), inc:Object.values(bucket).map(v=>v.inc), exp:Object.values(bucket).map(v=>v.exp) };
  }, [txs, timeframe, now]);

  const lineData = {
    labels: timeline.labels,
    datasets:[
      { label:"Income",  data:timeline.inc, borderColor:"#4ade80", backgroundColor:"rgba(74,222,128,0.07)", fill:true, tension:0.4, pointBackgroundColor:"#4ade80", pointRadius:4, pointHoverRadius:7 },
      { label:"Expense", data:timeline.exp, borderColor:"#ff4d6d", backgroundColor:"rgba(255,77,109,0.07)", fill:true, tension:0.4, pointBackgroundColor:"#ff4d6d", pointRadius:4, pointHoverRadius:7 },
    ],
  };
  const lineOptions = {
    responsive:true,
    plugins:{ legend:{ labels:{ color:"#a0a3b1", font:{family:"Inter,system-ui",size:12}, boxWidth:12 } }, tooltip:chartTooltip },
    scales:{
      x:{ ticks:{ color:"#5c5f72", font:{family:"Inter,system-ui",size:11} }, grid:{ color:"rgba(255,255,255,0.04)" }, border:{color:"transparent"} },
      y:{ ticks:{ color:"#5c5f72", font:{family:"Inter,system-ui",size:11} }, grid:{ color:"rgba(255,255,255,0.04)" }, border:{color:"transparent"} },
    },
  };

  // Category breakdown — sorted desc by spend amount
  const catEntries = useMemo(() => {
    const c={};
    txs.filter(t=>t.type==="expense").forEach(t=>{ c[t.category]=(c[t.category]||0)+Number(t.amount); });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]);
  }, [txs]);

  const catLabels = catEntries.map(([k])=>k);
  const catAmounts = catEntries.map(([,v])=>v);
  const catColors  = catLabels.map(k => getCategoryColor(k));
  const catBgs     = catLabels.map(k => getCategoryBg(k));

  const pieData = {
    labels: catLabels,
    datasets:[{
      data: catAmounts,
      backgroundColor: catColors,
      borderColor:"#10111c",
      borderWidth:3,
      hoverOffset:10,
    }],
  };
  const pieOptions = {
    responsive:true,
    plugins:{
      legend:{
        position:"bottom",
        labels:{ color:"#a0a3b1", font:{family:"Inter,system-ui",size:12}, padding:14, boxWidth:12 }
      },
      tooltip:{
        ...chartTooltip,
        callbacks:{
          label: ctx => {
            const val = ctx.parsed;
            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct = total > 0 ? ((val/total)*100).toFixed(1) : 0;
            return `  ₹${Number(val).toLocaleString("en-IN",{minimumFractionDigits:2})} (${pct}%)`;
          }
        }
      },
    },
  };

  const barData = {
    labels: catLabels,
    datasets:[{
      label: "Expense",
      data: catAmounts,
      backgroundColor: catColors,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };
  const barOptions = {
    responsive:true,
    plugins:{
      legend:{ display:false },
      tooltip:{
        ...chartTooltip,
        callbacks:{
          label: ctx => `  ₹${Number(ctx.parsed.y).toLocaleString("en-IN",{minimumFractionDigits:2})}`
        }
      },
    },
    scales:{
      x:{ ticks:{ color:"#5c5f72", font:{family:"Inter,system-ui",size:11} }, grid:{ color:"rgba(255,255,255,0.04)" }, border:{color:"transparent"} },
      y:{ ticks:{ color:"#5c5f72", font:{family:"Inter,system-ui",size:11} }, grid:{ color:"rgba(255,255,255,0.04)" }, border:{color:"transparent"} },
    },
  };

  const fmt = n => `₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2})}`;
  const higherThanLast = thisMonthExp > lastMonthExp;
  const totalCatExpense = catAmounts.reduce((a,b)=>a+b,0);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }} className="anim-fadeup">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", margin:0 }}>Dashboard</h1>
          <p style={{ color:"#a0a3b1", fontSize:14, marginTop:6 }}>Your financial overview at a glance</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {TF.map(({ k, l }) => (
            <button key={k} onClick={()=>setTimeframe(k)} className="fk-btn"
              style={{
                padding:"8px 16px", fontSize:13, borderRadius:10,
                background: k===timeframe ? "#ff4d6d" : "#10111c",
                color: k===timeframe ? "#fff" : "#a0a3b1",
                border: k===timeframe ? "1px solid transparent" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: k===timeframe ? "0 4px 14px rgba(255,77,109,0.3)" : "none",
              }}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="fk-alert fk-alert-error" style={{ marginBottom:18 }}>{error}</div>}

      {/* Bank Statement Upload */}
      <StatementUpload onSuccess={handleUploadSuccess} />

      {/* Spending Alerts — updates automatically after uploads */}
      <div style={{ marginBottom: 18 }}>
        <SpendingAlerts refreshTrigger={refreshKey} />
      </div>

      {loading ? (
        <div style={{ padding:"60px", textAlign:"center", color:"#5c5f72" }}>
          <div className="fk-spinner" style={{ width:30, height:30, borderWidth:3, margin:"0 auto 14px" }} />
          <p>Loading dashboard…</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:20 }}>
            <Stat label="Total Income"  value={fmt(income)}  color="#4ade80" icon="💰" />
            <Stat label="Total Expense" value={fmt(expense)} color="#ff8a80" icon="💸" />
            <Stat label="Net Balance"   value={fmt(balance)} color={balance>=0?"#4ade80":"#ff8a80"} icon={balance>=0?"📈":"📉"} />
            <Stat label="Top Expense"   value={topCat[0]==="—" ? "—" : `${getCategoryEmoji(topCat[0])} ${topCat[0]}`} color={getCategoryColor(topCat[0])} icon="" sub={topCat[1]>0?fmt(topCat[1]):undefined} />
          </div>

          {/* Line chart */}
          <div className="fk-card" style={{ marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:22 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:0, fontFamily:"'Outfit',sans-serif" }}>Income vs Expense</h2>
                <p style={{ fontSize:12, color:"#5c5f72", marginTop:4 }}>
                  {higherThanLast ? "⚠️ Spending up from last month" : "✅ Spending lower than last month"}
                </p>
              </div>
            </div>
            <Line data={lineData} options={lineOptions} />
          </div>

          {/* Bottom grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:18 }}>

            {/* Category Expense Chart (Pie + Bar toggle) */}
            <div className="fk-card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:0, fontFamily:"'Outfit',sans-serif" }}>Expense Breakdown</h2>
                <div style={{ display:"flex", gap:4 }}>
                  {[{v:"pie",l:"🥧"},{v:"bar",l:"📊"}].map(({v,l})=>(
                    <button key={v} onClick={()=>setChartMode(v)} className="fk-btn"
                      style={{
                        padding:"5px 10px", fontSize:13, borderRadius:8,
                        background: v===chartMode?"rgba(255,77,109,0.2)":"transparent",
                        color: v===chartMode?"#ff4d6d":"#5c5f72",
                        border: v===chartMode?"1px solid rgba(255,77,109,0.4)":"1px solid rgba(255,255,255,0.06)",
                      }}>{l}</button>
                  ))}
                </div>
              </div>
              {catEntries.length === 0
                ? <div style={{ padding:"40px 0", textAlign:"center", color:"#3a3d52", fontSize:14 }}>No expense data yet</div>
                : chartMode === "pie"
                  ? <Pie data={pieData} options={pieOptions} />
                  : <Bar data={barData} options={barOptions} />
              }
            </div>

            {/* Category Breakdown List */}
            <div className="fk-card">
              <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 16px", fontFamily:"'Outfit',sans-serif" }}>
                Category Breakdown
              </h2>
              {catEntries.length === 0 ? (
                <div style={{ padding:"40px 0", textAlign:"center", color:"#3a3d52", fontSize:14 }}>No expense data yet</div>
              ) : (
                <div style={{ display:"grid", gap:8 }}>
                  {catEntries.slice(0,7).map(([cat, amt]) => {
                    const pct = totalCatExpense > 0 ? (amt / totalCatExpense) * 100 : 0;
                    const color = getCategoryColor(cat);
                    const emoji = getCategoryEmoji(cat);
                    return (
                      <div key={cat}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <span style={{ display:"flex", alignItems:"center", gap:7, fontSize:13 }}>
                            <span style={{
                              width:28, height:28, borderRadius:8, display:"inline-flex",
                              alignItems:"center", justifyContent:"center", fontSize:14,
                              background: getCategoryBg(cat),
                            }}>{emoji}</span>
                            <span style={{ color:"#d0d3e8", fontWeight:500 }}>{cat}</span>
                          </span>
                          <span style={{ fontSize:13, fontWeight:700, color, fontFamily:"'Outfit',sans-serif" }}>
                            {fmt(amt)}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height:4, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
                          <div style={{
                            height:"100%", borderRadius:3,
                            width:`${pct.toFixed(1)}%`,
                            background: `linear-gradient(90deg, ${color}cc, ${color})`,
                            transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)",
                          }} />
                        </div>
                        <div style={{ fontSize:11, color:"#3a3d52", marginTop:3, textAlign:"right" }}>
                          {pct.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                  {catEntries.length > 7 && (
                    <div style={{ fontSize:12, color:"#3a3d52", textAlign:"center", paddingTop:4 }}>
                      +{catEntries.length - 7} more categories
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Monthly Summary + AI Insights */}
            <div style={{ display:"grid", gap:18 }}>
              <div className="fk-card">
                <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 18px", fontFamily:"'Outfit',sans-serif" }}>Monthly Summary</h2>
                <div style={{ display:"grid", gap:10 }}>
                  {[
                    { lbl:"This month expense", val:fmt(thisMonthExp), color:"#ff8a80" },
                    { lbl:"Last month expense",  val:fmt(lastMonthExp), color:"#a0a3b1" },
                    { lbl:"vs Last month",       val:higherThanLast?"Higher 📈":"Lower 📉", color:higherThanLast?"#ff8a80":"#4ade80" },
                    { lbl:"Savings rate", val:income>0?`${(((income-expense)/income)*100).toFixed(1)}%`:"—", color:"#f59e0b" },
                    { lbl:"Total categories",    val:`${catEntries.length} categories`, color:"#a78bfa" },
                  ].map(({ lbl, val, color }) => (
                    <div key={lbl} style={{
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"12px 15px", borderRadius:12,
                      background:"#0d0e17", border:"1px solid rgba(255,255,255,0.06)",
                    }}>
                      <span style={{ fontSize:13, color:"#6b6e85" }}>{lbl}</span>
                      <span style={{ fontSize:14, fontWeight:700, color }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <AIInsights refreshTrigger={refreshKey} />
            </div>

          </div>
        </>
      )}
    </div>
  );
}