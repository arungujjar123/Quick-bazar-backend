/*
 * =====================================================
 * ORDER MODEL - Database Schema for Customer Orders
 * =====================================================
 *
 * Jab user checkout karta hai, tab order create hota hai
 *
 * Fields:
 * - user: Kis user ne order kiya (User reference)
 * - items: Order mein kaunse products (Product references with quantity & price)
 * - total_amount: Total order amount
 * - payment_method: Payment ka tarika (COD/Online)
 * - payment_status: Payment ki status
 * - order_status: Order ki current status
 * - shipping_address: Delivery address
 * - createdAt: Order kab create hua
 */

const mongoose = require("mongoose");

// ============ Order Schema Definition ============
const orderSchema = new mongoose.Schema({
  // Kis user ne order kiya - User ID reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // User model se reference
    required: true,
  },

  // Order mein products ki details
  items: [
    {
      // Product reference
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },

      // Shop reference for the item
      shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },

      // Product ki quantity order mein
      quantity: Number,

      // Product ki price order time par (future price changes se protect)
      price: Number, // Price at time of order
    },
  ],

  // Total order amount (sabhi items ki price * quantity)
  total_amount: Number,

  // Payment method: "cod" (Cash on Delivery) ya "online"
  payment_method: {
    type: String,
    default: "cod",
  },

  // Payment status: "pending", "completed", "failed"
  payment_status: {
    type: String,
    default: "pending",
  },

  // Order status: "confirmed", "processing", "shipped", "delivered"
  order_status: {
    type: String,
    default: "confirmed",
  },

  // Delivery address (user ka address)
  shipping_address: String,

  // Order creation time
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/*
 * Database Collection: orders
 *
 * Example Document:
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   user: "507f191e810c19729de860ea",
 *   items: [
 *     {
 *       product: "507f1f77bcf86cd799439012",
 *       shop: "507f1f77bcf86cd799439099",
 *       quantity: 2,
 *       price: 699
 *     }
 *   ],
 *   total_amount: 1398,
 *   payment_method: "cod",
 *   payment_status: "pending",
 *   order_status: "confirmed",
 *   shipping_address: "123 Main St, Mumbai, Maharashtra 400001",
 *   createdAt: "2024-01-15T10:30:00.000Z"
 * }
 */

// Export the model - Collection name "orders" hoga
module.exports = mongoose.model("Order", orderSchema);
