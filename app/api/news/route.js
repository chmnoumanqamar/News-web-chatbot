import { NextResponse } from "next/server";
import { sanitizeQuery } from "@/lib/searchUtils";
import { countryMeta } from "@/lib/countries";
import { getEditorialFallback } from "@/lib/newsImages";

// This route runs on the server only, so the NEWS_API_KEY (and, if set,
// ANTHROPIC_API_KEY) never reach the browser. All client components call
// /api/news, never NewsAPI.org or Anthropic directly.

const BASE_URL = "https://newsapi.org/v2";

// IMPORTANT: NewsAPI's free plan now restricts /v2/top-headlines so the
// `country` param only accepts "us" (see https://newsapi.org/docs/endpoints/top-headlines).
// That means country=pk (or any country besides us) silently fails/returns
// nothing, which is why category tabs and the Pakistan/Global toggle used
// to look broken (everything collapsed to the same generic US feed).
//
// Fix: browse by category/country through /v2/everything instead, using a
// curated domain list per country plus a keyword per category. /everything
// isn't restricted by country the same way, so this works on the free plan.

const CATEGORY_KEYWORDS = {
  general: null,
  technology: "technology OR tech OR software OR AI",
  business: "business OR economy OR markets OR finance",
  sports: "sports OR cricket OR football OR match OR tournament",
  entertainment: "entertainment OR celebrity OR movie OR music OR drama",
  health: "health OR medicine OR disease OR hospital",
  science: "science OR research OR space OR discovery",
};

// Pakistani news sites' NewsAPI feeds also carry syndicated wire content
// (celebrity/entertainment pieces, generic world stories) that has nothing
// to do with Pakistan itself, which is why "Top" could show things like a
// years-old Taylor Swift anniversary post from Daily Times. For the
// general/"Top" tab on the Pakistan toggle, bias the query so it actually
// has to be about Pakistan.
//
// IMPORTANT: avoid ambiguous short forms here. "PTI" is also the standard
// byline for Press Trust of India (used on nearly every Indian news wire
// story), and bare "Punjab" matches India's Punjab state too — both were
// silently flooding the "Pakistan" feed with Indian articles. Use full
// party names instead of acronyms, and drop the ambiguous bare state name.
const PK_GENERAL_KEYWORD =
  'Pakistan OR Islamabad OR Karachi OR Lahore OR Peshawar OR Quetta OR Sindh OR "Pakistan Tehreek-e-Insaf" OR "Pakistan Muslim League" OR "Pakistan Peoples Party"';

const PK_DOMAINS =
  "dawn.com,tribune.com.pk,thenews.com.pk,geo.tv,arynews.tv,brecorder.com,nation.com.pk,dailytimes.com.pk,samaa.tv";

// Common Indian outlets that otherwise slip into "Pakistan" results via
// syndicated/wire content or ambiguous keyword matches. Excluded whenever
// the selected country isn't India itself.
const INDIAN_DOMAINS_TO_EXCLUDE =
  "timesofindia.indiatimes.com,indiatimes.com,ndtv.com,hindustantimes.com,indianexpress.com,news18.com,indiatoday.in,livemint.com,thehindu.com,zeenews.india.com";

// Curated international wire/broadcast sources for the "Global" option.
const GLOBAL_DOMAINS =
  "bbc.co.uk,cnn.com,reuters.com,apnews.com,theguardian.com,nytimes.com,skynews.com,independent.co.uk,cbsnews.com,aljazeera.com";

// For any country besides Pakistan (which has the curated PK_DOMAINS list
// above), bias the search toward that country by name + demonym instead
// of a domain list — e.g. "India OR Indian" — since NewsAPI's free plan
// doesn't support real per-country top-headlines and we don't maintain a
// curated domain list for every country in the selector.
function countryKeyword(country) {
  const meta = countryMeta(country);
  if (!meta) return null;
  return meta.demonym && meta.demonym !== meta.name
    ? `${meta.name} OR ${meta.demonym}`
    : meta.name;
}

function categoryKeyword(category, country) {
  if (category === "general" && country === "pk") return PK_GENERAL_KEYWORD;
  if (category === "general" && country === "global") return null;
  if (category === "general" && country !== "pk") {
    return countryKeyword(country) || CATEGORY_KEYWORDS.general;
  }
  const catKw = CATEGORY_KEYWORDS[category] ?? null;
  if (country === "global") return catKw;
  if (!catKw) return countryKeyword(country);
  if (country === "pk") return catKw;
  const cKw = countryKeyword(country);
  return cKw ? `(${catKw}) AND (${cKw})` : catKw;
}

