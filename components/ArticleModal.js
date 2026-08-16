"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { timeAgo } from "@/lib/categories";
import { proxiedImage } from "@/lib/imageProxy";

export default function ArticleModal({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark,
}) {
  return (
    <AnimatePresence>
      {article && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate/60 backdrop-blur-sm p-0 md:p-6"
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
            className="relative bg-oatmeal dark:bg-slate w-full md:max-w-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl"
          >
            {article.image && (
              <div className="h-56 md:h-72 bg-umber/10 dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxiedImage(article.image)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-umber dark:text-oatmeal/50">
                  {article.source} · {timeAgo(article.publishedAt)}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 bg-white/60 dark:bg-white/10 rounded-full p-1.5 hover:bg-white dark:hover:bg-white/20 transition-colors"
                >
                  <X size={18} className="text-slate dark:text-oatmeal" />
                </button>
              </div>

              <h2 className="font-display font-semibold text-2xl md:text-3xl text-slate dark:text-oatmeal leading-snug mb-4 text-balance">
                {article.title}
              </h2>

              {article.author && (
                <p className="text-xs text-umber dark:text-oatmeal/50 mb-4">By {article.author}</p>
              )}

              <p className="text-base text-slate/90 dark:text-oatmeal/80 leading-relaxed mb-6">
                {article.description || "No summary available for this story."}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-slate dark:bg-oatmeal text-oatmeal dark:text-slate px-5 py-2.5 rounded-full text-sm font-medium hover:bg-umber dark:hover:bg-oatmeal/80 transition-colors"
                >
                  Read full story
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => onToggleBookmark(article)}
                  className="inline-flex items-center gap-2 border border-umber/30 dark:border-white/20 text-slate dark:text-oatmeal px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                >
                  {isBookmarked ? (
                    <>
                      <BookmarkCheck size={16} /> Saved
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