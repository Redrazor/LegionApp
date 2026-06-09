const API_BASE = import.meta.env.VITE_API_BASE ?? ''

/**
 * Fetch a catalogue resource. Tries the API first, then falls back to the
 * static JSON bundled in /public/data so the app works with no backend.
 */
export async function loadCatalogue<T>(apiPath: string, staticFile: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}${apiPath}`)
    if (res.ok) return (await res.json()) as T[]
  } catch {
    // fall through to static
  }
  const res = await fetch(`/data/${staticFile}`)
  if (!res.ok) throw new Error(`Failed to load ${staticFile}`)
  return (await res.json()) as T[]
}

export { API_BASE }
