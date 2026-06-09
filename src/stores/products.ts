import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '../types/index.ts'
import { loadCatalogue } from '../utils/api.ts'

export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      products.value = await loadCatalogue<Product>('/api/products', 'products.json')
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const byFaction = computed(() => {
    const map = new Map<string, Product[]>()
    for (const p of products.value) {
      const arr = map.get(p.faction) ?? []
      arr.push(p)
      map.set(p.faction, arr)
    }
    return map
  })

  return { products, loaded, loading, load, byFaction }
})
