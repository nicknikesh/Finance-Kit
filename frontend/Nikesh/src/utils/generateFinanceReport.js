/**
 * generateFinanceReport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Programmatic PDF generator for Finance Kit AI Financial Report.
 * Uses jsPDF for layout + html2canvas for chart snapshots.
 *
 * Called with:
 *   generateFinanceReport({ username, txs, aiReport, budgetData })
 *
 * Returns: Promise<void>  (triggers browser download)
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:        [10,  11,  21],   // #0a0b15
  card:      [16,  17,  28],   // #10111c
  accent:    [255, 77,  109],  // #ff4d6d
  purple:    [167, 139, 250],  // #a78bfa
  green:     [74,  222, 128],  // #4ade80
  red:       [255, 128, 128],  // #ff8080
  amber:     [251, 146, 60],   // #fb923c
  white:     [255, 255, 255],
  muted:     [160, 163, 177],  // #a0a3b1
  dim:       [92,  95,  114],  // #5c5f72
  border:    [30,  32,  50],
};

// ── Helper: draw rounded rect ─────────────────────────────────────────────────
function roundRect(doc, x, y, w, h, r = 6, fill) {
  doc.roundedRect(x, y, w, h, r, r, fill || "F");
}

// ── Helper: set color ─────────────────────────────────────────────────────────
function setFill(doc, rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setColor(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc, rgb)  { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

// ── Helper: format currency ───────────────────────────────────────────────────
function fmt(n) {
  return "Rs " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Helper: render a DOM node to an image data URL ────────────────────────────
async function captureElement(el) {
  if (!el) return null;
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: "#10111c",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

// ── Category color map ────────────────────────────────────────────────────────
const CAT_COLORS = {
  Food:          [245,158,11],
  Travel:        [96,165,250],
  Shopping:      [167,139,250],
  Bills:         [251,146,60],
  Salary:        [74,222,128],
  Entertainment: [244,114,182],
  Health:        [52,211,153],
  Others:        [148,163,184],
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export async function generateFinanceReport({
  username = "User",
  txs = [],
  aiReport = null,
  budgetData = null,
  chartElementIds = [],   // array of DOM element IDs to capture as screenshots
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210; // page width mm
  const PH = 297; // page height mm
  const M  = 14;  // margin
  const CW = PW - M * 2; // content width
  let y = 0;     // running cursor

  // Pre-capture charts
  const chartImages = [];
  for (const id of chartElementIds) {
    const el = document.getElementById(id);
    if (el) {
      const img = await captureElement(el);
      if (img) chartImages.push({ id, img });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 1 — Cover / Header
  // ─────────────────────────────────────────────────────────────────────────
  setFill(doc, C.bg);
  doc.rect(0, 0, PW, PH, "F");

  // Gradient-like accent bar at top
  setFill(doc, C.accent);
  doc.rect(0, 0, PW, 2, "F");

  // Purple secondary bar
  setFill(doc, C.purple);
  doc.rect(0, 2, PW, 0.5, "F");

  y = 28;

  // Logo / Branding row
  setFill(doc, [30, 20, 60]);
  roundRect(doc, M, y - 8, 50, 12, 4);
  setColor(doc, C.purple);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("⬡ Finance Kit AI", M + 4, y - 0.5);

  // Report title
  y = 55;
  setColor(doc, C.white);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("AI Financial Report", M, y);

  y += 10;
  setColor(doc, C.muted);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Comprehensive financial analysis powered by Gemini AI", M, y);

  // Divider
  y += 8;
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);

  // User info row
  y += 10;
  const reportDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  setColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Prepared for: ${username}`, M, y);

  setColor(doc, C.dim);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Report Date: ${reportDate}`, M, y + 7);
  doc.text(`Total Transactions Analyzed: ${txs.length}`, M, y + 14);

  // ── Overview stat boxes ───────────────────────────────────────────────────
  y += 28;

  const income  = txs.filter(t => t.type === "income" ).reduce((s,t) => s + Number(t.amount), 0);
  const expense = txs.filter(t => t.type === "expense").reduce((s,t) => s + Number(t.amount), 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0;

  const stats = [
    { label: "Total Income",   value: fmt(income),       color: C.green  },
    { label: "Total Expense",  value: fmt(expense),      color: C.red    },
    { label: "Net Balance",    value: fmt(balance),      color: balance >= 0 ? C.green : C.red },
    { label: "Savings Rate",   value: `${savingsRate.toFixed(1)}%`, color: C.purple },
  ];

  const bw = (CW - 6) / 4;
  stats.forEach((s, i) => {
    const bx = M + i * (bw + 2);
    setFill(doc, C.card);
    roundRect(doc, bx, y, bw, 26, 5);

    // Accent top bar
    setFill(doc, s.color);
    roundRect(doc, bx, y, bw, 1.5, 2);

    setColor(doc, C.dim);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(s.label, bx + 4, y + 8);

    setColor(doc, s.color);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(s.value, bw - 6);
    doc.text(lines[0], bx + 4, y + 18);
  });

  // ── Category breakdown ────────────────────────────────────────────────────
  y += 36;
  setColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Expense Breakdown by Category", M, y);

  y += 7;

  const catMap = {};
  txs.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // Bar chart
  const maxCat = catEntries[0]?.[1] || 1;
  const barH   = 8;
  const barGap = 3;

  catEntries.slice(0, 8).forEach(([cat, amt], i) => {
    const by  = y + i * (barH + barGap);
    const pct = amt / maxCat;
    const barW = (CW - 60) * pct;
    const cc   = CAT_COLORS[cat] || CAT_COLORS.Others;

    // Label
    setColor(doc, C.muted);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(cat, M, by + barH - 2);

    // Bar track
    setFill(doc, C.card);
    roundRect(doc, M + 28, by, CW - 60, barH, 2);

    // Bar fill
    setFill(doc, cc);
    if (barW > 1) roundRect(doc, M + 28, by, barW, barH, 2);

    // Amount
    setColor(doc, cc);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(amt), M + 28 + (CW - 58), by + barH - 2);
  });

  y += catEntries.slice(0, 8).length * (barH + barGap) + 10;

  // ── Monthly summary ───────────────────────────────────────────────────────
  const now = new Date();
  const thisMonthExp = txs.filter(t => t.type === "expense").filter(t => {
    const d = new Date(t.date || t.createdAt || now);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).reduce((s, t) => s + Number(t.amount), 0);

  const prevMonthExp = txs.filter(t => t.type === "expense").filter(t => {
    const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const d = new Date(t.date || t.createdAt || now);
    return d.getFullYear() === p.getFullYear() && d.getMonth() === p.getMonth();
  }).reduce((s, t) => s + Number(t.amount), 0);

  const momChange = prevMonthExp > 0
    ? ((thisMonthExp - prevMonthExp) / prevMonthExp * 100).toFixed(1)
    : 0;

  const currentMonthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  setColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly Summary", M, y);

  y += 7;
  const summaryItems = [
    { label: `This month (${currentMonthName})`, value: fmt(thisMonthExp),   color: C.red    },
    { label: "Previous month",                   value: fmt(prevMonthExp),   color: C.muted  },
    { label: "Month-over-month change",           value: `${momChange > 0 ? "+" : ""}${momChange}%`, color: Number(momChange) > 0 ? C.red : C.green },
    { label: "Top category",                      value: catEntries[0]?.[0] || "—", color: C.purple },
  ];

  const sw = (CW - 6) / 4;
  summaryItems.forEach((s, i) => {
    const sx = M + i * (sw + 2);
    setFill(doc, C.card);
    roundRect(doc, sx, y, sw, 22, 5);

    setColor(doc, C.dim);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const lbl = doc.splitTextToSize(s.label, sw - 5);
    doc.text(lbl, sx + 3, y + 7);

    setColor(doc, s.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(s.value, sx + 3, y + 18);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 2 — AI Insights + Charts
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();
  setFill(doc, C.bg);
  doc.rect(0, 0, PW, PH, "F");
  setFill(doc, C.accent);
  doc.rect(0, 0, PW, 2, "F");

  y = 20;

  // AI Insights section
  setColor(doc, C.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("AI Financial Insights", M, y);

  setColor(doc, C.dim);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Powered by Gemini AI", M, y + 6);

  y += 14;

  if (aiReport) {
    const insightFields = [
      { label: "Financial Score",        value: aiReport.score ? `${aiReport.score}/100` : null, color: C.purple },
      { label: "Savings Behaviour",      value: aiReport.savingsBehavior,    color: C.green  },
      { label: "Spending Pattern",       value: aiReport.spendingPattern,    color: C.amber  },
      { label: "Top Expense Category",   value: aiReport.topCategory,        color: C.red    },
    ].filter(f => f.value);

    // Score ring (text-based)
    if (aiReport.score) {
      setFill(doc, C.card);
      roundRect(doc, M, y, CW, 18, 6);
      const scoreColor = aiReport.score >= 70 ? C.green : aiReport.score >= 40 ? C.amber : C.red;
      setColor(doc, scoreColor);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`${aiReport.score}`, M + 8, y + 13);
      setColor(doc, C.dim);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("/100 Financial Health Score", M + 18, y + 13);

      // Progress bar
      const trackX = M + 58;
      const trackW = CW - 64;
      setFill(doc, C.border);
      roundRect(doc, trackX, y + 8, trackW, 5, 2);
      setFill(doc, scoreColor);
      roundRect(doc, trackX, y + 8, trackW * (aiReport.score / 100), 5, 2);
      y += 24;
    }

    // Insight bubbles
    insightFields.forEach(f => {
      if (!f.value) return;
      setFill(doc, C.card);
      const lines = doc.splitTextToSize(f.value, CW - 16);
      const bh = lines.length * 5 + 14;
      roundRect(doc, M, y, CW, bh, 5);

      // Left accent bar
      setFill(doc, f.color);
      roundRect(doc, M, y, 3, bh, 2);

      setColor(doc, f.color);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(f.label, M + 7, y + 7);

      setColor(doc, C.muted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(lines, M + 7, y + 13);

      y += bh + 4;
    });

    // Advice
    if (aiReport.advice) {
      const advLines = doc.splitTextToSize(aiReport.advice, CW - 16);
      const advH = advLines.length * 5 + 14;
      setFill(doc, [20, 15, 50]);
      roundRect(doc, M, y, CW, advH, 6);
      setFill(doc, C.purple);
      roundRect(doc, M, y, 3, advH, 2);
      setColor(doc, C.purple);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("💡 Personalized Advice", M + 7, y + 7);
      setColor(doc, C.muted);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(advLines, M + 7, y + 13);
      y += advH + 6;
    }
  } else {
    // Fallback: rule-based insights
    setFill(doc, C.card);
    roundRect(doc, M, y, CW, 24, 6);
    setColor(doc, C.muted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const fallback = [
      `• Total income: ${fmt(income)} | Total expenses: ${fmt(expense)}`,
      `• Net balance: ${fmt(balance)} | Savings rate: ${savingsRate.toFixed(1)}%`,
      `• Top spending category: ${catEntries[0]?.[0] || "None"} (${fmt(catEntries[0]?.[1] || 0)})`,
    ];
    doc.text(fallback, M + 5, y + 8);
    y += 30;
  }

  // ── Chart screenshots ─────────────────────────────────────────────────────
  if (chartImages.length > 0) {
    y += 4;
    if (y > 200) { doc.addPage(); setFill(doc, C.bg); doc.rect(0, 0, PW, PH, "F"); y = 20; }
    setColor(doc, C.white);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Charts", M, y);
    y += 8;

    for (const { img } of chartImages) {
      if (y + 80 > PH - 20) { doc.addPage(); setFill(doc, C.bg); doc.rect(0, 0, PW, PH, "F"); y = 20; }
      try {
        setFill(doc, C.card);
        roundRect(doc, M, y, CW, 72, 6);
        doc.addImage(img, "PNG", M + 2, y + 2, CW - 4, 68);
        y += 78;
      } catch { /* skip if image fails */ }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGE 3 — Budget & Savings Analysis
  // ─────────────────────────────────────────────────────────────────────────
  doc.addPage();
  setFill(doc, C.bg);
  doc.rect(0, 0, PW, PH, "F");
  setFill(doc, C.accent);
  doc.rect(0, 0, PW, 2, "F");

  y = 20;
  setColor(doc, C.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Savings Analysis", M, y);
  y += 12;

  // Savings breakdown
  const monthlyInc = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mnInc = txs.filter(t => {
      if (t.type !== "income") return false;
      const td = new Date(t.date || t.createdAt);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).reduce((s, t) => s + Number(t.amount), 0);
    const mnExp = txs.filter(t => {
      if (t.type !== "expense") return false;
      const td = new Date(t.date || t.createdAt);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).reduce((s, t) => s + Number(t.amount), 0);
    return {
      label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      inc: mnInc, exp: mnExp, saved: mnInc - mnExp,
      rate: mnInc > 0 ? ((mnInc - mnExp) / mnInc * 100).toFixed(1) : "0.0",
    };
  });

  // Table header
  setFill(doc, [25, 20, 50]);
  roundRect(doc, M, y, CW, 8, 3);
  setColor(doc, C.purple);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const cols = [0, 40, 80, 120, 155];
  const headers = ["Month", "Income", "Expense", "Saved", "Save Rate"];
  headers.forEach((h, i) => doc.text(h, M + 3 + cols[i], y + 5.5));
  y += 10;

  monthlyInc.forEach((row, i) => {
    setFill(doc, i % 2 === 0 ? C.card : C.bg);
    roundRect(doc, M, y, CW, 8, 2);
    setColor(doc, C.muted);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(row.label,         M + 3 + cols[0], y + 5.5);
    setColor(doc, C.green);
    doc.text(fmt(row.inc),      M + 3 + cols[1], y + 5.5);
    setColor(doc, C.red);
    doc.text(fmt(row.exp),      M + 3 + cols[2], y + 5.5);
    setColor(doc, row.saved >= 0 ? C.green : C.red);
    doc.text(fmt(row.saved),    M + 3 + cols[3], y + 5.5);
    doc.text(`${row.rate}%`,    M + 3 + cols[4], y + 5.5);
    y += 10;
  });

  // Budget data section (if available)
  if (budgetData && budgetData.totalBudget > 0) {
    y += 6;
    setColor(doc, C.white);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Budget vs Actual", M, y);
    y += 8;

    setFill(doc, C.card);
    roundRect(doc, M, y, CW, 22, 6);

    const budgW = CW - 16;
    const usedW = budgW * Math.min(budgetData.totalPct / 100, 1);
    const budgColor = budgetData.totalPct >= 100 ? C.red : budgetData.totalPct >= 80 ? C.amber : C.green;

    setColor(doc, C.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Budget: ${fmt(budgetData.totalBudget)}   Spent: ${fmt(budgetData.totalSpent)}   Remaining: ${fmt(budgetData.totalRemaining)}`, M + 6, y + 7);

    setFill(doc, C.border);
    roundRect(doc, M + 6, y + 11, budgW, 5, 2);
    setFill(doc, budgColor);
    if (usedW > 0) roundRect(doc, M + 6, y + 11, usedW, 5, 2);

    setColor(doc, budgColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${budgetData.totalPct.toFixed(1)}% used`, M + budgW - 20, y + 20);
    y += 30;
  }

  // ── Footer on all pages ───────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setFill(doc, C.bg);
    doc.rect(0, PH - 14, PW, 14, "F");
    setFill(doc, C.accent);
    doc.rect(0, PH - 14, PW, 0.4, "F");

    setColor(doc, C.dim);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Finance Kit — AI Financial Report", M, PH - 5);
    doc.text(`Page ${p} of ${pageCount}`, PW - M - 24, PH - 5);
    doc.text(`Confidential • ${reportDate}`, PW / 2 - 20, PH - 5);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const fileName = `FinanceKit_Report_${username.replace(/\s+/g, "_")}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
