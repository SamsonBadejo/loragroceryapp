import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { firebaseAdminAuth } from "../config/firebaseAdmin.js";
import { User } from "../models/User.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../utils/tokens.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional().default(""),
  role: z.enum(["customer", "rider", "deliveryBoy"]).optional().default("customer")
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required")
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20, "Refresh token is required")
});

const googleAuthSchema = z.object({
  idToken: z.string().min(10, "Google token is required")
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email")
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional().default(""),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function workerDefaults(role) {
  if (role === "deliveryBoy") {
    return {
      workerType: "deliveryBoy",
      online: false,
      isOnline: false,
      status: "offline",
      availabilityStatus: "offline",
      maxDeliveryRadiusKm: 5,
      coverageRadiusKm: 5
    };
  }

  if (role === "rider") {
    return {
      workerType: "rider",
      online: false,
      isOnline: false,
      status: "offline",
      availabilityStatus: "offline",
      maxDeliveryRadiusKm: 150,
      coverageRadiusKm: 150
    };
  }

  return {};
}

function publicUser(user) {
  const hasPassword = Boolean(user.passwordHash);

  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || null,
    role: user.role,
    googleId: user.googleId || "",
    authProvider: user.googleId ? "google" : "email",
    hasPassword,
    isSuspended: Boolean(user.isSuspended),
    deliveryWorker: user.deliveryWorker || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function issueTokens(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  user.lastLoginAt = new Date();

  await user.save();

  return {
    accessToken,
    refreshToken
  };
}

async function findUserWithSecretsByEmail(email) {
  return User.findOne({
    email: normalizeEmail(email)
  }).select("+passwordHash +refreshTokenHash");
}

router.post(
  "/register",
  validate({
    body: registerSchema
  }),
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);

    const existingUser = await User.findOne({ email }).select("+passwordHash");

    if (existingUser) {
      if (existingUser.googleId && !existingUser.passwordHash) {
        throw new ApiError(
          409,
          "This email already uses Google sign in. Continue with Google or set a password from profile settings."
        );
      }

      throw new ApiError(409, "An account with this email already exists");
    }

    const role = req.body.role || "customer";
    const passwordHash = await bcrypt.hash(req.body.password, 12);

    const user = await User.create({
      name: req.body.name.trim(),
      email,
      phone: req.body.phone || "",
      passwordHash,
      role,
      deliveryWorker: workerDefaults(role)
    });

    const freshUser = await User.findById(user._id).select("+passwordHash");
    const tokens = await issueTokens(freshUser);

    res.status(201).json({
      user: publicUser(freshUser),
      ...tokens
    });
  })
);

router.post(
  "/login",
  validate({
    body: loginSchema
  }),
  asyncHandler(async (req, res) => {
    const user = await findUserWithSecretsByEmail(req.body.email);

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    if (user.isSuspended) {
      throw new ApiError(403, "This account is currently suspended");
    }

    if (!user.passwordHash) {
      throw new ApiError(
        401,
        "This account uses Google sign in. Continue with Google or set a password from profile settings."
      );
    }

    const passwordIsValid = await bcrypt.compare(
      req.body.password,
      user.passwordHash
    );

    if (!passwordIsValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    const tokens = await issueTokens(user);

    res.json({
      user: publicUser(user),
      ...tokens
    });
  })
);

router.post(
  "/google",
  validate({
    body: googleAuthSchema
  }),
  asyncHandler(async (req, res) => {
    const decoded = await firebaseAdminAuth.verifyIdToken(req.body.idToken);

    const email = normalizeEmail(decoded.email);

    if (!email) {
      throw new ApiError(400, "Google account email is required");
    }

    if (decoded.email_verified === false) {
      throw new ApiError(400, "Google email is not verified");
    }

    let user = await User.findOne({ email }).select("+passwordHash +refreshTokenHash");

    if (user?.isSuspended) {
      throw new ApiError(403, "This account is currently suspended");
    }

    if (!user) {
      user = await User.create({
        name: decoded.name || email.split("@")[0],
        email,
        avatar: decoded.picture
          ? {
              url: decoded.picture,
              secure_url: decoded.picture
            }
          : null,
        googleId: decoded.uid,
        role: "customer",
        deliveryWorker: {}
      });

      user = await User.findById(user._id).select("+passwordHash +refreshTokenHash");
    } else {
      user.googleId = user.googleId || decoded.uid;

      if (decoded.name && !user.name) {
        user.name = decoded.name;
      }

      if (decoded.picture && !user.avatar) {
        user.avatar = {
          url: decoded.picture,
          secure_url: decoded.picture
        };
      }
    }

    const tokens = await issueTokens(user);

    res.json({
      user: publicUser(user),
      ...tokens
    });
  })
);

router.post(
  "/refresh",
  validate({
    body: refreshSchema
  }),
  asyncHandler(async (req, res) => {
    const payload = verifyRefreshToken(req.body.refreshToken);

    const user = await User.findById(payload.sub).select(
      "+passwordHash +refreshTokenHash"
    );

    if (!user || !user.refreshTokenHash) {
      throw new ApiError(401, "Refresh token is no longer valid");
    }

    if (user.isSuspended) {
      throw new ApiError(403, "This account is currently suspended");
    }

    const tokenIsValid = await bcrypt.compare(
      req.body.refreshToken,
      user.refreshTokenHash
    );

    if (!tokenIsValid) {
      throw new ApiError(401, "Refresh token is no longer valid");
    }

    const tokens = await issueTokens(user);

    res.json({
      user: publicUser(user),
      ...tokens
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json({
      user: publicUser(user)
    });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.auth.userId, {
      $unset: {
        refreshTokenHash: ""
      }
    });

    res.status(204).send();
  })
);

router.post(
  "/forgot-password",
  validate({
    body: forgotPasswordSchema
  }),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      email: normalizeEmail(req.body.email)
    });

    if (!user) {
      return res.json({
        message: "If that account exists, an OTP has been sent"
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.otpHash = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    res.json({
      message: "If that account exists, an OTP has been sent",
      devOtp: process.env.NODE_ENV === "production" ? undefined : otp
    });
  })
);

router.post(
  "/reset-password",
  validate({
    body: resetPasswordSchema
  }),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      email: normalizeEmail(req.body.email)
    }).select("+otpHash +otpExpiresAt");

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    if (user.otpExpiresAt < new Date()) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    const otpIsValid = await bcrypt.compare(req.body.otp, user.otpHash);

    if (!otpIsValid) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    res.json({
      message: "Password updated successfully"
    });
  })
);

router.patch(
  "/password",
  requireAuth,
  validate({
    body: changePasswordSchema
  }),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.userId).select("+passwordHash");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.passwordHash) {
      const passwordIsValid = await bcrypt.compare(
        req.body.currentPassword,
        user.passwordHash
      );

      if (!passwordIsValid) {
        throw new ApiError(400, "Current password is incorrect");
      }
    }

    user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);

    await user.save();

    res.json({
      message: user.googleId
        ? "Password set successfully. You can now sign in with Google or email."
        : "Password updated successfully"
    });
  })
);

export default router;