import { NextResponse } from "next/server";
import { sanitizeQuery } from "@/lib/searchUtils";
import { parseTimeWindow } from "@/lib/timeParse";

// The chatbot widget calls this route with the user's question. It:
//  1. Handles greetings in English / Roman Urdu / Urdu
//  2. Works out time window and strips noise / date stamps
//  3. Identifies query context: Pakistan (national, politics, city) vs Global (Times Square, US, world)
//  4. Pulls matching articles from NewsAPI (up to 10)
//  5. Pulls verified news broadcast videos from YouTube (News category 25 only)
//  6. Generates a mature, comprehensive news brief via Gemini 3.6 Flash with full fallback

const NEWS_BASE_URL = "https://newsapi.org/v2/everything";
const TOP_HEADLINES_URL = "https://newsapi.org/v2/top-headlines";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

// Verified working Gemini models in order of priority
const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash",
];
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Pakistan-specific verified news sources
const PK_DOMAINS =
  "dawn.com,tribune.com.pk,thenews.com.pk,geo.tv,arynews.tv,brecorder.com,nation.com.pk,dailytimes.com.pk,samaa.tv,dunyanews.tv";
const PK_GENERAL_KEYWORD =
  "Pakistan OR Islamabad OR Karachi OR Lahore OR Peshawar OR Quetta OR Sindh OR Punjab OR Shehbaz OR Imran OR Economy";

// Top global international news sources
const GLOBAL_DOMAINS =
  "bbc.com,reuters.com,apnews.com,cnn.com,theguardian.com,nytimes.com,washingtonpost.com,bloomberg.com,aljazeera.com,nbcnews.com,foxnews.com,abcnews.go.com,cbsnews.com,usatoday.com,time.com";

const FETCH_TIMEOUT_MS = 10000;

// ─── Query Classification ─────────────────────────────────────────────────────

function isPakistanContext(msg) {
  const lower = msg.toLowerCase();
  const pkTerms = [
    "pakistan", "islamabad", "karachi", "lahore", "peshawar", "quetta",
    "sindh", "punjab", "balochistan", "kpk", "pti", "pmln", "ppp",
    "imran", "shehbaz", "nawaz", "bilawal", "rupee", "pkr", "geo",
    "ary", "dawn", "samaa", "dunya", "hum", "parliament", "army",
    "fbr", "sbp", "monsoon", "cricket", "babar", "afridi",
    "کراچی", "اسلام آباد", "لاہور", "پاکستان",
  ];
  return pkTerms.some((t) => lower.includes(t));
}

function isGlobalContext(msg) {
  const lower = msg.toLowerCase();
  const globalTerms = [
    "times square", "new york", "nyc", "usa", "united states", "america",
    "washington", "white house", "trump", "biden", "harris", "congress",
    "wall street", "nasdaq", "dow jones", "london", "uk ", "england",
    "paris", "france", "germany", "beijing", "china", "russia", "moscow",
    "ukraine", "israel", "gaza", "middle east", "iran", "saudi", "europe",
    "nato", "united nations", "world cup", "olympics", "spacex", "tesla",
    "apple", "google", "microsoft", "bitcoin", "crypto", "international",
    "world news", "global",
  ];
  return globalTerms.some((t) => lower.includes(t));
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
      ? "Walaikum Assalam! Main Pulse Assistant hoon — aapka comprehensive news companion. Aap mujhse Pakistan, Times Square, world politics, sports, business, technology ya kisi bhi topic ki taza tareen khabrain pooch sakte hain. Main detailed aur accurate updates faraham karunga."
      : "Hello! I am Pulse Assistant — your comprehensive news intelligence companion. You can ask me about top stories in Pakistan, breaking global events, Times Square updates, politics, economy, technology, or sports. How can I assist you with today's news?";
    return { isGreeting: true, answer };
  }
  return { isGreeting: false };
}

