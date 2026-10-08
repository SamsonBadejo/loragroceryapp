import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    provider: {
      type: String,
      enum: ["local", "cash", "paystack", "stripe", "flutterwave"],
      default: "local"
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "NGN"
    },
    reference: {
      type: String,
      unique: true,
      sparse: true
    },
    accessCode: String,
    authorizationUrl: String,
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "abandoned"],
      default: "pending"
    },
    channel: String,
    gatewayResponse: String,
    paidAt: Date,
    verifiedAt: Date,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ provider: 1, status: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);