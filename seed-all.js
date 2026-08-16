/**
 * =====================================================
 * COMPREHENSIVE SEED SCRIPT - End-to-End Test Data
 * =====================================================
 *
 * This script seeds the database with rich dummy data
 * covering ALL features of Quick-Bazar:
 *
 *   1. Admin accounts (registered + demo)
 *   2. Multiple shops in different locations
 *   3. Categories with descriptions
 *   4. 20+ products across all categories with real images
 *   5. Customer user accounts
 *   6. Sample orders in different statuses
 *   7. Cart data for testing
 *   8. Support docs for AI assistant
 *
 * Usage:
 *   cd backend
 *   node seed-all.js
 *
 * Test Accounts:
 *   Customer:  customer@test.com  /  Test@123
 *   Customer2: rahul@example.com  /  Rahul@123
 *   Admin:     demo@quickbazar.com / Demo@123
 *   Demo Admin (hardcoded): admin@minimart.com / admin123
 */

const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const Admin = require("./models/Admin");
const Shop = require("./models/Shop");
const Category = require("./models/Category");
const Product = require("./models/Product");
const User = require("./models/User");
const Order = require("./models/Order");
const Cart = require("./models/Cart");
const SupportDoc = require("./models/SupportDoc");

// ============ SEED DATA ============

const CATEGORIES = [
  { name: "Bakery", description: "Fresh artisanal breads, pastries, cakes, and baked treats from local bakers" },
  { name: "Dairy", description: "Farm-fresh milk, paneer, cheese, yogurt, and dairy products" },
  { name: "Pantry", description: "Everyday kitchen essentials — oils, spices, honey, and dry goods" },
  { name: "Fresh Produce", description: "Seasonal fruits and vegetables sourced from local organic farms" },
  { name: "Beverages", description: "Refreshing juices, teas, coffees, and healthy smoothie mixes" },
  { name: "Snacks", description: "Handcrafted chips, namkeen, trail mixes, and healthy munchies" },
  { name: "Personal Care", description: "Natural soaps, shampoos, and skincare from local artisans" },
];

