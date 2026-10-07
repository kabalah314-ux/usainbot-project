import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { config } from "../config";
import { Section } from "./Section";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const entries = config.prelaunch.active ? config.prelaunch.faq : config.faq;

  return (
    <Section id="faq" title="FAQ" kicker="Read before the gun" tone="light">
      <div className="max-w-3xl">
        {entries.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-b-[3px] border-ink/80">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-4 text-left py-5 group"
                aria-expanded={isOpen}
              >
                <span className="font-display text-2xl text-jam-green w-8 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-xl md:text-2xl uppercase flex-1 group-hover:text-jam-green transition">
                  {f.q}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  className="font-display text-3xl leading-none shrink-0"
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 pl-12 pr-2 text-ink/75 leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
