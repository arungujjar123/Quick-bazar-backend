/*
 * =====================================================
 * MINI E-COMMERCE BACKEND - MAIN SERVER FILE
 * =====================================================
 *
 * Yeh file backend ka main entry point hai.
 * Is file mein:
 * 1. Express app setup hota hai
 * 2. MongoDB connection establish hota hai
 * 3. Sabhi API routes mount hote hain
 * 4. Server start hota hai
 *
 * Technologies Used:
 * - Express.js: Web framework
 * - Mongoose: MongoDB ODM (Object Data Modeling)
 * - CORS: Cross-Origin Resource Sharing enable karne ke liye
 * - dotenv: Environment variables load karne ke liye
 */

// ============ STEP 1: Environment Variables Load Karo ============
// .env file se environment variables load karta hai (like MONGO_URI, JWT_SECRET, PORT)
require("dotenv").config();

// ============ STEP 2: Required Packages Import Karo ============
const express = require("express"); // Web framework for creating REST API
const mongoose = require("mongoose"); // MongoDB se interact karne ke liye
const cors = require("cors"); // Frontend se requests allow karne ke liye

// ============ STEP 3: All Route Files Import Karo ============
const authRoutes = require("./routes/auth"); // User login/register routes
const productRoutes = require("./routes/product"); // Product listing/details routes
const cartRoutes = require("./routes/cart"); // Cart add/remove/update routes
const orderRoutes = require("./routes/order"); // Order creation/history routes
const adminRoutes = require("./routes/admin"); // Admin dashboard/management routes
const shopRoutes = require("./routes/shop"); // Shop listing/creation routes
const supportRoutes = require("./routes/support"); // AI support assistant routes
const activityRoutes = require("./routes/activity"); // User activity tracking routes

// ============ STEP 4: Express App Initialize Karo ============
const app = express();

// ============ STEP 5: Middleware Setup Karo ============
// CORS enable - Frontend (React) se backend (Express) ko requests bhej sake
app.use(cors());

// JSON parser - Request body ko JSON format mein parse karta hai
// Limit increased to 10MB for image uploads (multimodal search)
app.use(express.json({ limit: "10mb" }));

// ============ STEP 6: Root Route - Server Check Karne Ke Liye ============
app.get("/", (req, res) => {
  res.send("Welcome to the Mini Mart API");
});

// ============ STEP 7: All API Routes Mount Karo ============
// Jab bhi /api/auth se request aaye, authRoutes handle karega
app.use("/api/auth", authRoutes); // User authentication (login, register, profile)

// /api/products - Product related operations
app.use("/api/products", productRoutes); // Get all products, product by ID, search

// /api/cart - Shopping cart operations
app.use("/api/cart", cartRoutes); // Add to cart, remove, update quantity

// /api/orders - Order management
app.use("/api/orders", orderRoutes); // Create order, get order history

// /api/admin - Admin panel operations
app.use("/api/admin", adminRoutes); // Admin login, dashboard, manage products/orders

// /api/shops - Shop listing/creation
app.use("/api/shops", shopRoutes); // Shops list, nearby search, admin create

// /api/support - AI support assistant
app.use("/api/support", supportRoutes);

// /api/activity - User activity tracking (personalization)
app.use("/api/activity", activityRoutes);

// ============ STEP 8: MongoDB Connection Setup ============
console.log("Attempting to connect to MongoDB Atlas...");
console.log("Connection string:", process.env.MONGO_URI ? "Found" : "Missing");

// MongoDB connection event listeners - Connection status track karne ke liye
mongoose.connection.on("connected", () => {
  console.log("🔗 Mongoose connected to MongoDB Atlas");
});

// Agar connection mein error aaye
mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

// Agar connection disconnect ho jaye
mongoose.connection.on("disconnected", () => {
  console.log("🔌 Mongoose disconnected from MongoDB Atlas");
});

// ============ STEP 9: Graceful Shutdown Handler ============
// Jab server band ho (Ctrl+C), toh database connection properly close karo
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log(
    "🛑 MongoDB Atlas connection closed due to application termination",
  );
  process.exit(0);
});

// ============ STEP 10: Port Configuration ============
// Environment variable se PORT le lo, nahi toh 5000 use karo
const PORT = process.env.PORT || 5000;

// ============ STEP 11: MongoDB Connect Karo Aur Server Start Karo ============
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true, // MongoDB connection string parser
    useUnifiedTopology: true, // New connection management engine
  })
  .then(() => {
    // ✅ Agar MongoDB successfully connect ho gaya
    console.log("✅ MongoDB Atlas connected successfully");
    console.log("Database:", mongoose.connection.name);

    // Build RAG vector store on startup
    const { vectorStore } = require("./services/vectorStore");
    vectorStore.build().catch((err) =>
      console.error("Vector store initial build error:", err.message)
    );

    // Ab server ko start karo aur specified PORT par listen karo
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    // ❌ Agar MongoDB connection fail ho jaye
    console.error("❌ MongoDB Atlas connection error:", err.message);
    console.error("Full error:", err);
    process.exit(1); // Server ko exit karo with error code
  });

/*
 * =====================================================
 * SERVER FLOW SUMMARY:
 * =====================================================
 *
 * 1. .env file se environment variables load hote hain
 * 2. Express app initialize hota hai
 * 3. Middleware (CORS, JSON parser) setup hota hai
 * 4. Saare routes mount hote hain (/api/auth, /api/products, etc.)
 * 5. MongoDB se connection establish hota hai
 * 6. Successful connection ke baad server PORT par listen karta hai
 * 7. Ab frontend se API requests aa sakti hain!
 *
 * =====================================================
 */
