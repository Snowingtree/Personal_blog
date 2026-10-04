<template>
  <section class="android-page health-page">
    <section class="android-profile-hero android-profile-hero--health">
      <button type="button" class="android-profile-hero__avatar-wrap android-health-avatar-button" aria-label="打开设置" @click="openSettings">
        <img :src="profileAvatar" alt="Liu An 的头像" class="android-profile-hero__avatar" />
        <span class="android-profile-hero__online" aria-label="持续更新中" />
      </button>

      <div class="android-profile-hero__copy">
        <p class="android-profile-hero__eyebrow">{{ siteHero.eyebrow }}</p>
        <h1>Liu An</h1>
        <ul class="android-profile-hero__tags" aria-label="健康记录内容">
          <li>饮水记录</li>
          <li>运动锻炼</li>
          <li>健康饮食</li>
        </ul>
      </div>

      <button
        type="button"
        class="android-profile-mode-switch is-health"
        aria-label="切换回个人模式"
        @click="goHome"
      >
        <ToggleLeft :size="17" />
        <span>个人</span>
      </button>
    </section>

    <AndroidFoodCalendar :daily="aggregation.day" :today="today" />


    <section class="android-card health-overview" aria-label="健康记录汇总">
      <button v-for="period in periods" :key="period.key" type="button" :aria-pressed="range === period.key" :class="{ 'is-active': range === period.key }" @click="range = period.key">{{ period.label }}</button>
    </section>
    <p v-if="storageError" class="health-feedback is-error" role="alert">{{ storageError }}</p>
    <AndroidHealthTrend :days="chartDays" :period="range" metric="weight" title="体重" unit="kg" color="#b37b49" />
    <AndroidHealthTrend :days="chartDays" :period="range" metric="water" title="饮水" unit="L" color="#3488b1" />
    <AndroidHealthTrend :days="chartDays" :period="range" metric="exercise" title="运动" unit="分钟" color="#56846b" />

    <Teleport to="body">
      <div v-if="settingsOpen" class="health-settings-overlay" @click.self="closeSettings">
        <section class="health-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="health-settings-title">
          <header class="health-settings-dialog__header">
            <div><p>HEALTH SETTINGS</p><h2 id="health-settings-title">健康设置</h2></div>
            <button type="button" aria-label="关闭设置" @click="closeSettings"><X :size="20" /></button>
          </header>
          <div class="health-settings-dialog__body">
            <AndroidHealthSettingsPanel />
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ToggleLeft, X } from 'lucide-vue-next'
import { setAndroidAppMode } from '../appMode'
import profileAvatar from '../../assets/images/headerPH.png'
import { siteHero } from '../../data/siteOverview'
import AndroidFoodCalendar from '../components/AndroidFoodCalendar.vue'
import AndroidHealthTrend from '../components/AndroidHealthTrend.vue'
import AndroidHealthSettingsPanel from '../components/AndroidHealthSettingsPanel.vue'
import { aggregateHealthRecords, healthPeriodView } from '../healthAggregation'
import { useHealthRecords, useHealthToday } from '../useHealthRecords'

const { records, storageError } = useHealthRecords()
const today = useHealthToday()
const periods = [
  { key: 'day', label: '按日' },
  { key: 'week', label: '按周' },
  { key: 'month', label: '按月' },
  { key: 'year', label: '按年' }
]
const range = ref('day')
const settingsOpen = ref(false)
const aggregation = computed(() => aggregateHealthRecords(records.value, today.value))
const chartDays = computed(() => healthPeriodView(aggregation.value, range.value, today.value))
function goHome() { setAndroidAppMode('personal') }
let previousOverflow = ''
function openSettings() {
  settingsOpen.value = true
  previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
}
function closeSettings() {
  settingsOpen.value = false
  document.documentElement.style.overflow = previousOverflow
}
onBeforeUnmount(() => {
  document.documentElement.style.overflow = previousOverflow
})
</script>

<style scoped>
.health-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 10px; }
.health-overview button { min-height: 42px; border: 0; border-radius: 12px; background: transparent; color: var(--android-muted); font: inherit; font-size: .82rem; cursor: pointer; }
.health-overview button.is-active { background: var(--android-accent); color: var(--android-accent-contrast); font-weight: 750; }
.android-profile-hero--health {
  background: var(--android-hero-background);
}

.android-profile-mode-switch {
  position: absolute;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--android-line-strong);
  border-radius: 999px;
  color: var(--android-accent-contrast);
  background: var(--android-accent);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 7px 16px var(--android-accent-shadow);
}

.android-health-avatar-button {
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.android-health-avatar-button:focus-visible {
  outline: 2px solid var(--android-focus-outline);
  outline-offset: 5px;
  border-radius: 50%;
}

.health-settings-overlay {
  position: fixed;
  z-index: 130;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 14px;
  background: rgba(20, 25, 22, .52);
}

.health-settings-dialog {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: min(650px, 100%);
  max-height: min(92dvh, 820px);
  overflow: hidden;
  border: 1px solid var(--android-line);
  border-radius: 24px;
  background: var(--android-canvas);
  box-shadow: 0 18px 60px rgba(20, 25, 22, .2);
}

.health-settings-dialog__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--android-line);
  background: var(--android-surface-high);
}

.health-settings-dialog__header p {
  margin: 0 0 4px;
  color: var(--android-text-faint);
  font-size: .58rem;
  font-weight: 800;
  letter-spacing: .14em;
}

.health-settings-dialog__header h2 {
  margin: 0;
  color: var(--android-text-strong);
  font-size: 1.2rem;
}

.health-settings-dialog__header > button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 10px;
  color: var(--android-muted);
  background: var(--android-surface-soft);
  cursor: pointer;
}

.health-settings-dialog__body {
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 18px;
  overscroll-behavior: contain;
}

@media (max-width: 560px) {
  .android-profile-hero--health { padding-right: 86px; }
}
</style>
