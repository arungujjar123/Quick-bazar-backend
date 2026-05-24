/*
 * =====================================================
 * ADMIN AUTHENTICATION MIDDLEWARE
 * =====================================================
 *
 * Yeh middleware admin-only routes ko protect karta hai
 * Regular users ko admin panel access nahi karne deta
 *
 * Working:
 * 1. Request headers se admin JWT token nikalta hai
 * 2. Token ko verify karta hai
 * 3. Check karta hai ki token mein isAdmin flag true hai ya nahi
 * 4. Valid admin token hai toh req.admin mein store karke next() call karta hai
 *
 * Difference from auth.js:
 * - auth.js: Regular user authentication (userId check)
 * - adminAuth.js: Admin authentication (isAdmin flag check)
 */

const jwt = require("jsonwebtoken");

// ============ ADMIN AUTH MIDDLEWARE FUNCTION ============
const adminAuth = (req, res, next) => {
  try {
    // Step 1: Token nikalo - 2 tarike se try karte hain

    // Method 1: x-auth-token header se (legacy support)
    let token = req.header("x-auth-token");

    // Method 2: Authorization header se (Bearer token format)
    if (!token) {
      const authHeader = req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        // "Bearer " ke baad ka token nikalo
        token = authHeader.substring(7); // "Bearer " = 7 characters
      }
    }

    // Agar token hi nahi mila
    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    // Step 2: Token ko verify karo using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 3: Check karo ki token mein isAdmin flag true hai ya nahi
    // Regular user ka token hai toh access denied
    if (!decoded.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    // Step 4: Valid admin hai, toh req.admin mein decoded data store karo
    // Decoded data: { id, email, isAdmin: true }
    req.admin = decoded;

    // Step 5: Next middleware ya route handler call karo
    next();
  } catch (error) {
    // Token invalid/expired hai
    res.status(401).json({ message: "Token is not valid" });
  }
};

/*
 * =====================================================
 * ADMIN AUTHENTICATION FLOW:
 * =====================================================
 *
 * 1. Admin Login (routes/admin.js):
 *    Admin login karta hai → JWT token generate
 *    Token payload: { id, email, isAdmin: true }
 *
 * 2. Frontend Storage:
 *    Token localStorage mein save
 *    localStorage.setItem('adminToken', token)
 *
 * 3. Admin Panel Request:
 *    Frontend admin endpoint call karta hai
 *    Headers: { Authorization: "Bearer <admin-token>" }
 *
 * 4. Middleware Check:
 *    → Token verify → isAdmin check → Access granted/denied
 *
 * 5. Difference from Regular User:
 *    Regular user token mein isAdmin = false ya undefined
 *    Admin token mein isAdmin = true (mandatory)
 *
 * =====================================================
 */

// Export the middleware
module.exports = adminAuth;
