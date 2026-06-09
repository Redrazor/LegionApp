import { createRouter, createWebHistory } from 'vue-router'
import BrowseView from '../views/BrowseView.vue'

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
    { path: '/build', component: () => import('../views/BuildView.vue') },
    { path: '/play', component: () => import('../views/PlayView.vue') },
    { path: '/collection', component: () => import('../views/CollectionView.vue') },
    { path: '/reference', component: () => import('../views/ReferenceView.vue') },
  ],
})

export default router