const PRODUCTS = [
  // Bakery (6 products)
  {
    name: "Sourdough Loaf",
    description: "Freshly baked artisanal sourdough bread with a crispy golden crust and soft, tangy crumb. Made with a 72-hour fermentation process.",
    price: 150,
    category: "Bakery",
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1585478259715-876a6a81fa08?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Chocolate Croissant",
    description: "Buttery, flaky croissant filled with rich dark chocolate ganache. Hand-laminated with 27 layers of French butter.",
    price: 95,
    category: "Bakery",
    stock: 40,
    imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Multigrain Bread",
    description: "Hearty bread made with 7 different grains including oats, flax seeds, sunflower seeds, and sesame. Perfect for healthy sandwiches.",
    price: 120,
    category: "Bakery",
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Blueberry Muffins (Pack of 4)",
    description: "Soft, moist muffins bursting with fresh blueberries and topped with a crunchy streusel. Baked fresh every morning.",
    price: 180,
    category: "Bakery",
    stock: 20,
    imageUrl: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Focaccia Rosemary",
    description: "Italian-style flatbread infused with fresh rosemary, sea salt, and extra virgin olive oil. Crispy outside, pillowy inside.",
    price: 175,
    category: "Bakery",
    stock: 15,
    imageUrl: "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Cinnamon Rolls (Pack of 3)",
    description: "Swirled with aromatic Ceylon cinnamon and brown sugar, topped with cream cheese frosting. A weekend breakfast favorite.",
    price: 210,
    category: "Bakery",
    stock: 18,
    imageUrl: "https://images.unsplash.com/photo-1609126979532-2c2e6d8c1d23?auto=format&fit=crop&w=600&q=80",
  },

  // Dairy (4 products)
  {
    name: "Farm Fresh Paneer",
    description: "Soft, crumbly paneer made from pure cow's milk. No preservatives, no additives — just fresh dairy goodness from local farms.",
    price: 200,
    category: "Dairy",
    stock: 35,
    imageUrl: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Greek Yogurt (400g)",
    description: "Thick, creamy probiotic yogurt made with double-strained milk. High in protein, low in sugar. Great with granola or as a cooking base.",
    price: 150,
    category: "Dairy",
    stock: 45,
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Artisanal Cheese Platter",
    description: "A curated selection of 4 local artisanal cheeses — aged cheddar, smoked gouda, herb-crusted brie, and peppered jack.",
    price: 650,
    category: "Dairy",
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "A2 Cow Milk (1 Liter)",
    description: "Premium A2 protein milk from grass-fed indigenous cows. Delivered within 4 hours of milking. Non-homogenized, pasteurized.",
    price: 80,
    category: "Dairy",
    stock: 60,
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80",
  },

  // Pantry (4 products)
  {
    name: "Organic Honey (500g)",
    description: "Raw, unprocessed wildflower honey sourced directly from beekeepers in the Western Ghats. Rich in antioxidants and natural enzymes.",
    price: 350,
    category: "Pantry",
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Cold-Pressed Coconut Oil (500ml)",
    description: "100% pure virgin coconut oil, cold-pressed from fresh coconuts. Perfect for cooking, baking, or as a hair and skin moisturizer.",
    price: 280,
    category: "Pantry",
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Himalayan Pink Salt (250g)",
    description: "Hand-mined pink salt from ancient Himalayan deposits. Contains 84 trace minerals. Perfect finishing salt for gourmet dishes.",
    price: 120,
    category: "Pantry",
    stock: 50,
    imageUrl: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Whole Spice Box (Masala Dabba)",
    description: "A traditional Indian spice box with 7 compartments containing premium whole spices — cumin, mustard, turmeric, coriander, chili, fenugreek, and black pepper.",
    price: 450,
    category: "Pantry",
    stock: 15,
    imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80",
  },

  // Fresh Produce (4 products)
  {
    name: "Hass Avocados (Pack of 4)",
    description: "Perfectly ripe Hass avocados. Creamy texture with a rich, nutty flavor. Ideal for guacamole, salads, or avocado toast.",
    price: 250,
    category: "Fresh Produce",
    stock: 40,
    imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Mixed Fruit Basket",
    description: "A beautiful basket of seasonal fruits: mangoes, strawberries, kiwis, oranges, and grapes. Makes a perfect gift!",
    price: 500,
    category: "Fresh Produce",
    stock: 10,
    imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Organic Baby Spinach (200g)",
    description: "Tender, pesticide-free baby spinach from urban hydroponic farms. Washed and ready to eat. Perfect for salads and smoothies.",
    price: 90,
    category: "Fresh Produce",
    stock: 55,
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Cherry Tomatoes (250g)",
    description: "Sweet, vine-ripened cherry tomatoes bursting with flavor. Grown locally in controlled greenhouse conditions for year-round availability.",
    price: 70,
    category: "Fresh Produce",
    stock: 65,
    imageUrl: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?auto=format&fit=crop&w=600&q=80",
  },

  // Beverages (3 products)
  {
    name: "Cold Brew Coffee (500ml)",
    description: "Smooth, bold cold brew coffee steeped for 18 hours using single-origin Coorg beans. Low acidity, naturally sweet, and incredibly refreshing.",
    price: 180,
    category: "Beverages",
    stock: 35,
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Masala Chai Blend (100g)",
    description: "Premium Assam tea blended with fresh cardamom, ginger, cinnamon, and cloves. Just add milk and sugar for the perfect cup.",
    price: 220,
    category: "Beverages",
    stock: 40,
    imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Fresh Orange Juice (1L)",
    description: "100% fresh-squeezed orange juice from Nagpur oranges. No added sugar, no preservatives, no concentrate. Drink within 48 hours.",
    price: 160,
    category: "Beverages",
    stock: 20,
    imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=600&q=80",
  },

  // Snacks (2 products)
  {
    name: "Trail Mix Premium (300g)",
    description: "A power-packed mix of almonds, cashews, walnuts, dried cranberries, dark chocolate chips, and pumpkin seeds. Perfect for on-the-go snacking.",
    price: 320,
    category: "Snacks",
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1599599810694-b5b37304c041?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Handmade Banana Chips (200g)",
    description: "Crispy Kerala-style banana chips fried in pure coconut oil with a touch of sea salt. Addictively crunchy and naturally gluten-free.",
    price: 110,
    category: "Snacks",
    stock: 45,
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80",
  },

  // Personal Care (1 product)
  {
    name: "Lavender Handmade Soap (Pack of 3)",
    description: "Gentle, moisturizing soap bars made with real lavender essential oil, shea butter, and coconut oil. No SLS, no parabens. Vegan and cruelty-free.",
    price: 240,
    category: "Personal Care",
    stock: 22,
    imageUrl: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80",
  },
];

