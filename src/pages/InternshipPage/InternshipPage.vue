<template>
  <main v-if="privateAppAvailable" class="internship-page">
    <section class="internship-shell">
      <section class="internship-board" aria-label="实习记录列表">
        <div class="internship-board__head">
          <div>
            <h1>实习记录</h1>
          </div>
          <div class="internship-board__actions">
            <button type="button" class="internship-logout" @click="handleBackToTools">返回</button>
            <button
              type="button"
              class="internship-trash-button"
              :class="{ 'is-active': activeBoardView === 'trash' }"
              :aria-label="activeBoardView === 'trash' ? '返回实习记录' : '打开回收站'"
              :title="activeBoardView === 'trash' ? '返回实习记录' : '回收站'"
              @click="toggleTrashView"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 15h10l1-15" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
            <button
              type="button"
              class="internship-add-button"
              aria-label="添加实习记录"
              @click="openCreateDialog"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>

        <div class="internship-board__content">
          <Transition name="internship-board-switch" mode="out-in">
            <section
              v-if="activeBoardView === 'records'"
              key="records"
              class="internship-board__records-view"
              aria-label="实习记录内容"
            >
            <div class="internship-board__toolbar">
              <label class="internship-search">
                <span>搜索</span>
                <input v-model.trim="searchQuery" type="search" placeholder="标题、内容、类型或状态" />
              </label>

              <div class="internship-filter">
                <span>类型</span>
                <span
                  class="internship-select-wrap"
                  :class="{ 'is-open': openSelectMenu === 'activeCategory' }"
                  @focusout="handleSelectFocusout($event, 'activeCategory')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'activeCategory'"
                    @click="toggleSelectMenu('activeCategory')"
                    @keydown.escape.stop="closeSelectMenu('activeCategory')"
                  >
                    <span>{{ getCategoryFilterLabel(activeCategory) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'activeCategory'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in categoryFilterOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': activeCategory === option.value }"
                        role="option"
                        :aria-selected="activeCategory === option.value"
                        @mousedown.prevent
                        @click="selectActiveCategory(option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>
            </div>

            <div class="internship-status-tabs" role="tablist" aria-label="记录状态筛选">
              <button
                v-for="option in statusFilterOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': activeStatus === option.value }"
                @click="activeStatus = option.value"
              >
                {{ option.label }}
              </button>
            </div>

            <div class="internship-records">
              <article v-for="record in filteredRecords" :key="record.id" class="internship-record">
                <div class="internship-record__head">
                  <h2>{{ record.title }}</h2>

                  <div class="internship-record__meta">
                    <time :datetime="record.updatedAt">更新于 {{ formatDate(record.updatedAt) }}</time>
                    <span>{{ getCategoryLabel(record.category) }}</span>
                    <span :class="['internship-record__status', `is-${record.status}`]">
                      {{ getStatusLabel(record.status) }}
                    </span>
                  </div>
                </div>

                <div class="internship-record__body">
                  <p class="internship-record__content">{{ getRecordPreview(record.content) }}</p>
                  <div class="internship-record__actions">
                    <button type="button" @click="startEditing(record)">编辑</button>
                    <button type="button" @click="requestRemoveRecord(record)">删除</button>
                  </div>
                </div>
              </article>

              <p v-if="!filteredRecords.length" class="internship-empty">
                {{ records.length ? '没有匹配的实习记录' : '暂无实习记录' }}
              </p>
            </div>
            </section>

            <section v-else key="trash" class="internship-trash internship-trash--board" aria-label="回收站列表">
            <div class="internship-trash__head">
              <div>
                <h2>回收站</h2>
                <p>已删除的记录会显示在这里，可以恢复或移除。</p>
              </div>
              <button type="button" class="internship-secondary" @click="showRecordsView">返回记录</button>
            </div>

            <p v-if="!sortedDeletedRecords.length" class="internship-empty">回收站为空</p>

            <div v-else class="internship-trash-list">
              <article v-for="record in sortedDeletedRecords" :key="record.id" class="internship-trash-item">
                <div class="internship-trash-item__main">
                  <div class="internship-trash-item__head">
                    <h3>{{ record.title }}</h3>
                    <time :datetime="record.deletedAt">删除于 {{ formatDateTime(record.deletedAt) }}</time>
                  </div>
                  <p class="internship-trash-item__content">{{ getRecordPreview(record.content) }}</p>
                </div>
                <div class="internship-trash-item__actions">
                  <button type="button" class="internship-secondary" @click="restoreDeletedRecord(record)">恢复</button>
                  <button type="button" class="internship-danger" @click="removeDeletedRecord(record.id)">移除</button>
                </div>
              </article>
            </div>
            </section>
          </Transition>
        </div>
      </section>

      <aside class="internship-summary" aria-label="实习概览">
        <article v-for="card in statCards" :key="card.key" class="internship-stat">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </article>
      </aside>
    </section>

    <Transition name="internship-window">
      <div
        v-if="draftDialogOpen"
        class="internship-modal"
        role="presentation"
        @click.self="closeDraftDialog"
      >
        <section
          class="internship-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internship-dialog-title"
        >
          <div class="internship-dialog__head">
            <div>
              <h2 id="internship-dialog-title">{{ editingId ? '编辑记录' : '添加实习记录' }}</h2>
            </div>
            <div class="internship-dialog__actions">
              <button
                type="submit"
                form="internship-record-form"
                class="internship-dialog__save"
                :aria-label="editingId ? '更新记录' : '保存记录'"
                :title="editingId ? '更新记录' : '保存记录'"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4h12l2 2v14H5V4Z" />
                  <path d="M8 4v6h8V4" />
                  <path d="M8 16h8v4H8v-4Z" />
                </svg>
              </button>
              <button type="button" class="internship-dialog__close" aria-label="关闭" @click="closeDraftDialog">
                ×
              </button>
            </div>
          </div>

          <form id="internship-record-form" class="internship-form" @submit.prevent="handleSave">
            <div class="internship-form__left">
              <label class="internship-field internship-field--wide">
                <span>标题</span>
                <input v-model.trim="draftTitle" type="text" placeholder="例如：第 1 周周报" />
              </label>

              <label class="internship-field">
                <span>日期</span>
                <input v-model="draftDate" type="date" />
              </label>

              <div class="internship-field">
                <span>类型</span>
                <span
                  class="internship-select-wrap"
                  :class="{ 'is-open': openSelectMenu === 'draftCategory' }"
                  @focusout="handleSelectFocusout($event, 'draftCategory')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'draftCategory'"
                    @click="toggleSelectMenu('draftCategory')"
                    @keydown.escape.stop="closeSelectMenu('draftCategory')"
                  >
                    <span>{{ getCategoryLabel(draftCategory) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'draftCategory'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in categoryOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': draftCategory === option.value }"
                        role="option"
                        :aria-selected="draftCategory === option.value"
                        @mousedown.prevent
                        @click="selectDraftCategory(option.value)"
                      >
                      {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>

              <div class="internship-field">
                <span>状态</span>
                <span
                  class="internship-select-wrap internship-select-wrap--up"
                  :class="{ 'is-open': openSelectMenu === 'draftStatus' }"
                  @focusout="handleSelectFocusout($event, 'draftStatus')"
                >
                  <button
                    type="button"
                    class="internship-select-trigger"
                    aria-haspopup="listbox"
                    :aria-expanded="openSelectMenu === 'draftStatus'"
                    @click="toggleSelectMenu('draftStatus')"
                    @keydown.escape.stop="closeSelectMenu('draftStatus')"
                  >
                    <span>{{ getStatusLabel(draftStatus) }}</span>
                  </button>
                  <Transition name="internship-select-menu">
                    <span v-if="openSelectMenu === 'draftStatus'" class="internship-select-menu" role="listbox">
                      <button
                        v-for="option in statusOptions"
                        :key="option.value"
                        type="button"
                        class="internship-select-option"
                        :class="{ 'is-selected': draftStatus === option.value }"
                        role="option"
                        :aria-selected="draftStatus === option.value"
                        @mousedown.prevent
                        @click="selectDraftStatus(option.value)"
                      >
                      {{ option.label }}
                      </button>
                    </span>
                  </Transition>
                </span>
              </div>
            </div>

            <label class="internship-form__record">
              <span>记录</span>
              <textarea
                v-model="draftContent"
                rows="10"
                placeholder="记录任务、问题、解决方案、复盘或待办"
              ></textarea>
            </label>
          </form>
        </section>
      </div>
    </Transition>

    <Transition name="internship-window">
      <div
        v-if="deleteTargetRecord"
        class="internship-modal"
        role="presentation"
        @click.self="closeDeleteConfirm"
      >
        <section
          class="internship-dialog internship-confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="internship-delete-title"
        >
          <div class="internship-dialog__head">
            <div>
              <h2 id="internship-delete-title">确认删除</h2>
            </div>
            <button type="button" class="internship-dialog__close" aria-label="关闭" @click="closeDeleteConfirm">
              ×
            </button>
          </div>

          <div class="internship-confirm">
            <p>删除后会先放入回收站，可从回收站恢复。</p>
            <strong>{{ deleteTargetRecord.title }}</strong>
            <div class="internship-confirm__actions">
              <button type="button" class="internship-secondary" @click="closeDeleteConfirm">取消</button>
              <button type="button" class="internship-danger" @click="confirmRemoveRecord">确认删除</button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import { INTERNSHIP_RECORDS_KEY, INTERNSHIP_TRASH_RECORDS_KEY } from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const INTERNSHIP_BACKGROUND_CLASS = 'is-internship-page'

const categoryOptions = [
  { value: 'daily', label: '日报' },
  { value: 'task', label: '任务' },
  { value: 'study', label: '学习' },
  { value: 'review', label: '复盘' }
]

const categoryFilterOptions = [
  { value: 'all', label: '全部' },
  ...categoryOptions
]

const statusOptions = [
  { value: 'progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'follow-up', label: '待跟进' }
]

const statusFilterOptions = [
  { value: 'all', label: '全部' },
  ...statusOptions
]

const draftTitle = ref('')
const draftContent = ref('')
const draftDate = ref(formatInputDate(new Date()))
const draftCategory = ref('daily')
const draftStatus = ref('progress')
const editingId = ref('')
const draftDialogOpen = ref(false)
const deleteTargetRecord = ref(null)
const activeBoardView = ref('records')
const searchQuery = ref('')
const activeStatus = ref('all')
const activeCategory = ref('all')
const openSelectMenu = ref('')
const records = ref(readStoredRecords())
const deletedRecords = ref([])
const recordsLoaded = ref(false)

function syncInternshipBackground(enabled) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle(INTERNSHIP_BACKGROUND_CLASS, enabled)
  document.body.classList.toggle(INTERNSHIP_BACKGROUND_CLASS, enabled)
}

onMounted(() => {
  syncInternshipBackground(true)
})

onBeforeUnmount(() => {
  syncInternshipBackground(false)
})

watch(
  privateAppAvailable,
  (available) => {
    if (available && !recordsLoaded.value) {
      recordsLoaded.value = true
      loadInternshipData()
    }
  },
  { immediate: true }
)

const sortedRecords = computed(() => (
  [...records.value].sort((left, right) => {
    const dateDelta = new Date(right.recordDate).getTime() - new Date(left.recordDate).getTime()
    return dateDelta || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
))

const filteredRecords = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  return sortedRecords.value.filter((record) => {
    if (activeStatus.value !== 'all' && record.status !== activeStatus.value) {
      return false
    }

    if (activeCategory.value !== 'all' && record.category !== activeCategory.value) {
      return false
    }

    if (!keyword) {
      return true
    }

    const searchableText = [
      record.title,
      record.content,
      getCategoryLabel(record.category),
      getStatusLabel(record.status)
    ].join(' ').toLowerCase()

    return searchableText.includes(keyword)
  })
})

const sortedDeletedRecords = computed(() => (
  [...deletedRecords.value].sort((left, right) => (
    new Date(right.deletedAt).getTime() - new Date(left.deletedAt).getTime()
  ))
))

const statCards = computed(() => [
  {
    key: 'total',
    label: '总记录',
    value: records.value.length
  },
  {
    key: 'progress',
    label: '进行中',
    value: records.value.filter((record) => record.status === 'progress').length
  },
  {
    key: 'follow-up',
    label: '待跟进',
    value: records.value.filter((record) => record.status === 'follow-up').length
  },
  {
    key: 'week',
    label: '本周',
    value: records.value.filter((record) => isThisWeek(record.recordDate)).length
  }
])

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1000,
    offset: 24
  })
}

function readStoredRecords() {
  const storedValue = localStorage.getItem(INTERNSHIP_RECORDS_KEY)

  if (!storedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (Array.isArray(parsedValue)) {
      return parsedValue.reduce((validRecords, item) => {
        const normalizedRecord = normalizeRecord(item)

        if (normalizedRecord) {
          validRecords.push(normalizedRecord)
        }

        return validRecords
      }, [])
    }
  } catch {
    localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
  }

  return []
}

function readStoredDeletedRecords() {
  const storedValue = localStorage.getItem(INTERNSHIP_TRASH_RECORDS_KEY)

  if (!storedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (Array.isArray(parsedValue)) {
      return parsedValue.reduce((validRecords, item) => {
        const normalizedRecord = normalizeDeletedRecord(item)

        if (normalizedRecord) {
          validRecords.push(normalizedRecord)
        }

        return validRecords
      }, [])
    }
  } catch {
    localStorage.removeItem(INTERNSHIP_TRASH_RECORDS_KEY)
  }

  return []
}

function normalizeRecord(item) {
  if (
    !item
    || typeof item.id !== 'string'
    || typeof item.title !== 'string'
    || typeof item.content !== 'string'
  ) {
    return null
  }

  const now = new Date().toISOString()
  const updatedAt = normalizeDateValue(item.updatedAt) || now
  const createdAt = normalizeDateValue(item.createdAt) || updatedAt
  const recordDate = normalizeInputDate(item.recordDate) || formatInputDate(updatedAt)
  const category = categoryOptions.some((option) => option.value === item.category) ? item.category : 'daily'
  const status = statusOptions.some((option) => option.value === item.status) ? item.status : 'progress'

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    recordDate,
    category,
    status,
    createdAt,
    updatedAt
  }
}

function normalizeDeletedRecord(item) {
  const normalizedRecord = normalizeRecord(item)

  if (!normalizedRecord) {
    return null
  }

  return {
    ...normalizedRecord,
    deletedAt: normalizeDateValue(item.deletedAt) || new Date().toISOString()
  }
}

function normalizeRecords(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce((validRecords, item) => {
    const normalizedRecord = normalizeRecord(item)

    if (normalizedRecord) {
      validRecords.push(normalizedRecord)
    }

    return validRecords
  }, [])
}

function normalizeDeletedRecords(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce((validRecords, item) => {
    const normalizedRecord = normalizeDeletedRecord(item)

    if (normalizedRecord) {
      validRecords.push(normalizedRecord)
    }

    return validRecords
  }, [])
}

async function loadInternshipData() {
  await loadRecords()
  await loadDeletedRecords()
}

async function loadRecords() {
  const localRecords = readStoredRecords()

  try {
    const data = await http.get('/api/internship/records')
    const databaseRecords = normalizeRecords(data.records)

    if (!databaseRecords.length && localRecords.length) {
      const migratedRecords = []

      for (const record of localRecords) {
        const result = await http.post('/api/internship/records', record)
        const migratedRecord = normalizeRecord(result.record)

        if (migratedRecord) {
          migratedRecords.push(migratedRecord)
        }
      }

      records.value = migratedRecords
      localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
      notify('本地记录已迁移到数据库')
      return
    }

    records.value = databaseRecords
    localStorage.removeItem(INTERNSHIP_RECORDS_KEY)
  } catch (error) {
    notify(error instanceof Error ? error.message : '实习记录加载失败', 'danger')
  }
}

async function migrateDeletedRecordsToDatabase(localDeletedRecords) {
  const migratedRecords = []

  for (const record of localDeletedRecords) {
    try {
      await http.post('/api/internship/records', record)
      const result = await http.delete(`/api/internship/records/${encodeURIComponent(record.id)}`)
      const deletedRecord = normalizeDeletedRecord(result.record)

      if (deletedRecord) {
        migratedRecords.push(deletedRecord)
      }
    } catch {
      // Keep migration best-effort so one legacy item cannot block database loading.
    }
  }

  return migratedRecords
}

async function loadDeletedRecords() {
  const localDeletedRecords = readStoredDeletedRecords()

  try {
    const data = await http.get('/api/internship/records?scope=trash')
    const databaseDeletedRecords = normalizeDeletedRecords(data.records)

    if (!databaseDeletedRecords.length && localDeletedRecords.length) {
      const migratedRecords = await migrateDeletedRecordsToDatabase(localDeletedRecords)

      if (migratedRecords.length) {
        deletedRecords.value = migratedRecords

        if (migratedRecords.length === localDeletedRecords.length) {
          localStorage.removeItem(INTERNSHIP_TRASH_RECORDS_KEY)
        }

        notify('本地回收站已迁移到数据库')
        return
      }
    }

    deletedRecords.value = databaseDeletedRecords

    if (!localDeletedRecords.length || databaseDeletedRecords.length) {
      localStorage.removeItem(INTERNSHIP_TRASH_RECORDS_KEY)
    }
  } catch (error) {
    notify(error instanceof Error ? error.message : '回收站加载失败', 'danger')
  }
}

function resetDraft() {
  draftTitle.value = ''
  draftContent.value = ''
  draftDate.value = formatInputDate(new Date())
  draftCategory.value = 'daily'
  draftStatus.value = 'progress'
  editingId.value = ''
}

function openCreateDialog() {
  closeSelectMenu()
  activeBoardView.value = 'records'
  resetDraft()
  draftDialogOpen.value = true
}

function closeDraftDialog() {
  closeSelectMenu()
  draftDialogOpen.value = false
  resetDraft()
}

async function handleSave() {
  if (!draftTitle.value || !draftContent.value.trim()) {
    notify('标题和记录都需要填写', 'danger')
    return
  }

  const now = new Date().toISOString()
  const nextRecord = {
    id: editingId.value || `${Date.now()}`,
    title: draftTitle.value,
    content: draftContent.value,
    recordDate: normalizeInputDate(draftDate.value) || formatInputDate(new Date()),
    category: draftCategory.value,
    status: draftStatus.value,
    createdAt: now,
    updatedAt: now
  }

  try {
    if (editingId.value) {
      const result = await http.put(`/api/internship/records/${encodeURIComponent(editingId.value)}`, nextRecord)
      const savedRecord = normalizeRecord(result.record)

      if (savedRecord) {
        records.value = records.value.map((record) => (
          record.id === editingId.value ? savedRecord : record
        ))
      }

      notify('更新成功')
      closeDraftDialog()
      return
    }

    const result = await http.post('/api/internship/records', nextRecord)
    const savedRecord = normalizeRecord(result.record)

    if (savedRecord) {
      records.value = [savedRecord, ...records.value]
    }

    notify('保存成功')
    closeDraftDialog()
  } catch (error) {
    notify(error instanceof Error ? error.message : '保存失败', 'danger')
  }
}

function startEditing(record) {
  closeSelectMenu()
  activeBoardView.value = 'records'
  editingId.value = record.id
  draftTitle.value = record.title
  draftContent.value = record.content
  draftDate.value = record.recordDate
  draftCategory.value = record.category
  draftStatus.value = record.status
  draftDialogOpen.value = true
}

function requestRemoveRecord(record) {
  closeSelectMenu()
  deleteTargetRecord.value = record
}

function closeDeleteConfirm() {
  deleteTargetRecord.value = null
}

function toggleTrashView() {
  closeSelectMenu()
  activeBoardView.value = activeBoardView.value === 'trash' ? 'records' : 'trash'
}

function showRecordsView() {
  closeSelectMenu()
  activeBoardView.value = 'records'
}

async function confirmRemoveRecord() {
  const record = deleteTargetRecord.value

  if (!record) {
    return
  }

  try {
    const recordId = record.id
    const result = await http.delete(`/api/internship/records/${encodeURIComponent(recordId)}`)
    const deletedRecord = normalizeDeletedRecord(result.record)

    records.value = records.value.filter((record) => record.id !== recordId)

    if (deletedRecord) {
      deletedRecords.value = [
        deletedRecord,
        ...deletedRecords.value.filter((item) => item.id !== deletedRecord.id)
      ]
    }

    if (editingId.value === recordId) {
      closeDraftDialog()
    }

    closeDeleteConfirm()
    notify('已移入回收站')
  } catch (error) {
    notify(error instanceof Error ? error.message : '删除失败', 'danger')
  }
}

async function restoreDeletedRecord(record) {
  try {
    const result = await http.patch(`/api/internship/records/${encodeURIComponent(record.id)}/restore`)
    const savedRecord = normalizeRecord(result.record)

    if (savedRecord) {
      records.value = [
        savedRecord,
        ...records.value.filter((item) => item.id !== savedRecord.id)
      ]
    }

    deletedRecords.value = deletedRecords.value.filter((item) => item.id !== record.id)
    notify('已恢复')
  } catch (error) {
    notify(error instanceof Error ? error.message : '恢复失败', 'danger')
  }
}

async function removeDeletedRecord(recordId) {
  try {
    await http.delete(`/api/internship/records/${encodeURIComponent(recordId)}?permanent=1`)
    deletedRecords.value = deletedRecords.value.filter((record) => record.id !== recordId)
    notify('已从回收站移除')
  } catch (error) {
    notify(error instanceof Error ? error.message : '移除失败', 'danger')
  }
}

function getCategoryLabel(value) {
  return categoryOptions.find((option) => option.value === value)?.label || '记录'
}

function getCategoryFilterLabel(value) {
  return categoryFilterOptions.find((option) => option.value === value)?.label || '全部'
}

function getStatusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label || '进行中'
}

