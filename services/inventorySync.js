/*
 * =====================================================
 * INVENTORY LIVE AUTO-SYNC SERVICE
 * =====================================================
 *
 * Yeh service merchant ke OneDrive (.xlsx) ya Google Sheet (.csv)
 * web link ko automatic fetch karke QuickBazaar database aur
 * AI Image Fetcher se sync karti hai.
 *
 * Features:
 * 1. OneDrive 1drv.ms share links -> Dynamic Session & UniqueId extraction
 * 2. Google Sheets share links -> Direct CSV export conversion
 * 3. Excel parsing via SheetJS
 * 4. Automatic AI Image Fetching for missing images
 * 5. Atomic MongoDB bulkWrite upsert
 */

const axios = require("axios");
const XLSX = require("xlsx");
const Shop = require("../models/Shop");
const Product = require("../models/Product");
const { fetchImageForProduct } = require("./imageFetcher");

// Header Aliases for smart column mapping
const HEADER_ALIASES = {
  name: [
    "name", "product name", "product", "item", "item name",
    "samagri", "samagri naam", "naam", "product_name", "itemname",
    "title", "heading",
  ],
  price: [
    "price", "rate", "kimat", "mrp", "cost", "amount",
    "selling price", "selling_price", "unit price", "unit_price", "daam",
  ],
  stock: [
    "stock", "qty", "quantity", "matra", "available",
    "units", "count", "inventory", "remaining", "balance",
  ],
  category: [
    "category", "varg", "type", "group", "vibhag",
    "product category", "product_category", "section",
  ],
  description: [
    "description", "vivaran", "details", "desc", "info",
    "about", "product description", "product_description", "note",
  ],
  image: [
    "image", "imageurl", "image_url", "photo", "picture", "img",
  ],
};

/**
 * normalizeHeaders - Maps Excel/CSV row header to schema keys
 */
function normalizeHeaders(row) {
  const normalized = {};
  const rowKeys = Object.keys(row);

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const key of rowKeys) {
      const lowerKey = key.toLowerCase().trim();
      if (aliases.includes(lowerKey)) {
        normalized[field] = row[key];
        break;
      }
    }
  }
  return normalized;
}

/**
 * convertToDirectDownloadLink - Converts OneDrive or Google Sheet view link to direct download URL
 */
function convertToDirectDownloadLink(shareUrl) {
  if (!shareUrl || typeof shareUrl !== "string") return "";

  const trimmed = shareUrl.trim();

  // 1. OneDrive Links (1drv.ms or onedrive.live.com)
  if (trimmed.includes("1drv.ms") || trimmed.includes("onedrive.live.com")) {
    if (trimmed.includes("api.onedrive.com")) return trimmed;
    try {
      const base64Value = Buffer.from(trimmed).toString("base64");
      const safeBase64 = base64Value
        .replace(/=/g, "")
        .replace(/\//g, "_")
        .replace(/\+/g, "-");
      return `https://api.onedrive.com/v1.0/shares/u!${safeBase64}/root/content`;
    } catch (e) {
      console.error("OneDrive conversion error:", e);
      return trimmed;
    }
  }

  // 2. Google Sheets Links (docs.google.com/spreadsheets)
  if (trimmed.includes("docs.google.com/spreadsheets")) {
    if (trimmed.includes("/pub?output=csv") || trimmed.includes("/export?format=csv")) {
      return trimmed;
    }
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
  }

  return trimmed;
}

/**
 * downloadSpreadsheetBuffer - Downloads Excel/CSV binary buffer from OneDrive or Google Sheets
 */
async function downloadSpreadsheetBuffer(shareUrl) {
  const trimmed = (shareUrl || "").trim();
  if (!trimmed) throw new Error("No sync URL configured for this shop.");

  // If OneDrive / 1drv.ms link:
  if (trimmed.includes("1drv.ms") || trimmed.includes("onedrive.live.com")) {
    console.log(`🌐 Resolving OneDrive link: ${trimmed}`);
    let currentUrl = trimmed;
    let cookies = [];

    for (let step = 1; step <= 6; step++) {
      try {
        const cookieHeader = cookies.join("; ");
        const res = await axios.get(currentUrl, {
          maxRedirects: 0,
          validateStatus: (s) => s >= 200 && s < 400,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            Cookie: cookieHeader,
          },
        });

        if (res.headers["set-cookie"]) {
          const newCookies = res.headers["set-cookie"].map(
            (c) => c.split(";")[0]
          );
          cookies = [...cookies, ...newCookies];
        }

        if (res.headers.location) {
          currentUrl = res.headers.location;
          if (!currentUrl.startsWith("http")) {
            const origin = new URL(trimmed).origin;
            currentUrl = origin + currentUrl;
          }
        } else {
          // Extract UniqueId & CID from HTML
          const html = String(res.data || "");
          const uniqueIdMatch = html.match(/download\.aspx\?UniqueId=([a-f0-9-]+)/i);
          const cidMatch =
            currentUrl.match(/\/personal\/([a-f0-9]+)\//i) ||
            html.match(/\/personal\/([a-f0-9]+)\//i);
          const cid = cidMatch ? cidMatch[1] : "38C13EBA4B8DF0EA";

          if (uniqueIdMatch) {
            const uniqueId = uniqueIdMatch[1];
            const downloadEndpoints = [
              `https://my.microsoftpersonalcontent.com/personal/${cid}/_layouts/15/download.aspx?UniqueId=${uniqueId}`,
              `https://onedrive.live.com/personal/${cid}/_layouts/15/download.aspx?UniqueId=${uniqueId}`,
            ];

            for (const dlUrl of downloadEndpoints) {
              try {
                const dlRes = await axios.get(dlUrl, {
                  responseType: "arraybuffer",
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    Cookie: cookies.join("; "),
                  },
                });
                if (dlRes.data && dlRes.data.byteLength > 100) {
                  console.log(`✅ Downloaded OneDrive file! Size: ${dlRes.data.byteLength} bytes.`);
                  return dlRes.data;
                }
              } catch (e) {}
            }
          }

          // Fallback to Graph API
          const fallbackUrl = convertToDirectDownloadLink(trimmed);
          const dlRes = await axios.get(fallbackUrl, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Cookie: cookies.join("; "),
            },
          });
          return dlRes.data;
        }
      } catch (err) {
        console.warn(`Step ${step} redirect warning: ${err.message}`);
        break;
      }
    }
  }

  // Google Sheets or standard URL
  const directUrl = convertToDirectDownloadLink(trimmed);
  const response = await axios.get(directUrl, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  return response.data;
}

