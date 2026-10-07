import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  className?: string;
  running?: boolean;
  delay?: number;
  construction?: boolean;
};

const HUD_MESSAGES = [
  { text: "SPEED: 9.39s", sub: "HUMAN RECORD DEFEATED", color: "#00ffcc" },
  { text: "MODE: F..K HUMANS", sub: "ROBOT EMPIRE INITIALIZED", color: "#ff4d2d" },
  { text: "OVERDRIVE 100%", sub: "TARGET: SLOW TRADERS", color: "#fed100" },
];

export function UsainBot({ className = "", running = true, delay = 0, construction = false }: Props) {
  const [expressionIndex, setExpressionIndex] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setExpressionIndex((prev) => (prev + 1) % HUD_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [running]);

  const currentHud = HUD_MESSAGES[expressionIndex];

  return (
    <div
      className={`relative select-none aspect-[483/493] w-full max-w-[520px] ${className}`}
      style={{ isolation: "isolate" }}
    >
      {/* ---------------- WHOLE BODY RUNNING OSCILLATION ---------------- */}
      <motion.div
        className="relative w-full h-full"
        animate={
          running
            ? {
                y: [0, -14, 0, -8, 0],
                x: [0, 4, 0, -2, 0],
                rotate: [0, -2.5, 0, 1.5, 0],
              }
            : {}
        }
        transition={
          running
            ? {
                duration: 0.55,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              }
            : {}
        }
      >
        {/* LAYER 1: BACK ARM (left arm with watch) */}
        <motion.div
          className="absolute origin-[85%_35%]"
          style={{ left: "6%", top: "11%", width: "47%", height: "34%" }}
          animate={
            running
              ? {
                  rotate: [18, -20, 18],
                  x: [-3, 4, -3],
                }
              : {}
          }
          transition={
            running
              ? {
                  duration: 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }
              : {}
          }
        >
          <img
            src="/rig-arm-back.png"
            alt="Back arm"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
          {/* Hologram watch glow */}
          <motion.div
            className="absolute -top-2 left-6 w-8 h-8 rounded-full bg-cyan-400/40 blur-md pointer-events-none"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </motion.div>

        {/* LAYER 2: BACK LEG (left trailing leg) */}
        <motion.div
          className="absolute origin-[85%_20%]"
          style={{ left: "0%", top: "49%", width: "49%", height: "33%" }}
          animate={
            running
              ? {
                  rotate: [16, -18, 16],
                  y: [2, -6, 2],
                }
              : {}
          }
          transition={
            running
              ? {
                  duration: 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }
              : {}
          }
        >
          <img
            src="/rig-leg-back.png"
            alt="Back leg"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
          {/* Dust and speed spark from back foot */}
          {running && (
            <motion.div
              className="absolute bottom-2 left-4 w-12 h-6 bg-paper/20 rounded-full blur-sm"
              animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 0.28, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* LAYER 3: TORSO */}
        <motion.div
          className="absolute"
          style={{ left: "20%", top: "17%", width: "56%", height: "56%" }}
          animate={
            running
              ? {
                  y: [0, -3, 0, -2, 0],
                  rotate: [0, -1, 0, 1, 0],
                }
              : {}
          }
          transition={
            running
              ? {
                  duration: 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }
              : {}
          }
        >
          <img
            src="/rig-torso.png"
            alt="Torso"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
          {/* Chest HUD pulse */}
          <motion.div
            className="absolute top-[28%] left-[45%] w-12 h-14 bg-cyan-400/30 rounded-lg blur-md"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </motion.div>

        {/* LAYER 4: FRONT LEG (right forward leg) */}
        <motion.div
          className="absolute origin-[20%_15%]"
          style={{ left: "46%", top: "45%", width: "54%", height: "55%" }}
          animate={
            running
              ? {
                  rotate: [-18, 14, -18],
                  y: [-6, 4, -6],
                  scale: [1, 1.03, 1],
                }
              : {}
          }
          transition={
            running
              ? {
                  duration: 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }
              : {}
          }
        >
          <img
            src="/rig-leg-front.svg"
            alt="Front leg"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
          {/* Glowing neon green sneaker sole energy */}
          <motion.div
            className="absolute bottom-4 left-1/3 w-16 h-8 bg-emerald-400/50 rounded-full blur-md"
            animate={{ opacity: [0.4, 0.95, 0.4], scale: [0.9, 1.2, 0.9] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
        </motion.div>

        {/* LAYER 5: FRONT ARM (right arm with fist forward) */}
        <motion.div
          className="absolute origin-[15%_20%]"
          style={{ left: "61%", top: "23%", width: "39%", height: "31%" }}
          animate={
            running
              ? {
                  rotate: [-22, 16, -22],
                  x: [4, -5, 4],
                }
              : {}
          }
          transition={
            running
              ? {
                  duration: 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }
              : {}
          }
        >
          <img
            src="/rig-arm-front.png"
            alt="Front arm"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </motion.div>

        {/* LAYER 6: HEAD & CYBERNETIC VISOR */}
        <motion.div
          className="absolute origin-[20%_90%]"
          style={{ left: "48%", top: "0%", width: "42%", height: "41%" }}
          animate={
            running
              ? {
                  rotate: [-2, 3, -2],
                  y: [0, -4, 0],
                }
              : {}
          }
          transition={
            running
              ? {
                  duration: 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay,
                }
              : {}
          }
        >
          <img
            src="/rig-head.png"
            alt="Usain Bot Head"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* DYNAMIC HOLOGRAPHIC VISOR OVERLAY */}
          <div
            className="absolute top-[28%] left-[22%] w-[68%] h-[38%] pointer-events-none overflow-hidden rounded-sm"
            style={{
              boxShadow: `0 0 12px ${currentHud.color}66`,
              border: `1px solid ${currentHud.color}88`,
            }}
          >
            {/* Scan line effect */}
            <motion.div
              className="w-full h-[2px] opacity-80"
              style={{ background: currentHud.color }}
              animate={{ y: ["0%", "300%"] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />

            {/* Live Changing HUD text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={expressionIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex flex-col justify-center items-center p-0.5"
                style={{
                  background: `${currentHud.color}15`,
                  textShadow: `0 0 6px ${currentHud.color}`,
                }}
              >
                <span
                  className="font-mono font-black text-[9px] sm:text-[10px] tracking-tighter leading-tight"
                  style={{ color: currentHud.color }}
                >
                  {currentHud.text}
                </span>
                <span className="font-mono text-[6px] tracking-widest uppercase opacity-80 text-white">
                  {currentHud.sub}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* FACIAL EXPRESSION OVERDRIVE LIGHTNING SPARK */}
          {expressionIndex === 2 && (
            <motion.div
              className="absolute -top-3 -right-2 w-12 h-12 pointer-events-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [1, 0, 1], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.2, repeat: Infinity }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full text-yellow-300">
                <path d="M20 0 L25 15 L38 18 L27 26 L30 40 L18 30 L6 36 L12 24 L2 16 L15 14 Z" fill="currentColor" />
              </svg>
            </motion.div>
          )}

          {/* WINK/SMIRK BADGE POP */}
          {expressionIndex === 1 && (
            <motion.div
              className="absolute -top-4 -left-6 bg-red-600 text-white font-display text-xs uppercase px-2 py-0.5 rotate-[-12deg] border border-black shadow-[2px_2px_0_#000]"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              exit={{ scale: 0 }}
            >
              ROBOT POWER!
            </motion.div>
          )}
        </motion.div>

        {/* DYNAMIC ELECTRIC SPEED LINES BEHIND HIM */}
        {running && (
          <div className="absolute -inset-4 pointer-events-none -z-10 overflow-hidden">
            {[0, 1, 2].map((k) => (
              <motion.div
                key={k}
                className="absolute h-[2px] bg-bolt rounded-full blur-[0.5px]"
                style={{
                  top: `${30 + k * 24}%`,
                  left: "-15%",
                  width: "45%",
                }}
                animate={{
                  x: ["0%", "240%"],
                  opacity: [0, 0.9, 0],
                }}
                transition={{
                  duration: 0.35,
                  repeat: Infinity,
                  delay: k * 0.12,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {construction && (
        <>
          <div className="pointer-events-none absolute left-[40%] top-[3%] z-30 h-5 w-[18%] rounded-t-full border-2 border-ink bg-bolt shadow-[2px_2px_0_#0b0b12]" />
          <div className="pointer-events-none absolute left-[36%] top-[8%] z-30 h-2 w-[26%] rounded-full border-2 border-ink bg-bolt" />
          <div className="absolute bottom-[5%] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap border-2 border-ink bg-bolt px-2 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-ink shadow-[2px_2px_0_#0b0b12]">
            BUILD MODE
          </div>
        </>
      )}
    </div>
  );
}
