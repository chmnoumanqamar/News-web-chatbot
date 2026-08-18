import { NextResponse } from "next/server";
import { sanitizeQuery } from "@/lib/searchUtils";
import { parseTimeWindow, extractTimeSlot } from "@/lib/timeParse";
import { countryMeta } from "@/lib/countries";

// The chatbot widget and AI Results panel call this route. It:
//  1. Detects language (Roman Urdu, Urdu script, English, etc.) and responds in that SAME language
//  2. Extracts exact requested bulletin times (e.g. "9 PM", "subah 9 baje", "10 PM", "8 AM")
//  3. Queries MULTIPLE leading TV news channels in parallel (ARY News, Geo News, Dunya News, Hum News, Samaa TV, etc.)
//  4. Interleaves results so every channel is fairly represented
//  5. Generates a mature, accurate briefing via Gemini 3.6 Flash

const NEWS_BASE_URL = "https://newsapi.org/v2/everything";
const TOP_HEADLINES_URL = "https://newsapi.org/v2/top-headlines";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash",
];
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ─── Country TV Channel Profiles (Multi-Channel Lists) ─────────────────────────

const COUNTRY_PROFILES = {
  pk: {
    name: "Pakistan",
    channelsList: ["ARY News", "Geo News", "Dunya News", "HUM News", "Samaa TV", "Express News"],
    channelNames: "ARY News, Geo News, Dunya News, Hum News, Samaa TV, Express News",
    regionCode: "PK",
    domains: "dawn.com,tribune.com.pk,thenews.com.pk,geo.tv,arynews.tv,brecorder.com,samaa.tv,dunyanews.tv",
    newsKeyword: "Pakistan OR Islamabad OR Karachi OR Lahore OR Shehbaz OR Imran Khan",
  },
  us: {
    name: "United States",
    channelsList: ["CNN", "Fox News", "ABC News", "NBC News", "CBS News", "MSNBC"],
    channelNames: "CNN, Fox News, ABC News, NBC News, CBS News, MSNBC",
    regionCode: "US",
    domains: "cnn.com,foxnews.com,abcnews.go.com,cbsnews.com,nbcnews.com,nytimes.com,washingtonpost.com",
    newsKeyword: "United States OR White House OR Congress OR Biden OR Trump",
  },
  gb: {
    name: "United Kingdom",
    channelsList: ["BBC News", "Sky News", "ITV News", "Channel 4 News"],
    channelNames: "BBC News, Sky News, ITV News, Channel 4 News",
    regionCode: "GB",
    domains: "bbc.com,theguardian.com,telegraph.co.uk,independent.co.uk,reuters.com",
    newsKeyword: "UK OR Britain OR London OR Parliament OR Prime Minister",
  },
  in: {
    name: "India",
    channelsList: ["NDTV", "India Today", "Republic World", "Times Now", "WION"],
    channelNames: "NDTV, India Today, Republic World, Times Now, WION",
    regionCode: "IN",
    domains: "ndtv.com,indiatoday.in,thehindu.com,indianexpress.com",
    newsKeyword: "India OR Delhi OR Mumbai OR Parliament OR Modi",
  },
  global: {
    name: "Global",
    channelsList: ["BBC News", "CNN", "Al Jazeera English", "Reuters", "Sky News", "DW News"],
    channelNames: "BBC News, CNN, Al Jazeera English, Reuters, Sky News, DW News",
    regionCode: "US",
    domains: "bbc.com,reuters.com,apnews.com,cnn.com,theguardian.com,aljazeera.com",
    newsKeyword: "World news OR breaking news OR international",
  },
};

const FETCH_TIMEOUT_MS = 9000;

// ─── Language Detector ────────────────────────────────────────────────────────

function detectLanguage(text) {
  if (!text) return "en";
  if (/[\u0600-\u06FF]/.test(text)) return "ur_script";

  const romanUrduWords = new Set([
    "subah", "subha", "shaam", "sham", "raat", "dopeher", "dopahar", "baje",
    "bajhay", "bajy", "bje", "bjay", "aaj", "kal", "parson", "taza", "khabar",
    "khabrain", "batao", "bataen", "bataiye", "kya", "kia", "kaise", "kese",
    "hai", "hain", "mein", "main", "ki", "ka", "ke", "ko", "ye", "yeh", "wo",
    "woh", "mujhe", "humko", "humein", "bhi", "karo", "karen", "chal", "rehi",
    "rahi", "raha", "rahe", "tha", "thi", "the", "sunao", "dekhao", "dikhao",
    "kuch", "kitne", "konsi", "kahan", "kyun", "q", "kyu", "wali", "wala",
    "wale", "dekh", "daikho", "bhejo", "aur", "or", "sirf", "sab", "ap", "aap", "tum"
  ]);

  const words = text.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\w]/g, ""));
  const matchCount = words.filter((w) => romanUrduWords.has(w)).length;

  if (matchCount >= 1 || (words.length <= 4 && matchCount >= 1)) {
    return "roman_urdu";
  }
  return "en";
}

