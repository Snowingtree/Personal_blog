<template>
  <div class="blog-post-pager">
    <div class="blog-post-pager__top">
      <div class="blog-post-pager__copy">
        <span class="blog-post-pager__eyebrow">{{ flowLabel }}</span>

        <div class="blog-post-pager__track" aria-hidden="true">
          <span
            v-for="page in pageDots"
            :key="page"
            :class="['blog-post-pager__dot', page === currentPage && 'is-active']"
          />
        </div>
      </div>

      <div v-if="showControls" class="blog-post-pager__controls">
        <button
          type="button"
          class="blog-card-button blog-card-button--secondary"
          :disabled="!hasPreviousPage"
          @click="handlePrevious"
        >
          {{ previousLabel }}
        </button>
        <button
          type="button"
          class="blog-card-button blog-card-button--primary"
          :disabled="!hasNextPage"
          @click="handleNext"
        >
          {{ nextLabel }}
        </button>
      </div>
    </div>

    <div class="blog-post-pager__stats">
      <article class="blog-post-pager__stat">
        <span>{{ pageSizeLabel }}</span>
        <strong>{{ normalizedPageSize }} {{ unitLabel }}</strong>
      </article>
      <article class="blog-post-pager__stat blog-post-pager__stat--accent">
        <span>{{ currentPageLabel }}</span>
        <strong>{{ normalizedCurrentPage }} / {{ normalizedTotalPages }}</strong>
      </article>
      <article class="blog-post-pager__stat">
        <span>{{ totalItemsLabel }}</span>
        <strong>{{ normalizedTotalItems }} {{ unitLabel }}</strong>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 3
  },
  totalItems: {
    type: Number,
    default: 0
  },
  hasPreviousPage: {
    type: Boolean,
    default: false
  },
  hasNextPage: {
    type: Boolean,
    default: false
  },
  showControls: {
    type: Boolean,
    default: true
  },
  flowLabel: {
    type: String,
    default: 'Page Flow'
  },
  previousLabel: {
    type: String,
    default: '上一页'
  },
  nextLabel: {
    type: String,
    default: '下一页'
  },
  pageSizeLabel: {
    type: String,
    default: '每页展示'
  },
  currentPageLabel: {
    type: String,
    default: '当前页'
  },
  totalItemsLabel: {
    type: String,
    default: '总篇数'
  },
  unitLabel: {
    type: String,
    default: '篇'
  }
})

const emit = defineEmits(['previous', 'next'])

const normalizedCurrentPage = computed(() => Math.max(1, props.currentPage))
const normalizedTotalPages = computed(() => Math.max(1, props.totalPages))
const normalizedPageSize = computed(() => Math.max(1, props.pageSize))
const normalizedTotalItems = computed(() => Math.max(0, props.totalItems))
const pageDots = computed(() =>
  Array.from({ length: normalizedTotalPages.value }, (_, index) => index + 1)
)

function handlePrevious() {
  if (props.hasPreviousPage) {
    emit('previous')
  }
}

function handleNext() {
  if (props.hasNextPage) {
    emit('next')
  }
}
</script>
