<template>
  <main class="blog-page blog-article-page" :class="{ 'blog-page--dark': shouldUseDarkTheme }">
    <div class="blog-shell">
      <BlogTopbar
        title="Liu An Journal"
        :avatar-src="profileAvatar"
        avatar-alt="Homepage avatar"
        tool-label="首页"
        tool-to="/"
        :feature-label="featureLabel"
        :feature-to="featureTo"
        :show-theme-toggle="true"
        :is-dark-theme="isDarkTheme"
        github-href="https://github.com/Snowingtree?tab=repositories"
        @toggle-theme="toggleTheme"
      />

      <template v-if="article">
        <div class="blog-article-layout">
          <article
            ref="articleBodyRef"
            class="blog-surface blog-article-body note-preview-shell"
          >
            <MdPreview
              class="note-markdown-component blog-article-markdown"
              :editor-id="`blog-article-${article.slug}`"
              language="zh-CN"
              :theme="markdownTheme"
              :preview-theme="markdownPreviewTheme"
              code-theme="github"
              :model-value="articleContent"
              :md-heading-id="resolveArticleHeadingId"
              :no-mermaid="true"
              :no-katex="true"
              :no-echarts="true"
            />
          </article>

          <aside class="blog-surface blog-article-aside">
            <p class="blog-profile-card__eyebrow">{{ outlineLabel }}</p>
            <h2>{{ article.title }}</h2>

            <ul v-if="articleHeadings.length" class="note-outline-list blog-article-outline">
              <li v-for="heading in articleHeadings" :key="heading.id" class="note-outline-item">
                <button
                  type="button"
                  class="note-outline-button"
                  :style="{ '--outline-indent': `${headingIndentBase + (heading.level - 1) * 16}px` }"
                  @click="jumpToHeading(heading.id)"
                >
                  {{ heading.text }}
                </button>
              </li>
            </ul>

            <p v-else class="blog-article-outline__empty">当前文章还没有可用标题。</p>

            <RouterLink class="blog-primary-link blog-article-aside__action" :to="featureTo">
              {{ backLabel }}
            </RouterLink>
          </aside>
        </div>
      </template>

      <section v-else class="blog-surface blog-article-missing">
        <p class="blog-profile-card__eyebrow">{{ missingEyebrow }}</p>
        <h1>{{ missingTitle }}</h1>
        <p>
          路由已经接好了，但这个标识目前还没有对应到具体内容。
        </p>
        <RouterLink class="blog-primary-link" to="/">
          返回首页
        </RouterLink>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { RouterLink, useRoute } from 'vue-router'
import profileAvatar from '../../assets/images/headerPH.png'
import BlogTopbar from '../../components/blog/BlogTopbar/BlogTopbar.vue'
import { getBlogArticleBySlug } from '../../data/blogArticles'
import { getAiShareBySlug } from '../../data/aiShares'
import { useSiteTheme } from '../../hooks/useSiteTheme'
import {
  buildMarkdownHeadingId,
  extractMarkdownHeadings,
  normalizeMarkdownSource
} from '../../utils/markdownPreview'

const route = useRoute()
const articleBodyRef = ref(null)
const headingIndentBase = 14
const { isDarkTheme, shouldUseDarkTheme, toggleTheme } = useSiteTheme()
const isAiShare = computed(() => route.meta.contentType === 'ai-share')
const markdownTheme = computed(() => (shouldUseDarkTheme.value ? 'dark' : 'light'))
const markdownPreviewTheme = computed(() => (shouldUseDarkTheme.value ? 'github' : 'smart-blue'))

const featureLabel = computed(() => (isAiShare.value ? 'AI 分享' : '文章'))
const featureTo = computed(() => (isAiShare.value ? '/#ai-sharing' : '/#writing'))
const outlineLabel = computed(() => (isAiShare.value ? 'AI 分享目录' : '文章目录'))
const backLabel = computed(() => (isAiShare.value ? '回到 AI 分享区' : '回到文章区'))
const missingEyebrow = computed(() => (isAiShare.value ? 'AI 分享不存在' : '文章不存在'))
const missingTitle = computed(() =>
  isAiShare.value ? '这篇 AI 分享暂时还没有内容。' : '这篇文章暂时还没有内容。'
)

const article = computed(() => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : ''
  return isAiShare.value ? getAiShareBySlug(slug) : getBlogArticleBySlug(slug)
})

const articleContent = computed(() => normalizeMarkdownSource(article.value?.content || ''))
const articleHeadings = computed(() => extractMarkdownHeadings(articleContent.value))

function resolveArticleHeadingId({ index }) {
  return buildMarkdownHeadingId(index)
}

function escapeHeadingSelector(value) {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value)
  }

  return String(value).replace(/["\\#.:]/g, '\\$&')
}

function jumpToHeading(headingId) {
  if (!headingId) {
    return
  }

  const headingElement = articleBodyRef.value?.querySelector?.(
    `#${escapeHeadingSelector(headingId)}`
  )

  headingElement?.scrollIntoView({
    block: 'start',
    behavior: 'smooth'
  })
}
</script>
