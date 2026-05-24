/**
 * =====================================================
 * USER ACTIVITY MODEL - Tracks user behavior for personalization
 * =====================================================
 *
 * Records what users search, view, and purchase to build
 * a personalization profile for the AI agent.
 */

const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Activity type
    action: {
      type: String,
      enum: [
        "search",
        "view_product",
        "add_to_cart",
        "purchase",
        "chat_query",
      ],
      required: true,
    },

    // What was acted on
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    // Category of the product (denormalized for fast aggregation)
    category: {
      type: String,
      default: "",
    },

    // Search query text (for search actions)
    query: {
      type: String,
      default: "",
    },

    // Additional metadata
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient user activity queries
userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ user: 1, action: 1 });

module.exports = mongoose.model("UserActivity", userActivitySchema);
