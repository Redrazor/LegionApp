import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useFavoritesStore = defineStore(
  'favorites',
  () => {
    const ids = ref<string[]>([])
    const set = computed(() => new Set(ids.value))

    function isFavorite(id: string): boolean {
      return set.value.has(id)
    }
    function toggle(id: string) {
      if (set.value.has(id)) ids.value = ids.value.filter((x) => x !== id)
      else ids.value = [...ids.value, id]
    }

    return { ids, set, isFavorite, toggle }
  },
  { persist: true },
)
