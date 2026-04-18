<template>
  <section class="blog-surface" id="lab">
    <BlogSectionHeading :eyebrow="eyebrow" :title="title" :description="description" />

    <div class="blog-feature-grid">
      <article v-for="feature in features" :key="feature.title" class="blog-feature-card">
        <p class="blog-feature-card__eyebrow">{{ feature.eyebrow }}</p>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>

        <div class="blog-feature-card__meta">
          <span>{{ feature.meta }}</span>
          <span class="blog-feature-card__status">{{ feature.status }}</span>
        </div>

        <div v-if="feature.actions?.length" class="blog-card-actions">
          <template v-for="action in feature.actions" :key="`${feature.title}-${action.label}`">
            <RouterLink
              v-if="action.to"
              :class="['blog-card-link', action.variant === 'secondary' && 'blog-card-link--secondary']"
              :to="action.to"
            >
              {{ action.label }}
            </RouterLink>

            <a
              v-else-if="action.href"
              :class="['blog-card-link', action.variant === 'secondary' && 'blog-card-link--secondary']"
              :href="action.href"
            >
              {{ action.label }}
            </a>

            <span
              v-else
              :class="[
                'blog-card-link',
                'blog-card-link--muted',
                action.variant === 'secondary' && 'blog-card-link--secondary'
              ]"
            >
              {{ action.label }}
            </span>
          </template>
        </div>

        <RouterLink v-else-if="feature.to" class="blog-card-link" :to="feature.to">
          {{ feature.actionLabel }}
        </RouterLink>

        <a v-else-if="feature.href" class="blog-card-link" :href="feature.href">
          {{ feature.actionLabel }}
        </a>

        <span v-else-if="feature.actionLabel" class="blog-card-link blog-card-link--muted">
          {{ feature.actionLabel }}
        </span>
      </article>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import BlogSectionHeading from '../BlogSectionHeading/BlogSectionHeading.vue'

defineProps({
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
  features: {
    type: Array,
    default: () => []
  }
})
</script>