const SUPPORT_DOCS = [
  {
    type: "faq",
    title: "How do I place an order?",
    content: "To place an order: 1) Browse products on the home page or categories page. 2) Click on a product to see details. 3) Click 'Add to Cart'. 4) Go to your Cart and click 'Proceed to Checkout'. 5) Fill in your shipping address and payment details. 6) Click 'Secure Payment' to confirm your order. You'll receive an order confirmation immediately.",
    source: "faq",
  },
  {
    type: "faq",
    title: "What payment methods are accepted?",
    content: "QuickBazaar accepts the following payment methods: Credit/Debit Cards (Visa, MasterCard, RuPay), UPI Payments (Google Pay, PhonePe, Paytm), Cash on Delivery (COD). All online payments are processed through encrypted secure gateways.",
    source: "faq",
  },
  {
    type: "faq",
    title: "How long does delivery take?",
    content: "Standard Delivery: 3-5 business days (₹50). Express Delivery: Next day guaranteed (₹150). Most local orders from nearby shops are delivered within 2-4 hours during business hours. Delivery times may vary based on your location and the shop's distance.",
    source: "faq",
  },
  {
    type: "faq",
    title: "Can I return or exchange products?",
    content: "Yes! QuickBazaar offers easy returns and exchanges. Fresh produce and dairy must be reported within 24 hours. Pantry items can be returned within 7 days if unopened. Contact our support chat for immediate assistance with returns.",
    source: "faq",
  },
  {
    type: "faq",
    title: "How do I track my order?",
    content: "Go to 'My Orders' from the navigation menu or your Profile page. Each order shows its current status: Confirmed, Processing, Shipped, or Delivered. You can also ask our AI assistant to track your order by typing 'track my order' in the chat.",
    source: "faq",
  },
  {
    type: "policy",
    title: "Shipping Policy",
    content: "QuickBazaar partners with local shops and makers to deliver products as fresh as possible. Standard shipping costs ₹50 for orders under ₹500. Free shipping on orders above ₹500. Express delivery available at ₹150. We deliver 7 days a week from 8 AM to 9 PM.",
    source: "policy",
  },
  {
    type: "policy",
    title: "Refund Policy",
    content: "Refunds are processed within 3-5 business days after the return is received and inspected. For damaged or incorrect items, we offer immediate replacement or full refund. Cash on Delivery refunds are credited to your bank account or store credit.",
    source: "policy",
  },
  {
    type: "about",
    title: "About QuickBazaar",
    content: "QuickBazaar is a hyperlocal e-commerce marketplace that connects customers with neighborhood shops, local artisans, and small businesses. Our mission is to make artisanal, fresh, and locally-sourced products accessible to everyone. We support over 100 local makers across Mumbai, helping them reach customers in their neighborhood.",
    source: "about",
  },
];

// ============ MAIN SEED FUNCTION ============

