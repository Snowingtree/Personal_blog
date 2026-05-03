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
        :feature-label="topbarFeatureLabel"
        :feature-href="topbarFeatureHref"
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

      <RouterLink class="blog-surface blog-games-entrance" to="/games">
        <svg class="blog-games-entrance__icon" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="2" width="24" height="16" rx="4" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="11" cy="10" r="2" fill="currentColor"/>
          <line x1="11" y1="7" x2="11" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="8" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="21" cy="8.5" r="1.2" fill="currentColor"/>
          <circle cx="24" cy="11.5" r="1.2" fill="currentColor"/>
        </svg>
        <span class="blog-games-entrance__label">进入小游戏</span>
        <svg class="blog-games-entrance__arrow" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </RouterLink>
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

const topbarToolLabel = computed(() => '工具')
const topbarToolHref = computed(() => resolvePrivateAppUrl('/notes-login'))
const topbarFeatureLabel = computed(() => '动漫')
const topbarFeatureHref = computed(() => resolvePrivateAppUrl('/login'))

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
    badge: '开发中',
    description:
      '后续会把正在做的 AI 产品实验、工作流验证和交互原型单独整理到这里。目前先保留项目位，不开放跳转。',
    meta: ['AI Product', 'Workflow', 'In Progress'],
    primaryLabel: '即将开放',
    secondaryLabel: '等待发布'
  }
]

const profile = {
  eyebrow: 'About This Site',
  title: '一个持续承接内容和项目入口的个人站点',
  lead: '这里会继续更新文章分享、AI 分享和独立项目入口，首页保持简洁，只负责把内容组织清楚。',
  status: [
    { label: '当前状态', value: '公开首页已上线' },
    { label: '独立项目', value: '组件库 / 小兔鲜商城' },
    { label: '内容区块', value: '文章 / AI 分享' }
  ]
}
</script>

<style scoped>
.blog-games-entrance {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  padding: 20px 28px;
  color: var(--text-secondary, #666);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.blog-games-entrance:hover {
  color: var(--text-primary, #222);
  box-shadow: 0 24px 70px var(--blog-shadow), 0 0 0 1px var(--blog-line);
  transform: translateY(-2px);
}

.blog-games-entrance__icon {
  width: 36px;
  height: 22px;
  flex-shrink: 0;
}

.blog-games-entrance__label {
  font-size: 15px;
  letter-spacing: 0.04em;
}

.blog-games-entrance__arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s, transform 0.2s;
}

.blog-games-entrance:hover .blog-games-entrance__arrow {
  opacity: 1;
  transform: translateX(0);
}
</style>
