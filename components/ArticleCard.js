"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { timeAgo } from "@/lib/categories";
import { proxiedImage } from "@/lib/imageProxy";

// Tailwind's JIT scanner only picks up class names it can see as literal
// strings, so dynamic template strings like `bg-${accent}` get purged from
// the production build. Keep the full class names spelled out here instead.
const ACCENTS = [
  { bg: "bg-coral", dot: "bg-coral" },
  { bg: "bg-sea", dot: "bg-sea" },
  { bg: "bg-chartreuse", dot: "bg-chartreuse" },
];

export default function ArticleCard({
  article,
  index = 0,
  featured = false,
  onOpen,
  isBookmarked,
  onToggleBookmark,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const accent = ACCENTS[index % ACCENTS.length];
  const accentBg = accent.bg;
  const accentDot = accent.dot;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col rounded-2xl overflow-hidden border border-umber/10 dark:border-white/10 bg-white/50 dark:bg-white/[0.04] cursor-pointer shadow-sm hover:shadow-lg dark:hover:shadow-black/40 transition-shadow ${
        featured ? "md:col-span-2 md:row-span-2" : ""
      }`}
      onClick={() => onOpen(article)}
    >
      <div
        className={`relative overflow-hidden bg-umber/10 dark:bg-white/5 ${
          featured ? "h-64 md:h-96" : "h-40"
        }`}
      >
        {article.image && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedImage(article.image)}
            alt=""
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`relative w-full h-full flex items-center justify-center overflow-hidden ${accentBg}`}
          >
            <span
              aria-hidden
              className="absolute -right-4 -bottom-6 font-display italic font-bold text-slate/10 text-[5rem] leading-none select-none"
            >
              {article.source?.charAt(0) || "P"}
            </span>
            <span className="relative font-display italic text-slate/60 text-lg px-6 text-center text-balance">
              {article.source}
            </span>
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(article);
          }}
          aria-label={isBookmarked ? "Remove from reading list" : "Save to reading list"}
          className="absolute top-3 right-3 bg-oatmeal/90 dark:bg-slate/90 backdrop-blur rounded-full p-2 hover:bg-oatmeal dark:hover:bg-slate transition-colors"
        >
          <motion.span
            key={isBookmarked ? "on" : "off"}
            initial={{ scale: 0.6, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            {isBookmarked ? (
              <BookmarkCheck size={16} className="text-slate dark:text-oatmeal" />
            ) : (
              <Bookmark size={16} className="text-slate dark:text-oatmeal" />
            )}
          </motion.span>
        </motion.button>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-umber dark:text-oatmeal/50">
          <span
            className={`w-1.5 h-1.5 rounded-full ${accentDot}`}
            aria-hidden
          />
          {article.source}
          <span className="text-umber/50 dark:text-oatmeal/30 font-normal normal-case">
            · {timeAgo(article.publishedAt)}
          </span>
        </div>
        <h3
          className={`font-display font-semibold text-slate dark:text-oatmeal leading-snug text-balance ${
            featured ? "text-2xl md:text-3xl" : "text-base"
          }`}
        >
          {article.title}
        </h3>
        {featured && article.description && (
          <p className="text-sm text-umber dark:text-oatmeal/60 leading-relaxed line-clamp-2">
            {article.description}
          </p>
        )}
      </div>
    </motion.article>
  );
}