"use client";

import { X } from "lucide-react";
import { proxiedImage } from "@/lib/imageProxy";

// Mirrors the latest chatbot answer (from ChatWidget) into the main page,
// so the user can see the AI's answer + related articles/videos inline,
// not just inside the chat bubble.
export default function AIResultsPanel({ result, onClose }) {
  if (!result || result.isGreeting) return null;

  return (
    <div className="mb-8 rounded-2xl border border-umber/15 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm overflow-hidden">
      <div className="bg-slate dark:bg-black/20 text-oatmeal px-4 py-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-display italic text-lg leading-none">AI Answer</p>
          <p className="text-[11px] text-oatmeal/60 mt-1">For: "{result.query}"</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI results"
          className="text-oatmeal/70 hover:text-oatmeal transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-slate dark:text-oatmeal leading-relaxed">{result.answer}</p>

        {result.articles?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-umber dark:text-oatmeal/50 uppercase tracking-wide mb-2">
              Related articles
            </p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
              {result.articles.slice(0, 10).map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-32"
                >
                  <div className="w-32 h-20 rounded-lg overflow-hidden bg-umber/10 dark:bg-white/5">
                    {a.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxiedImage(a.image)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-umber dark:text-oatmeal/50 leading-tight mt-1 line-clamp-2">
                    {a.title}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {result.videos?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-umber dark:text-oatmeal/50 uppercase tracking-wide mb-2">
              Related videos
            </p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
              {result.videos.slice(0, 10).map((v) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-36"
                >
                  <div className="w-36 h-20 rounded-lg overflow-hidden bg-umber/10 dark:bg-white/5 relative">
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-slate/20">
                      <span className="w-6 h-6 rounded-full bg-coral/90 flex items-center justify-center text-[10px] text-slate">
                        ▶
                      </span>
                    </span>
                  </div>
                  <p className="text-[11px] text-umber dark:text-oatmeal/50 leading-tight mt-1 line-clamp-2">
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
