"use client";

import { X, Tv } from "lucide-react";

// Mirrors the latest chatbot answer (from ChatWidget) into the main page,
// displaying the AI's mature summary + verified TV news channel broadcasts.
export default function AIResultsPanel({ result, onClose }) {
  if (!result || result.isGreeting) return null;

  return (
    <div className="mb-8 rounded-2xl border border-umber/15 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm overflow-hidden animate-fadeIn">
      <div className="bg-slate dark:bg-black/20 text-oatmeal px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tv size={18} className="text-sea" />
          <div>
            <p className="font-display italic text-lg leading-none">Live News Intelligence</p>
            <p className="text-[11px] text-oatmeal/60 mt-0.5">Topic: "{result.query}"</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI results"
          className="text-oatmeal/70 hover:text-oatmeal transition-colors p-1"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-sm sm:text-base text-slate dark:text-oatmeal leading-relaxed">
          {result.answer}
        </p>

        {result.videos?.length > 0 && (
          <div className="pt-2 border-t border-umber/10 dark:border-white/10">
            <p className="text-xs font-semibold text-umber dark:text-oatmeal/60 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Live & Recent TV News Broadcasts
            </p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {result.videos.slice(0, 10).map((v) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-44 sm:w-48 group"
                >
                  <div className="w-44 sm:w-48 h-28 rounded-xl overflow-hidden bg-umber/10 dark:bg-white/5 relative border border-umber/10 dark:border-white/10">
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs shadow-md group-hover:scale-110 transition-transform">
                        ▶
                      </span>
                    </span>
                    {v.channel && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/85 text-white text-[10px] px-2 py-0.5 rounded-md font-medium tracking-wide truncate max-w-[90%] shadow-sm">
                        {v.channel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-umber dark:text-oatmeal/70 leading-snug mt-1.5 line-clamp-2 group-hover:text-slate dark:group-hover:text-oatmeal transition-colors">
                    {v.title}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
