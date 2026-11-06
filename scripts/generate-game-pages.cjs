#!/usr/bin/env node
/**
 * generate-game-pages.cjs
 * Same logic as generate-game-pages.js but ensured to run as CommonJS
 */
const fs   = require('fs');
const path = require('path');
const { tagUrlPath } = require('./tag-slugs.cjs');

const BASE_URL  = 'https://play.poki2.online';
const SITE_NAME = 'Poki2';
const DIST      = path.join(__dirname, '..', 'dist');
const GAMES     = path.join(__dirname, '..', 'games.json');

function extractBody(htmlFile) {
  const src = fs.readFileSync(htmlFile, 'utf8');
  const m = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) throw new Error(`Could not extract <body> from ${htmlFile}`);
  return { open: src.match(/<body([^>]*)>/i)[0], inner: m[1] };
}

const TAG_PAGES = [
  ['action',      'Action'],
  ['puzzle',      'Puzzle'],
  ['adventure',   'Adventure'],
  ['racing',      'Racing'],
  ['shooting',    'Shooting'],
  ['multiplayer', '2 Player'],
  ['competitive', 'Competitive'],
  ['strategy',    'Strategy'],
  ['idle',        'Idle'],
  ['arcade',      'Arcade'],
  ['sports',      'Sports'],
  ['platformer',  'Platformer'],
];

const TAG_LABELS = {
  action:      'Action',
  competitive: 'Competitive',
  idle:        'Idle',
  puzzle:      'Puzzle',
  racing:      'Racing',
  shooting:    'Shooting',
  sports:      'Sports',
  strategy:    'Strategy',
  multiplayer: 'Multiplayer',
  singleplayer:'Single Player',
  arcade:      'Arcade',
  adventure:   'Adventure',
  platformer:  'Platformer',
  clicker:     'Clicker',
  other:       'Other',
};

function normalizeHref(link) {
  try {
    const u = new URL(link);
    let p = u.pathname.replace(/\/+$/, '');
    if (!p) p = u.hostname.split('.')[0];
    return p.split('/').pop() || link;
  } catch {
    return link;
  }
}

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build the real-DOM article for a depth page.
 *
 * This markup sits in <main> next to #game-sections, so it survives JS
 * execution (app.js only rewrites its own containers and deletes the noscript
 * fallback). It carries the page's h1 and its editorial copy, which is what a
 * JS-rendering crawler otherwise never sees on this site.
 *
 * Visibility is scoped by data-slug: app.js hides the block as soon as the SPA
 * shows a view other than the URL the block was baked into, so client-side
 * navigation cannot leave one game's copy under another game's player.
 */
function buildArticle(game, about, desc, tips, inputs, genreTagKeys, primaryGenre, slug) {
  const paras = about.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const htp   = (game.howToPlay || '').trim();
  const chips = inputs.length
    ? inputs.map(i => `          <li>${esc(i)}</li>`).join('\n')
    : '';
  const genreLine = genreTagKeys.length
    ? genreTagKeys.map(k => `<a href="/${tagUrlPath(k)}/">${esc(TAG_LABELS[k])}</a>`).join(', ')
    : esc(primaryGenre);

  return `
    <!-- Depth article: real DOM, not noscript. See buildArticle() in scripts/generate-game-pages.cjs -->
    <section class="game-article" id="game-article" data-slug="${esc(slug)}" aria-labelledby="game-article-title">
      <div class="game-article-inner">
        <header class="game-article-head">
          <h1 class="game-article-title" id="game-article-title">${esc(game.title)}</h1>
          <p class="game-article-meta">${genreLine}${inputs.length ? ` &middot; ${inputs.map(esc).join(' / ')}` : ''}</p>
        </header>
        <p class="game-article-lede">${esc(desc)}</p>
        <div class="game-article-cta">
          <button type="button" class="game-article-play" data-article-play="${esc(slug)}">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>
            <span>Play ${esc(game.title)}</span>
          </button>
        </div>
        <h2>About ${esc(game.title)}</h2>
${paras.map(p => `        <p>${esc(p)}</p>`).join('\n')}
${htp ? `        <h2>How to play ${esc(game.title)}</h2>\n        <p>${esc(htp)}</p>` : ''}
${chips ? `        <h2>Controls</h2>\n        <ul class="game-article-controls">\n${chips}\n        </ul>` : ''}
        <h2>Tips</h2>
        <ul class="game-article-tips">
${tips.map(t => `          <li>${esc(t)}</li>`).join('\n')}
        </ul>
      </div>
    </section>`;
}

