import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { currency } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";

function getProduct(item) {
  return item.product || item;
}

function getProductId(item) {
  const product = getProduct(item);
  return product?._id || product?.id || item.product || item._id;
}

function getImage(product) {
  const image = product?.images?.[0] || product?.image;

  if (!image) return "";
  if (typeof image === "string") return image;

  return image.secure_url || image.url || "";
}

function isUnavailable(product) {
  return (
    Number(product?.stock || 0) <= 0 ||
    product?.active === false ||
    product?.isAvailable === false ||
    product?.status !== "active"
  );
}

function quantityOf(item) {
  return Number(item.quantity || 1);
}

function priceOf(item) {
  const product = getProduct(item);
  return Number(item.price || product?.price || 0);
}

function CartItem({ item }) {
  const update = useCartStore((state) => state.update);
  const remove = useCartStore((state) => state.remove);

  const product = getProduct(item);
  const productId = getProductId(item);
  const quantity = quantityOf(item);
  const price = priceOf(item);
  const unavailable = isUnavailable(product);
  const image = getImage(product);

  async function increase() {
    if (unavailable) return;
    await update(productId, quantity + 1);
  }

  async function decrease() {
    await update(productId, Math.max(0, quantity - 1));
  }

  async function removeItem() {
    await remove(productId);
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className={`rounded-[22px] border p-3 ${
        unavailable
          ? "border-rose-100 bg-rose-50"
          : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-50">
          {image ? (
            <img
              src={image}
              alt={product?.name || "Product"}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <ShoppingBag size={24} className="text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-black leading-5 text-slate-950">
                {product?.name || item.name || "Product"}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {product?.unit || item.unit || "item"}
              </p>
            </div>

            <button
              type="button"
              onClick={removeItem}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Remove item"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {unavailable && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-black text-rose-600">
              <AlertCircle size={13} />
              Currently unavailable
            </div>
          )}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-base font-black text-lora-dark">
                {currency(price)}
              </p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                Total {currency(price * quantity)}
              </p>
            </div>

            <div className="flex h-9 items-center gap-1 rounded-full bg-slate-100 px-1">
              <button
                type="button"
                onClick={decrease}
                className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-700 shadow-sm"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>

              <span className="w-7 text-center text-sm font-black text-slate-950">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increase}
                disabled={unavailable}
                className="grid h-7 w-7 place-items-center rounded-full bg-lora-green text-white shadow-sm disabled:bg-slate-300"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function CartDrawer() {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);

  const open = useCartStore((state) => state.open);
  const items = useCartStore((state) => state.items);
  const setOpen = useCartStore((state) => state.setOpen);
  const clear = useCartStore((state) => state.clear);
  const error = useCartStore((state) => state.error);

  const itemCount = items.reduce((sum, item) => sum + quantityOf(item), 0);
  const subtotal = items.reduce((sum, item) => sum + priceOf(item) * quantityOf(item), 0);
  const unavailableItems = items.filter((item) => isUnavailable(getProduct(item)));
  const canCheckout = user && items.length > 0 && unavailableItems.length === 0;

  function closeDrawer() {
    setOpen(false);
  }

  function goCheckout() {
    if (!user) {
      closeDrawer();
      navigate("/auth");
      return;
    }

    if (!canCheckout) return;

    closeDrawer();
    navigate("/checkout");
  }

  async function clearCart() {
    await clear();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            aria-label="Close cart"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f6f8f4] shadow-2xl"
          >
            <header className="border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-lora-green">
                    Your cart
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeDrawer}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700"
                  aria-label="Close cart"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {error && (
                <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600">
                  {error}
                </div>
              )}

              {unavailableItems.length > 0 && (
                <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-700">
                  Remove unavailable items before checkout.
                </div>
              )}

              {items.length === 0 ? (
                <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-[28px] bg-white p-8 text-center shadow-soft-card">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-lora-green">
                    <ShoppingBag size={30} />
                  </div>

                  <h3 className="mt-5 text-2xl font-black text-slate-950">
                    Your cart is empty
                  </h3>

                  <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                    Add fresh groceries and essentials to start your order.
                  </p>

                  <Link
                    to="/products"
                    onClick={closeDrawer}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-lora-green px-6 text-sm font-black text-white shadow-green-soft"
                  >
                    Start shopping
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <CartItem key={getProductId(item)} item={item} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-slate-100 bg-white p-4">
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-black text-slate-950">
                      {currency(subtotal)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm font-bold text-slate-500">
                    <span>Delivery</span>
                    <span>Calculated at checkout</span>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-950">
                        Estimated total
                      </span>
                      <span className="text-xl font-black text-lora-dark">
                        {currency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[auto_1fr] gap-3">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="grid h-13 w-13 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    aria-label="Clear cart"
                  >
                    <Trash2 size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={goCheckout}
                    disabled={!canCheckout}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {!user ? "Sign in to checkout" : "Checkout"}
                    <ArrowRight size={17} />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                  <PackageCheck size={14} />
                  Secure Paystack payment before delivery starts
                </div>
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}