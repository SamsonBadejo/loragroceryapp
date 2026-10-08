import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Complaint } from "../models/Complaint.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

const riderStatusSchema = z.object({
  action: z.enum(["activate", "suspend", "flag", "unflag", "setOnline", "setOffline"]),
  reason: z.string().max(500).optional().default("")
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function subDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function workerLocation(worker) {
  return (
    worker.deliveryWorker?.currentLocation ||
    worker.deliveryWorker?.location ||
    {
      type: "Point",
      coordinates: [3.3792, 6.5244]
    }
  );
}

function workerOnline(worker) {
  return Boolean(
    worker.deliveryWorker?.online ||
      worker.deliveryWorker?.isOnline ||
      worker.deliveryWorker?.availabilityStatus === "available"
  );
}

function workerStatus(worker) {
  if (worker.isSuspended) return "suspended";

  return (
    worker.deliveryWorker?.status ||
    worker.deliveryWorker?.availabilityStatus ||
    (workerOnline(worker) ? "available" : "offline")
  );
}

function publicWorker(worker, extra = {}) {
  const plain = worker.toObject ? worker.toObject() : worker;

  return {
    _id: plain._id,
    id: plain._id,
    name: plain.name,
    email: plain.email,
    phone: plain.phone,
    avatar: plain.avatar,
    role: plain.role,
    workerType: plain.deliveryWorker?.workerType || plain.role,
    isSuspended: plain.isSuspended,
    suspensionReason: plain.suspensionReason || plain.deliveryWorker?.suspendedReason || "",
    online: workerOnline(plain),
    status: workerStatus(plain),
    location: workerLocation(plain),
    earningsBalance:
      plain.deliveryWorker?.earningsBalance ||
      plain.deliveryWorker?.totalEarnings ||
      0,
    totalDeliveries:
      plain.deliveryWorker?.totalDeliveries ||
      plain.deliveryWorker?.completedDeliveries ||
      0,
    ratingAverage: plain.deliveryWorker?.ratingAverage || 5,
    flagged:
      plain.deliveryWorker?.flagged ||
      plain.deliveryWorker?.isFlagged ||
      false,
    deliveryWorker: plain.deliveryWorker,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    ...extra
  };
}

function orderTotalField() {
  return {
    $ifNull: ["$totals.total", { $ifNull: ["$total", 0] }]
  };
}

function paymentPaidMatch() {
  return {
    $or: [
      { paymentStatus: { $in: ["paid", "authorized"] } },
      { "payment.status": { $in: ["paid", "authorized"] } }
    ]
  };
}

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const today = startOfDay(now);
    const sevenDaysAgo = subDays(today, 6);

    const [
      totalSales,
      todayRevenue,
      activeOrders,
      repeatCustomers,
      riderCount,
      deliveryBoyCount,
      workers,
      lowStockProducts,
      openComplaints,
      recentOrders,
      revenueSeries,
      orderStageBreakdown,
      complaintSeries
    ] = await Promise.all([
      Order.aggregate([
        { $match: paymentPaidMatch() },
        { $group: { _id: null, total: { $sum: orderTotalField() } } }
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: today },
            ...paymentPaidMatch()
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: orderTotalField() },
            count: { $sum: 1 }
          }
        }
      ]),

      Order.countDocuments({
        $or: [
          { status: { $nin: ["Delivered", "Cancelled", "Refunded"] } },
          { stage: { $nin: ["Delivered", "Cancelled", "Refunded"] } }
        ]
      }),

      Order.aggregate([
        { $group: { _id: { $ifNull: ["$user", "$customer"] }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
        { $count: "total" }
      ]),

      User.countDocuments({ role: "rider" }),

      User.countDocuments({ role: "deliveryBoy" }),

      User.find({
        role: { $in: ["rider", "deliveryBoy"] }
      })
        .sort({
          "deliveryWorker.online": -1,
          "deliveryWorker.isOnline": -1,
          updatedAt: -1
        })
        .limit(50),

      Product.find({
        stock: { $lte: 10 },
        status: { $ne: "archived" },
        active: { $ne: false }
      })
        .sort({ stock: 1 })
        .limit(10)
        .select("name stock images price unit"),

      Complaint.countDocuments({
        status: { $ne: "resolved" }
      }),

      Order.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("user", "name email phone")
        .populate("customer", "name email phone")
        .populate("assignedRider", "name role phone")
        .populate("rider", "name role phone"),

      Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            revenue: { $sum: orderTotalField() },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      Order.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$stage", "$status"] },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      Complaint.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            complaints: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalCustomers = await User.countDocuments({ role: "customer" });
    const publicWorkers = workers.map((worker) => publicWorker(worker));

    res.json({
      metrics: {
        totalSales: totalSales[0]?.total || 0,
        dailyRevenue: todayRevenue[0]?.total || 0,
        dailyOrders: todayRevenue[0]?.count || 0,
        activeOrders,
        repeatCustomers: repeatCustomers[0]?.total || 0,
        riders: riderCount,
        deliveryBoys: deliveryBoyCount,
        activeRiders: publicWorkers.filter((worker) => worker.online).length,
        totalCustomers,
        openComplaints
      },
      revenueSeries: revenueSeries.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        orders: item.orders
      })),
      complaintSeries: complaintSeries.map((item) => ({
        date: item._id,
        complaints: item.complaints
      })),
      orderStageBreakdown: orderStageBreakdown.map((item) => ({
        stage: item._id || "Unknown",
        count: item.count
      })),
      lowStockProducts,
      productsLowStock: lowStockProducts,
      riders: publicWorkers,
      recentOrders
    });
  })
);

