/**
 * aiReportService.js
 * ─────────────────────────────────────────────────────────────────
 * Generates a structured AI-powered monthly financial report using
 * the Gemini API. Results are cached in MongoDB (AIReport model).
 * Cache is invalidated when new transactions are detected (txHash).
 *
 * FALLBACK CHAIN:
 *   1. Serve MongoDB cache (if txHash matches)
 *   2. Call Gemini API → parse structured JSON
 *   3. On any Gemini failure → return rule-based report (never crashes)
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Transaction = require("../models/Transaction");
const AIReport    = require("../models/AIReport");

// ── Helpers ───────────────────────────────────────────────────────────────────
const sumAmt = (arr, type) =>
  arr.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

const fmtINR = n =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const pctChange = (current, prev) =>
  prev > 0 ? (((current - prev) / prev) * 100).toFixed(1) : null;

/** Cheap hash: count + latest _id — detects any new transaction */
function buildTxHash(txs) {
  if (!txs.length) return "empty";
  const latest = txs.reduce((a, b) =>
    new Date(a.date) > new Date(b.date) ? a : b
  );
  return `${txs.length}_${String(latest._id)}`;
}

// ── Financial Score (0-100) ───────────────────────────────────────────────────
function computeFinancialScore({ savingsRate, spendingChangePct, topCatPct, txCount }) {
  let score = 50;
  const sr = parseFloat(savingsRate) || 0;
  if      (sr >= 30) score += 30;
  else if (sr >= 20) score += 22;
  else if (sr >= 10) score += 14;
  else if (sr >= 0)  score += 6;
  else               score -= 10;

  const sc = parseFloat(spendingChangePct) || 0;
  if      (sc <= -20) score += 10;
  else if (sc <= 0)   score += 5;
  else if (sc <= 20)  score -= 5;
  else                score -= 10;

  const tc = parseFloat(topCatPct) || 100;
  if      (tc <= 30) score += 10;
  else if (tc <= 50) score += 5;
  else if (tc <= 70) score -= 5;
  else               score -= 10;

  if      (txCount >= 20) score += 10;
  else if (txCount >= 10) score += 5;
  else if (txCount >= 5)  score += 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(score) {
  if (score >= 85) return "Excellent 🌟";
  if (score >= 70) return "Good 👍";
  if (score >= 50) return "Fair ⚡";
  if (score >= 30) return "Needs Work ⚠️";
  return "Critical 🔴";
}

// ── Rule-based fallback (always works, never calls Gemini) ────────────────────
function buildRuleBasedReport(stats) {
  const {
    savingsRate, topCat, topCatAmt, topCatPct,
    thisExpense, lastExpense, totalIncome, totalExpense,
    balance, spendingChangePct, financialScore, scoreLbl, categoryAnalysis,
  } = stats;

  const spendChg = parseFloat(spendingChangePct) || 0;
  const trendMsg = spendingChangePct !== null
    ? spendChg > 0
      ? `⚠️ You spent ${Math.abs(spendChg).toFixed(1)}% more than last month (${fmtINR(thisExpense)} vs ${fmtINR(lastExpense)}).`
      : `✅ Spending decreased ${Math.abs(spendChg).toFixed(1)}% vs last month — great discipline!`
    : "📊 Not enough data to compare months yet.";

  const sr = parseFloat(savingsRate) || 0;
  const savingsMsg = sr >= 20
    ? `You are saving ${savingsRate}% of your income — excellent habit! Keep it up.`
    : sr >= 10
    ? `Your savings rate is ${savingsRate}%. Try to increase it to at least 20%.`
    : `Your savings rate is ${savingsRate}%. Focus on reducing expenses to save more.`;

  const topCatMsg = topCat && topCat !== "Others"
    ? `Your highest expense category is ${topCat} at ${fmtINR(topCatAmt)} (${topCatPct}% of total expenses).`
    : `Most of your expenses are uncategorized. Add descriptions to get better insights.`;

  const tip = totalIncome > 0
    ? `Try the 50/30/20 rule: 50% on needs, 30% on wants, 20% on savings. You are currently saving ${savingsRate}%.`
    : "Add income transactions to unlock full savings analysis and personalized tips.";

  return {
    financialScore,
    scoreLabel: scoreLbl,
    monthlySummary:    `This month you spent ${fmtINR(thisExpense)}. Net balance over the analyzed period: ${fmtINR(balance)}.`,
    savingsBehavior:   savingsMsg,
    overspendingAlert: trendMsg,
    topCategory:       topCatMsg,
    personalizedTip:   tip,
    insights: [
      `💰 Savings rate: ${savingsRate}% over the analyzed period.`,
      `🏆 Your highest expense category is ${topCat} at ${fmtINR(topCatAmt)}.`,
      trendMsg,
      `📊 Financial score: ${financialScore}/100 — ${scoreLbl}.`,
      tip,
    ],
    categoryAnalysis,
  };
}

// ── Detect if an error is a Gemini quota/rate-limit error ─────────────────────
function isQuotaError(err) {
  const msg = (err.message || "").toLowerCase();
  const status = err.status || err.statusCode || 0;
  return status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("rate");
}

// ── Gemini call with full logging ─────────────────────────────────────────────
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment.");

  console.log("[Gemini] Initialising SDK with key:", apiKey.substring(0, 8) + "...");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  console.log("[Gemini] Sending request to gemini-2.0-flash...");
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  console.log("[Gemini] Raw response (first 500 chars):", raw.substring(0, 500));

  // Strip markdown code fences if Gemini wraps in ```json ... ```
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return parsed;
}

