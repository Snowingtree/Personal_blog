import { createRouter, createWebHistory } from 'vue-router'
import { siteAuthGuard } from './authGuard'
import BlogHomePage from '../pages/BlogHomePage/BlogHomePage.vue'
import LoginPage from '../pages/LoginPage/LoginPage.vue'
import DisplayPage from '../pages/DisplayPage/DisplayPage.vue'
import NotesLoginPage from '../pages/NotesLoginPage/NotesLoginPage.vue'
const BlogArticlePage = () => import('../pages/BlogArticlePage/BlogArticlePage.vue')
const NotesPage = () => import('../pages/NotesPage/NotesPage.vue')
const PhotoWallPage = () => import('../pages/PhotoWallPage/PhotoWallPage.vue')
const ResumeEditorPage = () => import('../pages/ResumeEditorPage/ResumeEditorPage.vue')
const AgentIntroPage = () => import('../pages/AgentIntroPage/AgentIntroPage.vue')
const ToolSelectorPage = () => import('../pages/ToolSelectorPage/ToolSelectorPage.vue')
const InternshipPage = () => import('../pages/InternshipPage/InternshipPage.vue')
const ThoughtsPage = () => import('../pages/ThoughtsPage/ThoughtsPage.vue')

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
      path: '/resume-editor',
      name: 'resume-editor',
      component: ResumeEditorPage
    },
    {
      path: '/agent-intro',
      name: 'agent-intro',
      component: AgentIntroPage
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
      path: '/thoughts',
      name: 'thoughts',
      component: ThoughtsPage,
      meta: {
        followSiteTheme: false,
        privateNetworkOnly: true,
        requiresAuth: true,
        authScope: 'tools'
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

router.beforeEach(siteAuthGuard)

export default router
