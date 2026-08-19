"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search, X } from "lucide-react";

export default function Dropdown({
  icon: TriggerIcon,
  value,
  items = [],
  onSelect,
  align = "right",
  label,
  searchable = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const activeItemRef = useRef(null);

  const showSearch = searchable && items.length > 8;

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

  // Reset search and scroll into view when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      const timer = setTimeout(() => {
        if (activeItemRef.current) {
          activeItemRef.current.scrollIntoView({ block: "nearest" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const filteredItems = query.trim()
    ? items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const activeItem = items.find((i) => i.value === value);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={`flex shrink-0 items-center gap-1.5 bg-slate-50 dark:bg-white/[0.06] border rounded-full pl-3.5 pr-2.5 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 transition-all ${
          open
            ? "border-indigo-500 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20"
            : "border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/25"
        }`}
      >
        {TriggerIcon && (
          <TriggerIcon
            size={14}
            className="text-slate-400 dark:text-slate-500 shrink-0"
          />
        )}
        <span className="max-w-[6.5rem] sm:max-w-none truncate font-medium">
          {activeItem?.label ?? "Select"}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-indigo-500 dark:text-indigo-400" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-50 mt-2 w-60 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] origin-top flex flex-col overflow-hidden ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {showSearch && (
              <div className="p-2 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-xl text-xs">
                  <Search size={13} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search country..."
                    className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-xs"
                    autoFocus
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <ul
              ref={listRef}
              role="listbox"
              className="py-1.5 max-h-72 sm:max-h-80 overflow-y-auto overscroll-contain focus:outline-none"
            >
              {filteredItems.length === 0 ? (
                <li className="px-4 py-3 text-xs text-center text-slate-400 dark:text-slate-500">
                  No matching options
                </li>
              ) : (
                filteredItems.map((item) => {
                  const isActive = item.value === value;
                  const ItemIcon = item.icon;
                  return (
                    <li
                      key={item.value}
                      ref={isActive ? activeItemRef : null}
                    >
                      {item.divider && (
                        <div className="my-1.5 mx-3 border-t border-slate-100 dark:border-white/10" />
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onSelect(item.value);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left transition-colors ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {ItemIcon && (
                            <ItemIcon
                              size={14}
                              className="text-slate-400 dark:text-slate-500 shrink-0"
                            />
                          )}
                          <span className="truncate">{item.label}</span>
                          {item.meta && (
                            <span className="text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              {item.meta}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <Check
                            size={14}
                            className="text-indigo-600 dark:text-indigo-400 shrink-0"
                          />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

