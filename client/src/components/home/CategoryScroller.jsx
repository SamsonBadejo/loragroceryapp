import { motion } from "framer-motion";
import {
  Apple,
  Beef,
  Coffee,
  CupSoda,
  Grid2X2,
  Milk,
  Package,
  ShoppingBasket,
  Snowflake,
  SprayCan,
  Wheat
} from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "./SectionHeader";

const fallbackCategories = [
  { _id: "fruits", name: "Fruits", slug: "fruits", icon: "fruits" },
  { _id: "vegetables", name: "Vegetables", slug: "vegetables", icon: "vegetables" },
  { _id: "snacks", name: "Snacks", slug: "snacks", icon: "snacks" },
  { _id: "drinks", name: "Drinks", slug: "drinks", icon: "drinks" },
  { _id: "dairy", name: "Dairy", slug: "dairy", icon: "dairy" },
  { _id: "frozen", name: "Frozen", slug: "frozen", icon: "frozen" },
  { _id: "household", name: "Household", slug: "household", icon: "household" }
];

function getImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;

  return image.secure_url || image.url || "";
}

function categoryImage(category) {
  return getImage(category?.image || category?.iconImage);
}

function iconFor(category) {
  const value = String(category?.icon || category?.name || "").toLowerCase();

  if (value.includes("fruit")) return Apple;
  if (value.includes("vegetable")) return ShoppingBasket;
  if (value.includes("snack")) return Package;
  if (value.includes("drink") || value.includes("beverage")) return CupSoda;
  if (value.includes("dairy") || value.includes("milk")) return Milk;
  if (value.includes("frozen")) return Snowflake;
  if (value.includes("house")) return SprayCan;
  if (value.includes("meat")) return Beef;
  if (value.includes("bread") || value.includes("bakery")) return Wheat;
  if (value.includes("coffee")) return Coffee;

  return Grid2X2;
}

function CategorySkeleton() {
  return (
    <div className="w-[76px] shrink-0 sm:w-[92px]">
      <div className="h-[70px] animate-pulse rounded-[22px] bg-white sm:h-[82px]" />
      <div className="mx-auto mt-2 h-3 w-14 animate-pulse rounded-full bg-white" />
    </div>
  );
}

function CategoryCard({ category, index }) {
  const image = categoryImage(category);
  const Icon = iconFor(category);
  const target = `/products?category=${encodeURIComponent(
    category.slug || category.name
  )}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.24 }}
      className="w-[76px] shrink-0 sm:w-[92px] lg:w-[104px]"
    >
      <Link to={target} className="group block text-center">
        <div className="relative grid h-[70px] place-items-center overflow-hidden rounded-[22px] bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ring-1 ring-slate-100 transition group-hover:-translate-y-0.5 group-hover:shadow-soft-card sm:h-[82px] lg:h-[92px]">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-50 to-transparent opacity-70" />

          {image ? (
            <img
              src={image}
              alt={category.name}
              className="relative h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green sm:h-12 sm:w-12">
              <Icon size={22} />
            </span>
          )}
        </div>

        <p className="mt-2 truncate text-[11px] font-black leading-tight text-slate-700 transition group-hover:text-lora-green sm:text-xs">
          {category.name}
        </p>
      </Link>
    </motion.div>
  );
}

export default function CategoryScroller({ categories = [], loading = false }) {
  const items = categories.length ? categories : fallbackCategories;

  return (
    <section className="min-w-0 rounded-[24px] bg-[#eef7ef] px-3 py-4 sm:rounded-[30px] sm:px-5 sm:py-5">
      <SectionHeader title="Shop by category" to="/products" />

      <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:-mx-5 sm:px-5 lg:grid lg:grid-cols-8 lg:overflow-visible">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
              <CategorySkeleton key={index} />
            ))
          : items.slice(0, 8).map((category, index) => (
              <CategoryCard
                key={category._id || category.slug || category.name}
                category={category}
                index={index}
              />
            ))}
      </div>
    </section>
  );
}