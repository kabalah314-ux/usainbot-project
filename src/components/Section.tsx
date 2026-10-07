import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Section({
  id,
  title,
  kicker,
  children,
  tone = "dark",
  className = "",
}: {
  id: string;
  title?: string;
  kicker?: string;
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  const light = tone === "light";
  return (
    <section
      id={id}
      className={`snap-section safe-x py-16 md:py-24 relative ${
        light ? "bg-paper text-ink" : "bg-ink text-paper"
      } ${className}`}
    >
      {title && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          {kicker && (
            <p
              className={`font-mono text-xs uppercase tracking-[0.35em] mb-2 ${
                light ? "text-jam-green" : "text-bolt"
              }`}
            >
              {kicker}
            </p>
          )}
          <h2
            className={`font-display text-4xl md:text-6xl tracking-wide uppercase inline-block ${
              light ? "title-shadow-paper" : ""
            }`}
          >
            {title}
          </h2>
          <div
            className={`h-[6px] w-28 mt-3 ${light ? "bg-ink" : "bg-bolt"}`}
            style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 0% 100%)" }}
          />
        </motion.div>
      )}
      {children}
    </section>
  );
}
