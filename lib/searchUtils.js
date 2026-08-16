// NewsAPI matches literal keywords, not natural language. A typed sentence
// like "11:00 AM live news of pakistan" often returns zero results because
// of the time string and filler words. This strips that noise down to the
// words that actually carry meaning, so search behaves the way people expect.

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "for", "to", "is", "are", "was",
  "were", "be", "been", "live", "news", "update", "updates", "today",
  "latest", "current", "am", "pm", "please", "give", "me", "show", "about",
  "and", "or", "with", "from", "recent", "breaking",
]);

export function sanitizeQuery(raw) {
  if (!raw) return "";

  const cleaned = raw
    // drop clock times like 11:00, 9:30am, 09:00
    .replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, " ")
    // drop stray punctuation
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word.toLowerCase()));

  // If stripping left nothing useful (e.g. the message was only "1 PM
  // news" or "latest updates"), return "" on purpose — the caller (chat
  // route) then knows there's no real topic and can fall back to a
  // broad/top-headlines fetch instead of searching for a leftover
  // stopword like "news" itself, which returns poor/empty results.
  return cleaned.join(" ").trim();
}
