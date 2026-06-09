import { useCollectionStore } from '../stores/collection.ts'
import { useFavoritesStore } from '../stores/favorites.ts'

interface BackupFile {
  app: 'legionapp'
  version: 1
  exportedAt: string
  collection: Record<string, number>
  favorites: string[]
}

export function useDataBackup() {
  const collection = useCollectionStore()
  const favorites = useFavoritesStore()

  function exportData() {
    const data: BackupFile = {
      app: 'legionapp',
      version: 1,
      exportedAt: new Date().toISOString(),
      collection: collection.owned,
      favorites: favorites.ids,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `legionapp-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file: File): Promise<boolean> {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BackupFile>
      if (parsed.app !== 'legionapp') return false
      if (parsed.collection) collection.importOwned(parsed.collection)
      if (Array.isArray(parsed.favorites)) favorites.ids = parsed.favorites
      return true
    } catch {
      return false
    }
  }

  return { exportData, importData }
}
