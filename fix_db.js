const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();
const Shop = require("./models/Shop");
const Product = require("./models/Product");

const geocodeAddress = async (address, city) => {
  try {
    const query = `${address || ""} ${city || ""}`.trim();
    if (!query) return null;

    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
      {
        headers: { "User-Agent": "QuickBazaarApp/1.0" },
        timeout: 5000,
      }
    );

    if (res.data && res.data.length > 0) {
      return {
        lat: parseFloat(res.data[0].lat),
        lng: parseFloat(res.data[0].lon),
      };
    }
  } catch (err) {
    console.warn("Geocoding failed for", address, err.message);
  }
  return null;
};

async function fix() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  const shops = await Shop.find();
  console.log("Fixing coordinates for", shops.length, "shops...");

  for (const shop of shops) {
    if (!shop.location || !shop.location.coordinates || (shop.location.coordinates[0] === 0 && shop.location.coordinates[1] === 0)) {
      console.log(`Geocoding shop "${shop.name}" (${shop.address}, ${shop.city})...`);
      const geo = await geocodeAddress(shop.address, shop.city);
      if (geo) {
        shop.location = { type: "Point", coordinates: [geo.lng, geo.lat] };
        console.log(`✅ Updated "${shop.name}" -> [${geo.lng}, ${geo.lat}]`);
      } else {
        // Default to New Delhi (110001) coordinates [77.2090, 28.6133] if geocoding yields no result
        shop.location = { type: "Point", coordinates: [77.2090, 28.6133] };
        console.log(`⚠️ Fallback "${shop.name}" -> New Delhi [77.2090, 28.6133]`);
      }
      await shop.save();
    }
  }

  // Ensure all products are assigned to a shop
  const firstShop = await Shop.findOne({ isActive: true });
  if (firstShop) {
    const unassigned = await Product.find({ $or: [{ shop: null }, { shop: { $exists: false } }] });
    if (unassigned.length > 0) {
      console.log(`Assigning ${unassigned.length} unassigned products to shop "${firstShop.name}"...`);
      for (const p of unassigned) {
        p.shop = firstShop._id;
        await p.save();
      }
    }
  }

  console.log("🎉 Database Fix Complete!");
  process.exit(0);
}

fix().catch(console.error);
