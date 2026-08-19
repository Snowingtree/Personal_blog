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

const route = useRoute()

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

  window.addEventListener('android-motion-setting-change', syncMotionPreference)
  syncMotionPreference()
})

onBeforeUnmount(() => {
  window.removeEventListener('android-motion-setting-change', syncMotionPreference)
  document.documentElement.classList.remove('is-android-app')
  document.documentElement.classList.remove('android-reduced-motion')
  document.body.classList.remove('is-android-app')
})
</script>
