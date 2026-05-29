<template>
  <section class="blog-surface blog-profile-card">
    <div class="blog-profile-card__header">
      <div v-if="panel.avatarSrc" class="blog-profile-card__avatar-frame">
        <img
          class="blog-profile-card__avatar"
          :src="panel.avatarSrc"
          :alt="panel.avatarAlt || panel.title || 'Profile avatar'"
        />
      </div>

      <div class="blog-profile-card__intro">
        <p class="blog-profile-card__eyebrow">{{ panel.eyebrow }}</p>
        <h2>{{ panel.title }}</h2>
        <p v-if="panel.lead" class="blog-profile-card__lead">{{ panel.lead }}</p>
      </div>
    </div>

    <section v-if="notes.length" class="blog-profile-card__notes">
      <p class="blog-profile-card__notes-title">{{ notesTitle }}</p>
      <ul class="blog-bullet-list">
        <li v-for="item in notes" :key="item">{{ item }}</li>
      </ul>
    </section>

    <div v-if="panel.demos?.length" class="blog-profile-card__demo-list">
      <component
        :is="getDemoItemComponent(demo)"
        v-for="demo in panel.demos"
        :key="demo.title"
        v-bind="getDemoItemProps(demo)"
        class="blog-profile-card__demo-item"
        :class="{ 'is-clickable': demo.cardTo }"
      >
        <div class="blog-profile-card__demo-head">
          <div>
            <p v-if="demo.eyebrow" class="blog-profile-card__demo-eyebrow">{{ demo.eyebrow }}</p>
            <h3>{{ demo.title }}</h3>
          </div>
          <span v-if="demo.badge" class="blog-profile-card__demo-badge">{{ demo.badge }}</span>
        </div>

        <p v-if="demo.description" class="blog-profile-card__demo-copy">
          {{ demo.description }}
        </p>

        <ul v-if="demo.meta?.length" class="blog-profile-card__demo-meta">
          <li v-for="item in demo.meta" :key="item">{{ item }}</li>
        </ul>

        <div v-if="demo.primaryLabel || demo.secondaryLabel" class="blog-profile-card__demo-actions">
          <RouterLink
            v-if="demo.primaryLabel && demo.primaryTo"
            class="blog-card-button blog-card-button--primary blog-profile-card__action"
            :to="demo.primaryTo"
          >
            {{ demo.primaryLabel }}
          </RouterLink>
          <a
            v-else-if="demo.primaryLabel && demo.primaryHref"
            class="blog-card-button blog-card-button--primary blog-profile-card__action"
            :href="demo.primaryHref"
          >
            {{ demo.primaryLabel }}
          </a>
          <span
            v-else-if="demo.primaryLabel"
            class="blog-card-button blog-card-button--primary blog-profile-card__action is-disabled"
          >
            {{ demo.primaryLabel }}
          </span>

          <RouterLink
            v-if="demo.secondaryLabel && demo.secondaryTo"
            class="blog-card-button blog-card-button--secondary blog-profile-card__action"
            :to="demo.secondaryTo"
          >
            {{ demo.secondaryLabel }}
          </RouterLink>
          <a
            v-else-if="demo.secondaryLabel && demo.secondaryHref"
            class="blog-card-button blog-card-button--secondary blog-profile-card__action"
            :href="demo.secondaryHref"
          >
            {{ demo.secondaryLabel }}
          </a>
        </div>
      </component>
    </div>

    <div v-if="panel.status?.length" class="blog-profile-card__status-list">
      <div
        v-for="item in panel.status"
        :key="item.label"
        class="blog-profile-card__status-item"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <div v-if="panel.primaryLabel || panel.secondaryLabel" class="blog-profile-card__actions">
      <RouterLink
        v-if="panel.primaryLabel && panel.primaryTo"
        class="blog-card-button blog-card-button--primary blog-profile-card__action"
        :to="panel.primaryTo"
      >
        {{ panel.primaryLabel }}
      </RouterLink>
      <a
        v-else-if="panel.primaryLabel && panel.primaryHref"
        class="blog-card-button blog-card-button--primary blog-profile-card__action"
        :href="panel.primaryHref"
      >
        {{ panel.primaryLabel }}
      </a>
      <span
        v-else-if="panel.primaryLabel"
        class="blog-card-button blog-card-button--primary blog-profile-card__action is-disabled"
      >
        {{ panel.primaryLabel }}
      </span>

      <RouterLink
        v-if="panel.secondaryLabel && panel.secondaryTo"
        class="blog-card-button blog-card-button--secondary blog-profile-card__action"
        :to="panel.secondaryTo"
      >
        {{ panel.secondaryLabel }}
      </RouterLink>
      <a
        v-else-if="panel.secondaryLabel && panel.secondaryHref"
        class="blog-card-button blog-card-button--secondary blog-profile-card__action"
        :href="panel.secondaryHref"
      >
        {{ panel.secondaryLabel }}
      </a>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const getDemoItemComponent = (demo) => (demo.cardTo ? RouterLink : 'article')

const getDemoItemProps = (demo) => (demo.cardTo ? { to: demo.cardTo } : {})

defineProps({
  panel: {
    type: Object,
    default: () => ({})
  },
  notes: {
    type: Array,
    default: () => []
  },
  notesTitle: {
    type: String,
    default: 'Recent Notes'
  }
})
</script>
