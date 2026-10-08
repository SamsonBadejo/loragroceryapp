import { Router } from "express";
import { z } from "zod";

import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitRiderLocation, emitOrderUpdate } from "../realtime/socket.js";

const router = Router();

const STORE_COORDINATES = [3.3792, 6.5244];

const locationSchema = z.object({
  orderId: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  heading: z.coerce.number().optional().default(0),
});

function workerTypeFromRole(role) {
  return role === "deliveryBoy" ? "deliveryBoy" : "rider";
}

function workerLabel(role) {
  return role === "deliveryBoy" ? "Delivery Boy" : "Rider";
}

function coverageKm(role, worker) {
  if (role === "deliveryBoy") return 5;
  return Number(worker?.deliveryWorker?.coverageRadiusKm || 150);
}

function calculateDistanceKm(fromCoordinates, toCoordinates) {
  if (
    !Array.isArray(fromCoordinates) ||
    !Array.isArray(toCoordinates) ||
    fromCoordinates.length !== 2 ||
    toCoordinates.length !== 2
  ) {
    return null;
  }

  const [fromLng, fromLat] = fromCoordinates.map(Number);
  const [toLng, toLat] = toCoordinates.map(Number);

  const earthRadiusKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;

  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

function publicWorker(user) {
  const deliveryWorker = user.deliveryWorker || {};
  const role = user.role;
  const type = workerTypeFromRole(role);

  return {
    _id: user._id.toString(),
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role,
    workerType: type,
    online: Boolean(deliveryWorker.online || deliveryWorker.isOnline),
    status:
      deliveryWorker.status || deliveryWorker.availabilityStatus || "offline",
    coverageRadiusKm: coverageKm(role, user),
    currentLocation: deliveryWorker.currentLocation || {
      type: "Point",
      coordinates: STORE_COORDINATES,
    },
    earningsBalance: Number(deliveryWorker.earningsBalance || 0),
    totalEarnings: Number(deliveryWorker.totalEarnings || 0),
    totalDeliveries: Number(deliveryWorker.totalDeliveries || 0),
    completedDeliveries: Number(deliveryWorker.completedDeliveries || 0),
    rejectedDeliveries: Number(deliveryWorker.rejectedDeliveries || 0),
    ratingAverage: Number(deliveryWorker.ratingAverage || 5),
    isFlagged: Boolean(deliveryWorker.isFlagged || deliveryWorker.flagged),
    suspendedReason: deliveryWorker.suspendedReason || "",
    historyClearedAt: deliveryWorker.historyClearedAt || null,
    lastSeenAt: deliveryWorker.lastSeenAt || null,
  };
}

async function findWorker(userId) {
  const worker = await User.findById(userId);

  if (!worker) {
    throw new ApiError(404, "Delivery worker not found");
  }

  if (!["rider", "deliveryBoy"].includes(worker.role)) {
    throw new ApiError(403, "This account is not a delivery worker");
  }

  if (worker.isSuspended) {
    throw new ApiError(403, "This delivery account is suspended");
  }

  if (!worker.deliveryWorker) {
    worker.deliveryWorker = {};
  }

  return worker;
}

function getWorkerCoordinates(worker) {
  return (
    worker.deliveryWorker?.currentLocation?.coordinates || STORE_COORDINATES
  );
}

function getAssignedWorkerId(order) {
  return String(
    order.assignedRider?._id ||
      order.assignedRider ||
      order.rider?._id ||
      order.rider ||
      "",
  );
}

function isAssignedToWorker(order, userId) {
  return getAssignedWorkerId(order) === String(userId);
}

function isPaidOrder(order) {
  return (
    order.paymentProvider === "paystack" &&
    ["paid", "authorized"].includes(order.paymentStatus)
  );
}

function ensurePaidBeforeDelivery(order) {
  if (!isPaidOrder(order)) {
    throw new ApiError(
      402,
      "This order cannot be accepted until Paystack payment is successful",
    );
  }
}

function openOrderFilterFor(role) {
  const filter = {
    stage: {
      $in: ["Confirmed", "Preparing", "Packed"],
    },
    paymentProvider: "paystack",
    paymentStatus: {
      $in: ["paid", "authorized"],
    },
    $and: [
      {
        $or: [{ rider: null }, { rider: { $exists: false } }],
      },
      {
        $or: [{ assignedRider: null }, { assignedRider: { $exists: false } }],
      },
    ],
  };

  if (role === "deliveryBoy") {
    filter.deliveryServiceType = "deliveryBoy";
  }

  if (role === "rider") {
    filter.deliveryServiceType = {
      $in: ["rider", "deliveryBoy"],
    };
  }

  return filter;
}

function serializeOrder(order) {
  const plain = order.toObject ? order.toObject() : order;

  return {
    ...plain,
    customer: plain.customer || plain.user,
    rider: plain.rider || plain.assignedRider || null,
  };
}

function addStage(order, stage, note) {
  if (!Array.isArray(order.stageHistory)) {
    order.stageHistory = [];
  }

  order.stageHistory.push({
    stage,
    note,
    date: new Date(),
  });
}

async function sendOrderUpdate(order) {
  try {
    if (emitOrderUpdate.length >= 2) {
      emitOrderUpdate(order._id.toString(), serializeOrder(order));
    } else {
      emitOrderUpdate(serializeOrder(order));
    }
  } catch (error) {
    console.error("Rider order realtime skipped:", error.message);
  }
}

router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const users = await User.find({
      role: {
        $in: ["rider", "deliveryBoy"],
      },
    }).sort({
      "deliveryWorker.online": -1,
      updatedAt: -1,
    });

    res.json({
      riders: users.map(publicWorker),
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);

    res.json({
      rider: publicWorker(worker),
    });
  }),
);

