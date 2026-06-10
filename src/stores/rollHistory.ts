import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface RollEntry {
  id: number
  time: string
  atk: Record<string, number> // face → count
  def: Record<string, number> // face → count
  wounds: number
}

export const useRollHistoryStore = defineStore(
  'rollHistory',
  () => {
    const entries = ref<RollEntry[]>([])
    let nextId = 0

    function push(atk: Record<string, number>, def: Record<string, number>, wounds: number) {
      const now = new Date()
      entries.value.unshift({
        id: nextId++,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        atk: { ...atk },
        def: { ...def },
        wounds,
      })
      if (entries.value.length > 20) entries.value.length = 20
    }

    function updateCurrent(atk: Record<string, number>, def: Record<string, number>, wounds: number) {
      if (entries.value.length === 0) return
      entries.value[0].atk = { ...atk }
      entries.value[0].def = { ...def }
      entries.value[0].wounds = wounds
    }

    function clear() {
      entries.value = []
    }

    return { entries, push, updateCurrent, clear }
  },
  { persist: true },
)
