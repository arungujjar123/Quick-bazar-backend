/*
 * =====================================================
 * USER AUTHENTICATION MIDDLEWARE
 * =====================================================
 *
 * Yeh middleware protected routes ko secure karta hai
 * JWT token verify karke user ki identity check karta hai
 *
 * Working:
 * 1. Request headers se JWT token nikalta hai
 * 2. Token ko verify karta hai (JWT_SECRET se)
 * 3. Valid token hai toh userId extract karke req.userId mein store karta hai
 * 4. Invalid/missing token hai toh 401 error bhejta hai
 *
 * Usage:
 * router.get('/profile', auth, async (req, res) => {
 *   const user = await User.findById(req.userId); // userId middleware ne add kiya
 * });
 */

const jwt = require("jsonwebtoken");

// ============ AUTH MIDDLEWARE FUNCTION ============
module.exports = (req, res, next) => {
  // Step 1: Authorization header se token nikalo
  // Format: "Bearer <token>"
  const authHeader = req.headers.authorization;

  // Agar authorization header hi nahi hai
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  // Step 2: "Bearer " ko remove karke actual token nikalo
  // authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5..."
  // token = "eyJhbGciOiJIUzI1NiIsInR5..."
  const token = authHeader.split(" ")[1];

  try {
    // Step 3: JWT token ko verify karo
    // .env file se JWT_SECRET use karke decode karta hai
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 4: Decoded token se userId nikalo aur req object mein add karo
    // Ab agli middleware ya route handler mein req.userId available hoga
    req.userId = decoded.userId;

    // Step 5: Next middleware/route handler ko call karo
    next();
  } catch (err) {
    // Agar token invalid hai, expired hai, ya verify fail hua
    res.status(401).json({ message: "Invalid token" });
  }
};

/*
 * =====================================================
 * TOKEN VERIFICATION FLOW:
 * =====================================================
 *
 * 1. Frontend Login (routes/auth.js):
 *    User login karta hai → JWT token generate hota hai
 *    Token format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * 2. Frontend Storage:
 *    Token localStorage mein store hota hai
 *    localStorage.setItem('token', token)
 *
 * 3. Protected API Request:
 *    Frontend protected endpoint call karta hai
 *    Headers: { Authorization: "Bearer <token>" }
 *
 * 4. Middleware Verification:
 *    → Token extract → Verify → userId add → Next()
 *
 * 5. Route Handler:
 *    req.userId se user identify karke data bhej do
 *
 * =====================================================
 */