function getRecordPreview(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ')
}

function toggleSelectMenu(name) {
  openSelectMenu.value = openSelectMenu.value === name ? '' : name
}

function closeSelectMenu(name = '') {
  if (!name || openSelectMenu.value === name) {
    openSelectMenu.value = ''
  }
}

function handleSelectFocusout(event, name) {
  const nextTarget = event.relatedTarget

  if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
    return
  }

  closeSelectMenu(name)
}

function selectActiveCategory(value) {
  activeCategory.value = value
  closeSelectMenu('activeCategory')
}

function selectDraftCategory(value) {
  draftCategory.value = value
  closeSelectMenu('draftCategory')
}

function selectDraftStatus(value) {
  draftStatus.value = value
  closeSelectMenu('draftStatus')
}

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatRecordDate(value) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).format(date)
}

function formatInputDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return formatInputDate(new Date())
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeInputDate(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return value
}

function normalizeDateValue(value) {
  if (typeof value !== 'string') {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return value
}

function isThisWeek(value) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const today = new Date()
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return date >= weekStart && date < weekEnd
}

function handleBackToTools() {
  router.push('/tools')
}
</script>

<style scoped>
.internship-page {
  --internship-ink: #111827;
  --internship-copy: #374151;
  --internship-muted: #6b7280;
  --internship-line: rgba(17, 24, 39, 0.08);
  --internship-line-strong: rgba(17, 24, 39, 0.16);
  --internship-soft: #f6f7f9;
  --internship-soft-strong: #eceff3;
  --internship-accent: #b4232f;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  padding: 14px;
  color: var(--internship-ink);
  background: #f7f8fa;
  overflow: hidden;
}

