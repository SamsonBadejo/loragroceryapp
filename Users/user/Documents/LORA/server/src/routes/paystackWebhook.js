import crypto from "crypto";
import { Router } from "express";

import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Notification } from "../models/Notification.js";
import { emitOrderUpdate } from "../realtime/socket.js";

const router = Router();

function verifyPaystackSignature(req) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers["x-paystack-signature"];

  if (!secretKey || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(req.body)
    .digest("hex");

  return hash === signature;
}

function getOrderUserId(order) {
  return String(order.user?._id || order.user || order.customer?._id || order.customer || "");
}

async function notifyCustomer(order) {
  try {
    await Notification.create({
      user: getOrderUserId(order),
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
    console.error("Webhook notification skipped:", error.message);
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
    console.error("Webhook realtime update skipped:", error.message);
  }
}

function confirmPaidOrder(order, reference) {
  order.paymentProvider = "paystack";
  order.paymentStatus = "paid";

  order.payment = {
    ...(order.payment || {}),
    provider: "paystack",
    status: "paid",
    reference
  };

  if (order.stage === "Pending") {
    order.stage = "Confirmed";
    order.status = "Confirmed";
  }

  if (!Array.isArray(order.stageHistory)) {
    order.stageHistory = [];
  }

  order.stageHistory.push({
    stage: order.stage,
    note: "Payment confirmed by Paystack webhook",
    date: new Date()
  });
}

router.post("/", async (req, res) => {
  if (!verifyPaystackSignature(req)) {
    return res.sendStatus(401);
  }

  let event;

  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch (error) {
    console.error("Invalid Paystack webhook JSON:", error.message);
    return res.sendStatus(400);
  }

  res.sendStatus(200);

  try {
    if (event.event !== "charge.success") {
      return;
    }

    const reference = event.data?.reference;

    if (!reference) {
      return;
    }

    const payment = await Payment.findOne({
      reference
    });

    if (!payment) {
      console.warn(`Paystack webhook payment not found: ${reference}`);
      return;
    }

    const order = await Order.findById(payment.order);

    if (!order) {
      console.warn(`Paystack webhook order not found: ${payment.order}`);
      return;
    }

    const expectedAmount = Math.round(Number(order.totals.total || order.total || 0) * 100);
    const paidAmount = Number(event.data.amount || 0);

    if (paidAmount < expectedAmount) {
      payment.status = "failed";
      payment.gatewayResponse = "Amount paid is lower than order total";
      payment.raw = event;
      payment.verifiedAt = new Date();
      await payment.save();
      return;
    }

    payment.status = "paid";
    payment.channel = event.data.channel;
    payment.gatewayResponse = event.data.gateway_response;
    payment.paidAt = event.data.paid_at
      ? new Date(event.data.paid_at)
      : new Date();
    payment.verifiedAt = new Date();
    payment.raw = event;

    await payment.save();

    if (order.paymentStatus !== "paid") {
      confirmPaidOrder(order, reference);

      await order.save();
      await notifyCustomer(order);
      pushOrderRealtime(order);
    }
  } catch (error) {
    console.error("Paystack webhook processing failed:", error);
  }
});

export default router;