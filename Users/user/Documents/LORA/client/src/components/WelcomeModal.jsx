import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bike,
  LayoutDashboard,
  ShoppingBag,
  Truck,
  UserRound,
  X
} from "lucide-react";

const roleContent = {
  customer: {
    label: "Customer",
    title: "Welcome to Lo'ra",
    description:
      "Fresh groceries, secure checkout, and live delivery tracking from store to doorstep.",
    icon: ShoppingBag,
    primaryText: "Start shopping",
    primaryTo: "/products",
    secondaryText: "View orders",
    secondaryTo: "/orders"
  },
  admin: {
    label: "Admin",
    title: "Welcome back",
    description:
      "Monitor orders, manage products, and keep Lo'ra operations moving smoothly.",
    icon: LayoutDashboard,
    primaryText: "Open dashboard",
    primaryTo: "/admin",
    secondaryText: "View orders",
    secondaryTo: "/admin"
  },
  rider: {
    label: "Rider",
    title: "Ready for deliveries",
    description:
      "Go online, accept paid orders, and keep customers updated with live GPS tracking.",
    icon: Truck,
    primaryText: "Open dashboard",
    primaryTo: "/rider",
    secondaryText: "View routes",
    secondaryTo: "/rider"
  },
  deliveryBoy: {
    label: "Delivery Boy",
    title: "Local delivery ready",
    description:
      "Go online to receive nearby paid orders within your local delivery radius.",
    icon: Bike,
    primaryText: "Open dashboard",
    primaryTo: "/rider",
    secondaryText: "Nearby jobs",
    secondaryTo: "/rider"
  }
};

function getFirstName(name) {
  return String(name || "there").split(" ")[0];
}

export default function WelcomeModal({ user, open, onClose }) {
  const [progress, setProgress] = useState(100);

  const content = useMemo(() => {
    return roleContent[user?.role] || roleContent.customer;
  }, [user?.role]);

  const Icon = content.icon;
  const firstName = getFirstName(user?.name);

  useEffect(() => {
    if (!open) return undefined;

    setProgress(100);

    const duration = 3600;
    const startedAt = Date.now();

    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(next);
    }, 60);

    const closeTimer = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(closeTimer);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-slate-100 bg-white p-6 text-center shadow-card sm:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close welcome"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.25 }}
              className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-lora-green text-white shadow-green-soft"
            >
              <Icon size={34} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-lora-green"
            >
              <UserRound size={14} />
              {content.label}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-4 text-3xl font-black tracking-tight text-slate-950"
            >
              {content.title}, {firstName}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-500"
            >
              {content.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="mt-7 grid gap-3 sm:grid-cols-2"
            >
              <Link
                to={content.primaryTo}
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-full bg-lora-green px-5 text-sm font-black text-white shadow-green-soft transition hover:bg-lora-dark"
              >
                {content.primaryText}
              </Link>

              <Link
                to={content.secondaryTo}
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-50 px-5 text-sm font-black text-slate-700 transition hover:bg-emerald-50 hover:text-lora-green"
              >
                {content.secondaryText}
              </Link>
            </motion.div>

            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-lora-green"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}