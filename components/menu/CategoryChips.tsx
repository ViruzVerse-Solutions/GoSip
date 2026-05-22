// components/menu/CategoryChips.tsx
"use client";

import { useRef, useCallback, type ComponentType } from "react";
import { motion } from "framer-motion";
import {

  MdFastfood,
  MdCake,
  MdLocalDrink,
  MdOutlineRestaurant,
  MdBakeryDining,
  MdIcecream,
  MdBreakfastDining,
  MdSoupKitchen,
  MdLunchDining,
  MdSetMeal,
  MdKebabDining,
  MdRamenDining,
  MdOutdoorGrill,
  MdLocalPizza,
  MdLocalCafe,
  MdRestaurantMenu,
  MdLocalBar,
  MdEco,
  MdStar,
  MdLocalOffer,
  MdTrendingUp,
  MdNewReleases,
  MdChildCare,
  MdWaterDrop,
  MdCoffee,
  MdDinnerDining,
  MdRiceBowl,
  MdCookie,
  MdEmojiFoodBeverage,
  MdEgg,
  MdEvent,

} from "react-icons/md";

interface Category {
  id: string;
  name: string;
  icon_key?: string | null;
}


const categoryIconMap: Record<string, React.ReactNode> = {
  all: <MdFastfood className="w-5 h-5" />,
  food: <MdLunchDining className="w-5 h-5" />,
  starters: <MdRestaurantMenu className="w-5 h-5" />,
  "main course": <MdDinnerDining className="w-5 h-5" />,
  sides: <MdSetMeal className="w-5 h-5" />,
  combos: <MdLunchDining className="w-5 h-5" />,
  thali: <MdRiceBowl className="w-5 h-5" />,
  platters: <MdSetMeal className="w-5 h-5" />,
  breakfast: <MdBreakfastDining className="w-5 h-5" />,
  brunch: <MdBreakfastDining className="w-5 h-5" />,
  eggs: <MdEgg className="w-5 h-5" />,
  pancakes: <MdBreakfastDining className="w-5 h-5" />,
  toast: <MdBakeryDining className="w-5 h-5" />,
  snacks: <MdKebabDining className="w-5 h-5" />,
  "quick bites": <MdFastfood className="w-5 h-5" />,
  fries: <MdFastfood className="w-5 h-5" />,
  burger: <MdLunchDining className="w-5 h-5" />,
  pizza: <MdLocalPizza className="w-5 h-5" />,
  sandwich: <MdLunchDining className="w-5 h-5" />,
  wrap: <MdKebabDining className="w-5 h-5" />,
  tacos: <MdKebabDining className="w-5 h-5" />,
  hotdog: <MdFastfood className="w-5 h-5" />,
  rice: <MdRiceBowl className="w-5 h-5" />,
  biryani: <MdRiceBowl className="w-5 h-5" />,
  noodles: <MdRamenDining className="w-5 h-5" />,
  pasta: <MdRamenDining className="w-5 h-5" />,
  ramen: <MdRamenDining className="w-5 h-5" />,
  "fried rice": <MdRiceBowl className="w-5 h-5" />,
  soups: <MdSoupKitchen className="w-5 h-5" />,
  curries: <MdSoupKitchen className="w-5 h-5" />,
  stew: <MdSoupKitchen className="w-5 h-5" />,
  dal: <MdSoupKitchen className="w-5 h-5" />,
  grills: <MdOutdoorGrill className="w-5 h-5" />,
  bbq: <MdOutdoorGrill className="w-5 h-5" />,
  kebabs: <MdKebabDining className="w-5 h-5" />,
  tandoor: <MdOutdoorGrill className="w-5 h-5" />,
  roast: <MdOutdoorGrill className="w-5 h-5" />,
  seafood: <MdSetMeal className="w-5 h-5" />,
  fish: <MdSetMeal className="w-5 h-5" />,
  chicken: <MdLunchDining className="w-5 h-5" />,
  mutton: <MdDinnerDining className="w-5 h-5" />,
  vegetarian: <MdEco className="w-5 h-5" />,
  vegan: <MdEco className="w-5 h-5" />,
  salads: <MdEco className="w-5 h-5" />,
  breads: <MdBakeryDining className="w-5 h-5" />,
  bakery: <MdBakeryDining className="w-5 h-5" />,
  rotis: <MdBakeryDining className="w-5 h-5" />,
  desserts: <MdCake className="w-5 h-5" />,
  cakes: <MdCake className="w-5 h-5" />,
  "ice cream": <MdIcecream className="w-5 h-5" />,
  sweets: <MdCookie className="w-5 h-5" />,
  pastries: <MdCake className="w-5 h-5" />,
  waffles: <MdBreakfastDining className="w-5 h-5" />,
  donuts: <MdCake className="w-5 h-5" />,
  cookies: <MdCookie className="w-5 h-5" />,
  brownies: <MdCake className="w-5 h-5" />,
  pudding: <MdIcecream className="w-5 h-5" />,
  coffee: <MdCoffee className="w-5 h-5" />,
  tea: <MdEmojiFoodBeverage className="w-5 h-5" />,
  "hot drinks": <MdLocalCafe className="w-5 h-5" />,
  espresso: <MdCoffee className="w-5 h-5" />,
  cappuccino: <MdCoffee className="w-5 h-5" />,
  matcha: <MdEmojiFoodBeverage className="w-5 h-5" />,
  drinks: <MdLocalDrink className="w-5 h-5" />,
  beverages: <MdLocalBar className="w-5 h-5" />,
  juices: <MdLocalDrink className="w-5 h-5" />,
  smoothies: <MdLocalDrink className="w-5 h-5" />,
  shakes: <MdLocalDrink className="w-5 h-5" />,
  mojito: <MdLocalBar className="w-5 h-5" />,
  soda: <MdLocalDrink className="w-5 h-5" />,
  lassi: <MdLocalDrink className="w-5 h-5" />,
  water: <MdWaterDrop className="w-5 h-5" />,
  "chef special": <MdStar className="w-5 h-5" />,
  seasonal: <MdEvent className="w-5 h-5" />,
  "new arrivals": <MdNewReleases className="w-5 h-5" />,
  bestsellers: <MdTrendingUp className="w-5 h-5" />,
  offers: <MdLocalOffer className="w-5 h-5" />,
  "kids menu": <MdChildCare className="w-5 h-5" />,
  // ── Eggs & Omelettes ─────────────────────────────────────────────
"omelette":       <MdEgg className="w-5 h-5" />,
"egg dishes":     <MdEgg className="w-5 h-5" />,
"bread omelette": <MdEgg className="w-5 h-5" />,

// ── Breads (extra variants) ──────────────────────────────────────
"bread":          <MdBakeryDining className="w-5 h-5" />,
"pav":            <MdBakeryDining className="w-5 h-5" />,

// ── Cold drinks ──────────────────────────────────────────────────
"cold drinks":    <MdLocalDrink className="w-5 h-5" />,
"cold coffee":    <MdCoffee className="w-5 h-5" />,
"cold beverage":  <MdLocalDrink className="w-5 h-5" />,
"iced tea":       <MdEmojiFoodBeverage className="w-5 h-5" />,
"iced coffee":    <MdCoffee className="w-5 h-5" />,
"frappe":         <MdCoffee className="w-5 h-5" />,
"milkshake":      <MdLocalDrink className="w-5 h-5" />,
"lemonade":       <MdLocalDrink className="w-5 h-5" />,

// ── Street food ──────────────────────────────────────────────────
"chaat":          <MdKebabDining className="w-5 h-5" />,
"pani puri":      <MdKebabDining className="w-5 h-5" />,
"vada pav":       <MdBakeryDining className="w-5 h-5" />,
"samosa":         <MdKebabDining className="w-5 h-5" />,
"rolls":          <MdKebabDining className="w-5 h-5" />,

// ── Indian specials ──────────────────────────────────────────────
"dosa":           <MdBreakfastDining className="w-5 h-5" />,
"idli":           <MdBreakfastDining className="w-5 h-5" />,
"uttapam":        <MdBreakfastDining className="w-5 h-5" />,
"upma":           <MdBreakfastDining className="w-5 h-5" />,
"poha":           <MdBreakfastDining className="w-5 h-5" />,
"paratha":        <MdBakeryDining className="w-5 h-5" />,
"puri":           <MdBakeryDining className="w-5 h-5" />,
"chole":          <MdSoupKitchen className="w-5 h-5" />,
"rajma":          <MdSoupKitchen className="w-5 h-5" />,
"paneer":         <MdDinnerDining className="w-5 h-5" />,
};

