import { motion } from "framer-motion";
import { config } from "../config";
import { Section } from "./Section";

export function Lanes() {
  return (
    <Section id="lanes" title="Sprint Roadmap" kicker="Four lanes, no detours">
      <div className="grid md:grid-cols-2 gap-6">
        {config.lanes.map((l, i) => (
          <motion.article
            key={l.tag}
            initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
            className="comic-light bg-ink-2 p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-y-0 left-0 w-2 bg-jam-green group-hover:bg-bolt transition" />
            <div className="absolute -right-6 -top-8 font-display text-[7rem] text-paper/5 leading-none select-none">
              {i + 1}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-bolt">{l.tag}</p>
            <h3 className="font-display text-3xl mt-2 uppercase">{l.title}</h3>
            <p className="mt-3 text-paper/70 text-sm leading-relaxed max-w-md">{l.body}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}
