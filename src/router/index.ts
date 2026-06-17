import { createRouter, createWebHistory } from 'vue-router'
import BrowseView from '../views/BrowseView.vue'
import { isStaleChunkError, shouldReloadForStaleChunk } from '../utils/chunkReload.ts'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: (to) => ({ path: '/browse', query: to.query }),
    },
    {
      path: '/browse',
      component: BrowseView,
      children: [
        { path: ':slug', component: () => import('../components/browse/UnitProfile.vue') },
      ],
    },
    {
      path: '/browse/commands',
      component: () => import('../views/CommandsBrowseView.vue'),
      children: [
        { path: ':slug', component: () => import('../components/browse/CardLightbox.vue'), props: { kind: 'command' } },
      ],
    },
    {
      path: '/browse/upgrades',
      component: () => import('../views/UpgradesBrowseView.vue'),
      children: [
        { path: ':slug', component: () => import('../components/browse/CardLightbox.vue'), props: { kind: 'upgrade' } },
      ],
    },
    { path: '/build', component: () => import('../views/BuildView.vue') },
    { path: '/roll', component: () => import('../views/RollView.vue') },
    { path: '/play', component: () => import('../views/PlayView.vue') },
    { path: '/collection', component: () => import('../views/CollectionView.vue') },
    { path: '/reference', component: () => import('../views/ReferenceView.vue') },
  ],
})

// A lazy route chunk failing to load almost always means a new deploy replaced the hashed
// chunks this tab was pinned to (see utils/chunkReload). Reload straight to the target so
// the click isn't lost; the guard prevents a loop if the chunk is genuinely missing.
router.onError((err, to) => {
  if (isStaleChunkError(err) && shouldReloadForStaleChunk(sessionStorage, Date.now())) {
    window.location.assign(to.fullPath)
  }
})

export default router
