import { NextResponse } from "next/server";
import { sanitizeQuery } from "@/lib/searchUtils";
import { parseTimeWindow, extractTimeSlot } from "@/lib/timeParse";
import { countryMeta } from "@/lib/countries";

// The chatbot widget and AI Results panel call this route. It:
//  1. Handles greetings in English / Roman Urdu / Urdu
//  2. Extracts exact requested bulletin times (e.g. "9 PM", "9 baje", "10 PM", "8 AM")
//  3. Identifies selected country profile (Pakistan, US, UK, India, Global) and their TV channels
//  4. Searches and ranks YouTube broadcasts strictly for that country and requested time bulletin
//  5. Prompts Gemini 3.6 Flash to report precisely on that requested hour's broadcast

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

// ─── Country TV News Channel Profiles ─────────────────────────────────────────

const COUNTRY_PROFILES = {
  pk: {
    name: "Pakistan",
    channels: "Geo News, ARY News, Dunya News, Hum News, Samaa TV, Express News, Dawn News TV",
    ytQuery: "Geo News OR ARY News OR Dunya News OR Hum News OR Samaa headlines",
    regionCode: "PK",
    domains: "dawn.com,tribune.com.pk,thenews.com.pk,geo.tv,arynews.tv,brecorder.com,samaa.tv,dunyanews.tv",
    newsKeyword: "Pakistan OR Islamabad OR Karachi OR Lahore OR Peshawar OR Quetta OR Shehbaz OR Imran Khan",
  },
  us: {
    name: "United States",
    channels: "CNN, Fox News, ABC News, NBC News, CBS News, MSNBC, PBS NewsHour",
    ytQuery: "CNN OR Fox News OR ABC News OR NBC News OR CBS News live headlines",
    regionCode: "US",
    domains: "cnn.com,foxnews.com,abcnews.go.com,cbsnews.com,nbcnews.com,nytimes.com,washingtonpost.com",
    newsKeyword: "United States OR White House OR Congress OR Biden OR Trump OR Economy",
  },
  gb: {
    name: "United Kingdom",
    channels: "BBC News, Sky News, ITV News, Channel 4 News",
    ytQuery: "BBC News OR Sky News OR ITV News live headlines",
    regionCode: "GB",
    domains: "bbc.com,theguardian.com,telegraph.co.uk,independent.co.uk,reuters.com",
    newsKeyword: "UK OR Britain OR London OR Parliament OR Prime Minister",
  },
  in: {
    name: "India",
    channels: "NDTV, India Today, Republic World, Times Now, WION, DD News",
    ytQuery: "NDTV OR India Today OR Republic World OR Times Now live headlines",
    regionCode: "IN",
    domains: "ndtv.com,indiatoday.in,thehindu.com,indianexpress.com",
    newsKeyword: "India OR Delhi OR Mumbai OR Parliament OR Modi",
  },
  global: {
    name: "Global",
    channels: "BBC News, CNN, Al Jazeera English, Reuters, Sky News, DW News, France 24",
    ytQuery: "BBC News OR CNN OR Al Jazeera OR Reuters OR DW News live headlines",
    regionCode: "US",
    domains: "bbc.com,reuters.com,apnews.com,cnn.com,theguardian.com,aljazeera.com",
    newsKeyword: "World news OR breaking news OR international",
  },
};

const FETCH_TIMEOUT_MS = 9000;

// ─── Query Scope & Country Detection ──────────────────────────────────────────

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
    lower.includes("samaa")
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
      channels: `${meta.name} National TV & International News`,
      ytQuery: `${meta.name} news broadcast live headlines`,
      regionCode: countryCode.toUpperCase(),
      domains: "bbc.com,reuters.com,apnews.com,cnn.com",
      newsKeyword: `${meta.name} OR ${meta.demonym || meta.name}`,
    };
  }

  return COUNTRY_PROFILES.pk;
}

// ─── Greetings ────────────────────────────────────────────────────────────────

function checkGreeting(message) {
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
    const isUrdu = /salam|aoa|kaise|kia|kya|hal|haal|ap|aap|tum/.test(clean);
    const answer = isUrdu
      ? "Walaikum Assalam! Main Pulse News Assistant hoon. Aap mujhse kisi bhi waqt ya kisi bhi TV channel (Geo, ARY, Hum, Samaa) ki taza headlines pooch sakte hain, jaise '9 PM news' ya 'aaj ki taza khabar'."
      : "Hello! I am Pulse News Assistant — your live TV news companion. You can ask me for any bulletin (e.g. 'today 9 PM news') or live coverage from major TV channels (Geo News, ARY News, Hum, Dunya, CNN, BBC). How can I assist you?";
    return { isGreeting: true, answer };
  }
  return { isGreeting: false };
}

