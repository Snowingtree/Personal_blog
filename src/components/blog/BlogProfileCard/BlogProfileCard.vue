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
        <p class="blog-profile-card__lead">{{ panel.lead }}</p>
      </div>
    </div>

    <section v-if="notes.length" class="blog-profile-card__notes">
      <p class="blog-profile-card__notes-title">{{ notesTitle }}</p>
      <ul class="blog-bullet-list">
        <li v-for="item in notes" :key="item">{{ item }}</li>
      </ul>
    </section>

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
  </section>
</template>

<script setup>
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
