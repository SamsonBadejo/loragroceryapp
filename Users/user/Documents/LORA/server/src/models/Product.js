import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true
    },

    description: { type: String, required: true },

    images: { type: [String], default: [] },

    price: { type: Number, required: true, min: 0 },

    compareAtPrice: { type: Number, min: 0 },

    unit: { type: String, required: true },

    unitPricing: {
      amount: { type: Number, default: 1 },
      label: { type: String, default: "unit" }
    },

    deliveryWeight: {
      type: Number,
      default: 0
    },

    stock: { type: Number, default: 0, min: 0 },

    stockAlertAt: { type: Number, default: 8 },

    tags: { type: [String], default: [] },

    promotionalTags: { type: [String], default: [] },

    status: {
      type: String,
      enum: ["draft", "active", "out_of_stock", "archived"],
      default: "active",
      index: true
    },

    nutrition: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    origin: { type: String, default: "" },

    shelfLife: { type: String, default: "" },

    ratingAverage: { type: Number, default: 0 },

    ratingCount: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },

    isTrending: { type: Boolean, default: false },

    isFlashSale: { type: Boolean, default: false },

    flashSaleEndsAt: Date,

    discountPercent: { type: Number, default: 0 },

    active: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

productSchema.index({
  name: "text",
  description: "text",
  tags: "text",
  promotionalTags: "text"
});

export const Product = mongoose.model("Product", productSchema);