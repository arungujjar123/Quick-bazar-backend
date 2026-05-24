/*
 * =====================================================
 * CART MODEL - Database Schema for Shopping Cart
 * =====================================================
 *
 * Yeh schema har user ke liye shopping cart maintain karta hai
 *
 * Fields:
 * - user: Kis user ka cart hai (User reference)
 * - items: Cart mein kaunse products hain (Product references)
 *   - product: Product reference
 *   - quantity: Kitni quantity
 */

const mongoose = require("mongoose");

// ============ Cart Schema Definition ============
const cartSchema = new mongoose.Schema({
  // Kis user ka cart hai - User ID reference
  user: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId
    ref: "User", // User model se reference
    required: true, // User ID mandatory hai
  },

  // Cart mein products ki array
  items: [
    {
      // Product reference - Konsa product cart mein hai
      product: {
        type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId
        ref: "Product", // Product model se reference
      },

      // Is product ki kitni quantity cart mein hai
      quantity: {
        type: Number,
        default: 1, // Default quantity 1 hai
      },
    },
  ],
});

/*
 * Database Collection: carts
 *
 * Example Document:
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   user: "507f191e810c19729de860ea", // User ID reference
 *   items: [
 *     {
 *       product: "507f1f77bcf86cd799439012", // Product ID reference
 *       quantity: 2
 *     },
 *     {
 *       product: "507f1f77bcf86cd799439013",
 *       quantity: 1
 *     }
 *   ]
 * }
 *
 * Note: .populate() method se product details fetch kar sakte hain
 */

// Export the model - Collection name "carts" hoga
module.exports = mongoose.model("Cart", cartSchema);
