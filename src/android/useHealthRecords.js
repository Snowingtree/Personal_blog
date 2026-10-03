import { computed, onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { HEALTH_RECORDS_KEY, formatAndroidDateKey, readHealthRecords, validateHealthRecord } from './healthData'
import { HEALTH_MOCK_KEY, readHealthMockRecords } from './healthMockData'

const realRecords = ref([])
const mockRecords = ref([])
const records = computed(() => [...realRecords.value, ...mockRecords.value])
const storageError = ref('')
try {
  realRecords.value = readHealthRecords()
  mockRecords.value = readHealthMockRecords()
} catch {
  storageError.value = '本机记录读取失败。请检查浏览器存储后刷新，已有数据不会被覆盖。'
}

export function useHealthRecords() {
  function persist(nextRecords, mock = false) {
    if (storageError.value) throw new Error(storageError.value)
    try {
      localStorage.setItem(mock ? HEALTH_MOCK_KEY : HEALTH_RECORDS_KEY, JSON.stringify(nextRecords))
    } catch {
      throw new Error('保存失败，本机存储不可用或空间不足，请重试。')
    }
    if (mock) mockRecords.value = nextRecords
    else realRecords.value = nextRecords
  }
  function addRecord(record) {
    validateHealthRecord(record)
    persist([...realRecords.value, { ...record, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}` }])
  }
  function removeRecord(id) {
    const mock = mockRecords.value.some(record => record.id === id)
    persist((mock ? mockRecords.value : realRecords.value).filter(record => record.id !== id), mock)
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
