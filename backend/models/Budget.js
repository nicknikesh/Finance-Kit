const mongoose = require("mongoose");

/**
 * Budget — stores a user's monthly budget goals.
 * One document per (userId + month).
 * month format: "YYYY-MM"
 *
 * totalBudget   — overall monthly spending limit
 * categoryBudgets — per-category spending limits
 */
const categoryBudgetSchema = new mongoose.Schema({
  category: { type: String, required: true },
  limit: { type: Number, required: true, min: 0 },
}, { _id: false });

const budgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  month: { type: String, required: true },   // "YYYY-MM"
  totalBudget: { type: Number, default: 0, min: 0 },
  categoryBudgets: { type: [categoryBudgetSchema], default: [] },
  currency: { type: String, default: "₹" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// One budget doc per user per month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });
budgetSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model("Budget", budgetSchema);
