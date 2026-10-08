import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["percentage", "fixed", "free_delivery"],
      required: true
    },

    value: {
      type: Number,
      default: 0
    },

    minSubtotal: {
      type: Number,
      default: 0
    },

    active: {
      type: Boolean,
      default: true
    },

    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const Coupon = mongoose.model("Coupon", couponSchema);