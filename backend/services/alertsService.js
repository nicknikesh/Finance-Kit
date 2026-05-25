/**
 * alertsService.js
 * ─────────────────────────────────────────────────────────────────
 * Computes spending alerts by comparing current month vs previous
 * month across all categories + overall spending + savings rate.
 *
 * Alert types:
 *   "danger"  → red   (bad: overspending, savings dropped, etc.)
 *   "warning" → amber (worth watching: moderate increase)
 *   "good"    → green (positive: spending down, savings up)
 *
 * Uses deterministic alertKeys so alerts are upserted — no duplicates.
 * Dismissed flag is preserved across regenerations.
 */

const Transaction = require("../models/Transaction");
const Alert       = require("../models/Alert");

// ── Helpers ───────────────────────────────────────────────────────────────────
const sumExp = (arr) =>
  arr.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

const sumInc = (arr) =>
  arr.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

const pct = (curr, prev) =>
  prev > 0 ? ((curr - prev) / prev) * 100 : null;

// ── Alert builder helpers ─────────────────────────────────────────────────────
function catAlert(cat, currAmt, prevAmt, changePct) {
  const abs = Math.abs(changePct).toFixed(0);

  if (changePct >= 50) {
    return {
      type: "danger",
      icon: "🔴",
      title: `${cat} spending spiked ${abs}%`,
      message: `You spent ${abs}% more on ${cat} this month compared to last month. Consider reviewing your ${cat.toLowerCase()} budget.`,
    };
  }
  if (changePct >= 25) {
    return {
      type: "warning",
      icon: "⚠️",
      title: `${cat} spending increased ${abs}%`,
      message: `Your ${cat.toLowerCase()} expenses rose ${abs}% this month. Keep an eye on this category.`,
    };
  }
  if (changePct <= -20) {
    return {
      type: "good",
      icon: "✅",
      title: `${cat} spending reduced ${abs}%`,
      message: `Great job! Your ${cat.toLowerCase()} spending dropped ${abs}% compared to last month.`,
    };
  }
  return null; // change too small — skip
}

// ── Core function ─────────────────────────────────────────────────────────────
/**
 * generateAlerts(userId)
 * Computes all alerts for a user and upserts them in MongoDB.
 * Returns the current active (non-dismissed) alerts array.
 */
