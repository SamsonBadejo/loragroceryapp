import { Router } from "express";
import { z } from "zod";

import { Review } from "../models/Review.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const createReviewSchema = z.object({
  orderId: z.string().min(1),
  riderRating: z.coerce.number().min(1).max(5),
  packagingRating: z.coerce.number().min(1).max(5),
  speedRating: z.coerce.number().min(1).max(5),
  productQualityRating: z.coerce.number().min(1).max(5),
  comment: z.string().optional().default(""),
  images: z.array(z.string()).optional().default([]),
});

async function updateDeliveryWorkerRating(workerId) {
  if (!workerId) return;

  const stats = await Review.aggregate([
    {
      $match: {
        rider: workerId,
      },
    },
    {
      $group: {
        _id: "$rider",
        averageRating: { $avg: "$riderRating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const rating = stats[0]?.averageRating || 5;
  const totalReviews = stats[0]?.totalReviews || 0;

  await User.findByIdAndUpdate(workerId, {
    $set: {
      "deliveryWorker.rating": Number(rating.toFixed(1)),
      "deliveryWorker.ratingAverage": Number(rating.toFixed(1)),
      "deliveryWorker.totalReviews": totalReviews,
    },
  });
}

router.post(
  "/",
  requireAuth,
  validate({ body: createReviewSchema }),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.body.orderId);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    const orderOwnerId = order.user || order.customer;

    if (!orderOwnerId || orderOwnerId.toString() !== req.auth.userId) {
      throw new ApiError(403, "You cannot review this order");
    }

    if (order.stage !== "Delivered" && order.status !== "Delivered") {
      throw new ApiError(400, "You can review after delivery is completed");
    }

    const existingReview = await Review.findOne({
      customer: req.auth.userId,
      order: order._id,
    });

    if (existingReview) {
      throw new ApiError(409, "You already reviewed this order");
    }

    const workerId = order.assignedRider || order.rider || null;

    const review = await Review.create({
      customer: req.auth.userId,
      order: order._id,
      rider: workerId,
      riderRating: req.body.riderRating,
      packagingRating: req.body.packagingRating,
      speedRating: req.body.speedRating,
      productQualityRating: req.body.productQualityRating,
      comment: req.body.comment || "",
      images: req.body.images || [],
    });

    await updateDeliveryWorkerRating(workerId);

    res.status(201).json({
      message: "Review submitted successfully",
      review,
    });
  }),
);

router.get(
  "/order/:orderId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await Review.findOne({
      order: req.params.orderId,
    })
      .populate("customer", "name email avatar")
      .populate("rider", "name email role avatar deliveryWorker");

    res.json({
      review,
    });
  }),
);

export default router;