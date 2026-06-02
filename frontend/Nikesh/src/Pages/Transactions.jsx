import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API as APIURLS } from "../utils/api";

const API      = APIURLS.transactions;
const PG_SIZE  = 15;

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORY_META = {
  Food:          { emoji:"🍔", color:"#f59e0b", bg:"rgba(245,158,11,0.12)"  },
  Travel:        { emoji:"✈️",  color:"#60a5fa", bg:"rgba(96,165,250,0.12)"  },
  Shopping:      { emoji:"🛍️",  color:"#a78bfa", bg:"rgba(167,139,250,0.12)" },
  Bills:         { emoji:"🧾",  color:"#fb923c", bg:"rgba(251,146,60,0.12)"  },
  Salary:        { emoji:"💰",  color:"#4ade80", bg:"rgba(74,222,128,0.12)"  },
  Entertainment: { emoji:"🎬",  color:"#f472b6", bg:"rgba(244,114,182,0.12)" },
  Health:        { emoji:"🏥",  color:"#34d399", bg:"rgba(52,211,153,0.12)"  },
  Others:        { emoji:"📦",  color:"#94a3b8", bg:"rgba(148,163,184,0.12)" },
  Healthcare:    { emoji:"🏥",  color:"#34d399", bg:"rgba(52,211,153,0.12)"  },
  Housing:       { emoji:"🏠",  color:"#fb923c", bg:"rgba(251,146,60,0.12)"  },
  "EMI/Loan":    { emoji:"💳",  color:"#f87171", bg:"rgba(248,113,113,0.12)" },
  Utilities:     { emoji:"💡",  color:"#fbbf24", bg:"rgba(251,191,36,0.12)"  },
  Cash:          { emoji:"💵",  color:"#6ee7b7", bg:"rgba(110,231,183,0.12)" },
};
const CATEGORY_OPTIONS = ["Food","Travel","Shopping","Bills","Salary","Entertainment","Health","Others"];

const getMeta = cat => CATEGORY_META[cat] || CATEGORY_META.Others;
const fmt     = n   => `₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2})}`;
const fmtDate = d   => new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

// ── Filter chip ───────────────────────────────────────────────────────────────
function Chip({ label, onRemove }) {
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",
      borderRadius:99,fontSize:12,background:"rgba(167,139,250,0.12)",
      color:"#a78bfa",border:"1px solid rgba(167,139,250,0.25)",animation:"fk-fadein 0.2s ease" }}>
      {label}
      <button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:14,lineHeight:1,padding:0 }}>×</button>
    </span>
  );
}

