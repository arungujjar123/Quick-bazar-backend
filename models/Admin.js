/*
 * =====================================================
 * ADMIN MODEL - Database Schema for Admin Users
 * =====================================================
 *
 * Yeh schema admin users ke liye hai jo product/order manage karte hain
 * Admin aur regular users alag-alag collections mein stored hote hain
 *
 * Fields:
 * - name: Admin ka naam
 * - email: Admin email (unique & login ke liye)
 * - password: Hashed password (automatically encrypted)
 * - role: Admin type (admin ya super_admin)
 * - isActive: Admin account active hai ya nahi
 *
 * Special Features:
 * - Pre-save hook: Password automatically hash ho jata hai save se pehle
 * - comparePassword method: Login time password verification
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Password hashing library

// ============ Admin Schema Definition ============
const adminSchema = new mongoose.Schema({
  // Admin ka naam
  name: {
    type: String,
    required: true, // Name mandatory hai
    trim: true, // Extra spaces remove karta hai
  },

  // Admin ka email - Unique hona chahiye
  email: {
    type: String,
    required: true, // Email mandatory hai
    unique: true, // Ek hi email se ek admin account
    lowercase: true, // Automatically lowercase mein convert
    trim: true,
  },

  // Admin ka password - Hash form mein store hoga
  password: {
    type: String,
    required: true,
    minlength: 6, // Minimum 6 characters
  },

  // Admin ki role/permission level
  role: {
    type: String,
    default: "admin", // Default role admin hai
    enum: ["admin", "super_admin"], // Sirf yeh 2 values allowed hain
  },

  // Admin account active hai ya suspended
  isActive: {
    type: Boolean,
    default: true, // Default active hai
  },

  // Admin account creation date
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============ PRE-SAVE HOOK: Automatic Password Hashing ============
// Jab bhi admin save hoga, password automatically hash ho jayega
adminSchema.pre("save", async function (next) {
  // Agar password modified nahi hua, toh hash karne ki zaroorat nahi
  if (!this.isModified("password")) return next();

  try {
    // Salt generate karo (10 rounds)
    const salt = await bcrypt.genSalt(10);

    // Password ko hash karo salt ke saath
    this.password = await bcrypt.hash(this.password, salt);

    // Next middleware ya save operation continue karo
    next();
  } catch (error) {
    next(error);
  }
});

// ============ INSTANCE METHOD: Password Comparison ============
// Login time par password verify karne ke liye
// Usage: const isMatch = await admin.comparePassword(enteredPassword);
adminSchema.methods.comparePassword = async function (candidatePassword) {
  // User ne jo password daala (plain text) aur database mein stored hash ko compare
  return bcrypt.compare(candidatePassword, this.password);
};

/*
 * Database Collection: admins
 *
 * Example Document:
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   name: "Admin Kumar",
 *   email: "admin@minimart.com",
 *   password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZa...", // Hashed
 *   role: "admin",
 *   isActive: true,
 *   createdAt: "2024-01-15T10:30:00.000Z"
 * }
 *
 * Usage Example:
 * const admin = new Admin({ name: "John", email: "john@admin.com", password: "123456" });
 * await admin.save(); // Password automatically hash ho jayega
 * const isValid = await admin.comparePassword("123456"); // true
 */

// Export the model - Collection name "admins" hoga
module.exports = mongoose.model("Admin", adminSchema);
