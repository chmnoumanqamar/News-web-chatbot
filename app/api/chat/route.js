import { NextResponse } from "next/server";
import { sanitizeQuery } from "@/lib/searchUtils";
import { parseTimeWindow } from "@/lib/timeParse";

// The chatbot widget calls this route with the user's question. It:
//  1. Checks if the message is a simple greeting ("hi", "hello", "aoa", ...)
//  2. Works out a time window from the question ("aaj", "last 2 hours", ...)
//  3. Detects if the query is local (Pakistan) or global (Times Square, world news, etc.)
//  4. Pulls matching articles from NewsAPI (up to 10) using smart global/local routing
//  5. Tries multiple Gemini models (fallback chain) to generate a mature, detailed answer
//
// Articles + videos (up to 10 each) are returned alongside the reply so the UI
// can show them both inside the chat bubble AND in the main page's "AI results"
// strip — that second part happens in app/page.js, not here.

const NEWS_BASE_URL = "https://newsapi.org/v2/everything";
const TOP_HEADLINES_URL = "https://newsapi.org/v2/top-headlines";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

// Try models in order — stops at the first one that succeeds
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.0-pro",
];
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Pakistan-specific sources
const PK_DOMAINS =
  "dawn.com,tribune.com.pk,thenews.com.pk,geo.tv,arynews.tv,brecorder.com,nation.com.pk,dailytimes.com.pk,samaa.tv";
const PK_GENERAL_KEYWORD =
  "Pakistan OR Islamabad OR Karachi OR Lahore OR Peshawar OR Quetta OR Sindh OR Punjab";

// Top global English-language sources (Times Square, US, world news, etc.)
const GLOBAL_DOMAINS =
  "bbc.com,reuters.com,apnews.com,cnn.com,theguardian.com,nytimes.com,washingtonpost.com,bloomberg.com,aljazeera.com,nbcnews.com,foxnews.com,abcnews.go.com,cbsnews.com,usatoday.com,time.com,newsweek.com";

const FETCH_TIMEOUT_MS = 9000;

// ─── Query scope detection ────────────────────────────────────────────────────

/** Returns true when the query is clearly about Pakistan or Urdu context */
function isPakistanQuery(msg) {
  const lower = msg.toLowerCase();
  return [
    "pakistan", "islamabad", "karachi", "lahore", "peshawar", "quetta",
    "sindh", "punjab", "balochistan", "kpk", "pti", "pmln", "ppp",
    "imran khan", "nawaz", "shehbaz", "bilawal", "rupee", "pkr",
    "geo tv", "ary news", "dawn news", "samaa", "dunya", "hum news",
    "کراچی", "اسلام آباد", "لاہور", "پاکستان",
  ].some((t) => lower.includes(t));
}

/** Returns true when the query is about US / Times Square / international topics */
function isGlobalQuery(msg) {
  const lower = msg.toLowerCase();
  return [
    "times square", "new york", "nyc", "usa", "united states", "america",
    "washington", "white house", "trump", "biden", "harris", "congress",
    "wall street", "nasdaq", "dow jones", "federal reserve",
    "london", "uk ", "england", "paris", "france", "germany", "berlin",
    "beijing", "china", "russia", "moscow", "ukraine", "israel", "gaza",
    "iran", "saudi", "europe", "nato", "united nations",
    "world cup", "olympics", "oscars", "grammy", "emmy", "super bowl",
    "elon musk", "tesla", "spacex", "apple", "google", "microsoft",
    "bitcoin", "crypto", "ethereum", "stock market",
    "global news", "international news", "world news", "breaking news",
    "fox news", "cnn", "bbc", "reuters", "ap news",
  ].some((t) => lower.includes(t));
}

// ─── Greeting detector ────────────────────────────────────────────────────────

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
      ? "Walaikum Assalam! Main Pulse News Assistant hoon — aapka intelligent news companion. Aap mujhse kuch bhi pooch sakte hain: Times Square events, world news, Pakistan politics, sports, tech, entertainment, ya business. Urdu, Roman Urdu, ya English — kisi bhi language mein!"
      : "Hello! I'm Pulse News Assistant — your intelligent, mature news companion. You can ask me about anything: Times Square events, global politics, Pakistan news, sports, technology, entertainment, business, or any breaking story from around the world. I'll give you a detailed, well-rounded answer. What would you like to know?";
    return { isGreeting: true, answer };
  }
  return { isGreeting: false };
}