function buildPage(game, bodyTag, bodyInner, relatedGames) {
  const slug     = normalizeHref(game.link);
  const tags     = game.tags || [];
  const genres   = tags.filter(t => TAG_LABELS[t]).map(t => TAG_LABELS[t]);

  const rawTitle = `${game.title} \u2014 Play Free on ${SITE_NAME}`;
  const title = rawTitle.length < 30 && genres.length
    ? `${game.title} ${genres[0]} \u2014 Play Free on ${SITE_NAME}`
    : rawTitle;

  const desc     = game.description ||
    `Play ${game.title} for free online on ${SITE_NAME} \u2014 no downloads required.`;

  // Real, hand-authored content (tools/content/apply-content-batch-*.cjs).
  // Emitted as visible body text in the noscript fallback — this is the text
  // Google indexes. Unique per game, unlike the templated description.
  const about    = (game.about || '').trim();

  // Intra-page duplication guard: howToPlay is auto-derived from description
  // (scripts/generate-how-to-play.cjs), so on most pages it is a substring of
  // desc. Emitting it again as an "How to play" section duplicates the body
  // text on the page — a thin/duplicate-content signal for Google. Skip the
  // section (and the matching FAQ question) when it adds nothing unique.
  const htpNorm = (game.howToPlay || '').trim().toLowerCase().replace(/[.!?]+$/, '');
  const htpDup  = htpNorm.length > 0 && desc.toLowerCase().includes(htpNorm);

  // Depth mode: render the editorial copy into the real DOM instead of only
  // inside <noscript>. Reason (measured 2026-11-06): js/app.js deletes noscript
  // blocks that contain an h1, and the SPA renders neither an h1 nor the about
  // text, so a JS-rendered game page carried no unique body text at all - the
  // shape behind 194 "Crawled - currently not indexed" URLs. Opt-in per game
  // via `depth: true` so the change can be measured on a small sample first.
  const tips    = (Array.isArray(game.tips) ? game.tips : []).map(t => String(t).trim()).filter(Boolean);
  const depthOn = game.depth === true && !!about && tips.length > 0;
  const char     = slug[0].toLowerCase();
  const _iconRel = (game.icons && (game.icons['192'] || game.icons['512'])) || game.imgSrc;
  const game_icon = _iconRel
    ? (_iconRel.startsWith('http') ? _iconRel : `${BASE_URL}${_iconRel}`)
    : `${BASE_URL}/icons/${char}/${slug}/icon-192.png`;
  const img      = game_icon || `${BASE_URL}/assets/icon/icon-512.png`;
  const ogImg    = `${BASE_URL}/og/${char}/${slug}-1200x628.png`;
  
  const pageUrl  = `${BASE_URL}/game/${char}/${slug}/`;
  const playMode = tags.includes('multiplayer') ? 'MultiPlayer' : 'SinglePlayer';
  const inputs   = game.input || [];

  const numberOfPlayers = tags.includes('multiplayer')
    ? { '@type': 'QuantitativeValue', minValue: 2, maxValue: 8 }
    : { '@type': 'QuantitativeValue', minValue: 1, maxValue: 1 };

  const accessibilityFeatures = [
    ...(inputs.includes('touch')    ? ['touchControl']    : []),
    ...(inputs.includes('keyboard') ? ['keyboardControl'] : []),
    ...(inputs.includes('mouse')    ? ['mouseControl']    : []),
  ];

  const ldObj = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name:                game.title,
    url:                 pageUrl,
    inLanguage:          'en',
    image:               img,
    thumbnailUrl:        img,
    ...(img ? { screenshot: { '@type': 'ImageObject', url: img, width: 512, height: 512 } } : {}),
    description:         desc,
    genre:               genres.length ? genres : ['Game'],
    applicationCategory: 'Game',
    playMode:            playMode,
    numberOfPlayers,
    operatingSystem:     'Web Browser',
    ...(accessibilityFeatures.length ? { accessibilityFeature: accessibilityFeatures } : {}),
    offers:    { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: `${BASE_URL}/` },
    ...(game.blog ? { sameAs: [game.blog] } : {}),
  };
  const ld = JSON.stringify(ldObj);

  // Genre links must point at a page that exists. TAG_LABELS also covers tags
  // with no generated hub (`singleplayer`, `clicker`, `other`) — every game
  // page used to link to /tag/singleplayer/, which 404s, and the breadcrumb
  // JSON-LD advertised the same dead URL. Restricting to generated hub keys
  // fixes both, and keeps the breadcrumb honest.
  const linkedTagKeys = new Set(TAG_PAGES.map(([k]) => k));
  const genreTagKeys = tags.filter(t => TAG_LABELS[t] && linkedTagKeys.has(t));
  const primaryTagKey  = genreTagKeys[0] || null;
  const primaryGenre   = primaryTagKey ? TAG_LABELS[primaryTagKey] : 'Games';
  const genreTagUrl    = primaryTagKey ? `${BASE_URL}/${tagUrlPath(primaryTagKey)}/` : `${BASE_URL}/`;

  // Depth article markup. Rendered into <main> as real DOM (see buildArticle),
  // so the page carries an h1 and unique body text even after JS runs.
  const article = depthOn ? buildArticle(game, about, desc, tips, inputs, genreTagKeys, primaryGenre, slug) : '';
  const breadcrumbLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',       item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: primaryGenre, item: genreTagUrl },
      { '@type': 'ListItem', position: 3, name: game.title,   item: pageUrl },
    ],
  });

  const availOn      = game.avalid || [];
  const mobileAnswer = availOn.includes('mobile')
    ? `Yes, ${game.title} is fully playable on mobile. Open it in your mobile browser — no app download needed.`
    : `${game.title} is designed for desktop browsers and is best played on a computer with a keyboard.`;
  const faqLd = game.howToPlay ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How do you play ${game.title}?`,
        acceptedAnswer: { '@type': 'Answer', text: game.howToPlay },
      },
      {
        '@type': 'Question',
        name: `Is ${game.title} free to play?`,
        acceptedAnswer: { '@type': 'Answer', text: `Yes, ${game.title} is completely free to play on Poki2. No download or signup required — play instantly in your browser.` },
      },
      {
        '@type': 'Question',
        name: `Can I play ${game.title} on mobile?`,
        acceptedAnswer: { '@type': 'Answer', text: mobileAnswer },
      },
    ],
  }) : null;

  return `<!DOCTYPE html>
