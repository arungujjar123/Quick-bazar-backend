const Product = require("../models/Product");
const Category = require("../models/Category");
const Shop = require("../models/Shop");
const SupportDoc = require("../models/SupportDoc");
const policies = require("./policies");

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const buildProductDoc = (product) => {
  const shop = product.shop;
  const lines = [
    `Name: ${product.name}`,
    `Category: ${product.category || "Uncategorized"}`,
    `Price: ${product.price}`,
    `Stock: ${product.stock || 0}`,
  ];

  if (shop) {
    lines.push(`Shop: ${shop.name}`);
    if (shop.city) lines.push(`City: ${shop.city}`);
    if (shop.address) lines.push(`Address: ${shop.address}`);
    if (shop.deliveryRadiusKm)
      lines.push(`Delivery radius: ${shop.deliveryRadiusKm} km`);
  }

  if (product.description) {
    lines.push(`Description: ${product.description}`);
  }

  return {
    type: "product",
    title: `Product: ${product.name}`,
    content: lines.join("\n"),
    source: "products",
    refId: product._id.toString(),
    metadata: {
      category: product.category || "Uncategorized",
      shopId: shop?._id?.toString() || "",
    },
  };
};

const buildCategoryDoc = (category) => ({
  type: "category",
  title: `Category: ${category.name}`,
  content: `Category name: ${category.name}\nDescription: ${category.description || ""}`,
  source: "categories",
  refId: category._id.toString(),
  metadata: {
    isActive: category.isActive,
  },
});

const buildShopDoc = (shop) => {
  const lines = [`Shop name: ${shop.name}`, `Address: ${shop.address}`];

  if (shop.city) lines.push(`City: ${shop.city}`);
  if (shop.deliveryRadiusKm)
    lines.push(`Delivery radius: ${shop.deliveryRadiusKm} km`);

  return {
    type: "shop",
    title: `Shop: ${shop.name}`,
    content: lines.join("\n"),
    source: "shops",
    refId: shop._id.toString(),
    metadata: {
      city: shop.city || "",
    },
  };
};

const buildPolicyDoc = (policy) => ({
  type: "policy",
  title: policy.title,
  content: policy.content,
  source: "policies",
  refId: slugify(policy.title),
  metadata: {
    tags: policy.tags || [],
  },
});

const collectSupportDocs = async () => {
  const [products, categories, shops] = await Promise.all([
    Product.find().populate("shop", "name city address deliveryRadiusKm"),
    Category.find(),
    Shop.find({ isActive: true }),
  ]);

  const docs = [];
  products.forEach((product) => docs.push(buildProductDoc(product)));
  categories.forEach((category) => docs.push(buildCategoryDoc(category)));
  shops.forEach((shop) => docs.push(buildShopDoc(shop)));
  policies.forEach((policy) => docs.push(buildPolicyDoc(policy)));

  return docs;
};

const syncSupportDocs = async () => {
  const docs = await collectSupportDocs();
  const idsByType = new Map();

  docs.forEach((doc) => {
    if (!idsByType.has(doc.type)) {
      idsByType.set(doc.type, new Set());
    }
    idsByType.get(doc.type).add(doc.refId);
  });

  await Promise.all(
    docs.map((doc) =>
      SupportDoc.updateOne(
        { type: doc.type, refId: doc.refId },
        { ...doc, updatedAt: new Date() },
        { upsert: true },
      ),
    ),
  );

  await Promise.all(
    Array.from(idsByType.entries()).map(([type, ids]) =>
      SupportDoc.deleteMany({
        type,
        refId: { $nin: Array.from(ids) },
      }),
    ),
  );

  return {
    total: docs.length,
    byType: Object.fromEntries(
      Array.from(idsByType.entries()).map(([type, set]) => [type, set.size]),
    ),
  };
};

module.exports = { collectSupportDocs, syncSupportDocs };
