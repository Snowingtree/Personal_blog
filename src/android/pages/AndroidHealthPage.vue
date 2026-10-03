<template>
  <section class="android-page health-page">
    <section class="android-profile-hero android-profile-hero--health">
      <div class="android-profile-hero__avatar-wrap">
        <img :src="profileAvatar" alt="Liu An 的头像" class="android-profile-hero__avatar" />
        <span class="android-profile-hero__online" aria-label="持续更新中" />
      </div>

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
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ToggleLeft } from 'lucide-vue-next'
import { setAndroidAppMode } from '../appMode'
import profileAvatar from '../../assets/images/headerPH.png'
import { siteHero } from '../../data/siteOverview'
import AndroidFoodCalendar from '../components/AndroidFoodCalendar.vue'
import AndroidHealthTrend from '../components/AndroidHealthTrend.vue'
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
const aggregation = computed(() => aggregateHealthRecords(records.value, today.value))
const chartDays = computed(() => healthPeriodView(aggregation.value, range.value, today.value))
function goHome() { setAndroidAppMode('personal') }
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


@media (max-width: 560px) {
  .android-profile-hero--health { padding-right: 86px; }
}
</style>
