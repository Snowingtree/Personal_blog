<template>
  <main v-if="privateAppAvailable" class="display-layout ai-quiz-history-layout">
    <AppHeader
      :username="username"
      :tag="headerTag"
      :title="headerTitle"
      :description="headerDescription"
      @logout="handleLogout"
    >
      <template #actions>
        <button type="button" class="secondary-btn" @click="handleBackToNotes">返回笔记</button>
      </template>
    </AppHeader>

    <section class="panel-card ai-quiz-history-card">
      <div class="panel-head ai-quiz-history-card__head">
        <div>
          <p class="section-tag">Quiz History</p>
          <h2>{{ pageTitle }}</h2>
        </div>

        <div class="ai-quiz-history-card__actions">
          <button type="button" class="ghost-btn" :disabled="loading" @click="loadHistory">
            刷新
          </button>
          <button type="button" class="ghost-btn" :disabled="loading" @click="toggleManageMode">
            {{ manageButtonLabel }}
          </button>
          <button
            v-if="selectedDateKey"
            type="button"
            class="ghost-btn"
            :disabled="loading"
            @click="clearSelectedDate"
          >
            返回历史记录
          </button>
        </div>
      </div>

      <p v-if="loading" class="ai-quiz-history-card__status">
        {{ loadingLabel }}
      </p>
      <p v-else-if="loadError" class="form-error ai-quiz-history-card__status">
        {{ loadError }}
      </p>
      <p v-else-if="!historyItems.length" class="empty-state ai-quiz-history-card__status">
        {{ emptyStateLabel }}
      </p>

      <div v-else-if="!selectedDateKey" class="ai-quiz-history-scroll-shell">
        <div class="ai-quiz-history-date-list">
          <article
            v-for="item in historyItems"
            :key="item.dateKey"
            :class="['ai-quiz-history-date-item', isTodayDate(item.dateKey) ? 'is-today' : '']"
          >
            <button
              type="button"
              class="ai-quiz-history-date-item__main"
              @click="openDateDetail(item.dateKey)"
            >
              <strong>{{ item.dateKey }}</strong>
            </button>

            <div class="ai-quiz-history-date-item__side">
              <span v-if="!isManaging" class="ai-quiz-history-date-item__badge">
                {{ item.count }} 题
              </span>
              <button
                v-else
                type="button"
                class="danger-btn ai-quiz-history-date-item__delete"
                :disabled="deletingDateKey === item.dateKey"
                @click="deleteHistoryDate(item.dateKey)"
              >
                {{ deletingDateKey === item.dateKey ? '删除中...' : '删除' }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="ai-quiz-history-scroll-shell">
        <div class="ai-quiz-history-list">
          <article
            v-for="(item, index) in historyItems"
            :key="`${item.createdAt || 'na'}-${item.prompt}-${index}`"
            class="ai-quiz-history-item"
          >
            <div class="ai-quiz-history-item__main">
              <strong class="ai-quiz-history-item__index">#{{ historyItems.length - index }}</strong>
              <h3>{{ item.prompt }}</h3>
            </div>

            <div class="ai-quiz-history-item__side">
              <time v-if="!isManaging" class="ai-quiz-history-item__time">
                {{ formatDateTime(item.createdAt) }}
              </time>
              <button
                v-else
                type="button"
                class="danger-btn ai-quiz-history-item__delete"
                :disabled="deletingEntryCreatedAt === item.createdAt"
                @click="deleteHistoryEntry(item)"
              >
                {{ deletingEntryCreatedAt === item.createdAt ? '删除中...' : '删除' }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '../../components/AppHeader/AppHeader.vue'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import {
  AUTH_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_DESKTOP_WORKSPACE_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'

const router = useRouter()
const route = useRoute()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()

const username = ref(localStorage.getItem(NOTE_USERNAME_KEY) || localStorage.getItem(USERNAME_KEY) || '访客')
const loading = ref(false)
const loadError = ref('')
const historyItems = ref([])
const todayDateKey = ref('')
const isManaging = ref(false)
const deletingDateKey = ref('')
const deletingEntryCreatedAt = ref('')

const headerTag = 'AI 工具'
const headerTitle = '历史记录'
const headerDescription = ''

const selectedDateKey = computed(() => String(route.query.date || '').trim())
const pageTitle = computed(() =>
  selectedDateKey.value ? `${selectedDateKey.value} 历史记录` : '按照日期查看历史记录'
)
const loadingLabel = computed(() =>
  selectedDateKey.value ? '正在读取当天历史记录...' : '正在读取日期列表...'
)
const emptyStateLabel = computed(() =>
  selectedDateKey.value ? '这一天还没有历史记录。' : '还没有任何历史记录。'
)
const manageButtonLabel = computed(() => (isManaging.value ? '完成' : '管理'))

function notify(message, type = 'danger') {
  createMessage({
    message,
    type,
    duration: 1600,
    offset: 24
  })
}

function formatDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

function isTodayDate(dateKey) {
  return Boolean(dateKey) && dateKey === todayDateKey.value
}

async function loadHistory() {
  loading.value = true
  loadError.value = ''

  try {
    const data = await http.get('/api/ai/quiz-history', {
      params: selectedDateKey.value
        ? {
            date: selectedDateKey.value
          }
        : undefined
    })

    if (!selectedDateKey.value) {
      todayDateKey.value = String(data.todayDateKey || '').trim()
    }

    historyItems.value = Array.isArray(data.items) ? data.items : []
  } catch (error) {
    historyItems.value = []
    loadError.value = error instanceof Error ? error.message : '读取历史记录失败。'
    notify(loadError.value)
  } finally {
    loading.value = false
  }
}

function toggleManageMode() {
  isManaging.value = !isManaging.value
}

function openDateDetail(dateKey) {
  if (isManaging.value) {
    return
  }

  router.push({
    name: 'ai-quiz-history',
    query: {
      date: dateKey
    }
  })
}

function clearSelectedDate() {
  router.replace({ name: 'ai-quiz-history' })
}

async function deleteHistoryDate(dateKey) {
  deletingDateKey.value = dateKey

  try {
    await http.delete('/api/ai/quiz-history', {
      params: {
        date: dateKey
      }
    })

    historyItems.value = historyItems.value.filter((item) => item.dateKey !== dateKey)
    notify('历史记录已删除。', 'success')
  } catch (error) {
    notify(error instanceof Error ? error.message : '删除历史记录失败。')
  } finally {
    deletingDateKey.value = ''
  }
}

async function deleteHistoryEntry(item) {
  const createdAt = String(item?.createdAt || '').trim()

  if (!selectedDateKey.value || !createdAt) {
    notify('当前记录缺少删除标识。')
    return
  }

  deletingEntryCreatedAt.value = createdAt

  try {
    await http.delete('/api/ai/quiz-history', {
      params: {
        date: selectedDateKey.value,
        createdAt
      }
    })

    historyItems.value = historyItems.value.filter((entry) => entry.createdAt !== createdAt)
    notify('历史记录已删除。', 'success')
  } catch (error) {
    notify(error instanceof Error ? error.message : '删除历史记录失败。')
  } finally {
    deletingEntryCreatedAt.value = ''
  }
}

function handleBackToNotes() {
  router.push('/notes')
}

function handleLogout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(NOTE_AUTH_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(NOTE_USERNAME_KEY)
  localStorage.removeItem(NOTE_DESKTOP_WORKSPACE_KEY)
  router.push('/notes-login')
}

watch(
  () => route.query.date,
  () => {
    isManaging.value = false
    deletingDateKey.value = ''
    deletingEntryCreatedAt.value = ''
    loadHistory()
  }
)

onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.ai-quiz-history-layout {
  gap: 24px;
}

.ai-quiz-history-card {
  display: grid;
  gap: 18px;
}

.ai-quiz-history-card__head {
  align-items: start;
}

.ai-quiz-history-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ai-quiz-history-card__status {
  margin: 0;
  color: #5d768d;
  line-height: 1.7;
}

.ai-quiz-history-scroll-shell {
  max-height: min(62vh, 720px);
  overflow: auto;
  padding-right: 4px;
}

.ai-quiz-history-date-list,
.ai-quiz-history-list {
  display: grid;
  gap: 14px;
}

.ai-quiz-history-date-item,
.ai-quiz-history-item {
  width: 100%;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 26px rgba(18, 52, 78, 0.05);
}

.ai-quiz-history-date-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  align-items: center;
  gap: 12px;
  min-height: 72px;
}

.ai-quiz-history-date-item.is-today {
  border-color: rgba(28, 175, 145, 0.24);
  background: linear-gradient(135deg, rgba(236, 250, 247, 0.98), rgba(255, 255, 255, 0.96));
}

.ai-quiz-history-date-item__main {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ai-quiz-history-date-item__main:hover strong {
  color: #176f63;
}

.ai-quiz-history-date-item strong {
  color: #12344e;
  font-size: 1.02rem;
  line-height: 1.4;
  transition: color 160ms ease;
}

.ai-quiz-history-date-item__side {
  width: 88px;
  min-width: 88px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.ai-quiz-history-date-item__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 40px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(28, 175, 145, 0.12);
  color: #176f63;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
}

.ai-quiz-history-date-item__delete {
  width: 88px;
  min-width: 88px;
  height: 40px;
  min-height: 40px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
}

.ai-quiz-history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  align-items: center;
  gap: 12px;
}

.ai-quiz-history-item__main {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.ai-quiz-history-item__index {
  color: #176f63;
  font-size: 0.92rem;
  line-height: 1.2;
}

.ai-quiz-history-item__side {
  width: 88px;
  min-width: 88px;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  align-self: stretch;
}

.ai-quiz-history-item__time {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: #6d8294;
  font-size: 0.88rem;
  line-height: 1;
  white-space: nowrap;
}

.ai-quiz-history-item__delete {
  width: 88px;
  min-width: 88px;
  height: 40px;
  min-height: 40px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
}

.ai-quiz-history-item h3 {
  margin: 0;
  color: #12344e;
  line-height: 1.55;
  font-size: 1.06rem;
}

@media (max-width: 720px) {
  .ai-quiz-history-card__head {
    gap: 14px;
  }

  .ai-quiz-history-card__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .ai-quiz-history-date-item,
  .ai-quiz-history-item {
    padding: 16px;
  }

  .ai-quiz-history-date-item,
  .ai-quiz-history-item {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .ai-quiz-history-date-item__main {
    width: 100%;
  }

  .ai-quiz-history-date-item__side,
  .ai-quiz-history-item__side,
  .ai-quiz-history-date-item__delete,
  .ai-quiz-history-item__delete {
    width: 100%;
    min-width: 0;
    min-height: 0;
    justify-content: flex-start;
  }

  .ai-quiz-history-item__time {
    width: auto;
    justify-content: flex-start;
  }
}
</style>
