import { motion } from "framer-motion";
import { Bell, MapPin, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

function firstName(user) {
  return user?.name?.trim()?.split(" ")?.[0] || "there";
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeWelcome({ user }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-lora-green">
          <MapPin size={13} />
          Delivery location
        </p>

        <h1 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          {user
            ? `${greeting()}, ${firstName(user)}`
            : "Groceries delivered fresh"}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {user ? (
          <Link
            to="/orders"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-100"
            aria-label="View orders"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-lora-green ring-2 ring-white" />
          </Link>
        ) : (
          <Link
            to="/auth"
            className="rounded-full bg-white px-4 py-2.5 text-xs font-black text-lora-green shadow-sm ring-1 ring-emerald-100"
          >
            Sign in
          </Link>
        )}

        <Link
          to="/products"
          className="hidden h-11 items-center gap-2 rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft sm:inline-flex"
        >
          <ShoppingBag size={17} />
          Shop
        </Link>
      </div>
    </motion.section>
  );
}