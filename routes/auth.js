/*
 * =====================================================
 * USER AUTHENTICATION ROUTES
 * =====================================================
 *
 * Is file mein user authentication related saare routes hain:
 *
 * Routes:
 * POST /api/auth/register      - Naya user register karna
 * POST /api/auth/login          - User login (JWT token milta hai)
 * GET  /api/auth/profile        - Logged-in user ki profile (protected)
 * PUT  /api/auth/profile        - User profile update (protected)
 * PUT  /api/auth/change-password - Password change (protected)
 *
 * Technologies:
 * - bcryptjs: Password ko hash karne ke liye
 * - jsonwebtoken (JWT): Authentication token generate/verify
 * - auth middleware: Protected routes ke liye
 */

const express = require("express");
const bcrypt = require("bcryptjs"); // Password hashing library
const jwt = require("jsonwebtoken"); // JWT token generation
const User = require("../models/User"); // User model import
const auth = require("../middleware/auth"); // Auth middleware for protected routes
const router = express.Router(); // Express router instance

// ========================================
// ROUTE 1: USER REGISTRATION
// ========================================
// POST /api/auth/register
// Body: { name, email, password, phone }
// Access: Public (koi bhi register kar sakta hai)
router.post("/register", async (req, res) => {
  try {
    // Step 1: Request body se data nikalo
    const { name, email, password, phone } = req.body;

    // Step 2: Check karo ki email se pehle se user exists karta hai ya nahi
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // Step 3: Password ko hash karo (10 rounds of bcrypt)
    // Plain password kabhi database mein store nahi karte (security)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 4: Naya user object create karo
    const user = new User({
      name: name || email.split("@")[0], // Agar name nahi diya toh email se extract karo
      email,
      password: hashedPassword, // Hashed password store karo
      phone: phone || "", // Phone optional hai
    });

    // Step 5: User ko database mein save karo
    await user.save();

    // Step 6: Success response bhejo
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    // Error handling
    res.status(500).json({ message: err.message });
  }
});

// ========================================
// ROUTE 2: USER LOGIN
// ========================================
// POST /api/auth/login
// Body: { email, password }
// Access: Public
// Returns: JWT token (frontend localStorage mein store karega)
router.post("/login", async (req, res) => {
  try {
    // Step 1: Email aur password nikalo
    const { email, password } = req.body;

    // Step 2: Email se user dhundo database mein
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Step 3: Password verify karo (bcrypt.compare)
    // User ne jo password diya (plain) aur database ka hashed password compare karo
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Step 4: JWT token generate karo
    // Token payload mein userId daal do
    const token = jwt.sign(
      { userId: user._id }, // Payload: user ki ID
      process.env.JWT_SECRET, // Secret key from .env
      { expiresIn: "1d" }, // Token 1 din valid rahega
    );

    // Step 5: Token frontend ko bhej do
    // Frontend isko localStorage mein save karega
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========================================
// ROUTE 3: GET USER PROFILE
// ========================================
// GET /api/auth/profile
// Headers: Authorization: Bearer <token>
// Access: Protected (auth middleware use hota hai)
router.get("/profile", auth, async (req, res) => {
  try {
    // auth middleware ne req.userId set kar diya hai
    // User ko find karo aur password field exclude karo
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // User profile bhej do (password ke bina)
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========================================
// ROUTE 4: UPDATE USER PROFILE
// ========================================
// PUT /api/auth/profile
// Headers: Authorization: Bearer <token>
// Body: { name, email, phone }
// Access: Protected
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Step 1: Agar email change kar rahe hain, toh check karo ki woh email
    // kisi aur user ke paas toh nahi hai
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.userId }, // Apni hi ID exclude karo check se
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email already in use by another user" });
      }
    }

    // Step 2: User profile update karo
    const updatedUser = await User.findByIdAndUpdate(
      req.userId, // Kis user ko update karna hai
      {
        name: name || "",
        email: email || "",
        phone: phone || "",
      },
      {
        new: true, // Updated document return karo
        runValidators: true, // Schema validations run karo
      },
    ).select("-password"); // Password field exclude karo response se

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Updated user profile bhej do
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========================================
// ROUTE 5: CHANGE PASSWORD
// ========================================
// PUT /api/auth/change-password
// Headers: Authorization: Bearer <token>
// Body: { currentPassword, newPassword }
// Access: Protected
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Step 1: Validation - Dono passwords chahiye
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new passwords are required" });
    }

    // Step 2: New password ki length check karo
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    // Step 3: User ko find karo (password field bhi chahiye)
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 4: Current password verify karo
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Step 5: New password ko hash karo
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Step 6: Database mein new password update karo
    await User.findByIdAndUpdate(req.userId, {
      password: hashedNewPassword,
    });

    // Success response
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/*
 * =====================================================
 * AUTHENTICATION WORKFLOW SUMMARY:
 * =====================================================
 *
 * 1. REGISTRATION:
 *    Frontend → POST /api/auth/register → Password Hash → Save to DB
 *
 * 2. LOGIN:
 *    Frontend → POST /api/auth/login → Verify Password → Generate JWT
 *    → Token Frontend ko milta hai → localStorage mein save
 *
 * 3. PROTECTED REQUESTS:
 *    Frontend → Request with Authorization Header → auth middleware
 *    → Token verify → req.userId set → Route handler execute
 *
 * 4. PROFILE OPERATIONS:
 *    - GET profile: Token se userId nikalo → User data bhejo
 *    - UPDATE profile: Token verify → Update data → Response
 *    - CHANGE password: Old verify → New hash → Update
 *
 * =====================================================
 */

// Export router to use in index.js
module.exports = router;
