const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const auth = require("../middleware/auth");
const router = express.Router();

const getCartShopIds = async (cart) => {
  if (!cart || cart.items.length === 0) return [];
  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select(
    "shop",
  );
  const shopIds = products
    .map((product) => product.shop)
    .filter((shopId) => shopId);
  return [...new Set(shopIds.map((id) => id.toString()))];
};

// Get user's cart
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.userId }).populate(
      "items.product",
    );
    if (!cart) cart = new Cart({ user: req.userId, items: [] });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add item to cart
router.post("/add", auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity must be greater than 0" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if ((product.stock || 0) <= 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    const cartShopIds = await getCartShopIds(cart);
    if (cartShopIds.length > 1) {
      return res.status(400).json({
        message:
          "Cart has items from multiple shops. Please clear cart and try again.",
      });
    }

    if (cartShopIds.length === 1 && product.shop) {
      if (cartShopIds[0] !== product.shop.toString()) {
        return res.status(400).json({
          message:
            "Cart can contain items from only one shop. Please clear cart to add this item.",
        });
      }
    }

    // Check if item already exists in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex > -1) {
      // Item exists, update quantity
      const nextQty = cart.items[itemIndex].quantity + parseInt(quantity);
      if (nextQty > (product.stock || 0)) {
        return res.status(400).json({
          message: `Only ${product.stock || 0} item(s) available in stock`,
        });
      }
      cart.items[itemIndex].quantity = nextQty;
    } else {
      // Item doesn't exist, add new item
      if (parseInt(quantity) > (product.stock || 0)) {
        return res.status(400).json({
          message: `Only ${product.stock || 0} item(s) available in stock`,
        });
      }
      cart.items.push({ product: productId, quantity: parseInt(quantity) });
    }

    await cart.save();

    // Populate cart before sending response
    await cart.populate("items.product");

    res.json({
      message: "Item added to cart successfully",
      cart: cart,
      availableStock: product.stock || 0,
      itemCount: cart.items.reduce((total, item) => total + item.quantity, 0),
    });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ message: "Failed to add item to cart" });
  }
});

// Remove item from cart
router.post("/remove", auth, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Remove item from cart
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );

    await cart.save();

    // Populate cart before sending response
    await cart.populate("items.product");

    res.json({
      message: "Item removed from cart successfully",
      cart: cart,
      itemCount: cart.items.reduce((total, item) => total + item.quantity, 0),
    });
  } catch (err) {
    console.error("Error removing from cart:", err);
    res.status(500).json({ message: "Failed to remove item from cart" });
  }
});

// Update item quantity in cart
router.post("/update", auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity < 0) {
      return res
        .status(400)
        .json({ message: "Invalid product ID or quantity" });
    }

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId,
    );

    if (itemIndex > -1) {
      if (quantity === 0) {
        // Remove item if quantity is 0
        cart.items.splice(itemIndex, 1);
      } else {
        if (quantity > (product.stock || 0)) {
          return res.status(400).json({
            message: `Only ${product.stock || 0} item(s) available in stock`,
          });
        }
        // Update quantity
        cart.items[itemIndex].quantity = parseInt(quantity);
      }
    } else {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    await cart.save();
    await cart.populate("items.product");

    res.json({
      message: "Cart updated successfully",
      cart: cart,
      availableStock: product.stock || 0,
      itemCount: cart.items.reduce((total, item) => total + item.quantity, 0),
    });
  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ message: "Failed to update cart" });
  }
});

// This route manages the user's cart: get, add, and remove items. It uses auth middleware to ensure the user is logged in.
module.exports = router;
