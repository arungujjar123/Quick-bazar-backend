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
const XLSX = require("xlsx");
const { uploadExcel } = require("../middleware/upload");
const { syncShopInventory } = require("../services/inventorySync");
const { fetchImageForProduct } = require("../services/imageFetcher");

const getAdminShopIds = async (adminId) => {
  if (adminId === "demo-admin") {
    // Demo admin can see all shops
    const shops = await Shop.find().select("_id");
    return shops.map((shop) => shop._id);
  }
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

    console.log("Admin registration attempt:", { name, email, hasPassword: !!password });

    if (!secretKey) {
      console.log("No secret key provided");
      return res
        .status(403)
        .json({ message: "Secret key is required for admin registration" });
    }

    if (secretKey !== ADMIN_SECRET_KEY && secretKey !== "SUPER_MART_MASTER_2024") {
      console.log(
        "Invalid secret key:",
        secretKey,
        "Expected:",
        ADMIN_SECRET_KEY,
        "or SUPER_MART_MASTER_2024"
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
    const role = secretKey === "SUPER_MART_MASTER_2024" ? "super_admin" : "admin";
    const newAdmin = new Admin({
      name,
      email,
      password, // Will be hashed by the pre-save middleware
      role,
    });

    const admin = await newAdmin.save();

    const payload = {
      id: admin._id,
      email: admin.email,
      isAdmin: true,
      role: admin.role,
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
            role: admin.role,
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
          role: admin.role,
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
                role: admin.role,
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
                role: "super_admin",
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
router.get(["/dashboard", "/dashboard-stats"], adminAuth, async (req, res) => {
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
      const orderAmount = order.shop_payout !== undefined ? order.shop_payout : (order.total_amount || 0);
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

    // Auto-fix any missing product images in background/response
    for (const p of products) {
      if ((!p.image && !p.imageUrl) && p.name) {
        const fetched = await fetchImageForProduct(p.name, p.category);
        p.image = fetched;
        p.imageUrl = fetched;
        await p.save();
      }
    }

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

    if (req.admin.id !== "demo-admin" && shop.owner.toString() !== req.admin.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    let finalImg = imageUrl || req.body.image;
    if (!finalImg && name) {
      finalImg = await fetchImageForProduct(name, category);
    }

    const newProduct = new Product({
      name,
      description: description || name,
      price,
      category: category || "Groceries",
      image: finalImg,
      imageUrl: finalImg,
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
      if (req.admin.id !== "demo-admin" && shop.owner.toString() !== req.admin.id) {
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

// ============================================================
// BULK STOCK IMPORT VIA EXCEL / CSV FILE UPLOAD
// ============================================================

/*
 * Smart Header Aliases - Dukandar ke Excel mein koi bhi column name ho,
 * yeh function usse QuickBazaar schema mein map kar dega.
 *
 * Example: "Samagri Naam" → name, "Kimat" → price, "Matra" → stock
 */
const HEADER_ALIASES = {
  name: [
    "name", "product name", "product", "item", "item name",
    "samagri", "samagri naam", "naam", "product_name", "itemname",
    "title", "heading",
  ],
  price: [
    "price", "rate", "kimat", "mrp", "cost", "amount",
    "selling price", "selling_price", "unit price", "unit_price", "daam",
  ],
  stock: [
    "stock", "qty", "quantity", "matra", "available",
    "units", "count", "inventory", "remaining", "balance",
  ],
  category: [
    "category", "varg", "type", "group", "vibhag",
    "product category", "product_category", "section",
  ],
  description: [
    "description", "vivaran", "details", "desc", "info",
    "about", "product description", "product_description", "note",
  ],
};

/**
 * normalizeHeaders - Excel row ke header ko Product model ke field se match karta hai
 * @param {Object} row - Ek row from Excel sheet (e.g., { "Item Name": "Atta", "Rate": 250 })
 * @returns {Object} - Normalized object (e.g., { name: "Atta", price: 250 })
 */
const normalizeHeaders = (row) => {
  const normalized = {};
  const rowKeys = Object.keys(row);

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const key of rowKeys) {
      const lowerKey = key.toLowerCase().trim();
      if (aliases.includes(lowerKey)) {
        normalized[field] = row[key];
        break;
      }
    }
  }
  return normalized;
};

// ============ GET: Download Sample Excel Template ============
// Merchant is template ko download karke apni inventory bhar sakta hai
router.get("/products/bulk-template", adminAuth, (req, res) => {
  try {
    // Sample data jo template mein dikhega
    const sampleData = [
      {
        "Name": "Aashirvaad Atta 5kg",
        "Price": 275,
        "Stock": 50,
        "Category": "Groceries",
        "Description": "Premium whole wheat flour",
      },
      {
        "Name": "Amul Taaza Milk 500ml",
        "Price": 27,
        "Stock": 100,
        "Category": "Dairy & Bakery",
        "Description": "Fresh toned milk",
      },
      {
        "Name": "Maggi Noodles Pack",
        "Price": 14,
        "Stock": 200,
        "Category": "Snacks & Drinks",
        "Description": "2-minute instant noodles",
      },
    ];

    // Excel workbook create karo
    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Column widths set karo taaki template readable lage
    worksheet["!cols"] = [
      { wch: 25 }, // Name
      { wch: 10 }, // Price
      { wch: 10 }, // Stock
      { wch: 20 }, // Category
      { wch: 35 }, // Description
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

    // Excel file ko buffer mein generate karo
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Response headers set karo for file download
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="QuickBazaar_Stock_Template.xlsx"'
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Template download error:", error.message);
    res.status(500).json({ message: "Failed to generate template" });
  }
});

// ============ POST: Bulk Upload Products from Excel/CSV ============
// Merchant apni poori dukan ki inventory ek file mein upload kar sakta hai
router.post(
  "/products/bulk-upload",
  adminAuth,
  uploadExcel.single("file"),
  async (req, res) => {
    try {
      const { shopId } = req.body;

      // Validation: File uploaded hai ya nahi
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "No file uploaded. Please select an Excel or CSV file." });
      }

      // Validation: Shop ID required hai
      if (!shopId) {
        return res
          .status(400)
          .json({ message: "Shop ID is required. Please select a shop." });
      }

      // Verify shop exists & belongs to this admin
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found." });
      }

      // Demo admin check - allow all shops for demo
      if (req.admin.id !== "demo-admin") {
        if (shop.owner.toString() !== req.admin.id) {
          return res
            .status(403)
            .json({ message: "You do not own this shop." });
        }
      }

      // -------- EXCEL PARSING --------
      // File buffer se workbook read karo
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0]; // Pehli sheet padho

      if (!sheetName) {
        return res
          .status(400)
          .json({ message: "Excel file is empty. No sheets found." });
      }

      // Sheet ko JSON array mein convert karo
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "", // Empty cells ko "" set karo
      });

      if (rawRows.length === 0) {
        return res
          .status(400)
          .json({ message: "Excel file has no data rows. Please add product data." });
      }

      // -------- HEADER NORMALIZATION & VALIDATION --------
      const validProducts = [];
      const errors = [];

      for (let index = 0; index < rawRows.length; index++) {
        const row = rawRows[index];
        const normalized = normalizeHeaders(row);
        const rowNumber = index + 2; // +2 because row 1 is header, data starts from row 2

        // Name is required
        if (!normalized.name || String(normalized.name).trim() === "") {
          errors.push(`Row ${rowNumber}: Product name is missing`);
          continue;
        }

        // Price must be a valid number
        const price = parseFloat(normalized.price);
        if (isNaN(price) || price <= 0) {
          errors.push(
            `Row ${rowNumber}: Invalid price for "${normalized.name}"`
          );
          continue;
        }

        // Stock defaults to 0 if not provided
        const stock = parseInt(normalized.stock) || 0;
        const name = String(normalized.name).trim();
        const category = String(normalized.category || "Groceries").trim();
        let imgUrl = normalized.image || normalized.imageurl || normalized.imageUrl;

        if (!imgUrl) {
          imgUrl = await fetchImageForProduct(name, category);
        }

        validProducts.push({
          name: name,
          price: price,
          stock: stock,
          category: category,
          description: String(normalized.description || name).trim(),
          image: imgUrl,
          imageUrl: imgUrl,
        });
      }

      if (validProducts.length === 0) {
        return res.status(400).json({
          message: "No valid products found in the file.",
          errors: errors.slice(0, 10), // Pehle 10 errors dikhao
        });
      }

      // -------- MONGODB BULK UPSERT --------
      // Agar product pehle se hai (same name + same shop) toh UPDATE karo
      // Agar nahi hai toh INSERT karo (upsert: true)
      const bulkOps = validProducts.map((product) => ({
        updateOne: {
          filter: {
            shop: shopId,
            name: { $regex: new RegExp(`^${product.name}$`, "i") }, // Case-insensitive name match
          },
          update: {
            $set: {
              name: product.name,
              price: product.price,
              stock: product.stock,
              category: product.category,
              description: product.description,
              image: product.image,
              imageUrl: product.imageUrl,
              shop: shopId,
            },
          },
          upsert: true, // Naya product banao agar exist nahi karta
        },
      }));

      const result = await Product.bulkWrite(bulkOps);

      // -------- RESPONSE --------
      const summary = {
        totalProcessed: validProducts.length,
        created: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
        errors: errors.length,
        errorDetails: errors.slice(0, 10),
      };

      res.json({
        success: true,
        message: `✅ ${summary.totalProcessed} products processed! ${summary.created} new products added, ${summary.updated} existing products updated.`,
        summary,
      });
    } catch (error) {
      console.error("Bulk upload error:", error.message);

      // Multer-specific errors
      if (error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File too large. Maximum size is 10MB." });
      }

      res.status(500).json({
        message: error.message || "Bulk upload failed. Please try again.",
      });
    }
  }
);


// ============================================================
// LIVE AUTO-SYNC ENDPOINTS (ONEDRIVE / GOOGLE SHEETS)
// ============================================================

// PUT: Save Auto-Sync Configuration for a Shop
router.put("/shops/:id/sync-config", adminAuth, async (req, res) => {
  try {
    const { syncUrl, syncEnabled } = req.body;
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    if (req.admin.id !== "demo-admin" && shop.owner.toString() !== req.admin.id) {
      return res.status(403).json({ message: "You do not own this shop." });
    }

    shop.syncUrl = syncUrl !== undefined ? syncUrl.trim() : shop.syncUrl;
    shop.syncEnabled = syncEnabled !== undefined ? Boolean(syncEnabled) : shop.syncEnabled;

    await shop.save();

    res.json({
      success: true,
      message: "Sync settings updated successfully.",
      shop: {
        id: shop._id,
        name: shop.name,
        syncUrl: shop.syncUrl,
        syncEnabled: shop.syncEnabled,
        lastSyncAt: shop.lastSyncAt,
        lastSyncStatus: shop.lastSyncStatus,
        lastSyncMessage: shop.lastSyncMessage,
      },
    });
  } catch (error) {
    console.error("Error saving sync config:", error);
    res.status(500).json({ message: error.message || "Failed to update sync config" });
  }
});

// POST: Trigger Immediate Manual Sync for a Shop
router.post("/shops/:id/sync-now", adminAuth, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    if (req.admin.id !== "demo-admin" && shop.owner.toString() !== req.admin.id) {
      return res.status(403).json({ message: "You do not own this shop." });
    }

    if (!shop.syncUrl) {
      return res
        .status(400)
        .json({ message: "Please save a OneDrive or Google Sheet link first before syncing." });
    }

    // Trigger sync service (fetches file, parses, calls AI image fetcher, performs bulk write)
    const result = await syncShopInventory(shop._id, true);

    res.json({
      success: true,
      message: result.message,
      result,
    });
  } catch (error) {
    console.error("Sync error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Sync failed. Please check your link.",
    });
  }
});

// GET: Fetch Current Sync Status & History for a Shop
router.get("/shops/:id/sync-status", adminAuth, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found." });
    }

    res.json({
      syncUrl: shop.syncUrl || "",
      syncEnabled: Boolean(shop.syncEnabled),
      lastSyncAt: shop.lastSyncAt,
      lastSyncStatus: shop.lastSyncStatus || "none",
      lastSyncMessage: shop.lastSyncMessage || "",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sync status" });
  }
});

// GET: Fetch All Registered Customers for Admin
router.get("/customers", adminAuth, async (req, res) => {
  try {
    const customers = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    console.error("Fetch customers error:", error.message);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

module.exports = router;