router.patch(
  "/availability",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  validate({
    body: z.object({
      online: z.boolean(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);
    const type = workerTypeFromRole(req.auth.role);
    const online = req.body.online;

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      workerType: type,
      online,
      isOnline: online,
      status: online ? "available" : "offline",
      availabilityStatus: online ? "available" : "offline",
      coverageRadiusKm: coverageKm(req.auth.role, worker),
      maxDeliveryRadiusKm: coverageKm(req.auth.role, worker),
      lastSeenAt: new Date(),
    };

    await worker.save();

    emitRiderLocation(worker._id.toString(), {
      workerId: worker._id.toString(),
      riderId: worker._id.toString(),
      workerType: type,
      status: worker.deliveryWorker.status,
      online,
      location: worker.deliveryWorker.currentLocation,
      updatedAt: new Date(),
    });

    res.json({
      rider: publicWorker(worker),
    });
  }),
);

router.get(
  "/orders",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);
    const coordinates = getWorkerCoordinates(worker);
    const radiusKm = coverageKm(req.auth.role, worker);
    const historyClearedAt = worker.deliveryWorker?.historyClearedAt;

    let openQuery = {
      ...openOrderFilterFor(req.auth.role),
    };

    if (req.auth.role === "deliveryBoy") {
      openQuery = {
        ...openQuery,
        "address.location": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates,
            },
            $maxDistance: radiusKm * 1000,
          },
        },
      };
    }

    const assignedQuery = {
      $or: [{ rider: req.auth.userId }, { assignedRider: req.auth.userId }],
      stage: {
        $nin: ["Delivered", "Cancelled", "Refunded"],
      },
    };

    const historyQuery = {
      $or: [{ rider: req.auth.userId }, { assignedRider: req.auth.userId }],
      stage: {
        $in: ["Delivered", "Cancelled", "Refunded"],
      },
    };

    if (historyClearedAt) {
      historyQuery.updatedAt = {
        $gt: historyClearedAt,
      };
    }

    const [open, assigned, history] = await Promise.all([
      Order.find(openQuery).sort({ createdAt: 1 }).limit(20).lean(),
      Order.find(assignedQuery).sort({ createdAt: -1 }),
      Order.find(historyQuery).sort({ updatedAt: -1 }).limit(30),
    ]);

    const openWithDistance = open.map((order) => {
      const customerCoordinates = order.address?.location?.coordinates || [];
      const distanceKm =
        customerCoordinates.length === 2
          ? calculateDistanceKm(coordinates, customerCoordinates)
          : null;

      return {
        ...serializeOrder(order),
        distanceFromWorkerKm: distanceKm,
      };
    });

    res.json({
      open: openWithDistance,
      assigned: assigned.map(serializeOrder),
      history: history.map(serializeOrder),
    });
  }),
);

