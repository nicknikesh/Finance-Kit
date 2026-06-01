const router  = require("express").Router();
const auth    = require("../middleware/auth");
const { detectRecurring } = require("../services/recurringService");
const RecurringPayment = require("../models/RecurringPayment");

/**
 * GET /api/recurring
 * Returns all active recurring payments. Optionally re-runs detection.
 * ?refresh=true  — force re-detection from transactions (default: serve cache)
 */
router.get("/", auth, async (req, res) => {
  try {
    let payments;
    if (req.query.refresh === "true") {
      payments = await detectRecurring(req.user.id);
    } else {
      payments = await RecurringPayment.find({ userId: req.user.id, isDismissed: false })
        .sort({ nextExpected: 1 });
      // If no cached data, run detection automatically
      if (payments.length === 0) {
        payments = await detectRecurring(req.user.id);
      }
    }

    const now = new Date();
    const withStatus = payments.map(p => {
      const daysUntil = Math.round((new Date(p.nextExpected) - now) / (1000 * 60 * 60 * 24));
      return {
        ...p.toObject(),
        daysUntil,
        dueSoon: daysUntil >= 0 && daysUntil <= 5,
        overdue: daysUntil < 0,
      };
    });

    const monthlyTotal = payments
      .filter(p => p.intervalLabel === "Monthly" && p.isActive)
      .reduce((s, p) => s + p.amount, 0);

    res.json({
      data: withStatus,
      count: withStatus.length,
      monthlyTotal,
    });
  } catch (err) {
    console.error("[Recurring] GET error:", err.message);
    res.status(500).json({ error: "Could not load recurring payments: " + err.message });
  }
});

/**
 * POST /api/recurring/detect
 * Force re-runs the detection algorithm.
 */
router.post("/detect", auth, async (req, res) => {
  try {
    const payments = await detectRecurring(req.user.id);
    const now = new Date();
    const withStatus = payments.map(p => ({
      ...p.toObject(),
      daysUntil: Math.round((new Date(p.nextExpected) - now) / (1000 * 60 * 60 * 24)),
      dueSoon:   Math.round((new Date(p.nextExpected) - now) / (1000 * 60 * 60 * 24)) <= 5,
      overdue:   Math.round((new Date(p.nextExpected) - now) / (1000 * 60 * 60 * 24)) < 0,
    }));
    res.json({ data: withStatus, count: withStatus.length });
  } catch (err) {
    console.error("[Recurring] Detect error:", err.message);
    res.status(500).json({ error: "Detection failed: " + err.message });
  }
});

/**
 * PATCH /api/recurring/:id/dismiss
 * Hides a recurring payment from the user's view.
 */
router.patch("/:id/dismiss", auth, async (req, res) => {
  try {
    const p = await RecurringPayment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isDismissed: true },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: "Record not found." });
    res.json({ message: "Dismissed.", payment: p });
  } catch (err) {
    res.status(500).json({ error: "Dismiss failed." });
  }
});

module.exports = router;
