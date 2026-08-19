"use client";

import { Radio } from "lucide-react";

export default function Ticker({ articles }) {
  if (!articles || articles.length === 0) return null;

  const headlines = articles.slice(0, 8).map((a) => a.title);
  // duplicate the list so the CSS animation loops seamlessly
  const loop = [...headlines, ...headlines];

  return (
    <div className="w-full bg-[#0B0F17] dark:bg-[#070A0F] text-slate-100 overflow-hidden select-none border-b border-white/[0.08] shadow-sm relative z-40">
      <div className="flex items-center">
        <div className="flex items-center gap-2 shrink-0 bg-rose-600 text-white px-4 py-2 font-body text-xs font-bold uppercase tracking-wider z-10 shadow-sm">
          <Radio size={14} className="animate-pulse-dot" />
          Live
        </div>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="flex whitespace-nowrap animate-ticker">
            {loop.map((headline, i) => (
              <span
                key={i}
                className="mx-6 text-sm font-body tracking-wide text-slate-200"
              >
                {headline}
                <span className="ml-6 text-rose-500 font-bold">•</span>
              </span>
            ))}
          </div>
          {/* fade edges so headlines don't feel like they're cut off mid-word */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0B0F17] dark:from-[#070A0F] to-transparent" />
        </div>
      </div>
    </div>
  );
}

