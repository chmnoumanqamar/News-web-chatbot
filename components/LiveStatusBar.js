"use client";

import { RefreshCw } from "lucide-react";

export default function LiveStatusBar({ title, lastUpdated, status, onRefresh }) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-umber/15 dark:border-white/10">
      <h1 className="flex items-center gap-3 font-display font-semibold text-2xl md:text-3xl text-slate dark:text-oatmeal">
        <span className="w-1 h-7 md:h-8 rounded-full bg-gradient-to-b from-coral via-sea to-chartreuse" aria-hidden />
        {title}
      </h1>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 text-xs font-medium text-umber dark:text-oatmeal/60 hover:text-slate dark:hover:text-oatmeal transition-colors"
      >
        <RefreshCw
          size={14}
          className={status === "refreshing" ? "animate-spin" : ""}
        />
        {lastUpdated
          ? `Updated ${lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Refresh"}
      </button>
    </div>
  );
}
