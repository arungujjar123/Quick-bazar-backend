const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const router = express.Router();

const buildShopFilter = (shopId) => {
  if (!shopId) return {};
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return { error: "Invalid shopId" };
  }
  return { shop: shopId };
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get products near a location
router.get("/nearby", async (req, res) => {
  try {
    const latNum = toNumber(req.query.lat);
    const lngNum = toNumber(req.query.lng);
    const radiusNum = toNumber(req.query.radiusKm) ?? 5;
    const city = req.query.city;

    if (latNum === null || lngNum === null) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const filter = { isActive: true };
    if (city) {
      filter.city = { $regex: new RegExp(city, "i") };
    }

    const radiusInRadians = radiusNum / 6371;
    const shops = await Shop.find({
      ...filter,
      location: {
        $geoWithin: {
          $centerSphere: [[lngNum, latNum], radiusInRadians],
        },
      },
    });

    if (shops.length === 0) {
      return res.json([]);
    }

    const distanceByShopId = new Map();
    shops.forEach((shop) => {
      const [shopLng, shopLat] = shop.location.coordinates;
      const distanceKm = haversineKm(latNum, lngNum, shopLat, shopLng);
      distanceByShopId.set(shop._id.toString(), Number(distanceKm.toFixed(2)));
    });

    const shopIds = shops.map((shop) => shop._id);
    const products = await Product.find({ shop: { $in: shopIds } }).populate(
      "shop",
      "name address city location deliveryRadiusKm",
    );

    const withDistance = products.map((product) => {
      const shopId = product.shop?._id?.toString();
      const distanceKm = shopId ? distanceByShopId.get(shopId) : null;
      return { ...product.toObject(), distanceKm };
    });

    withDistance.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json(withDistance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search products
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const shopFilter = buildShopFilter(req.query.shopId);
    if (shopFilter.error) {
      return res.status(400).json({ message: shopFilter.error });
    }

    const products = await Product.find({
      ...shopFilter,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ],
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get featured products from different categories (max 5)
router.get("/featured", async (req, res) => {
  try {
    console.log("Featured products endpoint called");

    const shopFilter = buildShopFilter(req.query.shopId);
    if (shopFilter.error) {
      return res.status(400).json({ message: shopFilter.error });
    }

    // First, try to get products from different categories
    const allProducts = await Product.find(shopFilter);
    console.log("Total products found:", allProducts.length);

    if (allProducts.length === 0) {
      return res.json([]);
    }

    // Group products by category
    const productsByCategory = {};
    allProducts.forEach((product) => {
      const category = product.category || "Uncategorized";
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    });

    console.log("Categories found:", Object.keys(productsByCategory));

    // Get one product from each category (max 5)
    const featuredProducts = [];
    const categories = Object.keys(productsByCategory);
    const maxProducts = 5;

    for (let i = 0; i < Math.min(categories.length, maxProducts); i++) {
      const category = categories[i];
      const products = productsByCategory[category];
      if (products && products.length > 0) {
        // Get the first product from this category
        featuredProducts.push(products[0]);
      }
    }

    // If we have less than 5 products, fill with additional random products
    if (
      featuredProducts.length < maxProducts &&
      allProducts.length > featuredProducts.length
    ) {
      const usedIds = featuredProducts.map((p) => p._id.toString());
      const remainingProducts = allProducts.filter(
        (p) => !usedIds.includes(p._id.toString()),
      );
      const remainingCount = Math.min(
        maxProducts - featuredProducts.length,
        remainingProducts.length,
      );

      for (let i = 0; i < remainingCount; i++) {
        featuredProducts.push(remainingProducts[i]);
      }
    }

    console.log("Featured products selected:", featuredProducts.length);
    res.json(featuredProducts);
  } catch (err) {
    console.error("Error in featured products endpoint:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const shopFilter = buildShopFilter(req.query.shopId);
    if (shopFilter.error) {
      return res.status(400).json({ message: shopFilter.error });
    }

    const products = await Product.find(shopFilter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// This route provides endpoints to get all products and a single product by ID.
module.exports = router;