router.get(
  "/live-map",
  asyncHandler(async (_req, res) => {
    const [workers, activeOrders] = await Promise.all([
      User.find({
        role: { $in: ["rider", "deliveryBoy"] },
        isSuspended: false,
        $or: [
          { "deliveryWorker.online": true },
          { "deliveryWorker.isOnline": true },
          { "deliveryWorker.availabilityStatus": { $in: ["available", "busy", "delivering"] } },
          { "deliveryWorker.status": { $in: ["available", "busy", "delivering"] } }
        ]
      }).select("name phone email role deliveryWorker avatar"),

      Order.find({
        $or: [
          { status: { $nin: ["Delivered", "Cancelled", "Refunded"] } },
          { stage: { $nin: ["Delivered", "Cancelled", "Refunded"] } }
        ]
      })
        .populate("user", "name phone")
        .populate("customer", "name phone")
        .populate("assignedRider", "name phone role deliveryWorker")
        .populate("rider", "name phone role deliveryWorker")
        .sort({ updatedAt: -1 })
        .limit(100)
    ]);

    const publicWorkers = workers.map((worker) => publicWorker(worker));

    res.json({
      workers: publicWorkers,
      riders: publicWorkers,
      activeOrders,
      orders: activeOrders
    });
  })
);

router.get(
  "/riders",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    const skip = (page - 1) * limit;

    const role = req.query.role || "all";
    const status = req.query.status || "all";
    const search = String(req.query.search || "").trim();

    const query = {
      role: { $in: ["rider", "deliveryBoy"] }
    };

    if (role === "rider" || role === "deliveryBoy") {
      query.role = role;
    }

    if (status === "suspended") {
      query.isSuspended = true;
    }

    if (status === "flagged") {
      query["deliveryWorker.isFlagged"] = true;
    }

    if (status === "online") {
      query.isSuspended = false;
      query.$or = [
        { "deliveryWorker.online": true },
        { "deliveryWorker.isOnline": true }
      ];
    }

    if (status === "available") {
      query.isSuspended = false;
      query["deliveryWorker.availabilityStatus"] = "available";
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const [workers, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-passwordHash -refreshTokenHash -otpHash"),
      User.countDocuments(query)
    ]);

    const workerIds = workers.map((worker) => worker._id);

    const stats = await Order.aggregate([
      {
        $match: {
          assignedRider: { $in: workerIds }
        }
      },
      {
        $group: {
          _id: "$assignedRider",
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: [{ $ifNull: ["$status", "$stage"] }, "Delivered"] }, 1, 0]
            }
          },
          activeOrders: {
            $sum: {
              $cond: [
                {
                  $not: {
                    $in: [
                      { $ifNull: ["$status", "$stage"] },
                      ["Delivered", "Cancelled", "Refunded"]
                    ]
                  }
                },
                1,
                0
              ]
            }
          },
          totalEarnings: { $sum: "$deliveryWorkerPayout" },
          averageDistanceKm: { $avg: "$distanceKm" }
        }
      }
    ]);

    const statsMap = new Map(stats.map((item) => [String(item._id), item]));

    res.json({
      riders: workers.map((worker) => {
        const workerStats = statsMap.get(String(worker._id)) || {};

        return publicWorker(worker, {
          analytics: {
            totalOrders: workerStats.totalOrders || 0,
            deliveredOrders: workerStats.deliveredOrders || 0,
            activeOrders: workerStats.activeOrders || 0,
            totalEarnings: workerStats.totalEarnings || 0,
            averageDistanceKm: Number((workerStats.averageDistanceKm || 0).toFixed(1))
          }
        });
      }),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

router.get(
  "/riders/:id",
  asyncHandler(async (req, res) => {
    const worker = await User.findOne({
      _id: req.params.id,
      role: { $in: ["rider", "deliveryBoy"] }
    }).select("-passwordHash -refreshTokenHash -otpHash");

    if (!worker) {
      throw new ApiError(404, "Rider or delivery boy not found");
    }

    const [analytics, deliveryHistory] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            assignedRider: worker._id
          }
        },
        {
          $group: {
            _id: "$assignedRider",
            totalOrders: { $sum: 1 },
            deliveredOrders: {
              $sum: {
                $cond: [{ $eq: [{ $ifNull: ["$status", "$stage"] }, "Delivered"] }, 1, 0]
              }
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: [{ $ifNull: ["$status", "$stage"] }, "Cancelled"] }, 1, 0]
              }
            },
            activeOrders: {
              $sum: {
                $cond: [
                  {
                    $not: {
                      $in: [
                        { $ifNull: ["$status", "$stage"] },
                        ["Delivered", "Cancelled", "Refunded"]
                      ]
                    }
                  },
                  1,
                  0
                ]
              }
            },
            totalEarnings: { $sum: "$deliveryWorkerPayout" },
            totalDistanceKm: { $sum: "$distanceKm" },
            averageDistanceKm: { $avg: "$distanceKm" },
            averageDeliveryFee: { $avg: "$totals.deliveryFee" }
          }
        }
      ]),
      Order.find({ assignedRider: worker._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("user", "name phone email")
        .populate("customer", "name phone email")
        .select(
          "orderNumber status stage totals deliveryFee deliveryWorkerPayout distanceKm deliveryServiceType address createdAt updatedAt"
        )
    ]);

    const item = analytics[0] || {};

    res.json({
      rider: publicWorker(worker),
      analytics: {
        totalOrders: item.totalOrders || 0,
        deliveredOrders: item.deliveredOrders || 0,
        cancelledOrders: item.cancelledOrders || 0,
        activeOrders: item.activeOrders || 0,
        totalEarnings: item.totalEarnings || 0,
        totalDistanceKm: Number((item.totalDistanceKm || 0).toFixed(1)),
        averageDistanceKm: Number((item.averageDistanceKm || 0).toFixed(1)),
        averageDeliveryFee: Number((item.averageDeliveryFee || 0).toFixed(0))
      },
      deliveryHistory
    });
  })
);

