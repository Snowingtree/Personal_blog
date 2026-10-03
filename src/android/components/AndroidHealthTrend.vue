<template>
  <section class="android-card health-single-trend" :aria-label="title + '记录'" :style="{ '--trend-color': color }">
    <header class="health-card-heading">
      <div><p>{{ metric.toUpperCase() }}</p><h2>{{ title }}</h2></div>
      <span class="health-single-unit">{{ unit }} · {{ aggregationLabel }}<small v-if="days.some(day => day.hasMock)">含模拟数据</small></span>
    </header>
    <div class="health-plot">
    <svg v-if="hasData" ref="chart" class="health-single-svg" viewBox="0 0 360 200" role="img" tabindex="0" :aria-label="title + '折线图，点击或按左右方向键查看所选周期数值'" @click="selectPoint" @keydown.left.prevent="stepPoint(-1)" @keydown.right.prevent="stepPoint(1)" @keydown.enter.prevent="stepPoint(0)" @keydown.esc="selectedDate = ''">
      <g v-for="ratio in [0, 0.5, 1]" :key="ratio">
        <line x1="48" :y1="yRatio(ratio)" x2="338" :y2="yRatio(ratio)" class="health-chart-grid" />
        <text x="40" :y="yRatio(ratio) + 4" text-anchor="end">{{ formatHealthNumber(bounds.min + ratio * (bounds.max - bounds.min)) }}</text>
      </g>
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2.5" stroke-linejoin="round" />
      <circle v-for="point in points.filter(Boolean)" :key="point.date" :cx="point.x" :cy="point.y" r="3.8" :fill="color" stroke="var(--android-surface-high)" stroke-width="1">
        <title>{{ point.label }}：{{ formatHealthNumber(point.value) }} {{ unit }}</title>
      </circle>
      <line v-if="selectedIndex >= 0" :x1="x(selectedIndex)" y1="20" :x2="x(selectedIndex)" y2="165" class="health-chart-cursor" />
      <text v-for="index in labelIndices" :key="index" :x="x(index)" y="191" text-anchor="middle">{{ days[index].axisLabel }}</text>
    </svg>
    <p v-else class="health-empty">这段时间还没有{{ title }}记录</p>
    <div v-if="selectedDay" class="health-point-tooltip" :style="{ left: tooltipLeft }" role="status">
      <time>{{ selectedDay.label }}</time>
      <strong>{{ selectedDay[metric] === null ? '未记录' : formatHealthNumber(selectedDay[metric]) + ' ' + unit }}</strong>
    </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatHealthNumber } from '../healthData'
const props = defineProps({
  days: { type: Array, default: () => [] },
  period: { type: String, default: 'day' },
  metric: { type: String, required: true },
  title: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, required: true }
})
const chart = ref(null)
const aggregationLabel = computed(() => props.period === 'day'
  ? (props.metric === 'weight' ? '每日均值' : '每日累计')
  : ({ week: '周', month: '月', year: '年' }[props.period] + '内日均值'))
const selectedDate = ref('')
watch(() => props.period + props.days.map(day => day.date).join(','), () => { selectedDate.value = '' })
const selectedIndex = computed(() => props.days.findIndex(day => day.date === selectedDate.value))
const selectedDay = computed(() => props.days[selectedIndex.value])
const values = computed(() => props.days.map(day => day[props.metric]).filter(value => value !== null))
const hasData = computed(() => values.value.length > 0)
const bounds = computed(() => {
  const low = hasData.value ? Math.min(...values.value) : 0
  const high = hasData.value ? Math.max(...values.value) : 1
  const padding = Math.max((high - low) * 0.2, props.metric === 'weight' ? 1 : high * 0.1)
  return { min: props.metric === 'weight' ? Math.max(0, low - padding) : 0, max: high + padding }
})
const x = index => props.days.length === 1 ? 193 : 48 + index * 290 / Math.max(props.days.length - 1, 1)
const tooltipLeft = computed(() => `clamp(65px, ${x(selectedIndex.value) / 360 * 100}%, calc(100% - 65px))`)
const yRatio = ratio => 162 - ratio * 138
const points = computed(() => props.days.map((day, index) => day[props.metric] === null ? null : {
  date: day.date, label: day.label, value: day[props.metric], x: x(index), y: yRatio((day[props.metric] - bounds.value.min) / (bounds.value.max - bounds.value.min))
}))
const linePath = computed(() => points.value.map((point, index) => point ? `${index && points.value[index - 1] ? 'L' : 'M'}${point.x},${point.y}` : '').join(' '))
const labelIndices = computed(() => props.days.length ? [...new Set([0, Math.floor((props.days.length - 1) / 2), props.days.length - 1])] : [])
function selectPoint(event) {
  if (!props.days.length || !chart.value) return
  const rect = chart.value.getBoundingClientRect()
  const svgX = (event.clientX - rect.left) * 360 / rect.width
  const index = Math.max(0, Math.min(props.days.length - 1, Math.round((svgX - 48) / 290 * (props.days.length - 1))))
  selectedDate.value = props.days[index].date
}
function stepPoint(direction) {
  if (!props.days.length) return
  const index = selectedIndex.value < 0 ? props.days.length - 1 : Math.max(0, Math.min(props.days.length - 1, selectedIndex.value + direction))
  selectedDate.value = props.days[index].date
}
</script>

<style scoped>
.health-single-unit { color: var(--android-muted); font-size: .7rem; }
.health-single-unit small { display: block; margin-top: 4px; text-align: right; font-size: .6rem; }
.health-plot { position: relative; padding-top: 46px; }
.health-point-tooltip { position: absolute; top: 8px; transform: translateX(-50%); display: grid; gap: 3px; min-width: 110px; padding: 7px; border: 1px solid var(--android-line); border-radius: 9px; background: var(--android-surface-high); box-shadow: var(--android-shadow); text-align: center; pointer-events: none; }
.health-point-tooltip time { color: var(--android-muted); font-size: .68rem; }
.health-point-tooltip strong { color: var(--trend-color); font-size: .8rem; }
.health-single-svg { display: block; width: 100%; margin: 16px 0 10px; cursor: crosshair; }
.health-single-svg:focus { outline: none; }
.health-single-svg:focus-visible { outline: 2px solid var(--android-focus-outline); outline-offset: 3px; border-radius: 6px; }
.health-single-svg text { fill: var(--android-text-faint); font-size: 11px; }
.health-single-value { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 14px 0 0; }
.health-single-value > span { color: var(--android-muted); font-size: .75rem; }
.health-single-value strong { color: var(--trend-color); font-size: 1.35rem; }
.health-single-value small { margin-left: 5px; font-size: .75rem; font-weight: 500; }
</style>