<html lang="en" class="preload-hide">
<head>
  <style id="preload-style">.preload-hide,.preload-hide *{visibility:hidden!important;height:0!important;max-height:0!important;overflow:hidden!important;opacity:0!important}</style>
  <script id="preload-unhide">(function(){var done=false;function unhide(){if(done)return;done=true;document.documentElement.classList.remove('preload-hide');var s=document.getElementById('preload-style');if(s&&s.parentNode)s.parentNode.removeChild(s);var sc=document.getElementById('preload-unhide');if(sc&&sc.parentNode)sc.parentNode.removeChild(sc);}window.__tryU=function(){if((window.__cssN||0)>=(window.__cssT||1))unhide();};if(document.readyState==='complete'){window.__tryU();return;}window.addEventListener('load',window.__tryU,{once:true});setTimeout(unhide,2500);})();<\/script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <!-- Google AdSense -->
  <script>window.adsbygoogle = window.adsbygoogle || [];</script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5676206764686662" crossorigin="anonymous"></script>
  <title>${esc(title)}</title>
  ${game.noindex ? '<meta name="robots" content="noindex, follow">' : ''}
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${pageUrl}">
  <link rel="alternate" type="application/rss+xml" title="Poki2 — Free Online Games" href="/rss.xml">

  <!-- Open Graph -->
  <meta property="og:type"         content="website">
  <meta property="og:title"        content="${esc(title)}">
  <meta property="og:description"  content="${esc(desc)}">
  <meta property="og:image"        content="${esc(ogImg)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="628">
  <meta property="og:url"          content="${pageUrl}">
  <meta property="og:site_name"    content="${SITE_NAME}">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image"       content="${esc(ogImg)}">
  <meta name="twitter:url"         content="${pageUrl}">

  <!-- Structured data: VideoGame + BreadcrumbList + FAQPage -->
  <script type="application/ld+json">${ld}</script>
  <script type="application/ld+json">${breadcrumbLd}</script>
  ${faqLd ? `<script type="application/ld+json">${faqLd}</script>` : ''}

  <!-- Assets (version token replaced by inject-version.js) -->
  <link rel="preload" href="/css/style.css?v=__CACHE_VER__" as="style" onload="this.onload=null;this.rel='stylesheet';window.__cssN=(window.__cssN||0)+1;typeof window.__tryU==='function'&&window.__tryU();">
  <noscript><link rel="stylesheet" href="/css/style.css?v=__CACHE_VER__"></noscript>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#006bb3">
  <!-- Base href ensures all relative paths in the SPA body resolve from root -->
  <base href="/">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KTE3BWDVHC"></script>
  <script>window.dataLayer=window.dataLayer||[];window.__poki2GaConfigured=window.__poki2GaConfigured||false;function gtag(){dataLayer.push(arguments);}function poki2PlayInitAnalytics(){if(window.__poki2GaConfigured)return;gtag('config','G-KTE3BWDVHC',{send_page_view:true});window.__poki2GaConfigured=true;}gtag('js',new Date());gtag('consent','default',{analytics_storage:'denied',wait_for_update:500});<\/script>
