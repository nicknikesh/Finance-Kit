import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/recurring";

const fmt = n => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Status config ─────────────────────────────────────────────────────────────
function getStatus(p) {
  if (p.overdue)  return { label: "Overdue",  color: "#ff4d6d", bg: "rgba(255,77,109,0.12)",  border: "rgba(255,77,109,0.3)"  };
  if (p.dueSoon)  return { label: "Due Soon", color: "#fb923c", bg: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.3)"  };
  if (p.isActive) return { label: "Active",   color: "#4ade80", bg: "rgba(74,222,128,0.1)",   border: "rgba(74,222,128,0.25)" };
  return           { label: "Inactive", color: "#5c5f72", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
}

// ── Countdown badge ───────────────────────────────────────────────────────────
function CountdownBadge({ daysUntil, overdue, dueSoon }) {
  if (overdue)         return <span style={{ fontSize:11,padding:"2px 8px",borderRadius:99,background:"rgba(255,77,109,0.15)",color:"#ff8a80",border:"1px solid rgba(255,77,109,0.3)",fontWeight:700 }}>⚠ {Math.abs(daysUntil)}d overdue</span>;
  if (dueSoon)         return <span style={{ fontSize:11,padding:"2px 8px",borderRadius:99,background:"rgba(251,146,60,0.15)",color:"#fb923c",border:"1px solid rgba(251,146,60,0.3)",fontWeight:700 }}>🔔 Due in {daysUntil}d</span>;
  if (daysUntil <= 30) return <span style={{ fontSize:11,padding:"2px 8px",borderRadius:99,background:"rgba(96,165,250,0.1)",color:"#60a5fa",border:"1px solid rgba(96,165,250,0.2)",fontWeight:600 }}>{daysUntil}d away</span>;
  return <span style={{ fontSize:11,color:"#3a3d52" }}>{daysUntil}d away</span>;
}

// ── Single recurring card ─────────────────────────────────────────────────────
function RecurringCard({ p, onDismiss, idx }) {
  const [dismissing, setDismissing] = useState(false);
  const [visible,    setVisible]    = useState(false);
  const st = getStatus(p);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), idx * 70);
    return () => clearTimeout(t);
  }, [idx]);

  const handleDismiss = async () => {
    setDismissing(true);
    await onDismiss(p._id);
  };

  return (
    <div style={{
      padding: "16px 18px",
      borderRadius: 16,
      background: p.overdue ? "rgba(255,77,109,0.04)" : p.dueSoon ? "rgba(251,146,60,0.03)" : "#10111c",
      border: `1px solid ${st.border}`,
      display: "flex", alignItems: "flex-start", gap: 14,
      transition: "opacity 0.35s ease, transform 0.35s ease, border-color 0.2s",
      opacity: visible && !dismissing ? 1 : 0,
      transform: visible && !dismissing ? "translateY(0)" : "translateY(10px)",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = p.overdue ? "rgba(255,77,109,0.5)" : p.dueSoon ? "rgba(251,146,60,0.45)" : "rgba(255,255,255,0.12)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = st.border}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, background: st.bg, border: `1px solid ${st.border}`,
      }}>{p.icon}</div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.merchantName}</span>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }}>{st.label}</span>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "#5c5f72", border: "1px solid rgba(255,255,255,0.08)" }}>{p.intervalLabel}</span>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "#5c5f72", border: "1px solid rgba(255,255,255,0.08)" }}>{p.category}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: p.overdue ? "#ff8a80" : "#fff" }}>
            {fmt(p.amount)}
          </span>
          <CountdownBadge daysUntil={p.daysUntil} overdue={p.overdue} dueSoon={p.dueSoon} />
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#3a3d52" }}>Last: {fmtDate(p.lastCharged)}</span>
          <span style={{ fontSize: 11, color: "#3a3d52" }}>Next: {fmtDate(p.nextExpected)}</span>
          <span style={{ fontSize: 11, color: "#3a3d52" }}>{p.occurrences} occurrence{p.occurrences !== 1 ? "s" : ""} detected</span>
        </div>
      </div>

      {/* Amount + dismiss */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        <button onClick={handleDismiss} disabled={dismissing} title="Dismiss"
          style={{
            width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "#3a3d52", fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s", opacity: dismissing ? 0.4 : 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3a3d52"; }}
        >
          {dismissing ? (
            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.3)", borderTop: "1.5px solid #fff", animation: "fk-spin 0.7s linear infinite" }} />
          ) : "×"}
        </button>
      </div>
    </div>
  );
}

