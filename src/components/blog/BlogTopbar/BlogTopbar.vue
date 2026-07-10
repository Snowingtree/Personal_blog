<template>
  <header class="blog-topbar">
    <component
      :is="githubHref ? 'a' : RouterLink"
      class="blog-brand"
      v-bind="
        githubHref
          ? {
              href: githubHref,
              target: '_blank',
              rel: 'noreferrer'
            }
          : {
              to: '/'
            }
      "
    >
      <span v-if="avatarSrc" class="blog-brand__avatar-shell">
        <img class="blog-brand__avatar" :src="avatarSrc" :alt="avatarAlt || title || 'Homepage avatar'" />
      </span>
      <span v-else class="blog-brand__mark">LA</span>
      <span class="blog-brand__copy">
        <strong>{{ title }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </span>
    </component>

    <nav v-if="links.length" class="blog-nav">
      <a v-for="link in links" :key="link.label" :href="link.href">{{ link.label }}</a>
    </nav>

    <div
      v-if="agentLabel || xianyuLabel || toolLabel || featureLabel || githubHref || showThemeToggle"
      class="blog-topbar__actions"
    >
      <a
        v-if="agentLabel && agentHref"
        class="blog-topbar__link"
        :href="agentHref"
      >
        {{ agentLabel }}
      </a>

      <RouterLink v-else-if="agentLabel && agentTo" class="blog-topbar__link" :to="agentTo">
        {{ agentLabel }}
      </RouterLink>

      <a
        v-if="xianyuLabel && xianyuHref"
        class="blog-topbar__icon-link blog-topbar__xianyu-link"
        :href="xianyuHref"
        :aria-label="xianyuLabel"
        :title="xianyuLabel"
      >
        <svg class="blog-link-icon blog-link-icon--fish" viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M8 33c8-11 20-17 34-16 7 .4 12 3.2 15 8-2.5 3.7-6.3 6.3-11.2 7.8L57 45c-9.2 1.5-16-1.3-20.4-8.2-11.1-.2-20.6-1.5-28.6-3.8Z"
            fill="currentColor"
          />
          <circle cx="43" cy="25" r="2.8" fill="currentColor" class="blog-link-icon__fish-eye" />
        </svg>
      </a>

      <RouterLink
        v-else-if="xianyuLabel && xianyuTo"
        class="blog-topbar__icon-link blog-topbar__xianyu-link"
        :to="xianyuTo"
        :aria-label="xianyuLabel"
        :title="xianyuLabel"
      >
        <svg class="blog-link-icon blog-link-icon--fish" viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M8 33c8-11 20-17 34-16 7 .4 12 3.2 15 8-2.5 3.7-6.3 6.3-11.2 7.8L57 45c-9.2 1.5-16-1.3-20.4-8.2-11.1-.2-20.6-1.5-28.6-3.8Z"
            fill="currentColor"
          />
          <circle cx="43" cy="25" r="2.8" fill="currentColor" class="blog-link-icon__fish-eye" />
        </svg>
      </RouterLink>

      <a
        v-if="toolLabel && toolHref"
        class="blog-topbar__link"
        :href="toolHref"
      >
        {{ toolLabel }}
      </a>

      <RouterLink v-else-if="toolLabel && toolTo" class="blog-topbar__link" :to="toolTo">
        {{ toolLabel }}
      </RouterLink>

      <a
        v-if="featureLabel && featureHref"
        class="blog-topbar__button"
        :href="featureHref"
      >
        <span>{{ featureLabel }}</span>
      </a>

      <RouterLink v-else-if="featureLabel && featureTo" class="blog-topbar__button" :to="featureTo">
        <span>{{ featureLabel }}</span>
      </RouterLink>

      <button
        v-if="showThemeToggle"
        type="button"
        class="blog-topbar__theme-toggle"
        :aria-label="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="$emit('toggle-theme')"
      >
        <svg
          v-if="isDarkTheme"
          class="blog-link-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M21 12.8A8.99 8.99 0 0 1 11.2 3a1 1 0 0 0-1.28 1.22A7 7 0 1 0 19.78 14.08 1 1 0 0 0 21 12.8Z"
          />
        </svg>

        <svg
          v-else
          class="blog-link-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 3.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V4a.75.75 0 0 1 .75-.75Zm0 13a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm8.75-4.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H20a.75.75 0 0 1 .75.75ZM6 12a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 6 12Zm11.127-5.127a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Zm-11.314 0a.75.75 0 0 1 1.06 1.061L5.814 8.995A.75.75 0 0 1 4.753 7.934l1.06-1.06Zm13.435 10.314a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0Zm-14.495 0 1.06 1.061a.75.75 0 0 1-1.06 1.06l-1.061-1.06a.75.75 0 1 1 1.06-1.061ZM12 18.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 18.5Z"
          />
        </svg>
      </button>

      <a
        v-if="githubHref"
        class="blog-topbar__icon-link"
        :href="githubHref"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub"
      >
        <svg class="blog-link-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.51v-1.8c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.18-1.52-1.18-1.52-.97-.66.07-.64.07-.64 1.07.08 1.64 1.1 1.64 1.1.95 1.63 2.5 1.16 3.11.89.1-.69.37-1.16.67-1.43-2.35-.27-4.82-1.17-4.82-5.22 0-1.15.41-2.1 1.08-2.84-.11-.27-.47-1.36.11-2.84 0 0 .88-.28 2.89 1.09a9.98 9.98 0 0 1 5.26 0c2.01-1.37 2.89-1.09 2.89-1.09.58 1.48.22 2.57.11 2.84.67.74 1.08 1.69 1.08 2.84 0 4.06-2.48 4.95-4.84 5.21.38.33.72.97.72 1.96v2.91c0 .28.19.62.73.51A10.5 10.5 0 0 0 12 1.5Z"
          />
        </svg>
      </a>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineEmits(['toggle-theme'])

defineProps({
  title: {
    type: String,
    default: ''
  },
  avatarSrc: {
    type: String,
    default: ''
  },
  avatarAlt: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  links: {
    type: Array,
    default: () => []
  },
  agentLabel: {
    type: String,
    default: ''
  },
  agentTo: {
    type: String,
    default: ''
  },
  agentHref: {
    type: String,
    default: ''
  },
  xianyuLabel: {
    type: String,
    default: ''
  },
  xianyuTo: {
    type: String,
    default: ''
  },
  xianyuHref: {
    type: String,
    default: ''
  },
  toolLabel: {
    type: String,
    default: ''
  },
  toolTo: {
    type: String,
    default: ''
  },
  toolHref: {
    type: String,
    default: ''
  },
  featureLabel: {
    type: String,
    default: ''
  },
  featureTo: {
    type: String,
    default: ''
  },
  featureHref: {
    type: String,
    default: ''
  },
  showThemeToggle: {
    type: Boolean,
    default: false
  },
  isDarkTheme: {
    type: Boolean,
    default: false
  },
  githubHref: {
    type: String,
    default: ''
  }
})
</script>
