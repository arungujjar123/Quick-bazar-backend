const mongoose = require("mongoose");
require("dotenv").config();

const Admin = require("./models/Admin");
const Shop = require("./models/Shop");
const Product = require("./models/Product");

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  adminName: process.env.SEED_ADMIN_NAME || "QuickBazaar Admin",
  adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@quickbazaar.com",
  adminPassword: process.env.SEED_ADMIN_PASSWORD || "admin123",
  city: process.env.SEED_CITY || "Mumbai",
  centerLat: toNumber(process.env.SEED_CENTER_LAT, 19.076),
  centerLng: toNumber(process.env.SEED_CENTER_LNG, 72.8777),
  radiusKm: toNumber(process.env.SEED_RADIUS_KM, 5),
};

const shopSeeds = [
  {
    name: "My Local Store",
    address: "Main Market, Sector 1",
    offset: { lat: 0, lng: 0 },
    deliveryRadiusKm: 5,
    products: [], // User will add their own products
  },
];

const upsertShop = async (adminId, seed) => {
  const lat = config.centerLat + seed.offset.lat;
  const lng = config.centerLng + seed.offset.lng;

  return Shop.findOneAndUpdate(
    { owner: adminId, name: seed.name },
    {
      name: seed.name,
      address: seed.address,
      city: config.city,
      deliveryRadiusKm: seed.deliveryRadiusKm || config.radiusKm,
      owner: adminId,
      location: { type: "Point", coordinates: [lng, lat] },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const upsertProduct = async (shopId, product) => {
  return Product.findOneAndUpdate(
    { shop: shopId, name: product.name },
    { ...product, shop: shopId },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const admin =
    (await Admin.findOne({ email: config.adminEmail })) ||
    (await Admin.create({
      name: config.adminName,
      email: config.adminEmail,
      password: config.adminPassword,
    }));

  let productCount = 0;

  for (const seed of shopSeeds) {
    const shop = await upsertShop(admin._id, seed);
    for (const product of seed.products) {
      await upsertProduct(shop._id, product);
      productCount += 1;
    }
  }

  console.log("Seed complete:");
  console.log(`- Admin: ${config.adminEmail}`);
  console.log(`- City: ${config.city}`);
  console.log(`- Shops: ${shopSeeds.length}`);
  console.log(`- Products: ${productCount}`);
  console.log("Tip: Use city search on Home with the city above.");

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
