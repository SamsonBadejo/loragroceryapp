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

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    name: String,
    image: String,
    unit: String,
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    recipientName: String,
    phone: String,
    line1: String,
    city: String,
    state: String,
    location: {
      type: pointSchema,
      required: true
    }
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["local", "cash", "paystack", "stripe", "flutterwave"],
      default: "local"
    },
    status: {
      type: String,
      enum: ["pending", "authorized", "paid", "failed", "refunded"],
      default: "pending"
    },
    amount: {
      type: Number,
      default: 0
    },
    reference: String
  },
  { _id: false }
);

const stageHistorySchema = new mongoose.Schema(
  {
    stage: String,
    note: String,
    date: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    etaMinutes: {
      type: Number,
      default: 35
    },
    notes: String,
    route: {
      type: [[Number]],
      default: []
    },
    riderLocation: {
      type: pointSchema,
      default: null
    },
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    proofOfDeliveryUrl: String
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    items: {
      type: [orderItemSchema],
      default: []
    },

    address: {
      type: addressSchema,
      required: true
    },

    totals: {
      type: totalsSchema,
      default: () => ({})
    },

    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    couponCode: String,

    paymentProvider: {
      type: String,
      enum: ["local", "cash", "paystack", "stripe", "flutterwave"],
      default: "local"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    payment: {
      type: paymentSchema,
      default: () => ({})
    },

    stage: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Preparing",
        "Packed",
        "Picked Up",
        "On The Way",
        "Delivered",
        "Cancelled",
        "Refunded"
      ],
      default: "Pending"
    },

    status: {
      type: String,
      default: "Pending"
    },

    stageHistory: {
      type: [stageHistorySchema],
      default: () => [
        {
          stage: "Pending",
          note: "Order created",
          date: new Date()
        }
      ]
    },

    deliveryServiceType: {
      type: String,
      enum: ["rider", "deliveryBoy"],
      default: "rider"
    },

    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    distanceKm: {
      type: Number,
      default: 0
    },

    deliveryWorkerPayout: {
      type: Number,
      default: 0
    },

    platformDeliveryMargin: {
      type: Number,
      default: 0
    },

    deliveryNotes: String,

    delivery: {
      type: deliverySchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ assignedRider: 1, createdAt: -1 });
orderSchema.index({ rider: 1, createdAt: -1 });
orderSchema.index({ stage: 1 });
orderSchema.index({ deliveryServiceType: 1 });
orderSchema.index({ "address.location": "2dsphere" });

orderSchema.pre("save", function syncTotals() {
  this.customer = this.customer || this.user;

  this.subtotal = this.totals?.subtotal || 0;
  this.tax = this.totals?.tax || 0;
  this.deliveryFee = this.totals?.deliveryFee || 0;
  this.discount = this.totals?.discount || 0;
  this.total = this.totals?.total || 0;

  this.status = this.stage;
});

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);