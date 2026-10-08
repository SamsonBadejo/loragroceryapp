import { Router } from "express";

import { Notification } from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
      user: req.auth.userId,
    })
      .sort({ createdAt: -1 })
      .limit(40);

    const unreadCount = await Notification.countDocuments({
      user: req.auth.userId,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.auth.userId,
      },
      {
        $set: {
          read: true,
        },
      },
      {
        new: true,
      },
    );

    res.json({
      notification,
    });
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      {
        user: req.auth.userId,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    res.json({
      message: "Notifications marked as read",
    });
  }),
);

export default router;
