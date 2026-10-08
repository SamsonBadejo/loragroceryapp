import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { Cart } from "../models/Cart.js";
import { Coupon } from "../models/Coupon.js";
import { Notification } from "../models/Notification.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createOrderNumber } from "../utils/orderNumber.js";
import { calculateDeliveryQuote, haversineKm } from "../utils/deliveryPricing.js";
import { emitOrderUpdate } from "../realtime/socket.js";

const router = Router();

const STORE_LOCATION = {
  lat: 6.5244,
  lng: 3.3792
};

const STORE_COORDINATES = [STORE_LOCATION.lng, STORE_LOCATION.lat];

const orderStages = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Packed",
  "Picked Up",
  "On The Way",
  "Delivered",
  "Cancelled",
  "Refunded"
];

const checkoutSchema = z.object({
  deliveryServiceType: z.enum(["rider", "deliveryBoy"]).default("rider"),
  paymentProvider: z.literal("paystack").default("paystack"),
  couponCode: z.string().optional().default(""),
  deliveryNotes: z.string().optional().default(""),
  rain: z.boolean().optional().default(false),
  traffic: z.boolean().optional().default(false),
  peakHour: z.boolean().optional().default(false),
  address: z.object({
    recipientName: z.string().min(2, "Recipient name is required"),
    phone: z.string().min(6, "Phone number is required"),
    line1: z.string().min(4, "Delivery address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    location: z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180)
    })
  })
});

const stageSchema = z.object({
  stage: z.enum(orderStages),
  note: z.string().max(500).optional().default("")
});

const assignSchema = z.object({
  workerId: z.string().min(1)
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional().default("Order cancelled")
});

function currentUser(req) {
  return {
    id: req.auth.userId,
    role: req.auth.role,
    email: req.auth.email
  };
}

function getProductImage(product) {
  const image = product.images?.[0];

  if (typeof image === "string") return image;
  if (image?.url) return image.url;
  if (image?.secure_url) return image.secure_url;

  return product.image || "";
}

function getOrderUserId(order) {
  return String(
    order.user?._id || order.user || order.customer?._id || order.customer || ""
  );
}

function getAssignedWorkerId(order) {
  return String(
    order.assignedRider?._id ||
      order.assignedRider ||
      order.rider?._id ||
      order.rider ||
      ""
  );
}

function serviceRole(serviceType) {
  return serviceType === "deliveryBoy" ? "deliveryBoy" : "rider";
}

function publicWorker(worker) {
  if (!worker) return null;

  const plain = worker.toObject ? worker.toObject() : worker;

  return {
    _id: plain._id,
    id: plain._id,
    name: plain.name,
    email: plain.email,
    phone: plain.phone,
    role: plain.role,
    avatar: plain.avatar,
    deliveryWorker: plain.deliveryWorker
  };
}

function serializeOrder(order) {
  const plain = order.toObject ? order.toObject() : order;

  return {
    ...plain,
    customer: plain.customer || plain.user,
    rider: plain.assignedRider || plain.rider || null
  };
}

function populateOrder(query) {
  return query
    .populate("user", "name email phone avatar role")
    .populate("customer", "name email phone avatar role")
    .populate("assignedRider", "name email phone avatar role deliveryWorker")
    .populate("rider", "name email phone avatar role deliveryWorker")
    .populate("items.product", "name slug images price unit stock status active isAvailable");
}

function assertObjectId(id, label = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
}

async function getOrderOrFail(orderId) {
  assertObjectId(orderId, "order id");

  const order = await populateOrder(Order.findById(orderId));

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return order;
}

function assertCanViewOrder(order, user) {
  if (user.role === "admin") return;

  if (user.role === "customer" && getOrderUserId(order) === String(user.id)) {
    return;
  }

  if (
    ["rider", "deliveryBoy"].includes(user.role) &&
    getAssignedWorkerId(order) === String(user.id)
  ) {
    return;
  }

  throw new ApiError(403, "You do not have access to this order");
}

