const mongoose = require("mongoose");
require("dotenv").config();
const { syncShopInventory } = require("./services/inventorySync");
const Shop = require("./models/Shop");

async function debugSyncTarget() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // List all shops and their syncUrls
    const allShops = await Shop.find();
    console.log("All Shops in DB:");
    allShops.forEach(s => console.log(` - ID: ${s._id}, Name: ${s.name}, SyncUrl: "${s.syncUrl}"`));

    // Target the shop from error log or first shop with syncUrl
    const targetShop = await Shop.findById("6a8623edb9c52eabbb97153f") || allShops.find(s => s.syncUrl) || allShops[0];
    
    if (targetShop) {
      console.log(`\nTesting sync for shop "${targetShop.name}" (${targetShop._id})...`);
      console.log(`Sync URL: "${targetShop.syncUrl}"`);
      if (targetShop.syncUrl) {
        const result = await syncShopInventory(targetShop._id, true);
        console.log("Result:", result);
      }
    }
  } catch (err) {
    console.error("\n❌ EXACT ERROR STACK TRACE:");
    console.error(err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

debugSyncTarget();
