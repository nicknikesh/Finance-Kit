// Central API base URL — no trailing slash
// Production: reads VITE_API_URL set in Vercel dashboard
// Development: falls back to localhost:5000
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export const API = {
  auth:         `${BASE}/api/auth`,
  transactions: `${BASE}/api/transactions`,
  upload:       `${BASE}/api/upload`,
  report:       `${BASE}/api/report`,
  history:      `${BASE}/api/history`,
  alerts:       `${BASE}/api/alerts`,
  budget:       `${BASE}/api/budget`,
  recurring:    `${BASE}/api/recurring`,
};

export default BASE;
