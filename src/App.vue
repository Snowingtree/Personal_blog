<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="site-route" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
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

<style>
.site-route-enter-active,
.site-route-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.site-route-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.994);
}

.site-route-leave-to {
  opacity: 0;
  transform: translateY(-7px) scale(0.997);
}

@media (prefers-reduced-motion: reduce) {
  .site-route-enter-active,
  .site-route-leave-active {
    transition-duration: 1ms;
  }
}
</style>
