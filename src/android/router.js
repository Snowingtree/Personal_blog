import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { siteAuthGuard } from '../router/authGuard'
import AndroidHomePage from './pages/AndroidHomePage.vue'
import NotesLoginPage from '../pages/NotesLoginPage/NotesLoginPage.vue'

const AndroidSettingsPage = () => import('./pages/AndroidSettingsPage.vue')
const NotesPage = () => import('../pages/NotesPage/NotesPage.vue')

const router = createRouter({
  history: import.meta.env.PROD ? createWebHashHistory() : createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'android-home',
      component: AndroidHomePage,
      meta: { androidNavKey: 'home', androidSurface: 'home' }
    },
    {
      path: '/settings',
      name: 'android-settings',
      component: AndroidSettingsPage,
      meta: { androidNavKey: 'settings', androidSurface: 'public' }
    },
    { path: '/login', redirect: '/notes' },
    {
      path: '/notes-login',
      name: 'notes-login',
      component: NotesLoginPage,
      meta: {
        androidNavKey: 'notes',
        androidSurface: 'legacy',
        followSiteTheme: false,
        privateNetworkOnly: true,
        authScope: 'notes'
      }
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesPage,
      meta: {
        androidNavKey: 'notes',
        androidSurface: 'legacy',
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'notes'
      }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach(siteAuthGuard)

export default router
