import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCollectionStore = defineStore(
  'collection',
  () => {
    // product code → owned quantity
    const owned = ref<Record<string, number>>({})

    function quantity(code: string): number {
      return owned.value[code] ?? 0
    }
    function isOwned(code: string): boolean {
      return quantity(code) > 0
    }
    function setQuantity(code: string, qty: number) {
      const n = Math.max(0, Math.floor(qty))
      if (n === 0) delete owned.value[code]
      else owned.value[code] = n
    }
    function increment(code: string) {
      setQuantity(code, quantity(code) + 1)
    }
    function decrement(code: string) {
      setQuantity(code, quantity(code) - 1)
    }
    function reset() {
      owned.value = {}
    }
    function importOwned(data: Record<string, number>) {
      owned.value = { ...data }
    }

    return { owned, quantity, isOwned, setQuantity, increment, decrement, reset, importOwned }
  },
  { persist: true },
)