router.patch(
  "/riders/:id/status",
  validate({ body: riderStatusSchema }),
  asyncHandler(async (req, res) => {
    const worker = await User.findOne({
      _id: req.params.id,
      role: { $in: ["rider", "deliveryBoy"] }
    });

    if (!worker) {
      throw new ApiError(404, "Rider or delivery boy not found");
    }

    const { action, reason } = req.body;

    worker.deliveryWorker = worker.deliveryWorker || {};

    if (action === "suspend") {
      worker.isSuspended = true;
      worker.suspensionReason = reason || "Suspended by admin";
      worker.suspendedAt = new Date();
      worker.deliveryWorker.online = false;
      worker.deliveryWorker.isOnline = false;
      worker.deliveryWorker.status = "suspended";
      worker.deliveryWorker.availabilityStatus = "offline";
    }

    if (action === "activate") {
      worker.isSuspended = false;
      worker.suspensionReason = "";
      worker.suspendedAt = undefined;
      worker.deliveryWorker.status = "offline";
    }

    if (action === "flag") {
      worker.deliveryWorker.isFlagged = true;
      worker.deliveryWorker.flagged = true;
      worker.deliveryWorker.flagReason = reason || "Flagged by admin";
      worker.deliveryWorker.flaggedAt = new Date();
    }

    if (action === "unflag") {
      worker.deliveryWorker.isFlagged = false;
      worker.deliveryWorker.flagged = false;
      worker.deliveryWorker.flagReason = "";
      worker.deliveryWorker.flaggedAt = undefined;
    }

    if (action === "setOnline") {
      if (worker.isSuspended) {
        throw new ApiError(400, "Cannot set suspended worker online");
      }

      worker.deliveryWorker.online = true;
      worker.deliveryWorker.isOnline = true;
      worker.deliveryWorker.status = "available";
      worker.deliveryWorker.availabilityStatus = "available";
      worker.deliveryWorker.lastSeenAt = new Date();
    }

    if (action === "setOffline") {
      worker.deliveryWorker.online = false;
      worker.deliveryWorker.isOnline = false;
      worker.deliveryWorker.status = "offline";
      worker.deliveryWorker.availabilityStatus = "offline";
      worker.deliveryWorker.lastSeenAt = new Date();
    }

    await worker.save();

    res.json({
      message: "Worker updated successfully",
      rider: publicWorker(worker)
    });
  })
);

router.get(
  "/riders/:id/orders",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    const skip = (page - 1) * limit;

    const status = req.query.status || "all";

    const query = {
      assignedRider: req.params.id
    };

    if (status !== "all") {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name phone email")
        .populate("customer", "name phone email")
        .select(
          "orderNumber status stage totals deliveryFee deliveryWorkerPayout distanceKm deliveryServiceType address createdAt updatedAt"
        ),
      Order.countDocuments(query)
    ]);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

router.delete(
  "/riders/:id",
  asyncHandler(async (req, res) => {
    const worker = await User.findOne({
      _id: req.params.id,
      role: { $in: ["rider", "deliveryBoy"] }
    });

    if (!worker) {
      throw new ApiError(404, "Rider or delivery boy not found");
    }

    const activeOrders = await Order.countDocuments({
      assignedRider: worker._id,
      status: { $nin: ["Delivered", "Cancelled", "Refunded"] }
    });

    if (activeOrders > 0) {
      throw new ApiError(409, "Cannot delete worker with active deliveries");
    }

    await worker.deleteOne();

    res.json({
      message: "Worker deleted successfully"
    });
  })
);

export default router;