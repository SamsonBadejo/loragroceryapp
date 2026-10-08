import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../../store/cartStore";

export default function HomeCartSummary() {
  const items = useCartStore((state) => state.items);

  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <Link
        to="/checkout"
        className="flex items-center justify-between rounded-[20px] bg-slate-950 p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
      >
        <div>
          <p className="text-sm font-black">
            Your cart{" "}
            <span className="text-white/50">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </p>

          <p className="mt-1 text-xs font-bold text-white/60">
            Continue to checkout
          </p>
        </div>

        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lora-green">
          <ShoppingBag size={19} />
        </span>
      </Link>
    </motion.div>
  );
}