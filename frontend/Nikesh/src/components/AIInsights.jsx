import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

// ── Score ring animation ────────────────────────────────────────────────────
function ScoreRing({ score, label }) {
  const radius  = 52;
  const stroke  = 7;
  const circ    = 2 * Math.PI * radius;
  const offset  = circ - (score / 100) * circ;

  const color =
    score >= 85 ? "#4ade80" :
    score >= 70 ? "#60a5fa" :
    score >= 50 ? "#f59e0b" :
    score >= 30 ? "#fb923c" : "#ff4d6d";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 124, height: 124 }}>
        <svg width="124" height="124" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx="62" cy="62" r={radius} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {/* Progress */}
          <circle cx="62" cy="62" r={radius} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "'Outfit',sans-serif", fontWeight: 800,
            fontSize: 28, color, lineHeight: 1,
          }}>{score}</span>
          <span style={{ fontSize: 10, color: "#5c5f72", marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color, fontFamily: "'Outfit',sans-serif",
        textAlign: "center", letterSpacing: "0.01em",
      }}>{label}</span>
    </div>
  );
}

// ── Section card ────────────────────────────────────────────────────────────
function Section({ icon, title, text, accentColor = "#a78bfa", delay = 0 }) {
  if (!text) return null;
  return (
    <div style={{
      display: "flex", gap: 12, padding: "13px 15px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      animation: `fk-fadein 0.4s ease ${delay}s both`,
      transition: "border-color 0.2s, background 0.2s",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${accentColor}44`;
        e.currentTarget.style.background  = `${accentColor}0a`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.background  = "rgba(255,255,255,0.025)";
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: `${accentColor}18`,
        border: `1px solid ${accentColor}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "#5c5f72", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {title}
        </div>
        <p style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.6, margin: 0 }}>{text}</p>
      </div>
    </div>
  );
}

// ── Insight bullet ──────────────────────────────────────────────────────────
const ICONS = ["💡", "📊", "⚠️", "🎯", "🌟", "💰", "📈", "🔥"];

function InsightItem({ text, idx }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 13px", borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
      animation: `fk-fadein 0.35s ease ${idx * 0.07}s both`,
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
    >
      <span style={{ fontSize: 16, flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(124,58,237,0.3))" }}>
        {ICONS[idx % ICONS.length]}
      </span>
      <p style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Category trend badge ────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  if (trend === null || trend === undefined) return null;
  const n = parseFloat(trend);
  const up = n > 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: up ? "rgba(255,77,109,0.12)" : "rgba(74,222,128,0.12)",
      color: up ? "#ff8a80" : "#4ade80",
      border: `1px solid ${up ? "rgba(255,77,109,0.25)" : "rgba(74,222,128,0.25)"}`,
    }}>
      {up ? "▲" : "▼"} {Math.abs(n).toFixed(1)}%
    </span>
  );
}