.internship-logout,
.internship-trash-button,
.internship-add-button,
.internship-dialog__close,
.internship-dialog__save,
.internship-primary,
.internship-secondary,
.internship-danger,
.internship-record__actions button,
.internship-status-tabs button {
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  color: var(--internship-copy);
  background: #ffffff;
  cursor: pointer;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.internship-logout,
.internship-trash-button,
.internship-add-button,
.internship-dialog__close,
.internship-dialog__save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  font-weight: 700;
}

.internship-add-button {
  width: 48px;
  min-width: 48px;
  padding: 0;
  border-color: #111827;
  border-radius: 16px;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.16);
}

.internship-trash-button {
  position: relative;
  width: 44px;
  min-width: 44px;
  padding: 0;
}

.internship-trash-button.is-active {
  border-color: #111827;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 12px 24px rgba(17, 24, 39, 0.14);
}

.internship-trash-button svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.internship-add-button span {
  font-size: 1.7rem;
  line-height: 1;
  transform: translateY(-1px);
}

.internship-dialog__close,
.internship-dialog__save {
  width: 42px;
  min-width: 42px;
  padding: 0;
  font-size: 1.45rem;
  line-height: 1;
}

.internship-dialog__save {
  border-color: #111827;
  color: #ffffff;
  background: #111827;
  box-shadow: 0 12px 24px rgba(17, 24, 39, 0.14);
}

