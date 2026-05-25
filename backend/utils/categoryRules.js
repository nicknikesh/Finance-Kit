/**
 * categoryRules.js — Smart Auto Transaction Categorization
 * ─────────────────────────────────────────────────────────
 * Keyword-based category detection for bank statement transactions.
 * Categories: Food, Travel, Shopping, Bills, Salary, Entertainment, Health, Others
 *
 * Usage:
 *   const { detectCategory, CATEGORIES, CATEGORY_META } = require("../utils/categoryRules");
 *   const category = detectCategory("swiggy order 123"); // → "Food"
 */

// ── Canonical category list ────────────────────────────────────────────────────
const CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Salary",
  "Entertainment",
  "Health",
  "Others",
];

// ── Category metadata: emoji, color for UI rendering ──────────────────────────
const CATEGORY_META = {
  Food:          { emoji: "🍔", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  Travel:        { emoji: "✈️",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  Shopping:      { emoji: "🛍️",  color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  Bills:         { emoji: "🧾",  color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  Salary:        { emoji: "💰",  color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  Entertainment: { emoji: "🎬",  color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  Health:        { emoji: "🏥",  color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  Others:        { emoji: "📦",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

// ── Keyword rules (ordered by priority — first match wins) ────────────────────
const CATEGORY_RULES = [
  // ── Salary / Income ─────────────────────────────────────────────────────────
  {
    category: "Salary",
    keywords: [
      "salary", "sal credit", "payroll", "stipend", "wages", "ctc",
      "pay credit", "monthly pay", "compensation", "income credit",
      "employer", "hike", "appraisal", "bonus credit",
    ],
  },

  // ── Food ────────────────────────────────────────────────────────────────────
  {
    category: "Food",
    keywords: [
      "swiggy", "zomato", "dominos", "pizza hut", "pizza",
      "blinkit", "dunzo", "bigbasket", "grofer", "fresh",
      "kirana", "mcdonald", "burger king", "kfc", "subway",
      "cafe", "restaurant", "hotel bill", "dining", "eatery",
      "food", "snack", "bakery", "chai", "tea", "coffee",
      "starbucks", "barista", "haldiram", "biryani", "ccd",
    ],
  },

  // ── Travel ──────────────────────────────────────────────────────────────────
  {
    category: "Travel",
    keywords: [
      "uber", "ola", "rapido", "redbus", "irctc", "airline",
      "indigo", "spicejet", "air india", "makemytrip", "yatra",
      "flight", "metro", "train", "cab", "taxi", "bus",
      "airport", "railway", "booking.com", "goibibo", "mmt",
      "fuel", "petrol", "diesel", "toll", "parking", "transport",
      "namo", "dmrc", "auto fare",
    ],
  },

  // ── Shopping ────────────────────────────────────────────────────────────────
  {
    category: "Shopping",
    keywords: [
      "amazon", "flipkart", "myntra", "meesho", "nykaa",
      "ajio", "snapdeal", "shopsy", "retail", "mart", "mall",
      "decathlon", "puma", "nike", "adidas", "lenskart",
      "clovia", "firstcry", "jiomart", "reliance", "bigbazar",
      "dmart", "croma", "vijay sales", "lifestyle", "shoppers stop",
      "westside", "h&m", "zara", "fashion", "clothing", "apparel",
    ],
  },

  // ── Entertainment ───────────────────────────────────────────────────────────
  {
    category: "Entertainment",
    keywords: [
      "netflix", "spotify", "hotstar", "youtube", "prime",
      "disney", "jio cinema", "zee5", "sonyliv", "mxplayer",
      "subscription", "recharge", "dth", "tata play", "airtel tv",
      "bookmyshow", "pvr", "inox", "movie", "theatre", "concert",
      "gaming", "steam", "playstation", "xbox", "epic games",
      "music", "podcast", "audible",
    ],
  },

  // ── Bills / Utilities ───────────────────────────────────────────────────────
  {
    category: "Bills",
    keywords: [
      "electricity", "electric", "bescom", "msedcl", "tata power",
      "water", "gas", "piped gas", "broadband", "wifi", "internet",
      "bill", "utility", "bsnl", "jio broadband", "act fibernet",
      "hathway", "spectranet", "airtel broadband", "dish tv",
      "rent", "housing", "maintenance", "society", "flat",
      "apartment", "lease", "emi", "loan payment", "bajaj finance",
      "hdfc loan", "icici loan", "axis loan", "lic premium",
      "insurance premium", "insurance", "tax payment", "gst",
    ],
  },

  // ── Health ──────────────────────────────────────────────────────────────────
  {
    category: "Health",
    keywords: [
      "hospital", "pharmacy", "apollo", "medplus", "medicine",
      "clinic", "doctor", "health", "chemist", "pharmeasy",
      "netmeds", "1mg", "tata 1mg", "lab test", "pathology",
      "blood test", "x-ray", "scan", "mri", "dental", "eye",
      "optician", "medico", "wellness", "ayurveda", "gym",
      "fitness", "yoga", "cult fit", "healthkart",
    ],
  },
];

/**
 * detectCategory(description)
 * Scans the transaction description against keyword rules.
 * Returns the matched category name, or "Others" if no match.
 *
 * @param {string} description - Transaction narration/description text
 * @returns {string} - One of the CATEGORIES values
 */
function detectCategory(description) {
  const lower = (description || "").toLowerCase().trim();
  if (!lower) return "Others";

  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return "Others";
}

/**
 * getCategoryMeta(category)
 * Returns the emoji, color, and bg for a given category.
 *
 * @param {string} category
 * @returns {{ emoji: string, color: string, bg: string }}
 */
function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META["Others"];
}

module.exports = { detectCategory, getCategoryMeta, CATEGORIES, CATEGORY_META, CATEGORY_RULES };
