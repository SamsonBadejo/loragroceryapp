import { useEffect } from "react";
import { motion } from "framer-motion";

export default function SplashLoader({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1700);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const floatingItems = ["Avocado", "Berry", "Greens", "Citrus", "Milk"];

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-lora-green"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
    >
      {floatingItems.map((item, index) => (
        <motion.span
          key={item}
          className="absolute rounded-full bg-white/20 px-4 py-2 text-sm font-black text-white backdrop-blur-xl"
          initial={{ opacity: 0, y: 30, scale: 0.6 }}
          animate={{
            opacity: [0, 0.85, 0],
            y: [-10, -95],
            scale: [0.7, 1.1],
            x: Math.sin(index) * 110
          }}
          transition={{
            duration: 2.1,
            delay: index * 0.18,
            repeat: Infinity
          }}
          style={{
            left: `${16 + index * 17}%`,
            bottom: `${18 + (index % 2) * 18}%`
          }}
        >
          {item}
        </motion.span>
      ))}

      <div className="relative grid place-items-center">
        <div className="absolute h-56 w-56 rounded-full bg-white/20 blur-3xl" />

        <motion.div
          className="relative grid h-32 w-32 place-items-center rounded-[32px] bg-white text-5xl font-black text-lora-green shadow-glow"
          initial={{ scale: 0.88, rotate: -6 }}
          animate={{
            scale: [0.88, 1, 0.96],
            rotate: [0, 2, 0]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity
          }}
        >
          L
        </motion.div>

        <motion.p
          className="mt-8 text-sm font-bold uppercase tracking-[0.28em] text-white/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Lo'ra is preparing freshness
        </motion.p>
      </div>
    </motion.div>
  );
}