import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    // Discover manages its own collection expansion and return position.
    if (to.path === from.path) return false
    return savedPosition || { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'workbench',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/discover',
      name: 'discover',
      component: () => import('@/pages/DiscoverPage.vue'),
    },
    {
      path: '/discover/playlist/:id',
      name: 'playlist',
      component: () => import('@/pages/PlaylistPage.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/ProfilePage.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/pages/AboutPage.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/pages/AuthPage.vue'),
    },
  ],
})

export default router
