import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CommandCard } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

export const useCommandsStore = defineStore('commands', () => {
  const commands = ref<CommandCard[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      commands.value = await loadCatalogue<CommandCard>('/api/commands', 'commands.json')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const byId = computed(() => new Map(commands.value.map((c) => [c.id, c])))

  const byCommander = computed(() => {
    const map = new Map<string, CommandCard[]>()
    for (const c of commands.value) {
      if (!c.commander) continue
      const arr = map.get(c.commander) ?? []
      arr.push(c)
      map.set(c.commander, arr)
    }
    return map
  })

  return { commands, loaded, loading, load, byId, byCommander }
})
