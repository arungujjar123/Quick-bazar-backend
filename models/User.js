/*
 * =====================================================
 * USER MODEL - Database Schema for Regular Users
 * =====================================================
 *
 * Yeh schema define karta hai ki user ka data database mein
 * kaise store hoga.
 *
 * Fields:
 * - name: User ka naam
 * - email: Unique email (login ke liye)
 * - password: Hashed password (bcrypt se encrypted)
 * - phone: Optional phone number
 * - timestamps: Automatically createdAt aur updatedAt add karta hai
 */

const mongoose = require("mongoose");

// ============ User Schema Definition ============
const userSchema = new mongoose.Schema(
  {
    // User ka naam - Required field
    name: {
      type: String,
      required: true, // Name mandatory hai
      trim: true, // Extra spaces remove kar dega
      maxlength: 100, // Maximum 100 characters
    },

    // User ki email - Unique honi chahiye
    email: {
      type: String,
      required: true, // Email mandatory hai
      unique: true, // Duplicate emails allowed nahi hain
      lowercase: true, // Automatically lowercase mein convert hoga
      trim: true, // Extra spaces remove kar dega
    },

    // User ka password - Hashed form mein store hoga
    password: {
      type: String,
      required: true, // Password mandatory hai
      minlength: 6, // Minimum 6 characters
    },

    // User ka phone number - Optional field
    phone: {
      type: String,
      default: "", // Agar provide nahi kiya toh empty string
      trim: true,
      maxlength: 15, // Maximum 15 characters
    },
  },
  {
    // Automatically createdAt aur updatedAt fields add kar dega
    timestamps: true,
  },
);

/*
 * Database Collection: users
 *
 * Example Document:
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   name: "Rahul Kumar",
 *   email: "rahul@example.com",
 *   password: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZa...", // Hashed
 *   phone: "9876543210",
 *   createdAt: "2024-01-15T10:30:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z"
 * }
 */

// Export the model - Collection name "users" hoga database mein
module.exports = mongoose.model("User", userSchema);
