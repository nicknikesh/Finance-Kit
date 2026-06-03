const mongoose = require("mongoose");

// Cache the connection across serverless invocations
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  // Already connected — reuse
  if (cached.conn) return cached.conn;

  // Connection in progress — wait for it
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      bufferCommands: false,
    }).then(m => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
