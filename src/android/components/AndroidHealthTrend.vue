<template>
  <section class="android-card health-single-trend" :aria-label="title + '记录'" :style="{ '--trend-color': color }">
    <header class="health-card-heading">
      <div><p>{{ metric.toUpperCase() }}</p><h2>{{ title }}</h2></div>
      <span class="health-single-unit">{{ unit }} · {{ aggregationLabel }}</span>
    </header>
    <div ref="chartElement" class="health-echarts" role="img" :aria-label="title + ' ECharts 折线图，点击或触摸数据点查看周期数值'" />
    <p v-if="!hasData" class="health-empty">这段时间还没有{{ title }}记录</p>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatHealthNumber } from '../healthData'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  days: { type: Array, default: () => [] },
  period: { type: String, default: 'day' },
  metric: { type: String, required: true },
  title: { type: String, required: true },
  unit: { type: String, required: true },
  color: { type: String, required: true }
})
const chartElement = ref(null)
let chart
let resizeObserver
const aggregationLabel = computed(() => props.period === 'day'
  ? (props.metric === 'weight' ? '每日均值' : '每日累计')
  : props.period === 'week'
    ? (props.metric === 'weight' ? '本周每日均值' : '本周每日累计')
  : ({ week: '周', month: '月', year: '年' }[props.period] + '内日均值'))
const values = computed(() => props.days.map(day => day[props.metric]).filter(value => value !== null))
const hasData = computed(() => values.value.length > 0)

function axisLabel(day) {
  return day.axisLabel || day.date.slice(5).replace('-', '/')
}
function displayValue(value) {
  return value === null || value === undefined ? '未记录' : `${formatHealthNumber(value)} ${props.unit}`
}
function option() {
  const valuesForAxis = props.days.map(day => day[props.metric])
  const valid = valuesForAxis.filter(value => value !== null)
  const low = valid.length ? Math.min(...valid) : 0
  const high = valid.length ? Math.max(...valid) : 1
  const padding = Math.max((high - low) * 0.2, props.metric === 'weight' ? 1 : high * 0.1)
  const min = props.metric === 'weight' ? Math.max(0, low - padding) : 0
  const max = high + padding || 1
  return {
    animation: false,
    grid: { top: 18, right: 12, bottom: 28, left: 46 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.days.map(axisLabel),
      axisLine: { lineStyle: { color: 'var(--android-line-strong)' } },
      axisTick: { show: false },
      axisLabel: { color: 'var(--android-text-faint)', fontSize: 10, interval: Math.max(0, Math.ceil(props.days.length / 5) - 1) }
    },
    yAxis: {
      type: 'value',
      min,
      max,
      splitNumber: 3,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'var(--android-text-faint)', fontSize: 10, formatter: value => formatHealthNumber(value) },
      splitLine: { show: false }
    },
    tooltip: {
      trigger: 'axis',
      triggerOn: 'click',
      confine: true,
      backgroundColor: 'var(--android-surface-high)',
      borderColor: 'var(--android-line)',
      borderWidth: 1,
      textStyle: { color: 'var(--android-text-strong)', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: props.color, type: 'dashed', opacity: .7 } },
      formatter: params => {
        const item = Array.isArray(params) ? params[0] : params
        const day = props.days[item?.dataIndex]
        if (!day) return ''
        return `<div class="health-echarts-tooltip"><strong>${day.label || day.date}</strong><span style="color:${props.color}">${props.title}：${displayValue(day[props.metric])}</span></div>`
      }
    },
    series: [{
      name: props.title,
      type: 'line',
      data: valuesForAxis,
      connectNulls: false,
      smooth: .2,
      symbol: 'circle',
      symbolSize: 7,
      showSymbol: true,
      itemStyle: { color: props.color, borderColor: 'var(--android-surface-high)', borderWidth: 1 },
      lineStyle: { color: props.color, width: 2.5 },
      areaStyle: { color: props.color, opacity: .08 }
    }]
  }
}
function render() {
  if (!chartElement.value) return
  if (!chart) chart = echarts.init(chartElement.value, undefined, { renderer: 'canvas' })
  chart.setOption(option(), true)
  chart.resize()
}
function handleResize() { chart?.resize() }
onMounted(async () => {
  await nextTick()
  render()
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(chartElement.value)
})
watch(() => [props.period, props.days], () => nextTick(render), { deep: true })
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = undefined
})
</script>

<style scoped>
.health-single-unit { color: var(--android-muted); font-size: .7rem; }
.health-single-unit small { display: block; margin-top: 4px; text-align: right; font-size: .6rem; }
.health-echarts { width: 100%; height: 220px; }
.health-echarts-tooltip { display: grid; gap: 5px; min-width: 105px; }
.health-echarts-tooltip strong { color: var(--android-text-strong); font-size: .75rem; }
.health-echarts-tooltip span { font-size: .75rem; font-weight: 700; }
</style>
