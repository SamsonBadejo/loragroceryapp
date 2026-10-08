import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgePercent,
  Clock3,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck
} from "lucide-react";

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import HeroSlider from "../components/home/HeroSlider";
import CategoryScroller from "../components/home/CategoryScroller";
import ProductSection from "../components/home/ProductSection";
import HomeWelcome from "../components/home/HomeWelcome";

function getList(data, key) {
  const value = data?.[key] || data?.items || data?.data || data || [];
  return Array.isArray(value) ? value : [];
}

function productCategoryId(product) {
  return product.category?._id || product.category?.id || product.category || "";
}

function productCategoryName(product) {
  return product.category?.name || product.categoryName || "";
}

function isAvailable(product) {
  const stock = product.stock ?? product.stockQuantity ?? 0;
  return product.isAvailable !== false && product.status !== "inactive" && stock > 0;
}

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  const {
    data: slideData,
    isLoading: slidesLoading
  } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const res = await api.get("/hero-slides");
      return res.data;
    },
    retry: 1
  });

  const {
    data: productData,
    isLoading: productsLoading
  } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: {
          limit: 120
        }
      });

      return res.data;
    },
    retry: 1
  });

  const {
    data: categoryData,
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data;
    },
    retry: 1
  });

  const slides = useMemo(() => {
    return getList(slideData, "slides")
      .filter((slide) => slide?.isActive !== false)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [slideData]);

  const products = useMemo(() => {
    return getList(productData, "products");
  }, [productData]);

  const categories = useMemo(() => {
    return getList(categoryData, "categories");
  }, [categoryData]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" ||
        productCategoryId(product) === selectedCategory ||
        productCategoryName(product).toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch =
        !query ||
        [
          product.name,
          product.description,
          product.unit,
          productCategoryName(product),
          product.promotionalTag
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const availableProducts = useMemo(() => {
    return filteredProducts.filter(isAvailable);
  }, [filteredProducts]);

  const featuredProducts = useMemo(() => {
    const featured = availableProducts.filter(
      (product) => product.isFeatured || product.featured
    );

    return featured.length ? featured : availableProducts.slice(0, 10);
  }, [availableProducts]);

  const popularProducts = useMemo(() => {
    return [...availableProducts]
      .sort((a, b) => {
        const aRating = a.ratingAverage || a.rating || 0;
        const bRating = b.ratingAverage || b.rating || 0;
        return bRating - aRating;
      })
      .slice(0, 12);
  }, [availableProducts]);

  const dealProducts = useMemo(() => {
    return availableProducts
      .filter((product) => {
        return Number(product.discountPercent || product.discount || 0) > 0;
      })
      .slice(0, 12);
  }, [availableProducts]);

  const newProducts = useMemo(() => {
    return [...availableProducts]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 12);
  }, [availableProducts]);

  return (
    <main className="min-h-screen bg-[#f7faf6] pb-24 text-slate-950">
      <section className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 lg:px-8">
        <HomeWelcome user={user} />

        <div className="mt-3 rounded-[24px] border border-slate-100 bg-white p-3 shadow-soft-card">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4">
            <Search size={19} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search groceries, drinks, snacks..."
              className="h-12 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      <HeroSlider slides={slides} loading={slidesLoading} />

      <section className="mx-auto mt-5 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
              <Truck size={20} />
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">
              Fast delivery
            </h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              Fresh groceries delivered quickly to your doorstep.
            </p>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
              <PackageCheck size={20} />
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">
              Quality products
            </h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              Stocked, checked and packed with care.
            </p>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
              <ShieldCheck size={20} />
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">
              Secure checkout
            </h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              Pay safely and track your order after confirmation.
            </p>
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-soft-card">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
              <Clock3 size={20} />
            </div>
            <h3 className="mt-3 text-sm font-black text-slate-950">
              Live updates
            </h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              Follow your delivery from packing to arrival.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lora-green">
              Shop by category
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Browse groceries
            </h2>
          </div>

          <Link
            to="/products"
            className="hidden items-center gap-1 text-sm font-black text-lora-green sm:inline-flex"
          >
            See all
            <ArrowRight size={16} />
          </Link>
        </div>

        <CategoryScroller
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          loading={categoriesLoading}
        />
      </section>

      <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
        <div className="overflow-hidden rounded-[28px] bg-lora-dark shadow-soft-card">
          <div className="grid gap-5 p-5 text-white sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-lora-lime">
                <Sparkles size={15} />
                Fresh today
              </div>

              <h2 className="mt-4 max-w-2xl text-2xl font-black leading-tight sm:text-4xl">
                Fresh picks, weekly deals and everyday essentials in one place.
              </h2>

              <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/70">
                Explore Lo'ra products, add to cart, checkout with Paystack and
                track your delivery live.
              </p>
            </div>

            <Link
              to="/products"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-lora-dark"
            >
              Start shopping
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
        <ProductSection
          title="Featured products"
          subtitle="Top items selected for Lo'ra customers"
          products={featuredProducts}
          loading={productsLoading}
          icon={ShoppingBag}
          seeAllTo="/products"
        />
      </section>

      {dealProducts.length > 0 && (
        <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
          <ProductSection
            title="Deals and discounts"
            subtitle="Save more on selected groceries"
            products={dealProducts}
            loading={productsLoading}
            icon={BadgePercent}
            seeAllTo="/products"
          />
        </section>
      )}

      <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
        <ProductSection
          title="Popular right now"
          subtitle="Customer favorites and highly rated items"
          products={popularProducts}
          loading={productsLoading}
          icon={Sparkles}
          seeAllTo="/products"
        />
      </section>

      <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
        <ProductSection
          title="New arrivals"
          subtitle="Recently added to the Lo'ra store"
          products={newProducts}
          loading={productsLoading}
          icon={PackageCheck}
          seeAllTo="/products"
        />
      </section>
    </main>
  );
}