function buildEverythingUrl({ domains, excludeDomains, keyword, page }) {
  const params = new URLSearchParams();
  if (domains) params.set("domains", domains);
  if (excludeDomains) params.set("excludeDomains", excludeDomains);
  if (keyword) params.set("q", keyword);
  params.set("language", "en");
  params.set("sortBy", "publishedAt");
  params.set("pageSize", "40");
  params.set("page", page);
  return `${BASE_URL}/everything?${params.toString()}`;
}

// NewsAPI's free "Developer" plan quota is small (100 requests/day). The
// live-refresh polling plus fast tab/toggle switching during normal use
// can burn through that quickly and then every request starts failing for
// the rest of the day. A short in-memory cache means repeat requests for
// the same tab/toggle within CACHE_TTL_MS are served from memory instead
// of hitting NewsAPI (and re-running the model curation below) again.
// This resets whenever the dev server restarts, which is fine — it only
// needs to survive between polls/tab switches.
const CACHE_TTL_MS = 90 * 1000;
const cache = new Map();

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  cache.set(key, { value, time: Date.now() });
}

// --- AI curation ------------------------------------------------------
//
// Domain/keyword filtering narrows things down, but it still lets through
// syndicated wire pieces that technically match (e.g. an old celebrity
// story republished by a Pakistani outlet). Claude reviews the fetched
// batch and picks out the articles that are genuinely current and
// relevant to the requested category/country, filtering out stale or
// off-topic syndicated filler. This is optional: if ANTHROPIC_API_KEY
// isn't set, or the call fails or times out, the route just falls back to
// the plain NewsAPI ordering — curation never blocks the feed.

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const CURATION_TIMEOUT_MS = 8000;
const MIN_CURATED_RESULTS = 4;

