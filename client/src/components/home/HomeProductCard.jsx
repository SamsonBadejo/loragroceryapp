import { AnimatePresence, motion } from "framer-motion";
import { Heart, Minus, Plus, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { currency } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";

const fallbackImage =
  "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=600&q=80";

function getImage(image) {
  if (!image) return "";
  if (typeof image === "string") return image;

  return image.secure_url || image.url || "";
}

function productImage(product) {
  return getImage(product?.images?.[0] || product?.image) || fallbackImage;
}

function productLink(product) {
  return `/products/${product?.slug || product?._id || product?.id}`;
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

export default function HomeProductCard({ product, horizontal = false }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const items = useCartStore((state) => state.items);
  const add = useCartStore((state) => state.add);
  const update = useCartStore((state) => state.update);

  const wishlistProducts = useWishlistStore((state) => state.products);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const cartItem = items.find((item) => {
    const id = item.product?._id || item._id || item.product;
    return String(id) === String(product._id);
  });

  const quantity = cartItem?.quantity || 0;
  const unavailable = isUnavailable(product);
  const isFavorite = wishlistProducts.some(
    (item) => String(item._id) === String(product._id)
  );

  async function addItem() {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!unavailable) {
      await add(product, 1);
    }
  }

  async function decreaseItem() {
    if (!cartItem) return;

    await update(product._id, Math.max(0, quantity - 1));
  }

  function handleWishlist(event) {
    event.preventDefault();

    if (!user) {
      navigate("/auth");
      return;
    }

    toggleWishlist(product);
  }

  return (
    <motion.article
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`group relative min-w-0 overflow-hidden rounded-[18px] bg-white shadow-soft-card ring-1 ring-slate-100 ${
        horizontal ? "w-[148px] shrink-0 sm:w-[180px]" : "w-full"
      }`}
    >
      <Link
        to={productLink(product)}
        className="relative flex h-[110px] w-full items-center justify-center bg-slate-50 p-2.5 sm:h-[138px]"
      >
        <img
          src={productImage(product)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]"
        />

        {unavailable && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-black text-white">
            Out
          </span>
        )}

        {(product.discountPercent || product.discount || 0) > 0 && !unavailable && (
          <span className="absolute left-2 top-2 rounded-full bg-lora-green px-2 py-1 text-[10px] font-black text-white">
            -{product.discountPercent || product.discount}%
          </span>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full shadow-sm transition ${
            isFavorite
              ? "bg-lora-green text-white"
              : "bg-white text-slate-500 hover:text-lora-green"
          }`}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          title={user ? "Save product" : "Sign in to save"}
        >
          <Heart size={14} className={isFavorite ? "fill-current" : ""} />
        </button>
      </Link>

      <div className="p-2.5 sm:p-3">
        <Link
          to={productLink(product)}
          className="line-clamp-2 min-h-[34px] text-[12px] font-black leading-[17px] text-slate-950 transition hover:text-lora-green sm:min-h-[40px] sm:text-sm sm:leading-5"
        >
          {product.name}
        </Link>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] font-black text-amber-500">
            <Star size={12} className="fill-current" />
            {productRating(product).toFixed(1)}
          </span>

          <span className="truncate text-[10px] font-bold text-slate-400">
            {productUnit(product)}
          </span>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black leading-none text-lora-dark sm:text-base">
              {currency(product.price || 0)}
            </p>
            <p className="mt-1 truncate text-[10px] font-bold leading-none text-slate-400">
              {Number(product.stock || 0) > 0
                ? `${product.stock} left`
                : "Unavailable"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {quantity > 0 ? (
              <motion.div
                key="qty"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-lora-dark px-1 text-white"
              >
                <button
                  type="button"
                  onClick={decreaseItem}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/10"
                  aria-label="Decrease quantity"
                >
                  <Minus size={12} />
                </button>

                <span className="min-w-4 text-center text-xs font-black">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={addItem}
                  className="grid h-6 w-6 place-items-center rounded-full bg-lora-lime text-lora-dark"
                  aria-label="Increase quantity"
                >
                  <Plus size={12} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                whileTap={{ scale: 0.88 }}
                type="button"
                disabled={unavailable}
                onClick={addItem}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lora-green text-white shadow-green-soft transition hover:bg-lora-dark disabled:bg-slate-300 disabled:shadow-none"
                aria-label="Add to cart"
                title={user ? "Add to cart" : "Sign in to add"}
              >
                <Plus size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}