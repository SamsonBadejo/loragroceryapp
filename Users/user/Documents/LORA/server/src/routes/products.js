import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import mongoose from "mongoose";

import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slug.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
});

function bool(value) {
  return value === true || value === "true" || value === "on";
}

function number(value, fallback = 0) {
  if (value === "" || value === undefined || value === null) return fallback;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSort(sort) {
  if (sort === "price_asc") return { price: 1 };
  if (sort === "price_desc") return { price: -1 };
  if (sort === "rating") return { ratingAverage: -1 };
  if (sort === "newest") return { createdAt: -1 };

  return { isTrending: -1, isFeatured: -1, createdAt: -1 };
}

function normalizeProduct(product) {
  const data = product.toObject ? product.toObject() : product;

  return {
    ...data,
    image: data.images?.[0] || data.image || "",
  };
}

async function resolveCategory(value) {
  if (!value) return null;

  if (mongoose.Types.ObjectId.isValid(value)) {
    return value;
  }

  const category = await Category.findOne({
    slug: value,
  });

  return category?._id || null;
}

async function resolveImages(files = [], imageUrls = "") {
  const urls = list(imageUrls);

  if (!files.length) return urls;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new ApiError(503, "Cloudinary is not configured");
  }

  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer, "lora/products");
    uploaded.push(result.secure_url);
  }

  return [...urls, ...uploaded];
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      q,
      category,
      subcategory,
      maxPrice,
      minPrice,
      rating,
      status,
      sort,
      page = 1,
      limit = 40,
      includeArchived,
    } = req.query;

    const filter = {};

    if (includeArchived === "true") {
      filter.active = { $in: [true, false] };
    } else {
      filter.active = true;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (!status && includeArchived !== "true") {
      filter.status = { $ne: "archived" };
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { promotionalTags: { $regex: q, $options: "i" } },
      ];
    }

    if (category) {
      const categoryId = await resolveCategory(category);
      if (categoryId) filter.category = categoryId;
    }

    if (subcategory) {
      const subcategoryId = await resolveCategory(subcategory);
      if (subcategoryId) filter.subcategory = subcategoryId;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (rating) {
      filter.ratingAverage = {
        $gte: Number(rating),
      };
    }

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category")
        .populate("subcategory")
        .sort(buildSort(sort))
        .skip(skip)
        .limit(limitNumber),
      Product.countDocuments(filter),
    ]);

    res.json({
      products: products.map(normalizeProduct),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.max(1, Math.ceil(total / limitNumber)),
      },
    });
  }),
);

router.get(
  "/featured",
  asyncHandler(async (req, res) => {
    const baseFilter = {
      active: true,
      status: "active",
      stock: {
        $gt: 0,
      },
    };

    const [featured, trending, flashSales] = await Promise.all([
      Product.find({
        ...baseFilter,
        isFeatured: true,
      })
        .populate("category")
        .limit(10),
      Product.find({
        ...baseFilter,
        isTrending: true,
      })
        .populate("category")
        .limit(10),
      Product.find({
        ...baseFilter,
        isFlashSale: true,
      })
        .populate("category")
        .limit(10),
    ]);

    res.json({
      featured: featured.map(normalizeProduct),
      trending: trending.map(normalizeProduct),
      flashSales: flashSales.map(normalizeProduct),
    });
  }),
);