const seedAll = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected\n");

    // ============ 1. ADMIN ============
    console.log("--- Seeding Admins ---");
    const adminEmail = "demo@quickbazar.com";
    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = new Admin({
        name: "Demo Admin",
        email: adminEmail,
        password: "Demo@123", // Hashed by pre-save hook
      });
      await admin.save();
      console.log("  ✅ Admin created: demo@quickbazar.com / Demo@123");
    } else {
      console.log("  ℹ️  Admin already exists: demo@quickbazar.com");
    }

    // ============ 2. SHOPS ============
    console.log("\n--- Seeding Shops ---");
    const shopsData = [
      {
        name: "QuickBazaar Fresh Market",
        address: "42 Hill Road, Bandra West",
        city: "Mumbai",
        location: { type: "Point", coordinates: [72.8296, 19.0596] },
        deliveryRadiusKm: 8,
        owner: admin._id,
      },
      {
        name: "The Artisan's Corner",
        address: "15 MG Road, Camp",
        city: "Pune",
        location: { type: "Point", coordinates: [73.8567, 18.5204] },
        deliveryRadiusKm: 6,
        owner: admin._id,
      },
    ];

    const shops = [];
    for (const shopData of shopsData) {
      let shop = await Shop.findOne({ name: shopData.name });
      if (!shop) {
        shop = new Shop(shopData);
        await shop.save();
        console.log(`  ✅ Shop created: ${shopData.name}`);
      } else {
        console.log(`  ℹ️  Shop exists: ${shopData.name}`);
      }
      shops.push(shop);
    }

    const primaryShop = shops[0]; // Use first shop for most products
    const secondaryShop = shops[1];

    // ============ 3. CATEGORIES ============
    console.log("\n--- Seeding Categories ---");
    for (const catData of CATEGORIES) {
      let category = await Category.findOne({ name: catData.name });
      if (!category) {
        category = new Category(catData);
        await category.save();
        console.log(`  ✅ Category created: ${catData.name}`);
      } else {
        console.log(`  ℹ️  Category exists: ${catData.name}`);
      }
    }

    // ============ 4. PRODUCTS ============
    console.log("\n--- Seeding Products ---");
    const createdProducts = [];
    for (let i = 0; i < PRODUCTS.length; i++) {
      const prodData = PRODUCTS[i];
      // Assign products to shops: most to primary, some to secondary
      const assignedShop = i < 18 ? primaryShop : secondaryShop;

      let product = await Product.findOne({ name: prodData.name, shop: assignedShop._id });
      if (!product) {
        product = new Product({ ...prodData, shop: assignedShop._id });
        await product.save();
        console.log(`  ✅ Product created: ${prodData.name} (₹${prodData.price})`);
      } else {
        console.log(`  ℹ️  Product exists: ${prodData.name}`);
      }
      createdProducts.push(product);
    }

    // ============ 5. USERS ============
    console.log("\n--- Seeding Users ---");
    const usersData = [
      {
        name: "Test Customer",
        email: "customer@test.com",
        password: "Test@123",
        phone: "9876543210",
      },
      {
        name: "Rahul Sharma",
        email: "rahul@example.com",
        password: "Rahul@123",
        phone: "9812345678",
      },
    ];

    const users = [];
    for (const userData of usersData) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          phone: userData.phone,
        });
        await user.save();
        console.log(`  ✅ User created: ${userData.email} / ${userData.password}`);
      } else {
        console.log(`  ℹ️  User exists: ${userData.email}`);
      }
      users.push(user);
    }

    const primaryUser = users[0];
    const secondaryUser = users[1];

    // ============ 6. ORDERS ============
    console.log("\n--- Seeding Orders ---");

    // Check if orders already exist for primary user
    const existingOrders = await Order.countDocuments({ user: primaryUser._id });
    if (existingOrders === 0) {
      // Order 1: Delivered order
      const order1 = new Order({
        user: primaryUser._id,
        items: [
          {
            product: createdProducts[0]._id, // Sourdough Loaf
            shop: primaryShop._id,
            quantity: 2,
            price: createdProducts[0].price,
          },
          {
            product: createdProducts[6]._id, // Farm Fresh Paneer
            shop: primaryShop._id,
            quantity: 1,
            price: createdProducts[6].price,
          },
        ],
        total_amount: createdProducts[0].price * 2 + createdProducts[6].price,
        payment_method: "card",
        payment_status: "completed",
        order_status: "delivered",
        shipping_address: "42 Hill Road, Bandra West, Mumbai, Maharashtra - 400050",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });
      await order1.save();
      console.log("  ✅ Order 1 created (Delivered)");

      // Order 2: Processing order
      const order2 = new Order({
        user: primaryUser._id,
        items: [
          {
            product: createdProducts[10]._id, // Organic Honey
            shop: primaryShop._id,
            quantity: 1,
            price: createdProducts[10].price,
          },
          {
            product: createdProducts[16]._id, // Cold Brew Coffee
            shop: primaryShop._id,
            quantity: 3,
            price: createdProducts[16].price,
          },
        ],
        total_amount: createdProducts[10].price + createdProducts[16].price * 3,
        payment_method: "upi",
        payment_status: "completed",
        order_status: "processing",
        shipping_address: "15 Turner Road, Bandra West, Mumbai, Maharashtra - 400050",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      });
      await order2.save();
      console.log("  ✅ Order 2 created (Processing)");

      // Order 3: Confirmed order (pending)
      const order3 = new Order({
        user: primaryUser._id,
        items: [
          {
            product: createdProducts[14]._id, // Hass Avocados
            shop: primaryShop._id,
            quantity: 2,
            price: createdProducts[14].price,
          },
        ],
        total_amount: createdProducts[14].price * 2,
        payment_method: "cod",
        payment_status: "pending",
        order_status: "confirmed",
        shipping_address: "101 Linking Road, Santacruz, Mumbai, Maharashtra - 400054",
        createdAt: new Date(), // today
      });
      await order3.save();
      console.log("  ✅ Order 3 created (Confirmed/Pending)");

      // Order for secondary user
      const order4 = new Order({
        user: secondaryUser._id,
        items: [
          {
            product: createdProducts[3]._id, // Blueberry Muffins
            shop: primaryShop._id,
            quantity: 1,
            price: createdProducts[3].price,
          },
          {
            product: createdProducts[7]._id, // Greek Yogurt
            shop: primaryShop._id,
            quantity: 2,
            price: createdProducts[7].price,
          },
        ],
        total_amount: createdProducts[3].price + createdProducts[7].price * 2,
        payment_method: "card",
        payment_status: "completed",
        order_status: "shipped",
        shipping_address: "22 FC Road, Shivajinagar, Pune, Maharashtra - 411004",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      });
      await order4.save();
      console.log("  ✅ Order 4 created (Shipped - Rahul)");
    } else {
      console.log(`  ℹ️  ${existingOrders} orders already exist, skipping`);
    }

    // ============ 7. CART ============
    console.log("\n--- Seeding Cart ---");
    let cart = await Cart.findOne({ user: secondaryUser._id });
    if (!cart || cart.items.length === 0) {
      cart = await Cart.findOneAndUpdate(
        { user: secondaryUser._id },
        {
          user: secondaryUser._id,
          items: [
            { product: createdProducts[1]._id, quantity: 2 },  // Chocolate Croissant
            { product: createdProducts[9]._id, quantity: 1 },  // A2 Cow Milk
            { product: createdProducts[19]._id, quantity: 1 }, // Trail Mix
          ],
        },
        { upsert: true, new: true }
      );
      console.log("  ✅ Cart seeded for Rahul (3 items)");
    } else {
      console.log("  ℹ️  Cart already has items for Rahul");
    }

    // ============ 8. SUPPORT DOCS ============
    console.log("\n--- Seeding Support Docs ---");
    for (const doc of SUPPORT_DOCS) {
      const existing = await SupportDoc.findOne({ title: doc.title });
      if (!existing) {
        await new SupportDoc(doc).save();
        console.log(`  ✅ Support doc: ${doc.title}`);
      } else {
        console.log(`  ℹ️  Support doc exists: ${doc.title}`);
      }
    }

    // ============ SUMMARY ============
    console.log("\n" + "=".repeat(55));
    console.log("  🎉  SEEDING COMPLETE!");
    console.log("=".repeat(55));
    console.log("\n  📊  Database Summary:");
    console.log(`    Admins:      ${await Admin.countDocuments()}`);
    console.log(`    Shops:       ${await Shop.countDocuments()}`);
    console.log(`    Categories:  ${await Category.countDocuments()}`);
    console.log(`    Products:    ${await Product.countDocuments()}`);
    console.log(`    Users:       ${await User.countDocuments()}`);
    console.log(`    Orders:      ${await Order.countDocuments()}`);
    console.log(`    Carts:       ${await Cart.countDocuments()}`);
    console.log(`    SupportDocs: ${await SupportDoc.countDocuments()}`);
    console.log("\n  🔑  Test Accounts:");
    console.log("    Customer:    customer@test.com  / Test@123");
    console.log("    Customer 2:  rahul@example.com  / Rahul@123");
    console.log("    Admin:       demo@quickbazar.com / Demo@123");
    console.log("    Demo Admin:  admin@minimart.com / admin123");
    console.log(`    Admin Key:   ${process.env.ADMIN_SECRET_KEY || "Arun123"}`);
    console.log("");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Seeding Error:", err);
    process.exit(1);
  }
};

seedAll();
