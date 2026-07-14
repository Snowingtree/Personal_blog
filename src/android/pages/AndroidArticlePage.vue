<template>
  <div class="android-page android-reader">
    <template v-if="article">
      <header class="android-reader__header">
        <div class="android-reader__eyebrow">
          <span>{{ article.category }}</span>
          <span>{{ article.dateLabel }}</span>
          <span>{{ article.readingTime }}</span>
        </div>
        <h1>{{ article.title }}</h1>
        <p v-if="article.heroNote">{{ article.heroNote }}</p>
        <ul v-if="article.tags?.length" class="android-reader__tags">
          <li v-for="tag in article.tags" :key="tag">{{ tag }}</li>
        </ul>
      </header>

      <article class="android-reader__body note-preview-shell">
        <MdPreview
          class="note-markdown-component android-reader__markdown"
          :editor-id="`android-article-${article.slug}`"
          language="zh-CN"
          theme="light"
          preview-theme="github"
          code-theme="github"
          :model-value="articleContent"
          :md-heading-id="resolveArticleHeadingId"
          :no-mermaid="true"
          :no-katex="true"
          :no-echarts="true"
        />
      </article>
    </template>

    <section v-else class="android-reader__missing">
      <span>404</span>
      <h1>这篇内容暂时不存在</h1>
      <p>你可以从左侧导航重新选择文章或 AI 分享。</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { getAiShareBySlug } from '../../data/aiShares'
import { getBlogArticleBySlug } from '../../data/blogArticles'
import { buildMarkdownHeadingId, normalizeMarkdownSource } from '../../utils/markdownPreview'

const route = useRoute()
const isAiShare = computed(() => route.meta.contentType === 'ai-share')
const article = computed(() => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : ''
  return isAiShare.value ? getAiShareBySlug(slug) : getBlogArticleBySlug(slug)
})
const articleContent = computed(() => normalizeMarkdownSource(article.value?.content || ''))

function resolveArticleHeadingId({ index }) {
  return buildMarkdownHeadingId(index)
}
</script>
