import { motion } from "framer-motion";
import { config, linkHref } from "../config";
import { Section } from "./Section";
import { BuyButton } from "./BuyButton";

export function HowToBuy() {
  return (
    <Section id="buy" title="How to buy" kicker="Three strides" tone="light">
      <ol className="grid md:grid-cols-3 gap-6">
        {config.howToBuy.map((s, i) => (
          <motion.li
            key={s.title}
            className="comic bg-paper p-6 relative"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
            transition={{ delay: i * 0.12 }}
          >
            <span className="font-display text-6xl text-jam-green leading-none">{i + 1}</span>
            <h3 className="font-display text-2xl mt-2 uppercase">{s.title}</h3>
            <p className="mt-2 text-ink/75 text-sm leading-relaxed">
              {config.prelaunch.active
                ? [
                    "The network guide is ready. Official launch details will be confirmed before trading opens.",
                    "Follow the official X updates for the launch announcement and verified links.",
                    "Only use the DEX link that appears on this website after launch.",
                  ][i]
                : s.body}
            </p>
            {i < 2 && (
              <span className="hidden md:block absolute -right-5 top-1/2 font-display text-3xl text-ink/30">
                ›
              </span>
            )}
          </motion.li>
        ))}
      </ol>

      <div className="mt-8 flex gap-4 flex-wrap items-center">
        <BuyButton
          className="comic bg-bolt font-black uppercase px-6 py-3 press"
        >
          Buy $BOLT
        </BuyButton>
        <a
          href={linkHref(config.links.dex)}
          target="_blank"
          rel="noreferrer"
          className="comic bg-paper font-black uppercase px-6 py-3 press"
        >
          DEX (after graduation)
        </a>
        <a
          href="https://phantom.app/"
          target="_blank"
          rel="noreferrer"
          className="comic bg-ink text-paper font-black uppercase px-6 py-3 press"
        >
          Get a Solana wallet ↗
        </a>
        <p className="font-mono text-xs text-ink/60 max-w-xs">
          Always double-check the contract address against this site before swapping.
        </p>
      </div>
    </Section>
  );
}
