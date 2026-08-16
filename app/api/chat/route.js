import { NextResponse } from "next/server";
import { sanitizeQuery } from "@/lib/searchUtils";
import { parseTimeWindow } from "@/lib/timeParse";

// The chatbot widget calls this route with the user's question. It:
//  1. Checks if the message is a simple greeting ("hi", "hello", "aoa", ...)
//  2. Works out a time window from the question ("aaj", "last 2 hours", ...)
//  3. Pulls matching articles from NewsAPI (up to 10)
//  4. Hands both to Gemini 3.6 Flash, which writes the actual chat reply
//
// Articles + videos (up to 10 each) are returned alongside the reply so the UI
// can show them both inside the chat bubble AND in the main page's "AI results"
// strip — that second part happens in app/page.js, not here.

const NEWS_BASE_URL = "https://newsapi.org/v2/everything";
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const PK_DOMAINS =
  "dawn.com,tribune.com.pk,thenews.com.pk,geo.tv,arynews.tv,brecorder.com,nation.com.pk,dailytimes.com.pk,samaa.tv";
const PK_GENERAL_KEYWORD =
  "Pakistan OR Islamabad OR Karachi OR Lahore OR Peshawar OR Quetta OR Sindh OR Punjab";

const FETCH_TIMEOUT_MS = 9000;

function checkGreeting(message) {
  const clean = message.trim().toLowerCase().replace(/[^\w\s]/g, "");
  const GREETINGS = new Set([
    "hi", "hello", "hey", "hola", "hy", "hie", "heya", "yo",
    "aoa", "salam", "assalam", "assalamoalaikum", "assalamualaykum", "assalam o alaikum",
    "kaise ho", "kya hal hai", "kya haal hai", "kia hal hai", "how are you",
    "good morning", "good evening", "good afternoon", "good night", "greetings",
    "who are you", "tum kaun ho", "aap kaun ho", "help"
  ]);

  if (GREETINGS.has(clean) || clean.length <= 2) {
    const isUrdu = /salam|aoa|kaise|kia|kya|hal|haal|ap|aap|tum/.test(clean);
    const answer = isUrdu
      ? "Walaikum Assalam! Main Pulse News Assistant hoon. Aap mujhse kisi bhi news ya topic ke baare me pooch sakte hain, jaise 'today's cricket news', 'Pakistan politics', ya 'latest tech updates'."
      : "Hello! I am Pulse News Assistant. How can I help you today? Feel free to ask me about any news topic — for example, 'today's cricket news', 'Pakistan updates', or 'latest tech news'.";
    return { isGreeting: true, answer };
  }
  return { isGreeting: false };
}

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

async function fetchTopHeadlines() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams();
  params.set("domains", PK_DOMAINS);
  params.set("q", PK_GENERAL_KEYWORD);
  params.set("language", "en");
  params.set("sortBy", "publishedAt");
  params.set("pageSize", "10");

  const { controller, timeout } = withTimeout(null, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Chatbot: NewsAPI top-headlines failed:", res.status, errText.slice(0, 300));
      return [];
    }
    const data = await res.json();
    return (data.articles || [])
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
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: NewsAPI top-headlines errored:", err.message || err);
    return [];
  }
}

async function fetchArticles({ query, from }) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  if (!query) return fetchTopHeadlines();

  const params = new URLSearchParams();
  params.set("q", query);
  params.set("from", from);
  params.set("language", "en");
  params.set("sortBy", "publishedAt");
  params.set("pageSize", "10");

  const { controller, timeout } = withTimeout(null, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${NEWS_BASE_URL}?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Chatbot: NewsAPI request failed:", res.status, errText.slice(0, 300));
      return [];
    }
    const data = await res.json();
    return (data.articles || [])
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
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: NewsAPI fetch failed:", err.message || err);
    return [];
  }
}

async function fetchVideos({ query, from }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams();
  params.set("part", "snippet");
  params.set("q", query || "Pakistan top news today");
  params.set("type", "video");
  params.set("order", "date");
  params.set("maxResults", "10");
  params.set("publishedAfter", from);
  params.set("regionCode", "PK");
  params.set("relevanceLanguage", "en");
  params.set("key", apiKey);

  const { controller, timeout } = withTimeout(null, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text();
      console.error("Chatbot: YouTube request failed:", res.status, errText.slice(0, 300));
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

async function askGemini({ question, articles, videos }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Gemini API key is not set (add GEMINI_API_KEY in .env.local) — so I'm just showing the articles found below.";
  }

  const articleListing = articles.length
    ? articles
        .map((a, i) => `${i + 1}. [${a.source}] ${a.title} — ${a.description || ""}`)
        .join("\n")
    : "(no matching articles found)";

  const videoListing = videos.length
    ? videos.map((v, i) => `${i + 1}. [${v.channel}] ${v.title}`).join("\n")
    : "(no matching videos found)";

  const prompt = `You are the news assistant inside "Pulse", a Pakistan-based news app. Answer the user's question using ONLY the articles and videos listed below as your source of truth — don't invent facts beyond them. Detect the language the user asked their question in (English, Urdu, Roman Urdu, or any other language) and reply fluently in that SAME language — this app's UI defaults to English, but you must always match the user's own language. Unless the user's question clearly names a different country or region, prefer articles/videos relevant to Pakistan when several are available. Keep it short: 2-5 sentences, conversational, no headings or markdown.

User question: "${question}"

Articles:
${articleListing}

Videos:
${videoListing}

If nothing relevant was found, say so plainly in the user's language and suggest they try a different phrasing.`;

  const { controller, timeout } = withTimeout(null, FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Chatbot: Gemini request failed:", res.status, errText.slice(0, 300));
      return "Couldn't get a reply from Gemini, but you can check the related news below.";
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    return text.trim() || "No answer could be generated right now — check the related news below.";
  } catch (err) {
    clearTimeout(timeout);
    console.error("Chatbot: Gemini call errored:", err.message || err);
    return "There was an issue reaching Gemini, but you can check the related news below.";
  }
}

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

  const { from, cleanedMessage } = parseTimeWindow(message);
  const query = sanitizeQuery(cleanedMessage);

  const [articles, videos] = await Promise.all([
    fetchArticles({ query, from }),
    fetchVideos({ query, from }),
  ]);

  const answer = await askGemini({ question: message, articles, videos });

  return NextResponse.json({ answer, articles, videos, query, from });
}