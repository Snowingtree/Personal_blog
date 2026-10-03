import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { siteAuthGuard } from '../router/authGuard'
import NotesLoginPage from '../pages/NotesLoginPage/NotesLoginPage.vue'
import { readAndroidAppendixEnabled } from './appendix'
import { setAndroidAppMode } from './appMode'

const AndroidModeHomePage = () => import('./pages/AndroidModeHomePage.vue')
const AndroidHealthPage = () => import('./pages/AndroidHealthPage.vue')
const AndroidDietPage = () => import('./pages/AndroidDietPage.vue')
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
      name: 'android-profile',
      component: AndroidModeHomePage,
      meta: { androidNavKey: 'profile', androidSurface: 'home' }
    },
    {
      path: '/settings',
      redirect: '/'
    },
    {
      path: '/health',
      name: 'android-health',
      component: AndroidHealthPage,
      meta: { androidNavKey: 'health', androidSurface: 'health' }
    },
    {
      path: '/diet',
      name: 'android-diet',
      component: AndroidDietPage,
      meta: { androidNavKey: 'diet', androidSurface: 'diet' }
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
      props: { workspace: 'notes' },
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
      path: '/appendix',
      name: 'appendix',
      component: NotesPage,
      props: { workspace: 'appendix' },
      meta: {
        androidNavKey: 'appendix',
        androidSurface: 'legacy',
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        requiresAppendix: true,
        authScope: 'notes'
      }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach((to) => {
  if (to.name === 'android-health' || to.name === 'android-diet') {
    setAndroidAppMode('health')
  } else if (['notes', 'notes-login', 'appendix'].includes(to.name)) {
    setAndroidAppMode('personal')
  }

  if (to.meta.requiresAppendix && !readAndroidAppendixEnabled()) {
    return { name: 'android-profile' }
  }

  return siteAuthGuard(to)
})

export default router
