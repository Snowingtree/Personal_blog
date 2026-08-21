<template>
  <nav
    class="android-bottom-nav"
    aria-label="安卓应用导航"
    :style="{ '--android-nav-count': navigationItems.length }"
  >
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
import { computed } from 'vue'
import { BookOpen, House, ListTree, NotebookPen } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { toggleAndroidNotesDirectory } from '../events'

const props = defineProps({
  appendixEnabled: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const navigationItems = computed(() => {
  const items = [
    { key: 'profile', label: '主页', to: '/', icon: House },
    { key: 'notes', label: '笔记', to: '/notes', icon: NotebookPen }
  ]

  if (props.appendixEnabled) {
    items.push({ key: 'appendix', label: '附录', to: '/appendix', icon: BookOpen })
  }

  return items
})
const activeNavigationKey = computed(() => {
  if (
    route.name === 'notes-login'
    && route.query.redirect === '/appendix'
    && props.appendixEnabled
  ) {
    return 'appendix'
  }

  return route.meta.androidNavKey
})

function isActive(item) {
  return activeNavigationKey.value === item.key
}

function isActiveDirectoryItem(item) {
  return (item.key === 'notes' || item.key === 'appendix')
    && route.name === item.key
    && isActive(item)
}

function resolveLabel(item) {
  return isActiveDirectoryItem(item) ? '目录' : item.label
}

function resolveIcon(item) {
  return isActiveDirectoryItem(item) ? ListTree : item.icon
}

function handleNavigation(item) {
  if (isActiveDirectoryItem(item)) {
    toggleAndroidNotesDirectory()
    return
  }

  if (route.path !== item.to) {
    void router.push(item.to)
  }
}
</script>
