import { useState } from "react";
import axios from "axios";
import { generateFinanceReport } from "../utils/generateFinanceReport";
import { API } from "../utils/api";

/**
 * DownloadReportButton
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained button that:
 * 1. Fetches AI report + budget data from the API
 * 2. Captures chart DOM elements as screenshots
 * 3. Calls generateFinanceReport() → triggers browser PDF download
 *
 * Props:
 *   txs           — transactions array (already loaded in Dashboard)
 *   chartIds      — array of DOM element IDs of chart containers to screenshot
 */
export default function DownloadReportButton({ txs = [], chartIds = [], compact = false }) {
  const [loading, setLoading] = useState(false);
  const [stage,   setStage]   = useState("");
  const [error,   setError]   = useState("");
  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "User";

  const handleDownload = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch AI report
      setStage("Fetching AI insights…");
      let aiReport = null;
      try {
        const rr = await axios.get(API.report, {
          headers: { authorization: `Bearer ${token}` },
        });
        aiReport = rr.data;
      } catch { /* fallback: no AI report */ }

      // 2. Fetch budget data
      setStage("Fetching budget data…");
      let budgetData = null;
      try {
        const now   = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const br = await axios.get(`${API.budget}?month=${month}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        budgetData = br.data;
      } catch { /* fallback: no budget */ }

      // 3. Generate PDF
      setStage("Generating PDF…");
      await generateFinanceReport({
        username,
        txs,
        aiReport,
        budgetData,
        chartElementIds: chartIds,
      });

      setStage("Done!");
      setTimeout(() => setStage(""), 2000);
    } catch (e) {
      console.error("[PDF] Error:", e);
      setError("PDF generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Compact mode: matches QuickBtn style in Quick Actions bar ──────────────
  if (compact) {
    return (
      <button onClick={handleDownload} disabled={loading}
        style={{
          flex:1, minWidth:120, display:"flex", alignItems:"center", justifyContent:"center",
          gap:8, padding:"12px 16px", borderRadius:14,
          background:"linear-gradient(135deg,rgba(255,77,109,0.14),rgba(255,77,109,0.08))",
          border:"1px solid rgba(255,77,109,0.35)",
          color:"#ff8a80", fontSize:13, fontWeight:700,
          fontFamily:"'Inter',sans-serif", cursor: loading?"not-allowed":"pointer",
          transition:"all 0.2s ease", opacity: loading ? 0.7 : 1, whiteSpace:"nowrap",
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.background="linear-gradient(135deg,rgba(255,77,109,0.28),rgba(255,77,109,0.14))"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(255,77,109,0.2)"; }}}
        onMouseLeave={e => { e.currentTarget.style.background="linear-gradient(135deg,rgba(255,77,109,0.14),rgba(255,77,109,0.08))"; e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
      >
        {loading ? (
          <><div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,77,109,0.3)",borderTop:"2px solid #ff8a80",animation:"fk-spin 0.7s linear infinite",flexShrink:0 }}/>{stage||"Generating…"}</>
        ) : (
          <><span style={{ fontSize:18 }}>📄</span><span>Export PDF</span></>
        )}
      </button>
    );
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        id="download-report-btn"
        onClick={handleDownload}
        disabled={loading}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            8,
          padding:        "10px 20px",
          borderRadius:   12,
          border:         "1px solid rgba(167,139,250,0.35)",
          background:     loading
            ? "rgba(167,139,250,0.08)"
            : "linear-gradient(135deg,rgba(167,139,250,0.18),rgba(255,77,109,0.12))",
          color:          "#a78bfa",
          fontSize:       13,
          fontWeight:     700,
          fontFamily:     "'Inter',system-ui,sans-serif",
          cursor:         loading ? "not-allowed" : "pointer",
          transition:     "all 0.2s ease",
          boxShadow:      loading ? "none" : "0 4px 16px rgba(167,139,250,0.15)",
          opacity:        loading ? 0.8 : 1,
          whiteSpace:     "nowrap",
        }}
        onMouseEnter={e => {
          if (!loading) {
            e.currentTarget.style.background     = "linear-gradient(135deg,rgba(167,139,250,0.28),rgba(255,77,109,0.2))";
            e.currentTarget.style.borderColor    = "rgba(167,139,250,0.6)";
            e.currentTarget.style.boxShadow      = "0 6px 24px rgba(167,139,250,0.25)";
            e.currentTarget.style.transform      = "translateY(-1px)";
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background    = "linear-gradient(135deg,rgba(167,139,250,0.18),rgba(255,77,109,0.12))";
          e.currentTarget.style.borderColor   = "rgba(167,139,250,0.35)";
          e.currentTarget.style.boxShadow     = "0 4px 16px rgba(167,139,250,0.15)";
          e.currentTarget.style.transform     = "none";
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(167,139,250,0.3)",
              borderTop: "2px solid #a78bfa",
              animation: "fk-spin 0.7s linear infinite",
              flexShrink: 0,
            }} />
            {stage || "Generating…"}
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3M6 9l6 6 6-6M3 21h18"/>
            </svg>
            Download AI Report
          </>
        )}
      </button>

      {error && (
        <span style={{ fontSize: 11, color: "#ff8a80", animation: "fk-fadein 0.2s ease" }}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
