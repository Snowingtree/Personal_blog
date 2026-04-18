<template>
  <RouterView />
  <div
    class="site-theme-wipe"
    :class="transitionTargetIsDark ? 'site-theme-wipe--to-dark' : 'site-theme-wipe--to-light'"
    aria-hidden="true"
  />
</template>

<script setup>
import { watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import { useSiteTheme } from './hooks/useSiteTheme'

const { shouldUseDarkTheme, isThemeTransitioning, transitionTargetIsDark } = useSiteTheme()

watchEffect(() => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.style.colorScheme = shouldUseDarkTheme.value ? 'dark' : 'light'
  document.documentElement.classList.toggle('site-theme-dark', shouldUseDarkTheme.value)
  document.documentElement.classList.toggle('site-theme-transitioning', isThemeTransitioning.value)
})
</script>
