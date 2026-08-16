// The chatbot needs to turn something like "aaj cricket ki news batao" or
// "what happened in the last 2 hours in tech" into a NewsAPI `from` date,
// plus a clean search phrase with the time words stripped out. NewsAPI
// dates are UTC ISO strings (e.g. 2026-08-12T06:00:00).
//
// Keeps both English and Roman Urdu phrasing since the app's users mix
// the two.

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Patterns are checked in order — first match wins. Each returns how far
// back (in ms) to set `from`, and the words to strip from the query.
const TIME_PATTERNS = [
  { regex: /\blast\s+(\d+)\s*hours?\b/i, toMs: (m) => Number(m[1]) * HOUR_MS },
  { regex: /\bpichl[ei]\s*(\d+)\s*ghant[ea]?\b/i, toMs: (m) => Number(m[1]) * HOUR_MS },
  { regex: /\bpast\s+(\d+)\s*hours?\b/i, toMs: (m) => Number(m[1]) * HOUR_MS },
  { regex: /\blast\s+(\d+)\s*days?\b/i, toMs: (m) => Number(m[1]) * DAY_MS },
  { regex: /\bpichl[ei]\s*(\d+)\s*din\b/i, toMs: (m) => Number(m[1]) * DAY_MS },
  { regex: /\b(this|current)\s+week\b/i, toMs: () => 7 * DAY_MS },
  { regex: /\bis\s+hafte\b/i, toMs: () => 7 * DAY_MS },
  { regex: /\byesterday\b/i, toMs: () => 2 * DAY_MS },
  { regex: /\bkal\b/i, toMs: () => 2 * DAY_MS },
  { regex: /\blast\s+hour\b/i, toMs: () => HOUR_MS },
  { regex: /\bpichl[ea]\s+ghant[ea]\b/i, toMs: () => HOUR_MS },
  { regex: /\btoday\b/i, toMs: () => DAY_MS },
  { regex: /\baaj\b/i, toMs: () => DAY_MS },
  { regex: /\babhi\b/i, toMs: () => 3 * HOUR_MS },
  { regex: /\bright\s+now\b/i, toMs: () => 3 * HOUR_MS },
];

// Clock-time mentions ("11 baje", "9:30 am", "raat ko 9 baje") don't change
// the `from` window much beyond "today", but they SHOULD be stripped out
// of the search text since NewsAPI treats them as literal noise.
const NOISE_PATTERNS = [
  /\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi,
  /\b\d{1,2}\s*(am|pm)\b/gi,
  /\b\d{1,2}\s*baje\b/gi,
  /\braat\s+ko\b/gi,
  /\bsubah\b/gi,
  /\bshaam\b/gi,
  /\bdopeher\b/gi,
];

export function parseTimeWindow(message) {
  const raw = message || "";
  let windowMs = DAY_MS; // default: today
  let matchedText = "";

  for (const pattern of TIME_PATTERNS) {
    const m = raw.match(pattern.regex);
    if (m) {
      windowMs = pattern.toMs(m);
      matchedText = m[0];
      break;
    }
  }

  let cleaned = raw;
  if (matchedText) {
    cleaned = cleaned.replace(matchedText, " ");
  }
  for (const noise of NOISE_PATTERNS) {
    cleaned = cleaned.replace(noise, " ");
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const from = new Date(Date.now() - windowMs).toISOString();

  return { from, cleanedMessage: cleaned || raw.trim() };
}