import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useKeywordsStore = defineStore('keywords', () => {
  const glossary = ref<Record<string, string>>({})
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    try {
      const res = await fetch('/data/keywords.json')
      if (res.ok) glossary.value = await res.json()
    } catch {
      // glossary is optional reference data
    }
    loaded.value = true
  }

  /**
   * Look up a keyword definition, tolerating the value/qualifier forms that upgrades and
   * weapons use: a trailing number ("Arsenal 2"), a ":" qualifier ("Immune: Pierce" →
   * Immune), and as a last resort the keyword family's first word ("Fixed Front" →
   * Fixed). Returns null when the keyword is genuinely absent from the glossary.
   */
  function define(keyword: string): string | null {
    const g = glossary.value
    if (g[keyword]) return g[keyword]
    const noNum = keyword.replace(/\s+\d+$/, '').trim()
    if (g[noNum]) return g[noNum]
    const beforeColon = keyword.split(':')[0].trim()
    if (g[beforeColon]) return g[beforeColon]
    return g[keyword.split(/\s+/)[0]] ?? null
  }

  return { glossary, loaded, load, define }
})
