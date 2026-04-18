<template>
  <section class="blog-surface" :id="sectionId || undefined">
    <BlogSectionHeading :eyebrow="eyebrow" :title="title" :description="description" />

    <div class="blog-post-page-shell">
      <Transition :name="pageTransitionName">
        <div :key="currentPage" class="blog-post-page">
          <div class="blog-post-list">
            <component
              :is="post.to ? RouterLink : 'article'"
              v-for="(post, index) in visiblePosts"
              :key="post.to || post.title"
              v-bind="post.to ? { to: post.to } : {}"
              :class="['blog-post-card', post.to && 'blog-post-card--interactive']"
              :style="{ '--post-index': index }"
            >
              <div class="blog-post-card__meta">
                <span>{{ post.category }}</span>
                <time :datetime="post.date">{{ post.dateLabel }}</time>
                <span>{{ post.readingTime }}</span>
              </div>

              <h3>{{ post.title }}</h3>
              <p>{{ post.excerpt }}</p>

              <span v-if="post.to" class="blog-post-card__cta">阅读全文</span>
            </component>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="showPager" class="blog-post-list__footer">
      <BlogPageFlow
        :current-page="currentPage"
        :total-pages="totalPages"
        :page-size="normalizedPageSize"
        :total-items="totalPosts"
        :has-previous-page="hasPreviousPage"
        :has-next-page="hasNextPage"
        @previous="goToPreviousPage"
        @next="goToNextPage"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BlogPageFlow from '../BlogPageFlow/BlogPageFlow.vue'
import BlogSectionHeading from '../BlogSectionHeading/BlogSectionHeading.vue'

const props = defineProps({
  eyebrow: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  posts: {
    type: Array,
    default: () => []
  },
  pageSize: {
    type: Number,
    default: 3
  },
  showPager: {
    type: Boolean,
    default: true
  },
  sectionId: {
    type: String,
    default: ''
  }
})

const currentPage = ref(1)
const transitionDirection = ref('next')

const normalizedPageSize = computed(() => Math.max(1, props.pageSize))
const totalPosts = computed(() => props.posts.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalPosts.value / normalizedPageSize.value)))
const pageTransitionName = computed(() =>
  transitionDirection.value === 'prev' ? 'blog-post-page-prev' : 'blog-post-page-next'
)

const visiblePosts = computed(() => {
  if (!props.showPager) {
    return props.posts
  }

  const startIndex = (currentPage.value - 1) * normalizedPageSize.value
  const endIndex = startIndex + normalizedPageSize.value
  return props.posts.slice(startIndex, endIndex)
})

const hasPreviousPage = computed(() => currentPage.value > 1)
const hasNextPage = computed(() => currentPage.value < totalPages.value)

function goToPreviousPage() {
  if (hasPreviousPage.value) {
    transitionDirection.value = 'prev'
    currentPage.value -= 1
  }
}

function goToNextPage() {
  if (hasNextPage.value) {
    transitionDirection.value = 'next'
    currentPage.value += 1
  }
}

watch(
  () => [props.posts.length, normalizedPageSize.value],
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
  },
  { immediate: true }
)
</script>
