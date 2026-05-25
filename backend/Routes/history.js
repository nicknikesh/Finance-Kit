const router       = require("express").Router();
const auth         = require("../middleware/auth");
const UploadHistory = require("../models/UploadHistory");
const Transaction  = require("../models/Transaction");

/**
 * GET /api/history
 * Returns upload history for the authenticated user.
 * Query params:
 *   ?search=<bank|filename>   – text filter
 *   ?page=1&limit=10          – pagination
 *   ?from=YYYY-MM-DD          – date range start
 *   ?to=YYYY-MM-DD            – date range end
 */
router.get("/", auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20, from, to } = req.query;
    const query = { userId: req.user.id };

    // Date range filter
    if (from || to) {
      query.uploadedAt = {};
      if (from) query.uploadedAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.uploadedAt.$lte = toDate;
      }
    }

    // Text search across fileName and bankName
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      query.$or = [{ fileName: re }, { bankName: re }];
    }

    const total = await UploadHistory.countDocuments(query);
    const items = await UploadHistory.find(query)
      .sort({ uploadedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      data: items,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    console.error("[History] GET error:", err.message);
    res.status(500).json({ error: "Could not load upload history: " + err.message });
  }
});

/**
 * GET /api/history/:id/transactions
 * Returns the transactions imported in a specific upload.
 */
router.get("/:id/transactions", auth, async (req, res) => {
  try {
    const record = await UploadHistory.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!record) return res.status(404).json({ error: "Upload record not found." });

    // If we have stored IDs, use them; otherwise fall back to source+date window
    let txs = [];
    if (record.importedTransactionIds && record.importedTransactionIds.length > 0) {
      txs = await Transaction.find({
        _id:    { $in: record.importedTransactionIds },
        userId: req.user.id,
      }).sort({ date: -1 });
    } else {
      // Fallback: transactions imported within ±2 minutes of uploadedAt
      const winStart = new Date(record.uploadedAt.getTime() - 2 * 60 * 1000);
      const winEnd   = new Date(record.uploadedAt.getTime() + 2 * 60 * 1000);
      txs = await Transaction.find({
        userId:    req.user.id,
        source:    "upload",
        createdAt: { $gte: winStart, $lte: winEnd },
      }).sort({ date: -1 });
    }

    res.json({ data: txs, uploadRecord: record });
  } catch (err) {
    console.error("[History] Transactions error:", err.message);
    res.status(500).json({ error: "Could not load transactions: " + err.message });
  }
});

/**
 * DELETE /api/history/:id
 * Deletes a single upload history record (does NOT delete the transactions).
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const record = await UploadHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!record) return res.status(404).json({ error: "Upload record not found." });
    res.json({ message: "Upload record deleted." });
  } catch (err) {
    console.error("[History] DELETE error:", err.message);
    res.status(500).json({ error: "Could not delete record: " + err.message });
  }
});

module.exports = router;
