import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock3, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const quickSearches = [
  "Rice",
  "Chicken",
  "Drinks",
  "Snacks",
  "Fruits",
  "Vegetables"
];

export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) return quickSearches;

    return quickSearches.filter((item) => item.toLowerCase().includes(value));
  }, [query]);

  function goToSearch(value = query) {
    const cleanValue = value.trim();

    navigate(
      cleanValue
        ? `/products?q=${encodeURIComponent(cleanValue)}`
        : "/products"
    );
  }

  function submit(event) {
    event.preventDefault();
    goToSearch();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative z-20"
    >
      <form onSubmit={submit} className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search groceries, drinks, snacks..."
          className="h-13 w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-24 text-sm font-bold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-lora-green focus:ring-4 focus:ring-emerald-100 sm:h-14 sm:rounded-[22px]"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-13 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        <button
          type="submit"
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-2xl bg-lora-green text-white transition hover:bg-lora-dark sm:h-10 sm:w-10"
          aria-label="Search products"
        >
          <SlidersHorizontal size={16} />
        </button>
      </form>

      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-[22px] border border-slate-100 bg-white p-2 shadow-card"
          >
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                <Clock3 size={13} />
                Quick search
              </p>

              <button
                type="button"
                onClick={() => setFocused(false)}
                className="text-xs font-black text-lora-green"
              >
                Close
              </button>
            </div>

            <div className="grid gap-1">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => goToSearch(item)}
                  className="flex items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-lora-mist hover:text-lora-green"
                >
                  <span>{item}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}