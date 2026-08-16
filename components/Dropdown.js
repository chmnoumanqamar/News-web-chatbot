"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

/**
 * Custom animated dropdown. Replaces native <select> so we can actually
 * style and animate the open panel — a browser's native option list can't
 * be themed or given motion.
 *
 * items: [{ value, label, icon?: Component, meta?: string, divider?: true }]
 * `divider: true` on an item draws a separator line above it (used to set
 * "Reading list" apart from the real categories).
 */
export default function Dropdown({
  icon: TriggerIcon,
  value,
  items,
  onSelect,
  align = "right",
  label,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const activeItem = items.find((i) => i.value === value);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={`flex shrink-0 items-center gap-1.5 bg-white dark:bg-white/5 border rounded-full pl-3.5 pr-2.5 py-2 text-sm font-medium text-slate dark:text-oatmeal transition-all ${
          open
            ? "border-slate dark:border-oatmeal/40 shadow-md"
            : "border-umber/20 dark:border-white/10 shadow-sm hover:border-umber/40 dark:hover:border-white/25"
        }`}
      >
        {TriggerIcon && <TriggerIcon size={14} className="text-umber dark:text-oatmeal/50 shrink-0" />}
        <span className="max-w-[6.5rem] sm:max-w-none truncate">
          {activeItem?.label ?? "Select"}
        </span>
        <ChevronDown
          size={14}
          className={`text-umber dark:text-oatmeal/50 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-50 mt-2 w-52 py-1.5 bg-white dark:bg-[#332f47] rounded-2xl border border-umber/15 dark:border-white/10 shadow-xl dark:shadow-black/40 origin-top overflow-hidden ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {items.map((item) => {
              const isActive = item.value === value;
              const ItemIcon = item.icon;
              return (
                <li key={item.value}>
                  {item.divider && (
                    <div className="my-1.5 mx-3 border-t border-umber/10 dark:border-white/10" />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSelect(item.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                      isActive
                        ? "bg-sea/15 dark:bg-sea/10 text-slate dark:text-oatmeal font-semibold"
                        : "text-slate/80 dark:text-oatmeal/75 hover:bg-oatmeal dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {ItemIcon && <ItemIcon size={14} className="text-umber dark:text-oatmeal/50 shrink-0" />}
                      {item.label}
                      {item.meta && (
                        <span className="text-coral text-xs font-bold">{item.meta}</span>
                      )}
                    </span>
                    {isActive && <Check size={14} className="text-sea shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