async function generateAlerts(userId) {
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLast  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLast    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const sixtyDays    = new Date(now); sixtyDays.setDate(now.getDate() - 60);

  // Fetch last 60 days of transactions
  const txs = await Transaction.find({ userId, date: { $gte: sixtyDays } });

  const thisMonth = txs.filter(t => new Date(t.date) >= startOfMonth);
  const lastMonth = txs.filter(t => new Date(t.date) >= startOfLast && new Date(t.date) <= endOfLast);

  const thisExp = sumExp(thisMonth);
  const lastExp = sumExp(lastMonth);
  const thisInc = sumInc(thisMonth);
  const lastInc = sumInc(lastMonth);

  const rawAlerts = []; // { alertKey, type, icon, title, message, category, changePct }

  // ── 1. Overall spending change ───────────────────────────────────────────
  const totalSpendChg = pct(thisExp, lastExp);
  if (totalSpendChg !== null && Math.abs(totalSpendChg) >= 20) {
    if (totalSpendChg >= 40) {
      rawAlerts.push({
        alertKey:  "total_spend_spike",
        type:      "danger",
        icon:      "🔴",
        title:     `Total spending spiked ${totalSpendChg.toFixed(0)}%`,
        message:   `Your total expenses jumped ${totalSpendChg.toFixed(0)}% this month (₹${thisExp.toFixed(0)} vs ₹${lastExp.toFixed(0)} last month). Review your spending immediately.`,
        category:  "",
        changePct: totalSpendChg,
      });
    } else if (totalSpendChg >= 20) {
      rawAlerts.push({
        alertKey:  "total_spend_increase",
        type:      "warning",
        icon:      "⚠️",
        title:     `Spending increased ${totalSpendChg.toFixed(0)}% this month`,
        message:   `You've spent ${totalSpendChg.toFixed(0)}% more than last month (₹${thisExp.toFixed(0)} vs ₹${lastExp.toFixed(0)}). Watch your budget.`,
        category:  "",
        changePct: totalSpendChg,
      });
    } else if (totalSpendChg <= -20) {
      rawAlerts.push({
        alertKey:  "total_spend_drop",
        type:      "good",
        icon:      "✅",
        title:     `Spending down ${Math.abs(totalSpendChg).toFixed(0)}% — great work!`,
        message:   `Your total spending dropped ${Math.abs(totalSpendChg).toFixed(0)}% compared to last month. Keep it up!`,
        category:  "",
        changePct: totalSpendChg,
      });
    }
  }

  // ── 2. Savings rate alert ────────────────────────────────────────────────
  if (thisInc > 0) {
    const savingsRate = ((thisInc - thisExp) / thisInc) * 100;
    if (savingsRate < 0) {
      rawAlerts.push({
        alertKey:  "savings_negative",
        type:      "danger",
        icon:      "🔴",
        title:     "You're spending more than you earn!",
        message:   `This month your expenses (₹${thisExp.toFixed(0)}) exceed your income (₹${thisInc.toFixed(0)}). Immediate action needed.`,
        category:  "",
        changePct: null,
      });
    } else if (savingsRate < 10) {
      rawAlerts.push({
        alertKey:  "savings_low",
        type:      "warning",
        icon:      "⚠️",
        title:     `Savings rate is very low (${savingsRate.toFixed(1)}%)`,
        message:   `You're only saving ${savingsRate.toFixed(1)}% of your income this month. Aim for at least 20% for financial stability.`,
        category:  "",
        changePct: null,
      });
    } else if (savingsRate >= 30) {
      rawAlerts.push({
        alertKey:  "savings_excellent",
        type:      "good",
        icon:      "🌟",
        title:     `Excellent savings rate: ${savingsRate.toFixed(1)}%`,
        message:   `You're saving ${savingsRate.toFixed(1)}% of your income this month — well above the recommended 20%. Excellent discipline!`,
        category:  "",
        changePct: null,
      });
    }
  }

  // ── 3. Per-category alerts ───────────────────────────────────────────────
  const thisCatMap = {};
  const lastCatMap = {};
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    thisCatMap[t.category] = (thisCatMap[t.category] || 0) + Number(t.amount);
  });
  lastMonth.filter(t => t.type === "expense").forEach(t => {
    lastCatMap[t.category] = (lastCatMap[t.category] || 0) + Number(t.amount);
  });

  // All categories that appear in either month
  const allCats = [...new Set([...Object.keys(thisCatMap), ...Object.keys(lastCatMap)])];

  for (const cat of allCats) {
    const curr = thisCatMap[cat] || 0;
    const prev = lastCatMap[cat] || 0;
    if (curr < 50 && prev < 50) continue; // skip tiny amounts

    const change = pct(curr, prev);
    if (change === null) continue;

    const built = catAlert(cat, curr, prev, change);
    if (!built) continue;

    rawAlerts.push({
      alertKey:  `cat_${cat.replace(/\W/g, "_")}`,
      type:      built.type,
      icon:      built.icon,
      title:     built.title,
      message:   built.message,
      category:  cat,
      changePct: change,
    });
  }

  // ── 4. High single-category dominance ───────────────────────────────────
  if (thisExp > 0) {
    const sorted = Object.entries(thisCatMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topCat, topAmt] = sorted[0];
      const domPct = (topAmt / thisExp) * 100;
      if (domPct >= 60) {
        rawAlerts.push({
          alertKey:  `cat_dominant_${topCat.replace(/\W/g, "_")}`,
          type:      "warning",
          icon:      "⚠️",
          title:     `${topCat} dominates your expenses (${domPct.toFixed(0)}%)`,
          message:   `${topCat} accounts for ${domPct.toFixed(0)}% of your total spending this month (₹${topAmt.toFixed(0)}). Consider diversifying your budget.`,
          category:  topCat,
          changePct: null,
        });
      }
    }
  }

  // ── 5. No income this month ──────────────────────────────────────────────
  if (thisMonth.length > 0 && thisInc === 0 && thisExp > 0) {
    rawAlerts.push({
      alertKey:  "no_income_this_month",
      type:      "warning",
      icon:      "⚠️",
      title:     "No income recorded this month",
      message:   `You have ₹${thisExp.toFixed(0)} in expenses this month but no income recorded. Add income transactions for accurate savings analysis.`,
      category:  "",
      changePct: null,
    });
  }

  console.log(`[Alerts] Generated ${rawAlerts.length} alerts for user ${userId}`);

  // ── Upsert alerts into MongoDB ───────────────────────────────────────────
  // Preserve dismissed state — only update if NOT already dismissed
  for (const a of rawAlerts) {
    const existing = await Alert.findOne({ userId, alertKey: a.alertKey });

    if (existing && existing.dismissed) {
      // Re-open dismissed alerts if the underlying condition changed significantly
      // (e.g. changePct jumped from 30% to 60% — escalate back to active)
      const escalated =
        existing.type !== a.type &&
        (a.type === "danger" || (a.type === "warning" && existing.type === "good"));

      if (escalated) {
        await Alert.findOneAndUpdate(
          { userId, alertKey: a.alertKey },
          { ...a, userId, dismissed: false, generatedAt: new Date() },
          { upsert: true }
        );
      }
      // Otherwise keep it dismissed — user made a choice
    } else {
      await Alert.findOneAndUpdate(
        { userId, alertKey: a.alertKey },
        { ...a, userId, generatedAt: new Date() },
        { upsert: true }
      );
    }
  }

  // Remove stale alerts whose conditions no longer exist
  const activeKeys = rawAlerts.map(a => a.alertKey);
  await Alert.deleteMany({ userId, alertKey: { $nin: activeKeys } });

  // Return active (non-dismissed) alerts, most severe first
  const priority = { danger: 0, warning: 1, good: 2 };
  const alerts = await Alert.find({ userId, dismissed: false })
    .sort({ generatedAt: -1 });

  return alerts.sort((a, b) => (priority[a.type] ?? 3) - (priority[b.type] ?? 3));
}

/**
 * dismissAlert(userId, alertId)
 * Marks a single alert as dismissed.
 */
async function dismissAlert(userId, alertId) {
  return Alert.findOneAndUpdate(
    { _id: alertId, userId },
    { dismissed: true },
    { new: true }
  );
}

module.exports = { generateAlerts, dismissAlert };
