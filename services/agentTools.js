/**
 * =====================================================
 * AGENT TOOLS - Functions the AI agent can call
 * =====================================================
 *
 * These are the "tools" available to the AI agent.
 * When a user asks something actionable, the agent
 * decides which tool to call, executes it, and uses
 * the result to craft a natural response.
 */

const Product = require("../models/Product");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const Cart = require("../models/Cart");
const { vectorStore } = require("./vectorStore");

// ============ TOOL DEFINITIONS (for LLM) ============

const TOOL_DEFINITIONS = [
  {
    name: "compare_products",
    description:
      "Compare two or more products side by side in a table. Use when user asks to compare products or wants to see differences.",
    parameters: {
      product_names: "Array of product names to compare (2-4 products)",
    },
  },
  {
    name: "check_delivery",
    description:
      "Check if a product can be delivered to a specific location/zip code. Use when user asks about delivery availability or shipping.",
    parameters: {
      product_name: "Name of the product to check",
      location: "Zip code or city name for delivery check",
    },
  },
  {
    name: "find_similar",
    description:
      "Find products similar to a given product. Use when user asks for alternatives, similar items, or recommendations based on a specific product.",
    parameters: {
      product_name: "Name of the product to find similar items for",
    },
  },
  {
    name: "check_stock",
    description:
      "Check the real-time stock/availability of a product. Use when user asks if something is in stock or available.",
    parameters: {
      product_name: "Name of the product to check stock for",
    },
  },
  {
    name: "get_order_status",
    description:
      "Get the status of a user's recent orders. Use when user asks about their order status, tracking, or delivery updates.",
    parameters: {
      order_hint:
        "Any info the user gave about the order (last few digits of order ID, product name, etc.)",
    },
  },
  {
    name: "search_products",
    description:
      "Search the product catalog for items matching a query. Use when user is looking for specific products, categories, or price ranges.",
    parameters: {
      query: "Search query describing what the user is looking for",
    },
  },
  {
    name: "add_to_cart",
    description:
      "Add a product to the user's cart. Use when user explicitly asks to add something to their cart.",
    parameters: {
      product_name: "Name of the product to add",
      quantity: "Quantity to add (default 1)",
    },
  },
  {
    name: "get_recommendations",
    description:
      "Get personalized product recommendations for the user based on their browsing history and preferences.",
    parameters: {},
  },
  {
    name: "find_nearby_shops",
    description:
      "Find shops near the user's city or location. Use when user asks for shops nearby, local sellers, or where to buy items in person.",
    parameters: {
      city: "Name of the city to find shops in",
    },
  },
];

// ============ TOOL IMPLEMENTATIONS ============

/**
 * Compare products side by side
 */
async function compareProducts(productNames) {
  try {
    const products = [];
    for (const name of productNames.slice(0, 4)) {
      const found = await Product.findOne({
        name: { $regex: new RegExp(name.trim(), "i") },
      }).populate("shop", "name city");
      if (found) products.push(found);
    }

    if (products.length < 2) {
      return {
        success: false,
        message: `Could only find ${products.length} product(s). Need at least 2 to compare.`,
        type: "text",
      };
    }

    const comparison = products.map((p) => ({
      name: p.name,
      price: `$${p.price}`,
      category: p.category || "N/A",
      stock: p.stock > 0 ? `${p.stock} available` : "Out of stock",
      shop: p.shop?.name || "QuickBazaar",
      description: (p.description || "").slice(0, 100),
      image: p.imageUrl || p.image || "",
      id: p._id.toString(),
    }));

    return {
      success: true,
      type: "comparison",
      data: comparison,
      message: `Here's a comparison of ${products.length} products:`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to compare products.",
      type: "text",
    };
  }
}

/**
 * Check delivery availability
 */
