import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true
    },

    body: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["order", "promotion", "system", "rider"],
      default: "system"
    },

    read: {
      type: Boolean,
      default: false,
      index: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

export const Notification = mongoose.model("Notification", notificationSchema);