/*
 * =====================================================
 * CATEGORY MODEL - Database Schema for Product Categories
 * =====================================================
 *
 * Products ko organize karne ke liye categories use hoti hain
 * Example: Electronics, Clothing, Books, Grocery, etc.
 *
 * Fields:
 * - name: Category ka naam (unique)
 * - description: Category ki description
 * - isActive: Category active hai ya nahi
 */

const mongoose = require("mongoose");

// ============ Category Schema Definition ============
const categorySchema = new mongoose.Schema(
  {
    // Category ka naam - Unique hona chahiye
    name: {
      type: String,
      required: true, // Name mandatory hai
      unique: true, // Duplicate category names allowed nahi
    },

    // Category ki description (optional)
    description: {
      type: String,
    },

    // Category active hai ya disabled
    isActive: {
      type: Boolean,
      default: true, // Default active hai
    },
  },
  {
    // Automatically createdAt aur updatedAt fields add karta hai
    timestamps: true,
  },
);

/*
 * Database Collection: categories
 *
 * Example Document:
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   name: "Electronics",
 *   description: "Electronic gadgets and devices",
 *   isActive: true,
 *   createdAt: "2024-01-15T10:30:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z"
 * }
 */

// Export the model - Collection name "categories" hoga
module.exports = mongoose.model("Category", categorySchema);