async function checkDelivery(productName, location) {
  try {
    const product = await Product.findOne({
      name: { $regex: new RegExp(productName, "i") },
    }).populate("shop", "name city address deliveryRadiusKm");

    if (!product) {
      return {
        success: false,
        message: `Could not find product "${productName}".`,
        type: "text",
      };
    }

    const shop = product.shop;
    if (!shop) {
      return {
        success: true,
        type: "delivery",
        data: {
          product: product.name,
          location: location,
          deliverable: true,
          message: `${product.name} is available for delivery through QuickBazaar standard shipping. Estimated delivery: 3-5 business days.`,
        },
      };
    }

    const shopCity = (shop.city || "").toLowerCase();
    const userLocation = (location || "").toLowerCase();
    const isSameArea =
      shopCity.includes(userLocation) || userLocation.includes(shopCity);

    return {
      success: true,
      type: "delivery",
      data: {
        product: product.name,
        location: location,
        shop: shop.name,
        shopCity: shop.city,
        deliveryRadius: shop.deliveryRadiusKm || 5,
        deliverable: isSameArea,
        message: isSameArea
          ? `✅ Yes! ${product.name} from ${shop.name} can be delivered to ${location}. Delivery radius: ${shop.deliveryRadiusKm || 5} km. Estimated: 1-2 business days.`
          : `⚠️ ${product.name} is from ${shop.name} in ${shop.city || "unknown area"} with a ${shop.deliveryRadiusKm || 5} km delivery radius. ${location} may be outside the delivery zone. Standard shipping may take 5-7 business days.`,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to check delivery.",
      type: "text",
    };
  }
}

/**
 * Find similar products
 */
async function findSimilar(productName) {
  try {
    await vectorStore.ensureBuilt();

    // First find the product
    const product = await Product.findOne({
      name: { $regex: new RegExp(productName, "i") },
    });

    if (!product) {
      return {
        success: false,
        message: `Could not find product "${productName}".`,
        type: "text",
      };
    }

    // Use vector similarity
    const similar = vectorStore.findSimilar(product._id.toString(), 4);

    if (similar.length === 0) {
      return {
        success: true,
        type: "products",
        data: [],
        message: `No similar products found for "${product.name}".`,
      };
    }

    return {
      success: true,
      type: "products",
      data: similar.map((s) => ({
        id: s.id,
        name: s.title,
        price: s.metadata?.price ? `$${s.metadata.price}` : "N/A",
        category: s.metadata?.category || "N/A",
        stock: s.metadata?.stock || 0,
        image: s.metadata?.image || "",
        similarity: `${(s.score * 100).toFixed(0)}%`,
      })),
      message: `Here are products similar to "${product.name}":`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to find similar products.",
      type: "text",
    };
  }
}

/**
 * Check real-time stock
 */
async function checkStock(productName) {
  try {
    const products = await Product.find({
      name: { $regex: new RegExp(productName, "i") },
    })
      .limit(3)
      .populate("shop", "name");

    if (products.length === 0) {
      return {
        success: false,
        message: `No products found matching "${productName}".`,
        type: "text",
      };
    }

    const stockInfo = products.map((p) => ({
      name: p.name,
      stock: p.stock || 0,
      inStock: (p.stock || 0) > 0,
      price: `$${p.price}`,
      shop: p.shop?.name || "QuickBazaar",
      id: p._id.toString(),
    }));

    return {
      success: true,
      type: "stock",
      data: stockInfo,
      message:
        stockInfo.length === 1
          ? stockInfo[0].inStock
            ? `✅ ${stockInfo[0].name} is in stock! ${stockInfo[0].stock} units available at ${stockInfo[0].price}.`
            : `❌ ${stockInfo[0].name} is currently out of stock.`
          : `Found ${stockInfo.length} matching products:`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to check stock.",
      type: "text",
    };
  }
}

/**
 * Get order status for a user
 */
async function getOrderStatus(userId, orderHint) {
  try {
    if (!userId) {
      return {
        success: false,
        message:
          "Please log in to check your order status. I can help you track your orders once you're signed in.",
        type: "text",
      };
    }

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("items.product", "name price");

    if (orders.length === 0) {
      return {
        success: true,
        type: "orders",
        data: [],
        message:
          "You don't have any orders yet. Start shopping to place your first order!",
      };
    }

    // If user gave a hint, try to match
    let filtered = orders;
    if (orderHint) {
      const hint = orderHint.toLowerCase();
      filtered = orders.filter((order) => {
        const orderId = order._id.toString().toLowerCase();
        const hasMatchingProduct = order.items.some((item) =>
          (item.product?.name || "").toLowerCase().includes(hint),
        );
        return orderId.includes(hint) || hasMatchingProduct;
      });
      if (filtered.length === 0) filtered = orders.slice(0, 3);
    }

    const orderData = filtered.slice(0, 3).map((order) => ({
      id: order._id.toString().slice(-6).toUpperCase(),
      status: order.order_status || "confirmed",
      total: `$${order.total_amount || 0}`,
      date: order.createdAt
        ? new Date(order.createdAt).toLocaleDateString()
        : "N/A",
      items: (order.items || []).map((item) => ({
        name: item.product?.name || "Product",
        quantity: item.quantity || 1,
        price: `$${item.price || 0}`,
      })),
      paymentStatus: order.payment_status || "pending",
    }));

    return {
      success: true,
      type: "orders",
      data: orderData,
      message: `Here are your recent orders:`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to retrieve order status.",
      type: "text",
    };
  }
}

/**
 * Search products using vector store
 */
async function searchProducts(query) {
  try {
    await vectorStore.ensureBuilt();

    const results = vectorStore.searchProducts(query, 5);

    if (results.length === 0) {
      // Fallback to regex search
      const products = await Product.find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      }).limit(5);

      if (products.length === 0) {
        return {
          success: true,
          type: "products",
          data: [],
          message: `No products found matching "${query}".`,
        };
      }

      return {
        success: true,
        type: "products",
        data: products.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          price: `$${p.price}`,
          category: p.category || "N/A",
          stock: p.stock || 0,
          image: p.imageUrl || p.image || "",
        })),
        message: `Found ${products.length} products:`,
      };
    }

    return {
      success: true,
      type: "products",
      data: results.map((r) => ({
        id: r.id,
        name: r.title,
        price: r.metadata?.price ? `$${r.metadata.price}` : "N/A",
        category: r.metadata?.category || "N/A",
        stock: r.metadata?.stock || 0,
        image: r.metadata?.image || "",
        relevance: `${(r.score * 100).toFixed(0)}%`,
      })),
      message: `Found ${results.length} relevant products:`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to search products.",
      type: "text",
    };
  }
}

