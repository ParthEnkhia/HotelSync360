const jwt = require("jsonwebtoken");

let didWarnMissingJwtSecret = false;
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && !didWarnMissingJwtSecret) {
    didWarnMissingJwtSecret = true;
    console.warn(
      "JWT_SECRET is not set. Falling back to an insecure default; set JWT_SECRET in the environment."
    );
  }
  return secret || "supersecretkey";
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const headerValue = String(authHeader).trim();
  const token = headerValue.toLowerCase().startsWith("bearer ")
    ? headerValue.slice(7).trim()
    : headerValue;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = authMiddleware;