// ── Sort button ───────────────────────────────────────────────────────────────
function SortBtn({ value, active, label, onClick }) {
  return (
    <button onClick={() => onClick(value)}
      style={{
        padding:"7px 13px",fontSize:12,borderRadius:9,cursor:"pointer",
        background: active ? "rgba(255,77,109,0.15)" : "transparent",
        color: active ? "#ff4d6d" : "#5c5f72",
        border: active ? "1px solid rgba(255,77,109,0.35)" : "1px solid rgba(255,255,255,0.07)",
        transition:"all 0.16s",fontWeight: active ? 700 : 400,
      }}>{label}</button>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
function TxRow({ tx, onEdit, onDelete, idx }) {
  const [visible, setVisible] = useState(false);
  const meta = getMeta(tx.category);
  useEffect(() => { const t = setTimeout(() => setVisible(true), idx * 40); return () => clearTimeout(t); }, [idx]);

  return (
    <div style={{
      display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:16,
      background:"#10111c",border:"1px solid rgba(255,255,255,0.06)",
      transition:"opacity 0.3s ease, transform 0.3s ease, border-color 0.18s, box-shadow 0.18s",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
    }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.13)";e.currentTarget.style.boxShadow="0 4px 22px rgba(0,0,0,0.22)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";e.currentTarget.style.boxShadow="none";}}
    >
      {/* Category icon */}
      <div style={{ width:42,height:42,borderRadius:12,flexShrink:0,display:"flex",
        alignItems:"center",justifyContent:"center",fontSize:19,background:meta.bg }}>
        {meta.emoji}
      </div>

      {/* Info */}
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:2 }}>
          <span style={{ fontWeight:700,fontSize:14,color:"#fff" }}>{tx.category}</span>
          <span className={`fk-badge fk-badge-${tx.type}`}>{tx.type}</span>
          {tx.source==="upload" && (
            <span style={{ fontSize:10,padding:"2px 7px",borderRadius:99,background:"rgba(167,139,250,0.12)",
              color:"#a78bfa",border:"1px solid rgba(167,139,250,0.25)",fontWeight:500 }}>📄 PDF</span>
          )}
        </div>
        {tx.description && (
          <div style={{ fontSize:12,color:"#5c5f72",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:320 }}>
            {tx.description}
          </div>
        )}
        <div style={{ fontSize:11,color:"#3a3d52",marginTop:2 }}>
          {fmtDate(tx.date||tx.createdAt||Date.now())}
        </div>
      </div>

      {/* Amount */}
      <div style={{ fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:16,flexShrink:0,
        color:tx.type==="income"?"#4ade80":"#ff8a80",letterSpacing:"-0.02em" }}>
        {tx.type==="income"?"+":"−"}{fmt(tx.amount)}
      </div>

      {/* Actions */}
      <div style={{ display:"flex",gap:5,flexShrink:0 }}>
        <button className="fk-btn fk-btn-ghost" onClick={()=>onEdit(tx)}
          style={{ padding:"6px 12px",fontSize:12 }}>Edit</button>
        <button className="fk-btn fk-btn-danger" onClick={()=>onDelete(tx._id)}
          style={{ padding:"6px 12px",fontSize:12 }}>Del</button>
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ i }) {
  return (
    <div style={{ height:76,borderRadius:16,
      background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize:"200% 100%",animation:`fk-shimmer 1.5s infinite ${i*0.09}s` }}/>
  );
}

