"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import ArticleCard from "./ArticleCard";
import SkeletonCard from "./SkeletonCard";

export default function ArticleGrid({
  articles,
  status,
  error,
  onOpen,
  isBookmarked,
  onToggleBookmark,
  onRetry,
  hasMore,
  onLoadMore,
}) {
  // Infinite scroll: once the sentinel div near the bottom enters the
  // viewport, pull the next page automatically — the "unlimited, like TV"
  // feed the user asked for, instead of stopping after one batch.
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!onLoadMore || status === "loading" || status === "error") return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore, status, articles.length]);

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SkeletonCard featured />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center py-24 border border-dashed border-umber/30 dark:border-white/20 rounded-2xl">
        <p className="font-display italic text-xl text-slate dark:text-oatmeal mb-2">
          The feed dropped.
        </p>
        <p className="text-sm text-umber dark:text-oatmeal/60 mb-5">{error}</p>
        <button
          onClick={onRetry}
          className="bg-slate dark:bg-oatmeal text-oatmeal dark:text-slate px-5 py-2 rounded-full text-sm font-medium hover:bg-umber dark:hover:bg-oatmeal/80 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-24 border border-dashed border-umber/30 dark:border-white/20 rounded-2xl">
        <p className="font-display italic text-xl text-slate dark:text-oatmeal mb-2">
          Nothing here yet.
        </p>
        <p className="text-sm text-umber dark:text-oatmeal/60">
          Search works best with a few plain keywords — try{" "}
          <span className="text-slate dark:text-oatmeal font-medium">"Pakistan floods"</span>{" "}
          instead of a full sentence, or pick a category above.
        </p>
      </div>
    );
  }

  const [first, ...rest] = articles;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          <ArticleCard
            key={first.id}
            article={first}
            index={0}
            featured
            onOpen={onOpen}
            isBookmarked={isBookmarked(first.id)}
            onToggleBookmark={onToggleBookmark}
          />
          {rest.map((article, i) => (
            <ArticleCard
              key={article.id}
              article={article}
              index={i + 1}
              onOpen={onOpen}
              isBookmarked={isBookmarked(article.id)}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Invisible trigger for infinite scroll, sitting just above the very bottom */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />

      {status === "loadingMore" && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-umber dark:text-oatmeal/60">
            <span className="w-4 h-4 border-2 border-umber/30 dark:border-oatmeal/30 border-t-umber dark:border-t-oatmeal rounded-full animate-spin" />
            More stories loading…
          </div>
        </div>
      )}

      {!hasMore && status !== "loadingMore" && articles.length > 0 && (
        <p className="text-center text-xs text-umber/50 dark:text-oatmeal/30 py-8">
          You're all caught up for now.
        </p>
      )}
    </>
  );
}
