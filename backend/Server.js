const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ── CORS — allow all Vercel deployments + localhost dev ─────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowed = [
      // Local development
      /^http:\/\/localhost:\d+$/,
      // Any Vercel deployment (production + preview URLs)
      /^https:\/\/.*\.vercel\.app$/,
    ];

    const isAllowed = allowed.some(pattern => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "authorization"],
}));

// Handle OPTIONS preflight for all routes
app.options("*", cors());

app.use(express.json());

// Routes
app.use("/api/auth",         require("./Routes/auth"));
app.use("/api/transactions", require("./Routes/transactions"));
app.use("/api/upload",       require("./Routes/upload"));
app.use("/api/report",       require("./Routes/report"));
app.use("/api/history",      require("./Routes/history"));
app.use("/api/alerts",       require("./Routes/alerts"));
app.use("/api/budget",       require("./Routes/budget"));
app.use("/api/recurring",    require("./Routes/recurring"));

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

// Local dev: listen on port; Vercel: export app
if (process.env.NODE_ENV !== "production") {
  app.listen(5000, () => console.log("Server running on port 5000"));
}

module.exports = app;