"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pulse:bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch (err) {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, hydrated]);

  const isBookmarked = useCallback(
    (id) => bookmarks.some((b) => b.id === id),
    [bookmarks]
  );

  const toggleBookmark = useCallback((article) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === article.id);
      if (exists) return prev.filter((b) => b.id !== article.id);
      return [article, ...prev];
    });
  }, []);

  return { bookmarks, isBookmarked, toggleBookmark, hydrated };
}
