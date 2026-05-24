/**
 * =====================================================
 * AI AGENT ROUTES - RAG + Agentic Workflows + Image Search
 * =====================================================
 *
 * Upgraded from simple chatbot to a full AI Agent with:
 * 1. RAG: Vector-based retrieval for accurate product info
 * 2. Agentic Workflows: Tool-calling for actions (compare, delivery, cart)
 * 3. Image Search: Upload image → find similar products
 * 4. Personalization: User activity-aware responses
 */

const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const adminAuth = require("../middleware/adminAuth");
const Order = require("../models/Order");
const UserActivity = require("../models/UserActivity");
const { syncSupportDocs } = require("../support/supportDocs");
const { vectorStore } = require("../services/vectorStore");
const {
  executeTool,
  buildAgentSystemPrompt,
  parseToolCall,
} = require("../services/agentTools");

const router = express.Router();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ============ HELPERS ============

const getUserIdFromAuthHeader = (authHeader) => {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null;
  }
};

const getUserName = (authHeader) => {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.name || null;
  } catch {
    return null;
  }
};

/**
 * Build personalization context from user activity
 */
const buildPersonalizationContext = async (userId) => {
  if (!userId) return null;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await UserActivity.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(50);

    if (activities.length === 0) return null;

    const categoryScores = {};
    const recentSearches = [];

    activities.forEach((activity) => {
      if (activity.category) {
        const weight =
          activity.action === "purchase"
            ? 5
            : activity.action === "add_to_cart"
              ? 3
              : activity.action === "view_product"
                ? 2
                : 1;
        categoryScores[activity.category] =
          (categoryScores[activity.category] || 0) + weight;
      }
      if (activity.action === "search" && activity.query) {
        recentSearches.push(activity.query);
      }
    });

    const topCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    if (topCategories.length === 0 && recentSearches.length === 0) return null;

    let context = "This user's preferences:\n";
    if (topCategories.length > 0) {
      context += `- Favorite categories: ${topCategories.join(", ")}\n`;
    }
    if (recentSearches.length > 0) {
      context += `- Recent searches: ${recentSearches.slice(0, 3).join(", ")}\n`;
    }
    context += `- Total interactions: ${activities.length} in the last 30 days\n`;

    return { context, topCategories };
  } catch {
    return null;
  }
};

/**
 * Call the Groq LLM
 */
const callLLM = async (messages, temperature = 0.3) => {
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      temperature,
      max_tokens: 800,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  return (
    response.data?.choices?.[0]?.message?.content?.trim() ||
    "Sorry, I could not generate a response."
  );
};

// ============ ROUTES ============

/**
 * POST /api/support/sync
 * Sync support docs and rebuild vector store
 */
router.post("/sync", adminAuth, async (req, res) => {
  try {
    const summary = await syncSupportDocs();
    await vectorStore.rebuild();
    res.json({ success: true, summary, vectorStoreRebuilt: true });
  } catch (error) {
    console.error("Support sync error:", error.message);
    res.status(500).json({ message: "Failed to sync support docs" });
  }
});

/**
 * POST /api/support/chat
 * Main AI Agent chat endpoint with RAG + tool calling
 */
