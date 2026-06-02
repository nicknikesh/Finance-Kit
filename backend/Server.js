const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ── 1. CORS — must be FIRST, before every route ────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || "https://finance-kit-yuoc.vercel.app";

const corsOptions = {
  origin: [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "authorization"],
};

app.use(cors(corsOptions));

// ── 2. Handle preflight OPTIONS for every route ────────────────────────────
app.options(/.*/, cors(corsOptions));

// ── 3. Body parser ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// ── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    env: {
      mongo:    !!process.env.MONGO_URL,
      jwt:      !!process.env.JWT_SECRET,
      gemini:   !!process.env.GEMINI_API_KEY,
      frontend: FRONTEND_URL,
    },
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",         require("./Routes/auth"));
app.use("/api/transactions", require("./Routes/transactions"));
app.use("/api/upload",       require("./Routes/upload"));
app.use("/api/report",       require("./Routes/report"));
app.use("/api/history",      require("./Routes/history"));
app.use("/api/alerts",       require("./Routes/alerts"));
app.use("/api/budget",       require("./Routes/budget"));
app.use("/api/recurring",    require("./Routes/recurring"));

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[SERVER ERROR]", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── MongoDB ────────────────────────────────────────────────────────────────
if (process.env.MONGO_URL) {
  mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log("DB Connected"))
    .catch(err => console.error("DB connection failed:", err.message));
} else {
  console.warn("WARNING: MONGO_URL env var is not set!");
}

// ── Local dev only ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.listen(5000, () => console.log("Server running on port 5000"));
}

module.exports = app;