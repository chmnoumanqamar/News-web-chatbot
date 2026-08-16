"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 90 * 1000; // keeps the feed "live" — prepends fresh articles without hammering the free API quota
const MAX_ARTICLES = 200; // upper bound so the feed can't grow forever and slow the page down

function dedupeMerge(existing, incoming, mode) {
  const seen = new Set(existing.map((a) => a.id));
  const fresh = incoming.filter((a) => !seen.has(a.id));

  if (mode === "prepend") return [...fresh, ...existing].slice(0, MAX_ARTICLES);
  if (mode === "append") return [...existing, ...fresh].slice(0, MAX_ARTICLES);
  return incoming; // replace
}

export function useNews({ category, query, country }) {
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error | refreshing | loadingMore
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pollRef = useRef(null);

  const buildParams = useCallback(
    (pageNum) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      else {
        params.set("category", category || "general");
        params.set("country", country || "pk");
      }
      params.set("page", String(pageNum));
      return params;
    },
    [category, query, country]
  );

  // mode: "replace" (first load / filters changed), "prepend" (background
  // live refresh — new articles slide in at the top like a live feed),
  // "append" (infinite scroll / "load more" — grows the feed downward)
  const fetchNews = useCallback(
    async (mode, pageNum = 1) => {
      if (mode === "replace") setStatus("loading");
      else if (mode === "prepend") setStatus("refreshing");
      else setStatus("loadingMore");
      setError(null);
      try {
        const res = await fetch(`/api/news?${buildParams(pageNum).toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Something went wrong.");

        const incoming = data.articles || [];
        setArticles((prev) => dedupeMerge(prev, incoming, mode === "loadingMore" ? "append" : mode === "refreshing" ? "prepend" : "replace"));
        setHasMore(incoming.length > 0);
        setLastUpdated(new Date());
        setStatus("ready");
      } catch (err) {
        setError(err.message);
        setStatus(mode === "replace" ? "error" : "ready"); // background/pagination failures shouldn't blank out an already-working feed
      }
    },
    [buildParams]
  );

  // Reset to page 1 whenever the category/search/country filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchNews("replace", 1);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchNews("prepend", 1);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, country]);

  const loadMore = useCallback(() => {
    if (status === "loadingMore" || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews("append", nextPage);
  }, [status, hasMore, page, fetchNews]);

  return {
    articles,
    status,
    error,
    lastUpdated,
    hasMore,
    loadMore,
    refresh: () => fetchNews("prepend", 1),
  };
}
