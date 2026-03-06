const rateLimit = require("express-rate-limit");

// General API Limiter (Standard use)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Stricter Limiter for Sensitive Endpoints (Auth, Email, etc.)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many attempts, please try again later",
  },
});

module.exports = { apiLimiter, authLimiter };
