#!/usr/bin/env node
/**
 * render-contract.cjs
 *
 * The single source of truth for "which games get their editorial copy rendered
 * into the real DOM". Both the page renderer (generate-game-pages.cjs) and the
 * sitemap fingerprint (generate-sitemap.cjs) must import it from here.
 *
 * Why this file exists (2026-11-25): the depth gate used to be duplicated as a
 * literal in the renderer while the sitemap fingerprint hashed only games.json
 * fields. Widening the gate therefore changed what 92 pages serve while the
 * fingerprint reported "0 updated, 48 kept" — the exact failure the fingerprint
 * comments describe: a change that no hash can see is a lastmod that lies.
 * Duplicating the rule in two places guarantees that drift, so it lives once.
 *
 * The record of the same class of bug on this project: a title generator and
 * the worker it served each held their own copy and drifted apart; the fix was
 * one implementation plus an assertion that both produce identical output.
 */

const crypto = require('crypto');

/** Bump when the rule below changes, so fingerprints re-date truthfully. */
const DEPTH_RULE_VERSION = 2;

/**
 * Non-empty `about` copy is the content that the depth article renders.
 * @param {object} game a games.json entry
 * @returns {string} trimmed about copy, '' when absent
 */
function aboutText(game) {
  return ((game && game.about) || '').trim();
}

/**
 * Is this game's copy rendered into the real DOM (visible to a JS crawler)?
 *
 * v2 (2026-11-25): opt-out instead of opt-in. v1 was `depth === true`, which
 * admitted 5 of 97 content-bearing games; the other 92 had no `depth` key at
 * all, so the gate could never open for them. The 2026-11-06 pilot has answered
 * its question (12.5% unique tokens vs 0.8%, same 94-page corpus), so every game
 * with about copy is in unless it explicitly opts out with `depth: false`.
 *
 * @param {object} game a games.json entry
 * @returns {boolean}
 */
function isDepth(game) {
  return game.depth !== false && !!aboutText(game);
}

/**
 * Stable token for the fingerprint: rule version + the rule's own decisions on
 * every game. Hashing the decisions (not just the version) means a future
 * change that does not alter any outcome still re-dates, which is acceptable;
 * the opposite error — a change no hash sees — is not.
 *
 * @param {object[]} games
 * @returns {string}
 */
function fingerprint(games) {
  const flags = games.map(g => `${isDepth(g) ? 1 : 0}`);
  return crypto
    .createHash('sha1')
    .update(`v${DEPTH_RULE_VERSION}:${flags.join('')}`)
    .digest('hex');
}

module.exports = { DEPTH_RULE_VERSION, aboutText, isDepth, fingerprint };