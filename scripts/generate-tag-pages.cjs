#!/usr/bin/env node
/**
 * scripts/generate-tag-pages.cjs
 *
 * CommonJS tag page generator (mirrors generate-tag-pages.js but
 * written as a .cjs entry to satisfy ESM/CJS build environments).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_URL  = 'https://play.poki2.online';
const SITE_NAME = 'Poki2';
const AUTHOR_ORG = {
  '@type': 'Organization',
  name:    'Poki2 Team',
  url:     `${BASE_URL}/`,
  sameAs:  ['https://github.com/hhool8/site-poki2-play'],
};
const TODAY = new Date().toISOString().slice(0, 10);

// Wikipedia citation + short attributed definition per category (AI-answer
// optimization: question-style headings, answer-first text, named sources).
const WIKI = {
  action:      { title: 'Action game',        url: 'https://en.wikipedia.org/wiki/Action_game',        quote: 'a video game genre that emphasizes physical challenges, including hand–eye coordination and reaction time' },
  puzzle:      { title: 'Puzzle video game',  url: 'https://en.wikipedia.org/wiki/Puzzle_video_game',  quote: 'a genre of video games that emphasize puzzle solving and test problem-solving skills, including logic, pattern recognition and word completion' },
  adventure:   { title: 'Adventure game',     url: 'https://en.wikipedia.org/wiki/Adventure_game',     quote: 'a video game genre in which the player assumes the role of a protagonist in an interactive story driven by exploration and puzzle-solving' },
  racing:      { title: 'Racing video game',  url: 'https://en.wikipedia.org/wiki/Racing_video_game',  quote: 'a video game genre in which the player takes part in a racing competition with any type of land, air or sea vehicles' },
  shooting:    { title: 'Shooter game',       url: 'https://en.wikipedia.org/wiki/Shooter_game',       quote: 'a video game subgenre in which the focus is on weapons-based combat, with testing reflexes and spatial awareness' },
  multiplayer: { title: 'Multiplayer video game', url: 'https://en.wikipedia.org/wiki/Multiplayer_video_game', quote: 'a video game in which more than one person can play in the same game environment at the same time' },
  competitive: { title: 'Esports',            url: 'https://en.wikipedia.org/wiki/Esports',            quote: 'a form of organized, multiplayer video game competition between players, often for prizes and rankings' },
  strategy:    { title: 'Strategy video game', url: 'https://en.wikipedia.org/wiki/Strategy_video_game', quote: 'a video game genre in which gameplay requires careful and skillful thinking and planning to achieve victory' },
  classic:     { title: 'Browser game',       url: 'https://en.wikipedia.org/wiki/Browser_game',       quote: 'a video game that is played in a web browser using a standard web-based technology stack, without requiring installation' },
  idle:        { title: 'Idle game',          url: 'https://en.wikipedia.org/wiki/Idle_game',          quote: 'a video game in which progress is achieved even when the player is not actively playing, often called incremental or clicker games' },
  arcade:      { title: 'Arcade game',        url: 'https://en.wikipedia.org/wiki/Arcade_game',        quote: 'a machine-arcade game genre traditionally defined by fast-paced, easy-to-learn gameplay built around chasing a high score' },
  sports:      { title: 'Sports video game',  url: 'https://en.wikipedia.org/wiki/Sports_video_game',  quote: 'a video game genre that simulates the practice of sports, including team sports, athletics and racing' },
  platformer:  { title: 'Platform game',      url: 'https://en.wikipedia.org/wiki/Platform_game',      quote: 'a video game genre in which the player controls a character who jumps and climbs between elevated platforms while avoiding obstacles' },
};
const DIST      = path.join(__dirname, '..', 'dist');
const GAMES     = path.join(__dirname, '..', 'games.json');
const MIN_GAMES  = 5;   // minimum games in a tag to warrant a page
const PAGE_SIZE  = 24;  // games per page — only paginate when total > PAGE_SIZE

const CRITICAL_CSS_PATH = path.join(__dirname, '..', 'css', 'critical.css');
let CRITICAL_CSS = '';
try {
  if (fs.existsSync(CRITICAL_CSS_PATH)) {
    CRITICAL_CSS = fs.readFileSync(CRITICAL_CSS_PATH, 'utf8');
  } else {
    CRITICAL_CSS = `html,body{height:100%}html:not(.css-ready) body{visibility:hidden;opacity:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f0f2f5;color:#1e1e2e;margin:0}h1, .hero-title{font-size:1.8rem;font-weight:800;margin:0 0 .5rem}p, .hero-sub{margin:0 0 1rem;opacity:.9} .hero{padding:28px 16px;text-align:center;color:#fff;background:linear-gradient(135deg,#009cff 0%,#6c3bff 100%)}.tag-intro{padding:12px 20px}html.has-js .tag-intro, html.has-js noscript, html.has-js #related-tags{display:none !important;visibility:hidden !important;}`;
  }
  } catch (e) {
  CRITICAL_CSS = `html:not(.css-ready) body{visibility:hidden;opacity:0}html.has-js .tag-intro, html.has-js noscript, html.has-js #related-tags{display:none !important;visibility:hidden !important;}`;
}

// ── Tag configuration ─────────────────────────────────────────────────────────
const TAG_CONFIG = {
  puzzle:      {
    label:    'Puzzle',
    headline: 'Free Online Puzzle Games',
    desc:     'Challenge your brain with the best free puzzle games online. Solve riddles, match tiles, and test your logic — all playable instantly in your browser.',
  },
  adventure:   {
    label:    'Adventure',
    headline: 'Free Online Adventure Games',
    desc:     'Embark on epic quests and explore unknown worlds in the best free adventure games online. Play instantly in your browser — no download or install required.',
  },
  shooting:    {
    label:    'Shooting',
    headline: 'Free Online Shooting Games',
    desc:     'Lock and load with the best free shooting games online. Aim, fire, and take down enemies in fast-paced action — playable in any browser on desktop and mobile.',
  },
  action:      {
    label:    'Action',
    headline: 'Free Online Action Games',
    desc:     'Dive into non-stop thrills with the best free action games online. Fast reflexes and epic battles await — all available to play instantly in your browser.',
  },
  racing:      {
    label:    'Racing',
    headline: 'Free Online Racing Games',
    desc:     'Hit the gas with the best free racing games online. Speed through challenging tracks, dodge rivals, and chase first place — playable instantly in your browser.',
  },
  sports:      {
    label:    'Sports',
    headline: 'Free Online Sports Games',
    desc:     'Compete in the best free online sports games — from basketball to soccer. Play solo or challenge opponents and climb the leaderboard. No download needed.',
  },
  strategy:    {
    label:    'Strategy',
    headline: 'Free Online Strategy Games',
    desc:     'Outthink your opponents with the best free strategy games online. Plan every move, manage resources, and dominate the battlefield. Play in your browser.',
  },
  multiplayer: {
    label:    'Multiplayer',
    headline: 'Free Online Multiplayer Games',
    desc:     'Play with or against friends in the best free multiplayer games online. Challenge real players worldwide in real time. No download, no install, just play.',
  },
  idle:        {
    label:    'Idle',
    headline: 'Free Online Idle & Clicker Games',
    desc:     'Sit back and let the numbers grow in the best free idle games online. Upgrade, automate, and unlock powerful boosts — instant play, no download required.',
  },
  arcade:      {
    label:    'Arcade',
    headline: 'Free Online Arcade Games',
    desc:     'Relive the golden age of gaming with the best free arcade games online. Simple controls, addictive gameplay, and high scores to chase. Play free now.',
  },
  platformer:  {
    label:    'Platformer',
    headline: 'Free Online Platformer Games',
    desc:     'Jump, run, and dodge through dangerous levels in the best free platformer games online. Classic side-scrolling action playable instantly in your browser.',
  },
  competitive: {
    label:    'Competitive',
    headline: 'Free Online Competitive Games',
    desc:     'Rise to the top in the best free competitive games online. Go head-to-head, prove your skills, and claim the number one spot. Play now in your browser.',
  },
  classic:     {
    label:    'Classic',
    headline: 'Free Online Classic Games',
    desc:     'Revisit the all-time greats in our classic games collection — timeless browser titles from the Flash era and beyond, all free to play instantly in your browser. No download, no install.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeHref(link) {
  try {
    const u = new URL(link);
    let p = u.pathname.replace(/\/+$/, '');
    if (!p) p = u.hostname.split('.')[0];
    return p.split('/').pop() || link;
  } catch { return link; }
}

function extractBody(htmlFile) {
  const src = fs.readFileSync(htmlFile, 'utf8');
  const m   = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) throw new Error(`Could not extract <body> from ${htmlFile}`);
  return { open: src.match(/<body([^>]*)>/i)[0], inner: m[1] };
}

// ── Page builder ──────────────────────────────────────────────────────────────
function buildTagPage(tag, cfg, games, bodyTag, bodyInner, allTags, allTagGames = games, listGames = allTagGames) {
  const tagBase = `${BASE_URL}/tag/${tag}/`;
  const pageUrl = tagBase;
  const title   = `${cfg.headline} — ${SITE_NAME}`;
  const _ogImgGame = allTagGames.find(g => g.featured && g.imgSrc) || allTagGames.find(g => g.imgSrc);
  const ogImg = _ogImgGame
    ? (_ogImgGame.imgSrc.startsWith('http') ? _ogImgGame.imgSrc : `${BASE_URL}${_ogImgGame.imgSrc}`)
    : `${BASE_URL}/assets/icon/icon-512.png`;

  // BreadcrumbList JSON-LD
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home',       item: `${BASE_URL}/` },
    { '@type': 'ListItem', position: 2, name: cfg.headline, item: tagBase },
  ];
  const breadcrumbLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: breadcrumbItems,
  });

  // CollectionPage + ItemList JSON-LD (include all games for this tag)
  const itemListLd = JSON.stringify({
    '@context':  'https://schema.org',
    '@type':     'CollectionPage',
    name:        cfg.headline,
    url:         pageUrl,
    description: cfg.desc,
    dateModified: TODAY,
    author:      AUTHOR_ORG,
    publisher:   { '@type': 'Organization', name: SITE_NAME, url: `${BASE_URL}/` },
    hasPart:     allTagGames.map((g, i) => {
      const slug  = normalizeHref(g.link);
      const char  = (slug && slug[0]) ? slug[0].toLowerCase() : '';
      let url = (g.link || '').toString();
      if (!/^https?:\/\//i.test(url)) {
        url = `${BASE_URL}/game/${char}/${slug}/`;
      } else {
        url = url.replace(/\/+$/, '');
      }
      return {
        '@type':    'ListItem',
        position:   i + 1,
        name:       g.title,
        url:        url,
      };
    }),
  });

  // Visible static game index (crawler-readable internal links + no-JS fallback).
  // Rendered as normal HTML (NOT <noscript>): Googlebot renders JS, and the
  // page's own defensive script strips <noscript> nodes, which used to erase
  // every game link from the rendered DOM. This section stays in the DOM.
  // listGames covers every tagged game incl. mobile-only titles.
  const gameListHtml = listGames.map(g => {
    const slug = normalizeHref(g.link);
    const char = slug[0].toLowerCase();
    const href = `/game/${char}/${slug}/`;
    return `      <li><a href="${esc(href)}">${esc(g.title)}</a></li>`;
  }).join('\n');
  const gameListSectionHtml = `<section class="tag-games" id="tag-games" aria-label="All ${esc(cfg.label)} games">
  <h2>All ${esc(cfg.label)} Games (${listGames.length})</h2>
  <ul>
${gameListHtml}
  </ul>
</section>`;

  // Featured games (short list at top). Matching rule: backend `featured === true` and a `badge` must exist.
  const featuredGames = allTagGames.filter(g => g.featured === true && g.badge);
  const featuredListHtml = featuredGames.map(g => {
    const slug = normalizeHref(g.link);
    const char = slug[0].toLowerCase();
    const href = `/game/${char}/${slug}/`;
    return `      <li><h3><a href="${esc(href)}">${esc(g.title)}</a></h3></li>`;
  }).join('\n');

  // Related categories (all other tags)
  const relatedTags = Object.entries(allTags).filter(([t]) => t !== tag);
  const relatedLinksHtml = relatedTags
    .map(([t, c]) => `<li><a href="/tag/${t}/"><img class="tag-icon" src="/icons/categories/${t}.svg" alt="${esc(c.label)}" width="20" height="20" style="vertical-align:middle;margin-right:8px"> ${esc(c.label)} Games</a></li>`)
    .join('\n        ');
  const relatedSectionHtml = `<section id="related-tags" class="related-tags-section">
  <h2>More Game Categories</h2>
  <ul class="related-tags-list">
    ${relatedTags.map(([t, c]) => `<li><a href="/tag/${t}/"><img class="tag-icon" src="/icons/categories/${t}.svg" alt="${esc(c.label)}" width="24" height="24" style="vertical-align:middle;margin-right:8px"> ${esc(c.label)}</a></li>`).join('\n    ')}
  </ul>
</section>`;

  // Replace SPA hero text with tag-specific H1 + first sentence of desc
  const heroSub = cfg.desc.split('.')[0] + '.';
  const totalCount = allTagGames.length;
  const pageCountNote = `Explore <strong>${totalCount}</strong> free ${esc(cfg.label)} games — no download required.`;
  const tagIntroHtml = `<section class="tag-intro">
              <p class="tag-intro-desc">${esc(cfg.desc)}</p>
              <p class="tag-intro-count">${pageCountNote}</p>
            </section>`;

  // ── AI-answer FAQ: question-style headings, answer-first text, citations ──
  const wiki = WIKI[tag] || null;
  const faqs = [];
  if (wiki) {
    faqs.push({
      q: `What are ${esc(cfg.label)} games?`,
      a: `<p>${esc(cfg.label)} games are games where ${esc(wiki.quote)}. According to <a href="${wiki.url}" rel="noopener" target="_blank">Wikipedia's "${esc(wiki.title)}"</a> article, the genre is defined exactly this way.</p>`,
    });
  }
  faqs.push({
    q: `Are ${esc(cfg.label)} games free on Poki2?`,
    a: `<p>Yes. All <strong>${totalCount}</strong> ${esc(cfg.label)} games listed on this page are completely free to play — no download, no installation and no account required. Just click a game and it runs instantly in your browser.</p>`,
  });
  faqs.push({
    q: `Can I play ${esc(cfg.label)} games on mobile?`,
    a: `<p>Yes. ${esc(cfg.label)} games on Poki2 run in any modern mobile browser and support touch controls (keyboard support is available on desktop). There is nothing to install.</p>`,
  });
  const faqHtml = `<section class="tag-faq" id="tag-faq">
  <h2>${esc(cfg.label)} Games — Frequently Asked Questions</h2>
  ${faqs.map(f => `  <div class="faq-item">
    <h3 class="faq-q">${f.q}</h3>
    ${f.a}
  </div>`).join('\n')}
</section>`;

  const faqLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name:    f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
    })),
  });
  const tagBodyInner = bodyInner
    .replace(
      '<p class="hero-title">What are you playing today?</p>',
      `<h1 class="hero-title"><img class="tag-icon" src="/icons/categories/${tag}.svg" alt="${esc(cfg.label)}" width="40" height="40" style="vertical-align:middle;margin-right:10px"> ${esc(cfg.headline)}</h1>`
    )
    .replace(
      '<p class="hero-sub">Discover free games. No downloads. Instant play.</p>',
      `<p class="hero-sub">${esc(heroSub)}</p>`
    )
    .replace(
      '<div id="game-sections"></div>',
      `<div id="game-sections"></div>\n\n${tagIntroHtml}\n\n${gameListSectionHtml}\n\n${faqHtml}`
    );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <!-- Google AdSense -->
  <script>window.adsbygoogle = window.adsbygoogle || [];</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5676206764686662" crossorigin="anonymous"></script>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(cfg.desc)}">
  <link rel="canonical" href="${pageUrl}">
  <!-- Open Graph -->
  <meta property="og:type"         content="website">
  <meta property="og:title"        content="${esc(title)}">
  <meta property="og:description"  content="${esc(cfg.desc)}">
  <meta property="og:image"        content="${esc(ogImg)}">
  <meta property="og:url"          content="${pageUrl}">
  <meta property="og:site_name"    content="${SITE_NAME}">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${esc(title)}">
  <meta name="twitter:description" content="${esc(cfg.desc)}">
  <meta name="twitter:image"       content="${esc(ogImg)}">

  <!-- Structured Data: CollectionPage first (auditors read first block) -->
  <script type="application/ld+json">${itemListLd}</script>
  <script type="application/ld+json">${breadcrumbLd}</script>
  <script type="application/ld+json">${faqLd}</script>

  <!-- Assets -->
  <link rel="preload" href="/css/style.css?v=__CACHE_VER__" as="style" onload="this.onload=null;this.rel='stylesheet';document.documentElement.classList.add('css-ready');">
  <noscript><link rel="stylesheet" href="/css/style.css?v=__CACHE_VER__"></noscript>
  <!-- Preload main script and hero image to speed first meaningful paint -->
  <link rel="preload" href="/js/app.js?v=__CACHE_VER__" as="script">
  <!-- OG/social image is not always an above-the-fold LCP on tag pages; use prefetch -->
  <link rel="prefetch" href="${esc(ogImg)}" as="image" crossorigin="anonymous">
  <!-- Critical CSS inlined for faster first paint -->
  <style id="critical-css">${CRITICAL_CSS}</style>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#006bb3">
  <base href="/">
  <!-- Client-only: JS marker + defensive removal of noscript/tag-intro -->
  <script>try{document.documentElement.classList.add('has-js');(function(){try{function rm(){document.querySelectorAll('.tag-intro, noscript').forEach(e=>{try{e.remove();}catch(e){}});} if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rm);else rm();}catch(e){}})();}catch(e){};</script>  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KTE3BWDVHC"><\/script>
  <script>window.dataLayer=window.dataLayer||[];window.__poki2GaConfigured=window.__poki2GaConfigured||false;function gtag(){dataLayer.push(arguments);}function poki2PlayInitAnalytics(){if(window.__poki2GaConfigured)return;gtag('config','G-KTE3BWDVHC',{send_page_view:true});window.__poki2GaConfigured=true;}gtag('js',new Date());gtag('consent','default',{analytics_storage:'denied',wait_for_update:500});<\/script></head>
  ${bodyTag}
  <!-- no-JS fallback nav (the full game index now lives in the visible .tag-games section) -->
  <noscript>
    <!-- Kept as <p> — the visible hero already carries the single <h1> for this page. -->
    <p class="tag-noscript-heading"><strong>${esc(cfg.headline)}</strong></p>
    <p>${esc(cfg.desc)}</p>
    <nav aria-label="Other Categories">
      <p>Other Categories:</p>
      <ul>
        ${relatedLinksHtml}
      </ul>
    </nav>
    <p><a href="/">&#8592; Back to ${esc(SITE_NAME)}</a></p>
  </noscript>
${tagBodyInner}
${relatedSectionHtml}
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (!fs.existsSync(GAMES)) {
  console.error('games.json not found');
  process.exit(1);
}
const indexHtml = path.join(DIST, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('dist/index.html not found — run build:copy first');
  process.exit(1);
}

// Mirror SPA visibility rules for desktop so static noscript/JSON-LD
// match the client-side `canShow()` ordering and counts.
function canShowDesktop(game) {
  // SPA treats undefined/null/false `show` as hidden (strict opt-in)
  if (game.show === undefined || game.show === null || game.show === false) return false;
  // SPA defaults to strict opt-in for `avalid` as well
  if (game.avalid === undefined || game.avalid === null) return false;
  if (Array.isArray(game.avalid)) return game.avalid.includes('desktop');
  // Fallback: non-array avalid is treated permissively for desktop
  return true;
}

// Mirror SPA behavior: load, deduplicate (by link/title), then apply visibility filter
const rawGames = JSON.parse(fs.readFileSync(GAMES, 'utf8'));
const seenKeys = new Set();
const deduped = rawGames.filter(g => {
  const key = ((g.link || g.title || '') + '').toString().toLowerCase().trim();
  if (!key) return false;
  if (seenKeys.has(key)) return false;
  seenKeys.add(key);
  return true;
});
const allGames = deduped.filter(canShowDesktop);

// Build tagMap using the same normalization logic as the SPA so ordering
// and tag membership match runtime behavior exactly.
const tagMap = {};
for (const g of allGames) {
  const rawTags = Array.isArray(g.tags) ? g.tags : ["other"];
  const uniqueTags = Array.from(new Set(rawTags.map((t) => String(t).trim())));
  g.tags = uniqueTags.length ? uniqueTags : ["other"];
  for (const t of g.tags) {
    (tagMap[t] = tagMap[t] || []).push(g);
  }
}

// Full tag map for the crawler-visible static list: includes mobile-only and
// desktop-excluded games whose static pages exist but which the SPA hides.
// The game list links must cover every generated /game/ page per tag.
const tagMapAll = {};
for (const g of deduped) {
  if (g.show === false) continue;
  const rawTags = Array.isArray(g.tags) ? g.tags : ["other"];
  const uniqueTags = Array.from(new Set(rawTags.map((t) => String(t).trim())));
  for (const t of (uniqueTags.length ? uniqueTags : ["other"])) {
    (tagMapAll[t] = tagMapAll[t] || []).push(g);
  }
}

const { open: bodyTag, inner: bodyInner } = extractBody(indexHtml);
// Remove any existing tag-intro sections from the template so generator
// inserts a single intro in the desired location (after #game-sections).
const sanitizedBody = bodyInner
  .replace(/<section class="tag-intro">[\s\S]*?<\/section>/gi, '')
  // Strip prerendered home sections — tag pages must not embed homepage content
  .replace(/<!--HOME-STATIC:START-->[\s\S]*?<!--HOME-STATIC:END-->/g, '');
const gameBodyContent = sanitizedBody
  .replace(/<\/body>\s*$/i, '')
  .replace(/<h1(\s[^>]*)?>What are you playing today\?<\/h1>/i, '<p$1>What are you playing today?</p>');

let count = 0;

for (const [tag, cfg] of Object.entries(TAG_CONFIG)) {
  const tagGames = tagMap[tag] || [];
  if (tagGames.length < MIN_GAMES) continue;

  // Only generate a single canonical tag page. Pagination is handled
  // dynamically by the SPA at runtime.
  const pageGames = tagGames.slice(0, PAGE_SIZE);
  // Crawler-visible list: every game carrying this tag (incl. mobile-only),
  // so all generated /game/ pages receive an internal link from this hub.
  const listGames = (tagMapAll[tag] && tagMapAll[tag].length >= tagGames.length) ? tagMapAll[tag] : tagGames;
  const dir = path.join(DIST, 'tag', tag);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    buildTagPage(tag, cfg, pageGames, bodyTag, gameBodyContent, TAG_CONFIG, tagGames, listGames),
    'utf8'
  );
  console.log(`  /tag/${tag}/  (${tagGames.length} games, list: ${listGames.length})`);
  count++;
}

console.log(`\u2705  Generated ${count} tag pages in dist/tag/`);