// ─── Timeout helper ───────────────────────────────────────────────────────────

function makeController(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

// ─── Article normaliser ───────────────────────────────────────────────────────

function normaliseArticles(raw) {
  return (raw || [])
    .filter((a) => a.title && a.title !== "[Removed]")
    .map((a, i) => ({
      id: `${a.url}-${i}`,
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.urlToImage,
      source: a.source?.name || "Unknown source",
      publishedAt: a.publishedAt,
    }));
}

// ─── News fetchers ────────────────────────────────────────────────────────────

async function fetchTopHeadlines(globalMode) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  let url;
  if (globalMode) {
    // Use top-headlines endpoint for global/US news
    const params = new URLSearchParams();
    params.set("language", "en");
    params.set("pageSize", "10");
    url = `${TOP_HEADLINES_URL}?${params}`;
  } else {
    // Use everything endpoint with PK domains
    const params = new URLSearchParams();
    params.set("domains", PK_DOMAINS);
    params.set("q", PK_GENERAL_KEYWORD);
    params.set("language", "en");
    params.set("sortBy", "publishedAt");
    params.set("pageSize", "10");
    url = `${NEWS_BASE_URL}?${params}`;
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
      console.error("Chatbot: NewsAPI top-headlines failed:", res.status);
      return [];
    }
    const data = await res.json();
    return normaliseArticles(data.articles);
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: NewsAPI top-headlines errored:", err.message || err);
    return [];
  }
}

async function fetchArticles({ query, from, globalMode }) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  if (!query) return fetchTopHeadlines(globalMode);

  const params = new URLSearchParams();
  params.set("q", query);
  params.set("from", from);
  params.set("language", "en");
  params.set("sortBy", "publishedAt");
  params.set("pageSize", "10");

  // Route to appropriate domain pool
  if (globalMode) {
    params.set("domains", GLOBAL_DOMAINS);
  } else if (isPakistanQuery(query)) {
    params.set("domains", PK_DOMAINS);
  }
  // else: no domain filter → broadest possible search

  const { controller, timeout } = makeController(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error("Chatbot: NewsAPI request failed:", res.status);
      return [];
    }
    const data = await res.json();
    let results = normaliseArticles(data.articles);

    // If domain-restricted search returned nothing, retry without domain filter
    if (results.length === 0 && params.has("domains")) {
      params.delete("domains");
      try {
        const res2 = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
          headers: { "X-Api-Key": apiKey },
          cache: "no-store",
        });
        if (res2.ok) {
          const data2 = await res2.json();
          results = normaliseArticles(data2.articles);
        }
      } catch { /* ignore fallback error */ }
    }
    return results;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: NewsAPI fetch failed:", err.message || err);
    return [];
  }
}

