"use client";

import { useEffect, useState } from "react";
import { Search, X, Globe2, Bookmark, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRIES } from "@/lib/countries";
import { useTheme } from "@/lib/useTheme";
import Dropdown from "@/components/Dropdown";

export default function Header({
  activeCategory,
  onCategoryChange,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  bookmarkCount,
  onOpenBookmarks,
  country,
  onCountryChange,
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { theme, toggleTheme, mounted } = useTheme();
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex items-center justify-between py-3.5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSearchChange("");
              onSearchSubmit("");
              onCategoryChange("general");
            }}
            className="group flex flex-col"
          >
            <span className="flex items-baseline gap-1 font-display italic font-bold text-3xl md:text-[2.15rem] leading-none tracking-tight text-slate-900 dark:text-white">
              Pulse
              <span className="text-rose-500 text-2xl leading-none not-italic transition-transform group-hover:scale-125">
                .
              </span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-h-[16px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" aria-hidden />
              {currentDate}
            </span>
          </a>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit(searchValue);
              }}
              className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-2 shadow-sm focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
            >
              <Search size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search keywords, e.g. Pakistan floods"
                className="bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-36 md:w-52"
              />
              {searchValue && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    onSearchChange("");
                    onSearchSubmit("");
                  }}
                  className="hover:opacity-75 transition-opacity"
                >
                  <X size={14} className="text-slate-400 dark:text-slate-400" />
                </button>
              )}
            </form>

            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="sm:hidden flex items-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            >
              {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            <motion.button
              type="button"
              onClick={toggleTheme}
              whileTap={{ scale: 0.85, rotate: 15 }}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="shrink-0 flex items-center justify-center w-[38px] h-[38px] bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-full shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {!mounted ? (
                  <motion.span key="placeholder" className="w-[17px] h-[17px]" />
                ) : theme === "dark" ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <Sun size={17} className="text-amber-400" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <Moon size={16} className="text-slate-700" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <Dropdown
              value={!searchValue ? activeCategory : ""}
              label="Select news category"
              onSelect={(val) => {
                if (val === "__bookmarks__") {
                  onOpenBookmarks();
                  return;
                }
                onSearchChange("");
                onSearchSubmit("");
                onCategoryChange(val);
              }}
              items={[
                ...CATEGORIES.map((cat) => ({ value: cat.id, label: cat.label })),
                {
                  value: "__bookmarks__",
                  label: "Reading list",
                  icon: Bookmark,
                  meta: bookmarkCount > 0 ? String(bookmarkCount) : undefined,
                  divider: true,
                },
              ]}
            />

            <Dropdown
              value={country}
              icon={Globe2}
              label="Select country for news"
              onSelect={onCountryChange}
              items={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            />
          </div>
        </div>

        {/* Mobile search row */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit(searchValue);
                setMobileSearchOpen(false);
              }}
              className="sm:hidden flex items-center gap-2 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-2 overflow-hidden"
            >
              <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search keywords, e.g. Pakistan floods"
                className="bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 flex-1 min-w-0"
              />
              {searchValue && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    onSearchChange("");
                    onSearchSubmit("");
                  }}
                >
                  <X size={14} className="text-slate-400 dark:text-slate-500" />
                </button>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Refined gradient underline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-rose-500 via-indigo-500 to-cyan-400 opacity-80" />
    </header>
  );
}

