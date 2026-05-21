"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MdFastfood, // default
  MdCake, // Desserts, Cakes, Sweets, Pastries
  MdLocalDrink, // Drinks, Beverages, Coffee, Tea
  MdOutlineRestaurant, // Food, Meals, Main Course, Starters
  MdBakeryDining, // Bakery, Bread
  MdIcecream, // Ice Cream, Frozen
  MdBreakfastDining, // Breakfast
  MdSoupKitchen, // Soups
  MdLunchDining, // Lunch, Combos
  MdSetMeal, // Thali, Platters
  MdKebabDining, // Snacks, Quick Bites
  MdRamenDining, // Noodles, Pasta
  MdOutdoorGrill, // Grills, BBQ
  MdLocalPizza, // Pizza
} from "react-icons/md";

interface Category {
  id: string;
  name: string;
}

// Map common category names (lowercase) to an icon
const categoryIconMap: Record<string, React.ReactNode> = {
  all: <MdFastfood className="w-5 h-5" />,
  desserts: <MdCake className="w-5 h-5" />,
  cakes: <MdCake className="w-5 h-5" />,
  sweets: <MdCake className="w-5 h-5" />,
  pastries: <MdCake className="w-5 h-5" />,
  drinks: <MdLocalDrink className="w-5 h-5" />,
  beverages: <MdLocalDrink className="w-5 h-5" />,
  coffee: <MdLocalDrink className="w-5 h-5" />,
  tea: <MdLocalDrink className="w-5 h-5" />,
  soda: <MdLocalDrink className="w-5 h-5" />,
  food: <MdOutlineRestaurant className="w-5 h-5" />,
  meals: <MdOutlineRestaurant className="w-5 h-5" />,
  "main course": <MdOutlineRestaurant className="w-5 h-5" />,
  starters: <MdOutlineRestaurant className="w-5 h-5" />,
  bakery: <MdBakeryDining className="w-5 h-5" />,
  bread: <MdBakeryDining className="w-5 h-5" />,
  "ice cream": <MdIcecream className="w-5 h-5" />,
  scoops: <MdIcecream className="w-5 h-5" />,
  breakfast: <MdBreakfastDining className="w-5 h-5" />,
  soups: <MdSoupKitchen className="w-5 h-5" />,
  lunch: <MdLunchDining className="w-5 h-5" />,
  combos: <MdLunchDining className="w-5 h-5" />,
  thali: <MdSetMeal className="w-5 h-5" />,
  platters: <MdSetMeal className="w-5 h-5" />,
  snacks: <MdKebabDining className="w-5 h-5" />,
  "quick bites": <MdKebabDining className="w-5 h-5" />,
  noodles: <MdRamenDining className="w-5 h-5" />,
  pasta: <MdRamenDining className="w-5 h-5" />,
  grills: <MdOutdoorGrill className="w-5 h-5" />,
  bbq: <MdOutdoorGrill className="w-5 h-5" />,
  pizza: <MdLocalPizza className="w-5 h-5" />,
};

const defaultIcon = <MdFastfood className="w-5 h-5" />;

function getCategoryIcon(name: string): React.ReactNode {
  const key = name.toLowerCase().trim();
  return categoryIconMap[key] || defaultIcon;
}

export default function CategoryChips({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const allChips = [{ id: "all", name: "All" }, ...categories];

  return (
    <div className="relative mx-4 my-2">
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar py-3 px-2 snap-x snap-mandatory"
      >
        {allChips.map((cat) => {
          const active =
            (cat.id === "all" && selected === null) || cat.id === selected;
          const icon = getCategoryIcon(cat.name);
          return (
            <button
              key={cat.id}
              data-category-id={cat.id === "all" ? "all" : cat.id}
              onClick={() => onSelect(cat.id === "all" ? null : cat.id)}
              className={`flex flex-col items-center gap-1.5 min-w-[56px] md:min-w-[64px] snap-center transition-all duration-300 ${
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
              <span className="text-xs md:text-sm font-semibold whitespace-nowrap">
                {cat.name}
              </span>
              {active && (
                <motion.div
                  layoutId="categoryIndicator"
                  className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary-500 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