async function fetchVideos({ query, from, globalMode }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  // Build a smart search query
  let searchQuery = query || (globalMode ? "world news today" : "Pakistan top news today");
  if (query?.toLowerCase().includes("times square")) {
    searchQuery = "Times Square New York latest news";
  }

  const params = new URLSearchParams();
  params.set("part", "snippet");
  params.set("q", searchQuery);
  params.set("type", "video");
  params.set("order", "date");
  params.set("maxResults", "10");
  params.set("publishedAfter", from);
  if (!globalMode) params.set("regionCode", "PK");
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
      console.error("Chatbot: YouTube request failed:", res.status);
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

// ─── Gemini caller with model fallback chain ──────────────────────────────────

async function askGemini({ question, articles, videos, globalMode }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "The Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file. You can still browse the related articles and videos shown below.";
  }

  const articleListing = articles.length
    ? articles
        .map(
          (a, i) =>
            `${i + 1}. [${a.source}] ${a.title}${a.description ? ` — ${a.description}` : ""}`
        )
        .join("\n")
    : "(no matching articles found)";

  const videoListing = videos.length
    ? videos.map((v, i) => `${i + 1}. [${v.channel}] ${v.title}`).join("\n")
    : "(no matching videos found)";

  const scopeNote = globalMode
    ? "This is a GLOBAL news query. The user is asking about international or US-based news (e.g., Times Square, world politics, global finance, entertainment). Prioritize global sources and give a comprehensive, world-aware answer."
    : "This app serves Pakistani and international users. Prioritize Pakistan-relevant context when available, but address international dimensions if the user's question warrants it.";

  const prompt = `You are "Pulse Assistant" — a sophisticated, mature, and highly knowledgeable news AI embedded in the Pulse news platform. Your role is to provide well-rounded, accurate, and insightful responses about any news topic anywhere in the world: Times Square events, US news, Pakistan news, global politics, sports, entertainment, technology, business, health, science, or any other subject.

STRICT RULES YOU MUST FOLLOW:
1. Detect the exact language the user wrote in (English, Urdu, Roman Urdu, or any other) and reply exclusively in that same language. Never switch languages unless the user does first.
2. Give a MATURE, DETAILED, and PROFESSIONAL answer — aim for 3 to 6 well-constructed informative sentences. Do NOT give a one-word or vague reply.
3. Directly address the user's specific question. If they ask about Times Square, answer about Times Square. If they ask about Pakistan elections, answer about Pakistan elections.
4. You may synthesize, contextualize, and elaborate on the provided articles and videos, but do NOT invent events, quotes, or statistics that are not referenced in the sources.
5. If the provided articles/videos lack sufficient detail, honestly acknowledge this and share relevant background context you know from your training, then invite the user to refine their search.
6. Write in natural, conversational prose — no markdown headings, no bullet points, no numbered lists. Sound like a knowledgeable journalist or analyst, not a generic AI chatbot.
7. Never be dismissive. Every query deserves a thoughtful, substantive answer.

${scopeNote}

User's question: "${question}"

Available Articles:
${articleListing}

Available Videos:
${videoListing}

Write your mature, informative response below:`;

  // Try each model in the fallback chain until one succeeds
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
        console.error(`Chatbot: Gemini [${model}] failed:`, res.status, errText.slice(0, 200));
        // Auth errors → no point trying other models
        if (res.status === 401 || res.status === 403) {
          return "The Gemini API key appears to be invalid or expired. Please update GEMINI_API_KEY in .env.local. You can still browse the related news shown below.";
        }
        // Model not found or bad request → try next model
        continue;
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      if (text.trim()) return text.trim();
      continue; // empty response → try next model

    } catch (err) {
      clearTimeout(timeout);
      console.error(`Chatbot: Gemini [${model}] errored:`, err.message || err);
      continue; // timeout or network error → try next model
    }
  }

  // All models failed — compose a graceful fallback from article titles
  if (articles.length > 0) {
    const summary = articles
      .slice(0, 3)
      .map((a) => `"${a.title}" (${a.source})`)
      .join("; ");
    return `I wasn't able to reach the AI right now, but here are the top stories I found for you: ${summary}. Please browse the full articles and videos below for complete coverage.`;
  }

  return "I couldn't generate an AI response at this moment, and no matching articles were found for your query. Try rephrasing — for example, 'Times Square New Year event', 'latest Times Square news', or 'Times Square today' — and I'll do my best to find relevant coverage.";
}

// ─── POST handler ─────────────────────────────────────────────────────────────

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

  // Handle greetings without calling any external APIs
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

  // Determine if this is a global query (Times Square, US, world) or local (Pakistan)
  const globalMode = isGlobalQuery(message) && !isPakistanQuery(message);

  const { from, cleanedMessage } = parseTimeWindow(message);
  const query = sanitizeQuery(cleanedMessage);

  const [articles, videos] = await Promise.all([
    fetchArticles({ query, from, globalMode }),
    fetchVideos({ query, from, globalMode }),
  ]);

  const answer = await askGemini({ question: message, articles, videos, globalMode });

  return NextResponse.json({ answer, articles, videos, query, from, globalMode });
}