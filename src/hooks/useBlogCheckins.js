import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import http from '../utils/http'

const monthFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long'
})
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})

function getStartOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function getStartOfMonth(value) {
  const date = getStartOfDay(value)
  date.setDate(1)
  return date
}

function formatDateKey(value) {
  const date = getStartOfDay(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonthKey(value) {
  const date = getStartOfMonth(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function normalizeCheckinDates(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item ?? '').trim()))]
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
    .sort()
}

function createCheckinMap(value) {
  return Object.fromEntries(normalizeCheckinDates(value).map((item) => [item, true]))
}

function isSameMonth(left, right) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

function createCalendarDays(monthValue, checkinMap, todayValue) {
  const monthStart = getStartOfMonth(monthValue)
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
  const totalCells = Math.ceil((firstWeekday + monthEnd.getDate()) / 7) * 7
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - firstWeekday)

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const dateKey = formatDateKey(date)
    const dayStart = getStartOfDay(date)
    const checked = Boolean(checkinMap[dateKey])
    const isToday = dayStart.getTime() === todayValue.getTime()

    return {
      key: dateKey,
      date,
      label: date.getDate(),
      inMonth: isSameMonth(date, monthStart),
      isToday,
      checked,
      ariaLabel: `${dateKey} ${checked ? '已打卡' : isToday ? '今日可打卡' : '不可打卡'}`
    }
  })
}

function countMonthCheckins(monthValue, checkinMap) {
  const monthKey = formatMonthKey(monthValue)
  return Object.keys(checkinMap).filter((dateKey) => dateKey.startsWith(monthKey)).length
}

function calculateStreak(todayValue, checkinMap) {
  let streak = 0
  const cursor = new Date(todayValue)

  while (checkinMap[formatDateKey(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function useBlogCheckins({ notify = () => {} } = {}) {
  const currentDate = ref(getStartOfDay(new Date()))
  const checkins = ref({})
  const isLoading = ref(true)
  const isSubmitting = ref(false)
  let refreshTimerId = 0

  const todayKey = computed(() => formatDateKey(currentDate.value))
  const todayLabel = computed(() => dateFormatter.format(currentDate.value))
  const todayChecked = computed(() => Boolean(checkins.value[todayKey.value]))
  const currentMonthLabel = computed(() => monthFormatter.format(currentDate.value))
  const totalCheckinCount = computed(() => Object.keys(checkins.value).length)
  const monthCheckinCount = computed(() => countMonthCheckins(currentDate.value, checkins.value))
  const streakCount = computed(() => calculateStreak(currentDate.value, checkins.value))
  const calendarDays = computed(() =>
    createCalendarDays(currentDate.value, checkins.value, currentDate.value)
  )

  async function refreshCheckins({ showError = true } = {}) {
    isLoading.value = true

    try {
      const data = await http.get('/api/blog/checkins')
      checkins.value = createCheckinMap(data.dates)
    } catch (error) {
      if (showError) {
        notify(error instanceof Error ? error.message : '读取打卡数据失败。', 'danger')
      }
    } finally {
      isLoading.value = false
    }
  }

  async function checkInDate(value) {
    const date = getStartOfDay(value)

    if (formatDateKey(date) !== todayKey.value || isSubmitting.value || isLoading.value) {
      return
    }

    isSubmitting.value = true

    try {
      const data = await http.post('/api/blog/checkins')
      checkins.value = createCheckinMap(data.dates)
      notify(data.inserted ? '今日打卡成功。' : '今天已经打过卡了。')
    } catch (error) {
      notify(error instanceof Error ? error.message : '打卡失败。', 'danger')
    } finally {
      isSubmitting.value = false
    }
  }

  function checkInToday() {
    checkInDate(currentDate.value)
  }

  function syncCurrentDate() {
    currentDate.value = getStartOfDay(new Date())
  }

  function scheduleCurrentDateRefresh() {
    if (typeof window === 'undefined') {
      return
    }

    window.clearTimeout(refreshTimerId)

    const nextRefresh = new Date(currentDate.value)
    nextRefresh.setDate(nextRefresh.getDate() + 1)
    nextRefresh.setHours(0, 0, 1, 0)

    refreshTimerId = window.setTimeout(async () => {
      syncCurrentDate()
      await refreshCheckins({ showError: false })
      scheduleCurrentDateRefresh()
    }, Math.max(nextRefresh.getTime() - Date.now(), 1000))
  }

  onMounted(() => {
    syncCurrentDate()
    refreshCheckins()
    scheduleCurrentDateRefresh()
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(refreshTimerId)
    }
  })

  return {
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
  }
}
