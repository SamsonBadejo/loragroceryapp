import { Router } from "express";
import { z } from "zod";

import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Notification } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitOrderUpdate } from "../realtime/socket.js";

const router = Router();

const initializeSchema = z.object({
  orderId: z.string().min(1),
  callbackUrl: z.string().url()
});

function getOrderUserId(order) {
  return String(order.user?._id || order.user || order.customer?._id || order.customer || "");
}

function canAccessOrder(order, auth) {
  return auth.role === "admin" || getOrderUserId(order) === String(auth.userId);
}

async function notifyUser(userId, order) {
  try {
    await Notification.create({
      user: userId,
      title: "Payment confirmed",
      message: `Payment for order ${order.orderNumber} was successful.`,
      type: "payment",
      link: `/tracking/${order._id}`,
      actionUrl: `/tracking/${order._id}`,
      data: {
        orderId: order._id
      },
      read: false,
      isRead: false
    });
  } catch (error) {
    console.error("Payment notification skipped:", error.message);
  }
}

function pushOrderRealtime(order) {
  try {
    if (emitOrderUpdate.length >= 2) {
      emitOrderUpdate(String(order._id), order);
    } else {
      emitOrderUpdate(order);
    }
  } catch (error) {
    console.error("Payment realtime update skipped:", error.message);
  }
}

function confirmPaidOrder(order) {
  order.paymentProvider = "paystack";
  order.paymentStatus = "paid";

  if (order.payment) {
    order.payment.provider = "paystack";
    order.payment.status = "paid";
  }

  if (order.stage === "Pending") {
    order.stage = "Confirmed";
    order.status = "Confirmed";
  }

  if (!Array.isArray(order.stageHistory)) {
    order.stageHistory = [];
  }

  order.stageHistory.push({
    stage: order.stage,
    note: "Payment confirmed by Paystack",
    date: new Date()
  });
}

router.use(requireAuth);

router.post(
  "/paystack/initialize",
  validate({
    body: initializeSchema
  }),
  asyncHandler(async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new ApiError(500, "Paystack secret key is not configured");
    }

    const order = await Order.findById(req.body.orderId).populate(
      "user",
      "name email"
    );

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (!canAccessOrder(order, req.auth)) {
      throw new ApiError(403, "You cannot pay for this order");
    }

    if (order.paymentStatus === "paid") {
      return res.json({
        message: "Order is already paid",
        paid: true,
        order
      });
    }

    const email = order.user?.email || req.auth.email;

    if (!email) {
      throw new ApiError(400, "Customer email is required for Paystack payment");
    }

    const reference = `LORA-${order.orderNumber}-${Date.now()}`;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(order.totals.total || order.total || 0) * 100),
          currency: "NGN",
          reference,
          callback_url: req.body.callbackUrl,
          metadata: {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            customerName: order.user?.name || "Lo'ra customer"
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status) {
      throw new ApiError(
        400,
        result.message || "Paystack initialization failed"
      );
    }

    const payment = await Payment.findOneAndUpdate(
      {
        order: order._id,
        provider: "paystack"
      },
      {
        user: getOrderUserId(order),
        order: order._id,
        provider: "paystack",
        amount: Number(order.totals.total || order.total || 0),
        currency: "NGN",
        reference,
        accessCode: result.data.access_code,
        authorizationUrl: result.data.authorization_url,
        status: "pending",
        raw: result
      },
      {
        new: true,
        upsert: true
      }
    );

    order.paymentProvider = "paystack";
    order.paymentStatus = "pending";
    order.payment = {
      provider: "paystack",
      status: "pending",
      amount: Number(order.totals.total || order.total || 0),
      reference
    };

    await order.save();

    res.json({
      message: "Paystack payment initialized",
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
      reference: payment.reference
    });
  })
);

router.get(
  "/paystack/verify/:reference",
  asyncHandler(async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new ApiError(500, "Paystack secret key is not configured");
    }

    const payment = await Payment.findOne({
      reference: req.params.reference
    }).populate("order");

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    if (String(payment.user) !== String(req.auth.userId) && req.auth.role !== "admin") {
      throw new ApiError(403, "You cannot verify this payment");
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`
        }
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status) {
      throw new ApiError(400, result.message || "Payment verification failed");
    }

    const paid = result.data.status === "success";

    payment.status = paid ? "paid" : result.data.status || "failed";
    payment.channel = result.data.channel;
    payment.gatewayResponse = result.data.gateway_response;
    payment.verifiedAt = new Date();
    payment.paidAt = paid
      ? new Date(result.data.paid_at || Date.now())
      : payment.paidAt;
    payment.raw = result;

    await payment.save();

    const order = payment.order;

    if (paid && order.paymentStatus !== "paid") {
      confirmPaidOrder(order);
      await order.save();

      await notifyUser(getOrderUserId(order), order);
      pushOrderRealtime(order);
    }

    res.json({
      message: paid
        ? "Payment verified successfully"
        : "Payment was not successful",
      paid,
      payment,
      order
    });
  })
);

export default router;