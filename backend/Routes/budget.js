const router      = require("express").Router();
const auth        = require("../middleware/auth");
const Budget      = require("../models/Budget");
const Transaction = require("../models/Transaction");

// ── Helper: current month string "YYYY-MM" ────────────────────────────────────
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ── Helper: get month boundaries ──────────────────────────────────────────────
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const start  = new Date(y, m - 1, 1);
  const end    = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * GET /api/budget?month=YYYY-MM
 * Returns budget doc + actual spending for the month.
 * If no budget set, returns defaults with spending data.
 */
router.get("/", auth, async (req, res) => {
  try {
    const month  = req.query.month || thisMonth();
    const { start, end } = monthBounds(month);

    // Fetch budget doc (may not exist yet)
    let budget = await Budget.findOne({ userId: req.user.id, month });

    // Fetch actual spending for the month
    const txs = await Transaction.find({
      userId: req.user.id,
      type:   "expense",
      date:   { $gte: start, $lte: end },
    });

    // Total spent
    const totalSpent = txs.reduce((s, t) => s + Number(t.amount), 0);

    // Per-category spent
    const catSpentMap = {};
    txs.forEach(t => {
      catSpentMap[t.category] = (catSpentMap[t.category] || 0) + Number(t.amount);
    });

    // Merge budget limits with actual spending
    const categoryBudgets = (budget?.categoryBudgets || []).map(cb => ({
      category: cb.category,
      limit:    cb.limit,
      spent:    catSpentMap[cb.category] || 0,
      pct:      cb.limit > 0 ? Math.min(((catSpentMap[cb.category] || 0) / cb.limit) * 100, 999) : 0,
    }));

    // Also include categories that have spending but no budget set
    const budgetedCats = new Set(categoryBudgets.map(c => c.category));
    for (const [cat, spent] of Object.entries(catSpentMap)) {
      if (!budgetedCats.has(cat)) {
        categoryBudgets.push({ category: cat, limit: 0, spent, pct: 0 });
      }
    }
    categoryBudgets.sort((a, b) => b.spent - a.spent);

    const totalBudget = budget?.totalBudget || 0;
    const totalPct    = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 999) : 0;

    res.json({
      month,
      totalBudget,
      totalSpent,
      totalPct,
      totalRemaining: Math.max(totalBudget - totalSpent, 0),
      categoryBudgets,
      hasSetBudget: !!budget,
    });
  } catch (err) {
    console.error("[Budget] GET error:", err.message);
    res.status(500).json({ error: "Could not load budget: " + err.message });
  }
});

/**
 * PUT /api/budget
 * Upsert budget for a given month.
 * Body: { month, totalBudget, categoryBudgets: [{category, limit}] }
 */
router.put("/", auth, async (req, res) => {
  try {
    const { month, totalBudget = 0, categoryBudgets = [] } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM." });
    }
    if (totalBudget < 0) {
      return res.status(400).json({ error: "Budget cannot be negative." });
    }
    // Validate category budgets
    const cleaned = categoryBudgets
      .filter(cb => cb.category && cb.limit >= 0)
      .map(cb => ({ category: String(cb.category).trim(), limit: Number(cb.limit) }));

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user.id, month },
      {
        userId: req.user.id,
        month,
        totalBudget: Number(totalBudget),
        categoryBudgets: cleaned,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Budget saved.", budget });
  } catch (err) {
    console.error("[Budget] PUT error:", err.message);
    res.status(500).json({ error: "Could not save budget: " + err.message });
  }
});

/**
 * GET /api/budget/history?months=6
 * Returns budget vs actual for the last N months (for chart).
 */
router.get("/history", auth, async (req, res) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 12);
    const now    = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const { start, end } = monthBounds(month);

      const [budget, txs] = await Promise.all([
        Budget.findOne({ userId: req.user.id, month }),
        Transaction.find({ userId: req.user.id, type: "expense", date: { $gte: start, $lte: end } }),
      ]);

      const spent = txs.reduce((s, t) => s + Number(t.amount), 0);
      result.push({ month, label, budget: budget?.totalBudget || 0, spent });
    }

    res.json({ data: result });
  } catch (err) {
    console.error("[Budget] History error:", err.message);
    res.status(500).json({ error: "Could not load budget history." });
  }
});

/**
 * DELETE /api/budget?month=YYYY-MM
 * Deletes the budget for a specific month.
 */
router.delete("/", auth, async (req, res) => {
  try {
    const month = req.query.month || thisMonth();
    await Budget.findOneAndDelete({ userId: req.user.id, month });
    res.json({ message: "Budget removed." });
  } catch (err) {
    res.status(500).json({ error: "Could not remove budget." });
  }
});

module.exports = router;
