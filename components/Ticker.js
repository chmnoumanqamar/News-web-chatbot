"use client";

import { Radio } from "lucide-react";

export default function Ticker({ articles }) {
  if (!articles || articles.length === 0) return null;

  const headlines = articles.slice(0, 8).map((a) => a.title);
  // duplicate the list so the CSS animation loops seamlessly
  const loop = [...headlines, ...headlines];

  return (
    <div className="w-full bg-slate text-oatmeal overflow-hidden select-none shadow-[0_2px_8px_rgba(0,0,0,0.15)] relative z-40">
      <div className="flex items-center">
        <div className="flex items-center gap-2 shrink-0 bg-sea text-slate px-4 py-2 font-body text-xs font-bold uppercase tracking-wider z-10">
          <Radio size={14} className="animate-pulse-dot" />
          Live
        </div>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="flex whitespace-nowrap animate-ticker">
            {loop.map((headline, i) => (
              <span
                key={i}
                className="mx-6 text-sm font-body tracking-wide text-oatmeal/90"
              >
                {headline}
                <span className="ml-6 text-coral">•</span>
              </span>
            ))}
          </div>
          {/* fade edges so headlines don't feel like they're cut off mid-word */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate to-transparent" />
        </div>
      </div>
    </div>
  );
}
