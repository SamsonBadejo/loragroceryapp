import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SectionHeader({
  title,
  subtitle = "",
  to = "/products",
  action = "See all"
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>

      {to && (
        <Link
          to={to}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-3 text-xs font-black text-lora-green transition hover:bg-lora-green hover:text-white"
        >
          {action}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}