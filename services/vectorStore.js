/**
 * =====================================================
 * VECTOR STORE - TF-IDF based vector search engine
 * =====================================================
 *
 * Lightweight RAG implementation using TF-IDF vectors
 * stored in MongoDB. No external vector DB required.
 *
 * Features:
 * - Builds TF-IDF vectors from product/doc text
 * - Cosine similarity search for retrieval
 * - Auto-rebuilds on product changes
 */

const Product = require("../models/Product");
const SupportDoc = require("../models/SupportDoc");

// ============ TF-IDF VECTORIZER ============

class TFIDFVectorizer {
  constructor() {
    this.vocabulary = new Map(); // word -> index
    this.idf = new Map(); // word -> IDF score
    this.vocabSize = 0;
  }

  /**
   * Tokenize and normalize text
   */
  tokenize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }

  /**
   * Build vocabulary and IDF from a corpus of documents
   */
  fit(documents) {
    const docCount = documents.length;
    const wordDocFrequency = new Map();

    // Count document frequency for each word
    documents.forEach((doc) => {
      const words = new Set(this.tokenize(doc));
      words.forEach((word) => {
        wordDocFrequency.set(word, (wordDocFrequency.get(word) || 0) + 1);
      });
    });

    // Build vocabulary (top 2000 words by document frequency)
    const sortedWords = Array.from(wordDocFrequency.entries())
      .filter(([, freq]) => freq >= 1 && freq < docCount * 0.95)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2000);

    this.vocabulary.clear();
    this.idf.clear();
    sortedWords.forEach(([word, freq], index) => {
      this.vocabulary.set(word, index);
      this.idf.set(word, Math.log((docCount + 1) / (freq + 1)) + 1);
    });

    this.vocabSize = this.vocabulary.size;
  }

  /**
   * Transform a single document into a TF-IDF vector
   */
  transform(text) {
    const tokens = this.tokenize(text);
    const tf = new Map();
    tokens.forEach((token) => {
      tf.set(token, (tf.get(token) || 0) + 1);
    });

    const vector = new Array(this.vocabSize).fill(0);
    const maxTF = Math.max(...tf.values(), 1);

    tf.forEach((count, word) => {
      const index = this.vocabulary.get(word);
      if (index !== undefined) {
        const normalizedTF = count / maxTF;
        const idfScore = this.idf.get(word) || 0;
        vector[index] = normalizedTF * idfScore;
      }
    });

    // L2 normalize
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }
}

// ============ COSINE SIMILARITY ============

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// ============ VECTOR STORE SINGLETON ============

class VectorStore {
  constructor() {
    this.vectorizer = new TFIDFVectorizer();
    this.documents = []; // { id, type, title, text, vector, metadata }
    this.isBuilt = false;
    this.lastBuildTime = null;
  }

  /**
   * Build the vector index from all products and support docs
   */
  async build() {
    try {
      console.log("🔨 Building vector store...");

      const [products, supportDocs] = await Promise.all([
        Product.find().populate("shop", "name city address deliveryRadiusKm"),
        SupportDoc.find(),
      ]);

      this.documents = [];

      // Add products
      products.forEach((product) => {
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

        this.documents.push({
          id: product._id.toString(),
          type: "product",
          title: product.name,
          text: textParts.join(" "),
          metadata: {
            price: product.price,
            category: product.category,
            stock: product.stock || 0,
            image: product.imageUrl || product.image || "",
            shopName: product.shop?.name || "",
            shopCity: product.shop?.city || "",
          },
        });
      });

      // Add support docs
      supportDocs.forEach((doc) => {
        this.documents.push({
          id: doc._id.toString(),
          type: doc.type || "doc",
          title: doc.title,
          text: `${doc.title} ${doc.content}`,
          metadata: doc.metadata || {},
        });
      });

      // Fit vectorizer on all document texts
      const allTexts = this.documents.map((doc) => doc.text);
      this.vectorizer.fit(allTexts);

      // Compute vectors for all documents
      this.documents.forEach((doc) => {
        doc.vector = this.vectorizer.transform(doc.text);
      });

      this.isBuilt = true;
      this.lastBuildTime = new Date();
      console.log(
        `✅ Vector store built: ${this.documents.length} documents, ${this.vectorizer.vocabSize} vocabulary terms`,
      );
    } catch (error) {
      console.error("❌ Vector store build error:", error.message);
      this.isBuilt = false;
    }
  }

  /**
   * Search for the most relevant documents given a query
   * @param {string} query - Search query text
   * @param {number} topK - Number of results to return
   * @param {string} filterType - Optional: filter by document type ('product', 'policy', etc.)
   * @returns {Array} Ranked results with scores
   */
  search(query, topK = 6, filterType = null) {
    if (!this.isBuilt || this.documents.length === 0) {
      return [];
    }

    const queryVector = this.vectorizer.transform(query);
    let candidates = this.documents;

    if (filterType) {
      candidates = candidates.filter((doc) => doc.type === filterType);
    }

    const scored = candidates
      .map((doc) => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        text: doc.text,
        metadata: doc.metadata,
        score: cosineSimilarity(queryVector, doc.vector),
      }))
      .filter((result) => result.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  /**
   * Search specifically for products
   */
  searchProducts(query, topK = 5) {
    return this.search(query, topK, "product");
  }

  /**
   * Find similar products to a given product ID
   */
  findSimilar(productId, topK = 5) {
    const sourceDoc = this.documents.find(
      (doc) => doc.id === productId && doc.type === "product",
    );
    if (!sourceDoc) return [];

    return this.documents
      .filter((doc) => doc.type === "product" && doc.id !== productId)
      .map((doc) => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        metadata: doc.metadata,
        score: cosineSimilarity(sourceDoc.vector, doc.vector),
      }))
      .filter((result) => result.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Rebuild the index (call after product changes)
   */
  async rebuild() {
    await this.build();
  }

  /**
   * Auto-build if not built or stale (> 30 mins)
   */
  async ensureBuilt() {
    const staleMs = 30 * 60 * 1000;
    if (
      !this.isBuilt ||
      !this.lastBuildTime ||
      Date.now() - this.lastBuildTime.getTime() > staleMs
    ) {
      await this.build();
    }
  }
}

// Singleton instance
const vectorStore = new VectorStore();

module.exports = { vectorStore, cosineSimilarity, TFIDFVectorizer };
