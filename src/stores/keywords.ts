import { defineStore } from 'pinia'
import { ref } from 'vue'
import { resolveKeyword } from '../utils/keywords.ts'

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
   * Look up a keyword definition, tolerating the value/qualifier forms cards use
   * ("Reliable 2", "Uncanny Luck X", "Weak Point 1: Rear", "Special Issue Blizzard
   * Force"). See utils/keywords.ts. Returns null when genuinely absent.
   */
  function define(keyword: string): string | null {
    return resolveKeyword(glossary.value, keyword)
  }

  return { glossary, loaded, load, define }
})
