<template>
  <section class="android-card android-calendar">
    <div class="android-calendar__top">
      <div class="android-calendar__date">
        <p>TODAY</p>
        <h2>{{ todayLabel }}</h2>
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

    <div class="android-calendar__week-strip" aria-label="最近七天打卡记录">
      <div
        v-for="day in centeredCalendarDays"
        :key="day.key"
        class="android-calendar__week-day"
        :class="{
          'is-today': day.isToday,
          'is-checked': day.checked
        }"
        :aria-label="day.ariaLabel"
      >
        <span>{{ day.isToday ? '今天' : formatWeekday(day.date) }}</span>
        <strong>{{ day.label }}</strong>
        <i aria-hidden="true" />
      </div>
    </div>

    <p
      v-if="feedbackMessage || isLoading"
      class="android-calendar__feedback"
      :class="{ 'is-error': feedbackType === 'danger' }"
      aria-live="polite"
    >
      {{ feedbackMessage || '正在同步打卡数据…' }}
    </p>
  </section>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { CheckCircle2 } from 'lucide-vue-next'
import { useBlogCheckins } from '../../hooks/useBlogCheckins'

const feedbackMessage = ref('')
const feedbackType = ref('success')
let feedbackTimerId = 0
const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })

function notify(message, type = 'success') {
  feedbackMessage.value = message
  feedbackType.value = type

  window.clearTimeout(feedbackTimerId)
  feedbackTimerId = window.setTimeout(() => {
    feedbackMessage.value = ''
  }, 3200)
}

const {
  centeredCalendarDays,
  checkInToday,
  isLoading,
  isSubmitting,
  todayChecked,
  todayLabel
} = useBlogCheckins({ notify })

function formatWeekday(value) {
  return weekdayFormatter.format(value).replace('周', '')
}

onBeforeUnmount(() => {
  window.clearTimeout(feedbackTimerId)
})
</script>