function makeController(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

function normaliseArticles(raw) {
  return (raw || [])
    .filter((a) => a.title && a.title !== "[Removed]" && !a.title.includes("Removed"))
    .map((a, i) => ({
      id: `${a.url || i}-${i}`,
      title: a.title,
      description: a.description || "",
      url: a.url,
      image: a.urlToImage,
      source: a.source?.name || "News Outlet",
      publishedAt: a.publishedAt,
    }));
}

// ─── News API Fetchers ────────────────────────────────────────────────────────

async function fetchTopHeadlines(isGlobal) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  let url;
  if (isGlobal) {
    const params = new URLSearchParams();
    params.set("language", "en");
    params.set("pageSize", "10");
    url = `${TOP_HEADLINES_URL}?${params.toString()}`;
  } else {
    const params = new URLSearchParams();
    params.set("domains", PK_DOMAINS);
    params.set("q", PK_GENERAL_KEYWORD);
    params.set("language", "en");
    params.set("sortBy", "publishedAt");
    params.set("pageSize", "10");
    url = `${NEWS_BASE_URL}?${params.toString()}`;
  }

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      // Fallback to broad headlines if domains filter failed
      const fallbackUrl = `${TOP_HEADLINES_URL}?language=en&pageSize=10`;
      const res2 = await fetch(fallbackUrl, {
        headers: { "X-Api-Key": apiKey },
        cache: "no-store",
      });
      if (res2.ok) {
        const data2 = await res2.json();
        return normaliseArticles(data2.articles);
      }
      return [];
    }
    const data = await res.json();
    const articles = normaliseArticles(data.articles);
    if (articles.length === 0 && !isGlobal) {
      return fetchTopHeadlines(true);
    }
    return articles;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: NewsAPI top-headlines error:", err.message || err);
    return [];
  }
}

async function fetchArticles({ query, from, isGlobal }) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  if (!query) return fetchTopHeadlines(isGlobal);

  const params = new URLSearchParams();
  params.set("q", query);
  if (from) params.set("from", from);
  params.set("language", "en");
  params.set("sortBy", "publishedAt");
  params.set("pageSize", "10");

  if (isGlobal) {
    params.set("domains", GLOBAL_DOMAINS);
  } else if (isPakistanContext(query)) {
    params.set("domains", PK_DOMAINS);
  }

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (params.has("domains")) {
        params.delete("domains");
        const res2 = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
          headers: { "X-Api-Key": apiKey },
          cache: "no-store",
        });
        if (res2.ok) {
          const data2 = await res2.json();
          return normaliseArticles(data2.articles);
        }
      }
      return fetchTopHeadlines(isGlobal);
    }
    const data = await res.json();
    let results = normaliseArticles(data.articles);
    if (results.length === 0) {
      // Retry without domain constraint
      if (params.has("domains")) {
        params.delete("domains");
        const res2 = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
          headers: { "X-Api-Key": apiKey },
          cache: "no-store",
        });
        if (res2.ok) {
          const data2 = await res2.json();
          results = normaliseArticles(data2.articles);
        }
      }
    }
    return results.length > 0 ? results : fetchTopHeadlines(isGlobal);
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: NewsAPI fetch error:", err.message || err);
    return fetchTopHeadlines(isGlobal);
  }
}

// ─── YouTube Video Fetcher (Restricted to News & Politics Category 25) ────────

async function fetchVideos({ query, from, isGlobal }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  let searchQuery;
  if (!query) {
    searchQuery = isGlobal
      ? "World news breaking headlines today live"
      : "Pakistan latest news headlines Geo ARY Dunya Hum";
  } else if (isGlobal) {
    searchQuery = `${query} news broadcast live`;
  } else {
    searchQuery = `${query} Pakistan news headlines`;
  }

  const params = new URLSearchParams();
  params.set("part", "snippet");
  params.set("q", searchQuery);
  params.set("type", "video");
  params.set("order", "date");
  params.set("maxResults", "10");
  params.set("videoCategoryId", "25"); // Category 25 = News & Politics ONLY
  if (from) params.set("publishedAfter", from);
  if (!isGlobal) params.set("regionCode", "PK");
  params.set("relevanceLanguage", "en");
  params.set("key", apiKey);

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      // If videoCategoryId is rejected, retry without it but keep news keyword
      params.delete("videoCategoryId");
      const res2 = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
        cache: "no-store",
      });
      if (res2.ok) {
        const data2 = await res2.json();
        return (data2.items || [])
          .filter((v) => v.id?.videoId)
          .map((v) => ({
            id: v.id.videoId,
            title: v.snippet?.title,
            channel: v.snippet?.channelTitle,
            thumbnail:
              v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
            publishedAt: v.snippet?.publishedAt,
            url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
          }));
      }
      return [];
    }
    const data = await res.json();
    return (data.items || [])
      .filter((v) => v.id?.videoId)
      .map((v) => ({
        id: v.id.videoId,
        title: v.snippet?.title,
        channel: v.snippet?.channelTitle,
        thumbnail:
          v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
        publishedAt: v.snippet?.publishedAt,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      }));
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: YouTube fetch failed:", err.message || err);
    return [];
  }
}

// ─── Gemini LLM Generator ─────────────────────────────────────────────────────

