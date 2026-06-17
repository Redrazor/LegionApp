// Pure, testable transforms that turn the hand-maintained `Keyword_glossary.md`
// (the single source of truth for keyword rules text — transcribed verbatim from the
// official rulebook) into the flat name→text map shipped as `public/data/keywords.json`.
//
// The glossary is keyed by the BARE keyword ("Reliable", "Weak Point", "Aid"); cards
// reference valued/qualified forms ("Reliable 2", "Weak Point 1: Rear") that
// `src/utils/keywords.ts#resolveKeyword` peels back to that bare key. `deriveKey`
// produces those bare keys from the markdown `### …` headers.

export type Glossary = Record<string, string>

/** Normalise for case/punctuation-insensitive comparison. */
export function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Derive the bare glossary key from a `### Header`:
 *  - drop a ":" qualifier ("Aid: Affiliation/Unit Type" → "Aid", "Hover: Ground/Air X" → "Hover")
 *  - strip a trailing " X" value placeholder ("Armor X" → "Armor", "Weak Point X: Rear" → "Weak Point")
 */
export function deriveKey(header: string): string {
  let s = header.trim()
  const colon = s.indexOf(':')
  if (colon !== -1) s = s.slice(0, colon)
  s = s.replace(/\s+X$/, '')
  return s.trim()
}

/** Flatten one entry's markdown body to the single-line plain text the popover renders. */
export function cleanText(body: string): string {
  return body
    .replace(/\*\*/g, '') // bold markers
    .replace(/[[\]]/g, '') // icon brackets: "[Range 2]" → "Range 2"
    .replace(/^[-*]\s+/gm, '• ') // markdown bullets → "• "
    .replace(/\s*\n\s*/g, ' ') // collapse line breaks
    .replace(/\s{2,}/g, ' ') // collapse runs of spaces
    .trim()
}

export interface GlossaryEntry {
  header: string
  key: string
  text: string
}

/**
 * Parse every `### …` entry from the glossary markdown. A `## section`, `# title`, or
 * `---` rule ends the current entry, so the intro and the errata-changelog bullet list
 * (which have no `###` entries) are naturally excluded.
 */
export function parseGlossary(md: string): GlossaryEntry[] {
  const out: GlossaryEntry[] = []
  let header: string | null = null
  let bodyLines: string[] = []
  const flush = () => {
    if (header !== null) out.push({ header, key: deriveKey(header), text: cleanText(bodyLines.join('\n')) })
    header = null
    bodyLines = []
  }
  for (const line of md.split('\n')) {
    const h = /^###\s+(.+?)\s*$/.exec(line)
    if (h) {
      flush()
      header = h[1].trim()
    } else if (/^(#{1,2}\s|---\s*$)/.test(line)) {
      flush()
    } else if (header !== null) {
      bodyLines.push(line)
    }
  }
  flush()
  return out
}

/**
 * Build the name→text glossary from the markdown. `casingRef` (the existing keyword
 * keys, which already match the card data's spelling) reconciles capitalisation so a
 * card's exact-match lookup keeps resolving — e.g. rulebook "Death From Above" maps onto
 * the card-facing key "Death from Above". A later glossary entry wins over an earlier one.
 */
export function buildGlossary(md: string, casingRef: string[] = []): Glossary {
  const refByNorm = new Map(casingRef.map((k) => [normKey(k), k]))
  const glossary: Glossary = {}
  for (const e of parseGlossary(md)) {
    if (!e.key || !e.text) continue
    const key = refByNorm.get(normKey(e.key)) ?? e.key
    glossary[key] = e.text
  }
  return glossary
}
