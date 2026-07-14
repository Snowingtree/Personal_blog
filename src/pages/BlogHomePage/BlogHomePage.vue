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
import {
  siteHero as hero,
  siteProjectSpotlights as projectSpotlights,
  sitePublicTools as profile
} from '../../data/siteOverview'
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
const topbarToolHref = computed(() => resolvePrivateAppUrl('/login'))

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

</script>

