import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

type HeroPostcardMotionProps = {
  className?: string;
};

export default function HeroPostcardMotion({ className = "" }: HeroPostcardMotionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={`w-full max-w-[320px] sm:max-w-[340px] aspect-[3/4] relative mx-auto ${className}`.trim()}>
      <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_left,rgba(201,154,62,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,75,64,0.14),transparent_34%)] opacity-90 blur-[1px]" aria-hidden="true" />

      <button
        type="button"
        aria-label="Postkarte umdrehen"
        onMouseEnter={() => setIsFlipped(true)}
        onMouseLeave={() => setIsFlipped(false)}
        onFocus={() => setIsFlipped(true)}
        onBlur={() => setIsFlipped(false)}
        onClick={() => setIsFlipped((value) => !value)}
        className="relative h-full w-full touch-manipulation overflow-hidden rounded-[32px] focus:outline-none"
      >
        <div className="absolute inset-0 rounded-[32px] border border-[#D9E4DD] bg-white/80 p-4 shadow-[0_22px_70px_rgba(14,75,64,0.14)] backdrop-blur-md sm:p-6 overflow-hidden">
          <motion.div
            style={{ transformStyle: "preserve-3d" }}
            className="w-full h-full relative"
            animate={prefersReducedMotion ? { rotateY: 0 } : { rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-0 w-full h-full rounded-2xl bg-white p-6 shadow-md flex flex-col justify-between"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#C99A3E]">Family Post</p>
                <p className="w-full whitespace-normal hyphens-none text-xl font-black leading-tight text-[#0E4B40] sm:text-2xl">
                  Erinnerungen, die im Briefkasten ankommen.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9E4DD] bg-[#F7F3EA]/90 px-3 py-2 text-xs leading-snug font-medium text-[#4A635C] shadow-sm">
                Eine Postkarte für Oma, die man drehen, fühlen und behalten will.
              </div>
            </div>

            <div
              className="absolute inset-0 w-full h-full rounded-2xl bg-white p-6 shadow-md flex flex-col justify-between"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#C99A3E]">Rückseite</p>
                <p className="w-full whitespace-normal hyphens-none text-xl font-black leading-tight text-[#0E4B40] sm:text-2xl">
                  Handgeschrieben, gedreht, geblieben.
                </p>
              </div>

              <div className="rounded-2xl border border-[#D9E4DD] bg-[#E4F1E9]/80 px-3 py-2 text-xs leading-snug font-medium text-[#4A635C] shadow-sm">
                Jede Karte hat vorne eine Geschichte und hinten eine kleine Überraschung.
              </div>
            </div>
          </motion.div>
        </div>
      </button>
    </div>
  );
}