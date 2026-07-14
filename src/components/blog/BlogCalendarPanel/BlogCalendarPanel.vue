<template>
  <section class="blog-surface blog-calendar-panel">
    <BlogSectionHeading
      eyebrow="Personal"
      title="Calendar / Check In"
    />

    <div class="blog-calendar-panel__stats">
      <article>
        <span>今天</span>
        <strong>{{ todayLabel }}</strong>
      </article>
      <article>
        <span>本月打卡</span>
        <strong>{{ monthCheckinCount }} 天</strong>
      </article>
      <article>
        <span>连续记录</span>
        <strong>{{ streakCount }} 天</strong>
      </article>
    </div>

    <div class="blog-calendar-preview">
      <div class="blog-calendar-preview__head">
        <strong>{{ currentMonthLabel }}</strong>
        <div class="blog-calendar-preview__meta">
          <button
            type="button"
            class="blog-card-button blog-card-button--primary blog-calendar-preview__button"
            :disabled="isLoading || isSubmitting || todayChecked"
            @click="checkInToday"
          >
            {{ todayChecked ? '今日已打卡' : isSubmitting ? '打卡中...' : '今日打卡' }}
          </button>
          <span>{{ totalCheckinCount }} 次累计打卡</span>
        </div>
      </div>

      <div class="blog-calendar-weekdays" aria-hidden="true">
        <span v-for="weekday in weekDays" :key="weekday">{{ weekday }}</span>
      </div>

      <div class="blog-calendar-grid blog-calendar-grid--compact">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          :class="[
            'blog-calendar-day',
            'blog-calendar-day--button',
            !day.inMonth && 'is-outside',
            day.isToday && 'is-today',
            day.checked && 'is-checked'
          ]"
          :disabled="isLoading || isSubmitting || !day.isToday || day.checked"
          :aria-label="day.ariaLabel"
          @click="checkInDate(day.date)"
        >
          <span class="blog-calendar-day__number">{{ day.label }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { createMessage } from 'snowingress-my-components'
import { useBlogCheckins } from '../../../hooks/useBlogCheckins'
import BlogSectionHeading from '../BlogSectionHeading/BlogSectionHeading.vue'

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1800,
    offset: 24
  })
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
</script>
