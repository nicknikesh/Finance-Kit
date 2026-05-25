import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const PAGE_SIZE = 8;
const TYPE_FILTERS = [{ v:"all",l:"All" },{ v:"income",l:"Income" },{ v:"expense",l:"Expense" }];

// ── Category metadata (mirrors backend categoryRules.js) ──────────────────────
const CATEGORY_META = {
  Food:          { emoji: "🍔", color: "#f59e0b",  bg: "rgba(245,158,11,0.12)"  },
  Travel:        { emoji: "✈️",  color: "#60a5fa",  bg: "rgba(96,165,250,0.12)"  },
  Shopping:      { emoji: "🛍️",  color: "#a78bfa",  bg: "rgba(167,139,250,0.12)" },
  Bills:         { emoji: "🧾",  color: "#fb923c",  bg: "rgba(251,146,60,0.12)"  },
  Salary:        { emoji: "💰",  color: "#4ade80",  bg: "rgba(74,222,128,0.12)"  },
  Entertainment: { emoji: "🎬",  color: "#f472b6",  bg: "rgba(244,114,182,0.12)" },
  Health:        { emoji: "🏥",  color: "#34d399",  bg: "rgba(52,211,153,0.12)"  },
  Others:        { emoji: "📦",  color: "#94a3b8",  bg: "rgba(148,163,184,0.12)" },
  // Legacy extra categories
  Healthcare:    { emoji: "🏥",  color: "#34d399",  bg: "rgba(52,211,153,0.12)"  },
  Housing:       { emoji: "🏠",  color: "#fb923c",  bg: "rgba(251,146,60,0.12)"  },
  "EMI/Loan":    { emoji: "💳",  color: "#f87171",  bg: "rgba(248,113,113,0.12)" },
  Utilities:     { emoji: "💡",  color: "#fbbf24",  bg: "rgba(251,191,36,0.12)"  },
  Cash:          { emoji: "💵",  color: "#6ee7b7",  bg: "rgba(110,231,183,0.12)" },
};

const CATEGORY_OPTIONS = [
  "Food", "Travel", "Shopping", "Bills",
  "Salary", "Entertainment", "Health", "Others",
];

function getCategoryMeta(cat) {
  return CATEGORY_META[cat] || CATEGORY_META["Others"];
}

