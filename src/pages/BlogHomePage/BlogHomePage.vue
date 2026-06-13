<template>
  <main class="blog-page blog-page--home" :class="{ 'blog-page--dark': shouldUseDarkTheme }">
    <div
      class="blog-theme-tassel"
      :class="{
        'is-dark': isDarkTheme,
        'is-pulling': isTasselDragging,
        'is-armed': tasselPull >= TASSLE_TRIGGER_DISTANCE
      }"
      :style="tasselStyle"
      role="button"
      tabindex="0"
      :aria-label="isDarkTheme ? '向下拉切换浅色主题' : '向下拉切换暗色主题'"
      :aria-pressed="isDarkTheme"
      @pointerdown="handleTasselPointerDown"
      @pointermove="handleTasselPointerMove"
      @pointerup="handleTasselPointerUp"
      @pointercancel="handleTasselPointerCancel"
      @keydown.enter.prevent="toggleTheme"
      @keydown.space.prevent="toggleTheme"
    >
      <span class="blog-theme-tassel__cord" />
      <span class="blog-theme-tassel__head">
        <span class="blog-theme-tassel__cap" />
        <span class="blog-theme-tassel__label">{{ isDarkTheme ? '夜' : '昼' }}</span>
      </span>
      <span class="blog-theme-tassel__fringe" />
    </div>

    <div class="blog-shell">
      <BlogTopbar
        title="Liu An Journal"
        :avatar-src="profileAvatar"
        avatar-alt="Homepage avatar"
        agent-label="Agent"
        :agent-href="resolvePrivateAppUrl('/agent/')"
        :tool-label="topbarToolLabel"
        :tool-href="topbarToolHref"
        :show-theme-toggle="true"
        :is-dark-theme="isDarkTheme"
        github-href="https://github.com/Snowingtree?tab=repositories"
        @toggle-theme="toggleTheme"
      />

      <BlogHeroSection
        :hero="hero"
        :panel="profile"
        :spotlights="projectSpotlights"
        :hide-heading="true"
      >
        <template #panel>
          <div class="blog-hero__panel-stack">
            <RouterLink class="blog-card-button blog-card-button--secondary blog-home-photo-button" to="/photo-wall">
              照片
            </RouterLink>
            <BlogCalendarPanel />
            <BlogProfileCard :panel="profile" />
          </div>
        </template>
      </BlogHeroSection>

      <div class="blog-content blog-content--single">
        <div class="blog-main-column">
          <BlogPostList
            eyebrow="Article Share"
            :title="homepageArticleSection.title"
            :description="homepageArticleSection.description"
            :posts="homepageArticleCards"
            :page-size="3"
            section-id="writing"
          />

          <BlogPostList
            eyebrow="AI Share"
            :title="homepageAiShareSection.title"
            :description="homepageAiShareSection.description"
            :posts="homepageAiShareCards"
            :page-size="3"
            section-id="ai-sharing"
          />
        </div>
      </div>

    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import profileAvatar from '../../assets/images/headerPH.png'
import BlogCalendarPanel from '../../components/blog/BlogCalendarPanel/BlogCalendarPanel.vue'
import BlogHeroSection from '../../components/blog/BlogHeroSection/BlogHeroSection.vue'
import BlogPostList from '../../components/blog/BlogPostList/BlogPostList.vue'
import BlogProfileCard from '../../components/blog/BlogProfileCard/BlogProfileCard.vue'
import BlogTopbar from '../../components/blog/BlogTopbar/BlogTopbar.vue'
import { homepageAiShareCards, homepageAiShareSection } from '../../data/aiShares'
import { homepageArticleCards, homepageArticleSection } from '../../data/blogArticles'
import { useSiteTheme } from '../../hooks/useSiteTheme'
import { resolvePrivateAppUrl } from '../../utils/privateAccess'
const TASSLE_MAX_PULL = 72
const TASSLE_TRIGGER_DISTANCE = 46

const { isDarkTheme, shouldUseDarkTheme, toggleTheme: toggleSiteTheme } = useSiteTheme()
const tasselPull = ref(0)
const isTasselDragging = ref(false)
const tasselStyle = computed(() => ({
  '--tassel-pull': `${tasselPull.value}px`
}))
let tasselStartY = 0

const topbarToolLabel = computed(() => '笔记')
const topbarToolHref = computed(() => resolvePrivateAppUrl('/notes-login'))

function toggleTheme() {
  toggleSiteTheme()
}

function resetTasselPull() {
  tasselPull.value = 0
  isTasselDragging.value = false
}

function handleTasselPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  tasselStartY = event.clientY - tasselPull.value
  isTasselDragging.value = true
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function handleTasselPointerMove(event) {
  if (!isTasselDragging.value) {
    return
  }

  tasselPull.value = Math.min(TASSLE_MAX_PULL, Math.max(0, event.clientY - tasselStartY))
}

function handleTasselPointerUp(event) {
  if (!isTasselDragging.value) {
    return
  }

  if (tasselPull.value >= TASSLE_TRIGGER_DISTANCE) {
    toggleTheme()
  }

  resetTasselPull()
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

function handleTasselPointerCancel(event) {
  resetTasselPull()
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

const hero = {
  eyebrow: 'PERSONAL BLOG / 2026',
  title: '把代码、设计和日常观察整理成一座持续更新的个人博客。',
  lead: '这里持续整理前端实验、项目复盘、AI 分享，以及已经独立运行的站内项目。'
}

const projectSpotlights = [
  {
    eyebrow: '站内项目',
    title: 'Snowingress My Components',
    theme: 'components',
    badge: '文档已上线',
    description:
      '组件库文档继续作为主站下的独立项目维护，可以直接查看 Button、Input、Select、Switch 等组件示例与说明。',
    meta: ['Vue 3', 'VitePress', '10+ Components'],
    primaryLabel: '打开组件库文档',
    primaryHref: '/components/index.html',
    secondaryLabel: '查看 Button 示例',
    secondaryHref: '/components/Components/Button.html'
  },
  {
    eyebrow: '站内项目',
    title: '小兔鲜商城',
    theme: 'market',
    badge: '商城项目已接入',
    description:
      '小兔鲜以独立子项目方式运行，保留商城浏览、登录和商品详情等完整路由，首页只提供清晰入口。',
    meta: ['Vue 3', 'Vite'],
    primaryLabel: '打开小兔鲜商城',
    primaryHref: '/xiao-tu-xian/',
    secondaryLabel: '查看登录页',
    secondaryHref: '/xiao-tu-xian/login'
  },
  {
    eyebrow: '站内项目',
    title: 'AI 项目实验室',
    theme: 'ai',
    badge: 'Agent 展示',
    description:
      '展示自建 Web Agent 工作台：多会话、工作区文件、RAG、MCP、Skills、审计与用量分析。',
    meta: ['Web Agent', 'Workspace Tools', 'RAG / MCP'],
    primaryLabel: '查看 Agent',
    primaryTo: '/agent-intro',
    cardTo: '/agent-intro'
  }
]

const profile = {
  eyebrow: 'Mini Demo Lab',
  title: '公开工具',
  lead: '',
  demos: [
    {
      eyebrow: 'Canvas Demo',
      title: '在线简历编辑',
      cardTo: '/resume-editor'
    },
    {
      eyebrow: 'Coming Soon',
      title: '预留工具 01'
    },
    {
      eyebrow: 'Coming Soon',
      title: '预留工具 02'
    }
  ]
}
</script>