router.get(
  "/suggestions",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
      return res.json({
        suggestions: {
          products: [],
          corrections: [],
        },
      });
    }

    const products = await Product.find({
      active: true,
      status: "active",
      name: {
        $regex: q,
        $options: "i",
      },
    })
      .limit(6)
      .select("name slug images price unit ratingAverage ratingCount stock stockAlertAt");

    res.json({
      suggestions: {
        products: products.map(normalizeProduct),
        corrections: [],
      },
    });
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.array("images", 8),
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      category: z.string().min(1),
      description: z.string().min(5),
      price: z.string().min(1),
      unit: z.string().min(1),
    });

    bodySchema.parse(req.body);

    const slug = slugify(req.body.name);

    const exists = await Product.findOne({
      slug,
    });

    if (exists) {
      throw new ApiError(409, "Product already exists");
    }

    const images = await resolveImages(req.files, req.body.imageUrls);

    const product = await Product.create({
      name: req.body.name,
      slug,
      category: req.body.category,
      subcategory: req.body.subcategory || null,
      description: req.body.description,
      images,
      price: number(req.body.price),
      compareAtPrice: req.body.compareAtPrice
        ? number(req.body.compareAtPrice)
        : undefined,
      unit: req.body.unit,
      stock: number(req.body.stock),
      stockAlertAt: number(req.body.stockAlertAt, 8),
      tags: list(req.body.tags),
      promotionalTags: list(req.body.promotionalTags),
      status:
        number(req.body.stock) <= 0 && req.body.status === "active"
          ? "out_of_stock"
          : req.body.status || "active",
      isFeatured: bool(req.body.isFeatured),
      isTrending: bool(req.body.isTrending),
      isFlashSale: bool(req.body.isFlashSale),
      discountPercent: number(req.body.discountPercent),
      active: true,
    });

    res.status(201).json({
      message: "Product created successfully",
      product: normalizeProduct(product),
    });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  upload.array("images", 8),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const uploadedImages = await resolveImages(req.files, req.body.imageUrls);

    if (req.body.name) {
      const nextSlug = slugify(req.body.name);

      const duplicate = await Product.findOne({
        slug: nextSlug,
        _id: {
          $ne: product._id,
        },
      });

      if (duplicate) {
        throw new ApiError(409, "Another product already uses this name");
      }

      product.name = req.body.name;
      product.slug = nextSlug;
    }

    if (req.body.category !== undefined) product.category = req.body.category;
    if (req.body.subcategory !== undefined) {
      product.subcategory = req.body.subcategory || null;
    }

    if (req.body.description !== undefined) product.description = req.body.description;

    if (uploadedImages.length) product.images = uploadedImages;

    if (req.body.price !== undefined) product.price = number(req.body.price);
    if (req.body.compareAtPrice !== undefined) {
      product.compareAtPrice = req.body.compareAtPrice
        ? number(req.body.compareAtPrice)
        : undefined;
    }

    if (req.body.unit !== undefined) product.unit = req.body.unit;
    if (req.body.stock !== undefined) product.stock = number(req.body.stock);
    if (req.body.stockAlertAt !== undefined) {
      product.stockAlertAt = number(req.body.stockAlertAt, 8);
    }

    if (req.body.tags !== undefined) product.tags = list(req.body.tags);
    if (req.body.promotionalTags !== undefined) {
      product.promotionalTags = list(req.body.promotionalTags);
    }

    if (req.body.status !== undefined) product.status = req.body.status;

    if (req.body.isFeatured !== undefined) product.isFeatured = bool(req.body.isFeatured);
    if (req.body.isTrending !== undefined) product.isTrending = bool(req.body.isTrending);
    if (req.body.isFlashSale !== undefined) product.isFlashSale = bool(req.body.isFlashSale);

    if (req.body.discountPercent !== undefined) {
      product.discountPercent = number(req.body.discountPercent);
    }

    if (product.stock <= 0 && product.status === "active") {
      product.status = "out_of_stock";
    }

    if (product.stock > 0 && product.status === "out_of_stock") {
      product.status = "active";
    }

    await product.save();

    await product.populate("category");
    await product.populate("subcategory");

    res.json({
      message: "Product updated successfully",
      product: normalizeProduct(product),
    });
  }),
);

router.patch(
  "/:id/toggle",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    product.status = product.status === "active" ? "out_of_stock" : "active";

    if (product.status === "active" && product.stock <= 0) {
      product.stock = 1;
    }

    await product.save();

    res.json({
      message: "Product availability updated",
      product: normalizeProduct(product),
    });
  }),
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    product.active = false;
    product.status = "archived";

    await product.save();

    res.json({
      message: "Product archived",
    });
  }),
);

router.get(
  "/:identifier",
  asyncHandler(async (req, res) => {
    const { identifier } = req.params;

    const lookup = mongoose.Types.ObjectId.isValid(identifier)
      ? {
          _id: identifier,
          active: true,
        }
      : {
          slug: identifier,
          active: true,
        };

    const product = await Product.findOne(lookup)
      .populate("category")
      .populate("subcategory");

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    const categoryId = product.category?._id || product.category;

    const related = await Product.find({
      active: true,
      status: "active",
      category: categoryId,
      _id: {
        $ne: product._id,
      },
    })
      .populate("category")
      .limit(6);

    res.json({
      product: normalizeProduct(product),
      related: related.map(normalizeProduct),
    });
  }),
);

export default router;