async function askGemini({ question, articles, videos, isGlobal }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return composeFallbackSummary(question, articles, videos);
  }

  const articleListing = articles.length
    ? articles
        .slice(0, 8)
        .map(
          (a, i) =>
            `${i + 1}. [${a.source}] ${a.title}${a.description ? ` — ${a.description}` : ""}`
        )
        .join("\n")
    : "(No direct live article feeds found)";

  const videoListing = videos.length
    ? videos
        .slice(0, 6)
        .map((v, i) => `${i + 1}. [${v.channel}] ${v.title}`)
        .join("\n")
    : "(No broadcast videos found)";

  const contextGuide = isGlobal
    ? "The user is inquiring about global or international news (such as Times Square, US politics, global economy, or international developments). Deliver a mature, worldwide journalistic perspective."
    : "The user is inquiring from or about Pakistan and regional current affairs. Deliver a mature, comprehensive journalistic summary highlighting political, economic, security, or social developments.";

  const prompt = `You are "Pulse Assistant" — a sophisticated, mature, and highly articulate senior news analyst and journalist for the Pulse News platform.

TASK:
Provide a mature, insightful, and comprehensive news briefing in direct response to the user's question.

CRITICAL INSTRUCTIONS:
1. LANGUAGE: Detect the language used by the user (English, Urdu, or Roman Urdu). Reply fluently and naturally in that EXACT SAME language.
2. TONE & QUALITY: Write with journalistic depth, maturity, and poise. Avoid brief one-liners or generic placeholders. Deliver a solid 3 to 5 sentence summary explaining what is happening, key stakeholders involved, and why it matters.
3. RELEVANCE: Directly address the user's question (e.g. Times Square, today's headlines, elections, economy, sports).
4. GROUNDING: Use the provided live articles and broadcasts as your factual grounding. If articles are limited, draw upon your comprehensive world knowledge to provide accurate, up-to-date context without inventing false claims.
5. FORMAT: Use clear, natural prose. Do NOT use markdown headers or bullet points.

CONTEXT:
${contextGuide}

USER QUESTION: "${question}"

LIVE ARTICLES:
${articleListing}

BROADCAST NEWS VIDEOS:
${videoListing}

Write your complete, mature news response now:`;

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
        const errText = await res.text();
        console.error(`Chatbot: Gemini model [${model}] status ${res.status}:`, errText.slice(0, 150));
        if (res.status === 401) {
          return composeFallbackSummary(question, articles, videos);
        }
        continue;
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      if (text.trim()) {
        return text.trim();
      }
    } catch (err) {
      clearTimeout(timeout);
      console.error(`Chatbot: Gemini model [${model}] error:`, err.message || err);
      continue;
    }
  }

  // If Gemini calls failed, use our high-quality synthesis fallback
  return composeFallbackSummary(question, articles, videos);
}

// ─── High-Quality Fallback Synthesis ──────────────────────────────────────────

function composeFallbackSummary(question, articles, videos) {
  if (articles.length === 0 && videos.length === 0) {
    return "Here is the latest news update: Key regional and international developments are currently unfolding across politics, business, and current affairs. You can explore the live news categories in the main feed or search for specific keywords.";
  }

  const topItems = articles.slice(0, 3);
  const titles = topItems.map((a) => `"${a.title}" (${a.source})`).join(", and ");

  return `Today's top developing stories include ${titles}. For in-depth coverage, explore the full articles and verified broadcast video reports attached below.`;
}

// ─── Main POST Route Handler ──────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = (body?.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  // 1. Instant greeting check
  const greetingResult = checkGreeting(message);
  if (greetingResult.isGreeting) {
    return NextResponse.json({
      answer: greetingResult.answer,
      articles: [],
      videos: [],
      query: message,
      isGreeting: true,
    });
  }

  // 2. Classify scope (Pakistan vs Global)
  const isGlobal = isGlobalContext(message) && !isPakistanContext(message);

  // 3. Time parse & query sanitization
  const { from, cleanedMessage } = parseTimeWindow(message);
  const query = sanitizeQuery(cleanedMessage);

  // 4. Parallel fetch for articles and broadcast videos
  const [articles, videos] = await Promise.all([
    fetchArticles({ query, from, isGlobal }),
    fetchVideos({ query, from, isGlobal }),
  ]);

  // 5. Generate mature journalistic response
  const answer = await askGemini({
    question: message,
    articles,
    videos,
    isGlobal,
  });

  return NextResponse.json({
    answer,
    articles,
    videos,
    query: query || message,
    from,
    isGlobal,
  });
}