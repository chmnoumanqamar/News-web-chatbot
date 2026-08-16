# Pulse — News SaaS App

A real Next.js news app with a live-updating ticker, animated cards, category
browsing, search, and a saved reading list. Built with the "Slate / Oatmeal /
Coral / Sea / Umber / Chartreuse" palette (Slate used sparingly as an accent,
not the base color).

## What's inside

- **Next.js 14 (App Router)** — one project, frontend + backend both
- **NewsAPI.org** integration via a server-side API route (`app/api/news/route.js`)
  so your API key never reaches the browser
- **Live feed** — headlines auto-refresh every 3 minutes, plus a manual
  refresh button and a scrolling "Live" ticker bar
- **Animations** — Framer Motion card entrances/hover, animated modal, sliding
  bookmarks drawer, shimmer skeleton loaders while data is loading
- Category tabs (Top, Tech, Business, Sport, Culture, Health, Science)
- Search across all news
- **Pakistan / Global toggle** — defaults to Pakistan headlines, switch to
  Global for worldwide coverage
- Reading list (bookmarks) saved in the browser (`localStorage`)
- Fully responsive, keyboard-focus visible, respects reduced-motion

## A note on search

NewsAPI (and most news APIs) match **keywords**, not full sentences. A
search like "11:00 AM live news of pakistan" won't match much, because
"11:00 AM" isn't a word that appears in article text. This app now:

- automatically strips filler words and clock times before searching
  (`lib/searchUtils.js`)
- retries with a single stronger keyword if the first search comes back
  empty
- for best results, just type the 1–3 words that matter: `"Pakistan floods"`,
  `"PSL final"`, `"budget 2026"`

## 1. Get your news API key (do this first)

This app pulls real headlines from **NewsAPI.org**.

1. Go to **https://newsapi.org/register**
2. Sign up with your email (free), verify it
3. Copy the API key from your dashboard (https://newsapi.org/account)

Free plan = 100 requests/day, which is enough for development. It only works
from `localhost` on the free plan for direct browser calls — but since this
app calls NewsAPI from the **server** (the `/api/news` route), you won't hit
that restriction even after you deploy.

## 2. Set up the project

```bash
npm install
```

Copy the env example and paste in your real key:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and replace the placeholder:

```
NEWS_API_KEY=your_actual_key_here
```

## 3. Run it

```bash
npm run dev
```

Open http://localhost:3000

## 4. Deploy (optional)

Easiest: push this folder to GitHub, import it on **vercel.com**, and add the
`NEWS_API_KEY` environment variable in the Vercel project settings (Settings
→ Environment Variables). Vercel builds Next.js apps natively — no extra
config needed.

## Project structure

```
app/
  api/news/route.js   ← server route, calls NewsAPI.org, hides your key
  layout.js            ← fonts + global HTML shell
  page.js               ← main page, wires everything together
  globals.css
components/
  Header.js            ← logo, search, category tabs, bookmarks button
  Ticker.js            ← the scrolling "Live" headline bar
  ArticleCard.js        ← individual news card
  ArticleGrid.js        ← grid layout + loading/error/empty states
  ArticleModal.js        ← article detail popup
  BookmarksDrawer.js     ← saved-articles side panel
  SkeletonCard.js        ← shimmer loading placeholder
  LiveStatusBar.js       ← "Updated at ..." + refresh button
  Footer.js
lib/
  useNews.js            ← fetching + auto-refresh polling logic
  useBookmarks.js         ← localStorage bookmarks
  categories.js           ← category list + "time ago" helper
```

## Notes / next steps

- To add real SaaS pieces later (login, paid plans), you'd add an auth
  provider (e.g. NextAuth or Clerk) and Stripe — the current structure
  (server API route pattern) is ready for that, it's just not built yet
  since you said to skip it for now.
- The free NewsAPI plan has a 100 req/day cap — the 3-minute auto-refresh
  is tuned to stay well under that for normal use. If you add more users,
  you'll want to upgrade the NewsAPI plan or add server-side caching.
