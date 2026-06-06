"use client";

import { useRef, useCallback, type ComponentType } from "react";
import { motion } from "framer-motion";
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

  const chips = [ALL_CHIP, ...categories];

  return (
    <div className="relative">
      {/* Right fade — signals horizontal scroll without a scrollbar */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10" />

      <div
        role="tablist"
        aria-label="Menu categories"
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 snap-x snap-mandatory"
      >
        {chips.map((cat) => {
          const isActive = cat.id === "all" ? selected === null : cat.id === selected;

          return (
            <button
              suppressHydrationWarning
              key={cat.id}
              ref={setRef(cat.id)}
              role="tab"
              aria-selected={isActive}
              data-category-id={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={`
                inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border-[1.5px]
                text-[13px] font-semibold whitespace-nowrap flex-shrink-0 snap-center
                outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1
                transition-colors duration-150 active:scale-95 relative
                ${isActive
                  ? "border-primary-200 text-primary-700 bg-primary-50"
                  : "border-gray-200 text-gray-500 bg-white hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              {isActive && (
                <motion.span
                  layoutId="chip-bg"
                  className="absolute inset-0 rounded-full bg-primary-50 border border-primary-200"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  style={{ zIndex: -1 }}
                />
              )}
              {getCategoryIcon(cat)}
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}