const mongoose = require("mongoose");

/**
 * AIReport — Cached AI-generated monthly financial report.
 * One document per (userId + reportMonth).
 * reportMonth format: "YYYY-MM" (e.g. "2025-05")
 * Invalidated when txHash changes (i.e. new transactions added).
 */
const aiReportSchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  reportMonth: { type: String, required: true },          // "YYYY-MM"

  // Cache invalidation: hash of transaction count + latest tx date
  txHash:      { type: String, default: "" },

  // Structured report from Gemini
  report: {
    financialScore:    { type: Number, default: 0 },      // 0-100
    scoreLabel:        { type: String, default: "" },     // "Good", "Excellent", etc.
    monthlySummary:    { type: String, default: "" },
    savingsBehavior:   { type: String, default: "" },
    overspendingAlert: { type: String, default: "" },
    topCategory:       { type: String, default: "" },
    personalizedTip:   { type: String, default: "" },
    insights:          [{ type: String }],                // 5 bullet insights
    categoryAnalysis:  [{ type: mongoose.Schema.Types.Mixed }], // [{cat, pct, trend}]
  },

  summary: { type: mongoose.Schema.Types.Mixed, default: {} }, // raw stats used
  source:  { type: String, enum: ["gemini", "rule-based"], default: "gemini" },

  generatedAt: { type: Date, default: Date.now },
});

// Compound unique index: one report per user per month
aiReportSchema.index({ userId: 1, reportMonth: 1 }, { unique: true });

module.exports = mongoose.model("AIReport", aiReportSchema);
