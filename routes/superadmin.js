const express = require("express");
const router = express.Router();
const superAdminAuth = require("../middleware/superAdminAuth");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const User = require("../models/User");
const Admin = require("../models/Admin");

// Get Global Dashboard Statistics
router.get("/dashboard-stats", superAdminAuth, async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const totalUsers = await User.countDocuments();

    const deliveredOrders = await Order.find({ order_status: "delivered" });
    const pendingOrdersCount = await Order.countDocuments({ order_status: "pending" });
    const totalOrders = await Order.countDocuments();

    let totalPlatformRevenue = 0;
    let totalCommissions = 0;

    deliveredOrders.forEach((order) => {
      totalPlatformRevenue += order.total_amount || 0;
      totalCommissions += order.platform_commission || 0;
    });

    // Recent orders across the platform
    const recentOrders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        totalShops,
        totalUsers,
        totalOrders,
        pendingOrders: pendingOrdersCount,
        totalPlatformRevenue,
        totalCommissions,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("SuperAdmin stats error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

const Product = require("../models/Product");

// Get all shop owners (admins)
router.get("/shop-owners", superAdminAuth, async (req, res) => {
  try {
    const shopOwners = await Admin.find({ role: "admin" }).select("-password").sort({ createdAt: -1 });
    
    // Get shops and shop count for each owner
    const ownersWithShops = await Promise.all(shopOwners.map(async (owner) => {
      const shops = await Shop.find({ owner: owner._id }).select("_id name address city pincode isActive deliveryRadiusKm createdAt");
      return {
        ...owner.toObject(),
        shops,
        shopCount: shops.length
      };
    }));

    res.json(ownersWithShops);
  } catch (error) {
    console.error("SuperAdmin shop owners error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a shop owner (and all their shops & products)
router.delete("/shop-owners/:id", superAdminAuth, async (req, res) => {
  try {
    const ownerId = req.params.id;
    const owner = await Admin.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Shop owner not found" });
    }

    // Find all shops owned by this user
    const shops = await Shop.find({ owner: ownerId });
    const shopIds = shops.map((s) => s._id);

    // Delete products, shops, and owner record
    await Product.deleteMany({ shop: { $in: shopIds } });
    await Shop.deleteMany({ owner: ownerId });
    await Admin.findByIdAndDelete(ownerId);

    res.json({ message: "Shop owner and associated shops/products deleted successfully" });
  } catch (error) {
    console.error("SuperAdmin delete shop owner error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all platform shops
router.get("/shops", superAdminAuth, async (req, res) => {
  try {
    const shops = await Shop.find().populate("owner", "name email").sort({ createdAt: -1 });
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const productCount = await Product.countDocuments({ shop: shop._id });
        return {
          ...shop.toObject(),
          productCount,
        };
      })
    );
    res.json(shopsWithCounts);
  } catch (error) {
    console.error("SuperAdmin get shops error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a particular shop (superadmin only)
router.delete("/shops/:id", superAdminAuth, async (req, res) => {
  try {
    const shopId = req.params.id;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Delete all products associated with this shop
    await Product.deleteMany({ shop: shopId });

    // Delete the shop
    await Shop.findByIdAndDelete(shopId);

    res.json({ message: `Shop "${shop.name}" and all its products deleted successfully` });
  } catch (error) {
    console.error("SuperAdmin delete shop error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