router.post("/chat", async (req, res) => {
  try {
    const message = (req.body.message || "").toString().trim();
    const history = Array.isArray(req.body.history) ? req.body.history : [];

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res
        .status(500)
        .json({ message: "GROQ_API_KEY is not configured" });
    }

    // Ensure vector store is built
    await vectorStore.ensureBuilt();

    // Get user context
    const userId = getUserIdFromAuthHeader(req.headers.authorization);
    const userName = getUserName(req.headers.authorization);

    // Build personalization context
    const personalization = await buildPersonalizationContext(userId);
    let personalizationText = "";
    if (personalization) {
      personalizationText = personalization.context;
    }
    if (userName) {
      personalizationText =
        `User's name is ${userName}.\n` + personalizationText;
    }

    // RAG: Vector search for relevant context
    const ragResults = vectorStore.search(message, 6);
    let ragContext = "";
    if (ragResults.length > 0) {
      ragContext = ragResults
        .map(
          (r, i) =>
            `[${i + 1}] ${r.title} (${r.type}, relevance: ${(r.score * 100).toFixed(0)}%)\n${r.text.slice(0, 300)}`,
        )
        .join("\n\n");
    }

    // Get user's recent orders for context
    let ordersContext = "";
    if (userId) {
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(3);
      if (orders.length > 0) {
        ordersContext = orders
          .map((order) => {
            const itemCount = (order.items || []).reduce(
              (sum, item) => sum + (item.quantity || 0),
              0,
            );
            return `Order ${order._id.toString().slice(-6).toUpperCase()}: ${itemCount} items, $${order.total_amount || 0}, status: ${order.order_status || "confirmed"}`;
          })
          .join("\n");
      }
    }

    // Build agent system prompt
    const systemPrompt = buildAgentSystemPrompt(personalizationText);

    // Build context message
    const contextParts = [];
    if (ragContext) contextParts.push(`Relevant Knowledge:\n${ragContext}`);
    if (ordersContext)
      contextParts.push(`User's Recent Orders:\n${ordersContext}`);

    const contextMessage = contextParts.length
      ? contextParts.join("\n\n---\n\n")
      : "No specific context available. Use tools to search for information.";

    // Prepare conversation
    const trimmedHistory = history
      .filter((item) => item && item.role && item.content)
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: item.content.toString(),
      }));

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Context:\n${contextMessage}` },
      ...trimmedHistory,
      { role: "user", content: message },
    ];

    // First LLM call — may return a tool call or a direct answer
    let reply = await callLLM(messages);
    let toolResult = null;
    let sources = ragResults.map((r) => ({
      title: r.title,
      type: r.type,
      id: r.id,
      score: r.score,
    }));

    // Check if the LLM wants to call a tool
    const toolCall = parseToolCall(reply);
    if (toolCall) {
      // Execute the tool
      toolResult = await executeTool(toolCall.tool, toolCall.args, userId);

      // Log the tool usage as activity
      if (userId) {
        try {
          await UserActivity.create({
            user: userId,
            action: "chat_query",
            query: message,
            metadata: { tool: toolCall.tool },
          });
        } catch {
          // non-critical
        }
      }

      // Second LLM call — feed tool result back for natural language response
      const toolResultText =
        typeof toolResult.message === "string"
          ? toolResult.message
          : JSON.stringify(toolResult);

      messages.push({ role: "assistant", content: reply });
      messages.push({
        role: "system",
        content: `Tool "${toolCall.tool}" returned:\n${toolResultText}\n\nNow provide a helpful, natural language response to the user based on this tool result. If the result contains product data, format it nicely.`,
      });

      reply = await callLLM(messages);

      // Remove the TOOL_CALL line from the response if it leaked
      reply = reply
        .replace(/TOOL_CALL\s*:\s*\{[^}]*(\{[^}]*\}[^}]*)?\}/gi, "")
        .replace(/^\s*\}\s*/gm, "")
        .replace(/```json[\s\S]*?```/gi, "")
        .replace(/```[\s\S]*?```/gi, "")
        .trim();

      // If reply is empty after cleanup, use tool result message
      if (!reply) {
        reply = toolResult.message || "Done! Check the results above.";
      }
    } else {
      // Log chat activity
      if (userId) {
        try {
          await UserActivity.create({
            user: userId,
            action: "chat_query",
            query: message,
            category:
              ragResults.length > 0
                ? ragResults[0].metadata?.category || ""
                : "",
          });
        } catch {
          // non-critical
        }
      }
    }

    res.json({
      reply,
      sources: sources.slice(0, 4),
      toolResult,
      personalized: !!personalization,
    });
  } catch (error) {
    console.error("Support chat error:", error.message);
    res.status(500).json({ message: "Support assistant is unavailable" });
  }
});

/**
 * POST /api/support/image-search
 * Multimodal: Upload an image, AI describes it, find matching products
 */
router.post("/image-search", async (req, res) => {
  try {
    const { image } = req.body; // base64 encoded image

    if (!image) {
      return res.status(400).json({ message: "Image is required" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res
        .status(500)
        .json({ message: "GROQ_API_KEY is not configured" });
    }

    // Step 1: Use vision model to describe the product in the image
    const visionResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this product image in detail for an e-commerce search. Include: type of product, color, material, style, and potential category. Be concise but specific. Output only the description, nothing else.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image.startsWith("data:")
                    ? image
                    : `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const description =
      visionResponse.data?.choices?.[0]?.message?.content?.trim() || "";

    if (!description) {
      return res
        .status(500)
        .json({ message: "Could not analyze the image." });
    }

    // Step 2: Use the description to search via RAG
    await vectorStore.ensureBuilt();
    const results = vectorStore.searchProducts(description, 6);

    // Track activity
    const userId = getUserIdFromAuthHeader(req.headers.authorization);
    if (userId) {
      try {
        await UserActivity.create({
          user: userId,
          action: "search",
          query: `[Image Search] ${description.slice(0, 100)}`,
          metadata: { type: "image_search" },
        });
      } catch {
        // non-critical
      }
    }

    res.json({
      description,
      products: results.map((r) => ({
        id: r.id,
        name: r.title,
        price: r.metadata?.price ? `$${r.metadata.price}` : "N/A",
        category: r.metadata?.category || "N/A",
        stock: r.metadata?.stock || 0,
        image: r.metadata?.image || "",
        relevance: `${(r.score * 100).toFixed(0)}%`,
      })),
    });
  } catch (error) {
    console.error("Image search error:", error.message);

    // Fallback: if vision model not available, return helpful message
    if (
      error.response?.status === 400 ||
      error.response?.status === 422
    ) {
      return res.status(400).json({
        message:
          "Image search is temporarily unavailable. Try describing the product in text instead!",
        fallback: true,
      });
    }

    res.status(500).json({ message: "Image search failed" });
  }
});

/**
 * POST /api/support/personalize
 * Get personalized greeting/recommendations for the chat widget
 */
router.post("/personalize", async (req, res) => {
  try {
    const userId = getUserIdFromAuthHeader(req.headers.authorization);
    if (!userId) {
      return res.json({
        greeting: "Hi! 👋 How can I help you today?",
        suggestions: [
          "Search for products",
          "Track my order",
          "Compare products",
        ],
      });
    }

    const personalization = await buildPersonalizationContext(userId);
    const userName = getUserName(req.headers.authorization);

    let greeting = userName
      ? `Welcome back, ${userName}! 👋 `
      : "Welcome back! 👋 ";

    const suggestions = [
      "Search for products",
      "Track my order",
      "Compare products",
    ];

    if (personalization && personalization.topCategories.length > 0) {
      const topCat = personalization.topCategories[0];
      greeting += `Based on your interest in **${topCat}**, you might love our latest arrivals!`;
      suggestions.unshift(`Show me new ${topCat} products`);
    } else {
      greeting += "How can I help you today?";
    }

    res.json({
      greeting,
      suggestions: suggestions.slice(0, 4),
      personalized: !!personalization,
    });
  } catch (error) {
    console.error("Personalization error:", error.message);
    res.json({
      greeting: "Hi! 👋 How can I help you today?",
      suggestions: [
        "Search for products",
        "Track my order",
        "Compare products",
      ],
    });
  }
});

module.exports = router;
