"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, BookmarkX } from "lucide-react";
import { timeAgo } from "@/lib/categories";
import { proxiedImage } from "@/lib/imageProxy";

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
            className="fixed inset-0 z-40 bg-slate/50 backdrop-blur-sm"
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
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-oatmeal dark:bg-slate shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-umber/15 dark:border-white/10 sticky top-0 bg-oatmeal dark:bg-slate">
              <h2 className="font-display italic text-2xl text-slate dark:text-oatmeal">
                Reading list
              </h2>
              <button
                onClick={onClose}
                aria-label="Close reading list"
                className="bg-white/60 dark:bg-white/10 rounded-full p-1.5 hover:bg-white dark:hover:bg-white/20 transition-colors"
              >
                <X size={18} className="text-slate dark:text-oatmeal" />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-umber dark:text-oatmeal/60">
                  Stories you save will show up here. Tap the bookmark icon on
                  any card to keep it for later.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-umber/10 dark:divide-white/10">
                {bookmarks.map((article) => (
                  <li
                    key={article.id}
                    className="p-4 flex gap-3 hover:bg-white/40 dark:hover:bg-white/5 cursor-pointer"
                    onClick={() => onOpenArticle(article)}
                  >
                    <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-umber/10 dark:bg-white/5">
                      {article.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proxiedImage(article.image)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-umber dark:text-oatmeal/50 mb-0.5">
                        {article.source} · {timeAgo(article.publishedAt)}
                      </p>
                      <p className="text-sm font-medium text-slate dark:text-oatmeal leading-snug line-clamp-2">
                        {article.title}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(article);
                      }}
                      aria-label="Remove from reading list"
                      className="shrink-0 self-start text-umber dark:text-oatmeal/50 hover:text-coral transition-colors"
                    >
                      <BookmarkX size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}