import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { HeroSlide } from "../models/HeroSlide.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../middleware/error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const heroSlideSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  buttonLink: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  order: z.coerce.number().optional(),
  isActive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true")
});

function normalizeSlide(slide) {
  return slide.toObject();
}

async function uploadImage(file) {
  if (!file) return null;

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new ApiError(503, "Cloudinary is not configured");
  }

  const result = await uploadBufferToCloudinary(file.buffer, "lora/hero-slides");

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const adminView = req.query.admin === "true";

    const filter = adminView ? {} : { isActive: true };

    const slides = await HeroSlide.find(filter).sort({
      order: 1,
      createdAt: -1
    });

    res.json({
      slides: slides.map(normalizeSlide)
    });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  validate({ body: heroSlideSchema }),
  asyncHandler(async (req, res) => {
    const image = await uploadImage(req.file);

    if (!image && !req.body.imageUrl) {
      throw new ApiError(400, "Hero slide image is required");
    }

    const slide = await HeroSlide.create({
      title: req.body.title,
      subtitle: req.body.subtitle || "",
      buttonText: req.body.buttonText || "Shop now",
      buttonLink: req.body.buttonLink || "/products",
      image: image || {
        url: req.body.imageUrl,
        publicId: ""
      },
      backgroundColor: req.body.backgroundColor || "#14532D",
      textColor: req.body.textColor || "#FFFFFF",
      accentColor: req.body.accentColor || "#84CC16",
      order: Number(req.body.order || 0),
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    res.status(201).json({
      slide
    });
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  validate({ body: heroSlideSchema.partial() }),
  asyncHandler(async (req, res) => {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      throw new ApiError(404, "Hero slide not found");
    }

    const image = await uploadImage(req.file);

    if (req.body.title !== undefined) slide.title = req.body.title;
    if (req.body.subtitle !== undefined) slide.subtitle = req.body.subtitle;
    if (req.body.buttonText !== undefined) slide.buttonText = req.body.buttonText;
    if (req.body.buttonLink !== undefined) slide.buttonLink = req.body.buttonLink;
    if (req.body.backgroundColor !== undefined) slide.backgroundColor = req.body.backgroundColor;
    if (req.body.textColor !== undefined) slide.textColor = req.body.textColor;
    if (req.body.accentColor !== undefined) slide.accentColor = req.body.accentColor;
    if (req.body.order !== undefined) slide.order = Number(req.body.order);
    if (req.body.isActive !== undefined) slide.isActive = req.body.isActive;

    if (image) {
      slide.image = image;
    }

    if (req.body.imageUrl) {
      slide.image = {
        url: req.body.imageUrl,
        publicId: ""
      };
    }

    await slide.save();

    res.json({
      slide
    });
  })
);

router.patch(
  "/:id/toggle",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      throw new ApiError(404, "Hero slide not found");
    }

    slide.isActive = !slide.isActive;

    await slide.save();

    res.json({
      slide
    });
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const slide = await HeroSlide.findById(req.params.id);

    if (!slide) {
      throw new ApiError(404, "Hero slide not found");
    }

    await slide.deleteOne();

    res.json({
      message: "Hero slide deleted"
    });
  })
);

export default router;