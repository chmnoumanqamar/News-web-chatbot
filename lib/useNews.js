"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 90 * 1000;
const MAX_ARTICLES = 120;
const MAX_PAGES = 3; // NewsAPI free plan is capped at 100 results (page 1-3)

function dedupeMerge(existing, incoming, mode) {
  const seen = new Set(existing.map((a) => a.url || a.id));
  const fresh = incoming.filter((a) => !seen.has(a.url || a.id));

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
  const loadingMoreRef = useRef(false);

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

  const fetchNews = useCallback(
    async (mode, pageNum = 1) => {
      if (mode === "replace") setStatus("loading");
      else if (mode === "prepend") setStatus("refreshing");
      else {
        setStatus("loadingMore");
        loadingMoreRef.current = true;
      }
      setError(null);

      try {
        const res = await fetch(`/api/news?${buildParams(pageNum).toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          // If pagination fails (e.g. NewsAPI free tier page limit reached), stop pagination permanently
          if (mode === "append") {
            setHasMore(false);
            setStatus("ready");
            loadingMoreRef.current = false;
            return;
          }
          throw new Error(data.error || "Something went wrong.");
        }

        const incoming = data.articles || [];
        if (incoming.length === 0 || pageNum >= MAX_PAGES) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        setArticles((prev) =>
          dedupeMerge(
            prev,
            incoming,
            mode === "append" ? "append" : mode === "prepend" ? "prepend" : "replace"
          )
        );
        setLastUpdated(new Date());
        setStatus("ready");
      } catch (err) {
        if (mode === "append") {
          setHasMore(false);
          setStatus("ready");
        } else {
          setError(err.message);
          setStatus(mode === "replace" ? "error" : "ready");
        }
      } finally {
        loadingMoreRef.current = false;
      }
    },
    [buildParams]
  );

  // Reset to page 1 whenever the category/search/country filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadingMoreRef.current = false;
    fetchNews("replace", 1);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchNews("prepend", 1);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [category, query, country, fetchNews]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || status === "loadingMore" || !hasMore || page >= MAX_PAGES) {
      return;
    }
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
