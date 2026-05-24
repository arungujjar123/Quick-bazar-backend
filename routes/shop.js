const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const Shop = require("../models/Shop");
const Product = require("../models/Product");

const router = express.Router();

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

const getOwnedShop = async (shopId, adminId) => {
  const shop = await Shop.findById(shopId);
  if (!shop) {
    return { status: 404, message: "Shop not found" };
  }
  if (shop.owner.toString() !== adminId) {
    return { status: 403, message: "Access denied" };
  }
  return { shop };
};

// Create shop (admin only)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { name, address, city, lat, lng, deliveryRadiusKm } = req.body;
    const latNum = toNumber(lat);
    const lngNum = toNumber(lng);
    const radiusNum = toNumber(deliveryRadiusKm) ?? 5;

    if (!name || !address) {
      return res.status(400).json({ message: "Name and address are required" });
    }

    if (latNum === null || lngNum === null) {
      return res
        .status(400)
        .json({ message: "Valid latitude and longitude are required" });
    }

    const shop = new Shop({
      name,
      address,
      city,
      location: { coordinates: [lngNum, latNum] },
      deliveryRadiusKm: radiusNum,
      owner: req.admin.id,
    });

    const saved = await shop.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Create shop error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get shops (optionally filtered by location)
router.get("/", async (req, res) => {
  try {
    const latNum = toNumber(req.query.lat);
    const lngNum = toNumber(req.query.lng);
    const radiusNum = toNumber(req.query.radiusKm) ?? 5;
    const city = req.query.city;

    const filter = { isActive: true };
    if (city) {
      filter.city = { $regex: new RegExp(city, "i") };
    }

    let shops;
    if (latNum !== null && lngNum !== null) {
      const radiusInRadians = radiusNum / 6371;
      shops = await Shop.find({
        ...filter,
        location: {
          $geoWithin: {
            $centerSphere: [[lngNum, latNum], radiusInRadians],
          },
        },
      });

      const withDistance = shops.map((shop) => {
        const [shopLng, shopLat] = shop.location.coordinates;
        const distanceKm = haversineKm(latNum, lngNum, shopLat, shopLng);
        return {
          ...shop.toObject(),
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      });

      withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      return res.json(withDistance);
    }

    shops = await Shop.find(filter).sort({ createdAt: -1 });
    res.json(shops);
  } catch (error) {
    console.error("Get shops error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get shops for logged-in admin
router.get("/mine", adminAuth, async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.admin.id }).sort({
      createdAt: -1,
    });
    res.json(shops);
  } catch (error) {
    console.error("Get admin shops error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single shop by id
router.get("/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop || !shop.isActive) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.json(shop);
  } catch (error) {
    console.error("Get shop error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Get products for a shop
router.get("/:id/products", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop || !shop.isActive) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const products = await Product.find({ shop: shop._id }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (error) {
    console.error("Get shop products error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Update shop (admin only)
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { name, address, city, lat, lng, deliveryRadiusKm, isActive } =
      req.body;
    const { shop, status, message } = await getOwnedShop(
      req.params.id,
      req.admin.id,
    );

    if (!shop) {
      return res.status(status).json({ message });
    }

    const latNum = toNumber(lat);
    const lngNum = toNumber(lng);
    const radiusNum = toNumber(deliveryRadiusKm);

    if (
      (lat !== undefined || lng !== undefined) &&
      (latNum === null || lngNum === null)
    ) {
      return res
        .status(400)
        .json({ message: "Valid latitude and longitude are required" });
    }

    if (name !== undefined) shop.name = name;
    if (address !== undefined) shop.address = address;
    if (city !== undefined) shop.city = city;
    if (radiusNum !== null) shop.deliveryRadiusKm = radiusNum;
    if (isActive !== undefined) shop.isActive = isActive;
    if (latNum !== null && lngNum !== null) {
      shop.location.coordinates = [lngNum, latNum];
    }

    const updated = await shop.save();
    res.json(updated);
  } catch (error) {
    console.error("Update shop error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete shop (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const { shop, status, message } = await getOwnedShop(
      req.params.id,
      req.admin.id,
    );

    if (!shop) {
      return res.status(status).json({ message });
    }

    await Shop.findByIdAndDelete(shop._id);
    res.json({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Delete shop error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
