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

export function extractTimeSlot(message) {
  if (!message) return null;
  const msg = message.toLowerCase();

  // Match 9 pm, 9:00 pm, 9am, 9:30 am, etc.
  const clockMatch = msg.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (clockMatch) {
    const hour = clockMatch[1];
    const ampm = clockMatch[3].toUpperCase();
    return {
      slot: `${hour} ${ampm}`,
      slotAlt: `${hour}${ampm}`,
      hour: Number(hour),
      ampm,
      raw: clockMatch[0],
    };
  }

  // Match 'subah 9', 'subha 9', 'morning 9'
  const subahMatch = msg.match(/\b(?:subah|subha|morning)\s*(\d{1,2})\b/i);
  if (subahMatch) {
    const hour = Number(subahMatch[1]);
    return {
      slot: `${hour} AM`,
      slotAlt: `${hour}AM`,
      hour,
      ampm: "AM",
      raw: subahMatch[0],
    };
  }

  // Match 'shaam 8', 'raat 9', 'evening 9'
  const shaamMatch = msg.match(/\b(?:shaam|sham|raat|evening|night)\s*(\d{1,2})\b/i);
  if (shaamMatch) {
    const hour = Number(shaamMatch[1]);
    return {
      slot: `${hour} PM`,
      slotAlt: `${hour}PM`,
      hour,
      ampm: "PM",
      raw: shaamMatch[0],
    };
  }

  // Match 9 baje / 9 bajhay / 9 bajy / 9 bajay / 9 bajha / 9 baja
  const bajeMatch = msg.match(/\b(\d{1,2})\s*(?:baje|bajhay|bajy|bajay|bje|bjay|bajha|baja)\b/i);
  if (bajeMatch) {
    const hour = Number(bajeMatch[1]);
    const isMorning = /subah|subha|morning|fajar/.test(msg);
    const isNight = /raat|shaam|sham|evening|night|dopeher|dopahar/.test(msg);
    const ampm = isMorning ? "AM" : (isNight || (hour >= 6 && hour <= 11) || hour === 12 ? "PM" : "AM");
    return {
      slot: `${hour} ${ampm}`,
      slotAlt: `${hour}${ampm}`,
      hour,
      ampm,
      raw: bajeMatch[0],
    };
  }

  // Match Urdu/Hindi spoken words: nau baje, dus baje, etc.
  const wordMap = {
    ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4,
    paanch: 5, panch: 5, che: 6, chhe: 6, saat: 7,
    aath: 8, ath: 8, nau: 9, no: 9, dus: 10, das: 10,
    gyarah: 11, barah: 12,
  };
  for (const [w, h] of Object.entries(wordMap)) {
    if (new RegExp(`\\b${w}\\s*(?:baje|bajhay|bajy|bajay|bje|bajha|baja)\\b`, "i").test(msg)) {
      const isMorning = /subah|subha|morning|fajar/.test(msg);
      const isNight = /raat|shaam|sham|evening|night|dopeher|dopahar/.test(msg);
      const ampm = isMorning ? "AM" : (isNight || (h >= 6 && h <= 11) || h === 12 ? "PM" : "AM");
      return {
        slot: `${h} ${ampm}`,
        slotAlt: `${h}${ampm}`,
        hour: h,
        ampm,
        raw: `${w} baje`,
      };
    }
  }

  return null;
}

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