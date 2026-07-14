<template>
  <section class="android-card android-calendar">
    <div class="android-section-heading android-calendar__heading">
      <div>
        <p>DAILY RHYTHM</p>
        <h2>日历与打卡</h2>
      </div>

      <button
        type="button"
        class="android-calendar__checkin"
        :disabled="isLoading || isSubmitting || todayChecked"
        @click="checkInToday"
      >
        <CheckCircle2 :size="17" />
        <span>{{ todayChecked ? '今日已完成' : isSubmitting ? '记录中…' : '今日打卡' }}</span>
      </button>
    </div>

    <div class="android-calendar__stats">
      <article>
        <CalendarDays :size="18" />
        <span>今天</span>
        <strong>{{ todayLabel }}</strong>
      </article>
      <article>
        <CheckCircle2 :size="18" />
        <span>本月</span>
        <strong>{{ monthCheckinCount }} 天</strong>
      </article>
      <article>
        <Flame :size="18" />
        <span>连续</span>
        <strong>{{ streakCount }} 天</strong>
      </article>
    </div>

    <div class="android-calendar__month-row">
      <strong>{{ currentMonthLabel }}</strong>
      <span>{{ totalCheckinCount }} 次累计记录</span>
    </div>

    <div class="android-calendar__weekdays" aria-hidden="true">
      <span v-for="weekday in weekDays" :key="weekday">{{ weekday }}</span>
    </div>

    <div class="android-calendar__grid">
      <button
        v-for="day in calendarDays"
        :key="day.key"
        type="button"
        class="android-calendar__day"
        :class="{
          'is-outside': !day.inMonth,
          'is-today': day.isToday,
          'is-checked': day.checked
        }"
        :disabled="isLoading || isSubmitting || !day.isToday || day.checked"
        :aria-label="day.ariaLabel"
        @click="checkInDate(day.date)"
      >
        <span>{{ day.label }}</span>
      </button>
    </div>

    <p
      class="android-calendar__feedback"
      :class="{ 'is-error': feedbackType === 'danger' }"
      aria-live="polite"
    >
      {{ feedbackMessage || (isLoading ? '正在同步打卡数据…' : '点击今天的日期也可以完成打卡') }}
    </p>
  </section>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { CalendarDays, CheckCircle2, Flame } from 'lucide-vue-next'
import { useBlogCheckins } from '../../hooks/useBlogCheckins'

const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const feedbackMessage = ref('')
const feedbackType = ref('success')
let feedbackTimerId = 0

function notify(message, type = 'success') {
  feedbackMessage.value = message
  feedbackType.value = type

  window.clearTimeout(feedbackTimerId)
  feedbackTimerId = window.setTimeout(() => {
    feedbackMessage.value = ''
  }, 3200)
}

const {
  calendarDays,
  checkInDate,
  checkInToday,
  currentMonthLabel,
  isLoading,
  isSubmitting,
  monthCheckinCount,
  streakCount,
  todayChecked,
  todayLabel,
  totalCheckinCount
} = useBlogCheckins({ notify })

onBeforeUnmount(() => {
  window.clearTimeout(feedbackTimerId)
})
</script>
