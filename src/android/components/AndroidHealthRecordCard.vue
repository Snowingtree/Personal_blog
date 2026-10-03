<template>
  <section class="android-card health-record-card" :aria-label="config.title">
    <header class="health-card-heading">
      <div><p>{{ config.eyebrow }}</p><h2>{{ config.title }}</h2></div>
      <component :is="config.icon" :size="22" />
    </header>
    <p class="health-daily-total">{{ summaryLabel }}</p>
    <form class="health-record-form" @submit.prevent="submit">
      <label>记录时间<input v-model="time" type="datetime-local" required /></label>
      <label v-if="type !== 'food'">{{ config.valueLabel }}
        <input v-model="value" type="number" min="0.01" step="any" inputmode="decimal" :placeholder="config.placeholder" required />
      </label>
      <label v-if="type === 'food' || type === 'exercise'" class="health-form-wide">{{ type === 'food' ? '吃了什么' : '运动内容' }}
        <textarea v-model="content" :rows="type === 'food' ? 3 : 2" maxlength="1000" :placeholder="type === 'food' ? '例如：午餐，米饭、青菜、鸡肉' : '例如：快走、跑步、力量训练'" required />
      </label>
      <button class="health-primary-button health-form-wide" type="submit" :disabled="!!storageError">{{ config.button }}</button>
    </form>
    <p v-if="feedback || storageError" class="health-feedback" :class="{ 'is-error': failed || storageError }" role="status">{{ storageError || feedback }}</p>
    <div class="health-record-list">
      <h3>{{ selectedDay === today ? '今天' : selectedDay }}的记录 <span>{{ dayRecords.length }} 次</span></h3>
      <p v-if="!dayRecords.length" class="health-empty">还没有记录，添加今天的第一条吧。</p>
      <article v-for="record in dayRecords" :key="record.id" class="health-record-row">
        <time :datetime="record.time">{{ record.legacy ? '历史记录' : record.time.slice(11) }}<small v-if="record.mock" class="health-mock-label">模拟</small></time>
        <div><strong v-if="type !== 'food'">{{ formatHealthNumber(record.value) }} {{ config.unit }}</strong><p v-if="record.text">{{ record.text }}</p></div>
        <button type="button" class="health-remove" :aria-label="`删除${config.title} ${record.time}`" @click="remove(record)"><Trash2 :size="15" /></button>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Droplets, Utensils, Dumbbell, Scale, Trash2 } from 'lucide-vue-next'
import { formatHealthNumber, localRecordTime, summarizeHealthDay } from '../healthData'
import { useHealthRecords, useHealthToday } from '../useHealthRecords'

const props = defineProps({ type: { type: String, required: true } })
const configs = {
  water: { title: '饮水', eyebrow: 'WATER', icon: Droplets, valueLabel: '本次饮水量（L）', placeholder: '例如 0.25', unit: 'L', button: '添加饮水记录' },
  food: { title: '饮食', eyebrow: 'FOOD', icon: Utensils, button: '添加饮食记录' },
  exercise: { title: '运动', eyebrow: 'EXERCISE', icon: Dumbbell, valueLabel: '运动时长（分钟）', placeholder: '例如 30', unit: '分钟', button: '添加运动记录' },
  weight: { title: '体重', eyebrow: 'WEIGHT', icon: Scale, valueLabel: '当前体重（kg）', placeholder: '例如 65.5', unit: 'kg', button: '添加体重记录' }
}
const config = computed(() => configs[props.type])
const { records, storageError, addRecord, removeRecord } = useHealthRecords()
const today = useHealthToday()
const time = ref(localRecordTime())
const value = ref('')
const content = ref('')
const feedback = ref('')
const failed = ref(false)
const selectedDay = computed(() => time.value?.slice(0, 10) || today.value)
const dayRecords = computed(() => records.value.filter(record => record.type === props.type && record.time.slice(0, 10) === selectedDay.value).sort((a, b) => b.time.localeCompare(a.time)))
const summaryLabel = computed(() => {
  const date = selectedDay.value === today.value ? '今日' : selectedDay.value
  if (props.type === 'food') return `${date}已记录 ${dayRecords.value.length} 次饮食`
  const summary = summarizeHealthDay(records.value, selectedDay.value)
  const number = formatHealthNumber(summary[props.type])
  if (props.type === 'weight') {
    const latest = dayRecords.value[0]
    return latest ? `最近一次 ${formatHealthNumber(latest.value)} kg · 当日均值 ${number} kg` : `${date}尚未记录体重`
  }
  return `${date}累计 ${number === '—' ? '0' : number} ${config.value.unit}`
})

function submit() {
  try {
    const savedTime = time.value
    addRecord({ type: props.type, time: savedTime, ...(props.type !== 'food' ? { value: Number(value.value) } : {}), text: content.value.trim() })
    value.value = ''
    content.value = ''
    feedback.value = `已保存 · ${savedTime.replace('T', ' ')}`
    failed.value = false
    time.value = localRecordTime()
  } catch (error) {
    feedback.value = error.message
    failed.value = true
  }
}

function remove(record) {
  if (!window.confirm('删除这条记录？当天汇总将同步更新。')) return
  try {
    removeRecord(record.id)
    feedback.value = '记录已删除'
    failed.value = false
  } catch (error) {
    feedback.value = error.message
    failed.value = true
  }
}
</script>
