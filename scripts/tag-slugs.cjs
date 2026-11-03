/**
 * tag-slugs.cjs — public URL slug for a tag, when it differs from its
 * internal key in games.json.
 *
 * The internal key stays "multiplayer" because that is the string used in
 * every game's `tags` array; renaming it would mean rewriting 220 records.
 * Only the public path changes, so /tag/multiplayer/ becomes
 * /2-player-games/ and the old URL is 301'd in _redirects.
 *
 * Anything that builds a tag URL MUST go through tagSlug() — the generators
 * (tag pages, game pages, sitemap) and js/app.js each used to hardcode
 * `/tag/${tag}/`, which is exactly how a rename ends up half-applied.
 *
 * js/app.js is browser code and cannot require() this file, so it carries a
 * mirrored copy. Keep the two in sync; `npm run verify:tag-slugs` checks it.
 */
'use strict';

const TAG_SLUGS = {
  multiplayer: '2-player-games',
};

/** internal tag key -> public URL slug */
const tagSlug = (tag) => TAG_SLUGS[tag] || tag;

/**
 * internal tag key -> path WITHOUT leading/trailing slash, i.e. what goes
 * between the origin and the trailing slash.
 *
 *   tagUrlPath('puzzle')      -> 'tag/puzzle'
 *   tagUrlPath('multiplayer') -> '2-player-games'
 *
 * Use this, never tagSlug(), when building a URL or a dist path — tagSlug()
 * returns the bare key for untouched tags, and building `/${tagSlug(t)}/`
 * silently relocated all 12 of them from /tag/<t>/ to /<t>/.
 */
const tagUrlPath = (tag) => TAG_SLUGS[tag] || `tag/${tag}`;

/** public URL slug -> internal tag key */
const tagKeyFromSlug = (slug) =>
  Object.keys(TAG_SLUGS).find((k) => TAG_SLUGS[k] === slug) || slug;

/** Regex source matching any non-default public slug, for routers/audits. */
const TAG_SLUG_PATTERN = Object.values(TAG_SLUGS).join('|');

module.exports = { TAG_SLUGS, tagSlug, tagUrlPath, tagKeyFromSlug, TAG_SLUG_PATTERN };
