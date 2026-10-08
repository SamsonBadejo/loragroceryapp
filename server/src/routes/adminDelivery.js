import { Router } from "express";
import { z } from "zod";
import { DeliveryPricing } from "../models/DeliveryPricing.js";
import { DeliveryZone } from "../models/DeliveryZone.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../middleware/error.js";
import { ensureDefaultPricing } from "../utils/deliveryPricing.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

const pricingSchema = z.object({
  label: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  customerTiers: z
    .array(
      z.object({
        fromKm: z.coerce.number().min(0),
        toKm: z.coerce.number().min(0),
        price: z.coerce.number().min(0)
      })
    )
    .optional(),
  perKmPriceAfterLastTier: z.coerce.number().min(0).optional(),
  surge: z
    .object({
      rainMultiplier: z.coerce.number().min(1).optional(),
      trafficMultiplier: z.coerce.number().min(1).optional(),
      peakHourMultiplier: z.coerce.number().min(1).optional(),
      manualSurgeEnabled: z.boolean().optional(),
      manualSurgeMultiplier: z.coerce.number().min(1).optional()
    })
    .optional(),
  payout: z
    .object({
      basePayout: z.coerce.number().min(0).optional(),
      perKmAfterKm: z.coerce.number().min(0).optional(),
      perKmAmount: z.coerce.number().min(0).optional(),
      localTiers: z
        .array(
          z.object({
            fromKm: z.coerce.number().min(0),
            toKm: z.coerce.number().min(0),
            payout: z.coerce.number().min(0)
          })
        )
        .optional()
    })
    .optional(),
  platform: z
    .object({
      minimumMargin: z.coerce.number().min(0).optional(),
      marginPercent: z.coerce.number().min(0).optional()
    })
    .optional()
});

const zoneSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  state: z.string().optional().default(""),
  serviceType: z.enum(["all", "rider", "deliveryBoy"]).default("all"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().min(1),
  baseEtaMinutes: z.coerce.number().min(1),
  priceAdjustment: z.coerce.number().default(0),
  rainMultiplier: z.coerce.number().min(1).default(1),
  trafficMultiplier: z.coerce.number().min(1).default(1),
  peakHourMultiplier: z.coerce.number().min(1).default(1),
  isActive: z.boolean().default(true),
  notes: z.string().optional().default("")
});

router.get(
  "/pricing",
  asyncHandler(async (req, res) => {
    await ensureDefaultPricing();

    const pricing = await DeliveryPricing.find().sort({ serviceType: 1 });

    res.json({ pricing });
  })
);

router.patch(
  "/pricing/:serviceType",
  validate({ body: pricingSchema }),
  asyncHandler(async (req, res) => {
    const { serviceType } = req.params;

    if (!["rider", "deliveryBoy"].includes(serviceType)) {
      throw new ApiError(400, "Invalid delivery service type");
    }

    const pricing = await DeliveryPricing.findOneAndUpdate(
      { serviceType },
      {
        ...req.body,
        serviceType,
        updatedBy: req.user.id
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "Delivery pricing updated",
      pricing
    });
  })
);

router.get(
  "/zones",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.serviceType && req.query.serviceType !== "all") {
      query.serviceType = req.query.serviceType;
    }

    if (req.query.status === "active") {
      query.isActive = true;
    }

    if (req.query.status === "inactive") {
      query.isActive = false;
    }

    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, "i") },
        { city: new RegExp(req.query.search, "i") },
        { state: new RegExp(req.query.search, "i") }
      ];
    }

    const [zones, total] = await Promise.all([
      DeliveryZone.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      DeliveryZone.countDocuments(query)
    ]);

    res.json({
      zones,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

router.post(
  "/zones",
  validate({ body: zoneSchema }),
  asyncHandler(async (req, res) => {
    const zone = await DeliveryZone.create({
      name: req.body.name,
      city: req.body.city,
      state: req.body.state,
      serviceType: req.body.serviceType,
      center: {
        type: "Point",
        coordinates: [req.body.lng, req.body.lat]
      },
      radiusKm: req.body.radiusKm,
      baseEtaMinutes: req.body.baseEtaMinutes,
      priceAdjustment: req.body.priceAdjustment,
      surge: {
        rainMultiplier: req.body.rainMultiplier,
        trafficMultiplier: req.body.trafficMultiplier,
        peakHourMultiplier: req.body.peakHourMultiplier
      },
      isActive: req.body.isActive,
      notes: req.body.notes
    });

    res.status(201).json({
      message: "Delivery zone created",
      zone
    });
  })
);

router.patch(
  "/zones/:id",
  validate({ body: zoneSchema.partial() }),
  asyncHandler(async (req, res) => {
    const update = { ...req.body };

    if (req.body.lat !== undefined && req.body.lng !== undefined) {
      update.center = {
        type: "Point",
        coordinates: [req.body.lng, req.body.lat]
      };

      delete update.lat;
      delete update.lng;
    }

    if (
      req.body.rainMultiplier !== undefined ||
      req.body.trafficMultiplier !== undefined ||
      req.body.peakHourMultiplier !== undefined
    ) {
      update.surge = {
        rainMultiplier: req.body.rainMultiplier,
        trafficMultiplier: req.body.trafficMultiplier,
        peakHourMultiplier: req.body.peakHourMultiplier
      };

      delete update.rainMultiplier;
      delete update.trafficMultiplier;
      delete update.peakHourMultiplier;
    }

    const zone = await DeliveryZone.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!zone) {
      throw new ApiError(404, "Delivery zone not found");
    }

    res.json({
      message: "Delivery zone updated",
      zone
    });
  })
);

router.delete(
  "/zones/:id",
  asyncHandler(async (req, res) => {
    const zone = await DeliveryZone.findByIdAndDelete(req.params.id);

    if (!zone) {
      throw new ApiError(404, "Delivery zone not found");
    }

    res.json({
      message: "Delivery zone deleted"
    });
  })
);

export default router;