.internship-dialog__save svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.internship-primary,
.internship-secondary,
.internship-danger,
.internship-record__actions button,
.internship-status-tabs button {
  padding: 10px 16px;
  font-weight: 700;
}

.internship-logout:hover,
.internship-trash-button:hover,
.internship-add-button:hover,
.internship-dialog__close:hover,
.internship-dialog__save:hover,
.internship-primary:hover,
.internship-secondary:hover,
.internship-danger:hover,
.internship-record__actions button:hover,
.internship-status-tabs button:hover {
  transform: translateY(-1px);
  border-color: var(--internship-line-strong);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.08);
}

.internship-summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  min-height: 0;
  align-content: start;
  align-self: stretch;
}

.internship-stat {
  display: grid;
  gap: 8px;
  min-width: 0;
  min-height: 92px;
  align-content: center;
  border: 1px solid var(--internship-line);
  border-radius: 18px;
  padding: 18px;
  background: #ffffff;
  box-shadow:
    0 18px 40px rgba(17, 24, 39, 0.06),
    0 3px 10px rgba(17, 24, 39, 0.03);
}

.internship-stat span {
  color: var(--internship-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

.internship-stat strong {
  color: var(--internship-ink);
  font-size: 2.25rem;
  line-height: 1;
}

.internship-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 178px);
  gap: 14px;
  width: 100%;
  height: 100%;
  min-height: 0;
  align-items: stretch;
}

