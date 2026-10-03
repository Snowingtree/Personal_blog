<template>
  <div class="android-mode-home">
    <AndroidHealthPage v-if="androidAppMode === 'health'" overview />
    <AndroidSettingsPage v-else />
  </div>
</template>

<script setup>
import { androidAppMode } from '../appMode'
import AndroidHealthPage from './AndroidHealthPage.vue'
import AndroidSettingsPage from './AndroidSettingsPage.vue'
</script>
