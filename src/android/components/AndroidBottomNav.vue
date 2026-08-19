<template>
  <nav class="android-bottom-nav" aria-label="安卓应用导航">
    <button
      v-for="item in navigationItems"
      :key="item.key"
      type="button"
      class="android-bottom-nav__item"
      :class="{ 'is-active': isActive(item) }"
      :aria-current="isActive(item) ? 'page' : undefined"
      :aria-label="resolveLabel(item)"
      @click="handleNavigation(item)"
    >
      <component :is="resolveIcon(item)" :size="21" stroke-width="1.9" />
      <span>{{ resolveLabel(item) }}</span>
    </button>
  </nav>
</template>

<script setup>
import { House, ListTree, NotebookPen, Settings } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { toggleAndroidNotesDirectory } from '../events'

const route = useRoute()
const router = useRouter()
const navigationItems = [
  { key: 'home', label: '主页', to: '/', icon: House },
  { key: 'notes', label: '笔记', to: '/notes', icon: NotebookPen },
  { key: 'settings', label: '设置', to: '/settings', icon: Settings }
]

function isActive(item) {
  return route.meta.androidNavKey === item.key
}

function isActiveNotesItem(item) {
  return item.key === 'notes' && isActive(item)
}

function resolveLabel(item) {
  return isActiveNotesItem(item) ? '目录' : item.label
}

function resolveIcon(item) {
  return isActiveNotesItem(item) ? ListTree : item.icon
}

function handleNavigation(item) {
  if (isActiveNotesItem(item)) {
    toggleAndroidNotesDirectory()
    return
  }

  if (route.path !== item.to) {
    void router.push(item.to)
  }
}
</script>
