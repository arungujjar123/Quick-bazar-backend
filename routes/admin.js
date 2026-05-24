const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const adminAuth = require("../middleware/adminAuth");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Category = require("../models/Category");
const Shop = require("../models/Shop");

const getAdminShopIds = async (adminId) => {
  const shops = await Shop.find({ owner: adminId }).select("_id");
  return shops.map((shop) => shop._id);
};

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes are working!" });
});

// Admin Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // Secret key for admin registration (security measure)
    const ADMIN_SECRET_KEY =
      process.env.ADMIN_SECRET_KEY || "MINIMART_ADMIN_2024";

    console.log("Admin registration attempt:", {
      name,
      email,
      hasPassword: !!password,
      secretKey: secretKey,
      expectedSecretKey: ADMIN_SECRET_KEY,
    });

    if (!secretKey) {
      console.log("No secret key provided");
      return res
        .status(403)
        .json({ message: "Secret key is required for admin registration" });
    }

    if (secretKey !== ADMIN_SECRET_KEY) {
      console.log(
        "Invalid secret key:",
        secretKey,
        "Expected:",
        ADMIN_SECRET_KEY,
      );
      return res
        .status(403)
        .json({ message: "Invalid secret key for admin registration" });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin with this email already exists" });
    }

    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      password, // Will be hashed by the pre-save middleware
    });

    const admin = await newAdmin.save();

    // Generate JWT token
    const payload = {
      id: admin._id,
      email: admin.email,
      isAdmin: true,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          admin: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
          },
          message: "Admin registered successfully",
        });
      },
    );
  } catch (error) {
    console.error("Admin registration error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // First check database for registered admin
    const admin = await Admin.findOne({ email, isActive: true });

    if (admin) {
      // Database admin login
      const isMatch = await admin.comparePassword(password);

      if (isMatch) {
        const payload = {
          id: admin._id,
          email: admin.email,
          isAdmin: true,
        };

        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: "24h" },
          (err, token) => {
            if (err) throw err;
            res.json({
              success: true,
              token,
              admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
              },
            });
          },
        );
      } else {
        res.status(401).json({ message: "Invalid admin credentials" });
      }
    } else {
      // Fallback to demo credentials for backward compatibility
      const ADMIN_EMAIL = "admin@minimart.com";
      const ADMIN_PASSWORD = "admin123";

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const payload = {
          id: "demo-admin",
          email: ADMIN_EMAIL,
          isAdmin: true,
        };

        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: "24h" },
          (err, token) => {
            if (err) throw err;
            res.json({
              success: true,
              token,
              admin: {
                id: "demo-admin",
                email: ADMIN_EMAIL,
                name: "Demo Administrator",
              },
            });
          },
        );
      } else {
        res.status(401).json({ message: "Invalid admin credentials" });
      }
    }
  } catch (error) {
    console.error("Admin login error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Dashboard Statistics
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    const shopIds = await getAdminShopIds(req.admin.id);
    if (shopIds.length === 0) {
      return res.json({
        stats: {
          totalProducts: 0,
          totalUsers: await User.countDocuments(),
          totalOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
        },
        recentOrders: [],
      });
    }

    const totalProducts = await Product.countDocuments({
      shop: { $in: shopIds },
    });
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments({
      "items.shop": { $in: shopIds },
    });
    // Pending orders: use correct field name
    const pendingOrders = await Order.countDocuments({
      "items.shop": { $in: shopIds },
      order_status: "pending",
    });

    // Calculate total revenue: only delivered orders, use total_amount
    const deliveredOrders = await Order.find({
      "items.shop": { $in: shopIds },
      order_status: "delivered",
    });
    const totalRevenue = deliveredOrders.reduce((sum, order) => {
      const orderAmount = order.total_amount || 0;
      return sum + orderAmount;
    }, 0);

    // Get recent orders
    const recentOrders = await Order.find({ "items.shop": { $in: shopIds } })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalProducts,
        totalUsers,
        totalOrders,
        pendingOrders,
        totalRevenue,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Products for Admin
router.get("/products", adminAuth, async (req, res) => {
  try {
    const shopIds = await getAdminShopIds(req.admin.id);
    if (shopIds.length === 0) {
      return res.json([]);
    }

    const products = await Product.find({ shop: { $in: shopIds } }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (error) {
    console.error("Get admin products error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Add New Product
router.post("/products", adminAuth, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock } = req.body;
    const shopId = req.body.shopId || req.body.shop;

    if (!shopId) {
      return res.status(400).json({ message: "Shop is required" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    if (shop.owner.toString() !== req.admin.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      imageUrl,
      stock: stock || 0,
      shop: shopId,
    });

    const product = await newProduct.save();
    res.json(product);
  } catch (error) {
    console.error("Add product error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Product
router.put("/products/:id", adminAuth, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock } = req.body;
    const shopId = req.body.shopId || req.body.shop;

    const update = { name, description, price, category, imageUrl, stock };

    if (shopId) {
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      if (shop.owner.toString() !== req.admin.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      update.shop = shopId;
    }

    const shopIds = await getAdminShopIds(req.admin.id);
    if (shopIds.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shop: { $in: shopIds } },
      update,
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Update product error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete Product
router.delete("/products/:id", adminAuth, async (req, res) => {
  try {
    const shopIds = await getAdminShopIds(req.admin.id);
    if (shopIds.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      shop: { $in: shopIds },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Orders for Admin
router.get("/orders", adminAuth, async (req, res) => {
  try {
    const shopIds = await getAdminShopIds(req.admin.id);
    if (shopIds.length === 0) {
      return res.json([]);
    }

    const orders = await Order.find({ "items.shop": { $in: shopIds } })
      .populate("user", "name email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Get admin orders error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Order Status
router.put("/orders/:id", adminAuth, async (req, res) => {
  try {
    // Accept both 'order_status' and fallback to 'status' for backward compatibility
    const { order_status, status } = req.body;
    const update = {};
    // If updating to delivered, also set payment_status to completed
    if (order_status) {
      update.order_status = order_status;
      if (order_status === "delivered") {
        update.payment_status = "completed";
      }
    } else if (status) {
      update.order_status = status;
      if (status === "delivered") {
        update.payment_status = "completed";
      }
    }

    const shopIds = await getAdminShopIds(req.admin.id);
    if (shopIds.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, "items.shop": { $in: shopIds } },
      update,
      { new: true },
    )
      .populate("user", "name email")
      .populate("items.product", "name price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Update order status error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== CATEGORY MANAGEMENT ROUTES ====================

// Get all categories
router.get("/categories", adminAuth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Get product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.name,
        });
        return {
          ...category.toObject(),
          // category.toObject() converts the Mongoose category document into a plain JavaScript object.
          // The ... (spread operator) copies all properties from that object into a new object.
          // Then, productCount is added as a new property to that object.
          // Result:
          // You get a new object that contains all the original category fields (like _id, name, description, etc.) plus a new field called productCount (the number of products in that category).
          productCount,
        };
      }),
    );

    res.json(categoriesWithCount);
  } catch (error) {
    console.error("Get categories error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Add new category
router.post("/categories", adminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    //     Searches the Category collection for a document whose name matches the new category name (name from the request body).
    // The $regex with ^${name}$ ensures an exact match (not just partial), and the "i" flag makes it case-insensitive.
    // For example, if you try to add "Electronics" and "electronics" already exists, it will be considered a duplicate.
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      description: description || "",
    });

    const category = await newCategory.save();

    // Add productCount to response
    const categoryWithCount = {
      ...category.toObject(),
      productCount: 0,
    };

    res.status(201).json(categoryWithCount);
  } catch (error) {
    console.error("Add category error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update category
router.put("/categories/:id", adminAuth, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const categoryId = req.params.id;

    // Check if another category with the same name exists (excluding current)
    if (name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        // $regex: Tells MongoDB to match the name field using a regular expression.
        // new RegExp(^${name}$, "i"):
        // ^ and $ mean the match must be exact (from start to end).
        // ${name} is the value you are searching for.
        // "i" makes the search case-insensitive (so "Electronics" and "electronics" are considered the same).
        _id: { $ne: categoryId },
        //         $ne stands for "not equal".
        // It is used to filter out documents where a field does not match a specific value.
      });
      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Category name already exists" });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name, description, isActive },
      { new: true },
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Get product count
    const productCount = await Product.countDocuments({
      category: updatedCategory.name,
    });

    const categoryWithCount = {
      ...updatedCategory.toObject(),
      productCount,
    };

    res.json(categoryWithCount);
  } catch (error) {
    console.error("Update category error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete category
router.delete("/categories/:id", adminAuth, async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if any products use this category
    const productCount = await Product.countDocuments({
      category: category.name,
    });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category. ${productCount} product(s) are using this category. Please reassign or delete those products first.`,
      });
    }

    await Category.findByIdAndDelete(categoryId);
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
