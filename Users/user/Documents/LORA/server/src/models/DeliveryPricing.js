import mongoose from "mongoose";

const customerTierSchema = new mongoose.Schema(
  {
    fromKm: { type: Number, required: true },
    toKm: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const payoutTierSchema = new mongoose.Schema(
  {
    fromKm: { type: Number, required: true },
    toKm: { type: Number, required: true },
    payout: { type: Number, required: true }
  },
  { _id: false }
);

const deliveryPricingSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      enum: ["rider", "deliveryBoy"],
      required: true,
      unique: true
    },
    label: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    customerTiers: {
      type: [customerTierSchema],
      default: []
    },
    perKmPriceAfterLastTier: {
      type: Number,
      default: 300
    },
    surge: {
      rainMultiplier: { type: Number, default: 1 },
      trafficMultiplier: { type: Number, default: 1 },
      peakHourMultiplier: { type: Number, default: 1 },
      manualSurgeEnabled: { type: Boolean, default: false },
      manualSurgeMultiplier: { type: Number, default: 1 }
    },
    payout: {
      basePayout: { type: Number, default: 1000 },
      perKmAfterKm: { type: Number, default: 3 },
      perKmAmount: { type: Number, default: 150 },
      localTiers: {
        type: [payoutTierSchema],
        default: []
      }
    },
    platform: {
      minimumMargin: { type: Number, default: 300 },
      marginPercent: { type: Number, default: 20 }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

deliveryPricingSchema.index({ serviceType: 1 });

export const DeliveryPricing = mongoose.model("DeliveryPricing", deliveryPricingSchema);