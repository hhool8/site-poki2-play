/**
 * tag-slugs.cjs — public URL slug for a tag, when it differs from its
 * internal key in games.json.
 *
 * The internal key stays "multiplayer" because that is the string used in
 * every game's `tags` array; renaming it would mean rewriting 220 records.
 *
 * HISTORY: the map held `multiplayer: '2-player-games'` for ~2 hours on
 * 2026-11-04 (commit 93ff257). Rolled back the same day: the "poki 2 player
 * games" hub lives on the apex host at https://poki2.online/2-player-games
 * instead, and play's multiplayer tag keeps its neutral /tag/multiplayer/
 * URL. /2-player-games/ on THIS host is 301'd back in _redirects.
 * The map is kept (empty) because every URL builder routes through it —
 * do not delete the helpers.
 *
 * Anything that builds a tag URL MUST go through tagSlug() — the generators
 * (tag pages, game pages, sitemap) and js/app.js each used to hardcode
 * `/tag/${tag}/`, which is exactly how a rename ends up half-applied.
 *
 * js/app.js is browser code and cannot require() this file, so it carries a
 * mirrored copy. Keep the two in sync.
 */
'use strict';

const TAG_SLUGS = {};

/** internal tag key -> public URL slug */
const tagSlug = (tag) => TAG_SLUGS[tag] || tag;

/**
 * internal tag key -> path WITHOUT leading/trailing slash, i.e. what goes
 * between the origin and the trailing slash.
 *
 *   tagUrlPath('puzzle')      -> 'tag/puzzle'
 *   tagUrlPath('multiplayer') -> 'tag/multiplayer'
 *
 * Use this, never tagSlug(), when building a URL or a dist path — tagSlug()
 * returns the bare key for untouched tags, and building `/${tagSlug(t)}/`
 * would relocate all 12 tag pages from /tag/<t>/ to /<t>/.
 */
const tagUrlPath = (tag) => TAG_SLUGS[tag] || `tag/${tag}`;

/** public URL slug -> internal tag key */
const tagKeyFromSlug = (slug) =>
  Object.keys(TAG_SLUGS).find((k) => TAG_SLUGS[k] === slug) || slug;

/** Regex source matching any non-default public slug, for routers/audits. */
const TAG_SLUG_PATTERN = Object.values(TAG_SLUGS).join('|');

module.exports = { TAG_SLUGS, tagSlug, tagUrlPath, tagKeyFromSlug, TAG_SLUG_PATTERN };
