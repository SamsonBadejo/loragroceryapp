import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";

export default function HomeShoppingListCTA() {
  return (
    <section className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-5 lg:px-8">
      <Link
        to="/shopping-list"
        className="group flex items-center gap-4 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-soft-card transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-card sm:gap-5 sm:p-5"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-lora-green sm:h-14 sm:w-14">
          <ClipboardList size={25} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-slate-950 sm:text-lg">
              Got a list? Drop it here
            </span>
            <Sparkles size={15} className="text-lora-green" />
          </span>

          <span className="mt-1 block text-sm leading-5 text-slate-500">
            Paste the list you’d send on WhatsApp. We’ll match items from our
            store and estimate the total.
          </span>
        </span>

        <span className="hidden shrink-0 items-center gap-2 rounded-full bg-lora-green px-4 py-3 text-sm font-black text-white transition group-hover:bg-lora-dark sm:inline-flex">
          Drop your list
          <ArrowRight size={16} />
        </span>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-lora-green sm:hidden">
          <ArrowRight size={18} />
        </span>
      </Link>
    </section>
  );
}