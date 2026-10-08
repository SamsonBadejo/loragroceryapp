import { Heart, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useAuthStore } from "../store/authStore";

function getImage(image) {
  if (!image) return "/logo.png";
  if (typeof image === "string") return image;
  return image.url || image.secure_url || "/logo.png";
}

export default function ProductPreviewCard({ product }) {
  const navigate = useNavigate();

  const add = useCartStore((state) => state.add);
  const user = useAuthStore((state) => state.user);
  const wishlistProducts = useWishlistStore((state) => state.products);
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const image = getImage(product.images?.[0] || product.image);
  const productLink = `/products/${product._id || product.id}`;

  const stock = Number(
    product.stock || product.stockQuantity || product.inventory || 0,
  );

  const unavailable =
    stock <= 0 ||
    product.active === false ||
    product.isAvailable === false ||
    product.status !== "active";

  const stockLabel =
  unavailable
    ? "Out"
    : stock <= (product.stockAlertAt || 8)
      ? "Low stock"
      : "In stock";

  const isFavorite = wishlistProducts.some((item) => item._id === product._id);

  function handleAdd() {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (unavailable) return;

    add(product);
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
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.99 }}
      className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-3 shadow-soft-card transition hover:border-emerald-100 hover:shadow-card"
    >
      <Link
        to={productLink}
        className="block overflow-hidden rounded-[20px] bg-emerald-50"
      >
        <img
          className="aspect-[4/3] w-full object-contain p-5 transition duration-500 group-hover:scale-105"
          src={image}
          alt={product.name}
          loading="lazy"
        />
      </Link>

      <div className="absolute left-5 top-5 flex gap-2">
        {(product.discountPercent || product.discount) > 0 && (
          <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-lora-dark">
            -{product.discountPercent || product.discount}%
          </span>
        )}

        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-lora-dark shadow-sm">
          {stockLabel}
        </span>
      </div>

      <button
        type="button"
        onClick={handleWishlist}
        className={`absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full shadow-sm transition ${
          isFavorite ? "bg-lora-green text-white" : "bg-white/95 text-lora-dark"
        }`}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart size={18} className={isFavorite ? "fill-current" : ""} />
      </button>

      <div className="p-3">
        <Link
          to={productLink}
          className="line-clamp-2 text-base font-black leading-tight text-lora-ink transition hover:text-lora-green"
        >
          {product.name}
        </Link>

        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
            {product.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <Star size={15} className="fill-amber-300 text-amber-300" />
              {(product.ratingAverage || product.rating || 0).toString()}
              {product.ratingCount ? ` (${product.ratingCount})` : ""}
            </div>

            <div className="mt-1 flex items-end gap-2">
              <span className="text-xl font-black text-lora-dark">
                ₦{Number(product.price || 0).toLocaleString()}
              </span>

              {product.unit && (
                <span className="pb-1 text-xs font-bold text-slate-400">
                  / {product.unit}
                </span>
              )}
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={unavailable}
            onClick={handleAdd}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-lora-green text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            aria-label={user ? "Add to cart" : "Sign in to add"}
          >
            <Plus size={22} />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
