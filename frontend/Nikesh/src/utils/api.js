// Central API base URL
// In production: reads from VITE_API_URL env var set in Vercel dashboard
// In development: falls back to localhost:5000
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
