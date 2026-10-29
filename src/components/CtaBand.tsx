import { motion } from "framer-motion";
import { config, linkHref } from "../config";
import { BuyButton } from "./BuyButton";

export function CtaBand() {
  const body = config.prelaunch.active
    ? config.prelaunch.ctaBody
    : "The fastest memecoin on Solana. No extra tax: only the 1% Jupiter trading fee. LP locked forever.";
  const [lead = "", ...tail] = body.split("Follow X");

  return (
    <section className="snap-section relative bg-jam-green text-ink overflow-hidden border-y-[5px] border-ink">
      <div className="absolute inset-0 halftone-ink opacity-40" />
      <div className="safe-x py-14 md:py-20 relative flex flex-col md:flex-row items-center gap-6 md:gap-4">
        <div className="flex-1">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-4xl md:text-7xl xl:text-8xl uppercase leading-[0.9] title-shadow text-paper"
          >
            On your marks.
            <br />
            Get set. <span className="text-bolt">{config.prelaunch.active ? "Watch." : "Buy."}</span>
          </motion.h2>
          <p className="mt-5 max-w-md text-ink/80 font-bold">
            {lead}
            {tail.length > 0 && (
              <a
                href={linkHref(config.links.x)}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 font-black hover:text-ink"
              >
                Follow X ↗
              </a>
            )}
            {tail.join("Follow X")}
          </p>
          <div className="mt-7 flex flex-wrap gap-4">
            <BuyButton
              className="comic bg-bolt font-black uppercase px-7 py-3 press"
            >
              {config.prelaunch.active ? "Launch status" : "Buy $BOLT"}
            </BuyButton>
            <a
              href={linkHref(config.links.telegram)}
              target="_blank"
              rel="noreferrer"
              className="comic bg-paper font-black uppercase px-7 py-3 press"
            >
              Join Telegram
            </a>
          </div>
        </div>
        <div className="h-80 md:h-[460px] xl:h-[560px] shrink-0 self-end opacity-95 drop-shadow-[8px_10px_0_rgba(11,11,18,.35)]">
          <picture>
            <source srcSet="/usain-elegant.webp" type="image/webp" />
            <img
              src="/usain-elegant.png"
              alt="Usain Bot"
              className="block h-full w-auto object-contain"
            />
          </picture>
        </div>
      </div>
    </section>
  );
}
