import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API } from "../utils/api";

// ── Alert type config ─────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  danger:  {
    border:     "rgba(255,77,109,0.35)",
    bg:         "rgba(255,77,109,0.06)",
    glow:       "rgba(255,77,109,0.15)",
    pill:       "rgba(255,77,109,0.15)",
    pillText:   "#ff8a80",
    pillBorder: "rgba(255,77,109,0.3)",
    label:      "Danger",
    dot:        "#ff4d6d",
  },
  warning: {
    border:     "rgba(251,146,60,0.35)",
    bg:         "rgba(251,146,60,0.06)",
    glow:       "rgba(251,146,60,0.12)",
    pill:       "rgba(251,146,60,0.15)",
    pillText:   "#fb923c",
    pillBorder: "rgba(251,146,60,0.3)",
    label:      "Warning",
    dot:        "#fb923c",
  },
  good: {
    border:     "rgba(74,222,128,0.3)",
    bg:         "rgba(74,222,128,0.05)",
    glow:       "rgba(74,222,128,0.08)",
    pill:       "rgba(74,222,128,0.12)",
    pillText:   "#4ade80",
    pillBorder: "rgba(74,222,128,0.25)",
    label:      "Good",
    dot:        "#4ade80",
  },
};

// ── Single alert card ─────────────────────────────────────────────────────────
function AlertCard({ alert, onDismiss, idx }) {
  const [dismissing, setDismissing] = useState(false);
  const [visible,    setVisible]    = useState(false);
  const cfg = TYPE_CONFIG[alert.type] || TYPE_CONFIG.warning;

  // Stagger entrance animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), idx * 80);
    return () => clearTimeout(t);
  }, [idx]);

  const handleDismiss = async () => {
    setDismissing(true);
    await onDismiss(alert._id);
  };

  return (
    <div style={{
      position:   "relative",
      padding:    "14px 16px",
      borderRadius: 14,
      background: cfg.bg,
      border:     `1px solid ${cfg.border}`,
      boxShadow:  `0 4px 20px ${cfg.glow}`,
      display:    "flex",
      alignItems: "flex-start",
      gap:        12,
      transition: "opacity 0.35s ease, transform 0.35s ease",
      opacity:    visible && !dismissing ? 1 : 0,
      transform:  visible && !dismissing ? "translateY(0)" : "translateY(8px)",
      overflow:   "hidden",
    }}>
      {/* Animated left accent bar */}
      <div style={{
        position:     "absolute",
        left:         0, top: 0, bottom: 0,
        width:        3,
        background:   cfg.dot,
        borderRadius: "14px 0 0 14px",
        boxShadow:    `0 0 8px ${cfg.dot}`,
      }} />

      {/* Icon */}
      <div style={{
        fontSize:   20,
        flexShrink: 0,
        marginLeft: 6,
        filter:     "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
      }}>{alert.icon}</div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
            {alert.title}
          </span>
          {/* Type pill */}
          <span style={{
            fontSize:   10,
            fontWeight: 700,
            padding:    "2px 7px",
            borderRadius: 99,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            background: cfg.pill,
            color:      cfg.pillText,
            border:     `1px solid ${cfg.pillBorder}`,
            flexShrink: 0,
          }}>{cfg.label}</span>
          {/* Category pill */}
          {alert.category && (
            <span style={{
              fontSize:   10,
              padding:    "2px 7px",
              borderRadius: 99,
              background: "rgba(255,255,255,0.07)",
              color:      "#6b6e85",
              border:     "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}>{alert.category}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
          {alert.message}
        </p>
        {/* Change % badge */}
        {alert.changePct !== null && alert.changePct !== undefined && (
          <div style={{ marginTop: 8 }}>
            <span style={{
              fontSize:   12,
              fontWeight: 700,
              padding:    "3px 9px",
              borderRadius: 99,
              background: alert.changePct > 0 ? "rgba(255,77,109,0.12)" : "rgba(74,222,128,0.12)",
              color:      alert.changePct > 0 ? "#ff8a80" : "#4ade80",
              border:     `1px solid ${alert.changePct > 0 ? "rgba(255,77,109,0.25)" : "rgba(74,222,128,0.25)"}`,
            }}>
              {alert.changePct > 0 ? "▲" : "▼"} {Math.abs(alert.changePct).toFixed(1)}% vs last month
            </span>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        title="Dismiss alert"
        style={{
          flexShrink: 0,
          width:      26, height: 26,
          borderRadius: 7,
          border:     "1px solid rgba(255,255,255,0.1)",
          background: "transparent",
          color:      "#3a3d52",
          fontSize:   14,
          cursor:     "pointer",
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s",
          opacity:    dismissing ? 0.4 : 1,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color      = "#fff";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color      = "#3a3d52";
        }}
      >
        {dismissing ? (
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderTop: "1.5px solid #fff",
            animation: "fk-spin 0.7s linear infinite",
          }} />
        ) : "×"}
      </button>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function AlertSkeleton() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 72, borderRadius: 14,
          background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: `fk-shimmer 1.5s infinite ${i * 0.12}s`,
        }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * SpendingAlerts
 * Props:
 *   refreshTrigger — increment to force re-fetch after uploads
 */
export default function SpendingAlerts({ refreshTrigger }) {
  const [alerts,     setAlerts]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [collapsed,  setCollapsed]  = useState(false);
  const [lastRefresh,setLastRefresh]= useState(null);
  const prevTrigger = useRef(null);
  const token = localStorage.getItem("token");

  const fetchAlerts = useCallback(async (forceRegen = false) => {
    setLoading(true);
    setError("");
    try {
      const url = forceRegen
        ? API.alerts
        : `${API.alerts}?regen=false`;
      const r = await axios.get(url, {
        headers: { authorization: `Bearer ${token}` },
      });
      setAlerts(r.data.alerts || []);
      setLastRefresh(new Date());
    } catch (e) {
      if (e.code === "ERR_NETWORK" || !e.response) {
        // Server not reachable — don't show as error, just empty
        setAlerts([]);
      } else {
        setError(e.response?.data?.error || "Could not load alerts.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load on mount (no regen — serve cached or compute fresh)
  useEffect(() => { fetchAlerts(true); }, [fetchAlerts]);

  // Refresh when upload completes
  useEffect(() => {
    if (prevTrigger.current !== null && refreshTrigger !== prevTrigger.current) {
      fetchAlerts(true);
    }
    prevTrigger.current = refreshTrigger;
  }, [refreshTrigger, fetchAlerts]);

  const handleDismiss = async (id) => {
    try {
      await axios.patch(`${API.alerts}/${id}/dismiss`, {}, {
        headers: { authorization: `Bearer ${token}` },
      });
      // Animate out then remove
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a._id !== id));
      }, 350);
    } catch (e) {
      console.error("Dismiss failed:", e.message);
    }
  };

  // Counts
  const dangerCount  = alerts.filter(a => a.type === "danger").length;
  const warnCount    = alerts.filter(a => a.type === "warning").length;
  const goodCount    = alerts.filter(a => a.type === "good").length;

  // Don't render the card at all if no alerts and not loading
  if (!loading && alerts.length === 0 && !error) {
    return (
      <div style={{
        padding: "14px 18px",
        borderRadius: 16,
        background: "rgba(74,222,128,0.05)",
        border: "1px solid rgba(74,222,128,0.15)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        animation: "fk-fadein 0.4s ease both",
      }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>All clear!</div>
          <div style={{ fontSize: 12, color: "#3a3d52", marginTop: 2 }}>No spending alerts this month.</div>
        </div>
        <button onClick={() => fetchAlerts(true)} title="Refresh"
          style={{
            marginLeft: "auto", background: "transparent",
            border: "1px solid rgba(74,222,128,0.2)",
            color: "#4ade80", borderRadius: 8, padding: "5px 10px",
            fontSize: 11, cursor: "pointer",
          }}>↻ Refresh</button>
      </div>
    );
  }

  return (
    <div style={{
      background: "#10111c",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20,
      overflow: "hidden",
      animation: "fk-fadein 0.4s ease both",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        userSelect: "none",
      }} onClick={() => setCollapsed(c => !c)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Animated warning icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: dangerCount > 0
              ? "linear-gradient(135deg, rgba(255,77,109,0.2), rgba(251,146,60,0.15))"
              : warnCount > 0
              ? "rgba(251,146,60,0.15)"
              : "rgba(74,222,128,0.12)",
            border: dangerCount > 0
              ? "1px solid rgba(255,77,109,0.3)"
              : warnCount > 0
              ? "1px solid rgba(251,146,60,0.3)"
              : "1px solid rgba(74,222,128,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {dangerCount > 0 ? "🚨" : warnCount > 0 ? "⚠️" : "✅"}
          </div>

          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>
              Spending Alerts
            </h2>
            {/* Summary badges */}
            <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
              {dangerCount > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 99,
                  background: "rgba(255,77,109,0.15)", color: "#ff8a80",
                  border: "1px solid rgba(255,77,109,0.25)", fontWeight: 700,
                }}>{dangerCount} danger</span>
              )}
              {warnCount > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 99,
                  background: "rgba(251,146,60,0.15)", color: "#fb923c",
                  border: "1px solid rgba(251,146,60,0.25)", fontWeight: 700,
                }}>{warnCount} warning</span>
              )}
              {goodCount > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 99,
                  background: "rgba(74,222,128,0.12)", color: "#4ade80",
                  border: "1px solid rgba(74,222,128,0.2)", fontWeight: 700,
                }}>{goodCount} good</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Manual refresh */}
          <button
            onClick={e => { e.stopPropagation(); fetchAlerts(true); }}
            disabled={loading}
            title="Refresh alerts"
            style={{
              padding: "5px 10px", borderRadius: 8, fontSize: 12,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#5c5f72", cursor: "pointer", transition: "all 0.18s",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#5c5f72"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            {loading ? (
              <div style={{ width: 11, height: 11, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.2)", borderTop: "1.5px solid #fff", animation: "fk-spin 0.7s linear infinite" }} />
            ) : "↻"}
          </button>
          {/* Collapse chevron */}
          <span style={{
            fontSize: 12, color: "#3a3d52",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.25s ease",
            display: "inline-block",
          }}>▼</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
          {error ? (
            <div className="fk-alert fk-alert-error" style={{ fontSize: 13 }}>{error}</div>
          ) : loading ? (
            <AlertSkeleton />
          ) : (
            alerts.map((alert, i) => (
              <AlertCard key={alert._id} alert={alert} onDismiss={handleDismiss} idx={i} />
            ))
          )}
          {/* Footer */}
          {!loading && !error && alerts.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
              {lastRefresh && (
                <span style={{ fontSize: 11, color: "#3a3d52" }}>
                  Updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <span style={{ fontSize: 11, color: "#3a3d52" }}>
                Tap × to dismiss
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
