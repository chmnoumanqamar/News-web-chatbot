"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { timeAgo } from "@/lib/categories";
import { proxiedImage } from "@/lib/imageProxy";
import { getEditorialFallback } from "@/lib/newsImages";

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
  const accentDot = accent.dot;
  const fallbackPhoto = getEditorialFallback(article.title, article.category, index);

  const displayImage = !imgFailed && article.image ? proxiedImage(article.image) : fallbackPhoto;

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
        className={`relative overflow-hidden bg-slate/90 dark:bg-black/40 ${
          featured ? "h-64 md:h-96" : "h-44"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImage}
          alt={article.title || ""}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient shadow for text & bookmark readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Source overlay tag */}
        <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white uppercase tracking-wider">
          <span className={`w-1.5 h-1.5 rounded-full ${accentDot}`} />
          <span className="truncate max-w-[140px]">{article.source}</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(article);
          }}
          aria-label={isBookmarked ? "Remove from reading list" : "Save to reading list"}
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 rounded-full p-2 text-white transition-colors"
        >
          <motion.span
            key={isBookmarked ? "on" : "off"}
            initial={{ scale: 0.6, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            {isBookmarked ? (
              <BookmarkCheck size={16} className="text-emerald-400" />
            ) : (
              <Bookmark size={16} className="text-white" />
            )}
          </motion.span>
        </motion.button>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-umber dark:text-oatmeal/50">
          <span className="text-umber/70 dark:text-oatmeal/50 font-medium">
            {timeAgo(article.publishedAt)}
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