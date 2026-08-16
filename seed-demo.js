const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const Admin = require("./models/Admin");
const Shop = require("./models/Shop");
const Category = require("./models/Category");
const Product = require("./models/Product");
const User = require("./models/User");

const seedDemo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");

    // 1. Create Demo Admin
    const adminEmail = "demo@quickbazar.com";
    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = new Admin({
        name: "Demo Admin",
        email: adminEmail,
        password: "Demo@123", // Password will be hashed by pre-save hook
      });
      await admin.save();
      console.log("✅ Demo Admin created");
    } else {
      console.log("ℹ️ Demo Admin already exists");
    }

    // 2. Create Shop
    const shopName = "QuickBazaar Demo Store";
    let shop = await Shop.findOne({ name: shopName });
    if (!shop) {
      shop = new Shop({
        name: shopName,
        address: "123 Demo Street",
        city: "Mumbai",
        location: {
          type: "Point",
          coordinates: [72.8777, 19.076], // lng, lat
        },
        deliveryRadiusKm: 10,
        owner: admin._id,
      });
      await shop.save();
      console.log("✅ Demo Shop created");
    } else {
      console.log("ℹ️ Demo Shop already exists");
    }

    // 3. Create Categories
    const categoriesData = [
      { name: "Bakery", description: "Fresh breads and pastries" },
      { name: "Dairy", description: "Milk, cheese, and more" },
      { name: "Pantry", description: "Everyday essentials" },
    ];
    for (const catData of categoriesData) {
      let category = await Category.findOne({ name: catData.name });
      if (!category) {
        category = new Category(catData);
        await category.save();
        console.log(`✅ Category '${catData.name}' created`);
      }
    }

    // 4. Create Products
    const productsData = [
      {
        name: "Sourdough Loaf",
        description: "Freshly baked artisanal sourdough bread.",
        price: 150,
        category: "Bakery",
        stock: 20,
        imageUrl: "https://images.unsplash.com/photo-1585478259715-876a6a81fa08?auto=format&fit=crop&w=600&q=80",
        shop: shop._id,
      },
      {
        name: "Farm Fresh Paneer",
        description: "Soft, homemade style paneer.",
        price: 200,
        category: "Dairy",
        stock: 15,
        imageUrl: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=600&q=80",
        shop: shop._id,
      },
      {
        name: "Organic Honey",
        description: "Pure raw honey from local farms.",
        price: 350,
        category: "Pantry",
        stock: 30,
        imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
        shop: shop._id,
      },
      {
        name: "Hass Avocados",
        description: "Fresh and ripe avocados.",
        price: 250,
        category: "Produce",
        stock: 50,
        imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80",
        shop: shop._id,
      },
      {
        name: "Mixed Fruit Basket",
        description: "A fresh selection of seasonal fruits.",
        price: 500,
        category: "Produce",
        stock: 10,
        imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
        shop: shop._id,
      }
    ];

    for (const prodData of productsData) {
      let product = await Product.findOne({ name: prodData.name, shop: shop._id });
      if (!product) {
        product = new Product(prodData);
        await product.save();
        console.log(`✅ Product '${prodData.name}' created`);
      }
    }

    // 5. Create Demo Customer
    const customerEmail = "customer@test.com";
    let customer = await User.findOne({ email: customerEmail });
    if (!customer) {
      const hashedPassword = await bcrypt.hash("Test@123", 10);
      customer = new User({
        name: "Test Customer",
        email: customerEmail,
        password: hashedPassword,
        phone: "1234567890",
      });
      await customer.save();
      console.log("✅ Demo Customer created");
    } else {
      console.log("ℹ️ Demo Customer already exists");
    }

    console.log("🎉 Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  }
};

seedDemo();