.internship-board,
.internship-record,
.internship-dialog {
  border: 1px solid var(--internship-line);
  border-radius: 18px;
  background: #ffffff;
  box-shadow:
    0 18px 40px rgba(17, 24, 39, 0.07),
    0 3px 10px rgba(17, 24, 39, 0.04);
}

.internship-form,
.internship-form__left,
.internship-form__record,
.internship-field,
.internship-records {
  display: grid;
  gap: 16px;
}

.internship-form {
  --internship-dialog-body-height: clamp(420px, 52vh, 560px);
  grid-template-columns: minmax(260px, 0.86fr) minmax(0, 1.14fr);
  align-items: stretch;
  min-height: var(--internship-dialog-body-height);
}

.internship-form__left {
  grid-auto-rows: auto;
  align-content: start;
  gap: 18px;
  min-height: var(--internship-dialog-body-height);
}

.internship-form__record {
  grid-template-rows: auto minmax(0, 1fr);
  min-height: var(--internship-dialog-body-height);
}

.internship-field {
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.internship-form__left .internship-field {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-content: start;
  align-items: stretch;
  gap: 10px;
}

.internship-field--textarea {
  align-items: start;
}

.internship-records {
  min-height: 0;
  align-content: start;
  gap: 10px;
  padding-right: 4px;
  overflow: auto;
}

.internship-records::-webkit-scrollbar,
.internship-dialog::-webkit-scrollbar {
  width: 8px;
}

.internship-records::-webkit-scrollbar-thumb,
.internship-dialog::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.18);
}

