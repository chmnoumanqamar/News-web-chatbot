"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { timeAgo } from "@/lib/categories";
import { proxiedImage } from "@/lib/imageProxy";
import { getEditorialFallback } from "@/lib/newsImages";

export default function ArticleModal({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark,
}) {
  const fallbackPhoto = article ? getEditorialFallback(article.title, article.category) : null;
  const displayImage = article?.image ? proxiedImage(article.image) : fallbackPhoto;

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 w-full md:max-w-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl shadow-2xl"
          >
            <div className="h-56 md:h-72 bg-slate-900 dark:bg-black/40 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImage}
                alt={article.title || ""}
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackPhoto) {
                    e.currentTarget.src = fallbackPhoto;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {article.source} · {timeAgo(article.publishedAt)}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 bg-slate-100 dark:bg-white/10 rounded-full p-1.5 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                >
                  <X size={18} className="text-slate-700 dark:text-slate-200" />
                </button>
              </div>

              <h2 className="font-display font-bold text-2xl md:text-3xl text-slate-900 dark:text-white leading-snug mb-4 text-balance">
                {article.title}
              </h2>

              {article.author && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">By {article.author}</p>
              )}

              <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
                {article.description || "No summary available for this story."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition-colors"
                >
                  Read full story
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => onToggleBookmark(article)}
                  className="inline-flex items-center gap-2 border border-slate-200 dark:border-white/20 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                >
                  {isBookmarked ? (
                    <>
                      <BookmarkCheck size={16} className="text-emerald-500" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark size={16} /> Save for later
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}