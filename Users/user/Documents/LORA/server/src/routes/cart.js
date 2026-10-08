import { Router } from "express";
import { z } from "zod";

import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateCartTotals } from "../utils/pricing.js";

const router = Router();

function isProductAvailable(product) {
  if (!product) return false;
  if (product.active === false) return false;
  if (product.status !== "active") return false;
  if (Number(product.stock || 0) <= 0) return false;

  return true;
}

async function getUserCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [],
    });

    cart = await Cart.findOne({ user: userId }).populate("items.product");
  }

  return cart;
}

async function cleanCart(cart) {
  cart.items = cart.items.filter((item) => {
    return item.product && isProductAvailable(item.product);
  });

  for (const item of cart.items) {
    const stock = Number(item.product.stock || 0);

    if (item.quantity > stock) {
      item.quantity = stock;
    }

    item.priceAtAdd = item.product.price;
  }

  await cart.save();

  return Cart.findOne({ user: cart.user }).populate("items.product");
}

async function sendCart(cart, res) {
  const cleanedCart = await cleanCart(cart);
  const totals = await calculateCartTotals(cleanedCart);

  res.json({
    cart: cleanedCart,
    totals,
  });
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cart = await getUserCart(req.auth.userId);
    await sendCart(cart, res);
  }),
);

router.post(
  "/items",
  requireAuth,
  validate({
    body: z.object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().min(1).default(1),
    }),
  }),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.body.productId);

    if (!product || product.active === false) {
      throw new ApiError(404, "Product not found");
    }

    if (!isProductAvailable(product)) {
      throw new ApiError(400, "This product is currently unavailable");
    }

    const cart = await getUserCart(req.auth.userId);

    const existingItem = cart.items.find((item) => {
      return item.product._id.toString() === product._id.toString();
    });

    const currentQuantity = existingItem ? Number(existingItem.quantity || 0) : 0;
    const nextQuantity = currentQuantity + req.body.quantity;

    if (product.stock < nextQuantity) {
      throw new ApiError(400, `Only ${product.stock} item(s) available`);
    }

    if (existingItem) {
      existingItem.quantity = nextQuantity;
      existingItem.priceAtAdd = product.price;
    } else {
      cart.items.push({
        product: product._id,
        quantity: req.body.quantity,
        priceAtAdd: product.price,
      });
    }

    await cart.save();

    const populatedCart = await getUserCart(req.auth.userId);
    await sendCart(populatedCart, res);
  }),
);

router.patch(
  "/items/:productId",
  requireAuth,
  validate({
    body: z.object({
      quantity: z.coerce.number().int().min(0),
    }),
  }),
  asyncHandler(async (req, res) => {
    const cart = await getUserCart(req.auth.userId);

    cart.items = cart.items.filter((item) => {
      return item.product._id.toString() !== req.params.productId;
    });

    if (req.body.quantity > 0) {
      const product = await Product.findById(req.params.productId);

      if (!product || product.active === false) {
        throw new ApiError(404, "Product not found");
      }

      if (!isProductAvailable(product)) {
        throw new ApiError(400, "This product is currently unavailable");
      }

      if (product.stock < req.body.quantity) {
        throw new ApiError(400, `Only ${product.stock} item(s) available`);
      }

      cart.items.push({
        product: product._id,
        quantity: req.body.quantity,
        priceAtAdd: product.price,
      });
    }

    await cart.save();

    const populatedCart = await getUserCart(req.auth.userId);
    await sendCart(populatedCart, res);
  }),
);

router.post(
  "/coupon",
  requireAuth,
  validate({
    body: z.object({
      code: z.string().min(2),
    }),
  }),
  asyncHandler(async (req, res) => {
    const code = req.body.code.toUpperCase();

    const coupon = await Coupon.findOne({
      code,
      active: true,
    });

    if (!coupon) {
      throw new ApiError(404, "Coupon not found");
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new ApiError(400, "Coupon has expired");
    }

    const cart = await getUserCart(req.auth.userId);
    cart.couponCode = code;

    await cart.save();

    const populatedCart = await getUserCart(req.auth.userId);
    await sendCart(populatedCart, res);
  }),
);

router.delete(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cart = await getUserCart(req.auth.userId);

    cart.items = [];
    cart.couponCode = undefined;

    await cart.save();

    const populatedCart = await getUserCart(req.auth.userId);
    await sendCart(populatedCart, res);
  }),
);

export default router;