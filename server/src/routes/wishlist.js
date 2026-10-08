import { Router } from "express";

import { Wishlist } from "../models/Wishlist.js";
import { Product } from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

async function getWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId })
    .populate("products")
    .populate("recentlyViewed.product");

  if (!wishlist) {
    wishlist = await Wishlist.create({
      user: userId,
      products: [],
      recentlyViewed: []
    });

    wishlist = await Wishlist.findOne({ user: userId })
      .populate("products")
      .populate("recentlyViewed.product");
  }

  return wishlist;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const wishlist = await getWishlist(req.auth.userId);

    res.json({
      products: wishlist.products,
      recentlyViewed: wishlist.recentlyViewed
    });
  })
);

router.post(
  "/:productId",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product || !product.active) {
      throw new ApiError(404, "Product not found");
    }

    let wishlist = await getWishlist(req.auth.userId);

    const exists = wishlist.products.some((item) => {
      return item._id.toString() === product._id.toString();
    });

    if (!exists) {
      wishlist.products.push(product._id);
      await wishlist.save();
    }

    wishlist = await getWishlist(req.auth.userId);

    res.json({
      products: wishlist.products,
      recentlyViewed: wishlist.recentlyViewed
    });
  })
);

router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    let wishlist = await getWishlist(req.auth.userId);

    wishlist.products = wishlist.products.filter((item) => {
      return item._id.toString() !== req.params.productId;
    });

    await wishlist.save();

    wishlist = await getWishlist(req.auth.userId);

    res.json({
      products: wishlist.products,
      recentlyViewed: wishlist.recentlyViewed
    });
  })
);

router.post(
  "/recently-viewed/:productId",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);

    if (!product || !product.active) {
      throw new ApiError(404, "Product not found");
    }

    let wishlist = await getWishlist(req.auth.userId);

    wishlist.recentlyViewed = wishlist.recentlyViewed.filter((item) => {
      return item.product._id.toString() !== product._id.toString();
    });

    wishlist.recentlyViewed.unshift({
      product: product._id,
      viewedAt: new Date()
    });

    wishlist.recentlyViewed = wishlist.recentlyViewed.slice(0, 12);

    await wishlist.save();

    wishlist = await getWishlist(req.auth.userId);

    res.json({
      recentlyViewed: wishlist.recentlyViewed
    });
  })
);

router.get(
  "/recommendations/smart",
  asyncHandler(async (req, res) => {
    const wishlist = await getWishlist(req.auth.userId);

    const categoryIds = new Set();

    for (const item of wishlist.products) {
      if (item.category) {
        categoryIds.add(item.category.toString());
      }
    }

    for (const item of wishlist.recentlyViewed) {
      if (item.product?.category) {
        categoryIds.add(item.product.category.toString());
      }
    }

    const filter = {
      active: true
    };

    if (categoryIds.size > 0) {
      filter.category = {
        $in: Array.from(categoryIds)
      };
    }

    const products = await Product.find(filter)
      .populate("category")
      .sort({
        isTrending: -1,
        ratingAverage: -1
      })
      .limit(8);

    res.json({
      products
    });
  })
);

export default router;