.internship-records::-webkit-scrollbar-track,
.internship-dialog::-webkit-scrollbar-track {
  background: transparent;
}

.internship-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.internship-field > span:first-child,
.internship-form__record > span:first-child,
.internship-search > span:first-child,
.internship-filter > span:first-child {
  color: var(--internship-copy);
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
}

.internship-field input,
.internship-field textarea,
.internship-field select,
.internship-form__record textarea,
.internship-search input,
.internship-filter select,
.internship-select-trigger {
  width: 100%;
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--internship-ink);
  background: var(--internship-soft);
  outline: none;
}

.internship-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.internship-select-trigger::after {
  content: '';
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-left: 12px;
  border-right: 2px solid var(--internship-ink);
  border-bottom: 2px solid var(--internship-ink);
  transform: translateY(-2px) rotate(45deg);
  transform-origin: 50% 50%;
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms ease;
}

.internship-select-wrap.is-open .internship-select-trigger {
  border-color: rgba(17, 24, 39, 0.38);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.internship-select-wrap.is-open .internship-select-trigger::after {
  border-color: #111827;
  transform: translateY(3px) rotate(225deg);
}

.internship-field select,
.internship-filter select {
  display: block;
  min-height: 48px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 46px;
  cursor: pointer;
  line-height: 1.25;
  background-image: none;
}

.internship-field select::-ms-expand,
.internship-filter select::-ms-expand {
  display: none;
}

.internship-select-wrap {
  position: relative;
  display: block;
  width: 100%;
}

.internship-select-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 60;
  display: grid;
  gap: 4px;
  max-height: 240px;
  padding: 6px;
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 18px 42px rgba(17, 24, 39, 0.14),
    0 4px 12px rgba(17, 24, 39, 0.08);
  overflow: auto;
  transform-origin: top center;
}

.internship-select-wrap--up .internship-select-menu {
  top: auto;
  bottom: calc(100% + 8px);
  transform-origin: bottom center;
}

.internship-select-option {
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--internship-copy);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    transform 140ms ease;
}

.internship-select-option:hover,
.internship-select-option:focus-visible {
  color: var(--internship-ink);
  background: var(--internship-soft);
  outline: none;
  transform: translateX(2px);
}

.internship-select-option.is-selected {
  color: #ffffff;
  background: #111827;
}

.internship-select-menu-enter-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.internship-select-menu-leave-active {
  transition:
    opacity 130ms ease,
    transform 150ms cubic-bezier(0.4, 0, 1, 1);
}

