import { createRouter, createWebHistory } from 'vue-router'
import BlogHomePage from '../pages/BlogHomePage/BlogHomePage.vue'
import LoginPage from '../pages/LoginPage/LoginPage.vue'
import DisplayPage from '../pages/DisplayPage/DisplayPage.vue'
import NotesLoginPage from '../pages/NotesLoginPage/NotesLoginPage.vue'
const AiSettingsPage = () => import('../pages/AiSettingsPage/AiSettingsPage.vue')
const AiQuizHistoryPage = () => import('../pages/AiQuizHistoryPage/AiQuizHistoryPage.vue')
const BlogArticlePage = () => import('../pages/BlogArticlePage/BlogArticlePage.vue')
const NotesPage = () => import('../pages/NotesPage/NotesPage.vue')
const PhotoWallPage = () => import('../pages/PhotoWallPage/PhotoWallPage.vue')
const ToolSelectorPage = () => import('../pages/ToolSelectorPage/ToolSelectorPage.vue')
const InternshipPage = () => import('../pages/InternshipPage/InternshipPage.vue')
import {
  AUTH_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../constants/storage'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      return {
        el: to.hash,
        top: 24,
        behavior: 'smooth'
      }
    }

    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: BlogHomePage
    },
    {
      path: '/articles/:slug',
      name: 'article-detail',
      component: BlogArticlePage
    },
    {
      path: '/photo-wall',
      name: 'photo-wall',
      component: PhotoWallPage
    },
    {
      path: '/ai-shares/:slug',
      name: 'ai-share-detail',
      component: BlogArticlePage,
      meta: {
        contentType: 'ai-share'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        authScope: 'anime'
      }
    },
    {
      path: '/notes-login',
      name: 'notes-login',
      component: NotesLoginPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        authScope: 'notes'
      }
    },
    {
      path: '/tools',
      name: 'tool-selector',
      component: ToolSelectorPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'tools'
      }
    },
    {
      path: '/display',
      name: 'display',
      component: DisplayPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'anime'
      }
    },
    {
      path: '/internship',
      name: 'internship',
      component: InternshipPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'tools'
      }
    },
    {
      path: '/ai-settings',
      name: 'ai-settings',
      component: AiSettingsPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'notes'
      }
    },
    {
      path: '/ai-quiz-history',
      name: 'ai-quiz-history',
      component: AiQuizHistoryPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'notes'
      }
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'notes'
      }
    }
  ]
})

function getAuthKeyByScope(scope) {
  if (scope === 'tools') {
    return ''
  }

  if (scope === 'notes') {
    return NOTE_AUTH_KEY
  }

  return AUTH_KEY
}

function getLoginRouteByScope(scope) {
  if (isUnifiedPrivateAuthScope(scope)) {
    return 'notes-login'
  }

  return 'login'
}

function isUnifiedPrivateAuthScope(scope) {
  return scope === 'anime' || scope === 'notes' || scope === 'tools'
}

router.beforeEach((to) => {
  const authToken = localStorage.getItem(AUTH_TOKEN_KEY)
  const hasToken = typeof authToken === 'string' && authToken.trim().length > 0

  if (!hasToken) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(NOTE_AUTH_KEY)
    localStorage.removeItem(NOTE_USERNAME_KEY)
  }

  const animeAuthenticated = hasToken && localStorage.getItem(AUTH_KEY) === 'true'
  const notesAuthenticated = hasToken && localStorage.getItem(NOTE_AUTH_KEY) === 'true'
  const hasAnyPrivateAppAuth = animeAuthenticated || notesAuthenticated

  if (to.name === 'login' && hasAnyPrivateAppAuth) {
    return { name: 'tool-selector' }
  }

  if (to.name === 'notes-login' && hasAnyPrivateAppAuth) {
    return { name: 'tool-selector' }
  }

  const isAuthenticated =
    isUnifiedPrivateAuthScope(to.meta.authScope)
      ? hasAnyPrivateAppAuth
      : hasToken && localStorage.getItem(getAuthKeyByScope(to.meta.authScope)) === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: getLoginRouteByScope(to.meta.authScope) }
  }

  return true
})

export default router
