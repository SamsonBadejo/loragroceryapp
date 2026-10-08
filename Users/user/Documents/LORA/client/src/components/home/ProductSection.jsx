import { motion } from "framer-motion";
import HomeProductCard from "./HomeProductCard";
import SectionHeader from "./SectionHeader";

function ProductSkeletonGrid({ horizontal = false }) {
  if (horizontal) {
    return (
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-[210px] w-[136px] shrink-0 animate-pulse rounded-[18px] bg-white sm:h-[250px] sm:w-[170px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[210px] animate-pulse rounded-[18px] bg-white sm:h-[250px]"
        />
      ))}
    </div>
  );
}

function EmptyProducts({ title = "No products found" }) {
  return (
    <div className="rounded-[20px] bg-white p-6 text-center shadow-[0_8px_22px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">
        Add products from your admin inventory and they will appear here.
      </p>
    </div>
  );
}

export default function ProductSection({
  title,
  products = [],
  loading = false,
  horizontal = false,
}) {
  return (
    <section className="min-w-0">
      <SectionHeader title={title} />

      {loading ? (
        <ProductSkeletonGrid horizontal={horizontal} />
      ) : products.length ? (
        horizontal ? (
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {products.slice(0, 12).map((product) => (
              <HomeProductCard
                key={product._id || product.slug}
                product={product}
                horizontal
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 lg:gap-4">
            {products.slice(0, 10).map((product, index) => (
              <motion.div
                key={product._id || product.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025, duration: 0.25 }}
              >
                <HomeProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <EmptyProducts />
      )}
    </section>
  );
}