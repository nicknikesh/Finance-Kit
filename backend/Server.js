const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./utils/connectDB");
require("dotenv").config();

const app = express();

// ── 1. CORS — must be FIRST ────────────────────────────────────────────────
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
app.options(/.*/, cors(corsOptions));

// ── 2. Body parser ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));

// ── 3. DB middleware — awaits connection before EVERY request ──────────────
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ── Root ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ name: "Finance Kit API", status: "running" });
});

// ── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: "ok",
    db: dbState === 1 ? "connected" : "disconnected",
    dbState,
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

// ── Local dev only ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  connectDB()
    .then(() => app.listen(5000, () => console.log("Server running on port 5000")))
    .catch(err => console.error("DB failed:", err.message));
}

module.exports = app;