// ─── Scope & Profile Resolver ─────────────────────────────────────────────────

function resolveTargetProfile(message, countryCode = "pk") {
  const lower = (message || "").toLowerCase();

  if (
    lower.includes("times square") ||
    lower.includes("new york") ||
    lower.includes("usa") ||
    lower.includes("america") ||
    lower.includes("white house") ||
    lower.includes("trump") ||
    lower.includes("biden")
  ) {
    return COUNTRY_PROFILES.us;
  }
  if (
    lower.includes("pakistan") ||
    lower.includes("karachi") ||
    lower.includes("lahore") ||
    lower.includes("islamabad") ||
    lower.includes("imran") ||
    lower.includes("geo news") ||
    lower.includes("ary news") ||
    lower.includes("hum news") ||
    lower.includes("samaa") ||
    lower.includes("dunya")
  ) {
    return COUNTRY_PROFILES.pk;
  }
  if (lower.includes("london") || lower.includes("uk") || lower.includes("britain") || lower.includes("bbc")) {
    return COUNTRY_PROFILES.gb;
  }
  if (lower.includes("india") || lower.includes("delhi") || lower.includes("mumbai") || lower.includes("modi")) {
    return COUNTRY_PROFILES.in;
  }

  if (COUNTRY_PROFILES[countryCode]) {
    return COUNTRY_PROFILES[countryCode];
  }

  const meta = countryMeta(countryCode);
  if (meta) {
    return {
      name: meta.name,
      channelsList: [`${meta.name} News`, "BBC News", "CNN"],
      channelNames: `${meta.name} National TV & International News`,
      regionCode: countryCode.toUpperCase(),
      domains: "bbc.com,reuters.com,apnews.com,cnn.com",
      newsKeyword: `${meta.name} OR ${meta.demonym || meta.name}`,
    };
  }

  return COUNTRY_PROFILES.pk;
}

// ─── Greetings ────────────────────────────────────────────────────────────────

function checkGreeting(message, lang) {
  const clean = message.trim().toLowerCase().replace(/[^\w\s]/g, "");
  const GREETINGS = new Set([
    "hi", "hello", "hey", "hola", "hy", "hie", "heya", "yo",
    "aoa", "salam", "assalam", "assalamoalaikum", "assalamualaykum",
    "assalam o alaikum", "kaise ho", "kya hal hai", "kya haal hai",
    "kia hal hai", "how are you", "good morning", "good evening",
    "good afternoon", "good night", "greetings",
    "who are you", "tum kaun ho", "aap kaun ho", "help",
  ]);

  if (GREETINGS.has(clean) || clean.length <= 2) {
    let answer;
    if (lang === "ur_script") {
      answer = "وعلیکم السلام! میں پلس نیوز اسسٹنٹ ہوں۔ آپ مجھ سے کسی بھی وقت کے بلیٹن (مثلاً 9 بجے کی خبریں) یا کسی بھی ٹی وی چینل کی لائیو اپڈیٹس پوچھ سکتے ہیں۔";
    } else if (lang === "roman_urdu") {
      answer = "Walaikum Assalam! Main Pulse News Assistant hoon. Aap mujhse kisi bhi waqt ke bulletin (jaise 'subah 9 baje ki news' ya '9 PM headlines') ya kisi bhi TV channel (ARY, Geo, Hum, Dunya, Samaa) ki taza khabrain pooch sakte hain.";
    } else {
      answer = "Hello! I am Pulse News Assistant — your live TV news intelligence companion. You can ask for specific bulletins (e.g. '9 PM news' or 'morning headlines') or live coverage across major TV channels (ARY News, Geo News, Hum News, Dunya, CNN, BBC). How can I assist you?";
    }
    return { isGreeting: true, answer };
  }
  return { isGreeting: false };
}