export default function Transactions() {
  const [txs,        setTxs]        = useState([]);
  const [form,       setForm]       = useState({ type:"expense", amount:"", category:"", description:"" });
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("all");
  const [filter,     setFilter]     = useState("all");
  const [page,       setPage]       = useState(1);
  const [editing,    setEditing]    = useState(null);
  const [msg,        setMsg]        = useState({ text:"", type:"" });
  const [loading,    setLoading]    = useState(false);
  const token = localStorage.getItem("token");

  const flash = (text, type="info") => { setMsg({text,type}); setTimeout(()=>setMsg({text:"",type:""}),3500); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get("http://localhost:5000/api/transactions?limit=500",
        { headers:{ authorization:`Bearer ${token}` } });
      setTxs(r.data.data || []);
    } catch(e) { flash(e.response?.data?.error||"Unable to load transactions.","error"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  // Collect unique categories from actual data + standard list
  const uniqueCats = useMemo(()=>{
    const fromData = [...new Set(txs.map(t=>t.category).filter(Boolean))];
    const all = [...new Set([...CATEGORY_OPTIONS, ...fromData])];
    return all.sort();
  }, [txs]);

  const filtered = useMemo(()=>
    txs
      .filter(t => filter==="all" || t.type===filter)
      .filter(t => catFilter==="all" || t.category===catFilter)
      .filter(t => !search.trim()
        || t.category?.toLowerCase().includes(search.toLowerCase())
        || t.description?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a,b)=>new Date(b.date||b.createdAt||0)-new Date(a.date||a.createdAt||0)),
    [txs,search,filter,catFilter]);

  const pages    = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const pageRows = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const totals = useMemo(()=>({
    income:  filtered.filter(t=>t.type==="income" ).reduce((s,t)=>s+Number(t.amount),0),
    expense: filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0),
  }),[filtered]);

  const active  = editing || form;
  const setAct  = editing
    ? (k,v)=>setEditing(e=>({...e,[k]:v}))
    : (k,v)=>setForm(f=>({...f,[k]:v}));

  const handleAdd = async () => {
    if(!form.amount) return flash("Fill in amount.","error");
    if(!form.category && !form.description) return flash("Fill in category or description (for auto-detect).","error");
    try {
      await axios.post("http://localhost:5000/api/transactions",
        { type:form.type, amount:Number(form.amount), category:form.category||undefined, description:form.description||undefined },
        { headers:{ authorization:`Bearer ${token}` } });
      setForm({ type:"expense", amount:"", category:"", description:"" });
      flash("Transaction added.","success"); load();
    } catch(e) { flash(e.response?.data?.error||"Unable to add.","error"); }
  };

  const saveEdit = async () => {
    if(!editing.amount) return flash("Provide amount.","error");
    try {
      await axios.put(`http://localhost:5000/api/transactions/${editing._id}`,
        { type:editing.type, amount:Number(editing.amount), category:editing.category, description:editing.description||undefined },
        { headers:{ authorization:`Bearer ${token}` } });
      setEditing(null); flash("Transaction updated.","success"); load();
    } catch(e) { flash(e.response?.data?.error||"Unable to update.","error"); }
  };

  const del = async id => {
    if(!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/transactions/${id}`,
        { headers:{ authorization:`Bearer ${token}` } });
      flash("Deleted.","success"); load();
    } catch(e) { flash(e.response?.data?.error||"Unable to delete.","error"); }
  };

  const exportCsv = () => {
    const rows=[["Date","Type","Category","Description","Amount"]];
    filtered.forEach(t=>rows.push([
      new Date(t.date||t.createdAt||Date.now()).toLocaleString(),
      t.type, t.category, t.description||"", t.amount,
    ]));
    const csv  = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href  = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    link.download = "transactions.csv"; link.click();
  };

  const fmt = n => `₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2})}`;

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }} className="anim-fadeup">

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", margin:0 }}>Transactions</h1>
          <p style={{ color:"#a0a3b1", fontSize:14, marginTop:6 }}>Add, filter and manage your transaction history</p>
        </div>
        <button className="fk-btn fk-btn-primary" onClick={exportCsv} style={{ padding:"9px 18px", fontSize:13 }}>
          ↓ Export CSV
        </button>
      </div>

      {msg.text && <div className={`fk-alert fk-alert-${msg.type} anim-fadein`} style={{ marginBottom:18 }}>{msg.text}</div>}

      {/* Form */}
      <div className="fk-card" style={{ marginBottom:18 }}>
        <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 16px", fontFamily:"'Outfit',sans-serif" }}>
          {editing ? "✏️  Edit transaction" : "＋  Add transaction"}
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, alignItems:"end" }}>
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
            <label className="fk-label">
              Category
              <span style={{ fontSize:11, color:"#3a3d52", marginLeft:6 }}>(or auto-detect)</span>
            </label>
            <select className="fk-input" value={active.category} onChange={e=>setAct("category",e.target.value)}>
              <option value="">— Auto detect —</option>
              {CATEGORY_OPTIONS.map(c=>(
                <option key={c} value={c}>{getCategoryMeta(c).emoji} {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fk-label">
              Description
              <span style={{ fontSize:11, color:"#3a3d52", marginLeft:6 }}>(used for auto-detect)</span>
            </label>
            <input className="fk-input" type="text" placeholder="e.g. Swiggy order, IRCTC"
              value={active.description||""} onChange={e=>setAct("description",e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(editing?saveEdit():handleAdd())} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {editing ? (
              <>
                <button className="fk-btn fk-btn-success" onClick={saveEdit} style={{ flex:1, padding:"12px" }}>Save</button>
                <button className="fk-btn fk-btn-ghost" onClick={()=>setEditing(null)} style={{ flex:1, padding:"12px" }}>Cancel</button>
              </>
            ) : (
              <button className="fk-btn fk-btn-primary" onClick={handleAdd} style={{ width:"100%", padding:"12px" }}>Add</button>
            )}
          </div>
        </div>
        {!editing && !form.category && (
          <p style={{ fontSize:12, color:"#3a3d52", marginTop:12, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ color:"#a78bfa" }}>✨</span>
            Leave category empty and enter a description — the system will auto-detect it (Swiggy → Food, Amazon → Shopping, etc.)
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="fk-card" style={{ marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, alignItems:"center" }}>
          {/* Type filter pills */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {TYPE_FILTERS.map(({ v, l })=>(
              <button key={v} onClick={()=>{ setFilter(v); setPage(1); }} className="fk-btn"
                style={{
                  padding:"8px 16px", fontSize:13, borderRadius:10,
                  background: v===filter?"#ff4d6d":"transparent",
                  color: v===filter?"#fff":"#a0a3b1",
                  border: v===filter?"1px solid transparent":"1px solid rgba(255,255,255,0.08)",
                  boxShadow: v===filter?"0 4px 12px rgba(255,77,109,0.3)":"none",
                }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {/* Category dropdown filter */}
            <select className="fk-input" value={catFilter}
              onChange={e=>{ setCatFilter(e.target.value); setPage(1); }}
              style={{ maxWidth:180, fontSize:13 }}>
              <option value="all">All Categories</option>
              {uniqueCats.map(c=>(
                <option key={c} value={c}>{getCategoryMeta(c).emoji} {c}</option>
              ))}
            </select>
            {/* Text search */}
            <input className="fk-input" placeholder="Search description…"
              value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth:220 }} />
          </div>
        </div>

        {/* Totals row */}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize:13, color:"#5c5f72" }}><strong style={{ color:"#fff" }}>{filtered.length}</strong> transactions</span>
          <span style={{ fontSize:13, color:"#4ade80" }}>Income: <strong>{fmt(totals.income)}</strong></span>
          <span style={{ fontSize:13, color:"#ff8a80" }}>Expense: <strong>{fmt(totals.expense)}</strong></span>
        </div>
      </div>

      {/* Active filters chips */}
      {(catFilter!=="all"||filter!=="all"||search) && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          {catFilter!=="all" && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"4px 10px", borderRadius:20, fontSize:12,
              background: getCategoryMeta(catFilter).bg,
              color: getCategoryMeta(catFilter).color,
              border:`1px solid ${getCategoryMeta(catFilter).color}44`,
            }}>
              {getCategoryMeta(catFilter).emoji} {catFilter}
              <button onClick={()=>setCatFilter("all")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:"0 0 0 4px", fontSize:14 }}>×</button>
            </span>
          )}
          {filter!=="all" && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"4px 10px", borderRadius:20, fontSize:12,
              background:"rgba(255,77,109,0.1)", color:"#ff4d6d",
              border:"1px solid rgba(255,77,109,0.3)",
            }}>
              {filter}
              <button onClick={()=>setFilter("all")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:"0 0 0 4px", fontSize:14 }}>×</button>
            </span>
          )}
          {search && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              padding:"4px 10px", borderRadius:20, fontSize:12,
              background:"rgba(167,139,250,0.1)", color:"#a78bfa",
              border:"1px solid rgba(167,139,250,0.3)",
            }}>
              🔍 "{search}"
              <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:"0 0 0 4px", fontSize:14 }}>×</button>
            </span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ padding:"50px", textAlign:"center", color:"#5c5f72" }}>
          <div className="fk-spinner" style={{ width:28,height:28,borderWidth:3,margin:"0 auto 12px" }} />
          <p>Loading…</p>
        </div>
      ) : pageRows.length===0 ? (
        <div className="fk-card" style={{ padding:"48px", textAlign:"center" }}>
          <div style={{ fontSize:34, marginBottom:12 }}>🗒️</div>
          <p style={{ fontSize:15, color:"#5c5f72" }}>No transactions found</p>
        </div>
      ) : (
        <div style={{ display:"grid", gap:8, marginBottom:18 }}>
          {pageRows.map(tx=>{
            const meta = getCategoryMeta(tx.category);
            return (
              <div key={tx._id}
                style={{
                  display:"flex", alignItems:"center", gap:14,
                  padding:"15px 18px", borderRadius:16,
                  background:"#10111c", border:"1px solid rgba(255,255,255,0.06)",
                  transition:"border-color 0.18s ease, box-shadow 0.18s ease",
                }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,0.13)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.2)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow="none"; }}
              >
                {/* Category icon */}
                <div style={{
                  width:44, height:44, borderRadius:13, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
                  background: meta.bg,
                }}>
                  {meta.emoji}
                </div>

                {/* info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:600, fontSize:14, color:"#fff" }}>{tx.category}</span>
                    <span className={`fk-badge fk-badge-${tx.type}`}>{tx.type}</span>
                    {tx.source === "upload" && (
                      <span style={{
                        fontSize:10, padding:"2px 7px", borderRadius:20,
                        background:"rgba(167,139,250,0.12)", color:"#a78bfa",
                        border:"1px solid rgba(167,139,250,0.25)", fontWeight:500,
                      }}>📄 PDF</span>
                    )}
                  </div>
                  {tx.description && (
                    <div style={{ fontSize:12, color:"#5c5f72", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:300 }}>
                      {tx.description}
                    </div>
                  )}
                  <div style={{ fontSize:12, color:"#3a3d52", marginTop:2 }}>
                    {new Date(tx.date||tx.createdAt||Date.now()).toLocaleDateString("en-IN",{ day:"numeric",month:"short",year:"numeric" })}
                  </div>
                </div>

                {/* amount */}
                <div style={{
                  fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:16, flexShrink:0,
                  color: tx.type==="income"?"#4ade80":"#ff8a80", letterSpacing:"-0.02em",
                }}>
                  {tx.type==="income"?"+":"−"}{fmt(tx.amount)}
                </div>

                {/* actions */}
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button className="fk-btn fk-btn-ghost" onClick={()=>{ setEditing({...tx,amount:String(tx.amount),description:tx.description||""}); window.scrollTo({top:0,behavior:"smooth"}); }}
                    style={{ padding:"7px 14px", fontSize:12 }}>Edit</button>
                  <button className="fk-btn fk-btn-danger" onClick={()=>del(tx._id)}
                    style={{ padding:"7px 14px", fontSize:12 }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages>1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
          <button className="fk-btn fk-btn-ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{ padding:"8px 14px", fontSize:13, opacity:page===1?0.4:1 }}>← Prev</button>
          {Array.from({length:Math.min(pages,7)},(_,i)=>i+1).map(n=>(
            <button key={n} onClick={()=>setPage(n)} className="fk-btn"
              style={{
                width:38, height:38, padding:0, fontSize:13, borderRadius:9,
                background: n===page?"#ff4d6d":"#10111c",
                color: n===page?"#fff":"#a0a3b1",
                border: n===page?"1px solid transparent":"1px solid rgba(255,255,255,0.08)",
              }}>{n}</button>
          ))}
          {pages > 7 && <span style={{ color:"#3a3d52", fontSize:13, alignSelf:"center" }}>…{pages}</span>}
          <button className="fk-btn fk-btn-ghost" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
            style={{ padding:"8px 14px", fontSize:13, opacity:page===pages?0.4:1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