function isProductAvailable(product) {
  const status = String(product.status || "active");

  return (
    product.active !== false &&
    product.isAvailable !== false &&
    !["archived", "inactive", "out_of_stock"].includes(status) &&
    Number(product.stock || 0) > 0
  );
}

async function safeNotify(userId, payload) {
  if (!userId) return;

  try {
    await Notification.create({
      user: userId,
      title: payload.title,
      message: payload.message,
      body: payload.message,
      type: payload.type || "order",
      link: payload.link,
      actionUrl: payload.link,
      data: payload.data || {},
      metadata: payload.data || {},
      read: false,
      isRead: false
    });
  } catch (error) {
    console.error("Notification skipped:", error.message);
  }
}

function pushOrderRealtime(order) {
  try {
    const payload = serializeOrder(order);

    if (emitOrderUpdate.length >= 2) {
      emitOrderUpdate(String(payload._id), payload);
    } else {
      emitOrderUpdate(payload);
    }
  } catch (error) {
    console.error("Realtime order update skipped:", error.message);
  }
}

async function calculateCouponDiscount(code, subtotal) {
  const cleanCode = String(code || "").trim().toUpperCase();

  if (!cleanCode) {
    return {
      coupon: null,
      discount: 0
    };
  }

  const coupon = await Coupon.findOne({
    code: cleanCode,
    isActive: true
  });

  if (!coupon) {
    throw new ApiError(400, "Invalid coupon code");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new ApiError(400, "Coupon has expired");
  }

  const minimumOrderAmount =
    coupon.minimumOrderAmount || coupon.minOrderAmount || 0;

  if (subtotal < minimumOrderAmount) {
    throw new ApiError(
      400,
      `Minimum order amount for this coupon is ${minimumOrderAmount}`
    );
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, "Coupon usage limit reached");
  }

  const discountType = String(
    coupon.discountType || coupon.type || "fixed"
  ).toLowerCase();

  const value = Number(
    coupon.value || coupon.amount || coupon.discountAmount || 0
  );

  const discount =
    discountType === "percentage" || discountType === "percent"
      ? Math.round(subtotal * (value / 100))
      : value;

  return {
    coupon,
    discount: Math.min(discount, subtotal)
  };
}

