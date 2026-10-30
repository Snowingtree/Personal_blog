<template>
  <div class="android-mode-home">
    <AndroidLifeHomePage v-if="androidAppMode === 'life'" />
    <AndroidSettingsPage v-else />
  </div>
</template>

<script setup>
import { androidAppMode } from '../appMode'
import AndroidLifeHomePage from './AndroidLifeHomePage.vue'
import AndroidSettingsPage from './AndroidSettingsPage.vue'
</script>
