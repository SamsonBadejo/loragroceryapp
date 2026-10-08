import { AnimatePresence, motion } from "framer-motion";
import { Heart, Minus, Plus, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { currency } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";

function productImage(product) {
  const image = product?.images?.[0];

  if (typeof image === "string") return image;
  if (image?.url) return image.url;

  return product?.image || "";
}

function productUnit(product) {
  return product?.unit || product?.unitPricing?.unit || "item";
}

function productRating(product) {
  return Number(product?.ratingAverage || product?.rating || 0);
}

function isOutOfStock(product) {
  return (
    Number(product?.stock || 0) <= 0 ||
    product?.active === false ||
    product?.isAvailable === false ||
    product?.status !== "active"
  );
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { items, add, update } = useCartStore();
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const wishlistProducts = useWishlistStore((state) => state.products);

  const cartItem = items.find((item) => item.product?._id === product._id);
  const quantity = cartItem?.quantity || 0;
  const image = productImage(product);
  const rating = productRating(product);
  const outOfStock = isOutOfStock(product);
  const productLink = `/products/${product._id || product.id || product.slug}`;
  const isFavorite = wishlistProducts.some((item) => item._id === product._id);

  async function addItem() {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!outOfStock) {
      await add(product, 1);
    }
  }

  async function decreaseItem() {
    if (!cartItem) return;

    await update(product._id, Math.max(0, quantity - 1));
  }

  function handleWishlist() {
    if (!user) {
      navigate("/auth");
      return;
    }

    toggleWishlist(product);
  }

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[22px] border border-lora-dark/5 bg-white p-3 shadow-soft-card"
    >
      <Link
        to={productLink}
        className="block rounded-[18px] bg-lora-mist p-3"
        aria-label={`View ${product.name}`}
      >
        {image ? (
          <motion.img
            layoutId={`product-image-${product._id}`}
            src={image}
            alt={product.name}
            loading="lazy"
            className="aspect-square w-full object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="aspect-square rounded-[16px] bg-white" />
        )}
      </Link>

      {(product.discountPercent || 0) > 0 && (
        <span className="absolute left-5 top-5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-lora-green shadow-sm">
          -{product.discountPercent}%
        </span>
      )}

      <button
        type="button"
        onClick={handleWishlist}
        aria-label={
          isFavorite ? `Remove ${product.name} from wishlist` : `Favorite ${product.name}`
        }
        className={`absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full shadow-sm transition ${
          isFavorite
            ? "bg-lora-green text-white"
            : "bg-white text-lora-dark hover:text-lora-green"
        }`}
      >
        <Heart size={17} className={isFavorite ? "fill-current" : ""} />
      </button>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={productLink}
            className="line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-lora-ink transition hover:text-lora-green"
          >
            {product.name}
          </Link>

          {rating > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
              <Star size={12} className="fill-amber-300 text-amber-300" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-xs font-bold text-lora-dark/45">
          {productUnit(product)}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-base font-black text-lora-dark">
              {currency(product.price)}
            </p>

            {outOfStock && (
              <p className="text-xs font-black text-red-500">Out of stock</p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {quantity > 0 ? (
              <motion.div
                key="quantity"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="flex h-10 items-center gap-1 rounded-full bg-lora-dark px-1 text-white"
              >
                <button
                  type="button"
                  onClick={decreaseItem}
                  className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/10"
                  aria-label={`Decrease ${product.name}`}
                >
                  <Minus size={15} />
                </button>

                <motion.span
                  key={quantity}
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-5 text-center text-sm font-black"
                >
                  {quantity}
                </motion.span>

                <button
                  type="button"
                  onClick={addItem}
                  className="grid h-8 w-8 place-items-center rounded-full bg-lora-lime text-lora-dark"
                  aria-label={`Increase ${product.name}`}
                >
                  <Plus size={15} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                type="button"
                onClick={addItem}
                disabled={outOfStock}
                whileTap={{ scale: 0.94 }}
                className="grid h-10 w-10 place-items-center rounded-full bg-lora-green text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label={`Add ${product.name}`}
              >
                <Plus size={19} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}