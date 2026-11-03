# Legacy `/games/*` redirect worker (apex only)

One job: keep old `poki2.online/games/<slug>` URLs from 404ing.

```
poki2.online/games/<slug>                  → 301 → https://play.poki2.online/game/<first-letter>/<slug>/
poki2.online/games/mobileapp_mobile/<slug> → 301 → https://play.poki2.online/game/<first-letter>/<slug>/
anything else on the route                 → pass through
```

## Scope

Bound to the single route `poki2.online/games/*`. It does **not** touch
`play.poki2.online` — that host is plain Cloudflare Pages, and its `_redirects`
already carries the full `/games/<slug>` → `/game/<c>/<slug>/` table (442 rules).
A worker in front of it would only duplicate what the edge already does.

The route is this narrow on purpose: commit `42ec3c2` narrowed it from
`poki2.online/*` because the worker was intercepting `/css/`, `/js/` and other
static assets before Pages could answer.

## Deploy

```sh
npx wrangler deploy --config=wrangler.worker.toml
```

No `--env` flag. There is no `[env.production]` block in the config, and that is
deliberate — see the comment at the top of `wrangler.worker.toml` for what
`--env` cost: a route stuck on a build from 2026-04-24 while the fixed source sat
in git, plus an orphaned `redirect-query-to-path-production` script with no route.

## Verify after deploying

```sh
curl -sS -o /dev/null -D- 'https://poki2.online/games/2048' | grep -iE '^location|^x-worker-redirect'
# expect: location: https://play.poki2.online/game/2/2048/   (one hop)
```

If Location still points at `poki2.online/game/...`, you are looking at the old
script and the deploy did not land on the route.
