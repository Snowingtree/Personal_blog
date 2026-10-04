<template>
  <section class="android-card health-record-card" :aria-label="config.title">
    <header class="health-card-heading">
      <div><p>{{ config.eyebrow }}</p><h2>{{ config.title }}</h2></div>
      <component :is="config.icon" :size="22" />
    </header>
    <p class="health-daily-total">{{ summaryLabel }}</p>
    <form class="health-record-form" :class="{ 'health-water-form': type === 'water' || type === 'exercise' || type === 'weight', 'health-food-form': type === 'food' }" @submit.prevent="submit">
      <label v-if="type === 'water'" class="health-water-picker">本次饮水量
        <button type="button" class="health-water-field" aria-label="选择本次饮水量" @click="openPicker">{{ waterAmount }} ml</button>
      </label>
      <label v-else-if="type === 'exercise'" class="health-water-picker">运动时长
        <button type="button" class="health-water-field" aria-label="选择运动时长" @click="openPicker">{{ exerciseMinutes }} 分钟</button>
      </label>
      <label v-else-if="type === 'weight'" class="health-water-picker">当前体重
        <button type="button" class="health-water-field" aria-label="选择当前体重" @click="openPicker">{{ weightDisplay }} kg</button>
      </label>
      <label v-if="type === 'food'" class="health-form-wide"><span class="sr-only">饮食内容</span>
        <textarea v-model="content" :rows="2" maxlength="1000" placeholder="记录吃过的食物" required />
      </label>
      <div v-if="type === 'food'" class="health-food-actions health-form-wide">
        <input ref="foodImageInput" class="sr-only" type="file" accept="image/*" multiple @change="handleFoodImages" />
        <button type="button" class="health-primary-button health-food-photo-button" @click="foodImageInput?.click()">添加图片</button>
        <button class="health-primary-button" type="submit" :disabled="!!storageError || foodImageBusy">添加饮食记录</button>
      </div>
      <button v-else class="health-primary-button" type="submit" :disabled="!!storageError">{{ type === 'water' ? '添加' + waterAmount + 'ml' : type === 'exercise' ? '添加' + exerciseMinutes + '分钟' : '添加' + weightDisplay + 'kg' }}</button>
    </form>
    <div v-if="type === 'food' && foodImages.length" class="health-food-photo-section">
      <div class="health-food-photo-grid" aria-label="已选择的饮食图片">
        <figure v-for="image in foodImages" :key="image.id">
          <img :src="image.url" :alt="image.name || '饮食图片预览'" />
          <button type="button" :aria-label="'删除图片 ' + (image.name || '')" @click="removeFoodImage(image.id)">×</button>
        </figure>
      </div>
    </div>
    <Teleport to="body">
      <div v-if="pickerOpen" class="health-water-picker-overlay" role="presentation" @click.self="closePicker">
        <section class="health-water-picker-modal" role="dialog" aria-modal="true" aria-labelledby="health-picker-title">
          <header><div><p>{{ pickerEyebrow }}</p><h2 id="health-picker-title">{{ pickerTitle }}</h2></div><button type="button" aria-label="关闭选择器" @click="closePicker">×</button></header>
          <div v-if="type === 'weight'" class="health-weight-wheels">
            <div ref="weightWholeWheel" class="health-water-wheel" role="listbox" aria-label="体重整数公斤" tabindex="0" @scroll="syncWeightWheel('whole')" @keydown.up.prevent="moveWeightWheel('whole', -1)" @keydown.down.prevent="moveWeightWheel('whole', 1)">
              <span aria-hidden="true" /><button v-for="amount in weightWholeOptions" :key="amount" type="button" :aria-selected="weightWholeDraft === amount" :class="{ 'is-selected': weightWholeDraft === amount }" role="option" @click="selectWeightWhole(amount)">{{ amount }}</button><span aria-hidden="true" />
            </div>
            <strong class="health-weight-decimal-point" aria-hidden="true">.</strong>
            <div ref="weightDecimalWheel" class="health-water-wheel" role="listbox" aria-label="体重小数位" tabindex="0" @scroll="syncWeightWheel('decimal')" @keydown.up.prevent="moveWeightWheel('decimal', 1)" @keydown.down.prevent="moveWeightWheel('decimal', -1)">
              <span aria-hidden="true" /><button v-for="decimal in weightDecimalOptions" :key="decimal" type="button" :aria-selected="weightDecimalDraft === decimal" :class="{ 'is-selected': weightDecimalDraft === decimal }" role="option" @click="selectWeightDecimal(decimal)">{{ decimal }}</button><span aria-hidden="true" />
            </div>
          </div>
          <div v-else ref="waterWheel" class="health-water-wheel" role="listbox" :aria-label="pickerTitle" tabindex="0" @scroll="syncSingleWheel" @keydown.up.prevent="moveSingleWheel(-1)" @keydown.down.prevent="moveSingleWheel(1)">
            <span aria-hidden="true" />
            <button v-for="amount in pickerOptions" :key="amount" type="button" :aria-selected="singleDraft === amount" :class="{ 'is-selected': singleDraft === amount }" role="option" @click="selectSingleAmount(amount)">{{ amount }}{{ type === 'water' ? ' ml' : ' 分钟' }}</button>
            <span aria-hidden="true" />
          </div>
          <div class="health-water-picker-actions"><button type="button" class="health-water-cancel" @click="closePicker">取消</button><button type="button" class="health-primary-button" @click="confirmPicker">确认</button></div>
        </section>
      </div>
    </Teleport>
    <p v-if="feedback || storageError" class="health-feedback" :class="{ 'is-error': failed || storageError }" role="status">{{ storageError || feedback }}</p>
    <div class="health-record-list">
      <h3>{{ selectedDay === today ? '今天' : selectedDay }}的记录 <span>{{ dayRecords.length }} 次</span></h3>
      <p v-if="!dayRecords.length" class="health-empty">还没有记录，添加今天的第一条吧。</p>
      <article v-for="record in dayRecords" :key="record.id" class="health-record-row">
        <time :datetime="record.time">{{ record.legacy ? '历史记录' : record.time.slice(11) }}</time>
        <div><strong v-if="type !== 'food'">{{ formatHealthNumber(record.value) }} {{ config.unit }}</strong><p v-if="record.text">{{ record.text }}</p></div>
        <button type="button" class="health-remove" :aria-label="`删除${config.title} ${record.time}`" @click="remove(record)"><Trash2 :size="15" /></button>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Droplets, Utensils, Dumbbell, Scale, Trash2 } from 'lucide-vue-next'