router.delete(
  "/history",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      historyClearedAt: new Date(),
      lastSeenAt: new Date(),
    };

    await worker.save();

    res.json({
      message: "Delivery history cleared",
      rider: publicWorker(worker),
    });
  }),
);

router.post(
  "/orders/:id/accept",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    ensurePaidBeforeDelivery(order);

    if (
      getAssignedWorkerId(order) &&
      !isAssignedToWorker(order, req.auth.userId)
    ) {
      throw new ApiError(400, "Order has already been assigned");
    }

    if (
      req.auth.role === "deliveryBoy" &&
      order.deliveryServiceType !== "deliveryBoy"
    ) {
      throw new ApiError(
        403,
        "Delivery boys can only accept nearby local orders",
      );
    }

    const workerCoordinates = getWorkerCoordinates(worker);

    order.assignedRider = worker._id;
    order.rider = worker._id;

    if (["Confirmed", "Preparing", "Packed"].includes(order.stage)) {
      order.stage = "Picked Up";
      order.status = "Picked Up";
      addStage(
        order,
        "Picked Up",
        `${workerLabel(req.auth.role)} accepted the order`,
      );
    }

    order.delivery = {
      ...(order.delivery || {}),
      assignedAt: order.delivery?.assignedAt || new Date(),
      riderLocation: {
        type: "Point",
        coordinates: workerCoordinates,
      },
      route: [workerCoordinates, order.address.location.coordinates],
    };

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      workerType: workerTypeFromRole(req.auth.role),
      online: true,
      isOnline: true,
      status: "delivering",
      availabilityStatus: "busy",
      coverageRadiusKm: coverageKm(req.auth.role, worker),
      maxDeliveryRadiusKm: coverageKm(req.auth.role, worker),
      lastSeenAt: new Date(),
    };

    await Promise.all([order.save(), worker.save()]);
    await sendOrderUpdate(order);

    res.json({
      order: serializeOrder(order),
      rider: publicWorker(worker),
    });
  }),
);

router.post(
  "/orders/:id/reject",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      rejectedDeliveries:
        Number(worker.deliveryWorker?.rejectedDeliveries || 0) + 1,
      lastSeenAt: new Date(),
    };

    await worker.save();

    res.json({
      message: "Order skipped",
      rider: publicWorker(worker),
    });
  }),
);

