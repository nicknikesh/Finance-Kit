const mongoose = require("mongoose");

/**
 * RecurringPayment — one document per detected recurring subscription/payment.
 * Detected from transaction patterns: same merchant + similar amount + ~monthly interval.
 */
const recurringSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },

  // Merchant/description fingerprint
  merchantKey:   { type: String, required: true }, // normalized key e.g. "netflix"
  merchantName:  { type: String, required: true }, // display name e.g. "Netflix"
  category:      { type: String, default: "Entertainment" },
  icon:          { type: String, default: "🔄" },

  // Amount (use median of all occurrences)
  amount:        { type: Number, required: true },
  currency:      { type: String, default: "₹" },

  // Interval in days (30 = monthly, 365 = yearly, 7 = weekly)
  intervalDays:  { type: Number, default: 30 },
  intervalLabel: { type: String, default: "Monthly" }, // "Monthly", "Weekly", "Yearly"

  // Dates
  firstSeen:     { type: Date },
  lastCharged:   { type: Date },
  nextExpected:  { type: Date },

  // All matching transaction IDs
  transactionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
  occurrences:    { type: Number, default: 1 },

  // Status
  isActive:      { type: Boolean, default: true },
  isDismissed:   { type: Boolean, default: false },

  detectedAt:    { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});

// One recurring entry per user + merchantKey
recurringSchema.index({ userId: 1, merchantKey: 1 }, { unique: true });

module.exports = mongoose.model("RecurringPayment", recurringSchema);
