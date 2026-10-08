import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import multer from "multer";

import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Address } from "../models/Address.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

const router = Router();

router.use(requireAuth);

function publicUser(user) {
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    googleId: user.googleId,
    hasPassword: Boolean(user.passwordHash),
    deliveryWorker: user.deliveryWorker || null,
    notificationPreferences: user.notificationPreferences,
  };
}

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  avatar: z.string().optional(),
  notificationPreferences: z
    .object({
      orderUpdates: z.boolean().optional(),
      promotions: z.boolean().optional(),
      riderArrival: z.boolean().optional(),
    })
    .optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8),
});

const addressSchema = z.object({
  label: z.string().min(2).default("Home"),
  recipientName: z.string().min(2),
  phone: z.string().min(6),
  line1: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  instructions: z.string().optional(),
  isDefault: z.boolean().optional(),
  location: z
    .object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    })
    .optional(),
});

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      user: publicUser(user),
    });
  }),
);

router.patch(
  "/profile",
  validate({
    body: profileSchema,
  }),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.avatar !== undefined) user.avatar = req.body.avatar;

    if (req.body.notificationPreferences) {
      user.notificationPreferences = {
        ...(user.notificationPreferences || {}),
        ...req.body.notificationPreferences,
      };
    }

    await user.save();

    res.json({
      user: publicUser(user),
    });
  }),
);

router.patch(
  "/avatar",
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!req.file) {
      throw new ApiError(400, "Profile image is required");
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new ApiError(503, "Cloudinary is not configured");
    }

    const result = await uploadBufferToCloudinary(
      req.file.buffer,
      "lora/profiles",
    );

    user.avatar = {
      url: result.secure_url,
      secure_url: result.secure_url,
      publicId: result.public_id,
    };

    await user.save();

    res.json({
      user: publicUser(user),
      avatar: user.avatar,
    });
  }),
);

router.post(
  "/profile/photo",
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!req.file) {
      throw new ApiError(400, "Profile image is required");
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new ApiError(503, "Cloudinary is not configured");
    }

    const result = await uploadBufferToCloudinary(
      req.file.buffer,
      "lora/profiles",
    );

    user.avatar = {
      url: result.secure_url,
      secure_url: result.secure_url,
      publicId: result.public_id,
    };

    await user.save();

    res.json({
      user: publicUser(user),
      avatar: user.avatar,
    });
  }),
);

router.get(
  "/profile/stats",
  asyncHandler(async (req, res) => {
    const [totalOrders, savedLocations, deliveredOrders, activeOrders] =
      await Promise.all([
        Order.countDocuments({
          user: req.auth.userId,
        }),
        Address.countDocuments({
          user: req.auth.userId,
        }),
        Order.countDocuments({
          user: req.auth.userId,
          stage: "Delivered",
        }),
        Order.countDocuments({
          user: req.auth.userId,
          stage: {
            $nin: ["Delivered", "Cancelled", "Refunded"],
          },
        }),
      ]);

    res.json({
      stats: {
        totalOrders,
        deliveredOrders,
        activeOrders,
        savedLocations,
      },
    });
  }),
);

router.patch(
  "/password",
  validate({
    body: passwordSchema,
  }),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.passwordHash) {
      if (!req.body.currentPassword) {
        throw new ApiError(400, "Current password is required");
      }

      const passwordOk = await bcrypt.compare(
        req.body.currentPassword,
        user.passwordHash,
      );

      if (!passwordOk) {
        throw new ApiError(400, "Current password is incorrect");
      }
    }

    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);

    await user.save();

    res.json({
      message: user.passwordHash
        ? "Password updated successfully"
        : "Password set successfully",
      user: publicUser(user),
    });
  }),
);

router.get(
  "/addresses",
  asyncHandler(async (req, res) => {
    const addresses = await Address.find({
      user: req.auth.userId,
    }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.json({
      addresses,
    });
  }),
);

router.post(
  "/addresses",
  validate({
    body: addressSchema,
  }),
  asyncHandler(async (req, res) => {
    if (req.body.isDefault) {
      await Address.updateMany(
        {
          user: req.auth.userId,
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    const address = await Address.create({
      user: req.auth.userId,
      label: req.body.label,
      recipientName: req.body.recipientName,
      phone: req.body.phone,
      line1: req.body.line1,
      city: req.body.city,
      state: req.body.state,
      instructions: req.body.instructions || "",
      isDefault: Boolean(req.body.isDefault),
      location: {
        type: "Point",
        coordinates: req.body.location
          ? [req.body.location.lng, req.body.location.lat]
          : [3.4723, 6.4474],
      },
    });

    res.status(201).json({
      address,
    });
  }),
);

router.patch(
  "/addresses/:id",
  validate({
    body: addressSchema.partial(),
  }),
  asyncHandler(async (req, res) => {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.auth.userId,
    });

    if (!address) {
      throw new ApiError(404, "Address not found");
    }

    if (req.body.isDefault) {
      await Address.updateMany(
        {
          user: req.auth.userId,
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    Object.assign(address, {
      ...req.body,
      location: req.body.location
        ? {
            type: "Point",
            coordinates: [req.body.location.lng, req.body.location.lat],
          }
        : address.location,
    });

    await address.save();

    res.json({
      address,
    });
  }),
);

router.patch(
  "/addresses/:id/default",
  asyncHandler(async (req, res) => {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.auth.userId,
    });

    if (!address) {
      throw new ApiError(404, "Address not found");
    }

    await Address.updateMany(
      {
        user: req.auth.userId,
      },
      {
        $set: {
          isDefault: false,
        },
      },
    );

    address.isDefault = true;
    await address.save();

    res.json({
      address,
    });
  }),
);

router.delete(
  "/addresses/:id",
  asyncHandler(async (req, res) => {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.auth.userId,
    });

    if (!address) {
      throw new ApiError(404, "Address not found");
    }

    res.json({
      message: "Address deleted",
    });
  }),
);

export default router;