router.post(
  "/location",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  validate({
    body: locationSchema,
  }),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);
    const type = workerTypeFromRole(req.auth.role);

    const location = {
      type: "Point",
      coordinates: [req.body.lng, req.body.lat],
    };

    const existingStatus =
      worker.deliveryWorker?.status ||
      worker.deliveryWorker?.availabilityStatus ||
      "available";

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      workerType: type,
      online: true,
      isOnline: true,
      status: existingStatus === "offline" ? "available" : existingStatus,
      availabilityStatus:
        existingStatus === "delivering" ? "busy" : existingStatus,
      currentLocation: location,
      coverageRadiusKm: coverageKm(req.auth.role, worker),
      maxDeliveryRadiusKm: coverageKm(req.auth.role, worker),
      lastSeenAt: new Date(),
    };

    let order = null;

    if (req.body.orderId) {
      order = await Order.findById(req.body.orderId);

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      if (!isAssignedToWorker(order, req.auth.userId)) {
        throw new ApiError(403, "You are not assigned to this order");
      }

      order.delivery = {
        ...(order.delivery || {}),
        riderLocation: location,
        route: [location.coordinates, order.address.location.coordinates],
      };

      if (order.stage === "Picked Up") {
        order.stage = "On The Way";
        order.status = "On The Way";
        addStage(
          order,
          "On The Way",
          `${workerLabel(req.auth.role)} is on the way`,
        );
      }

      await order.save();
      await sendOrderUpdate(order);
    }

    await worker.save();

    emitRiderLocation(req.body.orderId || worker._id.toString(), {
      riderId: worker._id.toString(),
      workerId: worker._id.toString(),
      orderId: order?._id?.toString(),
      workerType: type,
      lat: req.body.lat,
      lng: req.body.lng,
      heading: req.body.heading || 0,
      location,
      updatedAt: new Date(),
    });

    res.json({
      rider: publicWorker(worker),
      order: order ? serializeOrder(order) : null,
      location: {
        lat: req.body.lat,
        lng: req.body.lng,
        heading: req.body.heading || 0,
      },
    });
  }),
);

router.post(
  "/orders/:id/proof",
  requireAuth,
  requireRole("rider", "deliveryBoy"),
  asyncHandler(async (req, res) => {
    const worker = await findWorker(req.auth.userId);
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (!isAssignedToWorker(order, req.auth.userId)) {
      throw new ApiError(403, "You are not assigned to this order");
    }

    ensurePaidBeforeDelivery(order);

    order.stage = "Delivered";
    order.status = "Delivered";

    order.delivery = {
      ...(order.delivery || {}),
      deliveredAt: new Date(),
    };

    addStage(order, "Delivered", "Delivery completed");

    const payout =
      Number(order.deliveryWorkerPayout || 0) ||
      (req.auth.role === "deliveryBoy" ? 800 : 1200);

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      workerType: workerTypeFromRole(req.auth.role),
      online: true,
      isOnline: true,
      status: "available",
      availabilityStatus: "available",
      totalDeliveries: Number(worker.deliveryWorker?.totalDeliveries || 0) + 1,
      completedDeliveries:
        Number(worker.deliveryWorker?.completedDeliveries || 0) + 1,
      earningsBalance:
        Number(worker.deliveryWorker?.earningsBalance || 0) + payout,
      totalEarnings: Number(worker.deliveryWorker?.totalEarnings || 0) + payout,
      coverageRadiusKm: coverageKm(req.auth.role, worker),
      maxDeliveryRadiusKm: coverageKm(req.auth.role, worker),
      lastSeenAt: new Date(),
    };

    await Promise.all([order.save(), worker.save()]);
    await sendOrderUpdate(order);

    res.json({
      message: "Delivery completed",
      order: serializeOrder(order),
      rider: publicWorker(worker),
    });
  }),
);

router.patch(
  "/:id/suspend",
  requireAuth,
  requireRole("admin"),
  validate({
    body: z.object({
      suspended: z.boolean(),
      reason: z.string().optional().default(""),
    }),
  }),
  asyncHandler(async (req, res) => {
    const worker = await User.findById(req.params.id);

    if (!worker || !["rider", "deliveryBoy"].includes(worker.role)) {
      throw new ApiError(404, "Delivery worker not found");
    }

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      online: false,
      isOnline: false,
      status: req.body.suspended ? "suspended" : "offline",
      availabilityStatus: req.body.suspended ? "suspended" : "offline",
      suspendedReason: req.body.suspended
        ? req.body.reason || "Admin action"
        : "",
      lastSeenAt: new Date(),
    };

    worker.isSuspended = req.body.suspended;
    worker.suspensionReason = req.body.suspended ? req.body.reason || "" : "";
    worker.suspendedAt = req.body.suspended ? new Date() : null;

    await worker.save();

    res.json({
      rider: publicWorker(worker),
    });
  }),
);

export default router;
