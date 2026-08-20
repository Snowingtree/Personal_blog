<template>
  <div class="android-shell">
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
    <AndroidBottomNav />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AndroidBottomNav from './components/AndroidBottomNav.vue'
import {
  ANDROID_THEME_CHANGE_EVENT,
  applyAndroidTheme,
  readAndroidTheme
} from './theme'

const route = useRoute()

function syncMotionPreference(event) {
  const enabled =
    typeof event?.detail?.enabled === 'boolean'
      ? event.detail.enabled
      : localStorage.getItem('android-reduced-motion') === 'true'

  document.documentElement.classList.toggle('android-reduced-motion', enabled)
}

function syncThemePreference(event) {
  applyAndroidTheme(event?.detail?.theme ?? readAndroidTheme())
}

onMounted(() => {
  document.documentElement.classList.add('is-android-app')
  document.body.classList.add('is-android-app')

  window.addEventListener('android-motion-setting-change', syncMotionPreference)
  window.addEventListener(ANDROID_THEME_CHANGE_EVENT, syncThemePreference)
  syncMotionPreference()
  syncThemePreference()
})

onBeforeUnmount(() => {
  window.removeEventListener('android-motion-setting-change', syncMotionPreference)
  window.removeEventListener(ANDROID_THEME_CHANGE_EVENT, syncThemePreference)
  document.documentElement.classList.remove('is-android-app')
  document.documentElement.classList.remove('android-reduced-motion')
  document.documentElement.removeAttribute('data-android-theme')
  document.body.classList.remove('is-android-app')
})
</script>