function makeController(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

// ─── Fetch YouTube TV News Broadcasts with Exact Time Matching ────────────────

async function fetchBroadcastVideos({ query, profile, from, timeSlot }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  let searchQuery;
  if (timeSlot) {
    // Exact time bulletin requested (e.g. 9 PM headlines)
    searchQuery = `${timeSlot.slot} OR ${timeSlot.slotAlt} (${profile.ytQuery})`;
  } else if (!query) {
    searchQuery = profile.ytQuery;
  } else {
    searchQuery = `${query} (${profile.ytQuery})`;
  }

  const params = new URLSearchParams();
  params.set("part", "snippet");
  params.set("q", searchQuery);
  params.set("type", "video");
  params.set("order", "date");
  params.set("maxResults", "15");
  params.set("videoCategoryId", "25"); // Category 25 = News & Politics ONLY
  if (from) params.set("publishedAfter", from);
  if (profile.regionCode) params.set("regionCode", profile.regionCode);
  params.set("relevanceLanguage", "en");
  params.set("key", apiKey);

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let items = [];
    if (!res.ok) {
      params.delete("videoCategoryId");
      const res2 = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, { cache: "no-store" });
      if (res2.ok) {
        const data2 = await res2.json();
        items = parseYtItems(data2.items);
      }
    } else {
      const data = await res.json();
      items = parseYtItems(data.items);
    }

    // If a specific timeSlot was requested, prioritize exact matches
    if (timeSlot && items.length > 0) {
      const timeRegex = new RegExp(
        `\\b(?:${timeSlot.hour}\\s*(?:pm|am|baje)|${timeSlot.slotAlt}|${timeSlot.hour}:00)\\b`,
        "i"
      );
      const exactMatches = items.filter((v) => timeRegex.test(v.title));
      const otherMatches = items.filter((v) => !timeRegex.test(v.title));

      if (exactMatches.length > 0) {
        // Return exact matches first, followed by others up to 10
        return [...exactMatches, ...otherMatches].slice(0, 10);
      }
    }

    return items.slice(0, 10);
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: YouTube fetch failed:", err.message || err);
    return [];
  }
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

// ─── Gemini LLM News Briefing ─────────────────────────────────────────────────

async function askGemini({ question, profile, articles, videos, timeSlot }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return composeFallbackSummary(profile, videos, articles, timeSlot);
  }

  const broadcastList = videos.length
    ? videos.slice(0, 6).map((v, i) => `${i + 1}. [${v.channel}] ${v.title}`).join("\n")
    : "(No direct live broadcast clips returned)";

  const articleList = articles.length
    ? articles.slice(0, 6).map((a, i) => `${i + 1}. [${a.source?.name}] ${a.title}`).join("\n")
    : "";

  const timeGuidance = timeSlot
    ? `The user specifically asked for the ${timeSlot.slot} news bulletin. Focus strictly on what was reported in the ${timeSlot.slot} broadcast on ${profile.name}'s TV channels (${profile.channels}). Do not report on other hours unless directly part of the ${timeSlot.slot} bulletin.`
    : `Focus on what is actively being broadcast on leading TV channels in ${profile.name} (${profile.channels}) right now.`;

  const prompt = `You are "Pulse Assistant" — a senior TV news correspondent and analyst for Pulse News.

TASK:
Provide a mature, authoritative, and accurate news briefing in direct response to the user's question.

CRITICAL GUIDELINES:
1. LANGUAGE: Detect the language used by the user (English, Urdu, or Roman Urdu). Reply fluently and naturally in that EXACT SAME language.
2. TIME ACCURACY: ${timeGuidance}
3. MATURITY & DEPTH: Write 3 to 5 well-constructed, informative sentences summarizing the top stories covered in this broadcast. Be specific and articulate.
4. GROUNDING: Base your briefing on the broadcast reports and live headlines listed below.
5. FORMAT: Natural, spoken journalistic prose. NO markdown headings, NO bullet points, NO asterisks.

USER QUESTION: "${question}"

LIVE TV BROADCAST REPORTS (${profile.name}):
${broadcastList}

ADDITIONAL NEWS WIRES:
${articleList}

Deliver your accurate news briefing:`;

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
          return composeFallbackSummary(profile, videos, articles, timeSlot);
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

  return composeFallbackSummary(profile, videos, articles, timeSlot);
}

// ─── High-Quality Fallback Synthesis ──────────────────────────────────────────

function composeFallbackSummary(profile, videos, articles, timeSlot) {
  const timeLabel = timeSlot ? `${timeSlot.slot} ` : "";

  if (videos.length > 0) {
    const topClips = videos.slice(0, 3).map((v) => `"${v.title}" (${v.channel})`).join(", ");
    return `Major TV channels in ${profile.name} (${profile.channels}) reported the following key developing stories in their ${timeLabel}news broadcast: ${topClips}. You can watch the verified broadcast reports directly below.`;
  }

  if (articles.length > 0) {
    const topArticles = articles.slice(0, 3).map((a) => `"${a.title}"`).join(", ");
    return `Top developments leading headlines across ${profile.name} include ${topArticles}. Please check the latest broadcast reports below.`;
  }

  return `Live news broadcasts across ${profile.name}'s leading TV networks (${profile.channels}) are actively covering major developing stories in national politics, economy, and regional affairs. Explore the verified broadcast reports below.`;
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

  // 1. Instant greeting response
  const greetingResult = checkGreeting(message);
  if (greetingResult.isGreeting) {
    return NextResponse.json({
      answer: greetingResult.answer,
      videos: [],
      query: message,
      isGreeting: true,
    });
  }

  // 2. Identify target country & TV channel profile
  const profile = resolveTargetProfile(message, country);

  // 3. Extract exact time bulletin if requested (e.g. 9 PM, 9 baje, 10 PM)
  const timeSlot = extractTimeSlot(message);

  // 4. Time window and query sanitization
  const { from, cleanedMessage } = parseTimeWindow(message);
  const query = sanitizeQuery(cleanedMessage);

  // 5. Fetch verified TV broadcasts (matching timeSlot if specified) and grounding news
  const [videos, articles] = await Promise.all([
    fetchBroadcastVideos({ query, profile, from, timeSlot }),
    fetchGroundingArticles({ query, profile, from }),
  ]);

  // 6. Generate accurate TV broadcast briefing via Gemini 3.6 Flash
  const answer = await askGemini({
    question: message,
    profile,
    articles,
    videos,
    timeSlot,
  });

  return NextResponse.json({
    answer,
    videos,
    query: query || message,
    country: profile.name,
    timeSlot: timeSlot?.slot || null,
  });
}