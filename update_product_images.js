const mongoose = require("mongoose");
require("dotenv").config();
const Product = require("./models/Product");
const { fetchImageForProduct } = require("./services/imageFetcher");

async function updateImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    const products = await Product.find({});
    console.log(`Found ${products.length} products to check/update images...`);

    let updatedCount = 0;
    for (const p of products) {
      const newImg = await fetchImageForProduct(p.name, p.category);
      if (newImg && p.imageUrl !== newImg) {
        console.log(`Updating "${p.name}" (${p.category}) -> ${newImg}`);
        p.imageUrl = newImg;
        p.image = newImg;
        await p.save();
        updatedCount++;
      }
    }
    console.log(`🎉 Successfully updated ${updatedCount} products with new images!`);
    process.exit(0);
  } catch (err) {
    console.error("Error updating product images:", err);
    process.exit(1);
  }
}

updateImages();
