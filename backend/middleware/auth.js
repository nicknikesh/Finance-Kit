const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided." });

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  if (!token) return res.status(401).json({ error: "No token provided." });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};