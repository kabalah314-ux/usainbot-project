import { motion } from "framer-motion";
import { config, explorerAddr, isPlaceholder } from "../config";
import { Section } from "./Section";

export function Tokenomics() {
  const cards = config.prelaunch.active
    ? [
        { label: "Launch status", value: "Not live yet", hint: "Official details will appear on X" },
        { label: "Contract", value: "Pending", hint: "No official CA has been published" },
        { label: "Supply", value: "To verify", hint: "Confirm on-chain after launch" },
        { label: "Liquidity", value: "To verify", hint: "Use only official links" },
      ]
    : config.tokenomics.cards;
  const distribution = config.prelaunch.active
    ? [{ label: "Launch data pending", pct: 100, color: "#009b3a" }]
    : config.tokenomics.distribution;
  let cursor = 0;
  const donutStops = distribution.map((d) => {
    const start = cursor;
    cursor += d.pct;
    return d.color + " " + start + "% " + cursor + "%";
  });
  const donutGradient = "conic-gradient(" + donutStops.join(", ") + ")";

  return (
    <Section id="tokenomics" title="Tokenomics" kicker="Nothing hidden under the mat">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -6 }}
            className="comic-light flex flex-col bg-ink-2 p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-paper/50">{c.label}</p>
            <p className="mt-1 font-display text-3xl leading-tight text-bolt">{c.value}</p>
            {"hint" in c && c.hint && <p className="mt-2 text-xs text-paper/60">{c.hint}</p>}
            {"linkKey" in c && c.linkKey && (
              <a
                className="mt-auto inline-block pt-3 text-[11px] text-paper/70 underline hover:text-bolt"
                target="_blank"
                rel="noreferrer"
                href={isPlaceholder(config.token[c.linkKey]) ? "#" : explorerAddr(config.token[c.linkKey])}
              >
                Verify on Solscan ↗
              </a>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.85fr_1.5fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -18 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto w-full max-w-[290px]"
        >
          <div
            className="relative aspect-square rounded-full p-5 shadow-[10px_10px_0_#0b0b12]"
            style={{ background: donutGradient }}
            aria-label={config.prelaunch.active ? "Launch data pending" : "100% Public Bonding Curve and Liquidity"}
          >
            <div className="grid h-full w-full place-items-center rounded-full border-[3px] border-ink bg-ink text-center">
              <div>
                <p className="font-display text-5xl leading-none text-bolt">{config.prelaunch.active ? "SOON" : "100%"}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60">
                  {config.prelaunch.active ? "launch data pending" : "public launch"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jam-green">
                  {config.prelaunch.active ? "verify before launch" : "no hidden slice"}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-center font-display text-2xl uppercase text-paper">
            {config.prelaunch.active ? "The track is being prepared" : "Supply goes to the track"}
          </p>
        </motion.div>

        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {distribution.map((d) => (
              <div key={d.label} className="comic-light bg-jam-green p-5 text-ink">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 border-2 border-ink" style={{ background: d.color }} />
                  <p className="font-mono text-xs font-bold uppercase tracking-widest">Distribution</p>
                </div>
                <p className="mt-3 font-display text-3xl">{d.pct}% public</p>
                <p className="mt-1 text-sm font-bold opacity-75">{d.label}</p>
              </div>
            ))}
          </div>

          <div className="comic-light mt-4 bg-bolt p-5 text-ink">
            <p className="font-display text-2xl uppercase">Chain details</p>
            <dl className="mt-3 space-y-1 text-sm font-mono">
              <div className="flex justify-between gap-3">
                <dt>Chain</dt>
                <dd className="text-right font-bold">{config.chain.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Cluster</dt>
                <dd className="font-bold">{config.chain.cluster}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Symbol</dt>
                <dd className="font-bold">{config.chain.symbol}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Network fee</dt>
                <dd className="font-bold">1% · no extra tax</dd>
              </div>
              <div className="break-all border-t-2 border-ink/20 pt-2">
                <dt className="opacity-60">RPC</dt>
                <dd className="font-bold">{config.chain.rpc}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Section>
  );
}
