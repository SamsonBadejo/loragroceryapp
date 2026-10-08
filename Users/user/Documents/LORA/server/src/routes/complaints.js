import { Router } from "express";
import { z } from "zod";

import { Complaint } from "../models/Complaint.js";
import { Order } from "../models/Order.js";
import { Notification } from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const createComplaintSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum([
    "rider",
    "damaged_item",
    "late_delivery",
    "refund_request",
    "missing_item",
    "other",
  ]),
  description: z.string().min(10),
  evidenceImages: z.array(z.string()).optional().default([]),
});

const respondSchema = z.object({
  status: z.enum(["open", "reviewing", "resolved", "rejected"]),
  adminResponse: z.string().optional().default(""),
  resolution: z.string().optional().default(""),
  refundAmount: z.coerce.number().min(0).optional().default(0),
});

async function notifyCustomer(complaint) {
  if (!complaint?.customer) return;

  try {
    await Notification.create({
      user: complaint.customer,
      title: "Complaint updated",
      message: `Your complaint is now ${complaint.status}.`,
      type: "complaint",
      link: "/complaints",
      actionUrl: "/complaints",
      data: {
        complaintId: complaint._id,
        status: complaint.status,
      },
      read: false,
      isRead: false,
    });
  } catch (error) {
    console.error("Complaint notification skipped:", error.message);
  }
}

router.post(
  "/",
  requireAuth,
  validate({ body: createComplaintSchema }),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.body.orderId);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    const orderOwnerId = order.user || order.customer;

    if (!orderOwnerId || orderOwnerId.toString() !== req.auth.userId) {
      throw new ApiError(403, "You cannot complain about this order");
    }

    const complaint = await Complaint.create({
      customer: req.auth.userId,
      order: order._id,
      type: req.body.type,
      description: req.body.description,
      evidenceImages: req.body.evidenceImages || [],
      status: "open",
    });

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint,
    });
  }),
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter =
      req.auth.role === "customer"
        ? {
            customer: req.auth.userId,
          }
        : {};

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const complaints = await Complaint.find(filter)
      .populate("customer", "name email phone avatar")
      .populate("order", "orderNumber stage status totals deliveryServiceType assignedRider")
      .sort({
        createdAt: -1,
      });

    res.json({
      complaints,
    });
  }),
);

router.patch(
  "/:id/respond",
  requireAuth,
  requireRole("admin"),
  validate({ body: respondSchema }),
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    complaint.status = req.body.status;
    complaint.adminResponse = req.body.adminResponse || complaint.adminResponse;
    complaint.resolution = req.body.resolution || complaint.resolution;
    complaint.refundAmount = req.body.refundAmount || 0;
    complaint.reviewedAt = new Date();
    complaint.reviewedBy = req.auth.userId;

    await complaint.save();

    await notifyCustomer(complaint);

    res.json({
      message: "Complaint updated successfully",
      complaint,
    });
  }),
);

router.delete(
  "/clear/all",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await Complaint.deleteMany({});

    res.json({
      message: "All complaints cleared",
      deletedCount: result.deletedCount || 0,
    });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    res.json({
      message: "Complaint deleted successfully",
    });
  }),
);

export default router;