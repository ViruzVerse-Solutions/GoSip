"use client";

import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  type ComponentType,
} from "react";
import {
  motion,
  animate,
  useMotionValue,
  useVelocity,
  useTransform,
} from "framer-motion";
import {
  MdFastfood, MdCake, MdLocalDrink, MdOutlineRestaurant,
  MdBakeryDining, MdIcecream, MdBreakfastDining, MdSoupKitchen,
  MdDinnerDining, MdSetMeal, MdKebabDining, MdRamenDining,
  MdOutdoorGrill, MdLocalPizza, MdLocalCafe, MdRestaurantMenu,
  MdLocalBar, MdEco, MdStar, MdLocalOffer, MdTrendingUp,
  MdNewReleases, MdChildCare, MdWaterDrop, MdCoffee,
  MdRiceBowl, MdCookie, MdEmojiFoodBeverage, MdEgg, MdEvent,
  MdLunchDining,
} from "react-icons/md";

// ── Types ──────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  icon_key?: string | null;
}

type IconComponent = ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  all: MdFastfood,
  food: MdLunchDining, starters: MdRestaurantMenu, "main course": MdDinnerDining,
  sides: MdSetMeal, combos: MdLunchDining, thali: MdRiceBowl,
  platters: MdSetMeal, breakfast: MdBreakfastDining, brunch: MdBreakfastDining,
  eggs: MdEgg, pancakes: MdBreakfastDining, toast: MdBakeryDining,
  snacks: MdKebabDining, "quick bites": MdFastfood, fries: MdFastfood,
  burger: MdLunchDining, pizza: MdLocalPizza, sandwich: MdLunchDining,
  wrap: MdKebabDining, tacos: MdKebabDining, hotdog: MdFastfood,
  rice: MdRiceBowl, biryani: MdRiceBowl, noodles: MdRamenDining,
  pasta: MdRamenDining, ramen: MdRamenDining, "fried rice": MdRiceBowl,
  soups: MdSoupKitchen, curries: MdSoupKitchen, stew: MdSoupKitchen, dal: MdSoupKitchen,
  grills: MdOutdoorGrill, bbq: MdOutdoorGrill, kebabs: MdKebabDining,
  tandoor: MdOutdoorGrill, roast: MdOutdoorGrill,
  seafood: MdSetMeal, fish: MdSetMeal, chicken: MdLunchDining, mutton: MdDinnerDining,
  vegetarian: MdEco, vegan: MdEco, salads: MdEco,
  breads: MdBakeryDining, bakery: MdBakeryDining, rotis: MdBakeryDining,
  desserts: MdCake, cakes: MdCake, "ice cream": MdIcecream,
  sweets: MdCookie, pastries: MdCake, waffles: MdBreakfastDining,
  donuts: MdCake, cookies: MdCookie, brownies: MdCake, pudding: MdIcecream,
  coffee: MdCoffee, tea: MdEmojiFoodBeverage, "hot drinks": MdLocalCafe,
  espresso: MdCoffee, cappuccino: MdCoffee, matcha: MdEmojiFoodBeverage,
  drinks: MdLocalDrink, beverages: MdLocalBar, juices: MdLocalDrink,
  smoothies: MdLocalDrink, shakes: MdLocalDrink, mojito: MdLocalBar,
  soda: MdLocalDrink, lassi: MdLocalDrink, water: MdWaterDrop,
  "chef special": MdStar, seasonal: MdEvent, "new arrivals": MdNewReleases,
  bestsellers: MdTrendingUp, offers: MdLocalOffer, "kids menu": MdChildCare,
  omelette: MdEgg, "egg dishes": MdEgg, "bread omelette": MdEgg,
  bread: MdBakeryDining, pav: MdBakeryDining,
  "cold drinks": MdLocalDrink, "cold coffee": MdCoffee,
  "cold beverage": MdLocalDrink, "iced tea": MdEmojiFoodBeverage,
  "iced coffee": MdCoffee, frappe: MdCoffee, milkshake: MdLocalDrink,
  lemonade: MdLocalDrink,
  chaat: MdKebabDining, "pani puri": MdKebabDining,
  "vada pav": MdBakeryDining, samosa: MdKebabDining, rolls: MdKebabDining,
  dosa: MdBreakfastDining, idli: MdBreakfastDining, uttapam: MdBreakfastDining,
  upma: MdBreakfastDining, poha: MdBreakfastDining,
  paratha: MdBakeryDining, puri: MdBakeryDining,
  chole: MdSoupKitchen, rajma: MdSoupKitchen, paneer: MdDinnerDining,
};

const ALL_CHIP: Category = { id: "all", name: "All", icon_key: "all" };
const ICON_CLASS = "w-4 h-4 shrink-0";

// ── Helper: resolve icon from category ─────────────────────────────
function getCategoryIcon(cat: Category): React.ReactNode {
  // 1. Exact icon_key match
  if (cat.icon_key) {
    const Icon = ICON_MAP[cat.icon_key.toLowerCase().trim()];
    if (Icon) return <Icon className={ICON_CLASS} />;
  }
  // 2. Exact name match
  const nameLower = cat.name.toLowerCase().trim();
  const IconByName = ICON_MAP[nameLower];
  if (IconByName) return <IconByName className={ICON_CLASS} />;
  // 3. Fuzzy — any key contained in the name
  for (const key of Object.keys(ICON_MAP)) {
    if (nameLower.includes(key)) {
      const IconFuzzy = ICON_MAP[key];
      return <IconFuzzy className={ICON_CLASS} />;
    }
  }
  const DefaultIcon = MdOutlineRestaurant;
  return <DefaultIcon className={ICON_CLASS} />;
}

