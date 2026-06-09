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

  /** Look up a keyword definition, ignoring any trailing numeric value (e.g. "Arsenal 2"). */
  function define(keyword: string): string | null {
    if (glossary.value[keyword]) return glossary.value[keyword]
    const base = keyword.replace(/\s+\d+$/, '').trim()
    return glossary.value[base] ?? null
  }

  return { glossary, loaded, load, define }
})
