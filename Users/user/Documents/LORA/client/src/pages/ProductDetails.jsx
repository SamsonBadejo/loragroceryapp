import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api, currency, getErrorMessage } from "../lib/api";
import ProductSection from "../components/home/ProductSection";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";

const fallbackImage =
  "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=900&q=85";

function getImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;

  return image.secure_url || image.url || "";
}

function getProductImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const cleanImages = images.map(getImage).filter(Boolean);

  const main = getImage(product?.image);

  if (main && !cleanImages.includes(main)) {
    cleanImages.unshift(main);
  }

  return cleanImages.length ? cleanImages : [fallbackImage];
}

function productUnit(product) {
  return product?.unit || product?.unitPricing?.unit || "item";
}

function productRating(product) {
  return Number(product?.ratingAverage || product?.rating || 4.7);
}

function isUnavailable(product) {
  return (
    Number(product?.stock || 0) <= 0 ||
    product?.active === false ||
    product?.isAvailable === false ||
    product?.status !== "active"
  );
}

function stockText(product) {
  if (isUnavailable(product)) return "Out of stock";

  const stock = Number(product?.stock || 0);

  if (stock <= 5) return `${stock} left`;
  return "In stock";
}

function DetailBadge({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-lora-green">
        <Icon size={18} />
      </span>

      <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function QuantityControl({ quantity, onDecrease, onIncrease, disabled }) {
  return (
    <div className="flex h-13 items-center gap-2 rounded-full bg-slate-100 px-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= 1}
        className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-700 shadow-sm disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <Minus size={16} />
      </button>

      <span className="min-w-8 text-center text-base font-black text-slate-950">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className="grid h-9 w-9 place-items-center rounded-full bg-lora-green text-white shadow-sm disabled:bg-slate-300"
        aria-label="Increase quantity"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function ProductDetails() {
  const { slug, id } = useParams();
  const productKey = slug || id;
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const add = useCartStore((state) => state.add);
  const setCartOpen = useCartStore((state) => state.setOpen);

  const wishlistProducts = useWishlistStore((state) => state.products);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");

  const productQuery = useQuery({
    queryKey: ["product-details", productKey],
    enabled: Boolean(productKey),
    queryFn: async () => {
      const { data } = await api.get(`/products/${productKey}`);
      return data.product || data;
    }
  });

  const product = productQuery.data;

  const images = useMemo(() => getProductImages(product), [product]);

  const relatedQuery = useQuery({
    queryKey: ["related-products", product?.category?._id || product?.category],
    enabled: Boolean(product),
    queryFn: async () => {
      const category =
        product?.category?.slug ||
        product?.category?.name ||
        product?.category;

      const { data } = await api.get("/products", {
        params: {
          category,
          limit: 10
        }
      });

      const products = data.products || data.items || data || [];

      return products.filter((item) => item._id !== product._id);
    }
  });

  const unavailable = product ? isUnavailable(product) : false;
  const rating = product ? productRating(product) : 0;
  const isFavorite = wishlistProducts.some(
    (item) => String(item._id) === String(product?._id)
  );

  function increaseQuantity() {
    const stock = Number(product?.stock || 0);

    setQuantity((current) => {
      if (stock && current >= stock) return current;
      return current + 1;
    });
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  async function addToCart() {
    setCartMessage("");
    setCartError("");

    if (!user) {
      navigate("/auth");
      return;
    }

    if (unavailable) {
      setCartError("This product is currently unavailable.");
      return;
    }

    try {
      await add(product, quantity);
      setCartMessage("Added to cart.");
      setCartOpen(true);
    } catch (err) {
      setCartError(getErrorMessage(err, "Could not add product to cart."));
    }
  }

  function handleWishlist() {
    if (!user) {
      navigate("/auth");
      return;
    }

    toggleWishlist(product);
  }

  if (productQuery.isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="h-[420px] animate-pulse rounded-[30px] bg-white" />
          <div className="h-[420px] animate-pulse rounded-[30px] bg-white" />
        </div>
      </main>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
        <section className="rounded-[30px] bg-white p-8 text-center shadow-soft-card ring-1 ring-slate-100">
          <h1 className="text-3xl font-black text-slate-950">
            Product not found
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
            The product may have been removed or is no longer available.
          </p>

          <Link
            to="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
          >
            Back to shop
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-100"
      >
        <ArrowLeft size={17} />
        Back
      </button>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
        <div className="rounded-[30px] bg-white p-4 shadow-soft-card ring-1 ring-slate-100 sm:p-5">
          <div className="relative grid min-h-[330px] place-items-center overflow-hidden rounded-[26px] bg-slate-50 p-6 sm:min-h-[480px]">
            <motion.img
              key={images[activeImage]}
              src={images[activeImage]}
              alt={product.name}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="max-h-[420px] w-full object-contain"
            />

            {unavailable && (
              <span className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-4 py-2 text-xs font-black text-white">
                Out of stock
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-slate-50 p-1 transition ${
                    activeImage === index
                      ? "border-lora-green"
                      : "border-slate-100"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[30px] bg-white p-5 shadow-soft-card ring-1 ring-slate-100 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
                {product.category?.name || "Grocery item"}
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {product.name}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleWishlist}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-sm transition ${
                isFavorite
                  ? "bg-lora-green text-white"
                  : "bg-slate-50 text-slate-500 hover:text-lora-green"
              }`}
              aria-label="Save product"
            >
              <Heart size={20} className={isFavorite ? "fill-current" : ""} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-black ${
                unavailable
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-lora-green"
              }`}
            >
              {stockText(product)}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
              {productUnit(product)}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-4xl font-black text-lora-dark">
              {currency(product.price || 0)}
            </p>

            <p className="mt-2 text-sm font-bold text-slate-500">
              Price per {productUnit(product)}
            </p>
          </div>

          {product.description && (
            <p className="mt-6 text-sm font-semibold leading-7 text-slate-600">
              {product.description}
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <DetailBadge
              icon={Truck}
              title="Delivery"
              text="Rider or local delivery"
            />
            <DetailBadge
              icon={ShieldCheck}
              title="Payment"
              text="Paystack secured"
            />
            <DetailBadge
              icon={PackageCheck}
              title="Packed"
              text="Carefully handled"
            />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityControl
              quantity={quantity}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              disabled={unavailable}
            />

            <button
              type="button"
              onClick={addToCart}
              disabled={unavailable}
              className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <ShoppingBag size={18} />
              {unavailable ? "Unavailable" : "Add to cart"}
            </button>
          </div>

          <AnimatePresence>
            {cartMessage && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-lora-green"
              >
                {cartMessage}
              </motion.p>
            )}

            {cartError && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600"
              >
                {cartError}
              </motion.p>
            )}
          </AnimatePresence>

          {(product.nutrition || product.ingredients) && (
            <div className="mt-7 rounded-[24px] bg-slate-50 p-4">
              {product.ingredients && (
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Ingredients
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {product.ingredients}
                  </p>
                </div>
              )}

              {product.nutrition && (
                <div className={product.ingredients ? "mt-4" : ""}>
                  <p className="text-sm font-black text-slate-950">
                    Nutrition
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {typeof product.nutrition === "string"
                      ? product.nutrition
                      : JSON.stringify(product.nutrition)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="mt-8">
        <ProductSection
          title="Related products"
          products={relatedQuery.data || []}
          loading={relatedQuery.isLoading}
          horizontal
        />
      </div>
    </main>
  );
}