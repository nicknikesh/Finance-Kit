const router       = require("express").Router();
const multer       = require("multer");
// pdf-parse v1.1.1 — exports directly as a function
const pdfParse     = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Transaction  = require("../models/Transaction");
const AIReport     = require("../models/AIReport");
const UploadHistory = require("../models/UploadHistory");
const { generateAlerts } = require("../services/alertsService");
const auth         = require("../middleware/auth");
const { detectCategory } = require("../utils/categoryRules");

// ─── Multer: memory storage, PDF only, max 10 MB ───────────────────────────
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are accepted."));
  },
});

// ─── Category detection is now handled by utils/categoryRules.js ─────────────
// detectCategory() imported above — supports: Food, Travel, Shopping, Bills,
// Salary, Entertainment, Health, Others

// ─── Multi-Bank PDF Parser ───────────────────────────────────────────────────
// Each parser returns an array of: { date, description, amount, type }
// "type" is "income" or "expense"

function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, "").trim()) || 0;
}

function safeDate(str) {
  // Handles DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY, YYYY-MM-DD
  if (!str) return null;
  str = str.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const y = dmy[3].length === 2 ? "20" + dmy[3] : dmy[3];
    const d = new Date(`${y}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`);
    if (!isNaN(d)) return d;
  }
  // DD Mon YYYY
  const d = new Date(str);
  if (!isNaN(d)) return d;
  return null;
}

// ---- SBI: Line-by-line parser with multi-line record merging
// SBI format per row: DD/MM/YYYY  DD/MM/YYYY  Description  RefNo  Debit  Credit  Balance
// "BY" prefix → credit (income) | "TO" prefix → debit (expense)
function parseSBI(text) {
  const rows = [];

  // Step 1: Normalize whitespace — collapse spaces/tabs, keep newlines
  const lines = text
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  // Step 2: Find "Value Date" header — start parsing after it
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/value\s*date/i.test(lines[i])) { startIdx = i + 1; break; }
  }
  console.log(`[SBI] Header found at line index ${startIdx - 1}, parsing from line ${startIdx}`);

  // Step 3: Group lines into records — a new record starts with DD/MM/YYYY
  const dateStartRe = /^\d{2}\/\d{2}\/\d{4}/;
  const records = [];
  let current = null;

  for (const line of lines.slice(startIdx)) {
    if (dateStartRe.test(line)) {
      if (current !== null) records.push(current);
      current = line;
    } else if (current !== null) {
      // Continuation line — append to current record
      current += " " + line;
    }
  }
  if (current !== null) records.push(current);

  console.log(`[SBI] Merged records: ${records.length}`);
  if (records.length > 0) console.log("[SBI] First record:", records[0]);

  // Step 4: Parse each merged record
  const amountRe = /\d{1,3}(?:,\d{2,3})*\.\d{2}/g;

  for (const record of records) {
    // 4a: Extract dates
    const dateMatches = record.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if (dateMatches.length === 0) continue;
    const date = safeDate(dateMatches[0]);
    if (!date) continue;

    // 4b: Extract all money amounts in order
    const amounts = [];
    let am;
    const reAmt = /\d{1,3}(?:,\d{2,3})*\.\d{2}/g;
    while ((am = reAmt.exec(record)) !== null) amounts.push(parseAmount(am[0]));
    if (amounts.length === 0) continue;

    // 4c: Determine transaction type
    // Priority 1: BY / TO prefix (most reliable in SBI)
    let type;
    if      (/\bBY\s/i.test(record))                              type = "income";
    else if (/\bTO\s/i.test(record))                              type = "expense";
    // Priority 2: Dr / Cr marker
    else if (/\bCr\b/.test(record))                               type = "income";
    else if (/\bDr\b/.test(record))                               type = "expense";
    // Priority 3: keyword hints
    else if (/salary|credit received|refund|cashback/i.test(record)) type = "income";
    else                                                           type = "expense";

    // 4d: Transaction amount
    // Structure: [..., txnAmount, balance]  (last = balance, second-to-last = txn)
    let amount = 0;
    if      (amounts.length === 1) amount = amounts[0];
    else if (amounts.length === 2) amount = amounts[0];        // txn + balance
    else                           amount = amounts[amounts.length - 2]; // debit/credit + balance

    if (!amount || amount <= 0) continue;

    // 4e: Build description — strip dates and amounts from record
    let desc = record;
    dateMatches.forEach(d => { desc = desc.replace(d, ""); });
    desc = desc.replace(/\d{1,3}(?:,\d{2,3})*\.\d{2}/g, "")
               .replace(/\s+/g, " ")
               .replace(/^[\s,.\-|]+|[\s,.\-|]+$/g, "")
               .trim();
    if (!desc) desc = "Transaction";

    rows.push({ date, description: desc, amount, type });
  }

  console.log("[SBI Parser] Total transactions parsed:", rows.length);
  rows.slice(0, 3).forEach((r, i) =>
    console.log(`[SBI Parser] Row[${i}]:`, JSON.stringify(r))
  );

  return rows;
}