async function decrementProductStock(items) {
  for (const item of items) {
    const result = await Product.updateOne(
      {
        _id: item.product,
        active: { $ne: false },
        isAvailable: { $ne: false },
        status: { $nin: ["archived", "inactive", "out_of_stock"] },
        stock: { $gte: item.quantity }
      },
      {
        $inc: {
          stock: -item.quantity
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new ApiError(409, `${item.name} does not have enough stock`);
    }

    await Product.updateOne(
      {
        _id: item.product,
        stock: { $lte: 0 }
      },
      {
        $set: {
          status: "out_of_stock",
          isAvailable: false
        }
      }
    );
  }
}

async function restockOrderItems(order) {
  await Promise.all(
    order.items.map((item) =>
      Product.updateOne(
        {
          _id: item.product
        },
        {
          $inc: {
            stock: item.quantity
          },
          $set: {
            status: "active",
            isAvailable: true,
            active: true
          }
        }
      )
    )
  );
}

async function releaseAssignedWorker(order) {
  const workerId = getAssignedWorkerId(order);

  if (!workerId) return;

  await User.findByIdAndUpdate(workerId, {
    $set: {
      "deliveryWorker.online": true,
      "deliveryWorker.isOnline": true,
      "deliveryWorker.status": "available",
      "deliveryWorker.availabilityStatus": "available",
      "deliveryWorker.lastSeenAt": new Date()
    }
  });
}

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const query = {};

    if (user.role === "customer") {
      query.user = user.id;
    }

    if (["rider", "deliveryBoy"].includes(user.role)) {
      query.$or = [{ assignedRider: user.id }, { rider: user.id }];
    }

    if (req.query.stage && req.query.stage !== "all") {
      query.stage = req.query.stage;
    }

    const [orders, total] = await Promise.all([
      populateOrder(
        Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
      Order.countDocuments(query)
    ]);

    res.json({
      orders: orders.map(serializeOrder),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

router.post(
  "/",
  requireRole("customer"),
  validate({
    body: checkoutSchema
  }),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);

    const cart = await Cart.findOne({
      user: user.id
    }).populate("items.product");

    if (!cart || !cart.items?.length) {
      throw new ApiError(400, "Your cart is empty");
    }

    const orderItems = cart.items.map((item) => {
      const product = item.product;

      if (!product) {
        throw new ApiError(400, "A product in your cart no longer exists");
      }

      if (!isProductAvailable(product)) {
        throw new ApiError(400, `${product.name} is currently unavailable`);
      }

      if (Number(product.stock || 0) < Number(item.quantity || 1)) {
        throw new ApiError(409, `${product.name} does not have enough stock`);
      }

      const price = Number(product.price || 0);
      const quantity = Number(item.quantity || 1);

      return {
        product: product._id,
        name: product.name,
        image: getProductImage(product),
        unit: product.unit || product.unitPricing?.unit || "",
        price,
        quantity,
        subtotal: price * quantity
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Math.round(subtotal * 0.075);

    const couponCode = req.body.couponCode || cart.couponCode || "";
    const { coupon, discount } = await calculateCouponDiscount(
      couponCode,
      subtotal
    );

    const destination = {
      lat: Number(req.body.address.location.lat),
      lng: Number(req.body.address.location.lng)
    };

    const distanceKm = haversineKm(STORE_LOCATION, destination);

    if (req.body.deliveryServiceType === "deliveryBoy" && distanceKm > 20) {
      throw new ApiError(
        400,
        "Delivery Boy is only available for nearby deliveries. Please choose Rider."
      );
    }

    const deliveryQuote = await calculateDeliveryQuote({
      serviceType: req.body.deliveryServiceType,
      distanceKm,
      surgeOptions: {
        rain: req.body.rain,
        traffic: req.body.traffic,
        peakHour: req.body.peakHour
      }
    });

    const totals = {
      subtotal,
      tax,
      deliveryFee: deliveryQuote.customerPrice,
      discount,
      total: subtotal + tax + deliveryQuote.customerPrice - discount
    };

    await decrementProductStock(orderItems);

    const order = await Order.create({
      orderNumber: await createOrderNumber(),
      user: user.id,
      customer: user.id,
      items: orderItems,
      address: {
        recipientName: req.body.address.recipientName,
        phone: req.body.address.phone,
        line1: req.body.address.line1,
        city: req.body.address.city,
        state: req.body.address.state,
        location: {
          type: "Point",
          coordinates: [destination.lng, destination.lat]
        }
      },
      totals,
      couponCode: couponCode || undefined,
      paymentProvider: "paystack",
      paymentStatus: "pending",
      payment: {
        provider: "paystack",
        status: "pending",
        amount: totals.total
      },
      stage: "Pending",
      status: "Pending",
      deliveryServiceType: req.body.deliveryServiceType,
      distanceKm,
      deliveryWorkerPayout: deliveryQuote.riderPayout,
      platformDeliveryMargin: deliveryQuote.platformMargin,
      deliveryNotes: req.body.deliveryNotes,
      delivery: {
        etaMinutes: deliveryQuote.etaMinutes,
        notes: req.body.deliveryNotes,
        route: [STORE_COORDINATES, [destination.lng, destination.lat]]
      },
      stageHistory: [
        {
          stage: "Pending",
          note: "Order created. Waiting for Paystack payment.",
          date: new Date()
        }
      ]
    });

    if (coupon) {
      await Coupon.updateOne(
        {
          _id: coupon._id
        },
        {
          $inc: {
            usedCount: 1
          }
        }
      );
    }

    cart.items = [];
    cart.couponCode = "";
    cart.coupon = undefined;
    await cart.save();

    const finalOrder = await getOrderOrFail(order._id);

    await safeNotify(user.id, {
      title: "Order created",
      message: `Order ${finalOrder.orderNumber} has been created. Complete Paystack payment to continue.`,
      link: "/orders",
      data: {
        orderId: finalOrder._id
      }
    });

    pushOrderRealtime(finalOrder);

    res.status(201).json({
      message: "Order created. Continue to Paystack payment.",
      order: serializeOrder(finalOrder),
      requiresPayment: true
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const order = await getOrderOrFail(req.params.id);

    assertCanViewOrder(order, user);

    res.json({
      order: serializeOrder(order)
    });
  })
);

router.patch(
  "/:id/assign",
  requireRole("admin"),
  validate({
    body: assignSchema
  }),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (order.paymentProvider !== "paystack" || order.paymentStatus !== "paid") {
      throw new ApiError(400, "Only paid Paystack orders can be assigned");
    }

    const worker = await User.findOne({
      _id: req.body.workerId,
      role: serviceRole(order.deliveryServiceType),
      isSuspended: false
    });

    if (!worker) {
      throw new ApiError(404, "Delivery worker not found or wrong worker type");
    }

    if (
      getAssignedWorkerId(order) &&
      getAssignedWorkerId(order) !== String(worker._id)
    ) {
      await releaseAssignedWorker(order);
    }

    const workerCoordinates =
      worker.deliveryWorker?.currentLocation?.coordinates || STORE_COORDINATES;

    order.assignedRider = worker._id;
    order.rider = worker._id;
    order.stage = order.stage === "Pending" ? "Confirmed" : order.stage;
    order.status = order.stage;

    order.delivery = {
      ...(order.delivery || {}),
      assignedAt: new Date(),
      riderLocation: {
        type: "Point",
        coordinates: workerCoordinates
      },
      route: [
        STORE_COORDINATES,
        workerCoordinates,
        order.address.location.coordinates
      ]
    };

    order.stageHistory.push({
      stage: order.stage,
      note: "Delivery worker assigned by admin",
      date: new Date()
    });

    worker.deliveryWorker = {
      ...(worker.deliveryWorker || {}),
      online: true,
      isOnline: true,
      status: "busy",
      availabilityStatus: "busy",
      lastSeenAt: new Date()
    };

    await Promise.all([order.save(), worker.save()]);

    const finalOrder = await getOrderOrFail(order._id);

    await safeNotify(getOrderUserId(finalOrder), {
      title: "Delivery worker assigned",
      message: `${worker.name} has been assigned to your order ${finalOrder.orderNumber}.`,
      link: `/tracking/${finalOrder._id}`,
      data: {
        orderId: finalOrder._id
      }
    });

    await safeNotify(worker._id, {
      title: "New delivery assigned",
      message: `You have been assigned order ${finalOrder.orderNumber}.`,
      link: "/rider",
      data: {
        orderId: finalOrder._id
      }
    });

    pushOrderRealtime(finalOrder);

    res.json({
      message: "Delivery worker assigned",
      order: serializeOrder(finalOrder),
      assignedWorker: publicWorker(worker)
    });
  })
);

router.patch(
  "/:id/stage",
  requireRole("admin", "rider", "deliveryBoy"),
  validate({
    body: stageSchema
  }),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (
      ["rider", "deliveryBoy"].includes(user.role) &&
      getAssignedWorkerId(order) !== String(user.id)
    ) {
      throw new ApiError(403, "This order is not assigned to you");
    }

    if (order.paymentProvider !== "paystack" || order.paymentStatus !== "paid") {
      throw new ApiError(400, "Payment must be confirmed before delivery updates");
    }

    const previousStage = order.stage;

    order.stage = req.body.stage;
    order.status = req.body.stage;

    order.stageHistory.push({
      stage: req.body.stage,
      note: req.body.note || `Order moved to ${req.body.stage}`,
      date: new Date()
    });

    order.delivery = {
      ...(order.delivery || {})
    };

    if (req.body.stage === "Picked Up") {
      order.delivery.pickedUpAt = new Date();
    }

    if (req.body.stage === "Delivered") {
      order.delivery.deliveredAt = new Date();

      if (order.payment) {
        order.payment.status = "paid";
      }

      if (previousStage !== "Delivered" && getAssignedWorkerId(order)) {
        await User.findByIdAndUpdate(getAssignedWorkerId(order), {
          $inc: {
            "deliveryWorker.earningsBalance": order.deliveryWorkerPayout || 0,
            "deliveryWorker.totalEarnings": order.deliveryWorkerPayout || 0,
            "deliveryWorker.totalDeliveries": 1,
            "deliveryWorker.completedDeliveries": 1
          },
          $set: {
            "deliveryWorker.online": true,
            "deliveryWorker.isOnline": true,
            "deliveryWorker.status": "available",
            "deliveryWorker.availabilityStatus": "available",
            "deliveryWorker.lastSeenAt": new Date()
          }
        });
      }
    }

    if (["Cancelled", "Refunded"].includes(req.body.stage)) {
      await releaseAssignedWorker(order);
    }

    await order.save();

    const finalOrder = await getOrderOrFail(order._id);

    await safeNotify(getOrderUserId(finalOrder), {
      title: "Order update",
      message: `Your order ${finalOrder.orderNumber} is now ${finalOrder.stage}.`,
      link: `/tracking/${finalOrder._id}`,
      data: {
        orderId: finalOrder._id,
        stage: finalOrder.stage
      }
    });

    pushOrderRealtime(finalOrder);

    res.json({
      message: "Order stage updated",
      order: serializeOrder(finalOrder)
    });
  })
);

router.patch(
  "/:id/cancel",
  validate({
    body: cancelSchema
  }),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (user.role !== "admin" && getOrderUserId(order) !== String(user.id)) {
      throw new ApiError(403, "You cannot cancel this order");
    }

    if (["Delivered", "Cancelled", "Refunded"].includes(order.stage)) {
      throw new ApiError(400, "This order can no longer be cancelled");
    }

    if (user.role === "customer" && ["Picked Up", "On The Way"].includes(order.stage)) {
      throw new ApiError(
        400,
        "Order is already out for delivery. Contact support."
      );
    }

    order.stage = "Cancelled";
    order.status = "Cancelled";

    if (order.payment) {
      order.payment.status = "failed";
    }

    order.stageHistory.push({
      stage: "Cancelled",
      note: req.body.reason,
      date: new Date()
    });

    await Promise.all([
      order.save(),
      restockOrderItems(order),
      releaseAssignedWorker(order)
    ]);

    const finalOrder = await getOrderOrFail(order._id);

    await safeNotify(getOrderUserId(finalOrder), {
      title: "Order cancelled",
      message: `Your order ${finalOrder.orderNumber} has been cancelled.`,
      link: `/tracking/${finalOrder._id}`,
      data: {
        orderId: finalOrder._id
      }
    });

    pushOrderRealtime(finalOrder);

    res.json({
      message: "Order cancelled",
      order: serializeOrder(finalOrder)
    });
  })
);

router.post(
  "/:id/refund",
  requireRole("admin"),
  validate({
    body: cancelSchema
  }),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    order.stage = "Refunded";
    order.status = "Refunded";
    order.paymentStatus = "refunded";

    if (order.payment) {
      order.payment.status = "refunded";
    }

    order.stageHistory.push({
      stage: "Refunded",
      note: req.body.reason || "Refund approved by admin",
      date: new Date()
    });

    await Promise.all([order.save(), releaseAssignedWorker(order)]);

    const finalOrder = await getOrderOrFail(order._id);

    await safeNotify(getOrderUserId(finalOrder), {
      title: "Refund processed",
      message: `A refund has been processed for order ${finalOrder.orderNumber}.`,
      link: `/tracking/${finalOrder._id}`,
      data: {
        orderId: finalOrder._id
      }
    });

    pushOrderRealtime(finalOrder);

    res.json({
      message: "Order refunded",
      order: serializeOrder(finalOrder)
    });
  })
);

export default router;