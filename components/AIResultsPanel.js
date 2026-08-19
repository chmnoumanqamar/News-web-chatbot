"use client";

import { X, Tv } from "lucide-react";

// Mirrors the latest chatbot answer (from ChatWidget) into the main page,
// displaying the AI's mature summary + verified TV news channel broadcasts.
export default function AIResultsPanel({ result, onClose }) {
  if (!result || result.isGreeting) return null;

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#111827] shadow-md dark:shadow-[0_8px_30px_rgb(0,0,0,0.35)] overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#0F172A] dark:to-[#1E293B] text-white px-5 py-3.5 flex items-center justify-between gap-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <Tv size={16} className="text-cyan-400" />
          </div>
          <div>
            <p className="font-display italic text-lg leading-none font-medium">Live News Intelligence</p>
            <p className="text-[11px] text-slate-300/75 mt-0.5">Topic: "{result.query}"</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI results"
          className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-normal">
          {result.answer}
        </p>

        {result.videos?.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Live & Verified TV Broadcast Reports
            </p>
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {result.videos.slice(0, 10).map((v) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-44 sm:w-48 group"
                >
                  <div className="w-44 sm:w-48 h-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.04] relative border border-slate-200/80 dark:border-white/10 shadow-sm group-hover:shadow-md transition-all">
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
                      <span className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow-md group-hover:scale-110 transition-transform">
                        ▶
                      </span>
                    </span>
                    {v.channel && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/85 text-white text-[10px] px-2 py-0.5 rounded-md font-medium tracking-wide truncate max-w-[90%] shadow-sm">
                        {v.channel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug mt-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-medium">
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