// ---- HDFC: "DD/MM/YY Description Amount Amount Balance"
function parseHDFC(text) {
  const rows = [];
  // HDFC: date, narration, chq/ref, value date, withdrawal, deposit, closing balance
  const lineRe = /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d,]*\.?\d*)\s+([\d,]*\.?\d*)\s+([\d,]+\.\d{2})/g;
  let m;
  while ((m = lineRe.exec(text)) !== null) {
    const date = safeDate(m[1]);
    if (!date) continue;
    const withdrawal = parseAmount(m[3]);
    const deposit    = parseAmount(m[4]);
    if (withdrawal === 0 && deposit === 0) continue;
    rows.push({
      date,
      description: m[2].replace(/\s+/g, " ").trim(),
      amount: withdrawal > 0 ? withdrawal : deposit,
      type:   withdrawal > 0 ? "expense" : "income",
    });
  }
  return rows;
}

// ---- ICICI: similar to HDFC but slightly different spacing
function parseICICI(text) {
  const rows = [];
  // ICICI: S No. | Value Date | Transaction Date | Cheque | Description | Debit | Credit | Balance
  const lineRe = /(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})\s+\S*\s+(.+?)\s+([\d,]*\.?\d*)\s+([\d,]*\.?\d*)\s+([\d,]+\.\d{2})/g;
  let m;
  while ((m = lineRe.exec(text)) !== null) {
    const date = safeDate(m[1]);
    if (!date) continue;
    const debit  = parseAmount(m[4]);
    const credit = parseAmount(m[5]);
    if (debit === 0 && credit === 0) continue;
    rows.push({
      date,
      description: m[3].replace(/\s+/g, " ").trim(),
      amount: debit > 0 ? debit : credit,
      type:   debit > 0 ? "expense" : "income",
    });
  }
  return rows;
}

// ---- Axis: "DD-MM-YYYY Description Chq/Ref# Debit Credit Balance"
function parseAxis(text) {
  const rows = [];
  const lineRe = /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+\d*\s+([\d,]*\.?\d*)\s+([\d,]*\.?\d*)\s+([\d,]+\.\d{2})/g;
  let m;
  while ((m = lineRe.exec(text)) !== null) {
    const date = safeDate(m[1]);
    if (!date) continue;
    const debit  = parseAmount(m[3]);
    const credit = parseAmount(m[4]);
    if (debit === 0 && credit === 0) continue;
    rows.push({
      date,
      description: m[2].replace(/\s+/g, " ").trim(),
      amount: debit > 0 ? debit : credit,
      type:   debit > 0 ? "expense" : "income",
    });
  }
  return rows;
}

// ---- Generic fallback: any line with a date and money amount
function parseGeneric(text) {
  const rows = [];
  const lines = text.split("\n");
  // date pattern at start, then text, then amount, optional Dr/Cr
  const lineRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr|debit|credit)?/i;
  for (const line of lines) {
    const m = line.match(lineRe);
    if (!m) continue;
    const date = safeDate(m[1]);
    if (!date) continue;
    const typHint = (m[4] || "").toLowerCase();
    let type = "expense";
    if (typHint === "cr" || typHint === "credit") type = "income";
    rows.push({
      date,
      description: m[2].replace(/\s+/g, " ").trim(),
      amount: parseAmount(m[3]),
      type,
    });
  }
  return rows;
}

function parseBankStatement(text) {
  const candidates = [
    { name: "SBI",     fn: parseSBI     },
    { name: "HDFC",    fn: parseHDFC    },
    { name: "ICICI",   fn: parseICICI   },
    { name: "Axis",    fn: parseAxis    },
    { name: "Generic", fn: parseGeneric },
  ];
  let best = { name: "Generic", rows: [] };
  for (const { name, fn } of candidates) {
    const rows = fn(text);
    if (rows.length > best.rows.length) best = { name, rows };
  }
  return best;
}

