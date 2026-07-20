import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { siteAuthGuard } from '../router/authGuard'
import AndroidHomePage from './pages/AndroidHomePage.vue'
import AndroidLibraryPage from './pages/AndroidLibraryPage.vue'
import AndroidArticlePage from './pages/AndroidArticlePage.vue'
import LoginPage from '../pages/LoginPage/LoginPage.vue'
import NotesLoginPage from '../pages/NotesLoginPage/NotesLoginPage.vue'

const AndroidPhotoWallPage = () => import('./pages/AndroidPhotoWallPage.vue')
const AndroidSettingsPage = () => import('./pages/AndroidSettingsPage.vue')
const XianyuRecordPage = () => import('./features/xianyu/XianyuRecordPage.vue')
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
      path: '/articles',
      name: 'android-articles',
      component: AndroidLibraryPage,
      props: { contentType: 'article' },
      meta: { androidNavKey: 'articles', androidSurface: 'library' }
    },
    {
      path: '/articles/:slug',
      name: 'article-detail',
      component: AndroidArticlePage,
      meta: { androidNavKey: 'articles', androidSurface: 'reader' }
    },
    {
      path: '/ai-shares',
      name: 'android-ai-shares',
      component: AndroidLibraryPage,
      props: { contentType: 'ai-share' },
      meta: { androidNavKey: 'ai-shares', androidSurface: 'library', contentType: 'ai-share' }
    },
    {
      path: '/ai-shares/:slug',
      name: 'ai-share-detail',
      component: AndroidArticlePage,
      meta: { androidNavKey: 'ai-shares', androidSurface: 'reader', contentType: 'ai-share' }
    },
    {
      path: '/photo-wall',
      name: 'photo-wall',
      component: AndroidPhotoWallPage,
      meta: { androidNavKey: 'photo-wall', androidSurface: 'public' }
    },
    {
      path: '/xianyu',
      name: 'android-xianyu',
      component: XianyuRecordPage,
      meta: {
        androidNavKey: 'xianyu',
        androidSurface: 'xianyu',
        followSiteTheme: false,
        requiresAuth: true,
        authScope: 'xianyu'
      }
    },
    {
      path: '/xianyu-login',
      name: 'xianyu-login',
      component: LoginPage,
      meta: {
        androidNavKey: 'xianyu',
        androidSurface: 'legacy',
        followSiteTheme: false,
        authScope: 'xianyu'
      }
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
