import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CommandCard } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'
import { applyUnreleased } from '../utils/unreleased.ts'
import { applyDropped } from '../utils/dropped.ts'

export const useCommandsStore = defineStore('commands', () => {
  const commands = ref<CommandCard[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      commands.value = await applyDropped(
        await applyUnreleased(await loadCatalogue<CommandCard>('/api/commands', 'commands.json'), 'commands'),
        'commands',
      )
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const byId = computed(() => new Map(commands.value.map((c) => [c.id, c])))
  const bySlug = computed(() => new Map(commands.value.map((c) => [c.slug, c])))

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

  return { commands, loaded, loading, load, byId, bySlug, byCommander }
})