function makeController(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

// ─── Multi-Channel Parallel YouTube Video Fetcher ─────────────────────────────

async function fetchChannelVideos(channelName, timeSlot, query, regionCode, apiKey) {
  let q;
  if (timeSlot) {
    q = `${channelName} ${timeSlot.slot} headlines`;
  } else if (query) {
    q = `${channelName} ${query} news`;
  } else {
    q = `${channelName} headlines today`;
  }

  const params = new URLSearchParams({
    part: "snippet",
    q,
    type: "video",
    order: "date",
    maxResults: "3",
    videoCategoryId: "25", // Category 25 = News & Politics ONLY
    regionCode: regionCode || "PK",
    relevanceLanguage: "en",
    key: apiKey,
  });

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = await res.json();
    return parseYtItems(data.items || []);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchBroadcastVideos({ query, profile, timeSlot }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const channels = profile.channelsList || ["ARY News", "Geo News", "Dunya News", "HUM News", "Samaa TV"];

  // Fetch top 3-4 channels in parallel to ensure diversity across all networks
  const channelResults = await Promise.all(
    channels.map((ch) => fetchChannelVideos(ch, timeSlot, query, profile.regionCode, apiKey))
  );

  // Interleave results so every TV channel is represented in the list
  const merged = [];
  const maxLen = Math.max(0, ...channelResults.map((r) => r.length));

  for (let i = 0; i < maxLen; i++) {
    for (const list of channelResults) {
      if (list[i] && merged.length < 12) {
        // Prevent duplicate video IDs
        if (!merged.some((m) => m.id === list[i].id)) {
          merged.push(list[i]);
        }
      }
    }
  }

  // If a specific timeSlot was requested, sort exact hour matches to the top
  if (timeSlot && merged.length > 0) {
    const timeRegex = new RegExp(
      `\\b(?:${timeSlot.hour}\\s*(?:pm|am|baje|bajhay)|${timeSlot.slotAlt}|${timeSlot.hour}:00)\\b`,
      "i"
    );
    const exactMatches = merged.filter((v) => timeRegex.test(v.title));
    const otherMatches = merged.filter((v) => !timeRegex.test(v.title));

    if (exactMatches.length > 0) {
      return [...exactMatches, ...otherMatches].slice(0, 10);
    }
  }

  return merged.slice(0, 10);
}

function parseYtItems(items) {
  return (items || [])
    .filter((v) => v.id?.videoId && v.snippet?.title)
    .map((v) => ({
      id: v.id.videoId,
      title: v.snippet.title.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
      publishedAt: v.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
    }));
}

// ─── Fetch Articles for Grounding ─────────────────────────────────────────────

async function fetchGroundingArticles({ query, profile, from }) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams();
  params.set("q", query || profile.newsKeyword);
  if (profile.domains) params.set("domains", profile.domains);
  if (from) params.set("from", from);
  params.set("language", "en");
  params.set("sortBy", "publishedAt");
  params.set("pageSize", "8");

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const res2 = await fetch(`${TOP_HEADLINES_URL}?language=en&pageSize=8`, {
        headers: { "X-Api-Key": apiKey },
        cache: "no-store",
      });
      if (res2.ok) {
        const data2 = await res2.json();
        return (data2.articles || []).filter((a) => a.title && !a.title.includes("[Removed]"));
      }
      return [];
    }

    const data = await res.json();
    return (data.articles || []).filter((a) => a.title && !a.title.includes("[Removed]"));
  } catch (err) {
    clearTimeout(timeout);
    return [];
  }
}

// ─── Gemini LLM News Briefing (Multi-Language Responsive) ─────────────────────

async function askGemini({ question, profile, articles, videos, timeSlot, lang }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return composeFallbackSummary(profile, videos, articles, timeSlot, lang);
  }

  const broadcastList = videos.length
    ? videos.slice(0, 8).map((v, i) => `${i + 1}. [${v.channel}] ${v.title}`).join("\n")
    : "(No direct live broadcast clips returned)";

  const articleList = articles.length
    ? articles.slice(0, 6).map((a, i) => `${i + 1}. [${a.source?.name}] ${a.title}`).join("\n")
    : "";

  let langInstruction = "";
  if (lang === "roman_urdu") {
    langInstruction = "CRITICAL LANGUAGE RULE: The user asked in Roman Urdu. You MUST write your ENTIRE response in natural, fluent, spoken Roman Urdu (e.g. 'Pakistan ke mukhtalif TV channels (ARY News, Geo News, Dunya News, Hum News) ke mutabiq ahem khabrain yeh hain...'). Do NOT write in English!";
  } else if (lang === "ur_script") {
    langInstruction = "CRITICAL LANGUAGE RULE: The user asked in Urdu script. You MUST write your entire response in fluent, grammatically correct Urdu script (اردو).";
  } else {
    langInstruction = "LANGUAGE RULE: Reply in articulate, professional English.";
  }

  const timeGuidance = timeSlot
    ? `The user explicitly requested the ${timeSlot.slot} news bulletin. Focus strictly on what was reported in the ${timeSlot.slot} broadcast across these TV channels (${profile.channelNames}). Highlight stories from multiple channels (ARY News, Geo News, Dunya News, Hum News, Samaa TV).`
    : `Focus on what is actively being broadcast on leading TV channels in ${profile.name} (${profile.channelNames}) right now. Highlight developments across different channels.`;

  const prompt = `You are "Pulse Assistant" — a senior TV news correspondent and analyst for Pulse News.

TASK:
Provide a mature, authoritative, and accurate news briefing in direct response to the user's question.

${langInstruction}

TIME ACCURACY & MULTI-CHANNEL FOCUS:
${timeGuidance}

WRITING STYLE:
- Write 3 to 5 well-constructed, informative sentences summarizing the top stories reported across these channels.
- Synthesize the diverse headlines from ARY News, Geo News, Dunya News, Hum News, and Samaa TV.
- Format: Natural spoken journalistic prose. NO markdown headings, NO bullet points, NO asterisks.

USER QUESTION: "${question}"

LIVE TV BROADCAST REPORTS (${profile.name}):
${broadcastList}

ADDITIONAL NEWS WIRES:
${articleList}

Deliver your accurate news briefing now:`;

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 401) {
          return composeFallbackSummary(profile, videos, articles, timeSlot, lang);
        }
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      if (text.trim()) {
        return text.trim();
      }
    } catch (err) {
      clearTimeout(timeout);
      continue;
    }
  }

  return composeFallbackSummary(profile, videos, articles, timeSlot, lang);
}

