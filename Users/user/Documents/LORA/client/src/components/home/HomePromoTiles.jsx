import { motion } from "framer-motion";
import {
  BadgePercent,
  Clock3,
  Leaf,
  ShieldCheck,
  Truck,
  WalletCards
} from "lucide-react";
import { Link } from "react-router-dom";

const tiles = [
  {
    title: "Today’s offers",
    subtitle: "Fresh deals on grocery essentials",
    to: "/products?sort=deals",
    icon: BadgePercent,
    className: "bg-[#fff7ed] text-[#9a3412]",
    iconClass: "bg-white text-[#ea580c]"
  },
  {
    title: "Fresh produce",
    subtitle: "Fruits, vegetables and daily food items",
    to: "/products?category=fruits",
    icon: Leaf,
    className: "bg-emerald-50 text-lora-dark",
    iconClass: "bg-white text-lora-green"
  },
  {
    title: "Fast dispatch",
    subtitle: "Rider and local delivery options",
    to: "/products",
    icon: Truck,
    className: "bg-slate-950 text-white",
    iconClass: "bg-white/12 text-white"
  }
];

const trustItems = [
  {
    label: "Paystack checkout",
    icon: WalletCards
  },
  {
    label: "Live tracking",
    icon: Clock3
  },
  {
    label: "Secure orders",
    icon: ShieldCheck
  }
];

export default function HomePromoTiles() {
  return (
    <section className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;

          return (
            <motion.div
              key={tile.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
            >
              <Link
                to={tile.to}
                className={`group block min-h-[104px] rounded-[20px] p-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-soft-card sm:min-h-[132px] sm:rounded-[24px] sm:p-4 ${tile.className}`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-2xl shadow-sm sm:h-11 sm:w-11 ${tile.iconClass}`}
                >
                  <Icon size={18} />
                </span>

                <p className="mt-3 line-clamp-1 text-xs font-black leading-tight sm:text-base">
                  {tile.title}
                </p>

                <p className="mt-1 hidden text-xs font-bold leading-5 opacity-70 sm:line-clamp-2">
                  {tile.subtitle}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-[22px] bg-white p-2 shadow-[0_8px_22px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 sm:grid sm:grid-cols-3 sm:gap-3 sm:p-3">
        {trustItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex min-w-[150px] items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3 sm:min-w-0"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lora-green">
                <Icon size={17} />
              </span>

              <p className="text-xs font-black text-slate-700 sm:text-sm">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}