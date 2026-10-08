import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  { _id: false }
);

const deliveryZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      default: "",
      trim: true
    },
    serviceType: {
      type: String,
      enum: ["all", "rider", "deliveryBoy"],
      default: "all"
    },
    center: {
      type: pointSchema,
      required: true
    },
    radiusKm: {
      type: Number,
      default: 10
    },
    baseEtaMinutes: {
      type: Number,
      default: 30
    },
    priceAdjustment: {
      type: Number,
      default: 0
    },
    surge: {
      rainMultiplier: { type: Number, default: 1 },
      trafficMultiplier: { type: Number, default: 1 },
      peakHourMultiplier: { type: Number, default: 1 }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

deliveryZoneSchema.index({ center: "2dsphere" });
deliveryZoneSchema.index({ serviceType: 1, isActive: 1 });

export const DeliveryZone = mongoose.model("DeliveryZone", deliveryZoneSchema);