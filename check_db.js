const mongoose = require("mongoose");
require("dotenv").config();
const Shop = require("./models/Shop");
const Product = require("./models/Product");

async function check() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  const shops = await Shop.find({ isActive: true });
  console.log("ACTIVE SHOPS:", shops.length, shops.map(s => ({ id: s._id, name: s.name, city: s.city, coords: s.location?.coordinates })));

  const shopIds = shops.map(s => s._id);
  const matchedProducts = await Product.find({ shop: { $in: shopIds } });
  console.log("MATCHED PRODUCTS COUNT:", matchedProducts.length);

  const unassignedProducts = await Product.find({ $or: [{ shop: null }, { shop: { $exists: false } }] });
  console.log("UNASSIGNED PRODUCTS COUNT:", unassignedProducts.length);

  const allProducts = await Product.find();
  console.log("ALL PRODUCTS COUNT:", allProducts.length);
  process.exit(0);
}

check().catch(console.error);
