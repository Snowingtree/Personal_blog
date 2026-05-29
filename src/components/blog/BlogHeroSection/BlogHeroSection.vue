<template>
  <section class="blog-hero">
    <div class="blog-hero__copy">
      <p v-if="hero.eyebrow" class="blog-hero__eyebrow">{{ hero.eyebrow }}</p>
      <h1 v-if="hero.title && !hideHeading">{{ hero.title }}</h1>
      <p v-if="hero.lead" class="blog-hero__lead">{{ hero.lead }}</p>

      <div v-if="spotlightCards.length" class="blog-hero__spotlights">
        <article
          v-for="item in spotlightCards"
          :key="item.title"
          :class="[
            'blog-hero__spotlight',
            item.theme && `blog-hero__spotlight--${item.theme}`,
            getSpotlightTarget(item) && 'is-clickable'
          ]"
          :role="getSpotlightTarget(item) ? 'link' : undefined"
          :tabindex="getSpotlightTarget(item) ? 0 : undefined"
          @click="handleSpotlightClick(item)"
          @keydown.enter.prevent="handleSpotlightKeydown(item)"
          @keydown.space.prevent="handleSpotlightKeydown(item)"
        >
          <p v-if="item.eyebrow" class="blog-hero__spotlight-eyebrow">
            {{ item.eyebrow }}
          </p>

          <div class="blog-hero__spotlight-head">
            <h2>{{ item.title }}</h2>
            <span v-if="item.badge" class="blog-hero__spotlight-badge">
              {{ item.badge }}
            </span>
          </div>

          <p v-if="item.description" class="blog-hero__spotlight-copy">
            {{ item.description }}
          </p>

          <ul v-if="item.meta?.length" class="blog-chip-list blog-hero__spotlight-meta">
            <li v-for="metaItem in item.meta" :key="metaItem">{{ metaItem }}</li>
          </ul>

          <div
            v-if="item.primaryLabel || item.secondaryLabel"
            class="blog-card-actions"
          >
            <a
              v-if="item.primaryLabel && item.primaryHref"
              class="blog-card-link"
              :href="item.primaryHref"
              @click.stop
            >
              {{ item.primaryLabel }}
            </a>
            <RouterLink
              v-else-if="item.primaryLabel && item.primaryTo"
              class="blog-card-link"
              :to="item.primaryTo"
              @click.stop
            >
              {{ item.primaryLabel }}
            </RouterLink>
            <span
              v-else-if="item.primaryLabel"
              class="blog-card-link blog-card-link--disabled"
            >
              {{ item.primaryLabel }}
            </span>

            <a
              v-if="item.secondaryLabel && item.secondaryHref"
              class="blog-card-link blog-card-link--secondary"
              :href="item.secondaryHref"
              @click.stop
            >
              {{ item.secondaryLabel }}
            </a>
            <RouterLink
              v-else-if="item.secondaryLabel && item.secondaryTo"
              class="blog-card-link blog-card-link--secondary"
              :to="item.secondaryTo"
              @click.stop
            >
              {{ item.secondaryLabel }}
            </RouterLink>
            <span
              v-else-if="item.secondaryLabel"
              class="blog-card-link blog-card-link--secondary blog-card-link--disabled"
            >
              {{ item.secondaryLabel }}
            </span>
          </div>
        </article>
      </div>

      <div v-if="hasActions" class="blog-hero__actions">
        <a
          v-if="secondaryLabel && secondaryHref"
          class="blog-secondary-link"
          :href="secondaryHref"
        >
          {{ secondaryLabel }}
        </a>

        <RouterLink
          v-if="noteLabel && noteTo"
          class="blog-secondary-link"
          :to="noteTo"
        >
          {{ noteLabel }}
        </RouterLink>

        <a
          v-if="primaryLabel && primaryHref"
          class="blog-primary-link"
          :href="primaryHref"
          target="_blank"
          rel="noreferrer"
        >
          <svg
            v-if="primaryIcon === 'github'"
            class="blog-link-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.51v-1.8c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.18-1.52-1.18-1.52-.97-.66.07-.64.07-.64 1.07.08 1.64 1.1 1.64 1.1.95 1.63 2.5 1.16 3.11.89.1-.69.37-1.16.67-1.43-2.35-.27-4.82-1.17-4.82-5.22 0-1.15.41-2.1 1.08-2.84-.11-.27-.47-1.36.11-2.84 0 0 .88-.28 2.89 1.09a9.98 9.98 0 0 1 5.26 0c2.01-1.37 2.89-1.09 2.89-1.09.58 1.48.22 2.57.11 2.84.67.74 1.08 1.69 1.08 2.84 0 4.06-2.48 4.95-4.84 5.21.38.33.72.97.72 1.96v2.91c0 .28.19.62.73.51A10.5 10.5 0 0 0 12 1.5Z"
            />
          </svg>
          <span>{{ primaryLabel }}</span>
        </a>

        <RouterLink
          v-else-if="primaryLabel && primaryTo"
          class="blog-primary-link"
          :to="primaryTo"
        >
          <svg
            v-if="primaryIcon === 'github'"
            class="blog-link-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.51v-1.8c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.18-1.52-1.18-1.52-.97-.66.07-.64.07-.64 1.07.08 1.64 1.1 1.64 1.1.95 1.63 2.5 1.16 3.11.89.1-.69.37-1.16.67-1.43-2.35-.27-4.82-1.17-4.82-5.22 0-1.15.41-2.1 1.08-2.84-.11-.27-.47-1.36.11-2.84 0 0 .88-.28 2.89 1.09a9.98 9.98 0 0 1 5.26 0c2.01-1.37 2.89-1.09 2.89-1.09.58 1.48.22 2.57.11 2.84.67.74 1.08 1.69 1.08 2.84 0 4.06-2.48 4.95-4.84 5.21.38.33.72.97.72 1.96v2.91c0 .28.19.62.73.51A10.5 10.5 0 0 0 12 1.5Z"
            />
          </svg>
          <span>{{ primaryLabel }}</span>
        </RouterLink>
      </div>

      <ul v-if="stats.length" class="blog-hero__stats">
        <li v-for="stat in stats" :key="stat.label">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </li>
      </ul>
    </div>

    <slot name="panel">
      <aside class="blog-hero__panel" id="about">
        <p class="blog-hero__panel-label">{{ panel.eyebrow || hero.noteLabel }}</p>
        <h2>{{ panel.title || hero.noteTitle }}</h2>
        <p class="blog-hero__panel-copy">{{ panel.lead || hero.noteBody }}</p>

        <section v-if="panelNotes.length" class="blog-hero__panel-section">
          <p class="blog-hero__panel-section-title">{{ panelNotesTitle }}</p>
          <ul class="blog-bullet-list blog-bullet-list--panel">
            <li v-for="item in panelNotes" :key="item">{{ item }}</li>
          </ul>
        </section>

        <div v-if="panel.status?.length" class="blog-hero__panel-status">
          <div
            v-for="item in panel.status"
            :key="item.label"
            class="blog-hero__panel-status-item"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <ul v-else class="blog-hero__tags">
          <li v-for="tag in hero.tags" :key="tag">{{ tag }}</li>
        </ul>
      </aside>
    </slot>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  hero: {
    type: Object,
    default: () => ({})
  },
  panel: {
    type: Object,
    default: () => ({})
  },
  spotlight: {
    type: Object,
    default: () => ({})
  },
  spotlights: {
    type: Array,
    default: () => []
  },
  hideHeading: {
    type: Boolean,
    default: false
  },
  stats: {
    type: Array,
    default: () => []
  },
  panelNotes: {
    type: Array,
    default: () => []
  },
  panelNotesTitle: {
    type: String,
    default: '最近在做'
  },
  primaryTo: {
    type: String,
    default: '/login'
  },
  primaryHref: {
    type: String,
    default: ''
  },
  primaryLabel: {
    type: String,
    default: ''
  },
  primaryIcon: {
    type: String,
    default: ''
  },
  noteTo: {
    type: String,
    default: '/notes'
  },
  noteLabel: {
    type: String,
    default: ''
  },
  secondaryHref: {
    type: String,
    default: '#writing'
  },
  secondaryLabel: {
    type: String,
    default: ''
  }
})

const spotlightCards = computed(() => {
  if (props.spotlights.length) {
    return props.spotlights.filter((item) => item?.title)
  }

  return props.spotlight?.title ? [props.spotlight] : []
})

const hasActions = computed(() => {
  return Boolean(
    (props.secondaryLabel && props.secondaryHref)
      || (props.noteLabel && props.noteTo)
      || (props.primaryLabel && (props.primaryHref || props.primaryTo))
  )
})

function getSpotlightTarget(item) {
  return item?.cardTo || item?.cardHref || ''
}

function handleSpotlightClick(item) {
  const target = getSpotlightTarget(item)

  if (!target) {
    return
  }

  if (item.cardTo) {
    router.push(item.cardTo)
    return
  }

  window.location.href = target
}

function handleSpotlightKeydown(item) {
  handleSpotlightClick(item)
}
</script>
