<template>
  <section class="android-page android-health-page">
    <section v-if="overview" class="android-profile-hero android-profile-hero--health">
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

    <AndroidCalendarCard v-if="overview" />

    <section class="android-card android-health-log-card">
      <div class="android-health-card-heading">
        <div>
          <p>{{ overview ? 'DAILY WATER' : 'WATER & MOVE' }}</p>
          <h2>{{ overview ? '饮水记录' : '饮水与运动' }}</h2>
        </div>
        <Activity :size="21" />
      </div>

      <div class="android-health-summary" aria-label="最近七天汇总">
        <div>
          <span>近 7 天饮水</span>
          <strong>{{ waterTotalLabel }} L</strong>
        </div>
        <div v-if="!overview">
          <span>近 7 天运动</span>
          <strong>{{ exerciseTotal }} 分钟</strong>
        </div>
      </div>

      <div class="android-health-table-wrap">
        <table class="android-health-table">
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">饮水量</th>
              <th v-if="!overview" scope="col">运动</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in recentDays" :key="day.key">
              <th scope="row">
                <span>{{ day.isToday ? '今天' : formatDay(day.date) }}</span>
                <small>{{ day.key }}</small>
              </th>
              <td>
                <label class="android-health-input-wrap">
                  <span class="sr-only">{{ day.key }} 饮水量</span>
                  <input
                    inputmode="decimal"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    :value="getLogValue(day.key, 'water')"
                    placeholder="0"
                    @change="updateLog(day.key, 'water', $event.target.value)"
                  />
                  <em>L</em>
                </label>
              </td>
              <td v-if="!overview">
                <label class="android-health-input-wrap">
                  <span class="sr-only">{{ day.key }} 运动分钟</span>
                  <input
                    inputmode="numeric"
                    type="number"
                    min="0"
                    max="1440"
                    step="5"
                    :value="getLogValue(day.key, 'exercise')"
                    placeholder="0"
                    @change="updateLog(day.key, 'exercise', $event.target.value)"
                  />
                  <em>min</em>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="android-health-hint">输入后离开当前输入框即可保存到本机。</p>
    </section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { setAndroidAppMode } from '../appMode'
import { Activity, ToggleLeft } from 'lucide-vue-next'
import profileAvatar from '../../assets/images/headerPH.png'
import { siteHero } from '../../data/siteOverview'
import AndroidCalendarCard from '../components/AndroidCalendarCard.vue'
import {
  createAndroidRecentDays,
  readAndroidHealthLogs,
  saveAndroidHealthLogs
} from '../healthData'

defineProps({ overview: { type: Boolean, default: false } })
const logs = ref(readAndroidHealthLogs())
const recentDays = createAndroidRecentDays(7)
const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short'
})

const waterTotal = computed(() => recentDays.reduce((total, day) => {
  const value = Number(logs.value[day.key]?.water)
  return total + (Number.isFinite(value) && value > 0 ? value : 0)
}, 0))
const waterTotalLabel = computed(() => waterTotal.value.toFixed(1))
const exerciseTotal = computed(() => recentDays.reduce((total, day) => {
  const value = Number(logs.value[day.key]?.exercise)
  return total + (Number.isFinite(value) && value > 0 ? value : 0)
}, 0))

function formatDay(date) {
  return weekdayFormatter.format(date).replace('周', '')
}

function getLogValue(dateKey, field) {
  return logs.value[dateKey]?.[field] ?? ''
}

function normalizeValue(field, rawValue) {
  if (String(rawValue).trim() === '') {
    return ''
  }

  const parsedValue = Number(rawValue)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return ''
  }

  if (field === 'water') {
    return Math.min(20, Math.round(parsedValue * 10) / 10)
  }

  return Math.min(1440, Math.round(parsedValue))
}

function updateLog(dateKey, field, rawValue) {
  const nextLogs = {
    ...logs.value,
    [dateKey]: {
      ...(logs.value[dateKey] || {}),
      [field]: normalizeValue(field, rawValue)
    }
  }

  logs.value = nextLogs
  saveAndroidHealthLogs(nextLogs)
}

function goHome() {
  setAndroidAppMode('personal')
}
</script>

<style scoped>
.android-health-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

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

.android-health-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--android-accent);
}

.android-health-card-heading p {
  margin: 0 0 4px;
  color: var(--android-text-faint);
  font-size: 0.58rem;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.android-health-card-heading h2 {
  margin: 0;
  color: var(--android-text-strong);
  font-size: 1.06rem;
}

.android-health-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
}

.android-health-summary > div {
  display: grid;
  gap: 4px;
  padding: 11px 12px;
  border-radius: 13px;
  background: var(--android-surface-soft);
}

.android-health-summary span {
  color: var(--android-muted);
  font-size: 0.65rem;
}

.android-health-summary strong {
  color: var(--android-accent);
  font-size: 1rem;
}

.android-health-table-wrap {
  margin-top: 14px;
  overflow-x: auto;
  border: 1px solid var(--android-line);
  border-radius: 14px;
}

.android-health-table {
  width: 100%;
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;
}

.android-health-table th,
.android-health-table td {
  padding: 10px 9px;
  border-bottom: 1px solid var(--android-line);
  text-align: left;
}

.android-health-table thead th {
  color: var(--android-text-faint);
  background: var(--android-surface-soft);
  font-size: 0.63rem;
  font-weight: 800;
}

.android-health-table tbody tr:last-child th,
.android-health-table tbody tr:last-child td {
  border-bottom: 0;
}

.android-health-table tbody th {
  color: var(--android-text-strong);
  font-size: 0.72rem;
  font-weight: 760;
}

.android-health-table tbody th span,
.android-health-table tbody th small {
  display: block;
}

.android-health-table tbody th small {
  margin-top: 3px;
  color: var(--android-text-faint);
  font-size: 0.58rem;
  font-weight: 500;
}

.android-health-input-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  max-width: 108px;
  padding: 0 8px;
  border: 1px solid var(--android-line-strong);
  border-radius: 9px;
  background: var(--android-surface-high);
}

.android-health-input-wrap input {
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0;
  border: 0;
  outline: 0;
  color: var(--android-text-strong);
  background: transparent;
  font: inherit;
  font-size: 0.76rem;
}

.android-health-input-wrap em {
  flex: 0 0 auto;
  color: var(--android-muted);
  font-size: 0.58rem;
  font-style: normal;
}

.android-health-hint {
  margin: 11px 1px 0;
  color: var(--android-text-faint);
  font-size: 0.65rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 560px) {
  .android-profile-hero--health {
    padding-right: 86px;
  }

  .android-health-table th,
  .android-health-table td {
    padding-right: 7px;
    padding-left: 7px;
  }
}
</style>