// ── Props ───────────────────────────────────────────────────────────
interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: Props) {
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const hasPositioned = useRef(false);

  const chips = [ALL_CHIP, ...categories];
  const activeId = selected ?? "all";
  const chipsKey = chips.map((c) => c.id).join("|");

  // ── Pill position, driven manually (not layoutId) so we have a real
  // x-velocity to derive the rocket flame's stretch/glow/direction from.
  const pillX = useMotionValue(0);
  const pillWidth = useMotionValue(0);
  const pillVelocity = useVelocity(pillX);

  const movePillTo = useCallback(
    (id: string, animated: boolean) => {
      const el = chipRefs.current.get(id);
      if (!el) return;
      const targetX = el.offsetLeft;
      const targetWidth = el.offsetWidth;
      if (animated) {
        animate(pillX, targetX, { type: "spring", stiffness: 380, damping: 30, mass: 0.9 });
        animate(pillWidth, targetWidth, { type: "spring", stiffness: 380, damping: 34 });
      } else {
        pillX.set(targetX);
        pillWidth.set(targetWidth);
      }
    },
    [pillX, pillWidth]
  );

  // Reposition (animated) whenever the active chip or the chip list changes.
  useLayoutEffect(() => {
    movePillTo(activeId, hasPositioned.current);
    hasPositioned.current = true;
  }, [activeId, chipsKey, movePillTo]);

  // Reposition (snap, no animation) on resize.
  useEffect(() => {
    const onResize = () => movePillTo(activeId, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeId, movePillTo]);

  // Rocket flame — stretches back from whichever edge is "leading," and
  // lights up only while the pill is actually travelling between chips.
  const flameOpacity = useTransform(pillVelocity, (v) => {
    const speed = Math.min(Math.abs(v), 1100);
    return Math.max(0.1, (speed / 1100) * 0.95);
  });
  const flameScaleX = useTransform(pillVelocity, (v) => {
    const speed = Math.min(Math.abs(v), 1100);
    return 1 + (speed / 1100) * 2.6;
  });
  const flameOriginX = useTransform(pillVelocity, (v) => (v >= 0 ? 1 : 0));

  // Only show a fade on the side there's actually more to scroll to.
  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateFades();
    window.addEventListener("resize", updateFades);
    return () => window.removeEventListener("resize", updateFades);
  }, [updateFades, chipsKey]);

  // Stable ref callback — avoids re‑registering on every render
  const setRef = useCallback(
    (id: string) => (el: HTMLButtonElement | null) => {
      if (el) chipRefs.current.set(id, el);
      else chipRefs.current.delete(id);
    },
    []
  );

  const handleSelect = (id: string) => {
    const next = id === "all" ? null : id;
    onSelect(next);
    // Scroll into view immediately — no useEffect needed
    chipRefs.current.get(id)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  return (
    <div className="relative sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100">
      {/* Edge fades — only appear on the side that actually still scrolls */}
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-9 bg-gradient-to-r from-white via-white/85 to-transparent z-30 transition-opacity" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-9 bg-gradient-to-l from-white via-white/85 to-transparent z-30 transition-opacity" />
      )}

      <div
        ref={scrollRef}
        onScroll={updateFades}
        role="tablist"
        aria-label="Menu categories"
        className="relative flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 snap-x snap-mandatory"
      >
        {/* Rocket flame trail — behind the pill, only lights up while moving */}
        <motion.span
          aria-hidden
          className="fire-glow pointer-events-none absolute left-0 top-3 h-10 rounded-full blur-md"
          style={{
            x: pillX,
            width: pillWidth,
            opacity: flameOpacity,
            scaleX: flameScaleX,
            originX: flameOriginX,
            zIndex: 0,
          }}
        />

        {/* Solid pill — the "rocket body" */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-0 top-3 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/30"
          style={{ x: pillX, width: pillWidth, zIndex: 1 }}
        />

        {chips.map((cat) => {
          const isActive = cat.id === "all" ? selected === null : cat.id === selected;

          return (
            <motion.button
              suppressHydrationWarning
              key={cat.id}
              ref={setRef(cat.id)}
              role="tab"
              aria-selected={isActive}
              data-category-id={cat.id}
              onClick={() => handleSelect(cat.id)}
              whileTap={{ scale: 0.94 }}
              className={`
                relative z-10 inline-flex items-center gap-1.5 h-10 px-4 rounded-full
                text-[13px] font-semibold whitespace-nowrap flex-shrink-0 snap-center
                outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2
                transition-colors duration-200
                ${isActive
                  ? "text-white"
                  : "text-gray-500 bg-gray-100/80 hover:text-gray-800 hover:bg-gray-200/70"
                }
              `}
            >
              {getCategoryIcon(cat)}
              {cat.name}
            </motion.button>
          );
        })}
      </div>

      <style jsx>{`
        .fire-glow {
          background:
            radial-gradient(circle at 30% 75%, rgba(255, 176, 59, 0.9), transparent 60%),
            radial-gradient(circle at 70% 30%, rgba(255, 87, 34, 0.85), transparent 60%),
            radial-gradient(circle at 50% 95%, rgba(239, 68, 68, 0.85), transparent 55%);
          background-size: 200% 200%;
          animation: fireFlicker 0.5s ease-in-out infinite;
        }

        @keyframes fireFlicker {
          0%, 100% { background-position: 20% 80%, 80% 20%, 50% 100%; }
          50% { background-position: 55% 45%, 45% 55%, 50% 70%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fire-glow {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}