const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    deliveryRadiusKm: {
      type: Number,
      default: 5,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Auto-sync configuration for live OneDrive/Google Sheet link
    syncUrl: {
      type: String,
      default: "",
      trim: true,
    },
    syncEnabled: {
      type: Boolean,
      default: false,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    lastSyncStatus: {
      type: String,
      enum: ["success", "failed", "pending", "none"],
      default: "none",
    },
    lastSyncMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

shopSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Shop", shopSchema);
