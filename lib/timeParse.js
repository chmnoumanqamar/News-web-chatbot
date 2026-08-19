// The chatbot needs to parse user queries like "yesterday news of 1pm",
// "18-8-2026 news", "kal 9 baje ki news", "aaj cricket updates", etc.
// It extracts:
//  1. Exact requested date info (isYesterday, targetDate, formatted date, ISO search windows)
//  2. Exact requested bulletin times (e.g. "9 PM", "1 PM", "subah 9 baje")
//  3. Clean search keywords with date/time noise stripped out.

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function extractDateInfo(message) {
  if (!message) return null;
  const msg = message.toLowerCase();
  const now = new Date();

  let targetDate = null;
  let isYesterday = false;
  let isToday = false;
  let matchedStr = "";

  // 1. Check numeric formats: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const dmyMatch = msg.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && m >= 0 && m <= 11) {
      targetDate = new Date(Date.UTC(y, m, d, 12, 0, 0));
      matchedStr = dmyMatch[0];
    }
  }

  // 2. Check YYYY-MM-DD, YYYY/MM/DD
  if (!targetDate) {
    const ymdMatch = msg.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (ymdMatch) {
      const y = parseInt(ymdMatch[1], 10);
      const m = parseInt(ymdMatch[2], 10) - 1;
      const d = parseInt(ymdMatch[3], 10);
      if (d >= 1 && d <= 31 && m >= 0 && m <= 11) {
        targetDate = new Date(Date.UTC(y, m, d, 12, 0, 0));
        matchedStr = ymdMatch[0];
      }
    }
  }

  // 3. Check textual dates: "18th August 2026", "18 Aug", "18 August"
  if (!targetDate) {
    const textDateMatch = msg.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?:\s+(\d{2,4}))?\b/i
    );
    if (textDateMatch) {
      const d = parseInt(textDateMatch[1], 10);
      const m = MONTH_MAP[textDateMatch[2].toLowerCase()];
      let y = textDateMatch[3] ? parseInt(textDateMatch[3], 10) : now.getUTCFullYear();
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && m !== undefined) {
        targetDate = new Date(Date.UTC(y, m, d, 12, 0, 0));
        matchedStr = textDateMatch[0];
      }
    }
  }

  // 4. Check textual dates: "August 18 2026", "Aug 18", "August 18th"
  if (!targetDate) {
    const monthFirstMatch = msg.match(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{2,4}))?\b/i
    );
    if (monthFirstMatch) {
      const m = MONTH_MAP[monthFirstMatch[1].toLowerCase()];
      const d = parseInt(monthFirstMatch[2], 10);
      let y = monthFirstMatch[3] ? parseInt(monthFirstMatch[3], 10) : now.getUTCFullYear();
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && m !== undefined) {
        targetDate = new Date(Date.UTC(y, m, d, 12, 0, 0));
        matchedStr = monthFirstMatch[0];
      }
    }
  }

  // 5. Check relative keywords: "yesterday", "kal", "parson", "today", "aaj"
  if (!targetDate) {
    if (/\byesterday(?:'s|s)?\b/i.test(msg) || /\bkal\b/i.test(msg)) {
      targetDate = new Date(now.getTime() - DAY_MS);
      isYesterday = true;
      matchedStr = msg.match(/\byesterday(?:'s|s)?\b/i)?.[0] || msg.match(/\bkal\b/i)?.[0] || "yesterday";
    } else if (/\bparso[n]?\b/i.test(msg) || /\b2\s+days?\s+ago\b/i.test(msg) || /\bdo\s+din\s+pehle\b/i.test(msg)) {
      targetDate = new Date(now.getTime() - 2 * DAY_MS);
      matchedStr = "parson";
    } else if (/\btoday\b/i.test(msg) || /\baaj\b/i.test(msg)) {
      targetDate = new Date(now);
      isToday = true;
      matchedStr = msg.match(/\btoday\b/i)?.[0] || msg.match(/\baaj\b/i)?.[0] || "today";
    }
  }

  if (!targetDate) return null;

  const y = targetDate.getUTCFullYear();
  const m = targetDate.getUTCMonth();
  const d = targetDate.getUTCDate();

  const monthName = MONTH_NAMES[m];
  const monthShort = MONTH_SHORT[m];
  const formatted = `${d} ${monthShort} ${y}`;
  const formattedFull = `${d} ${monthName} ${y}`;

  // Calculate start and end ISO strings with timezone tolerance (UTC+5 / PKT buffer)
  // Target day 00:00 PKT = previous day 19:00 UTC
  // Target day 23:59 PKT = target day 18:59 UTC
  const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0));
  const publishedAfter = new Date(startOfDay.getTime() - 6 * HOUR_MS).toISOString();
  const publishedBefore = new Date(startOfDay.getTime() + 24 * HOUR_MS + 2 * HOUR_MS).toISOString();

  const from = new Date(startOfDay.getTime() - 6 * HOUR_MS).toISOString();
  const to = new Date(startOfDay.getTime() + 24 * HOUR_MS + 2 * HOUR_MS).toISOString();

  // If yesterday was requested from user or target date happens to be yesterday
  const nowDay = now.getUTCDate();
  const nowMonth = now.getUTCMonth();
  const nowYear = now.getUTCFullYear();
  const isTargetYesterday = isYesterday || (y === nowYear && m === nowMonth && d === nowDay - 1);

  return {
    date: targetDate,
    day: d,
    month: m,
    monthName,
    monthShort,
    year: y,
    formatted,
    formattedFull,
    isYesterday: isTargetYesterday,
    isToday,
    matchedStr,
    publishedAfter,
    publishedBefore,
    from,
    to,
  };
}

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

const NOISE_PATTERNS = [
  /\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi,
  /\b\d{1,2}\s*(am|pm)\b/gi,
  /\b\d{1,2}\s*baje\b/gi,
  /\braat\s+ko\b/gi,
  /\bsubah\b/gi,
  /\bshaam\b/gi,
  /\bdopeher\b/gi,
  /\byesterday(?:'s|s)?\b/gi,
  /\bkal\b/gi,
  /\btoday\b/gi,
  /\baaj\b/gi,
];

export function parseTimeWindow(message) {
  const raw = message || "";
  const dateInfo = extractDateInfo(raw);

  let cleaned = raw;
  if (dateInfo?.matchedStr) {
    cleaned = cleaned.replace(dateInfo.matchedStr, " ");
  }
  for (const noise of NOISE_PATTERNS) {
    cleaned = cleaned.replace(noise, " ");
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const from = dateInfo ? dateInfo.from : new Date(Date.now() - DAY_MS).toISOString();
  const to = dateInfo?.to || undefined;

  return { from, to, dateInfo, cleanedMessage: cleaned || raw.trim() };
}