// ── Summary pill ──────────────────────────────────────────────────────────────
function SumPill({ label, value, color }) {
  return (
    <div style={{ padding:"10px 16px",borderRadius:12,background:"#0d0e17",
      border:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",gap:2 }}>
      <span style={{ fontSize:11,color:"#3a3d52",fontWeight:600 }}>{label}</span>
      <span style={{ fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:800,color }}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Transactions() {
  // Form state
  const [form,    setForm]    = useState({ type:"expense",amount:"",category:"",description:"",date:"" });
  const [editing, setEditing] = useState(null);
  const [msg,     setMsg]     = useState({ text:"",type:"" });

  // Filter state
  const [search,    setSearch]    = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [catFilter,  setCatFilter]    = useState("all");
  const [sortBy,     setSortBy]       = useState("latest");
  const [from,       setFrom]         = useState("");
  const [to,         setTo]           = useState("");
  const [minAmt,     setMinAmt]       = useState("");
  const [maxAmt,     setMaxAmt]       = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Data state
  const [txs,       setTxs]       = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [totalPages,setTotalPages]= useState(1);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const token = localStorage.getItem("token");

  const flash = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg({text:"",type:""}),3500); };

  // Build params object from current filter state
  const buildParams = useCallback((pg = 1) => {
    const p = new URLSearchParams({ page: pg, limit: PG_SIZE, sort: sortBy });
    if (search)    p.set("search", search);
    if (typeFilter !== "all") p.set("type", typeFilter);
    if (catFilter  !== "all") p.set("category", catFilter);
    if (from)      p.set("from", from);
    if (to)        p.set("to", to);
    if (minAmt)    p.set("minAmount", minAmt);
    if (maxAmt)    p.set("maxAmount", maxAmt);
    return p;
  }, [search, typeFilter, catFilter, sortBy, from, to, minAmt, maxAmt]);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}?${buildParams(pg)}`,
        { headers:{ authorization:`Bearer ${token}` }});
      setTxs(r.data.data || []);
      setTotal(r.data.pagination?.total || 0);
      setTotalPages(r.data.pagination?.pages || 1);
      setPage(pg);
    } catch(e) {
      flash(e.response?.data?.error || "Unable to load transactions.", "error");
    } finally { setLoading(false); }
  }, [buildParams, token]);

  useEffect(() => { load(1); }, [load]);

  // Unique category list from currently loaded data
  const uniqueCats = useMemo(() => {
    const fromData = [...new Set(txs.map(t=>t.category).filter(Boolean))];
    return [...new Set([...CATEGORY_OPTIONS,...fromData])].sort();
  }, [txs]);

  // Running totals from current page
  const totals = useMemo(() => ({
    income:  txs.filter(t=>t.type==="income" ).reduce((s,t)=>s+Number(t.amount),0),
    expense: txs.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0),
  }), [txs]);

  // Active filter chips
  const chips = useMemo(() => {
    const c = [];
    if (search)              c.push({ key:"search",    label:`🔍 "${search}"`,           clear:()=>{ setSearch(""); setDraftSearch(""); } });
    if (typeFilter!=="all")  c.push({ key:"type",      label:typeFilter,                  clear:()=>setTypeFilter("all") });
    if (catFilter!=="all")   c.push({ key:"cat",       label:`${getMeta(catFilter).emoji} ${catFilter}`, clear:()=>setCatFilter("all") });
    if (from)                c.push({ key:"from",      label:`From ${from}`,              clear:()=>setFrom("") });
    if (to)                  c.push({ key:"to",        label:`To ${to}`,                  clear:()=>setTo("") });
    if (minAmt)              c.push({ key:"min",       label:`≥ ₹${minAmt}`,             clear:()=>setMinAmt("") });
    if (maxAmt)              c.push({ key:"max",       label:`≤ ₹${maxAmt}`,             clear:()=>setMaxAmt("") });
    if (sortBy!=="latest")   c.push({ key:"sort",      label:`Sort: ${sortBy}`,           clear:()=>setSortBy("latest") });
    return c;
  }, [search, typeFilter, catFilter, from, to, minAmt, maxAmt, sortBy]);

  const clearAll = () => {
    setSearch(""); setDraftSearch(""); setTypeFilter("all"); setCatFilter("all");
    setSortBy("latest"); setFrom(""); setTo(""); setMinAmt(""); setMaxAmt("");
  };

  // CRUD
  const active = editing || form;
  const setAct = (k,v) => editing ? setEditing(e=>({...e,[k]:v})) : setForm(f=>({...f,[k]:v}));

  const handleAdd = async () => {
    if (!form.amount) return flash("Fill in amount.", "error");
    if (!form.category && !form.description) return flash("Fill in category or description.", "error");
    try {
      await axios.post(API,
        { type:form.type, amount:Number(form.amount), category:form.category||undefined,
          description:form.description||undefined, date:form.date||undefined },
        { headers:{ authorization:`Bearer ${token}` }});
      setForm({ type:"expense",amount:"",category:"",description:"",date:"" });
      flash("Transaction added.", "success"); load(page);
    } catch(e) { flash(e.response?.data?.error||"Unable to add.", "error"); }
  };

  const saveEdit = async () => {
    if (!editing.amount) return flash("Provide amount.", "error");
    try {
      await axios.put(`${API}/${editing._id}`,
        { type:editing.type, amount:Number(editing.amount),
          category:editing.category, description:editing.description||undefined,
          date:editing.date||undefined },
        { headers:{ authorization:`Bearer ${token}` }});
      setEditing(null); flash("Transaction updated.", "success"); load(page);
    } catch(e) { flash(e.response?.data?.error||"Unable to update.", "error"); }
  };

  const del = async id => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers:{ authorization:`Bearer ${token}` }});
      flash("Deleted.", "success"); load(page);
    } catch(e) { flash(e.response?.data?.error||"Unable to delete.", "error"); }
  };

  // Export CSV (all matching results, not just page)
  const exportCsv = async () => {
    setExporting(true);
    try {
      // Fetch all matching (large limit)
      const p = buildParams(1);
      p.set("limit", "5000");
      const r = await axios.get(`${API}?${p}`, { headers:{ authorization:`Bearer ${token}` }});
      const rows = [["Date","Type","Category","Description","Amount"]];
      (r.data.data||[]).forEach(t => rows.push([
        fmtDate(t.date||t.createdAt||Date.now()),
        t.type, t.category, t.description||"", t.amount,
      ]));
      const csv  = rows.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}`).join(",")).join("\r\n");
      const link = document.createElement("a");
      link.href  = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
      link.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      flash(`Exported ${r.data.pagination?.total||0} transactions.`, "success");
    } catch(e) { flash("Export failed.", "error"); }
    finally { setExporting(false); }
  };

  const searchRef = useRef(null);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }} className="anim-fadeup">

      {/* ── Header ── */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Outfit',sans-serif",fontSize:26,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",margin:0 }}>
            Transactions
          </h1>
          <p style={{ color:"#a0a3b1",fontSize:14,marginTop:6 }}>
            {total} transaction{total!==1?"s":""} — search, filter and manage your history
          </p>
        </div>
        <button className="fk-btn fk-btn-primary" onClick={exportCsv} disabled={exporting}
          style={{ padding:"9px 18px",fontSize:13 }}>
          {exporting ? <><div className="fk-spinner" style={{marginRight:6}}/>Exporting…</> : "↓ Export CSV"}
        </button>
      </div>

      {msg.text && <div className={`fk-alert fk-alert-${msg.type}`} style={{ marginBottom:16,animation:"fk-fadein 0.25s ease" }}>{msg.text}</div>}

      {/* ── Add / Edit form ── */}
      <div className="fk-card" style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:15,fontWeight:700,color:"#fff",margin:"0 0 16px",fontFamily:"'Outfit',sans-serif" }}>
          {editing ? "✏️ Edit transaction" : "＋ Add transaction"}
        </h2>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,alignItems:"end" }}>
          <div>
            <label className="fk-label">Type</label>
            <select className="fk-input" value={active.type} onChange={e=>setAct("type",e.target.value)}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="fk-label">Amount (₹)</label>
            <input className="fk-input" type="number" placeholder="0.00" min="0"
              value={active.amount} onChange={e=>setAct("amount",e.target.value)} />
          </div>
          <div>
            <label className="fk-label">Category <span style={{fontSize:11,color:"#3a3d52",marginLeft:4}}>(or auto)</span></label>
            <select className="fk-input" value={active.category} onChange={e=>setAct("category",e.target.value)}>
              <option value="">— Auto detect —</option>
              {CATEGORY_OPTIONS.map(c=>(
                <option key={c} value={c}>{getMeta(c).emoji} {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fk-label">Description</label>
            <input className="fk-input" type="text" placeholder="e.g. Swiggy, IRCTC…"
              value={active.description||""} onChange={e=>setAct("description",e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(editing?saveEdit():handleAdd())} />
          </div>
          <div>
            <label className="fk-label">Date</label>
            <input className="fk-input" type="date" value={active.date||""}
              onChange={e=>setAct("date",e.target.value)} />
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {editing ? (
              <>
                <button className="fk-btn fk-btn-success" onClick={saveEdit} style={{ flex:1,padding:"12px" }}>Save</button>
                <button className="fk-btn fk-btn-ghost" onClick={()=>setEditing(null)} style={{ flex:1,padding:"12px" }}>Cancel</button>
              </>
            ) : (
              <button className="fk-btn fk-btn-primary" onClick={handleAdd} style={{ width:"100%",padding:"12px" }}>Add</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters card ── */}
      <div className="fk-card" style={{ marginBottom:16 }}>
        {/* Row 1: search + type pills + sort */}
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:12 }}>
          {/* Search */}
          <div style={{ flex:2,minWidth:200,position:"relative" }}>
            <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#3a3d52",fontSize:14,pointerEvents:"none" }}>🔍</span>
            <input className="fk-input" ref={searchRef}
              style={{ paddingLeft:34 }}
              placeholder="Search merchant, description, category…"
              value={draftSearch}
              onChange={e=>setDraftSearch(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"){ setSearch(draftSearch); } }}
            />
          </div>
          <button className="fk-btn fk-btn-primary" onClick={()=>setSearch(draftSearch)} style={{ padding:"10px 16px",fontSize:13 }}>Search</button>

          {/* Type pills */}
          {["all","income","expense"].map(v=>(
            <button key={v} onClick={()=>{ setTypeFilter(v); }} className="fk-btn"
              style={{ padding:"9px 14px",fontSize:12,borderRadius:10,
                background: v===typeFilter?"#ff4d6d":"transparent",
                color: v===typeFilter?"#fff":"#a0a3b1",
                border: v===typeFilter?"1px solid transparent":"1px solid rgba(255,255,255,0.08)",
                boxShadow: v===typeFilter?"0 3px 10px rgba(255,77,109,0.28)":"none",
              }}>
              {v==="all"?"All":v==="income"?"↑ Income":"↓ Expense"}
            </button>
          ))}

          {/* Advanced toggle */}
          <button onClick={()=>setShowAdvanced(a=>!a)} className="fk-btn fk-btn-ghost"
            style={{ padding:"9px 14px",fontSize:12,marginLeft:"auto",
              color: showAdvanced?"#a78bfa":"#5c5f72",
              border: showAdvanced?"1px solid rgba(167,139,250,0.3)":"1px solid rgba(255,255,255,0.08)" }}>
            ⚙ {showAdvanced?"Hide":"Advanced"}
          </button>
        </div>

        {/* Row 2: advanced filters */}
        {showAdvanced && (
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",paddingTop:12,
            borderTop:"1px solid rgba(255,255,255,0.06)",animation:"fk-fadein 0.25s ease" }}>
            <div style={{ minWidth:150 }}>
              <label className="fk-label">Category</label>
              <select className="fk-input" value={catFilter}
                onChange={e=>{ setCatFilter(e.target.value); }}>
                <option value="all">All Categories</option>
                {uniqueCats.map(c=>(<option key={c} value={c}>{getMeta(c).emoji} {c}</option>))}
              </select>
            </div>
            <div style={{ minWidth:130 }}>
              <label className="fk-label">From</label>
              <input className="fk-input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
            </div>
            <div style={{ minWidth:130 }}>
              <label className="fk-label">To</label>
              <input className="fk-input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
            </div>
            <div style={{ minWidth:110 }}>
              <label className="fk-label">Min ₹</label>
              <input className="fk-input" type="number" min="0" placeholder="0" value={minAmt} onChange={e=>setMinAmt(e.target.value)} />
            </div>
            <div style={{ minWidth:110 }}>
              <label className="fk-label">Max ₹</label>
              <input className="fk-input" type="number" min="0" placeholder="∞" value={maxAmt} onChange={e=>setMaxAmt(e.target.value)} />
            </div>
          </div>
        )}

        {/* Sort row */}
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize:12,color:"#3a3d52",fontWeight:600,marginRight:4 }}>Sort:</span>
          {[["latest","🕐 Latest"],["oldest","🕰 Oldest"],["highest","↑ Highest"],["lowest","↓ Lowest"]].map(([v,l])=>(
            <SortBtn key={v} value={v} active={sortBy===v} label={l} onClick={setSortBy}/>
          ))}
        </div>

        {/* Summary strip */}
        <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginTop:14,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <SumPill label="Showing" value={`${txs.length} of ${total}`} color="#fff"/>
          <SumPill label="Income"  value={fmt(totals.income)}          color="#4ade80"/>
          <SumPill label="Expense" value={fmt(totals.expense)}         color="#ff8a80"/>
          <SumPill label="Net"     value={fmt(totals.income-totals.expense)} color={totals.income>=totals.expense?"#4ade80":"#ff8a80"}/>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {chips.length > 0 && (
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:14 }}>
          {chips.map(c=><Chip key={c.key} label={c.label} onRemove={c.clear}/>)}
          <button onClick={clearAll} style={{ fontSize:12,padding:"4px 10px",borderRadius:99,
            background:"transparent",border:"1px solid rgba(255,255,255,0.1)",
            color:"#3a3d52",cursor:"pointer",transition:"all 0.16s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,0.25)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="#3a3d52";e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Transaction list ── */}
      {loading ? (
        <div style={{ display:"grid",gap:8,marginBottom:18 }}>
          {Array.from({length:6},(_,i)=><SkeletonRow key={i} i={i}/>)}
        </div>
      ) : txs.length === 0 ? (
        <div className="fk-card" style={{ padding:"56px 24px",textAlign:"center" }}>
          <div style={{ fontSize:42,marginBottom:14 }}>🗒️</div>
          <h3 style={{ fontFamily:"'Outfit',sans-serif",fontSize:18,color:"#fff",marginBottom:8 }}>No transactions found</h3>
          <p style={{ fontSize:14,color:"#5c5f72" }}>
            {chips.length>0?"Try adjusting your filters.":"Add your first transaction above or upload a PDF statement."}
          </p>
          {chips.length>0 && (
            <button className="fk-btn fk-btn-ghost" onClick={clearAll} style={{ marginTop:14,padding:"9px 18px" }}>Clear filters</button>
          )}
        </div>
      ) : (
        <div style={{ display:"grid",gap:8,marginBottom:18 }}>
          {txs.map((tx,i) => (
            <TxRow key={tx._id} tx={tx} idx={i}
              onEdit={t=>{ setEditing({...t,amount:String(t.amount),description:t.description||"",date:t.date?t.date.slice?.(0,10):""});
                window.scrollTo({top:0,behavior:"smooth"}); }}
              onDelete={del}/>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:6,flexWrap:"wrap" }}>
          <button className="fk-btn fk-btn-ghost" onClick={()=>load(page-1)} disabled={page===1}
            style={{ padding:"8px 14px",fontSize:13,opacity:page===1?0.4:1 }}>← Prev</button>
          {(() => {
            // Smart pagination: show first, last, current ±2, with ellipsis
            const pages = [];
            const show = new Set([1, totalPages, page, page-1, page+1, page-2, page+2].filter(p=>p>=1&&p<=totalPages));
            let prev = 0;
            for (const n of [...show].sort((a,b)=>a-b)) {
              if (prev && n - prev > 1) pages.push(<span key={`e${n}`} style={{ color:"#3a3d52",fontSize:13,alignSelf:"center" }}>…</span>);
              pages.push(
                <button key={n} onClick={()=>load(n)} className="fk-btn"
                  style={{ width:36,height:36,padding:0,fontSize:13,borderRadius:9,
                    background:n===page?"#ff4d6d":"#10111c",
                    color:n===page?"#fff":"#a0a3b1",
                    border:n===page?"1px solid transparent":"1px solid rgba(255,255,255,0.08)",
                    boxShadow:n===page?"0 2px 8px rgba(255,77,109,0.3)":"none",
                  }}>{n}</button>
              );
              prev = n;
            }
            return pages;
          })()}
          <button className="fk-btn fk-btn-ghost" onClick={()=>load(page+1)} disabled={page===totalPages}
            style={{ padding:"8px 14px",fontSize:13,opacity:page===totalPages?0.4:1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
