/**
 * recurringService.js
 * ─────────────────────────────────────────────────────────────────
 * Detects recurring payments from a user's transaction history.
 *
 * Algorithm:
 * 1. Build a fingerprint (merchantKey) from each transaction description
 *    using a known-merchant dictionary + fuzzy normalization.
 * 2. Group transactions by (merchantKey + similar amount ±10%).
 * 3. Check if the group has ≥2 occurrences with intervals of 20–40 days
 *    (monthly), 300–400 days (yearly), or 5–9 days (weekly).
 * 4. Upsert RecurringPayment documents.
 */

const Transaction      = require("../models/Transaction");
const RecurringPayment = require("../models/RecurringPayment");

// ── Known merchant signatures ─────────────────────────────────────────────────
const KNOWN_MERCHANTS = [
  // Streaming
  { key:"netflix",      name:"Netflix",       icon:"🎬", category:"Entertainment", keywords:["netflix"] },
  { key:"spotify",      name:"Spotify",       icon:"🎵", category:"Entertainment", keywords:["spotify"] },
  { key:"hotstar",      name:"Disney+Hotstar", icon:"🎥", category:"Entertainment", keywords:["hotstar","disney+","disneyplus"] },
  { key:"primevideo",   name:"Amazon Prime",  icon:"📺", category:"Entertainment", keywords:["prime video","primevideo","amazon prime"] },
  { key:"youtube",      name:"YouTube Premium",icon:"▶️",category:"Entertainment", keywords:["youtube premium","youtube music"] },
  { key:"zee5",         name:"Zee5",          icon:"📡", category:"Entertainment", keywords:["zee5"] },
  { key:"sonyliv",      name:"SonyLiv",       icon:"📡", category:"Entertainment", keywords:["sonyliv"] },
  { key:"jiocinema",    name:"JioCinema",     icon:"🎞️", category:"Entertainment", keywords:["jio cinema","jiocinema"] },
  // Internet / Phone
  { key:"airtel",       name:"Airtel",        icon:"📶", category:"Bills",         keywords:["airtel broadband","airtel recharge","airtel bill","airtel prepaid","airtel postpaid"] },
  { key:"jio",          name:"Jio",           icon:"📶", category:"Bills",         keywords:["jio bill","jio recharge","jio broadband","jio postpaid","jio prepaid"] },
  { key:"bsnl",         name:"BSNL",          icon:"📶", category:"Bills",         keywords:["bsnl bill","bsnl broadband","bsnl recharge"] },
  { key:"act",          name:"ACT Fibernet",  icon:"🌐", category:"Bills",         keywords:["act fibernet","act broadband","act internet"] },
  { key:"hathway",      name:"Hathway",       icon:"🌐", category:"Bills",         keywords:["hathway"] },
  // Utilities
  { key:"electricity",  name:"Electricity",   icon:"⚡", category:"Bills",         keywords:["bescom","msedcl","electricity bill","tata power","adani electricity","bses","tneb","cesc"] },
  { key:"gas",          name:"Gas Bill",      icon:"🔥", category:"Bills",         keywords:["piped gas","indane gas","hp gas","bharatgas","gas bill","png bill"] },
  { key:"water",        name:"Water Bill",    icon:"💧", category:"Bills",         keywords:["water bill","water tax","municipal water"] },
  // Rent / Housing
  { key:"rent",         name:"Rent",          icon:"🏠", category:"Bills",         keywords:["rent","house rent","room rent","flat rent","pg rent","accommodation"] },
  // Finance
  { key:"emi",          name:"EMI / Loan",    icon:"💳", category:"Bills",         keywords:["emi","loan payment","loan emi","loan repayment","hdfc loan","icici loan","axis loan","bajaj finance emi","sbi loan"] },
  { key:"lic",          name:"LIC Premium",   icon:"🛡️", category:"Bills",         keywords:["lic premium","life insurance premium","lic policy"] },
  { key:"insurance",    name:"Insurance",     icon:"🛡️", category:"Bills",         keywords:["insurance premium","health insurance","car insurance","bike insurance","term insurance"] },
  // Food / Grocery subscriptions
  { key:"bigbasket",    name:"BigBasket",     icon:"🛒", category:"Food",          keywords:["bigbasket","bb daily"] },
  { key:"swiggy",       name:"Swiggy",        icon:"🍔", category:"Food",          keywords:["swiggy"] },
  { key:"zomato",       name:"Zomato",        icon:"🍕", category:"Food",          keywords:["zomato"] },
  // Fitness
  { key:"cultfit",      name:"Cult.fit",      icon:"🏋️", category:"Health",        keywords:["cult fit","cult.fit","curefit"] },
  { key:"gym",          name:"Gym",           icon:"🏋️", category:"Health",        keywords:["gym membership","gym fees","fitness membership"] },
];

