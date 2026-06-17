import { createApp } from 'vue'
import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router/index.ts'
import App from './App.vue'
import './style.css'
import { shouldReloadForStaleChunk } from './utils/chunkReload.ts'

// Backstop for the router's onError: Vite fires `vite:preloadError` when a dynamically
// imported chunk fails to preload (a stale chunk after a redeploy). Reload once to pull
// the fresh index. Guarded against loops via sessionStorage.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  if (shouldReloadForStaleChunk(sessionStorage, Date.now())) window.location.reload()
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const head = createHead()

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(head)
app.mount('#app')
