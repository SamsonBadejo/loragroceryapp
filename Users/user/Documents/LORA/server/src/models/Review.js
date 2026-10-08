import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    riderRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    packagingRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    speedRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    productQualityRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },

    comment: {
      type: String,
      default: ""
    },

    images: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ customer: 1, order: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);