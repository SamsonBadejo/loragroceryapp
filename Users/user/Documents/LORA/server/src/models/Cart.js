import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    priceAtAdd: {
      type: Number,
      required: true
    }
  },
  {
    _id: false
  }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    items: {
      type: [cartItemSchema],
      default: []
    },

    couponCode: {
      type: String,
      uppercase: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Cart = mongoose.model("Cart", cartSchema);