.internship-select-menu-enter-from,
.internship-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.internship-select-wrap--up .internship-select-menu-enter-from,
.internship-select-wrap--up .internship-select-menu-leave-to {
  transform: translateY(8px) scale(0.98);
}

.internship-select-menu-enter-to,
.internship-select-menu-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.internship-field textarea,
.internship-form__record textarea {
  min-height: clamp(220px, 34vh, 360px);
  resize: vertical;
}

.internship-form__record textarea {
  min-height: clamp(320px, 44vh, 500px);
  height: 100%;
}

.internship-field--textarea > span:first-child {
  padding-top: 13px;
}

.internship-field input:focus,
.internship-field textarea:focus,
.internship-form__record textarea:focus,
.internship-field select:focus,
.internship-search input:focus,
.internship-filter select:focus,
.internship-select-trigger:focus-visible {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.internship-actions,
.internship-record__actions,
.internship-confirm__actions,
.internship-trash-item__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.internship-primary {
  border-color: #111827;
  color: #ffffff;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.16);
}

.internship-danger {
  border-color: rgba(185, 28, 28, 0.2);
  color: #991b1b;
  background: #fff1f2;
}

.internship-board {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
  padding: 18px;
  overflow: hidden;
}

.internship-board__content {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}

.internship-board__records-view {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.internship-board-switch-enter-active,
.internship-board-switch-leave-active {
  transition:
    opacity 220ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 260ms ease;
  will-change: opacity, transform, filter;
}

.internship-board-switch-enter-from {
  opacity: 0;
  filter: blur(5px);
  transform: translate3d(0, 12px, 0) scale(0.985);
}

.internship-board-switch-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translate3d(0, -8px, 0) scale(0.99);
}

.internship-board-switch-enter-to,
.internship-board-switch-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translate3d(0, 0, 0) scale(1);
}

.internship-board__head,
.internship-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.internship-dialog__head {
  align-items: center;
}

.internship-board__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.internship-dialog__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.internship-board__head h1,
.internship-dialog__head h2 {
  margin: 0;
  color: var(--internship-ink);
  line-height: 1;
}

.internship-board__head h1 {
  font-size: clamp(1.7rem, 3vw, 2.35rem);
}

.internship-dialog__head h2 {
  font-size: 1.55rem;
}

.internship-board__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 14px;
}

