const router = require("express").Router();
const auth   = require("../middleware/auth");
const { generateMonthlyReport } = require("../services/aiReportService");

/**
 * GET /api/report
 * Returns cached or freshly generated monthly AI financial report.
 * Query params:
 *   ?refresh=true  — force regeneration (bypass cache)
 */
router.get("/", auth, async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    const result = await generateMonthlyReport(req.user.id, forceRefresh);
    res.json(result);
  } catch (err) {
    console.error("[Report Route] Error:", err.message);
    res.status(500).json({ error: "Failed to generate report: " + err.message });
  }
});

module.exports = router;
