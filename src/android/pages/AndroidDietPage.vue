<template>
  <section class="android-page android-diet-page">
    <header class="android-diet-header">
      <div class="android-diet-header__icon"><Utensils :size="22" /></div>
      <div>
        <p>DAILY FOOD LOG</p>
        <h1>饮食</h1>
        <span>记下每天吃过的东西，也记下当时的感受。</span>
      </div>
    </header>

    <section class="android-card android-diet-card">
      <div class="android-diet-card__heading">
        <div>
          <p>LAST 7 DAYS</p>
          <h2>每日饮食记录</h2>
        </div>
        <span>{{ recordedDayCount }}/7 天</span>
      </div>

      <div class="android-diet-list">
        <article v-for="day in recentDays" :key="day.key" class="android-diet-row">
          <header>
            <div>
              <strong>{{ day.isToday ? '今天' : formatDay(day.date) }}</strong>
              <small>{{ day.key }}</small>
            </div>
            <span v-if="getLogValue(day.key)" class="android-diet-row__status">已记录</span>
          </header>
          <label>
            <span class="sr-only">{{ day.key }} 饮食内容</span>
            <textarea
              :value="getLogValue(day.key)"
              rows="3"
              maxlength="500"
              placeholder="例如：早餐鸡蛋和牛奶；午餐米饭、青菜和鸡胸肉。"
              @change="updateLog(day.key, $event.target.value)"
            />
          </label>
          <p>可以用分号或换行分开不同餐食。</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Utensils } from 'lucide-vue-next'
import {
  createAndroidRecentDays,
  readAndroidDietLogs,
  saveAndroidDietLogs
} from '../healthData'

const logs = ref(readAndroidDietLogs())
const recentDays = createAndroidRecentDays(7)
const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short'
})

const recordedDayCount = computed(() => recentDays.filter((day) => getLogValue(day.key)).length)

function formatDay(date) {
  return weekdayFormatter.format(date).replace('周', '')
}

function getLogValue(dateKey) {
  return typeof logs.value[dateKey] === 'string' ? logs.value[dateKey] : ''
}

function updateLog(dateKey, value) {
  const nextLogs = {
    ...logs.value,
    [dateKey]: String(value || '').slice(0, 500)
  }

  logs.value = nextLogs
  saveAndroidDietLogs(nextLogs)
}
</script>

<style scoped>
.android-diet-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.android-diet-header {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 8px 3px 6px;
}

.android-diet-header__icon {
  flex: 0 0 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: var(--android-accent);
  background: var(--android-accent-soft);
}

.android-diet-header p,
.android-diet-card__heading p {
  margin: 0 0 6px;
  color: var(--android-text-faint);
  font-size: 0.62rem;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.android-diet-header h1,
.android-diet-card__heading h2 {
  margin: 0;
  color: var(--android-text-strong);
  letter-spacing: -0.04em;
}

.android-diet-header h1 {
  font-size: clamp(1.65rem, 5.5vw, 2.8rem);
  line-height: 1;
}

.android-diet-header > div > span {
  display: block;
  margin-top: 7px;
  color: var(--android-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.android-diet-card {
  padding: 17px;
  border-radius: 19px;
}

.android-diet-card__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.android-diet-card__heading h2 {
  font-size: 1rem;
}

.android-diet-card__heading > span {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--android-accent);
  background: var(--android-accent-soft);
  font-size: 0.64rem;
  font-weight: 750;
}

.android-diet-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.android-diet-row {
  padding: 12px;
  border: 1px solid var(--android-line);
  border-radius: 14px;
  background: var(--android-surface-soft);
}

.android-diet-row > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.android-diet-row > header div {
  display: grid;
  gap: 3px;
}

.android-diet-row strong {
  color: var(--android-text-strong);
  font-size: 0.78rem;
}

.android-diet-row small,
.android-diet-row p {
  color: var(--android-text-faint);
  font-size: 0.62rem;
}

.android-diet-row__status {
  color: var(--android-accent);
  font-size: 0.62rem;
  font-weight: 750;
}

.android-diet-row textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 72px;
  margin-top: 10px;
  padding: 9px 10px;
  resize: vertical;
  border: 1px solid var(--android-line-strong);
  border-radius: 10px;
  outline: 0;
  color: var(--android-text-strong);
  background: var(--android-surface-high);
  font: inherit;
  font-size: 0.74rem;
  line-height: 1.55;
}

.android-diet-row textarea:focus {
  border-color: var(--android-accent);
  box-shadow: 0 0 0 2px var(--android-focus-outline);
}

.android-diet-row p {
  margin: 7px 1px 0;
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
  .android-diet-card {
    padding: 14px;
  }
}
</style>
