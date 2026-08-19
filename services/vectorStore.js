/**
 * =====================================================
 * VECTOR STORE - Pinecone Cloud Vector DB Integration
 * =====================================================
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const SupportDoc = require("../models/SupportDoc");

// Initialize Pinecone Client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Access Pinecone Index
const indexName = process.env.PINECONE_INDEX || 'quickbazaar';
const index = pc.Index(indexName);

class VectorStore {
  constructor() {
    this.isBuilt = false;
    this.lastBuildTime = null;
  }

  /**
   * Generate Embeddings using Pinecone's serverless Inference API
   */
  async getEmbedding(text, isQuery = false) {
    try {
      const response = await pc.inference.embed({
        model: 'multilingual-e5-large',
        inputs: [text],
        parameters: { inputType: isQuery ? 'query' : 'passage' }
      });
      return response.data[0].values;
    } catch (error) {
      console.error("❌ Pinecone Embedding Error:", error.message || error);
      throw error;
    }
  }

  /**
   * Rebuild/Sync Pinecone index from MongoDB documents
   */
  async build() {
    try {
      console.log("🔨 Syncing MongoDB data to Pinecone index...");

      const [products, supportDocs] = await Promise.all([
        Product.find().populate("shop", "name city address deliveryRadiusKm"),
        SupportDoc.find(),
      ]);

      const vectorsToUpsert = [];

      // 1. Process Products into Embeddings
      for (const product of products) {
        const textParts = [
          product.name || "",
          product.description || "",
          product.category || "",
          `price ${product.price}`,
          `stock ${product.stock || 0}`,
        ];

        if (product.shop) {
          textParts.push(product.shop.name || "");
          textParts.push(product.shop.city || "");
        }

        const text = textParts.join(" ");
        const values = await this.getEmbedding(text, false);

        vectorsToUpsert.push({
          id: product._id.toString(),
          values,
          metadata: {
            id: product._id.toString(),
            type: "product",
            title: product.name || "",
            text,
            price: product.price || 0,
            category: product.category || "",
            stock: product.stock || 0,
            image: product.imageUrl || product.image || "",
            shopName: product.shop?.name || "",
            shopCity: product.shop?.city || "",
          }
        });
      }

      // 2. Process Support Documents into Embeddings
      for (const doc of supportDocs) {
        const text = `${doc.title || ""} ${doc.content || ""}`;
        const values = await this.getEmbedding(text, false);

        vectorsToUpsert.push({
          id: doc._id.toString(),
          values,
          metadata: {
            id: doc._id.toString(),
            type: doc.type || "doc",
            title: doc.title || "",
            text,
          }
        });
      }

      // Batch Upsert (Pinecone recommends upserting in batches of 50-100 vectors)
      if (vectorsToUpsert.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < vectorsToUpsert.length; i += batchSize) {
          const batch = vectorsToUpsert.slice(i, i + batchSize);
          await index.upsert(batch);
        }
      }

      this.isBuilt = true;
      this.lastBuildTime = new Date();
      console.log(`✅ Pinecone database successfully updated with ${vectorsToUpsert.length} vectors.`);
    } catch (error) {
      console.error("❌ Pinecone sync failed:", error.message || error);
    }
  }

  /**
   * Query Pinecone for most relevant documents
   */
  async search(query, topK = 6, filterType = null) {
    try {
      const queryVector = await this.getEmbedding(query, true);
      const filter = filterType ? { type: filterType } : undefined;

      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        filter,
        includeMetadata: true
      });

      return (queryResponse.matches || []).map(match => ({
        id: match.metadata.id,
        type: match.metadata.type,
        title: match.metadata.title,
        text: match.metadata.text,
        metadata: match.metadata,
        score: match.score
      }));
    } catch (error) {
      console.error("❌ Pinecone query failed:", error.message || error);
      return [];
    }
  }

  /**
   * Search specifically for products
   */
  async searchProducts(query, topK = 5) {
    return await this.search(query, topK, "product");
  }

  /**
   * Find similar products based on a product vector ID
   */
  async findSimilar(productId, topK = 5) {
    try {
      const queryResponse = await index.query({
        id: productId,
        topK: topK + 1,
        includeMetadata: true
      });

      return (queryResponse.matches || [])
        .filter(match => match.id !== productId)
        .map(match => ({
          id: match.metadata.id,
          type: match.metadata.type,
          title: match.metadata.title,
          metadata: match.metadata,
          score: match.score
        }))
        .slice(0, topK);
    } catch (error) {
      console.error("❌ Pinecone findSimilar failed:", error.message || error);
      return [];
    }
  }

  async rebuild() {
    await this.build();
  }

  async ensureBuilt() {
    if (!this.isBuilt) {
      await this.build();
    }
  }
}

const vectorStore = new VectorStore();

module.exports = { vectorStore };
