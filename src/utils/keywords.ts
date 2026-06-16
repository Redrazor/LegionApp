// Pure keyword-glossary resolution. Keywords are stored on cards with their value/
// qualifier baked into the string ("Reliable 2", "Uncanny Luck X", "Weak Point 1: Rear",
// "Special Issue Blizzard Force", "Master of the Force 1"), but the glossary is keyed by
// the bare keyword ("Reliable", "Weak Point", "Special Issue", "Master of the Force").
// resolveKeyword peels those forms back to a glossary entry. Kept pure + tested; the
// keywords store delegates to it.

export type Glossary = Record<string, string>

/** Strip a trailing value token — a number or the literal "X" placeholder. */
function stripValue(s: string): string {
  return s.replace(/\s+(\d+|X)$/, '').trim()
}

/**
 * Resolve a (possibly valued/qualified) keyword string to its glossary definition,
 * or null if genuinely absent. Resolution order, most to least specific:
 *  1. exact match
 *  2. strip a trailing value ("Reliable 2" / "Uncanny Luck X" → base)
 *  3. drop a ":" qualifier, then strip a value ("Weak Point 1: Rear" → "Weak Point")
 *  4. longest glossary key that is a whole-word prefix ("Special Issue Blizzard Force"
 *     → "Special Issue", "Mercenary Rebels" → "Mercenary")
 *  5. first word ("Fixed Front" → "Fixed")
 */
export function resolveKeyword(glossary: Glossary, keyword: string): string | null {
  return resolveKeywordEntry(glossary, keyword)?.text ?? null
}

/**
 * Like {@link resolveKeyword} but returns the matched glossary base entry — its `name`
 * (the bare keyword, e.g. "Reliable") and `text`. Lets callers dedupe valued/qualified
 * variants ("Reliable 2", "Reliable 3") back to one alphabetised reference entry.
 */
export function resolveKeywordEntry(glossary: Glossary, keyword: string): { name: string; text: string } | null {
  if (!keyword) return null
  const g = glossary

  if (g[keyword]) return { name: keyword, text: g[keyword] }

  const noValue = stripValue(keyword)
  if (noValue !== keyword && g[noValue]) return { name: noValue, text: g[noValue] }

  if (keyword.includes(':')) {
    const beforeColon = stripValue(keyword.split(':')[0].trim())
    if (g[beforeColon]) return { name: beforeColon, text: g[beforeColon] }
  }

  // Longest whole-word prefix that is itself a glossary key.
  let best: string | null = null
  for (const key of Object.keys(g)) {
    if ((keyword === key || keyword.startsWith(key + ' ')) && (!best || key.length > best.length)) {
      best = key
    }
  }
  if (best) return { name: best, text: g[best] }

  const firstWord = keyword.split(/\s+/)[0]
  return g[firstWord] ? { name: firstWord, text: g[firstWord] } : null
}
