const router = require("express").Router();
const Transaction = require("../models/Transaction");
const auth = require("../middleware/auth");
const { detectCategory } = require("../utils/categoryRules");

function buildDateFilter(from, to) {
  const dateFilter = {};
  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) dateFilter.$gte = fromDate;
  }
  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }
  }
  return Object.keys(dateFilter).length ? dateFilter : null;
}

// Add transaction
router.post("/", auth, async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    if (!type || !amount) {
      return res.status(400).json({ error: "Type and amount are required." });
    }

    // Auto-detect category: prefer explicit category, else detect from description
    const resolvedCategory = category
      || (description ? detectCategory(description) : "Others");

    if (!resolvedCategory) {
      return res.status(400).json({ error: "Category is required." });
    }

    const transaction = new Transaction({
      userId: req.user.id,
      type,
      amount,
      category: resolvedCategory,
      description: description || "",
      date: date ? new Date(date) : undefined
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: "Could not add transaction: " + err.message });
  }
});

// Get all with filters, search, sorting and pagination
router.get("/", auth, async (req, res) => {
  try {
    const {
      type, category, search,
      page = 1, limit = 20,
      from, to,
      sort = "latest",        // "latest" | "oldest" | "highest" | "lowest"
      minAmount, maxAmount,
    } = req.query;

    const query = { userId: req.user.id };

    if (type && type !== "all") query.type = type;
    if (category && category !== "all") query.category = new RegExp(category, "i");

    // Full-text search across description AND category
    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      query.$or = [{ description: re }, { category: re }];
    }

    // Amount range
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) query.date = dateFilter;

    // Sort mapping
    const sortMap = {
      latest:  { date: -1 },
      oldest:  { date:  1 },
      highest: { amount: -1 },
      lowest:  { amount:  1 },
    };
    const sortObj = sortMap[sort] || sortMap.latest;

    const total = await Transaction.countDocuments(query);
    const data  = await Transaction.find(query)
      .sort(sortObj)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      data,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Could not load transactions: " + err.message });
  }
});


// Get dashboard summary insights
router.get("/summary", auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyData = await Transaction.aggregate([
      { $match: { userId: req.user.id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);

    const topCategory = await Transaction.aggregate([
      { $match: { userId: req.user.id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 }
    ]);

    const totals = monthlyData.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});

    res.json({
      monthlyTotals: totals,
      topCategory: topCategory[0] || { _id: null, total: 0 },
      insights: {
        message: totals.expense > totals.income ? "You spent more this month." : "Your spending is steady this month.",
        currency: "₹"
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Could not load summary: " + err.message });
  }
});

// Export transactions to CSV
router.get("/export", auth, async (req, res) => {
  try {
    const { type, category, from, to } = req.query;
    const query = { userId: req.user.id };
    if (type) query.type = type;
    if (category) query.category = new RegExp(category, "i");
    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) query.date = dateFilter;

    const transactions = await Transaction.find(query).sort({ date: -1 });
    const rows = transactions.map((tx) => [
      tx._id,
      tx.type,
      tx.amount,
      tx.category,
      tx.date.toISOString()
    ]);

    const csv = ["id,type,amount,category,date", ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Could not export transactions: " + err.message });
  }
});

// Update transaction
router.put("/:id", auth, async (req, res) => {
  try {
    const { type, amount, category, date } = req.body;
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    if (type) transaction.type = type;
    if (amount !== undefined) transaction.amount = amount;
    if (category) transaction.category = category;
    if (date) transaction.date = new Date(date);

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: "Could not update transaction: " + err.message });
  }
});

// Delete transaction
router.delete("/:id", auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }
    res.json({ message: "Transaction deleted." });
  } catch (err) {
    res.status(500).json({ error: "Could not delete transaction: " + err.message });
  }
});

module.exports = router;