/**
 * Add product to user's cart
 */
async function addToCart(userId, productName, quantity = 1) {
  try {
    if (!userId) {
      return {
        success: false,
        message: "Please log in to add items to your cart.",
        type: "text",
      };
    }

    const product = await Product.findOne({
      name: { $regex: new RegExp(productName, "i") },
    });

    if (!product) {
      return {
        success: false,
        message: `Could not find product "${productName}".`,
        type: "text",
      };
    }

    if ((product.stock || 0) <= 0) {
      return {
        success: false,
        message: `Sorry, ${product.name} is currently out of stock.`,
        type: "text",
      };
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === product._id.toString(),
    );

    if (itemIndex > -1) {
      const newQty = cart.items[itemIndex].quantity + quantity;
      if (newQty > product.stock) {
        return {
          success: false,
          message: `Only ${product.stock} units of ${product.name} available. You already have ${cart.items[itemIndex].quantity} in your cart.`,
          type: "text",
        };
      }
      cart.items[itemIndex].quantity = newQty;
    } else {
      if (quantity > product.stock) {
        return {
          success: false,
          message: `Only ${product.stock} units of ${product.name} available.`,
          type: "text",
        };
      }
      cart.items.push({ product: product._id, quantity: quantity });
    }

    await cart.save();

    return {
      success: true,
      type: "cart_action",
      data: {
        product: product.name,
        quantity: quantity,
        price: `$${product.price}`,
        image: product.imageUrl || product.image || "",
        id: product._id.toString(),
      },
      message: `✅ Added ${quantity}x ${product.name} ($${product.price}) to your cart!`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to add to cart.",
      type: "text",
    };
  }
}

/**
 * Get personalized recommendations
 */
async function getRecommendations(userId, userActivity) {
  try {
    await vectorStore.ensureBuilt();

    let recommendedProducts = [];

    // If we have user activity, use it for recommendations
    if (userActivity && userActivity.topCategories) {
      const categories = userActivity.topCategories.slice(0, 3);
      const categoryProducts = await Product.find({
        category: { $in: categories.map((c) => new RegExp(c, "i")) },
        stock: { $gt: 0 },
      }).limit(6);

      recommendedProducts = categoryProducts;
    }

    // If not enough, fill with popular/random products
    if (recommendedProducts.length < 4) {
      const existing = recommendedProducts.map((p) => p._id.toString());
      const fill = await Product.find({
        _id: { $nin: existing },
        stock: { $gt: 0 },
      }).limit(6 - recommendedProducts.length);
      recommendedProducts = [...recommendedProducts, ...fill];
    }

    return {
      success: true,
      type: "products",
      data: recommendedProducts.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        price: `$${p.price}`,
        category: p.category || "N/A",
        stock: p.stock || 0,
        image: p.imageUrl || p.image || "",
      })),
      message:
        userActivity && userActivity.topCategories
          ? `Based on your interest in ${userActivity.topCategories.slice(0, 2).join(" and ")}, here are some recommendations:`
          : "Here are some popular products you might like:",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to get recommendations.",
      type: "text",
    };
  }
}