.internship-search,
.internship-filter {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.internship-status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.internship-status-tabs button {
  background: var(--internship-soft);
}

.internship-status-tabs button.is-active {
  color: #ffffff;
  border-color: #111827;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
}

.internship-record {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  animation: internship-item-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.internship-record__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.internship-record__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 6px;
}

.internship-record__meta span,
.internship-record__meta time {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 3px 8px;
  color: var(--internship-copy);
  background: var(--internship-soft);
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.internship-record__meta time {
  color: var(--internship-muted);
}

.internship-record__status.is-progress {
  color: #111827;
  background: #e5e7eb;
}

.internship-record__status.is-done {
  color: #14532d;
  background: #dcfce7;
}

.internship-record__status.is-follow-up {
  color: #9f1239;
  background: #ffe4e6;
}

.internship-record h2 {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--internship-ink);
  font-size: 1.08rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.internship-record__body {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.internship-record__content {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--internship-copy);
  font-size: 0.92rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
}

.internship-record__actions {
  flex: 0 0 auto;
  flex-wrap: nowrap;
  gap: 6px;
}

.internship-record__actions button {
  border-radius: 10px;
  padding: 7px 10px;
  font-size: 0.78rem;
}

.internship-modal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(17, 24, 39, 0.42);
  overflow: auto;
}

.internship-dialog {
  width: min(1080px, calc(100vw - 44px));
  max-height: calc(100vh - 44px);
  padding: 24px 26px 26px;
  overflow: visible;
  transform-origin: top right;
  box-shadow:
    0 28px 72px rgba(17, 24, 39, 0.24),
    0 8px 24px rgba(17, 24, 39, 0.12);
}

.internship-dialog .internship-form {
  gap: 22px;
  margin-top: 20px;
}

.internship-confirm-dialog {
  width: min(520px, calc(100vw - 44px));
}

.internship-confirm {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.internship-confirm p {
  margin: 0;
  color: var(--internship-copy);
  line-height: 1.7;
}

.internship-confirm strong {
  display: block;
  min-width: 0;
  border: 1px solid var(--internship-line);
  border-radius: 14px;
  padding: 12px 14px;
  color: var(--internship-ink);
  background: var(--internship-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.internship-trash {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.internship-trash--board {
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  margin-top: 0;
}

.internship-trash__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.internship-trash__head h2,
.internship-trash__head p {
  margin: 0;
}

.internship-trash__head h2 {
  color: var(--internship-ink);
  font-size: 1.35rem;
  line-height: 1.2;
}

.internship-trash__head p {
  margin-top: 6px;
  color: var(--internship-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.internship-trash-list {
  display: grid;
  gap: 10px;
  max-height: min(56vh, 520px);
  padding-right: 4px;
  overflow: auto;
}

.internship-trash--board .internship-trash-list {
  max-height: none;
  min-height: 0;
}

.internship-trash-list::-webkit-scrollbar {
  width: 8px;
}

.internship-trash-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.18);
}

.internship-trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  border: 1px solid var(--internship-line);
  border-radius: 16px;
  padding: 14px;
  background: var(--internship-soft);
  animation: internship-item-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.internship-trash-item__main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.internship-trash-item__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.internship-trash-item h3,
.internship-trash-item p {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.internship-trash-item h3 {
  color: var(--internship-ink);
  font-size: 1rem;
  line-height: 1.3;
}

.internship-trash-item p {
  color: var(--internship-copy);
  font-size: 0.88rem;
  line-height: 1.5;
}

.internship-trash-item .internship-trash-item__content {
  white-space: pre;
}

.internship-trash-item time {
  flex: 0 0 auto;
  color: var(--internship-muted);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.internship-trash-item__actions {
  flex: 0 0 auto;
  gap: 8px;
}

.internship-trash-item__actions button {
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.82rem;
}

@keyframes internship-item-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.internship-window-enter-active,
.internship-window-leave-active {
  transition: opacity 180ms ease;
}

.internship-window-enter-active .internship-dialog {
  transition:
    opacity 220ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.internship-window-leave-active .internship-dialog {
  transition:
    opacity 160ms ease,
    transform 200ms cubic-bezier(0.4, 0, 1, 1);
}

.internship-window-enter-from,
.internship-window-leave-to {
  opacity: 0;
}

.internship-window-enter-from .internship-dialog {
  opacity: 0;
  transform: translate3d(18px, -18px, 0) scale(0.88);
}

.internship-window-leave-to .internship-dialog {
  opacity: 0;
  transform: translate3d(14px, -14px, 0) scale(0.9);
}

.internship-window-enter-to,
.internship-window-leave-from {
  opacity: 1;
}

.internship-window-enter-to .internship-dialog,
.internship-window-leave-from .internship-dialog {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.internship-empty {
  margin: 0;
  border: 1px dashed var(--internship-line-strong);
  border-radius: 18px;
  padding: 44px 20px;
  color: var(--internship-muted);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .internship-board-switch-enter-active,
  .internship-board-switch-leave-active,
  .internship-window-enter-active,
  .internship-window-leave-active,
  .internship-window-enter-active .internship-dialog,
  .internship-window-leave-active .internship-dialog {
    transition-duration: 1ms;
  }

  .internship-record,
  .internship-trash-item {
    animation: none;
  }

  .internship-board-switch-enter-from,
  .internship-board-switch-leave-to,
  .internship-window-enter-from .internship-dialog,
  .internship-window-leave-to .internship-dialog {
    filter: none;
    transform: none;
  }
}

@media (max-width: 980px) {
  .internship-page {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .internship-summary {
    order: -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    align-content: start;
    align-self: start;
  }

  .internship-stat {
    min-height: 76px;
    border-radius: 16px;
    padding: 14px 12px;
  }

  .internship-stat span {
    font-size: 0.82rem;
  }

  .internship-stat strong {
    font-size: 1.9rem;
  }

  .internship-shell {
    grid-template-columns: 1fr;
    height: auto;
    align-content: start;
  }

  .internship-board,
  .internship-records {
    overflow: visible;
  }
}

@media (max-width: 640px) {
  .internship-page {
    padding: 12px;
  }

  .internship-form,
  .internship-form-grid,
  .internship-board__toolbar {
    grid-template-columns: 1fr;
  }

  .internship-summary {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .internship-stat {
    min-height: 62px;
    gap: 4px;
    border-radius: 14px;
    padding: 10px 6px;
    box-shadow:
      0 10px 22px rgba(17, 24, 39, 0.05),
      0 2px 6px rgba(17, 24, 39, 0.03);
  }

  .internship-stat span {
    min-width: 0;
    font-size: clamp(0.62rem, 2.6vw, 0.76rem);
    line-height: 1.15;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .internship-stat strong {
    font-size: clamp(1.05rem, 7vw, 1.5rem);
    text-align: center;
  }

  .internship-status-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .internship-status-tabs button {
    min-width: 0;
    padding: 8px 4px;
    font-size: clamp(0.68rem, 2.8vw, 0.82rem);
    white-space: nowrap;
  }

  .internship-board__head,
  .internship-dialog__head {
    align-items: center;
  }

  .internship-modal {
    padding: 12px;
  }

  .internship-dialog {
    max-height: calc(100vh - 24px);
    min-height: auto;
    width: 100%;
    padding: 18px;
  }

  .internship-form,
  .internship-form__left,
  .internship-form__record {
    min-height: auto;
  }

  .internship-form__left {
    grid-template-rows: auto;
  }

  .internship-form__left .internship-field {
    align-content: start;
  }

  .internship-form__record textarea {
    min-height: 260px;
  }

  .internship-record__head {
    flex-direction: column;
    gap: 10px;
  }

  .internship-record__meta {
    justify-content: flex-start;
  }

  .internship-record__body {
    gap: 8px;
  }

  .internship-confirm__actions,
  .internship-trash-item,
  .internship-trash-item__head,
  .internship-trash-item__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .internship-confirm__actions button,
  .internship-trash-item__actions button {
    width: 100%;
  }
}
</style>
