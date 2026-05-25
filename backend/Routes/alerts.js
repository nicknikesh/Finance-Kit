const router = require("express").Router();
const auth   = require("../middleware/auth");
const { generateAlerts, dismissAlert } = require("../services/alertsService");
const Alert  = require("../models/Alert");

/**
 * GET /api/alerts
 * Returns active (non-dismissed) alerts. Regenerates them first.
 * Query: ?regen=true  (default true — always fresh)
 *        ?regen=false — serve from cache only
 */
router.get("/", auth, async (req, res) => {
  try {
    const skipRegen = req.query.regen === "false";

    let alerts;
    if (skipRegen) {
      // Fast path: serve cached alerts directly
      const priority = { danger: 0, warning: 1, good: 2 };
      alerts = (await Alert.find({ userId: req.user.id, dismissed: false })
        .sort({ generatedAt: -1 }))
        .sort((a, b) => (priority[a.type] ?? 3) - (priority[b.type] ?? 3));
    } else {
      alerts = await generateAlerts(req.user.id);
    }

    res.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error("[Alerts] GET error:", err.message);
    res.status(500).json({ error: "Could not load alerts: " + err.message });
  }
});

/**
 * POST /api/alerts/regenerate
 * Force-regenerate alerts (called after uploads).
 */
router.post("/regenerate", auth, async (req, res) => {
  try {
    const alerts = await generateAlerts(req.user.id);
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error("[Alerts] Regenerate error:", err.message);
    res.status(500).json({ error: "Could not regenerate alerts: " + err.message });
  }
});

/**
 * PATCH /api/alerts/:id/dismiss
 * Dismiss a single alert.
 */
router.patch("/:id/dismiss", auth, async (req, res) => {
  try {
    const alert = await dismissAlert(req.user.id, req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found." });
    res.json({ message: "Alert dismissed.", alert });
  } catch (err) {
    console.error("[Alerts] Dismiss error:", err.message);
    res.status(500).json({ error: "Could not dismiss alert: " + err.message });
  }
});

/**
 * DELETE /api/alerts/dismissed
 * Clear all dismissed alerts for the user.
 */
router.delete("/dismissed", auth, async (req, res) => {
  try {
    const result = await Alert.deleteMany({ userId: req.user.id, dismissed: true });
    res.json({ message: `Cleared ${result.deletedCount} dismissed alert(s).` });
  } catch (err) {
    res.status(500).json({ error: "Could not clear dismissed alerts." });
  }
});

module.exports = router;