// ── Main exported function ────────────────────────────────────────────────────
/**
 * generateMonthlyReport(userId, forceRefresh)
 *
 * Returns a structured report object.
 * NEVER throws — always returns something useful to the frontend.
 */
async function generateMonthlyReport(userId, forceRefresh = false) {
  const now          = new Date();
  const reportMonth  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ninetyDays   = new Date(now); ninetyDays.setDate(now.getDate() - 90);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLast  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLast    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // ── 1. Fetch transactions ──────────────────────────────────────────────────
  console.log(`[AIReport] Fetching transactions for user: ${userId}`);
  let txs = [];
  try {
    txs = await Transaction.find({ userId, date: { $gte: ninetyDays } }).sort({ date: -1 });
    console.log(`[AIReport] Found ${txs.length} transactions`);
  } catch (dbErr) {
    console.error("[AIReport] DB fetch error:", dbErr.message);
    throw dbErr; // let route handler return 500
  }

  // No transactions — return early with friendly message
  if (txs.length === 0) {
    console.log("[AIReport] No transactions found — returning empty report");
    return {
      cached: false,
      reportMonth,
      report: {
        financialScore: 0,
        scoreLabel: "No Data",
        monthlySummary:    "No transactions found. Upload a bank statement to get your AI financial report.",
        savingsBehavior:   "",
        overspendingAlert: "",
        topCategory:       "",
        personalizedTip:   "",
        insights: ["📤 Upload a bank statement to get your personalized AI financial report!"],
        categoryAnalysis:  [],
      },
      summary: {},
      source: "rule-based",
    };
  }

  // ── 2. Build hash & check cache ───────────────────────────────────────────
  const txHash = buildTxHash(txs);
  console.log(`[AIReport] txHash: ${txHash}, forceRefresh: ${forceRefresh}`);

  if (!forceRefresh) {
    try {
      const cached = await AIReport.findOne({ userId, reportMonth });
      if (cached && cached.txHash === txHash) {
        console.log("[AIReport] Cache HIT — serving cached report");
        return {
          cached: true,
          reportMonth,
          report:      cached.report,
          summary:     cached.summary,
          source:      cached.source,
          generatedAt: cached.generatedAt,
        };
      }
      console.log("[AIReport] Cache MISS — generating fresh report");
    } catch (cacheErr) {
      console.warn("[AIReport] Cache check failed (non-fatal):", cacheErr.message);
    }
  }

  // ── 3. Compute statistics ─────────────────────────────────────────────────
  const thisMonth  = txs.filter(t => new Date(t.date) >= startOfMonth);
  const lastMonth  = txs.filter(t => new Date(t.date) >= startOfLast && new Date(t.date) <= endOfLast);

  const totalIncome  = sumAmt(txs, "income");
  const totalExpense = sumAmt(txs, "expense");
  const thisExpense  = sumAmt(thisMonth, "expense");
  const lastExpense  = sumAmt(lastMonth, "expense");
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0
    ? ((balance / totalIncome) * 100).toFixed(1)
    : "0.0";
  const spendingChangePct = pctChange(thisExpense, lastExpense);

  // Category breakdown (expenses only)
  const catMap = {};
  txs.filter(t => t.type === "expense").forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const topCat     = sortedCats[0]?.[0] || "Others";
  const topCatAmt  = sortedCats[0]?.[1] || 0;
  const topCatPct  = totalExpense > 0
    ? ((topCatAmt / totalExpense) * 100).toFixed(1)
    : "0";

  // Last-month per-category for trend
  const lastCatMap = {};
  lastMonth.filter(t => t.type === "expense").forEach(t => {
    lastCatMap[t.category] = (lastCatMap[t.category] || 0) + Number(t.amount);
  });

  const categoryAnalysis = sortedCats.slice(0, 6).map(([cat, amt]) => ({
    cat,
    amount: amt,
    pct:   totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : "0",
    trend: pctChange(amt, lastCatMap[cat] || 0),
  }));

  const financialScore = computeFinancialScore({
    savingsRate,
    spendingChangePct,
    topCatPct,
    txCount: txs.length,
  });
  const scoreLbl = scoreLabel(financialScore);

  const stats = {
    savingsRate, topCat, topCatAmt, topCatPct,
    thisExpense, lastExpense, totalIncome, totalExpense,
    balance, spendingChangePct, sortedCats,
    financialScore, scoreLbl, categoryAnalysis,
  };

  const summaryForAI = {
    reportMonth,
    totalIncome:         fmtINR(totalIncome),
    totalExpense:        fmtINR(totalExpense),
    balance:             fmtINR(balance),
    savingsRate:         `${savingsRate}%`,
    thisMonthExpense:    fmtINR(thisExpense),
    lastMonthExpense:    fmtINR(lastExpense),
    spendingChange:      spendingChangePct ? `${spendingChangePct}%` : "N/A",
    topSpendingCategory: topCat,
    topCategoryAmount:   fmtINR(topCatAmt),
    topCategoryPercent:  `${topCatPct}%`,
    categoryBreakdown:   sortedCats.slice(0, 6).map(([c, a]) => `${c}: ${fmtINR(a)}`).join(", "),
    transactionCount:    txs.length,
    financialScore,
  };

  // ── 4. Try Gemini; fall back to rule-based on any error ───────────────────
  let reportData;
  let source = "gemini";

  const prompt = `You are an expert personal finance advisor in India analyzing a user's bank statement data.

FINANCIAL DATA (${summaryForAI.reportMonth}):
- Total Income: ${summaryForAI.totalIncome}
- Total Expenses: ${summaryForAI.totalExpense}
- Net Balance: ${summaryForAI.balance}
- Savings Rate: ${summaryForAI.savingsRate}
- This Month Expenses: ${summaryForAI.thisMonthExpense}
- Last Month Expenses: ${summaryForAI.lastMonthExpense}
- Month-over-Month Spending Change: ${summaryForAI.spendingChange}
- Top Spending Category: ${summaryForAI.topSpendingCategory} (${summaryForAI.topCategoryAmount}, ${summaryForAI.topCategoryPercent} of total)
- Full Category Breakdown: ${summaryForAI.categoryBreakdown}
- Total Transactions Analyzed: ${summaryForAI.transactionCount}
- Computed Financial Score: ${summaryForAI.financialScore}/100

Generate a structured financial report. Respond ONLY with a valid JSON object (no markdown code fences, no extra text before or after):

{
  "monthlySummary": "2-3 sentence summary with specific rupee figures",
  "savingsBehavior": "1-2 sentences on savings rate with specific numbers",
  "overspendingAlert": "1-2 sentences on spending trend — use exact phrase like 'You spent X% more on Y' when applicable",
  "topCategory": "1 sentence about top expense category with amount",
  "personalizedTip": "1-2 actionable sentences tailored to these exact numbers",
  "insights": [
    "savings insight with rupee figure",
    "top spending category insight with percentage",
    "spending trend vs last month",
    "financial score insight and meaning",
    "actionable tip specific to their numbers"
  ]
}

Rules: All rupee amounts must use Indian formatting. Be conversational and friendly. insights array must have EXACTLY 5 strings. No nested objects or arrays inside strings.`;

  try {
    const parsed = await callGemini(prompt);

    // Validate required keys exist and are non-empty strings
    const required = ["monthlySummary", "savingsBehavior", "overspendingAlert", "topCategory", "personalizedTip", "insights"];
    for (const k of required) {
      if (!parsed[k]) throw new Error(`Gemini response missing required field: "${k}"`);
    }
    if (!Array.isArray(parsed.insights) || parsed.insights.length < 3) {
      throw new Error("Gemini insights array is invalid or too short");
    }

    console.log("[Gemini] Report parsed successfully ✓");

    reportData = {
      financialScore,
      scoreLabel:        scoreLbl,
      monthlySummary:    String(parsed.monthlySummary),
      savingsBehavior:   String(parsed.savingsBehavior),
      overspendingAlert: String(parsed.overspendingAlert),
      topCategory:       String(parsed.topCategory),
      personalizedTip:   String(parsed.personalizedTip),
      insights:          parsed.insights.slice(0, 5).map(String),
      categoryAnalysis,
    };

  } catch (geminiErr) {
    // Log full error for debugging
    console.error("[Gemini] API call failed:", geminiErr.message);
    if (isQuotaError(geminiErr)) {
      console.warn("[Gemini] Quota/rate-limit exceeded — switching to rule-based fallback");
    } else {
      console.error("[Gemini] Non-quota error:", geminiErr.status || "unknown status");
    }

    // Always fall back gracefully — never crash the response
    source = "rule-based";
    reportData = buildRuleBasedReport(stats);
    console.log("[AIReport] Rule-based fallback report generated ✓");
  }

  // ── 5. Upsert into MongoDB cache ──────────────────────────────────────────
  try {
    await AIReport.findOneAndUpdate(
      { userId, reportMonth },
      {
        txHash,
        report:      reportData,
        summary:     summaryForAI,
        source,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log(`[AIReport] Report cached in MongoDB (source: ${source})`);
  } catch (saveErr) {
    console.warn("[AIReport] Cache save failed (non-fatal):", saveErr.message);
    // Non-fatal — we still return the report even if caching fails
  }

  return {
    cached:      false,
    reportMonth,
    report:      reportData,
    summary:     summaryForAI,
    source,
    generatedAt: new Date(),
  };
}

module.exports = { generateMonthlyReport };
