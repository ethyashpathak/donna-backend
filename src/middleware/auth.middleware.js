const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "donna-default-jwt-secret-key-123456";

/**
 * Parses cookies manually from the raw cookie header.
 * Avoids requiring cookie-parser package.
 * check
 * 
 */
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
  return cookies;
};

/**
 * Signs a JWT with the user's ID (email)
 */
const signToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
};

/**
 * Verifies a JWT token and returns the decoded payload or null
 */
const verifyToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Middleware that requires a user to be authenticated
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  const decoded = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  req.userId = decoded.userId;
  next();
};

/**
 * Middleware that optionally authenticates a user
 */
const optionalAuth = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.donna_session;
  const decoded = verifyToken(sessionToken);

  if (decoded && decoded.userId) {
    req.userId = decoded.userId;
  }
  next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  signToken,
  verifyToken,
  parseCookies
};
