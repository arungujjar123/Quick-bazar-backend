/*
 * =====================================================
 * PRODUCT MODEL - Database Schema for Products
 * =====================================================
 *
 * Yeh schema define karta hai product ka structure
 *
 * Fields:
 * - name: Product ka naam
 * - description: Product ki details
 * - price: Product ki price (INR mein)
 * - image: Product image URL/path
 * - imageUrl: Alternative image URL
 * - category: Product category (Electronics, Clothing, etc.)
 * - stock: Available quantity
 */

const mongoose = require("mongoose");

// ============ Product Schema Definition ============
const productSchema = new mongoose.Schema(
  {
    // Product ka naam - Required
    name: {
      type: String,
      required: true, // Product name mandatory hai
    },

    // Product ki description/details - Required
    description: {
      type: String,
      required: true, // Description mandatory hai
    },

    // Product ki price (INR mein) - Required
    price: {
      type: Number,
      required: true, // Price mandatory hai
    },

    // Product ki image (URL ya file path)
    image: String,

    // Alternative image URL (backward compatibility ke liye)
    imageUrl: String,

    // Product ki category - Required
    category: {
      type: String,
      required: true, // Category mandatory hai
    },

    // Shop reference (local marketplace)
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },

    // Available stock/quantity
    stock: {
      type: Number,
      default: 0, // Default stock 0 hai
    },
  },
  {
    // Automatically createdAt aur updatedAt fields add karta hai
    timestamps: true,
  },
);

// Expose stock availability for clients
productSchema.virtual("inStock").get(function () {
  return (this.stock || 0) > 0;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

/*
 * Database Collection: products
 *
 * Example Document:
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   name: "Samsung Galaxy S21",
 *   description: "Latest flagship smartphone with amazing features",
 *   price: 69999,
 *   image: "https://example.com/samsung-s21.jpg",
 *   imageUrl: "https://example.com/samsung-s21.jpg",
 *   category: "Electronics",
 *   shop: "507f1f77bcf86cd799439099",
 *   stock: 50,
 *   createdAt: "2024-01-15T10:30:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z"
 * }
 */

// Export the model - Collection name "products" hoga
module.exports = mongoose.model("Product", productSchema);
