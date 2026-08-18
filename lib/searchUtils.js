// NewsAPI and YouTube match literal keywords, not conversational English or dates.
// When a user types "what is latest news of today 18-8-2026" or "give me taday 9 am news",
// searching for "18 8 2026" or "taday 9 am" returns foreign or junk results.
// This strips time stamps, dates, stopwords, and filler phrases down to meaningful topic keywords.

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "for", "to", "is", "are", "was",
  "were", "be", "been", "live", "news", "update", "updates", "today", "taday",
  "latest", "current", "am", "pm", "please", "give", "me", "show", "about",
  "and", "or", "with", "from", "recent", "breaking", "what", "whats", "what's",
  "tell", "batao", "karo", "kya", "kia", "main", "mein", "ka", "ki", "ke",
  "all", "type", "answers", "any", "headlines", "headline",
  "info", "information", "details", "khabar", "khabrain", "taza"
]);

export function sanitizeQuery(raw) {
  if (!raw) return "";

  let text = raw
    // drop full dates like 18-8-2026, 18/08/2026, 2026-08-18, 18.08.2026
    .replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/gi, " ")
    // drop month-based dates like 18th august, august 18, 18 aug
    .replace(/\b\d{1,2}(st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\s*\d{2,4})?\b/gi, " ")
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2}(st|nd|rd|th)?(\s*\d{2,4})?\b/gi, " ")
    // drop clock times like 11:00, 9:30am, 09:00, 9 am, 9pm
    .replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, " ")
    .replace(/\b\d{1,2}\s*(am|pm)\b/gi, " ")
    .replace(/\b\d{1,2}\s*baje\b/gi, " ")
    // drop isolated 4-digit years like 2024, 2025, 2026
    .replace(/\b202[0-9]\b/g, " ")
    // drop stray punctuation
    .replace(/[^\p{L}\p{N}\s]/gu, " ");

  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w.toLowerCase()))
    .filter((w) => !/^\d+$/.test(w)); // drop leftover pure numbers

  return words.join(" ").trim();
}

