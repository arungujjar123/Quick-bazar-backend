const mongoose = require("mongoose");

const supportDocSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: "",
    },
    refId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

supportDocSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("SupportDoc", supportDocSchema);
