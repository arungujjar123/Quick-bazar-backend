/**
 * =====================================================
 * ACTIVITY ROUTES - User behavior tracking for personalization
 * =====================================================
 *
 * Tracks user actions (views, searches, purchases) and
 * generates a personalization profile for the AI agent.
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const UserActivity = require("../models/UserActivity");
const Product = require("../models/Product");

const router = express.Router();

/**
 * Extract userId from auth header (optional — doesn't reject unauthenticated)
 */
const getOptionalUserId = (authHeader) => {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null;
  }
};

/**
 * POST /api/activity/track
 * Log a user action (search, view, add_to_cart, purchase)
 */
router.post("/track", async (req, res) => {
  try {
    const userId = getOptionalUserId(req.headers.authorization);
    if (!userId) {
      return res.json({ success: true, tracked: false });
    }

    const { action, productId, category, query, metadata } = req.body;

    if (
      !action ||
      !["search", "view_product", "add_to_cart", "purchase", "chat_query"].includes(action)
    ) {
      return res.status(400).json({ message: "Invalid action type" });
    }

    // Get category from product if not provided
    let resolvedCategory = category || "";
    if (productId && !resolvedCategory) {
      const product = await Product.findById(productId).select("category");
      if (product) resolvedCategory = product.category || "";
    }

    await UserActivity.create({
      user: userId,
      action,
      productId: productId || undefined,
      category: resolvedCategory,
      query: query || "",
      metadata: metadata || {},
    });

    res.json({ success: true, tracked: true });
  } catch (error) {
    console.error("Activity tracking error:", error.message);
    // Don't fail the request — tracking is non-critical
    res.json({ success: true, tracked: false });
  }
});

/**
 * GET /api/activity/profile
 * Get user's personalization profile (top categories, recent searches, etc.)
 */
router.get("/profile", async (req, res) => {
  try {
    const userId = getOptionalUserId(req.headers.authorization);
    if (!userId) {
      return res.json({ profile: null });
    }

    // Get recent activities (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await UserActivity.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(100);

    if (activities.length === 0) {
      return res.json({ profile: null });
    }

    // Calculate top categories
    const categoryScores = {};
    activities.forEach((activity) => {
      if (!activity.category) return;
      const weight =
        activity.action === "purchase"
          ? 5
          : activity.action === "add_to_cart"
            ? 3
            : activity.action === "view_product"
              ? 2
              : 1;
      categoryScores[activity.category] =
        (categoryScores[activity.category] || 0) + weight;
    });

    const topCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);

    // Get recent searches
    const recentSearches = activities
      .filter((a) => a.action === "search" && a.query)
      .slice(0, 5)
      .map((a) => a.query);

    // Get recently viewed product IDs
    const recentViews = activities
      .filter((a) => a.action === "view_product" && a.productId)
      .slice(0, 5)
      .map((a) => a.productId.toString());

    const profile = {
      topCategories,
      recentSearches,
      recentViews,
      totalActions: activities.length,
      lastActive: activities[0]?.createdAt || null,
    };

    res.json({ profile });
  } catch (error) {
    console.error("Activity profile error:", error.message);
    res.json({ profile: null });
  }
});

module.exports = router;
