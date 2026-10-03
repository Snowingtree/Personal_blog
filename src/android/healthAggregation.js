import { formatAndroidDateKey } from './healthData'

const metrics = ['weight', 'water', 'exercise']

function periodStart(date, period) {
  const value = new Date(date + 'T12:00:00')
  if (period === 'week') value.setDate(value.getDate() - (value.getDay() + 6) % 7)
  if (period === 'month') value.setDate(1)
  if (period === 'year') value.setMonth(0, 1)
  return formatAndroidDateKey(value)
}

// One raw-record pass, then one daily-summary pass shared by all three charts.
// Missing measurements are excluded per metric, rather than treated as zero.
export function aggregateHealthRecords(records, today) {
  const daily = new Map()
  for (const record of records) {
    const date = record.time.slice(0, 10)
    if (date > today) continue
    let day = daily.get(date)
    if (!day) {
      day = { date, weight: null, water: null, exercise: null, weightCount: 0, food: [], hasMock: false }
      daily.set(date, day)
    }
    day.hasMock ||= !!record.mock
    if (record.type === 'food') day.food.push(record)
    else {
      day[record.type] = (day[record.type] ?? 0) + record.value
      if (record.type === 'weight') day.weightCount++
    }
  }
  const index = { day: daily, week: new Map(), month: new Map(), year: new Map() }
  for (const day of daily.values()) {
    if (day.weightCount) day.weight /= day.weightCount
    day.food.sort((a, b) => a.time.localeCompare(b.time))
    for (const period of ['week', 'month', 'year']) {
      const date = periodStart(day.date, period)
      let bucket = index[period].get(date)
      if (!bucket) {
        bucket = { date, weight: 0, water: 0, exercise: 0, counts: { weight: 0, water: 0, exercise: 0 }, hasMock: false }
        index[period].set(date, bucket)
      }
      bucket.hasMock ||= day.hasMock
      for (const metric of metrics) {
        if (day[metric] === null) continue
        bucket[metric] += day[metric]
        bucket.counts[metric]++
      }
    }
  }
  for (const period of ['week', 'month', 'year']) {
    for (const bucket of index[period].values()) {
      for (const metric of metrics) bucket[metric] = bucket.counts[metric] ? bucket[metric] / bucket.counts[metric] : null
    }
  }
  return index
}

export function healthPeriodView(index, period, today) {
  const count = { day: 1, week: 7, month: 12, year: 5 }[period]
  const start = new Date(periodStart(today, period) + 'T12:00:00')
  const points = []
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(start)
    if (period === 'day') date.setDate(date.getDate() - offset)
    if (period === 'week') date.setDate(date.getDate() - offset * 7)
    if (period === 'month') date.setMonth(date.getMonth() - offset)
    if (period === 'year') date.setFullYear(date.getFullYear() - offset)
    const key = formatAndroidDateKey(date)
    const end = new Date(date)
    if (period === 'week') end.setDate(end.getDate() + 6)
    if (period === 'month') end.setMonth(end.getMonth() + 1, 0)
    if (period === 'year') end.setFullYear(end.getFullYear() + 1, 0, 0)
    const endKey = formatAndroidDateKey(end)
    const label = period === 'week' ? key + ' ～ ' + (endKey > today ? today : endKey)
      : period === 'month' ? key.slice(0, 7) : period === 'year' ? key.slice(0, 4) + '年' : key
    const axisLabel = period === 'year' ? key.slice(0, 4) : period === 'month' ? key.slice(0, 7) : key.slice(5).replace('-', '/')
    points.push({ weight: null, water: null, exercise: null, ...index[period].get(key), date: key, label, axisLabel })
  }
  return points
}
