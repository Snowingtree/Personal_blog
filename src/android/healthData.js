import { ANDROID_DIET_LOG_KEY, ANDROID_HEALTH_LOG_KEY } from '../constants/storage'

export const HEALTH_RECORDS_KEY = 'android-health-records-v2'
export const HEALTH_TYPES = ['water', 'food', 'exercise', 'weight']

export function formatAndroidDateKey(value = new Date()) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function localRecordTime(value = new Date()) {
  const date = new Date(value)
  return `${formatAndroidDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function createAndroidRecentDays(count = 7, endDate = new Date()) {
  const end = new Date(`${formatAndroidDateKey(endDate)}T12:00:00`)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end)
    date.setDate(end.getDate() - index)
    return { key: formatAndroidDateKey(date), date, isToday: formatAndroidDateKey(date) === formatAndroidDateKey() }
  })
}

function readObject(storage, key) {
  const raw = storage.getItem(key)
  if (!raw) return {}
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('记录格式异常')
  return parsed
}

export function validateHealthRecord(record) {
  if (!HEALTH_TYPES.includes(record.type)) throw new Error('记录类型无效。')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(record.time) || !Number.isFinite(new Date(record.time).getTime()) || localRecordTime(record.time) !== record.time) {
    throw new Error('请填写有效的记录时间。')
  }
  if (record.type === 'food') {
    if (!String(record.text || '').trim()) throw new Error('请填写吃了什么。')
  } else if (!Number.isFinite(record.value) || record.value <= 0) {
    throw new Error('请输入大于 0 的有效数值。')
  }
  if (record.type === 'exercise' && !String(record.text || '').trim()) throw new Error('请填写运动内容。')
}

export function readHealthRecords(storage = localStorage) {
  const raw = storage.getItem(HEALTH_RECORDS_KEY)
  if (raw !== null) {
    const records = JSON.parse(raw)
    if (!Array.isArray(records)) throw new Error('记录格式异常')
    records.forEach(validateHealthRecord)
    return records
  }
  // Old daily totals have no known time of day; preserve their original keys.
  const previous = readObject(storage, ANDROID_HEALTH_LOG_KEY)
  const food = readObject(storage, ANDROID_DIET_LOG_KEY)
  const records = []
  for (const [date, entry] of Object.entries(previous)) {
    for (const type of ['water', 'exercise']) {
      const value = Number(entry?.[type])
      if (!(value > 0 && Number.isFinite(value))) continue
      const record = { id: `legacy-${type}-${date}`, type, time: `${date}T12:00`, value, text: type === 'exercise' ? '历史运动记录' : '', legacy: true }
      validateHealthRecord(record)
      records.push(record)
    }
  }
  for (const [date, text] of Object.entries(food)) {
    if (typeof text !== 'string' || !text.trim()) continue
    const record = { id: `legacy-food-${date}`, type: 'food', time: `${date}T12:00`, text, legacy: true }
    validateHealthRecord(record)
    records.push(record)
  }
  return records
}

export function summarizeHealthDay(records, date) {
  const entries = records.filter(record => record.time.slice(0, 10) === date)
  const values = type => entries.filter(record => record.type === type)
  const sum = type => values(type).reduce((total, record) => total + record.value, 0)
  const weights = values('weight')
  return {
    date,
    weight: weights.length ? sum('weight') / weights.length : null,
    water: values('water').length ? sum('water') : null,
    exercise: values('exercise').length ? sum('exercise') : null,
    food: values('food').sort((a, b) => a.time.localeCompare(b.time))
  }
}

export function formatHealthNumber(value) {
  return value === null ? '—' : Number(value.toFixed(2)).toString()
}