async function curateArticles(articles, { category, country, isSearch }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || articles.length === 0) return articles;

  const listing = articles
    .map((a, i) => {
      const daysOld = a.publishedAt
        ? Math.floor((Date.now() - new Date(a.publishedAt).getTime()) / 86400000)
        : null;
      return `${i}. [${a.source}, ${daysOld === null ? "unknown age" : `${daysOld}d old`}] ${a.title} — ${(a.description || "").slice(0, 140)}`;
    })
    .join("\n");

  const scope = isSearch
    ? "a search result feed"
    : country === "pk"
    ? `the "${category}" section of a Pakistani news app`
    : country === "global"
    ? `the "${category}" section of a global/international news app (BBC, CNN, Reuters, AP, Guardian, etc.)`
    : `the "${category}" section of a global news app, focused on ${countryMeta(country)?.name || "that country"}`;

  const prompt = `You are curating ${scope}. Below is a numbered list of candidate articles (source, age, title, snippet).

Pick the articles that are genuinely current, substantive, and on-topic for this section — drop stale syndicated filler, duplicate stories, and anything clearly off-topic for the section. ${
    country === "pk" && !isSearch
      ? "For a Pakistani section, prioritize articles actually about Pakistan over generic wire content merely republished by a Pakistani outlet."
      : ""
  }

Return ONLY a JSON array of the chosen indices, ordered from most to least important, nothing else. Keep at least ${Math.min(
    MIN_CURATED_RESULTS,
    articles.length
  )} articles unless truly nothing qualifies.

Articles:
${listing}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CURATION_TIMEOUT_MS);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return articles;

    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = text.match(/\[[\d,\s]*\]/);
    if (!match) return articles;

    const indices = JSON.parse(match[0]).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < articles.length
    );

    if (indices.length < Math.min(MIN_CURATED_RESULTS, articles.length)) {
      return articles;
    }

    return indices.map((i) => articles[i]);
  } catch (err) {
    // Timeout, network error, or unparseable response — never let curation
    // failure break the feed itself.
    console.error("Article curation skipped:", err.message || err);
    return articles;
  }
}

export async function GET(request) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === "your_newsapi_org_key_here") {
    return NextResponse.json(
      {
        error:
          "Missing NEWS_API_KEY. Add your free key from https://newsapi.org/register to .env.local",
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "general";
  const query = searchParams.get("q");
  const page = searchParams.get("page") || "1";
  const country = searchParams.get("country") || "pk";
  const isSearch = Boolean(query && query.trim().length > 0);

  let url;
  let sanitized;
  if (isSearch) {
    sanitized = sanitizeQuery(query);
    const excludeDomains = country === "in" ? undefined : INDIAN_DOMAINS_TO_EXCLUDE;
    url = buildEverythingUrl({ keyword: sanitized, excludeDomains, page });
  } else {
    const domains =
      country === "pk" ? PK_DOMAINS : country === "global" ? GLOBAL_DOMAINS : undefined;
    const excludeDomains = country === "in" ? undefined : INDIAN_DOMAINS_TO_EXCLUDE;
    const keyword = categoryKeyword(category, country);
    url = buildEverythingUrl({ domains, excludeDomains, keyword, page });
  }

  const cacheKey = url;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const fetchArticles = async (targetUrl) => {
    const res = await fetch(targetUrl, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
    });

    // Don't assume the response is JSON. NewsAPI (or a proxy/CDN in front
    // of it) can return an HTML error/block page when rate-limited or
    // having an outage, and calling res.json() on that throws — which used
    // to surface as an opaque "could not reach the news service" error.
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        status: "error",
        message: raw.slice(0, 200) || "Non-JSON response from NewsAPI.",
      };
    }
    return { res, data };
  };

  try {
    let { res, data } = await fetchArticles(url);

    if (!res.ok) {
      // 426/429/401 from NewsAPI on the free plan almost always means the
      // small daily request quota has been used up for today.
      const likelyQuota = [401, 426, 429].includes(res.status);
      return NextResponse.json(
        {
          error: likelyQuota
            ? "NewsAPI's free-plan daily request limit has likely been reached. Wait a bit (quota resets daily) or check https://newsapi.org/account."
            : data.message || "Failed to fetch news.",
        },
        { status: res.status }
      );
    }

    let usedFallback = false;

    // NewsAPI's free-plan index for smaller regional (Pakistani) domains is
    // often very sparse — a domains+keyword combo can legitimately match
    // just one or two articles even though the request itself succeeded.
    // The old check only widened the search when the result was completely
    // empty (length === 0), so a "technically non-empty" but tiny response
    // (e.g. 1 article) slipped through and that single article was all the
    // user ever saw. Trigger the same broaden-and-merge fallback whenever
    // the domain-restricted result is thin, not just when it's empty, and
    // MERGE the two result sets (deduped by url) instead of throwing the
    // original away, so we keep growing the pool instead of swapping it.
    const MIN_ACCEPTABLE_RESULTS = 8;

    if ((data.articles?.length || 0) < MIN_ACCEPTABLE_RESULTS && !isSearch) {
      const keyword =
        categoryKeyword(category, country) ||
        (country !== "global" ? countryKeyword(country) : null) ||
        "world news";
      const excludeDomains = country === "in" ? undefined : INDIAN_DOMAINS_TO_EXCLUDE;
      const fallbackUrl = buildEverythingUrl({ keyword, excludeDomains, page });
      const fallback = await fetchArticles(fallbackUrl);
      if (fallback.res.ok && fallback.data.articles?.length > 0) {
        const seen = new Set((data.articles || []).map((a) => a.url));
        const merged = [
          ...(data.articles || []),
          ...fallback.data.articles.filter((a) => !seen.has(a.url)),
        ];
        data = { ...fallback.data, articles: merged };
        usedFallback = true;
      }
    }

    // A sanitized multi-word search can still come back thin (NewsAPI's
    // free tier index isn't huge). Retry once with just the last, usually
    // most specific, keyword and merge in anything new before giving up.
    if (
      (data.articles?.length || 0) < MIN_ACCEPTABLE_RESULTS &&
      isSearch &&
      sanitized &&
      sanitized.includes(" ")
    ) {
      const lastWord = sanitized.trim().split(/\s+/).pop();
      const excludeDomains = country === "in" ? undefined : INDIAN_DOMAINS_TO_EXCLUDE;
      const fallbackUrl = buildEverythingUrl({ keyword: lastWord, excludeDomains, page });
      const fallback = await fetchArticles(fallbackUrl);
      if (fallback.res.ok && fallback.data.articles?.length > 0) {
        const seen = new Set((data.articles || []).map((a) => a.url));
        const merged = [
          ...(data.articles || []),
          ...fallback.data.articles.filter((a) => !seen.has(a.url)),
        ];
        data = { ...fallback.data, articles: merged };
        usedFallback = true;
      }
    }

    // Merging the primary + fallback batches can interleave older
    // (fallback) articles ahead of fresher ones, or the domain-restricted
    // batch itself can front-load a stale item if that domain's crawl
    // lagged. Always re-sort the final set by publish date, newest first,
    // so the freshest article is always what the user sees first.
    if (Array.isArray(data.articles)) {
      data.articles = [...data.articles].sort(
        (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
      );
    }

    let articles = (data.articles || [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a, i) => ({
        id: `${a.url}-${i}`,
        title: a.title,
        description: a.description,
        content: a.content,
        url: a.url,
        image: a.urlToImage || getEditorialFallback(a.title, category, i),
        source: a.source?.name || "Unknown source",
        author: a.author,
        publishedAt: a.publishedAt,
        category,
      }));

    articles = await curateArticles(articles, { category, country, isSearch });

    const responseBody = {
      articles,
      totalResults: data.totalResults || 0,
      usedFallback,
    };
    setCached(cacheKey, responseBody);

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("NewsAPI request failed:", err);
    return NextResponse.json(
      { error: "Could not reach the news service. Try again in a moment." },
      { status: 502 }
    );
  }
}