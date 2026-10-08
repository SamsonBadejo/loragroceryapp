import { Router } from "express";
import { z } from "zod";

import { Category } from "../models/Category.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/error.js";
import { slugify } from "../utils/slug.js";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  parent: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  active: z.boolean().optional()
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await Category.find({ active: true })
      .populate("parent", "name slug")
      .sort({ sortOrder: 1, name: 1 });

    res.json({ categories });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validate({ body: categorySchema }),
  asyncHandler(async (req, res) => {
    const slug = slugify(req.body.name);

    const exists = await Category.findOne({ slug });
    if (exists) throw new ApiError(409, "Category already exists");

    const category = await Category.create({
      name: req.body.name,
      slug,
      description: req.body.description || "",
      image: req.body.image || "",
      icon: req.body.icon || "Leaf",
      parent: req.body.parent || null,
      sortOrder: req.body.sortOrder || 0,
      active: req.body.active ?? true
    });

    res.status(201).json({ category });
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate({ body: categorySchema.partial() }),
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new ApiError(404, "Category not found");

    if (req.body.name) {
      category.name = req.body.name;
      category.slug = slugify(req.body.name);
    }

    if (req.body.description !== undefined) category.description = req.body.description;
    if (req.body.image !== undefined) category.image = req.body.image;
    if (req.body.icon !== undefined) category.icon = req.body.icon;
    if (req.body.parent !== undefined) category.parent = req.body.parent || null;
    if (req.body.sortOrder !== undefined) category.sortOrder = req.body.sortOrder;
    if (req.body.active !== undefined) category.active = req.body.active;

    await category.save();

    res.json({ category });
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new ApiError(404, "Category not found");

    category.active = false;
    await category.save();

    res.json({ message: "Category archived" });
  })
);

export default router;