// ─── POST /api/upload ────────────────────────────────────────────────────────
router.post("/", auth, upload.single("statement"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    // Parse PDF — pdf-parse v1.1.1 (direct function call)
    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (parseErr) {
      console.error("[PDF] Parse error:", parseErr.message);
      return res.status(422).json({ error: "Failed to parse PDF. Make sure it is a valid, text-based PDF bank statement." });
    }

    const text = pdfData.text || "";

    // DEBUG: log first 500 chars of extracted text
    console.log("[PDF] Extracted text preview (first 500 chars):");
    console.log(text.substring(0, 500));
    console.log("[PDF] Total text length:", text.length);

    if (!text || text.trim().length < 30) {
      return res.status(422).json({ error: "Could not extract text from this PDF. It may be a scanned/image-based PDF. Please use a text-based PDF statement." });
    }

    const { name: bankDetected, rows } = parseBankStatement(text);

    // DEBUG: log parsed transaction count
    console.log(`[PDF] Bank detected: ${bankDetected}, Transactions parsed: ${rows.length}`);
    if (rows.length > 0) {
      console.log("[PDF] Sample row:", JSON.stringify(rows[0]));
    }

    if (rows.length === 0) {
      return res.status(422).json({
        error: `No transactions found using the ${bankDetected} parser. The statement format may not be supported yet. Supported formats: SBI, HDFC, ICICI, Axis, and generic date-amount formats.`,
      });
    }

    let saved = 0;
    let skipped = 0;
    const savedDocs = [];

    for (const row of rows) {
      if (!row.date || !row.amount || row.amount <= 0) { skipped++; continue; }

      // Duplicate check: same user + date (±1 day) + amount + description prefix
      const dayStart = new Date(row.date); dayStart.setHours(0,0,0,0);
      const dayEnd   = new Date(row.date); dayEnd.setHours(23,59,59,999);

      const exists = await Transaction.findOne({
        userId: req.user.id,
        amount: row.amount,
        date:   { $gte: dayStart, $lte: dayEnd },
        description: { $regex: new RegExp(row.description.substring(0,20).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i") },
      });

      if (exists) { skipped++; continue; }

      const category = detectCategory(row.description);

      const tx = new Transaction({
        userId:      req.user.id,
        type:        row.type,
        amount:      row.amount,
        category,
        description: row.description,
        source:      "upload",
        date:        row.date,
      });

      await tx.save();
      savedDocs.push(tx);
      saved++;
    }

    // Invalidate AI report cache so next fetch regenerates with new data
    if (saved > 0) {
      const now = new Date();
      const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await AIReport.findOneAndUpdate(
        { userId: req.user.id, reportMonth },
        { txHash: "invalidated" },
        { upsert: false }
      );
    }

    // ── Save Upload History record ───────────────────────────────────────
    try {
      await UploadHistory.create({
        userId:                       req.user.id,
        fileName:                     req.file.originalname || "bank_statement.pdf",
        bankName:                     bankDetected,
        transactionsImported:         saved,
        duplicateTransactionsSkipped: skipped,
        totalParsed:                  rows.length,
        uploadedAt:                   new Date(),
        importedTransactionIds:       savedDocs.map(tx => tx._id),
      });
      console.log(`[UploadHistory] Saved: ${saved} imported, ${skipped} skipped, bank: ${bankDetected}`);
    } catch (histErr) {
      console.warn("[UploadHistory] Save failed (non-fatal):", histErr.message);
    }

    // ── Regenerate spending alerts after new transactions ──────────────
    if (saved > 0) {
      generateAlerts(req.user.id).catch(e =>
        console.warn("[Alerts] Post-upload regeneration failed (non-fatal):", e.message)
      );
    }

    res.status(201).json({
      message: `Imported ${saved} transaction(s). ${skipped} duplicate(s) skipped.`,
      bank: bankDetected,
      saved,
      skipped,
      transactions: savedDocs,
    });
  } catch (err) {
    if (err.message && err.message.includes("Only PDF")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// ─── GET /api/upload/insights ────────────────────────────────────────────────
router.get("/insights", auth, async (req, res) => {
  try {
    const now          = new Date();
    const ninetyDays   = new Date(now); ninetyDays.setDate(now.getDate() - 90);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLast  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLast    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const txs = await Transaction.find({
      userId: req.user.id,
      date:   { $gte: ninetyDays },
    });

    if (txs.length === 0) {
      return res.json({ insights: ["No transaction data available yet. Upload a bank statement to get started!"] });
    }

    // Aggregate stats
    const thisMonth = txs.filter(t => new Date(t.date) >= startOfMonth);
    const lastMonth = txs.filter(t => new Date(t.date) >= startOfLast && new Date(t.date) <= endOfLast);

    const sum = (arr, type) => arr.filter(t => t.type === type).reduce((s,t) => s + Number(t.amount), 0);

    const totalIncome  = sum(txs, "income");
    const totalExpense = sum(txs, "expense");
    const thisIncome   = sum(thisMonth, "income");
    const thisExpense  = sum(thisMonth, "expense");
    const lastExpense  = sum(lastMonth, "expense");
    const balance      = totalIncome - totalExpense;
    const savingsRate  = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0;

    // Category breakdown
    const catMap = {};
    txs.filter(t => t.type === "expense").forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    const sortedCats = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    const topCat     = sortedCats[0] || ["Others", 0];

    const spendingChange = lastExpense > 0
      ? (((thisExpense - lastExpense) / lastExpense) * 100).toFixed(1)
      : null;

    const summaryForAI = {
      period: "last 90 days",
      totalIncome:  `₹${totalIncome.toFixed(2)}`,
      totalExpense: `₹${totalExpense.toFixed(2)}`,
      balance:      `₹${balance.toFixed(2)}`,
      savingsRate:  `${savingsRate}%`,
      thisMonthExpense: `₹${thisExpense.toFixed(2)}`,
      lastMonthExpense: `₹${lastExpense.toFixed(2)}`,
      spendingChangePercent: spendingChange ? `${spendingChange}%` : "N/A",
      topSpendingCategory: topCat[0],
      topSpendingAmount:   `₹${Number(topCat[1]).toFixed(2)}`,
      categoryBreakdown: sortedCats.slice(0,5).map(([cat,amt]) => `${cat}: ₹${Number(amt).toFixed(2)}`),
      transactionCount: txs.length,
    };

    // Gemini call — using gemini-2.0-flash (confirmed available on v1beta)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a friendly personal finance advisor analyzing a user's bank statement data.

Here is the user's financial summary for the ${summaryForAI.period}:
- Total Income: ${summaryForAI.totalIncome}
- Total Expenses: ${summaryForAI.totalExpense}
- Net Balance: ${summaryForAI.balance}
- Savings Rate: ${summaryForAI.savingsRate}
- This Month Expenses: ${summaryForAI.thisMonthExpense}
- Last Month Expenses: ${summaryForAI.lastMonthExpense}
- Month-over-Month Spending Change: ${summaryForAI.spendingChangePercent}
- Top Spending Category: ${summaryForAI.topSpendingCategory} (${summaryForAI.topSpendingAmount})
- Category Breakdown: ${summaryForAI.categoryBreakdown.join(", ")}
- Total Transactions Analyzed: ${summaryForAI.transactionCount}

Generate exactly 5 short, human-friendly financial insight sentences in Indian Rupee (₹) context.
Each insight should be actionable, conversational, and specific to the numbers above.
Include: savings assessment, spending trend, top category warning/praise, one tip, one motivational note.

Respond ONLY with a valid JSON array of exactly 5 strings, no markdown, no explanation.
Example format: ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (geminiErr) {
      console.error("[Gemini] API error:", geminiErr.message);
      // On quota exceeded — return rule-based fallback insights
      if (geminiErr.message.includes("429")) {
        const fallback = [
          `Your savings rate is ${savingsRate}% over the last 90 days.`,
          `Top spending category: ${topCat[0]} at ₹${Number(topCat[1]).toFixed(0)}.`,
          thisExpense > lastExpense
            ? `⚠️ This month's spending (₹${thisExpense.toFixed(0)}) is higher than last month (₹${lastExpense.toFixed(0)}).`
            : `✅ This month's spending (₹${thisExpense.toFixed(0)}) is lower than last month — good job!`,
          `Net balance over 90 days: ₹${balance.toFixed(0)}.`,
          totalIncome > 0 ? "Keep tracking your expenses to improve your financial health!" : "Add income transactions to see a complete financial picture.",
        ];
        return res.json({ insights: fallback, summary: summaryForAI, source: "rule-based" });
      }
      throw geminiErr;
    }

    const raw = result.response.text().trim();

    // DEBUG: log Gemini raw response
    console.log("[Gemini] Raw response:", raw.substring(0, 300));

    // Safely parse Gemini's JSON response
    let insights;
    try {
      // Strip markdown code fences if Gemini wraps in ```json
      const cleaned = raw.replace(/^```json?\s*/i,"").replace(/```\s*$/,"").trim();
      insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) throw new Error("Not an array");
    } catch {
      // Fallback: extract quoted strings
      const matches = raw.match(/"([^"]+)"/g);
      insights = matches ? matches.map(s => s.replace(/"/g,"")) : [raw];
    }

    res.json({ insights, summary: summaryForAI, source: "gemini" });
  } catch (err) {
    console.error("[Insights] Error:", err.message);
    res.status(500).json({ error: "AI insights unavailable, please try again later. " + err.message });
  }
});

module.exports = router;
