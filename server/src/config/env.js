import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  PORT: z.coerce.number().default(5100),

  CLIENT_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:5174"),

  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/lora"),

  JWT_ACCESS_SECRET: z.string().min(10, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(10, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),

  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional()
});

const parsed = schema.parse(process.env);

export const env = {
  ...parsed,

  CLIENT_ORIGINS: parsed.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  isProduction: parsed.NODE_ENV === "production",
  isDevelopment: parsed.NODE_ENV === "development",
  isTest: parsed.NODE_ENV === "test"
};