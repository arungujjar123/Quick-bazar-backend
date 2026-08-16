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

// Get all shop owners (admins)
router.get("/shop-owners", superAdminAuth, async (req, res) => {
  try {
    const shopOwners = await Admin.find({ role: "admin" }).select("-password").sort({ createdAt: -1 });
    
    // Optional: get shop count for each owner
    const ownersWithShops = await Promise.all(shopOwners.map(async (owner) => {
      const shopCount = await Shop.countDocuments({ adminId: owner._id });
      return {
        ...owner.toObject(),
        shopCount
      };
    }));

    res.json(ownersWithShops);
  } catch (error) {
    console.error("SuperAdmin shop owners error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
