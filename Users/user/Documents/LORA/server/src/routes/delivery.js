import { Router } from "express";
import { z } from "zod";

import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  calculateDeliveryQuote,
  haversineKm,
} from "../utils/deliveryPricing.js";
import { findAvailableDeliveryWorkers } from "../utils/dispatch.js";

const router = Router();

const quoteSchema = z.object({
  serviceType: z.enum(["rider", "deliveryBoy"]),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  rain: z.boolean().optional(),
  traffic: z.boolean().optional(),
  peakHour: z.boolean().optional(),
});

const storeLocation = {
  lat: 6.5244,
  lng: 3.3792,
};

router.post(
  "/quote",
  requireAuth,
  validate({ body: quoteSchema }),
  asyncHandler(async (req, res) => {
    const distanceKm = haversineKm(storeLocation, req.body.destination);

    const quote = await calculateDeliveryQuote({
      serviceType: req.body.serviceType,
      distanceKm,
      rain: Boolean(req.body.rain),
      traffic: Boolean(req.body.traffic),
      peakHour: Boolean(req.body.peakHour),
    });

    const availableWorkers = await findAvailableDeliveryWorkers({
      serviceType: req.body.serviceType,
      destinationCoordinates: [
        req.body.destination.lng,
        req.body.destination.lat,
      ],
      limit: 5,
    });
    
    res.json({
      quote,
      availableWorkers,
      etaMinutes:
        req.body.serviceType === "deliveryBoy"
          ? Math.max(12, Math.round(distanceKm * 4))
          : Math.max(25, Math.round(distanceKm * 5)),
    });
  }),
);

export default router;
