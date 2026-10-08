import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { connectDb } from "./config/db.js";
import { User } from "./models/User.js";
import { Category } from "./models/Category.js";
import { Product } from "./models/Product.js";
import { slugify } from "./utils/slug.js";
import { Cart } from "./models/Cart.js";
import { Coupon } from "./models/Coupon.js";
import { Order } from "./models/Order.js";
import { Payment } from "./models/Payment.js";
import { Complaint } from "./models/Complaint.js";
import { Review } from "./models/Review.js";
import { Address } from "./models/Address.js";
import { Wishlist } from "./models/Wishlist.js";
import { Notification } from "./models/Notification.js";
import { DeliveryPricing } from "./models/DeliveryPricing.js";
import { DeliveryZone } from "./models/DeliveryZone.js";

const images = {
  fruit:
    "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1200&q=85",
  veg: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85",
  snacks:
    "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=1200&q=85",
  drinks:
    "https://images.unsplash.com/photo-1527960471264-932f39eb5846?auto=format&fit=crop&w=1200&q=85",
  dairy:
    "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=1200&q=85",
  frozen:
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=85",
  household:
    "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=1200&q=85",
};

async function seed() {
  await connectDb();

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Coupon.deleteMany({}),
    DeliveryPricing.deleteMany({}),
    DeliveryZone.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Complaint.deleteMany({}),
    Review.deleteMany({}),
    Address.deleteMany({}),
    Wishlist.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 12);

  await User.create([
    {
      name: "Amina Bello",
      email: "admin@lora.test",
      phone: "+234 800 000 1000",
      passwordHash,
      role: "admin",
      rewardPoints: 0,
    },
    {
      name: "Tomi Adeyemi",
      email: "customer@lora.test",
      phone: "+234 800 000 2000",
      passwordHash,
      role: "customer",
      rewardPoints: 420,
    },
    {
      name: "Kunle Rider",
      email: "rider@lora.test",
      phone: "+234 800 000 3000",
      passwordHash,
      role: "rider",
      rewardPoints: 0,
      deliveryWorker: {
        workerType: "rider",
        online: true,
        coverageRadiusKm: 100,
        currentLocation: {
          type: "Point",
          coordinates: [3.4301, 6.4422],
        },
        earningsBalance: 48200,
        totalDeliveries: 138,
        ratingAverage: 4.8,
      },
    },
    {
      name: "David Delivery",
      email: "delivery@lora.test",
      phone: "+234 800 000 4000",
      passwordHash,
      role: "deliveryBoy",
      rewardPoints: 0,
      deliveryWorker: {
        workerType: "deliveryBoy",
        online: true,
        coverageRadiusKm: 5,
        currentLocation: {
          type: "Point",
          coordinates: [3.4723, 6.4474],
        },
        earningsBalance: 18300,
        totalDeliveries: 64,
        ratingAverage: 4.6,
      },
    },
  ]);

  const categoryDocs = await Category.create([
    {
      name: "Fruits",
      slug: "fruits",
      image: images.fruit,
      icon: "Apple",
      sortOrder: 1,
      description: "Peak-season fruits and curated produce boxes.",
    },
    {
      name: "Vegetables",
      slug: "vegetables",
      image: images.veg,
      icon: "Leaf",
      sortOrder: 2,
      description: "Crisp vegetables sourced for freshness.",
    },
    {
      name: "Snacks",
      slug: "snacks",
      image: images.snacks,
      icon: "Cookie",
      sortOrder: 3,
      description: "Premium pantry snacks and treats.",
    },
    {
      name: "Drinks",
      slug: "drinks",
      image: images.drinks,
      icon: "CupSoda",
      sortOrder: 4,
      description: "Juices, waters, sodas, and wellness drinks.",
    },
    {
      name: "Dairy",
      slug: "dairy",
      image: images.dairy,
      icon: "Milk",
      sortOrder: 5,
      description: "Milk, yogurt, butter, cheese, and more.",
    },
    {
      name: "Frozen Foods",
      slug: "frozen-foods",
      image: images.frozen,
      icon: "Snowflake",
      sortOrder: 6,
      description: "Frozen staples kept cold end to end.",
    },
    {
      name: "Household",
      slug: "household",
      image: images.household,
      icon: "Home",
      sortOrder: 7,
      description: "Everyday home essentials and cleaning supplies.",
    },
  ]);

  const categoryBySlug = Object.fromEntries(
    categoryDocs.map((category) => [category.slug, category]),
  );

  const productSeed = [
    {
      name: "Royal Gala Apples",
      categorySlug: "fruits",
      image: images.fruit,
      price: 4200,
      unit: "6 pcs",
      stock: 34,
      isFeatured: true,
      isTrending: true,
      discountPercent: 12,
    },
    {
      name: "Sweet Pineapple Spears",
      categorySlug: "fruits",
      image:
        "https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?auto=format&fit=crop&w=1200&q=85",
      price: 3100,
      unit: "pack",
      stock: 19,
      isFeatured: false,
      isTrending: true,
      discountPercent: 8,
    },
    {
      name: "Hydroponic Lettuce",
      categorySlug: "vegetables",
      image: images.veg,
      price: 1800,
      unit: "head",
      stock: 22,
      isFeatured: true,
      isTrending: false,
      discountPercent: 0,
    },
    {
      name: "Baby Carrot Bundle",
      categorySlug: "vegetables",
      image:
        "https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=1200&q=85",
      price: 2600,
      unit: "500g",
      stock: 12,
      isFeatured: false,
      isTrending: true,
      discountPercent: 10,
    },
    {
      name: "Sea Salt Plantain Crisps",
      categorySlug: "snacks",
      image: images.snacks,
      price: 2400,
      unit: "120g",
      stock: 48,
      isFeatured: true,
      isTrending: true,
      discountPercent: 15,
    },
    {
      name: "Cold Pressed Orange Juice",
      categorySlug: "drinks",
      image: images.drinks,
      price: 3800,
      unit: "1L",
      stock: 16,
      isFeatured: true,
      isTrending: true,
      discountPercent: 10,
    },
    {
      name: "Greek Yogurt Honey Pot",
      categorySlug: "dairy",
      image: images.dairy,
      price: 2900,
      unit: "450g",
      stock: 9,
      isFeatured: true,
      isTrending: false,
      discountPercent: 0,
    },
    {
      name: "Vanilla Gelato Pint",
      categorySlug: "frozen-foods",
      image: images.frozen,
      price: 5200,
      unit: "500ml",
      stock: 14,
      isFeatured: false,
      isTrending: true,
      discountPercent: 20,
    },
    {
      name: "Eco Dish Wash Set",
      categorySlug: "household",
      image: images.household,
      price: 6900,
      unit: "bundle",
      stock: 28,
      isFeatured: false,
      isTrending: false,
      discountPercent: 0,
    },
  ];

  await Product.create(
    productSeed.map((product) => {
      const discount = Number(product.discountPercent || 0);

      return {
        name: product.name,
        slug: slugify(product.name),
        category: categoryBySlug[product.categorySlug]._id,
        description: `${product.name} selected for Lo'ra customers with reliable freshness checks and premium handling.`,
        images: [product.image],
        price: product.price,
        compareAtPrice: discount
          ? Math.round(product.price / (1 - discount / 100))
          : undefined,
        unit: product.unit,
        stock: product.stock,
        stockAlertAt: 8,
        tags: [product.categorySlug, "fresh", "premium"],
        nutrition: {
          calories: 120,
          protein: "2g",
          carbs: "18g",
          fat: "1g",
          fiber: "4g",
        },
        origin: "Lagos partner market",
        shelfLife: "3-7 days",
        ratingAverage: 4.7,
        ratingCount: 48,
        isFeatured: product.isFeatured,
        isTrending: product.isTrending,
        isFlashSale: discount > 0,
        flashSaleEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 20),
        discountPercent: discount,
      };
    }),
  );

  await Coupon.create([
    {
      code: "FRESH10",
      type: "percentage",
      value: 10,
      minSubtotal: 8000,
      active: true,
    },
    {
      code: "LORAFREE",
      type: "free_delivery",
      value: 0,
      minSubtotal: 25000,
      active: true,
    },
  ]);

  await DeliveryPricing.create([
    {
      name: "Rider long-distance pricing",
      serviceType: "rider",
      baseKm: 5,
      baseCustomerPrice: 1500,
      nextKmLimit: 10,
      nextCustomerPrice: 2500,
      perKmAfterLimit: 350,
      basePayout: 1000,
      payoutPerKmAfterBase: 150,
      rainSurgeMultiplier: 1.2,
      trafficSurgeMultiplier: 1.15,
      peakHourSurgeMultiplier: 1.1,
    },
    {
      name: "Delivery boy local pricing",
      serviceType: "deliveryBoy",
      baseKm: 3,
      baseCustomerPrice: 700,
      nextKmLimit: 5,
      nextCustomerPrice: 900,
      perKmAfterLimit: 0,
      basePayout: 500,
      payoutPerKmAfterBase: 80,
      rainSurgeMultiplier: 1.1,
      trafficSurgeMultiplier: 1.05,
      peakHourSurgeMultiplier: 1.05,
    },
  ]);

  await DeliveryZone.create([
    {
      name: "Lekki local delivery zone",
      serviceType: "deliveryBoy",
      center: {
        type: "Point",
        coordinates: [3.4723, 6.4474],
      },
      radiusKm: 5,
    },
    {
      name: "Lagos rider coverage",
      serviceType: "rider",
      center: {
        type: "Point",
        coordinates: [3.3792, 6.5244],
      },
      radiusKm: 100,
    },
  ]);

  console.log("Lo'ra seed completed");
  console.log("Admin: admin@lora.test / Password123!");
  console.log("Customer: customer@lora.test / Password123!");
  console.log("Rider: rider@lora.test / Password123!");
  console.log("Delivery Boy: delivery@lora.test / Password123!");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
