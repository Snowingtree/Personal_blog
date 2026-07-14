<template>
  <div class="android-shell" :class="{ 'is-sidebar-expanded': sidebarExpanded }">
    <button
      v-if="sidebarExpanded && isCompactScreen"
      type="button"
      class="android-shell__backdrop"
      aria-label="收起导航栏"
      @click="setSidebarExpanded(false)"
    />

    <AndroidSidebar
      :expanded="sidebarExpanded"
      @toggle="setSidebarExpanded(!sidebarExpanded)"
      @navigate="handleNavigate"
    />

    <main
      class="android-shell__content"
      :class="`android-shell__content--${route.meta.androidSurface || 'legacy'}`"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="android-route" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AndroidSidebar from './components/AndroidSidebar.vue'

const route = useRoute()
const sidebarExpanded = ref(false)
const isCompactScreen = ref(true)
let mediaQuery = null

function syncScreenMode(event) {
  isCompactScreen.value = event.matches

  if (!event.matches && localStorage.getItem('android-sidebar-expanded') === null) {
    sidebarExpanded.value = true
  }
}

function setSidebarExpanded(value) {
  sidebarExpanded.value = Boolean(value)
  localStorage.setItem('android-sidebar-expanded', String(sidebarExpanded.value))
}

function handleNavigate() {
  if (isCompactScreen.value) {
    setSidebarExpanded(false)
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && sidebarExpanded.value && isCompactScreen.value) {
    setSidebarExpanded(false)
  }
}

function syncMotionPreference(event) {
  const enabled =
    typeof event?.detail?.enabled === 'boolean'
      ? event.detail.enabled
      : localStorage.getItem('android-reduced-motion') === 'true'

  document.documentElement.classList.toggle('android-reduced-motion', enabled)
}

onMounted(() => {
  document.documentElement.classList.add('is-android-app')
  document.body.classList.add('is-android-app')

  mediaQuery = window.matchMedia('(max-width: 920px)')
  const storedState = localStorage.getItem('android-sidebar-expanded')

  sidebarExpanded.value = storedState === null ? !mediaQuery.matches : storedState === 'true'
  syncScreenMode(mediaQuery)
  mediaQuery.addEventListener('change', syncScreenMode)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('android-motion-setting-change', syncMotionPreference)
  syncMotionPreference()
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncScreenMode)
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('android-motion-setting-change', syncMotionPreference)
  document.documentElement.classList.remove('is-android-app')
  document.documentElement.classList.remove('android-reduced-motion')
  document.body.classList.remove('is-android-app')
})
</script>