// ── Normalize a description to a merchantKey ──────────────────────────────────
function getMerchantMatch(description) {
  const lower = (description || "").toLowerCase().trim();
  for (const m of KNOWN_MERCHANTS) {
    if (m.keywords.some(kw => lower.includes(kw))) return m;
  }
  return null;
}

// ── Median of a numeric array ─────────────────────────────────────────────────
function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Detect interval ───────────────────────────────────────────────────────────
function detectInterval(dates) {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24)); // days
  }
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  if (avg >= 5  && avg <= 9)   return { days: 7,   label: "Weekly" };
  if (avg >= 20 && avg <= 45)  return { days: 30,  label: "Monthly" };
  if (avg >= 55 && avg <= 100) return { days: 90,  label: "Quarterly" };
  if (avg >= 300 && avg <= 400) return { days: 365, label: "Yearly" };
  return null;
}

// ── Next expected date ────────────────────────────────────────────────────────
function nextExpected(lastDate, intervalDays) {
  const d = new Date(lastDate);
  d.setDate(d.getDate() + intervalDays);
  return d;
}

// ── Core detection function ───────────────────────────────────────────────────
async function detectRecurring(userId) {
  console.log(`[Recurring] Running detection for user ${userId}`);

  // Fetch all expense transactions (up to 2 years)
  const since = new Date(); since.setFullYear(since.getFullYear() - 2);
  const txs = await Transaction.find({
    userId,
    type: "expense",
    date: { $gte: since },
  }).sort({ date: 1 });

  console.log(`[Recurring] Analyzing ${txs.length} transactions`);

  // Group by merchantKey
  const groups = {}; // key → { merchant, txs: [] }
  for (const tx of txs) {
    const match = getMerchantMatch(tx.description);
    if (!match) continue;
    if (!groups[match.key]) groups[match.key] = { merchant: match, txs: [] };
    groups[match.key].txs.push(tx);
  }

  const detected = [];

  for (const [key, { merchant, txs: grpTxs }] of Object.entries(groups)) {
    if (grpTxs.length < 2) continue; // need at least 2 to be "recurring"

    const amounts = grpTxs.map(t => Number(t.amount));
    const dates   = grpTxs.map(t => new Date(t.date));
    const med     = median(amounts);

    // Filter to txs within ±20% of median amount
    const filtered = grpTxs.filter(t => {
      const ratio = Number(t.amount) / med;
      return ratio >= 0.8 && ratio <= 1.2;
    });

    if (filtered.length < 2) continue;

    const filteredDates = filtered.map(t => new Date(t.date));
    const interval = detectInterval(filteredDates);
    if (!interval) continue; // no consistent interval

    const sortedDates = [...filteredDates].sort((a, b) => a - b);
    const lastCharged  = sortedDates[sortedDates.length - 1];
    const firstSeen    = sortedDates[0];
    const next         = nextExpected(lastCharged, interval.days);

    detected.push({
      merchantKey:   key,
      merchantName:  merchant.name,
      category:      merchant.category,
      icon:          merchant.icon,
      amount:        Math.round(med * 100) / 100,
      intervalDays:  interval.days,
      intervalLabel: interval.label,
      firstSeen,
      lastCharged,
      nextExpected:  next,
      transactionIds: filtered.map(t => t._id),
      occurrences:   filtered.length,
      isActive:      (new Date() - lastCharged) / (1000 * 60 * 60 * 24) < interval.days * 2,
    });
  }

  console.log(`[Recurring] Detected ${detected.length} recurring payments`);

  // Upsert each detected pattern
  for (const d of detected) {
    await RecurringPayment.findOneAndUpdate(
      { userId, merchantKey: d.merchantKey },
      { userId, ...d, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  // Remove stale entries (merchant no longer appears)
  const activeKeys = detected.map(d => d.merchantKey);
  await RecurringPayment.deleteMany({
    userId,
    merchantKey: { $nin: activeKeys },
    isDismissed: false,
  });

  return RecurringPayment.find({ userId, isDismissed: false }).sort({ nextExpected: 1 });
}

module.exports = { detectRecurring, getMerchantMatch };
