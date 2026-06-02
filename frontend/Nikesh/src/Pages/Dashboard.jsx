import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AIInsights           from "../components/AIInsights";
import SpendingAlerts       from "../components/SpendingAlerts";
import RecurringPayments    from "../components/RecurringPayments";
import DownloadReportButton from "../components/DownloadReportButton";
import axios from "axios";
import { API } from "../utils/api";
import { Pie, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

// ── Category metadata ────────────────────────────────────────────────────────
const CATEGORY_META = {
  Food:          { emoji:"🍔", color:"#f59e0b", bg:"rgba(245,158,11,0.15)"  },
  Travel:        { emoji:"✈️",  color:"#60a5fa", bg:"rgba(96,165,250,0.15)"  },
  Shopping:      { emoji:"🛍️",  color:"#a78bfa", bg:"rgba(167,139,250,0.15)" },
  Bills:         { emoji:"🧾",  color:"#fb923c", bg:"rgba(251,146,60,0.15)"  },
  Salary:        { emoji:"💰",  color:"#4ade80", bg:"rgba(74,222,128,0.15)"  },
  Entertainment: { emoji:"🎬",  color:"#f472b6", bg:"rgba(244,114,182,0.15)" },
  Health:        { emoji:"🏥",  color:"#34d399", bg:"rgba(52,211,153,0.15)"  },
  Others:        { emoji:"📦",  color:"#94a3b8", bg:"rgba(148,163,184,0.15)" },
  Healthcare:    { emoji:"🏥",  color:"#34d399", bg:"rgba(52,211,153,0.15)"  },
  Housing:       { emoji:"🏠",  color:"#fb923c", bg:"rgba(251,146,60,0.15)"  },
  "EMI/Loan":    { emoji:"💳",  color:"#f87171", bg:"rgba(248,113,113,0.15)" },
  Utilities:     { emoji:"💡",  color:"#fbbf24", bg:"rgba(251,191,36,0.15)"  },
  Cash:          { emoji:"💵",  color:"#6ee7b7", bg:"rgba(110,231,183,0.15)" },
};

function getCategoryColor(cat) { return (CATEGORY_META[cat] || CATEGORY_META.Others).color; }
function getCategoryEmoji(cat) { return (CATEGORY_META[cat] || CATEGORY_META.Others).emoji; }
function getCategoryBg(cat)    { return (CATEGORY_META[cat] || CATEGORY_META.Others).bg; }

const TF = [{ k:"daily", l:"7 Days" }, { k:"monthly", l:"6 Months" }, { k:"yearly", l:"3 Years" }];

const chartTooltip = {
  backgroundColor:"#10111c",
  borderColor:"rgba(255,255,255,0.08)", borderWidth:1,
  titleColor:"#fff", bodyColor:"#a0a3b1", padding:12,
  titleFont:{ family:"Outfit,Inter,system-ui", size:13 },
  bodyFont:{ family:"Inter,system-ui", size:12 },
};

const fmt = n => `₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2})}`;

// ── Overview stat card ───────────────────────────────────────────────────────
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

// ── Quick action button ──────────────────────────────────────────────────────
function QuickBtn({ icon, label, onClick, accent = "#a78bfa", disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        flex:1, minWidth:120, display:"flex", alignItems:"center", justifyContent:"center",
        gap:8, padding:"12px 16px", borderRadius:14,
        background:`linear-gradient(135deg,${accent}14,${accent}08)`,
        border:`1px solid ${accent}35`,
        color:accent, fontSize:13, fontWeight:700,
        fontFamily:"'Inter',sans-serif", cursor: disabled?"not-allowed":"pointer",
        transition:"all 0.2s ease", opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background=`linear-gradient(135deg,${accent}28,${accent}14)`; e.currentTarget.style.borderColor=`${accent}60`; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 20px ${accent}20`; }}}
      onMouseLeave={e => { e.currentTarget.style.background=`linear-gradient(135deg,${accent}14,${accent}08)`; e.currentTarget.style.borderColor=`${accent}35`; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
    >
      <span style={{ fontSize:18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── Upload FAB + Modal ───────────────────────────────────────────────────────
function UploadFAB({ onSuccess }) {
  const [open,      setOpen]      = useState(false);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState("");
  const [fileName,  setFileName]  = useState("");
  const inputRef = useRef();
  const token    = localStorage.getItem("token");

  const reset = () => { setResult(null); setError(""); setFileName(""); if (inputRef.current) inputRef.current.value = ""; };
  const close = () => { setOpen(false); reset(); };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Only PDF files are supported."); return; }
    if (file.size > 10 * 1024 * 1024)   { setError("File too large. Max 10 MB."); return; }
    setFileName(file.name); setError(""); setResult(null); setUploading(true);
    const formData = new FormData();
    formData.append("statement", file);
    try {
      const r = await axios.post(API.upload, formData, {
        headers: { authorization:`Bearer ${token}`, "Content-Type":"multipart/form-data" },
      });
      setResult(r.data);
      if (onSuccess) onSuccess(r.data.transactions || []);
    } catch (e) {
      setError(e.response?.data?.error || "Upload failed. Please try again.");
    } finally { setUploading(false); }
  };

  return (
    <>
      {/* FAB */}
      <div title="Upload Statement" style={{ position:"fixed", bottom:28, right:28, zIndex:200 }}>
        <button onClick={() => setOpen(true)}
          aria-label="Upload Statement"
          style={{
            width:58, height:58, borderRadius:"50%", border:"none",
            background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
            color:"#fff", fontSize:26, cursor:"pointer",
            boxShadow:"0 4px 24px rgba(124,58,237,0.55), 0 0 0 0 rgba(124,58,237,0.4)",
            animation:"fk-fab-float 3s ease-in-out infinite",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"transform 0.18s, box-shadow 0.18s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.12)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(124,58,237,0.7)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 4px 24px rgba(124,58,237,0.55)"; }}
        >📤</button>
        <span style={{
          position:"absolute", bottom:"calc(100% + 8px)", right:0,
          background:"rgba(10,11,20,0.92)", color:"#a0a3b1",
          fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:8,
          border:"1px solid rgba(255,255,255,0.1)", whiteSpace:"nowrap",
          pointerEvents:"none", opacity:0,
          transition:"opacity 0.18s",
        }} className="fab-tooltip">Upload Statement</span>
      </div>

      {/* Modal backdrop */}
      {open && (
        <div onClick={close} style={{
          position:"fixed", inset:0, zIndex:300,
          background:"rgba(3,3,5,0.75)",
          backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:16, animation:"fk-fadein 0.2s ease",
        }}>
          {/* Modal box */}
          <div onClick={e => e.stopPropagation()} style={{
            width:"100%", maxWidth:480,
            background:"linear-gradient(145deg,#13141f,#0d0e17)",
            border:"1px solid rgba(124,58,237,0.28)",
            borderRadius:24, padding:"28px 28px 24px",
            boxShadow:"0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            animation:"fk-modal-in 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
          }}>
            {/* Modal header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{
                width:42, height:42, borderRadius:13,
                background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, boxShadow:"0 4px 14px rgba(124,58,237,0.4)", flexShrink:0,
              }}>📄</div>
              <div style={{ flex:1 }}>
                <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:800, color:"#fff", margin:0 }}>
                  Upload Statement
                </h2>
                <p style={{ fontSize:12, color:"#6b6e85", marginTop:2 }}>
                  SBI · HDFC · ICICI · Axis · Kotak · PDF only · Max 10MB
                </p>
              </div>
              <button onClick={close}
                style={{ background:"none", border:"none", color:"#3a3d52", fontSize:20, cursor:"pointer", lineHeight:1, padding:4 }}
                onMouseEnter={e => e.currentTarget.style.color="#fff"}
                onMouseLeave={e => e.currentTarget.style.color="#3a3d52"}
              >×</button>
            </div>

            {/* Drop zone */}
            {!result && (
              <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                style={{
                  border:`2px dashed ${dragging ? "#7c3aed" : uploading ? "#4f46e5" : "rgba(255,255,255,0.12)"}`,
                  borderRadius:16, padding:"36px 20px", textAlign:"center",
                  cursor: uploading ? "not-allowed" : "pointer",
                  background: dragging ? "rgba(124,58,237,0.08)" : uploading ? "rgba(79,70,229,0.05)" : "rgba(255,255,255,0.02)",
                  transition:"all 0.2s ease",
                }}
              >
                <input ref={inputRef} type="file" accept="application/pdf"
                  onChange={e => handleFile(e.target.files[0])} style={{ display:"none" }} />
                {uploading ? (
                  <>
                    <div style={{ width:44, height:44, borderRadius:"50%",
                      border:"3px solid rgba(124,58,237,0.15)", borderTop:"3px solid #7c3aed",
                      animation:"fk-spin 0.8s linear infinite", margin:"0 auto 14px" }} />
                    <p style={{ fontSize:14, color:"#a78bfa", fontWeight:600 }}>
                      Parsing <span style={{ color:"#c4b5fd" }}>{fileName}</span>…
                    </p>
                    <p style={{ fontSize:12, color:"#5c5f72", marginTop:4 }}>
                      Detecting bank format & extracting transactions
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:42, marginBottom:12 }}>{dragging ? "📂" : "📑"}</div>
                    <p style={{ fontSize:14, color: dragging ? "#c4b5fd" : "#a0a3b1", fontWeight:600 }}>
                      {dragging ? "Drop your PDF here" : "Drag & drop your bank statement"}
                    </p>
                    <p style={{ fontSize:12, color:"#5c5f72", marginTop:6 }}>
                      or <span style={{ color:"#a78bfa", textDecoration:"underline" }}>browse to choose a file</span>
                    </p>
                    {fileName && (
                      <div style={{ marginTop:12, padding:"6px 14px", borderRadius:8,
                        background:"rgba(124,58,237,0.12)", display:"inline-block",
                        fontSize:12, color:"#c4b5fd" }}>📎 {fileName}</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop:14, padding:"12px 16px", borderRadius:12,
                background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.25)",
                display:"flex", alignItems:"flex-start", gap:10 }}>
                <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
                <p style={{ fontSize:13, color:"#ff8a80", margin:0, fontWeight:600 }}>{error}</p>
                <button onClick={reset} style={{ marginLeft:"auto", background:"none", border:"none",
                  color:"#5c5f72", cursor:"pointer", fontSize:16, padding:0 }}>✕</button>
              </div>
            )}

            {/* Success */}
            {result && (
              <div style={{ padding:"20px", borderRadius:16,
                background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <span style={{ fontSize:22 }}>✅</span>
                  <div>
                    <p style={{ fontSize:14, color:"#4ade80", fontWeight:700, margin:0 }}>
                      Statement Processed!
                    </p>
                    <p style={{ fontSize:12, color:"#6b6e85", marginTop:2 }}>
                      Bank: <strong style={{ color:"#a0a3b1" }}>{result.bank}</strong>
                    </p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {[{ v:result.saved, l:"Imported", c:"#4ade80" }, { v:result.skipped, l:"Skipped", c:"#a0a3b1" }].map(s => (
                    <div key={s.l} style={{ flex:1, padding:"12px", borderRadius:12,
                      background:`rgba(255,255,255,0.04)`, textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:s.c, fontFamily:"'Outfit',sans-serif" }}>{s.v}</div>
                      <div style={{ fontSize:11, color:"#6b6e85", marginTop:2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { reset(); close(); }}
                  style={{ marginTop:14, width:"100%", padding:"10px", borderRadius:10,
                    background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.25)",
                    color:"#4ade80", fontSize:13, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Inter',sans-serif" }}>
                  ✓ Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Empty / onboarding state ─────────────────────────────────────────────────
function EmptyState({ onUploadClick }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"60px 24px", textAlign:"center",
      background:"linear-gradient(145deg,#0d0e1a,#0a0b14)",
      border:"1px solid rgba(167,139,250,0.15)", borderRadius:24,
      marginBottom:18,
    }}>
      <div style={{ fontSize:64, marginBottom:20, animation:"fk-fadein 0.5s ease" }}>📊</div>
      <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:"#fff",
        letterSpacing:"-0.03em", margin:"0 0 10px" }}>
        Your financial story starts here
      </h2>
      <p style={{ fontSize:15, color:"#5c5f72", maxWidth:400, lineHeight:1.7, marginBottom:28 }}>
        Upload your first bank statement to generate AI insights, spending analytics, and your personalized financial score.
      </p>
      <button onClick={onUploadClick}
        style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"14px 28px", borderRadius:16, border:"none",
          background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
          color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer",
          fontFamily:"'Inter',sans-serif",
          boxShadow:"0 6px 24px rgba(124,58,237,0.45)",
          transition:"all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(124,58,237,0.6)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 6px 24px rgba(124,58,237,0.45)"; }}
      >
        <span style={{ fontSize:20 }}>📤</span> Upload Bank Statement
      </button>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [txs,        setTxs]        = useState([]);
  const [timeframe,  setTimeframe]  = useState("monthly");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [chartMode,  setChartMode]  = useState("pie");
  const [fabOpen,    setFabOpen]    = useState(false);   // external trigger for FAB
  const [aiRefresh,  setAiRefresh]  = useState(0);       // triggers AI refresh
  const token = localStorage.getItem("token");

  const loadTxs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API.transactions}?limit=500`, {
        headers: { authorization:`Bearer ${token}` },
      });
      setTxs(r.data.data || []);
    } catch { setError("Unable to load dashboard data."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadTxs(); }, [loadTxs, refreshKey]);

  const handleUploadSuccess = useCallback(() => {
    setRefreshKey(k => k + 1);
    setAiRefresh(k => k + 1);
  }, []);

  // ── Computed values (unchanged logic) ──────────────────────────────────────
  const income  = useMemo(() => txs.filter(t=>t.type==="income" ).reduce((s,t)=>s+Number(t.amount),0), [txs]);
  const expense = useMemo(() => txs.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0), [txs]);
  const balance = income - expense;

  const topCat = useMemo(() => {
    const c = {};
    txs.filter(t=>t.type==="expense").forEach(t=>{ c[t.category]=(c[t.category]||0)+Number(t.amount); });
    return Object.entries(c).sort((a,b)=>b[1]-a[1])[0] || ["—",0];
  }, [txs]);

  const now = useMemo(() => new Date(), []);

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

  const catEntries = useMemo(() => {
    const c={};
    txs.filter(t=>t.type==="expense").forEach(t=>{ c[t.category]=(c[t.category]||0)+Number(t.amount); });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]);
  }, [txs]);

  const catLabels  = catEntries.map(([k])=>k);
  const catAmounts = catEntries.map(([,v])=>v);
  const catColors  = catLabels.map(k => getCategoryColor(k));

  const timeline = useMemo(() => {
    const n = timeframe==="daily"?7:timeframe==="monthly"?6:3;
    const bucket={};
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
  const pieData = {
    labels: catLabels,
    datasets:[{ data:catAmounts, backgroundColor:catColors, borderColor:"#10111c", borderWidth:3, hoverOffset:10 }],
  };
  const pieOptions = {
    responsive:true,
    plugins:{
      legend:{ position:"bottom", labels:{ color:"#a0a3b1", font:{family:"Inter,system-ui",size:12}, padding:14, boxWidth:12 } },
      tooltip:{ ...chartTooltip, callbacks:{ label: ctx => {
        const val=ctx.parsed; const total=ctx.dataset.data.reduce((a,b)=>a+b,0);
        const pct=total>0?((val/total)*100).toFixed(1):0;
        return `  ₹${Number(val).toLocaleString("en-IN",{minimumFractionDigits:2})} (${pct}%)`;
      }}},
    },
  };
  const barData = {
    labels: catLabels,
    datasets:[{ label:"Expense", data:catAmounts, backgroundColor:catColors, borderRadius:8, borderSkipped:false }],
  };
  const barOptions = {
    responsive:true,
    plugins:{ legend:{ display:false }, tooltip:{ ...chartTooltip, callbacks:{ label: ctx => `  ₹${Number(ctx.parsed.y).toLocaleString("en-IN",{minimumFractionDigits:2})}` }}},
    scales:{
      x:{ ticks:{ color:"#5c5f72", font:{family:"Inter,system-ui",size:11} }, grid:{ color:"rgba(255,255,255,0.04)" }, border:{color:"transparent"} },
      y:{ ticks:{ color:"#5c5f72", font:{family:"Inter,system-ui",size:11} }, grid:{ color:"rgba(255,255,255,0.04)" }, border:{color:"transparent"} },
    },
  };

  const higherThanLast = thisMonthExp > lastMonthExp;
  const totalCatExpense = catAmounts.reduce((a,b)=>a+b,0);
  const isEmpty = !loading && txs.length === 0;

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }} className="anim-fadeup">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        flexWrap:"wrap", gap:16, marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800,
            color:"#fff", letterSpacing:"-0.03em", margin:0 }}>Dashboard</h1>
          <p style={{ color:"#a0a3b1", fontSize:14, marginTop:5 }}>
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {TF.map(({ k, l }) => (
            <button key={k} onClick={()=>setTimeframe(k)} className="fk-btn"
              style={{
                padding:"7px 14px", fontSize:12, borderRadius:9,
                background: k===timeframe ? "#ff4d6d" : "#10111c",
                color: k===timeframe ? "#fff" : "#a0a3b1",
                border: k===timeframe ? "1px solid transparent" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: k===timeframe ? "0 3px 12px rgba(255,77,109,0.3)" : "none",
              }}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="fk-alert fk-alert-error" style={{ marginBottom:16 }}>{error}</div>}

      {/* ── SECTION 1 — Overview cards (always visible) ──────────────────── */}
      {loading ? (
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:20 }}>
          {[1,2,3,4].map(i=>(
            <div key={i} style={{ flex:1, minWidth:150, height:96, borderRadius:18,
              background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",
              backgroundSize:"200% 100%", animation:`fk-shimmer 1.5s infinite ${i*0.1}s` }} />
          ))}
        </div>
      ) : !isEmpty ? (
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:20 }}>
          <Stat label="Total Income"  value={fmt(income)}  color="#4ade80" icon="💰" />
          <Stat label="Total Expense" value={fmt(expense)} color="#ff8a80" icon="💸" />
          <Stat label="Net Balance"   value={fmt(balance)} color={balance>=0?"#4ade80":"#ff8a80"} icon={balance>=0?"📈":"📉"} />
          <Stat label="Top Expense"   value={topCat[0]==="—"?"—":`${getCategoryEmoji(topCat[0])} ${topCat[0]}`}
            color={getCategoryColor(topCat[0])} icon="" sub={topCat[1]>0?fmt(topCat[1]):undefined} />
        </div>
      ) : null}

      {/* ── Empty state (first-time users) ──────────────────────────────── */}
      {isEmpty && <EmptyState onUploadClick={() => document.querySelector("[aria-label='Upload Statement']")?.click()} />}

      {!isEmpty && !loading && (<>

        {/* ── SECTION 2 — AI Monthly Report HERO ──────────────────────────── */}
        <div style={{
          marginBottom:18,
          borderRadius:24,
          background:"linear-gradient(145deg,#0e0f1e,#111223)",
          border:"1px solid rgba(167,139,250,0.22)",
          boxShadow:"0 0 0 1px rgba(167,139,250,0.08), 0 8px 40px rgba(167,139,250,0.08)",
          overflow:"hidden",
          position:"relative",
        }}>
          {/* Glow top accent */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:3,
            background:"linear-gradient(90deg,#7c3aed,#a78bfa,#ff4d6d)",
            borderRadius:"24px 24px 0 0",
          }}/>
          <div style={{ padding:"24px 26px 26px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"5px 12px", borderRadius:99,
                background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.25)",
              }}>
                <span style={{ fontSize:14 }}>✨</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#a78bfa", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                  AI Monthly Report
                </span>
              </div>
              <span style={{ fontSize:11, color:"#3a3d52" }}>Powered by Gemini</span>
            </div>
            <AIInsights refreshTrigger={aiRefresh} heroMode={true} />
          </div>
        </div>

        {/* ── SECTION 3 — Quick Actions ────────────────────────────────────── */}
        <div style={{
          display:"flex", gap:10, flexWrap:"wrap", marginBottom:18,
          padding:"16px 20px", borderRadius:18,
          background:"rgba(255,255,255,0.025)",
          border:"1px solid rgba(255,255,255,0.07)",
        }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#3a3d52", textTransform:"uppercase",
            letterSpacing:"0.07em", alignSelf:"center", marginRight:4 }}>Quick Actions</span>
          <QuickBtn icon="📤" label="Upload Statement" accent="#7c3aed"
            onClick={() => document.querySelector("[aria-label='Upload Statement']")?.click()} />
          <div style={{ flex:1, minWidth:120 }}>
            <DownloadReportButton txs={txs} chartIds={["fk-chart-line","fk-chart-breakdown"]}
              compact={true} />
          </div>
          <QuickBtn icon="🔄" label="Refresh AI" accent="#a78bfa"
            onClick={() => setAiRefresh(k=>k+1)} />
        </div>

        {/* ── SECTION 4 — Spending Alerts ──────────────────────────────────── */}
        <div style={{ marginBottom:18 }}>
          <SpendingAlerts refreshTrigger={refreshKey} compact={true} maxVisible={3} />
        </div>

        {/* ── SECTION 5 — Income vs Expense chart ──────────────────────────── */}
        <div id="fk-chart-line" className="fk-card" style={{ marginBottom:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            flexWrap:"wrap", gap:12, marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:0, fontFamily:"'Outfit',sans-serif" }}>
                Income vs Expense
              </h2>
              <p style={{ fontSize:12, color:"#5c5f72", marginTop:4 }}>
                {higherThanLast ? "⚠️ Spending up from last month" : "✅ Spending lower than last month"}
              </p>
            </div>
          </div>
          <Line data={lineData} options={lineOptions} />
        </div>

        {/* ── SECTION 6 — Analytics grid ───────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:18 }}>

          {/* Expense breakdown chart */}
          <div id="fk-chart-breakdown" className="fk-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:0, fontFamily:"'Outfit',sans-serif" }}>
                Expense Breakdown
              </h2>
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
            {catEntries.length===0
              ? <div style={{ padding:"40px 0", textAlign:"center", color:"#3a3d52", fontSize:14 }}>No expense data yet</div>
              : chartMode==="pie" ? <Pie data={pieData} options={pieOptions} /> : <Bar data={barData} options={barOptions} />
            }
          </div>

          {/* Category breakdown list */}
          <div className="fk-card">
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 16px", fontFamily:"'Outfit',sans-serif" }}>
              Category Breakdown
            </h2>
            {catEntries.length===0 ? (
              <div style={{ padding:"40px 0", textAlign:"center", color:"#3a3d52", fontSize:14 }}>No expense data yet</div>
            ) : (
              <div style={{ display:"grid", gap:8 }}>
                {catEntries.slice(0,7).map(([cat, amt]) => {
                  const pct = totalCatExpense>0 ? (amt/totalCatExpense)*100 : 0;
                  const color = getCategoryColor(cat);
                  return (
                    <div key={cat}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <span style={{ display:"flex", alignItems:"center", gap:7, fontSize:13 }}>
                          <span style={{ width:28, height:28, borderRadius:8, display:"inline-flex",
                            alignItems:"center", justifyContent:"center", fontSize:14, background:getCategoryBg(cat) }}>
                            {getCategoryEmoji(cat)}
                          </span>
                          <span style={{ color:"#d0d3e8", fontWeight:500 }}>{cat}</span>
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color, fontFamily:"'Outfit',sans-serif" }}>
                          {fmt(amt)}
                        </span>
                      </div>
                      <div style={{ height:4, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:3, width:`${pct.toFixed(1)}%`,
                          background:`linear-gradient(90deg,${color}cc,${color})`,
                          transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                      </div>
                      <div style={{ fontSize:11, color:"#3a3d52", marginTop:3, textAlign:"right" }}>{pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
                {catEntries.length>7 && (
                  <div style={{ fontSize:12, color:"#3a3d52", textAlign:"center", paddingTop:4 }}>
                    +{catEntries.length-7} more categories
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recurring payments compact */}
          <RecurringPayments compact={true} refreshTrigger={refreshKey} />

          {/* Monthly Summary */}
          <div className="fk-card">
            <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 18px", fontFamily:"'Outfit',sans-serif" }}>
              Monthly Summary
            </h2>
            <div style={{ display:"grid", gap:10 }}>
              {[
                { lbl:"This month expense", val:fmt(thisMonthExp),  color:"#ff8a80" },
                { lbl:"Last month expense",  val:fmt(lastMonthExp), color:"#a0a3b1" },
                { lbl:"vs Last month",       val:higherThanLast?"Higher 📈":"Lower 📉", color:higherThanLast?"#ff8a80":"#4ade80" },
                { lbl:"Savings rate",        val:income>0?`${(((income-expense)/income)*100).toFixed(1)}%`:"—", color:"#f59e0b" },
                { lbl:"Total categories",    val:`${catEntries.length} categories`, color:"#a78bfa" },
              ].map(({ lbl, val, color }) => (
                <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"11px 14px", borderRadius:12, background:"#0d0e17",
                  border:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize:13, color:"#6b6e85" }}>{lbl}</span>
                  <span style={{ fontSize:14, fontWeight:700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </>)}

      {/* ── Floating Upload FAB ───────────────────────────────────────────── */}
      <UploadFAB onSuccess={handleUploadSuccess} />

    </div>
  );
}