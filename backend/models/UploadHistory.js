const mongoose = require("mongoose");

/**
 * UploadHistory — records every PDF bank statement upload.
 * One document per upload event.
 */
const uploadHistorySchema = new mongoose.Schema({
  userId:                      { type: String, required: true, index: true },
  fileName:                    { type: String, default: "bank_statement.pdf" },
  bankName:                    { type: String, default: "Unknown" },
  transactionsImported:        { type: Number, default: 0 },
  duplicateTransactionsSkipped:{ type: Number, default: 0 },
  totalParsed:                 { type: Number, default: 0 },
  uploadedAt:                  { type: Date,   default: Date.now },
  // Snapshot of imported transaction IDs for "view imported" feature
  importedTransactionIds:      [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
});

uploadHistorySchema.index({ userId: 1, uploadedAt: -1 });

module.exports = mongoose.model("UploadHistory", uploadHistorySchema);
