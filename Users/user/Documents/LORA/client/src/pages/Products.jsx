import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  Filter,
  Grid2X2,
  Loader2,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import ProductCard from "../components/ProductCard";
import { api, getErrorMessage } from "../lib/api";

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price-low", label: "Price low" },
  { value: "price-high", label: "Price high" },
  { value: "rating", label: "Top rated" }
];

function getCategoryValue(category) {
  return category?.slug || category?.name || category?._id || "";
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
        active
          ? "bg-lora-green text-white shadow-green-soft"
          : "bg-white text-slate-600 ring-1 ring-slate-100 hover:text-lora-green"
      }`}
    >
      {children}
    </button>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="h-[260px] animate-pulse rounded-[22px] bg-white"
        />
      ))}
    </div>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedCategory = searchParams.get("category") || "all";
  const selectedSort = searchParams.get("sort") || "newest";
  const selectedRating = searchParams.get("rating") || "";
  const selectedPrice = searchParams.get("price") || "";

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const categoriesQuery = useQuery({
    queryKey: ["products-categories"],
    queryFn: async () => {
      const { data } = await api.get("/categories");
      return data.categories || data || [];
    }
  });

  const productsQuery = useQuery({
    queryKey: [
      "products",
      searchParams.get("q") || "",
      selectedCategory,
      selectedSort,
      selectedRating,
      selectedPrice
    ],
    queryFn: async () => {
      const params = {
        limit: 60,
        sort: selectedSort
      };

      const q = searchParams.get("q");

      if (q) params.q = q;
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (selectedRating) params.rating = selectedRating;

      if (selectedPrice === "under-5000") {
        params.maxPrice = 5000;
      }

      if (selectedPrice === "5000-15000") {
        params.minPrice = 5000;
        params.maxPrice = 15000;
      }

      if (selectedPrice === "above-15000") {
        params.minPrice = 15000;
      }

      const { data } = await api.get("/products", { params });

      return data.products || data.items || data || [];
    }
  });

  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const activeFilters = useMemo(() => {
    return [
      searchParams.get("q"),
      selectedCategory !== "all" ? selectedCategory : "",
      selectedRating,
      selectedPrice
    ].filter(Boolean).length;
  }, [searchParams, selectedCategory, selectedPrice, selectedRating]);

  function updateParam(name, value) {
    const next = new URLSearchParams(searchParams);

    if (!value || value === "all") {
      next.delete(name);
    } else {
      next.set(name, value);
    }

    setSearchParams(next);
  }

  function submitSearch(event) {
    event.preventDefault();
    updateParam("q", query.trim());
  }

  function clearFilters() {
    setQuery("");
    setSearchParams({});
    setMobileFiltersOpen(false);
  }

  const filters = (
    <div className="grid gap-5">
      <div>
        <p className="mb-3 text-sm font-black text-slate-950">Category</p>

        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={selectedCategory === "all"}
            onClick={() => updateParam("category", "all")}
          >
            All
          </FilterButton>

          {categories.map((category) => {
            const value = getCategoryValue(category);

            return (
              <FilterButton
                key={category._id || value}
                active={selectedCategory === value}
                onClick={() => updateParam("category", value)}
              >
                {category.name}
              </FilterButton>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-black text-slate-950">Price</p>

        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={!selectedPrice}
            onClick={() => updateParam("price", "")}
          >
            Any
          </FilterButton>
          <FilterButton
            active={selectedPrice === "under-5000"}
            onClick={() => updateParam("price", "under-5000")}
          >
            Under ₦5k
          </FilterButton>
          <FilterButton
            active={selectedPrice === "5000-15000"}
            onClick={() => updateParam("price", "5000-15000")}
          >
            ₦5k - ₦15k
          </FilterButton>
          <FilterButton
            active={selectedPrice === "above-15000"}
            onClick={() => updateParam("price", "above-15000")}
          >
            Above ₦15k
          </FilterButton>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-black text-slate-950">Rating</p>

        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={!selectedRating}
            onClick={() => updateParam("rating", "")}
          >
            Any
          </FilterButton>
          <FilterButton
            active={selectedRating === "4"}
            onClick={() => updateParam("rating", "4")}
          >
            4.0+
          </FilterButton>
          <FilterButton
            active={selectedRating === "4.5"}
            onClick={() => updateParam("rating", "4.5")}
          >
            4.5+
          </FilterButton>
        </div>
      </div>

      {activeFilters > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="h-11 rounded-full bg-rose-50 text-sm font-black text-rose-600"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-[30px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
              Shop groceries
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Browse fresh essentials
            </h1>

            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-slate-500">
              Search products, filter by category, and add groceries to your cart.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-black text-lora-green">
              <Grid2X2 size={16} />
              {products.length} products
            </span>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-black text-slate-700 lg:hidden"
            >
              <Filter size={16} />
              Filters {activeFilters > 0 ? `(${activeFilters})` : ""}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]">
          <form onSubmit={submitSearch} className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rice, drinks, snacks..."
              className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-bold outline-none focus:border-lora-green focus:bg-white"
            />

            <button
              type="submit"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-lora-green text-white"
              aria-label="Search"
            >
              <SlidersHorizontal size={16} />
            </button>
          </form>

          <label className="relative block">
            <ArrowUpDown
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={selectedSort}
              onChange={(event) => updateParam("sort", event.target.value)}
              className="h-13 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-black outline-none focus:border-lora-green focus:bg-white"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
        <aside className="hidden h-fit rounded-[28px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100 lg:block">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">Filters</h2>
            <Filter size={19} className="text-lora-green" />
          </div>

          {filters}
        </aside>

        <section className="min-w-0">
          {productsQuery.isLoading ? (
            <ProductSkeleton />
          ) : productsQuery.isError ? (
            <div className="rounded-[28px] bg-rose-50 p-6 text-center text-sm font-bold text-rose-600">
              {getErrorMessage(productsQuery.error, "Products could not load.")}
            </div>
          ) : products.length ? (
            <motion.div
              layout
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            >
              {products.map((product) => (
                <ProductCard key={product._id || product.slug} product={product} />
              ))}
            </motion.div>
          ) : (
            <div className="rounded-[30px] bg-white p-8 text-center shadow-soft-card ring-1 ring-slate-100">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-lora-green">
                <Search size={30} />
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                No products found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
                Try another search or clear your filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 h-12 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            className="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileFiltersOpen(false)}
          >
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[30px] bg-[#f6f8f4] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-950">
                  Filters
                </h2>

                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {filters}

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-5 h-12 w-full rounded-full bg-lora-green text-sm font-black text-white shadow-green-soft"
              >
                Show products
              </button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}