const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId:      String,
  type:        String,
  amount:      Number,
  category:    String,
  description: { type: String, default: "" },
  source:      { type: String, enum: ["manual", "upload"], default: "manual" },
  date:        { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);