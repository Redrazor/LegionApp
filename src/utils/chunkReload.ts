// Recovery for the classic Vite SPA failure after a redeploy: the open tab is pinned to
// the previous build's hashed chunk names (and, with the PWA service worker, an old
// precached index), so lazily importing a route chunk — e.g. clicking Build to load
// BuildView — rejects with "Failed to fetch dynamically imported module". The fix is to
// reload once so the browser fetches the fresh index that points at the current chunks.
//
// Pure + tested; the router/main wiring just supplies sessionStorage + the clock and acts
// on the result.

/** True when an error looks like a failed lazy-chunk fetch (stale deploy), not a real bug. */
export function isStaleChunkError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('module script failed') ||
    msg.includes('failed to import')
  )
}

/**
 * Decide whether to reload now to recover from a stale chunk, stamping the attempt time.
 * Returns true (and records `now`) when a reload should happen; false when one was already
 * attempted within `windowMs` — so a chunk that is genuinely gone (not just stale) can't
 * trigger an infinite reload loop. Pure aside from the injected store + clock.
 */
export function shouldReloadForStaleChunk(
  store: Pick<Storage, 'getItem' | 'setItem'>,
  now: number,
  windowMs = 10_000,
  key = 'stale-chunk-reload-at',
): boolean {
  const last = Number(store.getItem(key) || 0)
  if (last && now - last < windowMs) return false
  store.setItem(key, String(now))
  return true
}