const defaultIcon = <MdFastfood className="w-5 h-5" />;

function getCategoryIcon(cat: Category): React.ReactNode {
  // 1. Try exact icon_key match
  if (cat.icon_key) {
    const byKey = categoryIconMap[cat.icon_key.toLowerCase().trim()];
    if (byKey) return byKey;
  }

  // 2. Try exact name match
  const nameLower = cat.name.toLowerCase().trim();
  const byName = categoryIconMap[nameLower];
  if (byName) return byName;

  // 3. Fuzzy: check if any map key is contained in the category name
  for (const key of Object.keys(categoryIconMap)) {
    if (nameLower.includes(key)) return categoryIconMap[key];
  }

  return defaultIcon;
}

interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: Props) {
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());


  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      `[data-category-id="${selected ?? "all"}"]`,
    );
    el?.scrollIntoView({

      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });

  }, [selected]);


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
              key={cat.id}

              data-category-id={cat.id === "all" ? "all" : cat.id}
              onClick={() => onSelect(cat.id === "all" ? null : cat.id)}
              className={`flex flex-col items-center gap-1.5 w-[56px] md:w-[64px] snap-center transition-all duration-300 ${
                active
                  ? "text-primary-600 scale-105"
                  : "text-gray-400 hover:text-primary-500"
              }`}
            >
              <span
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-colors ${
                  active
                    ? "bg-primary-100 text-primary-600 shadow-sm"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {icon}
              </span>
              <span className="text-xs md:text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[56px] md:max-w-[64px]">
                {cat.name}
              </span>
              {active && (
                <motion.div
                  layoutId="categoryIndicator"
                  className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary-500 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}

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
