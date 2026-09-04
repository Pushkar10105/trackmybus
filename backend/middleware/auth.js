// middleware/auth.js
// Provides the `requireAuth` factory function that creates Express
// middleware for protecting routes that need a valid JWT token.
//
// Usage in a route file:
//   const { requireAuth } = require("../middleware/auth");
//   router.post("/trip/start", requireAuth("driver"), handler);

const jwt = require("jsonwebtoken");

/**
 * requireAuth(role)
 *
 * Returns an Express middleware function that:
 *  1. Reads the "Authorization: Bearer <token>" header.
 *  2. Verifies the token is valid and not expired using JWT_SECRET.
 *  3. Optionally checks that the token's role matches the required role.
 *  4. Attaches the decoded payload to req.user so route handlers can
 *     read req.user.user_id, req.user.role, req.user.bus_id, etc.
 *
 * @param {string|null} role  - Required role (e.g. "driver", "admin").
 *                              Pass null to only require a valid token
 *                              without a specific role check.
 */
function requireAuth(role = null) {
  return function (req, res, next) {
    try {
      // 1. Extract the token from the Authorization header
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7) // remove "Bearer " prefix
        : null;

      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: "Server is missing JWT_SECRET" });
      }

      // 2. Verify the token; throws if invalid or expired
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Role check (if a specific role was requested)
      if (role && decoded.role !== role) {
        return res
          .status(403)
          .json({ error: `Forbidden: requires role '${role}'` });
      }

      // 4. Attach decoded payload so handlers can use req.user
      req.user = decoded;
      next(); // continue to the actual route handler
    } catch (err) {
      // jwt.verify throws JsonWebTokenError / TokenExpiredError
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = { requireAuth };
