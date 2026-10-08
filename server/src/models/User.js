import mongoose from "mongoose";

const DEFAULT_STORE_LOCATION = [3.3792, 6.5244];

const locationPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: DEFAULT_STORE_LOCATION,
    },
  },
  { _id: false },
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    orderUpdates: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: false,
    },
    riderArrival: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const deliveryWorkerSchema = new mongoose.Schema(
  {
    workerType: {
      type: String,
      enum: ["rider", "deliveryBoy"],
      default: "rider",
    },

    online: {
      type: Boolean,
      default: false,
      index: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["offline", "available", "busy", "delivering", "suspended"],
      default: "offline",
      index: true,
    },

    availabilityStatus: {
      type: String,
      enum: ["offline", "available", "busy", "delivering", "suspended"],
      default: "offline",
      index: true,
    },

    currentLocation: {
      type: locationPointSchema,
      default: () => ({
        type: "Point",
        coordinates: DEFAULT_STORE_LOCATION,
      }),
    },

    vehicleType: {
      type: String,
      enum: ["bike", "car", "van", "scooter", "walking"],
      default: "bike",
    },

    maxDeliveryRadiusKm: {
      type: Number,
      default: function () {
        return this.workerType === "deliveryBoy" ? 5 : 150;
      },
    },

    coverageRadiusKm: {
      type: Number,
      default: function () {
        return this.workerType === "deliveryBoy" ? 5 : 150;
      },
    },

    earningsBalance: {
      type: Number,
      default: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },

    totalDeliveries: {
      type: Number,
      default: 0,
    },

    completedDeliveries: {
      type: Number,
      default: 0,
    },

    rejectedDeliveries: {
      type: Number,
      default: 0,
    },

    ratingAverage: {
      type: Number,
      default: 5,
    },

    isFlagged: {
      type: Boolean,
      default: false,
    },

    flagReason: {
      type: String,
      default: "",
    },

    flaggedAt: Date,

    suspendedReason: {
      type: String,
      default: "",
    },

    lastSeenAt: Date,

    historyClearedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      select: false,
    },

    avatar: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    role: {
      type: String,
      enum: ["customer", "admin", "rider", "deliveryBoy"],
      default: "customer",
      index: true,
    },

    deliveryWorker: {
      type: deliveryWorkerSchema,
      default: function () {
        if (this.role === "deliveryBoy") {
          return {
            workerType: "deliveryBoy",
            maxDeliveryRadiusKm: 5,
            coverageRadiusKm: 5,
          };
        }

        if (this.role === "rider") {
          return {
            workerType: "rider",
            maxDeliveryRadiusKm: 150,
            coverageRadiusKm: 150,
          };
        }

        return {};
      },
    },

    refreshTokenHash: {
      type: String,
      select: false,
    },

    googleId: String,

    otpHash: {
      type: String,
      select: false,
    },

    otpExpiresAt: Date,

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspensionReason: {
      type: String,
      default: "",
    },

    suspendedAt: Date,

    lastLoginAt: Date,

    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

userSchema.pre("save", function syncWorkerType() {
  if (this.role === "deliveryBoy") {
    this.deliveryWorker.workerType = "deliveryBoy";
    this.deliveryWorker.maxDeliveryRadiusKm = 5;
    this.deliveryWorker.coverageRadiusKm = 5;
  }

  if (this.role === "rider") {
    this.deliveryWorker.workerType = "rider";
    this.deliveryWorker.maxDeliveryRadiusKm = 150;
    this.deliveryWorker.coverageRadiusKm = 150;
  }

  if (!["rider", "deliveryBoy"].includes(this.role)) {
    this.deliveryWorker.online = false;
    this.deliveryWorker.isOnline = false;
    this.deliveryWorker.status = "offline";
    this.deliveryWorker.availabilityStatus = "offline";
  }
});

userSchema.index({ role: 1 });
userSchema.index({ email: 1 });
userSchema.index({ "deliveryWorker.online": 1 });
userSchema.index({ "deliveryWorker.isOnline": 1 });
userSchema.index({ "deliveryWorker.availabilityStatus": 1 });
userSchema.index({ "deliveryWorker.status": 1 });
userSchema.index({ "deliveryWorker.currentLocation": "2dsphere" });

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    delete ret.otpHash;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);
