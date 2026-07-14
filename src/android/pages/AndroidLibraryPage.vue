<template>
  <div class="android-page android-library">
    <header class="android-library__header">
      <div class="android-library__icon">
        <component :is="pageIcon" :size="24" />
      </div>
      <div>
        <p>{{ isAiShare ? 'AI NOTES' : 'WRITING' }}</p>
        <h1>{{ pageTitle }}</h1>
        <span>{{ pageDescription }}</span>
      </div>
    </header>

    <div class="android-library__list">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="android-library-card"
      >
        <div class="android-library-card__meta">
          <span>{{ item.category }}</span>
          <span>{{ item.dateLabel }}</span>
          <span>{{ item.readingTime }}</span>
        </div>

        <div class="android-library-card__body">
          <div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.excerpt }}</p>
          </div>
          <ChevronRight :size="20" />
        </div>

        <ul v-if="item.tags?.length" class="android-library-card__tags">
          <li v-for="tag in item.tags" :key="tag">{{ tag }}</li>
        </ul>
      </RouterLink>
    </div>

    <p v-if="!items.length" class="android-library__empty">暂时还没有内容。</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, FileText, Sparkles } from 'lucide-vue-next'
import { homepageAiShareCards, homepageAiShareSection } from '../../data/aiShares'
import { homepageArticleCards, homepageArticleSection } from '../../data/blogArticles'

const props = defineProps({
  contentType: {
    type: String,
    default: 'article'
  }
})

const isAiShare = computed(() => props.contentType === 'ai-share')
const items = computed(() => (isAiShare.value ? homepageAiShareCards : homepageArticleCards))
const pageTitle = computed(() =>
  isAiShare.value ? homepageAiShareSection.title : homepageArticleSection.title
)
const pageDescription = computed(() =>
  isAiShare.value
    ? homepageAiShareSection.description
    : '开发记录、项目复盘，以及值得被完整写下来的日常观察。'
)
const pageIcon = computed(() => (isAiShare.value ? Sparkles : FileText))
</script>