// ── Summary tile ──────────────────────────────────────────────────────────────
function SumTile({ icon, label, value, color = "#fff", sub }) {
  return (
    <div style={{ flex: 1, minWidth: 130, padding: "16px 18px", borderRadius: 16, background: "#10111c", border: "1px solid rgba(255,255,255,0.07)", transition: "all 0.18s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#3a3d52", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#3a3d52", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecurringPayments({ compact = false, refreshTrigger }) {
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [detecting,  setDetecting]  = useState(false);
  const [error,      setError]      = useState("");
  const [monthlyTotal, setMonthly]  = useState(0);
  const token = localStorage.getItem("token");

  const load = useCallback(async (forceRefresh = false) => {
    forceRefresh ? setDetecting(true) : setLoading(true);
    setError("");
    try {
      const url = forceRefresh ? `${API}?refresh=true` : API;
      const r = await axios.get(url, { headers: { authorization: `Bearer ${token}` } });
      setPayments(r.data.data || []);
      setMonthly(r.data.monthlyTotal || 0);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to load recurring payments.");
    } finally {
      setLoading(false);
      setDetecting(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Re-detect when uploads happen
  useEffect(() => {
    if (refreshTrigger) load(true);
  }, [refreshTrigger, load]);

  const handleDismiss = async (id) => {
    try {
      await axios.patch(`${API}/${id}/dismiss`, {}, { headers: { authorization: `Bearer ${token}` } });
      setTimeout(() => setPayments(prev => prev.filter(p => p._id !== id)), 350);
    } catch { /* silent */ }
  };

  const overdue   = payments.filter(p => p.overdue);
  const dueSoon   = payments.filter(p => !p.overdue && p.dueSoon);
  const rest      = payments.filter(p => !p.overdue && !p.dueSoon);
  const displayed = compact ? payments.slice(0, 4) : payments;

  if (compact) {
    // ── Compact dashboard widget ────────────────────────────────────────────
    if (!loading && payments.length === 0) return null;
    return (
      <div className="fk-card" style={{ animation: "fk-fadein 0.4s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>
            🔄 Recurring Payments
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {overdue.length > 0 && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(255,77,109,0.15)", color: "#ff8a80", border: "1px solid rgba(255,77,109,0.3)", fontWeight: 700 }}>
                {overdue.length} overdue
              </span>
            )}
            {dueSoon.length > 0 && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(251,146,60,0.15)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)", fontWeight: 700 }}>
                {dueSoon.length} due soon
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 56, borderRadius: 12, background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)", backgroundSize: "200% 100%", animation: `fk-shimmer 1.5s infinite ${i*0.1}s` }} />)}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              {displayed.map((p, i) => (
                <div key={p._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: p.overdue ? "rgba(255,77,109,0.05)" : p.dueSoon ? "rgba(251,146,60,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${p.overdue ? "rgba(255,77,109,0.2)" : p.dueSoon ? "rgba(251,146,60,0.18)" : "rgba(255,255,255,0.06)"}`, animation: `fk-fadein 0.3s ease ${i*0.05}s both` }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{p.merchantName}</div>
                    <div style={{ fontSize: 11, color: "#3a3d52", marginTop: 1 }}>Next: {fmtDate(p.nextExpected)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: p.overdue ? "#ff8a80" : "#fff" }}>{fmt(p.amount)}</div>
                    <CountdownBadge daysUntil={p.daysUntil} overdue={p.overdue} dueSoon={p.dueSoon} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#5c5f72" }}>Monthly total: <strong style={{ color: "#a78bfa" }}>{fmt(monthlyTotal)}</strong></span>
              {payments.length > 4 && <span style={{ fontSize: 12, color: "#3a3d52" }}>+{payments.length - 4} more on Recurring page</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Full page layout ────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }} className="anim-fadeup">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>Recurring Payments</h1>
          <p style={{ color: "#a0a3b1", fontSize: 14, marginTop: 6 }}>Auto-detected subscriptions and fixed expenses</p>
        </div>
        <button onClick={() => load(true)} disabled={detecting}
          className="fk-btn fk-btn-primary" style={{ padding: "10px 18px", fontSize: 13 }}>
          {detecting ? <><div className="fk-spinner" style={{ marginRight: 8 }} />Detecting…</> : "🔍 Re-scan Transactions"}
        </button>
      </div>

      {error && <div className="fk-alert fk-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Summary tiles */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <SumTile icon="🔄" label="Detected"       value={payments.length}          color="#a78bfa" />
        <SumTile icon="💸" label="Monthly Cost"   value={fmt(monthlyTotal)}        color="#ff8a80" sub="active monthly plans" />
        <SumTile icon="⚠️" label="Overdue"        value={overdue.length}           color={overdue.length > 0 ? "#ff8a80" : "#4ade80"} />
        <SumTile icon="🔔" label="Due This Week"  value={dueSoon.length}           color={dueSoon.length > 0 ? "#fb923c" : "#4ade80"} />
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 88, borderRadius: 16, background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)", backgroundSize: "200% 100%", animation: `fk-shimmer 1.5s infinite ${i*0.1}s` }} />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="fk-card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, color: "#fff", marginBottom: 8 }}>No recurring payments detected</h3>
          <p style={{ fontSize: 14, color: "#5c5f72", marginBottom: 20 }}>Upload more bank statements so we can detect subscription patterns.</p>
          <button onClick={() => load(true)} className="fk-btn fk-btn-primary" style={{ padding: "10px 20px" }}>🔍 Run Detection</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {/* Overdue section */}
          {overdue.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ff8a80", textTransform: "uppercase", letterSpacing: "0.07em", padding: "4px 0" }}>⚠ Overdue</div>
              {overdue.map((p, i) => <RecurringCard key={p._id} p={p} onDismiss={handleDismiss} idx={i} />)}
            </>
          )}
          {/* Due soon section */}
          {dueSoon.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 0 4px" }}>🔔 Due This Week</div>
              {dueSoon.map((p, i) => <RecurringCard key={p._id} p={p} onDismiss={handleDismiss} idx={overdue.length + i} />)}
            </>
          )}
          {/* Upcoming */}
          {rest.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#5c5f72", textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 0 4px" }}>📅 Upcoming</div>
              {rest.map((p, i) => <RecurringCard key={p._id} p={p} onDismiss={handleDismiss} idx={overdue.length + dueSoon.length + i} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
