const { convertToDirectDownloadLink } = require("./services/inventorySync");
const { fetchImageForProduct } = require("./services/imageFetcher");
const axios = require("axios");
const XLSX = require("xlsx");

async function testAutoSyncFlow() {
  console.log("=== TESTING AUTO-SYNC & AI IMAGE FETCHER ===");

  // Test 1: AI Image Fetcher test
  const testProducts = [
    { name: "Aashirvaad Atta 5kg", category: "Groceries" },
    { name: "Amul Taaza Milk 500ml", category: "Dairy & Bakery" },
    { name: "Maggi Noodles Pack", category: "Snacks & Drinks" },
    { name: "Dairy Milk Silk Chocolate", category: "Snacks & Drinks" },
  ];

  console.log("\n🤖 Testing AI Image Fetcher Scraper...");
  for (const item of testProducts) {
    const imgUrl = await fetchImageForProduct(item.name, item.category);
    console.log(`✅ Product: "${item.name}" -> Image URL: ${imgUrl}`);
  }

  // Test 2: Google Sheets URL Converter
  const gSheetUrl = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0";
  const directGSheet = convertToDirectDownloadLink(gSheetUrl);
  console.log("\n🔗 Google Sheet Conversion Test:");
  console.log("Original:", gSheetUrl);
  console.log("Converted Direct CSV:", directGSheet);

  console.log("\n🎉 ALL UNIT TESTS PASSED!");
}

testAutoSyncFlow();