// ─── Multi-Language Fallback Synthesis ────────────────────────────────────────

function composeFallbackSummary(profile, videos, articles, timeSlot, lang) {
  const timeLabel = timeSlot ? `${timeSlot.slot} ` : "";

  if (lang === "roman_urdu") {
    if (videos.length > 0) {
      const topClips = videos.slice(0, 3).map((v) => `"${v.title}" (${v.channel})`).join(", ");
      return `${profile.name} ke leading TV channels (${profile.channelNames}) ke ${timeLabel}bulletin ke mutabiq ahem khabrain yeh hain: ${topClips}. Mukammal video reports aap neechay daikh sakte hain.`;
    }
    return `${profile.name} ke leading TV channels (${profile.channelNames}) par is waqt ahem mulki aur bain-ul-aqwami khabrain nashar ki ja rahi hain. Neechay diye gaye broadcast reports mulahiza karein.`;
  }

  if (lang === "ur_script") {
    if (videos.length > 0) {
      const topClips = videos.slice(0, 3).map((v) => `"${v.title}" (${v.channel})`).join("، ");
      return `${profile.name} کے نمایاں ٹی وی چینلز (${profile.channelNames}) کی ${timeLabel}نشریات کی اہم خبریں یہ ہیں: ${topClips}۔ تفصیلی ویڈیو رپورٹس نیچے دیکھی جا سکتی ہیں۔`;
    }
    return `${profile.name} کے اہم ٹی وی چینلز پر تازہ ترین ملکی اور بین الاقوامی خبریں نشر کی جا رہی ہیں۔ نیچے دی گئی رپورٹس دیکھیں۔`;
  }

  // English fallback
  if (videos.length > 0) {
    const topClips = videos.slice(0, 3).map((v) => `"${v.title}" (${v.channel})`).join(", ");
    return `Major TV channels in ${profile.name} (${profile.channelNames}) reported the following key developing stories in their ${timeLabel}news broadcast: ${topClips}. You can watch the verified broadcast reports directly below.`;
  }

  return `Live news broadcasts across ${profile.name}'s leading TV networks (${profile.channelNames}) are actively covering major developing stories in national politics, economy, and regional affairs. Explore the verified broadcast reports below.`;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = (body?.message || "").trim();
  const country = (body?.country || "pk").toLowerCase();

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  // 1. Detect language (Roman Urdu, Urdu script, English)
  const lang = detectLanguage(message);

  // 2. Instant greeting response in matching language
  const greetingResult = checkGreeting(message, lang);
  if (greetingResult.isGreeting) {
    return NextResponse.json({
      answer: greetingResult.answer,
      videos: [],
      query: message,
      isGreeting: true,
      lang,
    });
  }

  // 3. Identify target country & TV channel profile
  const profile = resolveTargetProfile(message, country);

  // 4. Extract exact time bulletin if requested (e.g. 9 PM, subah 9 baje, 10 PM)
  const timeSlot = extractTimeSlot(message);

  // 5. Time window and query sanitization
  const { from, cleanedMessage } = parseTimeWindow(message);
  const query = sanitizeQuery(cleanedMessage);

  // 6. Fetch verified TV broadcasts across multiple channels in parallel
  const [videos, articles] = await Promise.all([
    fetchBroadcastVideos({ query, profile, timeSlot }),
    fetchGroundingArticles({ query, profile, from }),
  ]);

  // 7. Generate language-accurate TV broadcast briefing via Gemini 3.6 Flash
  const answer = await askGemini({
    question: message,
    profile,
    articles,
    videos,
    timeSlot,
    lang,
  });

  return NextResponse.json({
    answer,
    videos,
    query: query || message,
    country: profile.name,
    timeSlot: timeSlot?.slot || null,
    lang,
  });
}