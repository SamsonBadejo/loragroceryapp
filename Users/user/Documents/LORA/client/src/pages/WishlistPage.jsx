import { Link } from "react-router-dom";
import { Heart, Search, ShoppingBag, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { useWishlistStore } from "../store/wishlistStore";

export default function WishlistPage() {
  const products = useWishlistStore((state) => state.products || []);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <section className="mb-6 overflow-hidden rounded-[32px] bg-lora-dark p-5 text-white shadow-card sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-lora-lime">
              Wishlist
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Saved grocery favorites
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Keep your favorite groceries close and add them to cart whenever
              you are ready.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <Heart size={22} className="text-lora-lime" />
            <p className="mt-3 text-3xl font-black">{products.length}</p>
            <p className="text-xs font-bold text-white/60">Saved items</p>
          </div>
        </div>
      </section>

      {products.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
                Ready when you are
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Your favorites
              </h2>
            </div>

            <Link
              to="/products"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-black text-lora-green"
            >
              <Search size={16} />
              Browse more
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <section className="flex min-h-[430px] items-center justify-center rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-soft-card">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-lora-green">
              <Sparkles size={34} />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No favorites yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tap the heart icon on products you love, and they will appear here
              for easy shopping.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
            >
              <ShoppingBag size={17} />
              Explore products
            </Link>
          </motion.div>
        </section>
      )}
    </main>
  );
}