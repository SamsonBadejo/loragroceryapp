import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import riderRoutes from "./routes/riders.js";
import adminRoutes from "./routes/admin.js";
import complaintRoutes from "./routes/complaints.js";
import reviewRoutes from "./routes/reviews.js";
import userRoutes from "./routes/users.js";
import wishlistRoutes from "./routes/wishlist.js";
import notificationRoutes from "./routes/notifications.js";
import deliveryRoutes from "./routes/delivery.js";
import adminDeliveryRoutes from "./routes/adminDelivery.js";
import paymentRoutes from "./routes/payments.js";
import heroSlideRoutes from "./routes/heroSlides.js";
import paystackWebhookRoutes from "./routes/paystackWebhook.js";

import { notFound, errorHandler } from "./middleware/error.js";

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(helmet());

app.use(
  "/api/payments/paystack/webhook",
  express.raw({ type: "application/json" }),
  paystackWebhookRoutes
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isProduction ? "combined" : "dev"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "lora-server",
    now: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/admin/delivery", adminDeliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/hero-slides", heroSlideRoutes);

app.use(notFound);
app.use(errorHandler);