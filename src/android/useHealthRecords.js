import { computed, onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { HEALTH_RECORDS_KEY, formatAndroidDateKey, readHealthRecords, validateHealthRecord } from './healthData'
import { deleteHealthImage } from './healthImages'

const realRecords = ref([])
const records = computed(() => realRecords.value)
const storageError = ref('')
try {
  // Remove preview data created by earlier builds before loading real records.
  localStorage.removeItem('android-health-mock-records-v1')
  const loadedRecords = readHealthRecords()
  const cleanedRecords = loadedRecords.filter(record => (
    record.mock !== true && !String(record.id || '').startsWith('mock-health-')
  ))
  if (cleanedRecords.length !== loadedRecords.length) {
    localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(cleanedRecords))
  }
  realRecords.value = cleanedRecords
} catch {
  storageError.value = '本机记录读取失败。请检查浏览器存储后刷新，已有数据不会被覆盖。'
}

export function useHealthRecords() {
  function persist(nextRecords) {
    if (storageError.value) throw new Error(storageError.value)
    try {
      localStorage.setItem(HEALTH_RECORDS_KEY, JSON.stringify(nextRecords))
    } catch {
      throw new Error('保存失败，本机存储不可用或空间不足，请重试。')
    }
    realRecords.value = nextRecords
  }
  function addRecord(record) {
    validateHealthRecord(record)
    persist([...realRecords.value, { ...record, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}` }])
  }
  function removeRecord(id) {
    const removed = realRecords.value.find(record => record.id === id)
    persist(realRecords.value.filter(record => record.id !== id))
    removed?.images?.forEach(image => deleteHealthImage({ id: image.id, persistent: true }))
  }
  return { records: readonly(records), storageError: readonly(storageError), addRecord, removeRecord }
}

export function useHealthToday() {
  const today = ref(formatAndroidDateKey())
  let timer
  const refresh = () => { today.value = formatAndroidDateKey() }
  onMounted(() => {
    timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
  })
  onBeforeUnmount(() => {
    window.clearInterval(timer)
    window.removeEventListener('focus', refresh)
  })
  return today
}
