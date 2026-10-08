import { User } from "../models/User.js";
import { ApiError } from "./error.js";
import { verifyAccessToken } from "../utils/tokens.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return next(new ApiError(401, "Authentication required"));
    }

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select(
      "_id role email isSuspended"
    );

    if (!user) {
      return next(new ApiError(401, "User account no longer exists"));
    }

    if (user.isSuspended) {
      return next(new ApiError(403, "This account is suspended"));
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email
    };

    return next();
  } catch (error) {
    return next(new ApiError(401, "Invalid or expired access token"));
  }
}

export function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.auth) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!roles.includes(req.auth.role)) {
      return next(
        new ApiError(403, "You do not have permission to access this resource")
      );
    }

    return next();
  };
}