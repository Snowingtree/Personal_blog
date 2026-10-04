<template>
  <section class="android-card food-calendar" aria-label="每日饮食月历">
    <header class="health-card-heading">
      <div><p>DAILY FOOD</p><h2>每日饮食</h2></div><Utensils :size="21" />
    </header>
    <div class="food-month-controls">
      <button type="button" aria-label="上个月" @click="changeMonth(-1)"><ChevronLeft :size="20" /></button>
      <strong aria-live="polite">{{ monthLabel }}</strong>
      <button type="button" aria-label="下个月" @click="changeMonth(1)"><ChevronRight :size="20" /></button>
      <button type="button" class="food-current-month" @click="month = today.slice(0, 7)">本月</button>
    </div>
    <div class="food-calendar-grid">
      <span v-for="weekday in weekdays" :key="weekday" class="food-weekday">{{ weekday }}</span>
      <template v-for="(day, index) in cells" :key="day?.date || 'blank-' + index">
        <button v-if="day" type="button" class="food-date" :class="{ 'is-today': day.date === today, 'has-food': day.count > 0 }"
          :aria-label="day.date + '，' + (day.count ? day.count + '条饮食记录' : '暂无饮食记录')"
          :aria-current="day.date === today ? 'date' : undefined" :data-date="day.date" @click="openDay(day.date)">
          <span>{{ day.number }}</span><i v-if="day.count" aria-hidden="true" />
        </button>
        <span v-else aria-hidden="true" />
      </template>
    </div>
    <Teleport to="body">
      <dialog ref="dialog" class="food-meal-dialog" aria-labelledby="food-meal-title" @close="restoreScroll" @click="closeOnBackdrop">
        <header class="food-dialog-heading">
          <div><p>{{ selectedDate }}</p><h2 id="food-meal-title">当天三餐</h2></div>
          <button type="button" aria-label="关闭三餐记录" autofocus @click="dialog.close()"><X :size="21" /></button>
        </header>
        <p class="food-calendar-hint">按记录时间归类：10 点前早餐、10—14 点午餐、16—20 点晚餐。</p>
        <ol class="food-meal-list">
          <li v-for="meal in meals" :key="meal.name">
            <h3>{{ meal.name }}<small>{{ meal.records.length }} 条</small></h3>
            <p v-if="!meal.records.length" class="health-empty">尚未记录</p>
            <ul v-else>
              <li v-for="record in meal.records" :key="record.id" class="food-meal-entry">
                <time :datetime="record.time">{{ record.legacy ? '历史记录' : record.time.slice(11) }}<small v-if="record.mock" class="health-mock-label">模拟</small></time>
                <div><p>{{ record.text }}</p><div v-if="record.images?.length" class="food-meal-images"><img v-for="image in record.images" :key="image.id" :src="healthImageUrl(image.id)" :alt="image.name || '饮食图片'" loading="lazy" /></div></div>
              </li>
            </ul>
          </li>
        </ol>
      </dialog>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ChevronLeft, ChevronRight, Utensils, X } from 'lucide-vue-next'
import { formatAndroidDateKey } from '../healthData'
import { healthImageUrl } from '../healthImages'

const props = defineProps({ daily: { type: Map, required: true }, today: { type: String, required: true } })
const month = ref(props.today.slice(0, 7))
const selectedDate = ref('')
const dialog = ref(null)
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const monthLabel = computed(() => month.value.slice(0, 4) + '年' + Number(month.value.slice(5)) + '月')
const cells = computed(() => {
  const first = new Date(month.value + '-01T12:00:00')
  const offset = (first.getDay() + 6) % 7
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const result = Array(offset).fill(null)
  for (let number = 1; number <= length; number++) {
    const date = month.value + '-' + String(number).padStart(2, '0')
    result.push({ date, number, count: props.daily.get(date)?.food.length || 0 })
  }
  while (result.length % 7) result.push(null)
  return result
})
const meals = computed(() => {
  const groups = ['早餐', '午餐', '晚餐'].map(name => ({ name, records: [] }))
  for (const record of props.daily.get(selectedDate.value)?.food || []) {
    const hour = Number(record.time.slice(11, 13))
    const index = hour < 10 ? 0 : hour < 14 ? 1 : 2
    groups[index].records.push(record)
  }
  return groups
})
function changeMonth(direction) {
  const date = new Date(month.value + '-01T12:00:00')
  date.setMonth(date.getMonth() + direction)
  month.value = formatAndroidDateKey(date).slice(0, 7)
}
let savedOverflow
function openDay(date) {
  selectedDate.value = date
  // Lock the root scroller, whose stable gutter preserves the page width.
  if (savedOverflow === undefined) savedOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  dialog.value.showModal()
}
function restoreScroll() {
  if (savedOverflow !== undefined) document.documentElement.style.overflow = savedOverflow
  savedOverflow = undefined
}
function closeOnBackdrop(event) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.value.close()
}
onBeforeUnmount(restoreScroll)
</script>

<style scoped>
.food-month-controls { display: flex; align-items: center; gap: 5px; margin: 14px 0 10px; }
.food-month-controls button, .food-dialog-heading button { display: grid; place-items: center; flex: 0 0 auto; width: 40px; height: 42px; border: 0; border-radius: 10px; background: var(--android-surface-soft); color: var(--android-text-strong); cursor: pointer; }
.food-month-controls strong { flex: 1; text-align: center; font-size: .92rem; color: var(--android-text-strong); }
.food-month-controls .food-current-month { width: auto; padding: 0 8px; font-size: .7rem; }
.food-calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.food-weekday { padding: 8px 0; text-align: center; color: var(--android-muted); font-size: .7rem; }
.food-date { position: relative; min-width: 0; height: 43px; padding: 0 0 6px; border: 0; border-radius: 11px; color: var(--android-text-strong); background: transparent; font: inherit; font-size: .83rem; cursor: pointer; }
.food-date.has-food { background: var(--android-surface-soft); }
.food-date i { position: absolute; bottom: 5px; left: calc(50% - 2px); width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
.food-date.is-today { color: var(--android-accent-contrast); background: var(--android-accent); font-weight: 800; }
.food-calendar-hint { margin: 12px 0 0; color: var(--android-muted); font-size: .65rem; line-height: 1.7; }
.food-meal-dialog { box-sizing: border-box; width: calc(100% - 28px); max-width: 440px; max-height: 80vh; max-height: 80dvh; margin: auto; padding: 20px; border: 1px solid var(--android-line); border-radius: 22px; color: var(--android-text-strong); background: var(--android-surface-high); box-shadow: var(--android-shadow); overflow-y: auto; overscroll-behavior: contain; }
.food-meal-dialog::backdrop { background: rgba(20, 25, 22, .42); }
.food-dialog-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.food-dialog-heading p { margin: 0 0 5px; color: var(--android-muted); font-size: .75rem; }
.food-dialog-heading h2 { margin: 0; font-size: 1.15rem; }
.food-meal-list, .food-meal-list ul { margin: 0; padding: 0; list-style: none; }
.food-meal-list > li { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--android-line); }
.food-meal-list h3 { display: flex; justify-content: space-between; margin: 0 0 10px; font-size: .9rem; }
.food-meal-list h3 small { color: var(--android-muted); font-size: .68rem; font-weight: 400; }
.food-meal-entry { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; padding: 6px 0; }
.food-meal-entry time { font-size: .7rem; color: var(--android-muted); line-height: 1.8; }
.food-meal-entry p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .8rem; line-height: 1.8; }
.food-meal-images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
.food-meal-images img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: var(--android-surface-soft); }
</style>
