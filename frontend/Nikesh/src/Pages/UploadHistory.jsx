import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API } from "../utils/api";

const PAGE_SIZE = 10;

// ── Bank color/icon map ───────────────────────────────────────────────────────
const BANK_META = {
  SBI:     { color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "🏦" },
  HDFC:    { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  icon: "🏦" },
  ICICI:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "🏦" },
  Axis:    { color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "🏦" },
  Generic: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "📄" },
};

function getBankMeta(name) {
  return BANK_META[name] || { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", icon: "🏦" };
}

function fmt(d) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtAmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, color = "#fff" }) {
  return (
    <div style={{
      flex: 1, minWidth: 130,
      background: "#10111c",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "18px 20px",
      transition: "all 0.18s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#3a3d52", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.03em" }}>{value}</div>
    </div>
  );
}

// ── Transaction drawer ────────────────────────────────────────────────────────
function TransactionDrawer({ record, onClose, token }) {
  const [txs,     setTxs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!record) return;
    setLoading(true);
    setError("");
    axios.get(`${API.history}/${record._id}/transactions`, {
      headers: { authorization: `Bearer ${token}` },
    }).then(r => {
      setTxs(r.data.data || []);
    }).catch(e => {
      setError(e.response?.data?.error || "Failed to load transactions.");
    }).finally(() => setLoading(false));
  }, [record, token]);

  if (!record) return null;
  const meta = getBankMeta(record.bankName);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        animation: "fk-fadein 0.2s ease both",
      }} />

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 101,
        width: "min(520px, 100vw)",
        background: "#0d0e17",
        borderLeft: "1px solid rgba(255,255,255,0.09)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.28s cubic-bezier(0.4,0,0.2,1) both",
        overflowY: "auto",
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          position: "sticky", top: 0, background: "#0d0e17", zIndex: 1,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: meta.bg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 18,
              }}>{meta.icon}</div>
              <div>
                <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>
                  {record.bankName} Statement
                </h2>
                <p style={{ fontSize: 11, color: "#5c5f72", marginTop: 2 }}>
                  {record.fileName}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <span style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 20,
                background: "rgba(74,222,128,0.1)", color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.2)",
              }}>✓ {record.transactionsImported} imported</span>
              {record.duplicateTransactionsSkipped > 0 && (
                <span style={{
                  fontSize: 11, padding: "3px 9px", borderRadius: 20,
                  background: "rgba(251,146,60,0.1)", color: "#fb923c",
                  border: "1px solid rgba(251,146,60,0.2)",
                }}>⊘ {record.duplicateTransactionsSkipped} skipped</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "#6b6e85", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.18s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b6e85"; }}
          >×</button>
        </div>

        {/* Drawer content */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{
                  height: 56, borderRadius: 12,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
                  backgroundSize: "200% 100%", animation: `fk-shimmer 1.5s infinite ${i*0.1}s`,
                }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,77,109,0.08)",
              border: "1px solid rgba(255,77,109,0.2)", textAlign: "center" }}>
              <p style={{ color: "#ff8a80", fontSize: 13 }}>{error}</p>
            </div>
          ) : txs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗒️</div>
              <p style={{ color: "#3a3d52", fontSize: 14 }}>No transactions linked to this upload</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 12, color: "#3a3d52", marginBottom: 4 }}>
                {txs.length} transaction{txs.length !== 1 ? "s" : ""} from this upload
              </p>
              {txs.map((tx, i) => (
                <div key={tx._id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 13,
                  background: "#10111c", border: "1px solid rgba(255,255,255,0.06)",
                  animation: `fk-fadein 0.3s ease ${i * 0.04}s both`,
                  transition: "border-color 0.18s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    background: tx.type === "income" ? "rgba(74,222,128,0.1)" : "rgba(255,138,128,0.1)",
                  }}>
                    {tx.type === "income" ? "↑" : "↓"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.category}
                    </div>
                    {tx.description && (
                      <div style={{ fontSize: 11, color: "#3a3d52", marginTop: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#3a3d52", marginTop: 1 }}>
                      {fmtDate(tx.date || tx.createdAt)}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0,
                    color: tx.type === "income" ? "#4ade80" : "#ff8a80",
                  }}>
                    {tx.type === "income" ? "+" : "−"}{fmtAmt(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UploadHistory() {
  const [records,   setRecords]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [from,      setFrom]      = useState("");
  const [to,        setTo]        = useState("");
  const [page,      setPage]      = useState(1);
  const [totalPages,setTotalPages]= useState(1);
  const [total,     setTotal]     = useState(0);
  const [drawer,    setDrawer]    = useState(null); // selected upload record
  const [deleting,  setDeleting]  = useState(null);
  const token = localStorage.getItem("token");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
      if (search.trim()) params.set("search", search.trim());
      if (from)          params.set("from", from);
      if (to)            params.set("to", to);

      const r = await axios.get(`${API.history}?${params}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      setRecords(r.data.data || []);
      setTotalPages(r.data.pagination?.pages || 1);
      setTotal(r.data.pagination?.total || 0);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load upload history.");
    } finally {
      setLoading(false);
    }
  }, [token, search, from, to]);

  useEffect(() => { load(1); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this upload record? (Transactions will NOT be deleted.)")) return;
    setDeleting(id);
    try {
      await axios.delete(`${API.history}/${id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      load(page);
    } catch (e) {
      alert(e.response?.data?.error || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  // Aggregate stats from current page
  const stats = useMemo(() => ({
    total,
    imported: records.reduce((s, r) => s + (r.transactionsImported || 0), 0),
    skipped:  records.reduce((s, r) => s + (r.duplicateTransactionsSkipped || 0), 0),
    banks:    [...new Set(records.map(r => r.bankName).filter(Boolean))].length,
  }), [records, total]);

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }} className="anim-fadeup">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>
            Upload History
          </h1>
          <p style={{ color: "#a0a3b1", fontSize: 14, marginTop: 6 }}>
            Track every PDF statement upload and its imported transactions
          </p>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 10,
          background: "rgba(167,139,250,0.1)",
          border: "1px solid rgba(167,139,250,0.25)",
        }}>
          <span style={{ fontSize: 14 }}>📋</span>
          <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>{total} upload{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatTile icon="📤" label="Total Uploads"       value={total}           color="#a78bfa" />
        <StatTile icon="✅" label="Transactions Imported" value={stats.imported}  color="#4ade80" />
        <StatTile icon="⊘"  label="Duplicates Skipped"   value={stats.skipped}   color="#fb923c" />
        <StatTile icon="🏦" label="Banks Detected"        value={stats.banks}     color="#60a5fa" />
      </div>

      {/* Search + Filters */}
      <div className="fk-card" style={{ marginBottom: 18 }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label className="fk-label">Search</label>
              <input className="fk-input" placeholder="Bank name or file name…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="fk-label">From</label>
              <input className="fk-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="fk-label">To</label>
              <input className="fk-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="fk-btn fk-btn-primary" style={{ padding: "12px 20px" }}>
                🔍 Search
              </button>
              <button type="button" className="fk-btn fk-btn-ghost"
                onClick={() => { setSearch(""); setFrom(""); setTo(""); setTimeout(() => load(1), 0); }}
                style={{ padding: "12px 16px" }}>
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && <div className="fk-alert fk-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: 64, borderRadius: 16,
              background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
              backgroundSize: "200% 100%",
              animation: `fk-shimmer 1.5s infinite ${i * 0.1}s`,
            }} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="fk-card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, color: "#fff", marginBottom: 8 }}>
            No uploads yet
          </h3>
          <p style={{ fontSize: 14, color: "#5c5f72" }}>
            Upload a PDF bank statement from the Dashboard to see history here.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="fk-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 130px 110px 110px 130px",
              padding: "12px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "#0a0b13",
            }}>
              {["File / Bank", "Parsed", "Imported", "Skipped", "Uploaded", "Actions"].map(h => (
                <div key={h} style={{ fontSize: 11, color: "#3a3d52", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
              ))}
            </div>

            {/* Table rows */}
            {records.map((rec, i) => {
              const meta = getBankMeta(rec.bankName);
              const successRate = rec.totalParsed > 0
                ? Math.round((rec.transactionsImported / rec.totalParsed) * 100)
                : 100;

              return (
                <div key={rec._id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 130px 110px 110px 130px",
                    padding: "16px 22px",
                    borderBottom: i < records.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    transition: "background 0.16s",
                    alignItems: "center",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* File / Bank */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                      background: meta.bg,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
                    }}>{meta.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                        {rec.fileName}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
                          background: meta.bg, color: meta.color,
                          border: `1px solid ${meta.color}33`,
                        }}>{rec.bankName}</span>
                        <span style={{ fontSize: 11, color: "#3a3d52" }}>
                          {successRate}% success
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parsed */}
                  <div style={{ fontSize: 14, color: "#a0a3b1", fontWeight: 500 }}>
                    {rec.totalParsed ?? "—"}
                  </div>

                  {/* Imported */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 15,
                      color: rec.transactionsImported > 0 ? "#4ade80" : "#3a3d52",
                    }}>{rec.transactionsImported}</span>
                    {rec.transactionsImported > 0 && (
                      <span style={{ fontSize: 11, color: "#4ade80" }}>txns</span>
                    )}
                  </div>

                  {/* Skipped */}
                  <div>
                    <span style={{
                      fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 14,
                      color: rec.duplicateTransactionsSkipped > 0 ? "#fb923c" : "#3a3d52",
                    }}>{rec.duplicateTransactionsSkipped}</span>
                    {rec.duplicateTransactionsSkipped > 0 && (
                      <span style={{ fontSize: 11, color: "#fb923c", marginLeft: 4 }}>dup</span>
                    )}
                  </div>

                  {/* Uploaded at */}
                  <div style={{ fontSize: 12, color: "#5c5f72", lineHeight: 1.4 }}>
                    {fmt(rec.uploadedAt)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="fk-btn"
                      onClick={() => setDrawer(rec)}
                      style={{
                        padding: "6px 12px", fontSize: 12, borderRadius: 9,
                        background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)",
                        color: "#60a5fa",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(96,165,250,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(96,165,250,0.1)"}
                    >
                      View
                    </button>
                    <button
                      className="fk-btn fk-btn-danger"
                      onClick={() => handleDelete(rec._id)}
                      disabled={deleting === rec._id}
                      style={{ padding: "6px 10px", fontSize: 12, borderRadius: 9, opacity: deleting === rec._id ? 0.5 : 1 }}
                    >
                      {deleting === rec._id ? "…" : "✕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 18 }}>
              <button className="fk-btn fk-btn-ghost" onClick={() => load(page - 1)} disabled={page === 1}
                style={{ padding: "8px 14px", fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => load(n)} className="fk-btn"
                  style={{
                    width: 38, height: 38, padding: 0, fontSize: 13, borderRadius: 9,
                    background: n === page ? "#ff4d6d" : "#10111c",
                    color: n === page ? "#fff" : "#a0a3b1",
                    border: n === page ? "1px solid transparent" : "1px solid rgba(255,255,255,0.08)",
                  }}>{n}</button>
              ))}
              {totalPages > 7 && (
                <span style={{ color: "#3a3d52", fontSize: 13, alignSelf: "center" }}>…{totalPages}</span>
              )}
              <button className="fk-btn fk-btn-ghost" onClick={() => load(page + 1)} disabled={page === totalPages}
                style={{ padding: "8px 14px", fontSize: 13, opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Transaction Drawer */}
      <TransactionDrawer record={drawer} onClose={() => setDrawer(null)} token={token} />
    </div>
  );
}
