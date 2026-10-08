import { motion } from "framer-motion";

export default function SectionHeading({ eyebrow, title, action }) {
  return (
    <motion.div
      className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-lora-green">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black text-lora-ink sm:text-4xl">
          {title}
        </h2>
      </div>

      {action}
    </motion.div>
  );
}