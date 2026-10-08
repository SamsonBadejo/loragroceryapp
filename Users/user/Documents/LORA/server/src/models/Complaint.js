import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
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

    type: {
      type: String,
      enum: [
        "rider",
        "damaged_item",
        "late_delivery",
        "refund_request",
        "missing_item",
        "other"
      ],
      required: true
    },

    description: {
      type: String,
      required: true
    },

    evidenceImages: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "rejected"],
      default: "open",
      index: true
    },

    adminResponse: {
      type: String,
      default: ""
    },

    resolution: {
      type: String,
      default: ""
    },

    refundAmount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);