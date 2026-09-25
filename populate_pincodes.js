const mongoose = require("mongoose");
require("dotenv").config();
const Shop = require("./models/Shop");

async function populatePincodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    const shops = await Shop.find({});
    console.log(`Found ${shops.length} shops to inspect and backfill pincodes...`);

    let updatedCount = 0;
    for (const shop of shops) {
      let code = shop.pincode;
      if (!code && shop.address) {
        const match = shop.address.match(/\b\d{6}\b/);
        if (match) {
          code = match[0];
        }
      }
      if (!code && shop.city) {
        const match = shop.city.match(/\b\d{6}\b/);
        if (match) {
          code = match[0];
        }
      }
      if (!code) {
        // Fallback default pincode if address didn't specify one
        code = "281403";
      }

      if (shop.pincode !== code) {
        shop.pincode = code;
        await shop.save();
        console.log(`✅ Updated "${shop.name}" (${shop.address}) -> Pincode: ${code}`);
        updatedCount++;
      }
    }

    console.log(`🎉 Successfully updated ${updatedCount} shops with Pincodes!`);
    process.exit(0);
  } catch (err) {
    console.error("Error populating pincodes:", err);
    process.exit(1);
  }
}

populatePincodes();