</head>
${bodyTag}
  <!-- Static fallback for no-JS crawlers -->
  <noscript>
    <nav aria-label="Breadcrumb">
      <ol>
        <li><a href="/">${SITE_NAME}</a></li>
        ${primaryTagKey ? `<li><a href="/${tagUrlPath(primaryTagKey)}/">${esc(primaryGenre)}</a></li>` : `<li>${esc(primaryGenre)}</li>`}
        <li>${esc(game.title)}</li>
      </ol>
    </nav>
    ${depthOn ? '' : `<h1>${esc(game.title)}</h1>`}
    ${depthOn ? '' : `<p>${esc(desc)}</p>`}
    ${about && !depthOn ? `<h2>About ${esc(game.title)}</h2>\n${about.split(/\n\s*\n/).map(p => `    <p>${esc(p.trim())}</p>`).join('\n')}` : ''}
    ${genres.length ? `<p><strong>Genre:</strong> ${genreTagKeys.map(k => `<a href="/${tagUrlPath(k)}/">${esc(TAG_LABELS[k])}</a>`).join(', ')}</p>` : ''}
    ${inputs.length && !depthOn ? `<p><strong>Controls:</strong> ${inputs.map(esc).join(', ')}</p>` : ''}
    ${game.howToPlay && !htpDup && !depthOn ? `<h2>How to play ${esc(game.title)}</h2>\n    <p>${esc(game.howToPlay)}</p>` : ''}
    ${(relatedGames && relatedGames.length) ? `<h2>More games like ${esc(game.title)}</h2>\n    <ul>\n${relatedGames.map(r => {
      const rs = normalizeHref(r.link);
      const rc = rs[0].toLowerCase();
      return `      <li><h3><a href="/game/${rc}/${rs}/">${esc(r.title)}</a></h3></li>`;
    }).join('\n')}\n    </ul>` : ''}
    <nav aria-label="Game Categories">
      <ul>
        ${TAG_PAGES.map(([k, l]) => `<li><a href="/${tagUrlPath(k)}/">${esc(l)} Games</a></li>`).join('\n        ')}
      </ul>
    </nav>
    <p><a href="/">&#8592; All games</a></p>
  </noscript>
${article ? bodyInner.replace(/<\/main>/i, `${article}\n    </main>`) : bodyInner}
</body>
</html>`;
}

if (!fs.existsSync(GAMES)) {
  console.error('games.json not found');
  process.exit(1);
}

const indexHtml = path.join(DIST, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('dist/index.html not found — run build:copy first');
  process.exit(1);
}

const { open: bodyTag, inner: bodyInner } = extractBody(indexHtml);
const bodyContent = bodyInner.replace(/<\/body>\s*$/i, '')
  // Strip prerendered home sections — game pages must not embed homepage content
  .replace(/<!--HOME-STATIC:START-->[\s\S]*?<!--HOME-STATIC:END-->/g, '');
const gameBodyContent = bodyContent.replace(
  /<h1(\s[^>]*)?>What are you playing today\?<\/h1>/i,
  '<p$1>What are you playing today?</p>'
);

const games = JSON.parse(fs.readFileSync(GAMES, 'utf8'));
let count = 0;
const seen = new Set();

const tagIndex = {};
for (const g of games) {
  if (!g.show) continue;
  for (const t of (g.tags || [])) {
    if (!TAG_LABELS[t]) continue;
    if (!tagIndex[t]) tagIndex[t] = [];
    tagIndex[t].push(g);
  }
}

function getRelated(game, n = 4) {
  const slug = normalizeHref(game.link);
  const tags = (game.tags || []).filter(t => TAG_LABELS[t]);
  const scores = {};
  for (const t of tags) {
    for (const g of (tagIndex[t] || [])) {
      const gs = normalizeHref(g.link);
      if (gs === slug) continue;
      scores[gs] = (scores[gs] || 0) + 1;
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([s]) => games.find(g => normalizeHref(g.link) === s))
    .filter(Boolean);
}

for (const game of games) {
  if (!game.show) continue;
  const slug = normalizeHref(game.link);
  if (!slug || seen.has(slug)) continue;
  seen.add(slug);

  const related = getRelated(game);
  const char = slug[0].toLowerCase();
  const dir = path.join(DIST, 'game', char, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildPage(game, bodyTag, gameBodyContent, related), 'utf8');
  count++;
}

console.log(`\u2705  Generated ${count} game pages in dist/game/`);