/**
 * Find shops in a specific city
 */
async function findNearbyShops(city) {
  try {
    const query = city ? { city: { $regex: new RegExp(city, "i") } } : {};
    const shops = await Shop.find(query).limit(5);

    if (shops.length === 0) {
      return {
        success: true,
        type: "shops",
        data: [],
        message: city
          ? `I couldn't find any shops in ${city} right now.`
          : "I couldn't find any registered shops at the moment.",
      };
    }

    return {
      success: true,
      type: "shops",
      data: shops.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        address: s.address,
        city: s.city,
        radius: s.deliveryRadiusKm || 5,
      })),
      message: city
        ? `Here are some shops I found in ${city}:`
        : "Here are some of our popular shops:",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to find shops.",
      type: "text",
    };
  }
}

// ============ TOOL EXECUTOR ============

/**
 * Parse the LLM's tool call and execute the appropriate function
 */
async function executeTool(toolName, args, userId) {
  switch (toolName) {
    case "compare_products":
      return compareProducts(args.product_names || []);

    case "check_delivery":
      return checkDelivery(args.product_name || "", args.location || "");

    case "find_similar":
      return findSimilar(args.product_name || "");

    case "check_stock":
      return checkStock(args.product_name || "");

    case "get_order_status":
      return getOrderStatus(userId, args.order_hint || "");

    case "search_products":
      return searchProducts(args.query || "");

    case "add_to_cart":
      return addToCart(userId, args.product_name || "", args.quantity || 1);

    case "get_recommendations":
      return getRecommendations(userId, args.user_activity || null);

    case "find_nearby_shops":
      return findNearbyShops(args.city || "");

    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
        type: "text",
      };
  }
}

// ============ TOOL CALL PARSER ============

/**
 * Build the system prompt that teaches the LLM about available tools
 */
function buildAgentSystemPrompt(personalizationContext) {
  const toolDescriptions = TOOL_DEFINITIONS.map(
    (tool) =>
      `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters)}`,
  ).join("\n");

  let prompt =
    `You are QuickBazaar AI Assistant — a smart shopping agent for a local artisan marketplace.\n` +
    `You can both answer questions AND perform actions using tools.\n\n` +
    `## Available Tools\n${toolDescriptions}\n\n` +
    `## How to use tools\n` +
    `When you need to perform an action, respond with ONLY this line and NOTHING ELSE:\n` +
    `TOOL_CALL: {"tool": "tool_name", "args": {"param": "value"}}\n\n` +
    `CRITICAL: When using a tool, your ENTIRE response must be ONLY the TOOL_CALL line. Do NOT add any other text, explanation, or commentary before or after it.\n\n` +
    `## Rules\n` +
    `1. Use tools when the user asks to DO something (compare, check, search, add to cart).\n` +
    `2. For simple questions about policies, just answer directly from context.\n` +
    `3. Be concise and helpful. Don't invent data — use tools to fetch real data.\n` +
    `4. Payments are cash on delivery only.\n` +
    `5. Always be friendly and use emojis occasionally.\n` +
    `6. If you can't find what the user wants, suggest alternatives.\n` +
    `7. NEVER make up product names, prices, or stock data — always use tools.\n` +
    `8. When answering after a tool result, provide a natural conversational response. Do NOT include any TOOL_CALL text.\n`;

  if (personalizationContext) {
    prompt += `\n## User Profile\n${personalizationContext}\n`;
  }

  return prompt;
}

/**
 * Parse tool call from LLM response
 */
function parseToolCall(response) {
  const toolCallRegex = /TOOL_CALL:\s*(\{[\s\S]*?\})/;
  const match = response.match(toolCallRegex);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    return {
      tool: parsed.tool,
      args: parsed.args || {},
      fullMatch: match[0],
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  executeTool,
  buildAgentSystemPrompt,
  parseToolCall,
  compareProducts,
  checkDelivery,
  findSimilar,
  checkStock,
  getOrderStatus,
  searchProducts,
  addToCart,
  getRecommendations,
  findNearbyShops,
};
