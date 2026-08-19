"use client";

import { RefreshCw } from "lucide-react";

export default function LiveStatusBar({ title, lastUpdated, status, onRefresh }) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
      <h1 className="flex items-center gap-3 font-display font-bold text-2xl md:text-3xl text-slate-900 dark:text-white tracking-tight">
        <span className="w-1.5 h-7 md:h-8 rounded-full bg-gradient-to-b from-rose-500 via-indigo-500 to-cyan-400" aria-hidden />
        {title}
      </h1>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <RefreshCw
          size={14}
          className={status === "refreshing" ? "animate-spin text-indigo-500" : ""}
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

