import { motion } from "framer-motion";
import { Section } from "./Section";
import { DevCredit } from "./DevCredit";

export function OriginNews() {
  return (
    <Section
      id="origin"
      title="The Origin Story"
      kicker="August 2026 · The Headline That Changed Everything"
      tone="light"
    >
      <div className="grid lg:grid-cols-12 gap-8 items-center">
        {/* News comic split-screen image */}
        <motion.div
          className="lg:col-span-7 relative group"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="comic bg-ink p-2 sm:p-3 relative overflow-hidden">
            {/* Top Newspaper Tag */}
            <div className="flex items-center justify-between pb-2 px-1 border-b-2 border-paper/20 text-xs font-mono text-paper/70 uppercase">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-flame animate-flicker" />
                WORLD ROBOT GAMES · SPECIAL REPORT
              </span>
              <span className="text-bolt font-bold">HISTORIC RECORD</span>
            </div>

            <div
              role="img"
              aria-label="Human champion at 9.58 seconds versus Usain Bot at 9.39 seconds"
              className="relative mt-2 overflow-hidden border-2 border-paper/30 aspect-[16/9] flex bg-ink"
            >
              <div
                className="relative w-1/2 overflow-hidden bg-cover bg-left"
                style={{
                  backgroundImage: "url('/origin-news-comic.jpg')",
                  backgroundSize: "200% 100%",
                }}
              />
              <div className="relative w-1/2 overflow-hidden bg-cover bg-center">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('/stadium-bg.jpg')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-ink/30" />
                <div className="absolute top-3 right-3 z-10 text-right">
                  <p className="font-display text-jam-green text-lg sm:text-2xl leading-none drop-shadow-[2px_2px_0_#121212]">
                    ROBOT CHAMPION
                  </p>
                  <p className="font-mono text-paper text-[10px] sm:text-xs tracking-[0.2em] font-black">
                    USAIN BOT
                  </p>
                </div>
                <div className="absolute bottom-3 right-3 z-10 bg-jam-green text-ink font-black px-3 py-1 text-sm -rotate-2">
                  9.39s · RECORD
                </div>
                <div className="absolute inset-x-4 bottom-0 h-[78%] z-[1] flex items-end justify-center">
                  <picture>
                    <source srcSet="/usain-bot-home.webp" type="image/webp" />
                    <img
                      src="/usain-bot-home.png"
                      alt="Usain Bot corriendo"
                      className="block h-full w-auto max-w-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
                    />
                  </picture>
                </div>
              </div>
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 z-20 flex items-center">
                <span className="text-bolt text-4xl sm:text-6xl drop-shadow-[3px_3px_0_#121212]">⚡</span>
              </div>
              <div className="absolute bottom-3 left-3 z-10 bg-ink/90 text-paper font-black px-3 py-1 text-sm rotate-2">
                9.58s · HUMAN RECORD
              </div>
            </div>

            <p className="mt-2 text-center text-xs font-mono text-paper/60">
              Figure 1.0: Human record 9.58s versus Usain Bot&apos;s 9.39s challenge.
            </p>
          </div>
        </motion.div>

        {/* Narrative & Verification Links */}
        <motion.div
          className="lg:col-span-5 flex flex-col justify-center"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-block self-start bg-flame text-paper font-display px-3 py-1 text-sm uppercase tracking-wider -rotate-1">
            HUMANITY VS MACHINE
          </div>

          <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl uppercase leading-[0.95] mt-3 text-ink">
            A Robot Beat Usain Bolt&apos;s 9.58s Record.
          </h3>

          <div className="mt-4 space-y-3 text-ink/80 text-sm sm:text-base leading-relaxed">
            <p>
              In 2009, Usain Bolt set the ultimate human limit: <b>9.58 seconds</b> in Berlin.
              For 17 years, everyone thought that crown was untouchable.
            </p>
            <p className="border-l-4 border-bolt pl-3 py-1 bg-bolt/15 font-semibold text-ink">
              Until August 2026: During the World Humanoid Games, bipedal runner robots smashed the clock at <b>9.39 seconds</b>. The robot era arrived.
            </p>
            <p>
              We couldn't let clunky silicon take all the glory. We fused Olympic champion DNA with cutting-edge cybernetic robotics. 
              <b> Usain Bot ($BOLT)</b> was born to take back the track on Solana.
            </p>
          </div>

          {/* Press verification button */}
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <a
              href="https://www.youtube.com/results?search_query=humanoid+robot+breaks+usain+bolt+100m+record+9.39s"
              target="_blank"
              rel="noreferrer"
              className="comic bg-ink text-paper font-black px-5 py-3 uppercase text-xs sm:text-sm press flex items-center gap-2 hover:text-bolt transition"
            >
              <span>Watch News Footage ↗</span>
            </a>
          </div>

          <DevCredit variant="origin" className="mt-6 self-start" />
        </motion.div>
      </div>
    </Section>
  );
}