// ── Skeleton loader ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Score ring placeholder */}
      <div style={{
        height: 140, borderRadius: 16,
        background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "200% 100%",
        animation: "fk-shimmer 1.5s infinite",
      }} />
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          height: 62, borderRadius: 14,
          background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: `fk-shimmer 1.5s infinite ${i * 0.12}s`,
        }} />
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AIInsights({ refreshTrigger }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [showAll,    setShowAll]    = useState(false);
  const [generatedAt, setGenAt]     = useState(null);
  const [cached,     setCached]     = useState(false);
  const [tab,        setTab]        = useState("insights"); // "insights" | "categories"
  const token = localStorage.getItem("token");
  const prevTrigger = useRef(null);

  const fetchReport = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const url = `http://localhost:5000/api/report${force ? "?refresh=true" : ""}`;
      const r = await axios.get(url, { headers: { authorization: `Bearer ${token}` } });
      setData(r.data);
      setCached(r.data.cached || false);
      setGenAt(r.data.generatedAt ? new Date(r.data.generatedAt) : new Date());
    } catch (e) {
      const msg = e.response?.data?.error || "";
      if (msg.includes("429") || msg.includes("quota")) {
        setError("Gemini quota reached — showing rule-based insights.");
      } else if (e.code === "ERR_NETWORK" || !e.response) {
        setError("Cannot connect to server. Make sure the backend is running.");
      } else {
        setError("AI report unavailable. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load on mount
  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Refresh when new transactions are added (refreshTrigger changes)
  useEffect(() => {
    if (prevTrigger.current !== null && refreshTrigger !== prevTrigger.current) {
      fetchReport(true); // force refresh on new upload
    }
    prevTrigger.current = refreshTrigger;
  }, [refreshTrigger, fetchReport]);

  const report = data?.report;
  const source = data?.source || "gemini";
  const catAnalysis = report?.categoryAnalysis || [];

  return (
    <div style={{
      background: "linear-gradient(135deg, #13141f 0%, #0d0e17 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20,
      padding: "22px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -50, right: -50,
        width: 160, height: 160, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -40, left: -40,
        width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
          }}>✨</div>
          <div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>
              AI Monthly Report
            </h2>
            <p style={{ fontSize: 11, color: "#6b6e85", marginTop: 1 }}>
              Powered by Gemini · {data?.reportMonth || "Current Month"}
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button onClick={() => fetchReport(true)} disabled={loading}
          title="Regenerate report"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 10,
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.25)",
            color: "#a78bfa", fontSize: 12, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(124,58,237,0.22)"; }}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.12)"}
        >
          {loading ? (
            <div style={{
              width: 13, height: 13, borderRadius: "50%",
              border: "2px solid rgba(167,139,250,0.3)",
              borderTop: "2px solid #a78bfa",
              animation: "fk-spin 0.8s linear infinite",
            }} />
          ) : "↻"}
          {loading ? "Generating…" : "Refresh"}
        </button>
      </div>

      {/* Source badge + cache status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 20,
          background: source === "gemini"
            ? "linear-gradient(90deg, rgba(124,58,237,0.15), rgba(6,182,212,0.12))"
            : "linear-gradient(90deg, rgba(245,158,11,0.15), rgba(234,88,12,0.12))",
          border: source === "gemini"
            ? "1px solid rgba(124,58,237,0.2)"
            : "1px solid rgba(245,158,11,0.25)",
        }}>
          <span style={{ fontSize: 10 }}>{source === "gemini" ? "🤖" : "📐"}</span>
          <span style={{ fontSize: 11, color: source === "gemini" ? "#a78bfa" : "#fbbf24", fontWeight: 600 }}>
            {source === "gemini" ? "Gemini 2.0 Flash" : "Smart Rule-Based"}
          </span>
        </div>
        {cached && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.2)",
          }}>
            <span style={{ fontSize: 10 }}>⚡</span>
            <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>Cached</span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div style={{
          padding: "16px", borderRadius: 12,
          background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "#ff8a80", margin: "0 0 10px" }}>{error}</p>
          <button onClick={() => fetchReport(true)} style={{
            padding: "7px 16px", borderRadius: 8,
            background: "rgba(255,77,109,0.15)", border: "1px solid rgba(255,77,109,0.3)",
            color: "#ff8a80", fontSize: 12, cursor: "pointer",
          }}>Try Again</button>
        </div>
      ) : !report ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>📭</p>
          <p style={{ fontSize: 13, color: "#5c5f72" }}>Upload a bank statement to generate your AI report</p>
        </div>
      ) : (
        <>
          {/* Financial Score Ring */}
          {report.financialScore > 0 && (
            <div style={{
              display: "flex", justifyContent: "center",
              padding: "18px 0 22px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 18,
            }}>
              <ScoreRing score={report.financialScore} label={report.scoreLabel} />
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[
              { v: "insights",    l: "📋 Insights"   },
              { v: "categories",  l: "🏷️ Categories" },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setTab(v)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: v === tab ? "rgba(124,58,237,0.18)" : "transparent",
                  color:      v === tab ? "#a78bfa" : "#5c5f72",
                  border:     v === tab ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                {l}
              </button>
            ))}
          </div>

          {tab === "insights" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {/* Summary sections */}
              <Section icon="📊" title="Monthly Summary"    text={report.monthlySummary}    accentColor="#60a5fa" delay={0.05} />
              <Section icon="💰" title="Savings Behavior"   text={report.savingsBehavior}   accentColor="#4ade80" delay={0.1}  />
              <Section icon="⚠️" title="Spending Alert"     text={report.overspendingAlert} accentColor="#fb923c" delay={0.15} />
              <Section icon="🏆" title="Top Category"       text={report.topCategory}       accentColor="#f59e0b" delay={0.2}  />
              <Section icon="🎯" title="Personalized Tip"   text={report.personalizedTip}   accentColor="#a78bfa" delay={0.25} />

              {/* Insight bullets */}
              {report.insights?.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11, color: "#3a3d52", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginTop: 6, marginBottom: 2,
                  }}>Key Takeaways</div>
                  {(showAll ? report.insights : report.insights.slice(0, 3)).map((ins, i) => (
                    <InsightItem key={i} text={ins} idx={i} />
                  ))}
                  {report.insights.length > 3 && (
                    <button onClick={() => setShowAll(s => !s)}
                      style={{
                        padding: "8px", borderRadius: 10, fontSize: 12,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#5c5f72", cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.3)"; e.currentTarget.style.color = "#a78bfa"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#5c5f72"; }}
                    >
                      {showAll ? "▲ Show less" : `▼ Show ${report.insights.length - 3} more insights`}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Categories tab */
            <div style={{ display: "grid", gap: 10 }}>
              {catAnalysis.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#3a3d52", fontSize: 14 }}>
                  No expense category data
                </div>
              ) : catAnalysis.map(({ cat, amount, pct: catPct, trend }, i) => (
                <div key={cat} style={{ animation: `fk-fadein 0.3s ease ${i * 0.06}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: "#d0d3e8", fontWeight: 500 }}>{cat}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <TrendBadge trend={trend} />
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: "#fff",
                        fontFamily: "'Outfit',sans-serif",
                      }}>₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${catPct}%`,
                      background: "linear-gradient(90deg, rgba(124,58,237,0.7), #7c3aed)",
                      transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#3a3d52", marginTop: 3, textAlign: "right" }}>
                    {catPct}% of expenses
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          {generatedAt && !loading && (
            <p style={{ fontSize: 11, color: "#3a3d52", marginTop: 16, textAlign: "right" }}>
              {cached ? "⚡ Cached · " : "🤖 Generated · "}
              {generatedAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