import { formatHealthNumber, localRecordTime, summarizeHealthDay } from '../healthData'
import { deleteHealthImage, persistHealthImage, prepareHealthImage } from '../healthImages'
import { useHealthRecords, useHealthToday } from '../useHealthRecords'

const props = defineProps({ type: { type: String, required: true } })
const configs = {
  water: { title: '饮水', eyebrow: 'WATER', icon: Droplets, valueLabel: '本次饮水量（L）', placeholder: '例如 0.25', unit: 'L', button: '添加饮水记录' },
  food: { title: '饮食', eyebrow: 'FOOD', icon: Utensils, button: '添加饮食记录' },
  exercise: { title: '运动', eyebrow: 'EXERCISE', icon: Dumbbell, valueLabel: '运动时长（分钟）', placeholder: '例如 30', unit: '分钟', button: '添加运动记录' },
  weight: { title: '体重', eyebrow: 'WEIGHT', icon: Scale, valueLabel: '当前体重（kg）', placeholder: '例如 65.5', unit: 'kg', button: '添加体重记录' }
}
const config = computed(() => configs[props.type])
const { records, storageError, addRecord } = useHealthRecords()
const today = useHealthToday()
const waterOptions = [250, 330, 500, 600, 750, 880, 1000, 1200, 1500, 2000]
const exerciseOptions = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180]
const weightWholeOptions = Array.from({ length: 121 }, (_, index) => index + 30)
const weightDecimalOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const waterAmount = ref(880)
const waterDraft = ref(880)
const exerciseMinutes = ref(30)
const exerciseDraft = ref(30)
const weightWhole = ref(65)
const weightDecimal = ref(0)
const weightWholeDraft = ref(65)
const weightDecimalDraft = ref(0)
const pickerOpen = ref(false)
const waterWheel = ref(null)
const weightWholeWheel = ref(null)
const weightDecimalWheel = ref(null)
const wheelRowHeight = 36
const value = ref('')
const content = ref('')
const feedback = ref('')
const failed = ref(false)
const foodImageInput = ref(null)
const foodImages = ref([])
const foodImageBusy = ref(false)
const selectedDay = computed(() => today.value)
const dayRecords = computed(() => records.value.filter(record => record.type === props.type && record.time.slice(0, 10) === today.value))
const pickerOptions = computed(() => props.type === 'water' ? waterOptions : exerciseOptions)
const singleDraft = computed(() => props.type === 'water' ? waterDraft.value : exerciseDraft.value)
const weightDisplay = computed(() => String(weightWhole.value) + '.' + weightDecimal.value)
const pickerTitle = computed(() => props.type === 'water' ? '本次饮水量' : props.type === 'exercise' ? '运动时长' : '当前体重')
const pickerEyebrow = computed(() => props.type === 'water' ? 'WATER' : props.type === 'exercise' ? 'EXERCISE' : 'WEIGHT')
function scrollWheel(wheel, options, value) {
  if (wheel.value) wheel.value.scrollTop = options.indexOf(value) * wheelRowHeight
}
function scrollPickerWheels() {
  if (props.type === 'weight') {
    scrollWheel(weightWholeWheel, weightWholeOptions, weightWholeDraft.value)
    scrollWheel(weightDecimalWheel, weightDecimalOptions, weightDecimalDraft.value)
  } else {
    scrollWheel(waterWheel, pickerOptions.value, singleDraft.value)
  }
}
function selectSingleAmount(amount) {
  if (props.type === 'water') waterDraft.value = amount
  else exerciseDraft.value = amount
  nextTick(scrollPickerWheels)
}
function syncSingleWheel() {
  if (!waterWheel.value) return
  const index = Math.max(0, Math.min(pickerOptions.value.length - 1, Math.round(waterWheel.value.scrollTop / wheelRowHeight)))
  selectSingleAmount(pickerOptions.value[index])
}
function moveSingleWheel(direction) {
  const current = pickerOptions.value.indexOf(singleDraft.value)
  selectSingleAmount(pickerOptions.value[Math.max(0, Math.min(pickerOptions.value.length - 1, current + direction))])
}
function syncWeightWheel(which) {
  const wheel = which === 'whole' ? weightWholeWheel : weightDecimalWheel
  const options = which === 'whole' ? weightWholeOptions : weightDecimalOptions
  const index = Math.max(0, Math.min(options.length - 1, Math.round(wheel.value.scrollTop / wheelRowHeight)))
  if (which === 'whole') weightWholeDraft.value = options[index]
  else weightDecimalDraft.value = options[index]
}
function selectWeightWhole(amount) {
  weightWholeDraft.value = amount
  nextTick(scrollPickerWheels)
}
function selectWeightDecimal(amount) {
  weightDecimalDraft.value = amount
  nextTick(scrollPickerWheels)
}
function moveWeightWheel(which, direction) {
  const options = which === 'whole' ? weightWholeOptions : weightDecimalOptions
  const current = options.indexOf(which === 'whole' ? weightWholeDraft.value : weightDecimalDraft.value)
  const amount = options[Math.max(0, Math.min(options.length - 1, current + direction))]
  if (which === 'whole') selectWeightWhole(amount)
  else selectWeightDecimal(amount)
}
let previousOverflow = ''
function syncPickerFromLastRecord() {
  const previous = [...records.value].filter(record => record.type === props.type).sort((a, b) => b.time.localeCompare(a.time))[0]?.value
  if (props.type === 'exercise' && previous > 0) {
    exerciseMinutes.value = Math.round(previous)
  }
  if (props.type === 'weight' && previous > 0) {
    weightWhole.value = Math.floor(previous)
    weightDecimal.value = Math.round((previous - weightWhole.value) * 10)
  }
}
syncPickerFromLastRecord()
function openPicker() {
  syncPickerFromLastRecord()
  waterDraft.value = waterAmount.value
  exerciseDraft.value = exerciseMinutes.value
  weightWholeDraft.value = weightWhole.value
  weightDecimalDraft.value = weightDecimal.value
  pickerOpen.value = true
  previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  nextTick(scrollPickerWheels)
}
function closePicker() {
  pickerOpen.value = false
  document.documentElement.style.overflow = previousOverflow
}
function confirmPicker() {
  waterAmount.value = waterDraft.value
  exerciseMinutes.value = exerciseDraft.value
  weightWhole.value = weightWholeDraft.value
  weightDecimal.value = weightDecimalDraft.value
  closePicker()
}
onBeforeUnmount(() => {
  document.documentElement.style.overflow = previousOverflow
  foodImages.value.forEach(deleteHealthImage)
})
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

