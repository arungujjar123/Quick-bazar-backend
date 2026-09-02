const mongoose = require("mongoose");
require("dotenv").config();
const Shop = require("./models/Shop");

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

async function testGeo() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Test Mumbai coordinates (Lat: 19.0760, Lng: 72.8777)
  const latNum = 19.0760;
  const lngNum = 72.8777;
  const radiusKm = 50;
  const radiusInRadians = radiusKm / 6371;

  const shops = await Shop.find({
    isActive: true,
    location: {
      $geoWithin: {
        $centerSphere: [[lngNum, latNum], radiusInRadians],
      },
    },
  });

  console.log(`\nFound ${shops.length} shops within ${radiusKm}km of Mumbai:`);

  const sortedShops = shops.map((shop) => {
    const [shopLng, shopLat] = shop.location.coordinates;
    const distance = haversineKm(latNum, lngNum, shopLat, shopLng);
    return {
      name: shop.name,
      city: shop.city,
      distanceKm: Number(distance.toFixed(2)),
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  console.table(sortedShops);
  process.exit(0);
}

testGeo().catch(console.error);
