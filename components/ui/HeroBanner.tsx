"use client";

import { useState, useRef, PointerEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdFastfood } from "react-icons/md";
import { PiSealCheckFill } from "react-icons/pi";
import { useBranchData } from "@/lib/context/branch-context";
import { useLanguage } from "@/lib/context/language-context";
import { useRouter } from "next/navigation";
import { Cormorant_Garamond } from "next/font/google";

// ── Luxury font (matches landing page) ─────────────────────────────────
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-cormorant",
});

export default function HeroBanner({ branchId }: { branchId: string }) {
  const { signatures, branch } = useBranchData();
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const dragStartX = useRef(0);
  const dragDelta = useRef(0);
  const isDragging = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!signatures || signatures.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % signatures.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [signatures, isPaused]);

  const goTo = (index: number) => setActiveIndex(index);

  const handlePointerDown = (e: PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    setIsPaused(true);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    dragDelta.current = e.clientX - dragStartX.current;
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsPaused(false);
    const delta = dragDelta.current;

    if (Math.abs(delta) > 30 && signatures && signatures.length > 1) {
      goTo(
        delta > 0
          ? (activeIndex - 1 + signatures.length) % signatures.length
          : (activeIndex + 1) % signatures.length,
      );
    } else {
      const current = signatures?.[activeIndex];
      if (current) router.push(`/${branch.slug}/item/${current.id}`);
    }
  };

  // ── Default banner (no signatures) ─────────────────────────────────
  if (!signatures || signatures.length === 0) {
    return (
      <div
        className={`${cormorant.variable} mx-4 mt-4 mb-6 relative h-52 md:h-64 rounded-3xl overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900 shadow-xl`}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-10">
          <h2
            className="text-4xl md:text-5xl font-semibold text-white mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {t('freshAndFast')}
          </h2>
          <p className="text-white/90 text-sm md:text-base max-w-xs">
            {t('heroBannerDesc')}
          </p>
        </div>
        <div className="absolute right-6 bottom-4 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <MdFastfood className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  const current = signatures[activeIndex];

  return (
    <div
      className={`${cormorant.variable} mx-4 mt-4 mb-6 relative h-56 md:h-68 rounded-3xl overflow-hidden shadow-xl cursor-pointer select-none touch-none`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {current.image_url ? (
            <img
              src={current.image_url}
              alt={current.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-800 to-primary-900" />
          )}
          {/* Strong bottom gradient so text is always readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Signature badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm tracking-wide">
        <PiSealCheckFill className="w-4 h-4 shrink-0" />
        {branch?.name ? `${branch.name} ${t('signature')}` : t('chefsSignature')}
      </div>

      {/* Veg / non‑veg */}
      <div className="absolute top-4 right-4 z-20">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center bg-black/30 backdrop-blur-sm ${
            current.is_veg ? "border-green-400" : "border-red-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              current.is_veg ? "bg-green-400" : "bg-red-400"
            }`}
          />
        </div>
      </div>

      {/* Bottom content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`text-${current.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-0 inset-x-0 z-10 px-5 pb-5 md:px-7 md:pb-6 pointer-events-none"
        >
          <h2
            className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {current.name}
          </h2>
          {current.description && (
            <p className="text-white/70 text-xs md:text-sm mt-0.5 line-clamp-1">
              {current.description}
            </p>
          )}
          <p className="text-white font-bold text-lg mt-2">₹{current.price}</p>
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      {signatures.length > 1 && (
        <div className="absolute bottom-4 right-5 z-20 flex gap-1.5 pointer-events-auto">
          {signatures.map((_, i) => (
            <button
              suppressHydrationWarning
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}