async function submit() {
  if (props.type === 'food') foodImageBusy.value = true
  let persistedImages = []
  try {
    const savedTime = localRecordTime()
    const recordValue = props.type === 'water'
      ? waterAmount.value / 1000
      : props.type === 'exercise'
        ? exerciseMinutes.value
        : props.type === 'weight'
          ? Number(weightDisplay.value)
          : Number(value.value)
    if (props.type === 'food') {
      for (const image of foodImages.value) persistedImages.push(await persistHealthImage(image))
    }
    const images = persistedImages.filter(image => image.persistent).map(({ id, name }) => ({ id, name }))
    addRecord({
      type: props.type,
      time: savedTime,
      ...(props.type !== 'food' ? { value: recordValue } : {}),
      text: content.value.trim(),
      ...(images.length ? { images } : {})
    })
    value.value = ''
    content.value = ''
    if (props.type === 'food') {
      foodImages.value.forEach(deleteHealthImage)
      persistedImages.forEach(image => { image.blob = undefined })
      foodImages.value = []
    }
    feedback.value = `已保存 · ${savedTime.replace('T', ' ')}`
    failed.value = false
  } catch (error) {
    persistedImages.forEach(deleteHealthImage)
    feedback.value = error.message
    failed.value = true
  } finally {
    if (props.type === 'food') foodImageBusy.value = false
  }
}

async function handleFoodImages(event) {
  const files = Array.from(event.target.files || [])
  const available = Math.max(0, 6 - foodImages.value.length)
  event.target.value = ''
  const candidates = files.slice(0, available).filter(file => file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024)
  if (!candidates.length) return
  foodImageBusy.value = true
  let savedCount = 0
  try {
    for (const file of candidates) {
      foodImages.value.push(await prepareHealthImage(file))
      savedCount += 1
    }
    feedback.value = `已压缩 ${savedCount} 张图片，提交饮食记录后保存`
    failed.value = false
  } catch (error) {
    feedback.value = error.message
    failed.value = true
  } finally {
    foodImageBusy.value = false
  }
}

function removeFoodImage(id) {
  const image = foodImages.value.find(item => item.id === id)
  deleteHealthImage(image)
  foodImages.value = foodImages.value.filter(item => item.id !== id)
}

</script>
