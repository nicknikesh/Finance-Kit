const mongoose = require("mongoose");

/**
 * Alert — one spending alert per (userId + alertKey).
 * alertKey is deterministic (e.g. "cat_Food_increase") so we can upsert.
 * Dismissed alerts are hidden on the frontend but kept for history.
 */
const alertSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },

  // Deterministic key — prevents duplicates for the same condition
  alertKey:  { type: String, required: true },

  // Display fields
  type:      { type: String, enum: ["danger", "warning", "good"], default: "warning" },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  category:  { type: String, default: "" },         // category name if applicable
  changePct: { type: Number, default: null },        // e.g. +40 or -20
  icon:      { type: String, default: "⚠️" },

  dismissed: { type: Boolean, default: false },
  generatedAt: { type: Date, default: Date.now },
});

// One alert per (user + key) — upsert-friendly
alertSchema.index({ userId: 1, alertKey: 1 }, { unique: true });

module.exports = mongoose.model("Alert", alertSchema);
