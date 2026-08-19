"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, BookmarkX } from "lucide-react";
import { timeAgo } from "@/lib/categories";
import { proxiedImage } from "@/lib/imageProxy";
import { getEditorialFallback } from "@/lib/newsImages";

export default function BookmarksDrawer({
  isOpen,
  onClose,
  bookmarks,
  onToggleBookmark,
  onOpenArticle,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-white dark:bg-[#0B0F17] shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-white/10"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md z-10">
              <h2 className="font-display italic font-semibold text-2xl text-slate-900 dark:text-white">
                Reading list
              </h2>
              <button
                onClick={onClose}
                aria-label="Close reading list"
                className="bg-slate-100 dark:bg-white/10 rounded-full p-1.5 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              >
                <X size={18} className="text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Stories you save will show up here. Tap the bookmark icon on
                  any card to keep it for later.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                {bookmarks.map((article, idx) => {
                  const fallback = getEditorialFallback(article.title, article.category, idx);
                  const displayImg = article.image ? proxiedImage(article.image) : fallback;

                  return (
                    <li
                      key={article.id}
                      className="p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onClick={() => onOpenArticle(article)}
                    >
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-black/30 border border-slate-200/60 dark:border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayImg}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                          {article.source} · {timeAgo(article.publishedAt)}
                        </p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                          {article.title}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(article);
                        }}
                        aria-label="Remove from reading list"
                        className="shrink-0 self-start text-slate-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <BookmarkX size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}