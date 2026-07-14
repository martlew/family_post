import { motion } from "framer-motion";

type FloatingPostcardsProps = {
  className?: string;
};

const cards = [
  { left: "6%", top: "18%", duration: 26, delay: 0 },
  { left: "18%", top: "74%", duration: 30, delay: 1.8 },
  { left: "34%", top: "14%", duration: 24, delay: 0.8 },
  { left: "52%", top: "78%", duration: 29, delay: 2.4 },
  { left: "68%", top: "22%", duration: 27, delay: 1.1 },
  { left: "84%", top: "66%", duration: 25, delay: 1.6 },
];

export default function FloatingPostcards({ className = "" }: FloatingPostcardsProps) {
  return (
    <div className={`pointer-events-none fixed inset-0 z-20 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute -left-16 top-12 h-[30rem] w-[30rem] rounded-full bg-emerald-500/12 blur-3xl opacity-60" />
      <div className="absolute -right-16 bottom-10 h-[28rem] w-[28rem] rounded-full bg-amber-300/20 blur-3xl opacity-55" />
      <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-400/10 blur-3xl opacity-50" />
      {cards.map((card, index) => (
        <motion.div
          key={`${card.left}-${card.top}`}
          className="absolute h-12 w-18 rounded-[14px] border border-emerald-300/90 bg-white/98 shadow-[0_18px_44px_rgba(15,118,110,0.28)] backdrop-blur-sm"
          style={{ left: card.left, top: card.top }}
          animate={{
            y: [0, -24, 0],
            x: [0, index % 2 === 0 ? 18 : -18, 0],
            rotate: [-10, 6, -10],
            opacity: [0.72, 1, 0.72],
            scale: [0.98, 1.06, 0.98],
          }}
          transition={{
            duration: card.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: card.delay,
          }}
        >
          <div className="absolute inset-0 rounded-[14px] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.92))]" />
          <div className="absolute left-2 top-2 h-4 w-5 rounded-sm border border-emerald-200/90 bg-emerald-50 shadow-sm" />
          <div className="absolute right-2 top-2 h-2.5 w-7 rounded-full bg-amber-200/90" />
          <div className="absolute left-2.5 bottom-3 h-[2px] w-8 rounded bg-teal-500/80" />
          <div className="absolute right-2.5 bottom-3 h-[2px] w-6 rounded bg-emerald-300/85" />
          <div className="absolute inset-x-2 bottom-2.5 h-px rounded-full bg-slate-200/90" />
        </motion.div>
      ))}
    </div>
  );
}