/**
 * syncShopInventory - Syncs inventory for a specific shop
 * @param {string} shopId - Shop MongoDB ID
 * @param {boolean} fetchMissingImages - Whether to trigger AI image fetcher for items without images
 */
async function syncShopInventory(shopId, fetchMissingImages = true) {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new Error(`Shop not found with ID ${shopId}`);
  }

  if (!shop.syncUrl) {
    throw new Error("No sync URL configured for this shop.");
  }

  console.log(`🔄 Syncing shop "${shop.name}"... Sync URL: ${shop.syncUrl}`);

  let buffer;
  try {
    buffer = await downloadSpreadsheetBuffer(shop.syncUrl);
  } catch (axiosError) {
    let errorMsg = `Failed to download file from URL (${axiosError.message}).`;
    await Shop.findByIdAndUpdate(shopId, {
      lastSyncAt: new Date(),
      lastSyncStatus: "failed",
      lastSyncMessage: errorMsg,
    });
    throw new Error(errorMsg);
  }

  // Parse Excel / CSV arraybuffer using SheetJS
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (parseError) {
    const errorMsg = "Failed to parse spreadsheet buffer. Please ensure link points to a valid Excel/CSV file.";
    await Shop.findByIdAndUpdate(shopId, {
      lastSyncAt: new Date(),
      lastSyncStatus: "failed",
      lastSyncMessage: errorMsg,
    });
    throw new Error(errorMsg);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Spreadsheet contains no sheets.");
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  if (rawRows.length === 0) {
    throw new Error("Spreadsheet contains no data rows.");
  }

  // Fetch existing products for this shop to check for existing images
  const existingProducts = await Product.find({ shop: shopId });
  const existingMap = new Map();
  existingProducts.forEach((p) => {
    existingMap.set(p.name.toLowerCase().trim(), p);
  });

  const bulkOps = [];
  let newCount = 0;
  let updatedCount = 0;
  let imagesFetched = 0;

  for (const row of rawRows) {
    const norm = normalizeHeaders(row);
    if (!norm.name || String(norm.name).trim() === "") continue;

    const name = String(norm.name).trim();
    const price = parseFloat(norm.price);
    if (isNaN(price) || price <= 0) continue;

    const stock = parseInt(norm.stock) || 0;
    const category = String(norm.category || "Groceries").trim();
    const description = String(norm.description || name).trim();
    const existing = existingMap.get(name.toLowerCase());

    let imageUrl = norm.image || (existing ? existing.image || existing.imageUrl : null);

    // AI Image Fetcher Agent Trigger
    if (!imageUrl && fetchMissingImages) {
      try {
        console.log(`🤖 AI Agent fetching image for product: "${name}"...`);
        imageUrl = await fetchImageForProduct(name, category);
        imagesFetched++;
      } catch (imgErr) {
        console.warn(`Failed image fetch for "${name}":`, imgErr.message);
      }
    }

    if (existing) {
      updatedCount++;
    } else {
      newCount++;
    }

    bulkOps.push({
      updateOne: {
        filter: {
          shop: shopId,
          name: { $regex: new RegExp(`^${name}$`, "i") },
        },
        update: {
          $set: {
            name,
            price,
            stock,
            category,
            description,
            image: imageUrl || "",
            imageUrl: imageUrl || "",
            shop: shopId,
          },
        },
        upsert: true,
      },
    });
  }

  if (bulkOps.length === 0) {
    throw new Error("No valid products found in the spreadsheet.");
  }

  // Execute bulk DB update
  await Product.bulkWrite(bulkOps);

  const successMessage = `✅ Synced ${bulkOps.length} products! (${newCount} new, ${updatedCount} updated, ${imagesFetched} AI images attached)`;

  // Update shop status
  await Shop.findByIdAndUpdate(shopId, {
    lastSyncAt: new Date(),
    lastSyncStatus: "success",
    lastSyncMessage: successMessage,
  });

  return {
    success: true,
    totalSynced: bulkOps.length,
    newCount,
    updatedCount,
    imagesFetched,
    message: successMessage,
  };
}

/**
 * syncAllActiveShops - Runs periodic auto-sync for all shops with syncEnabled === true
 */
async function syncAllActiveShops() {
  try {
    const shopsToSync = await Shop.find({ syncEnabled: true, syncUrl: { $ne: "" } });
    if (shopsToSync.length === 0) return;

    console.log(`⏰ Cron Job: Syncing ${shopsToSync.length} auto-sync enabled shop(s)...`);

    for (const shop of shopsToSync) {
      try {
        await syncShopInventory(shop._id, true);
      } catch (err) {
        console.error(`❌ Cron Sync error for shop "${shop.name}":`, err.message);
      }
    }
  } catch (error) {
    console.error("Cron Job Execution Error:", error.message);
  }
}

module.exports = {
  syncShopInventory,
  syncAllActiveShops,
  convertToDirectDownloadLink,
};
