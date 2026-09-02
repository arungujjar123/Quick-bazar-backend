/*
 * Test script to verify OneDrive direct download conversion & AI Image Fetcher
 */

const { convertToDirectDownloadLink } = require("./services/inventorySync");
const { fetchImageForProduct } = require("./services/imageFetcher");
const axios = require("axios");
const XLSX = require("xlsx");

async function testLiveOneDrive() {
  const shareUrl = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo";
  
  console.log("🔗 Step 1: Converting share link...");
  const directUrl = convertToDirectDownloadLink(shareUrl);
  console.log("Direct URL:", directUrl);

  console.log("\n📥 Step 2: Downloading Excel file arraybuffer...");
  try {
    const res = await axios.get(directUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });

    console.log("✅ Downloaded bytes:", res.data.byteLength);

    console.log("\n📊 Step 3: Parsing Excel workbook...");
    const workbook = XLSX.read(res.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    console.log("Sheet Name:", sheetName);

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log("\n📦 Excel Rows Parsed:", JSON.stringify(rows, null, 2));

    console.log("\n🤖 Step 4: Testing AI Image Fetcher for parsed products...");
    for (const item of rows) {
      const name = item.Name || item.name || item["Item Name"];
      if (name) {
        const imageUrl = await fetchImageForProduct(name, item.Category || "Groceries");
        console.log(`🖼️ "${name}" -> Image URL: ${imageUrl}`);
      }
    }

    console.log("\n🎉 TEST COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  }
}

testLiveOneDrive();
