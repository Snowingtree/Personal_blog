<template>
  <main v-if="privateAppAvailable" class="display-layout anime-agent-theme">
    <AppHeader
      tag="展示页"
      title="动漫名称列表"
      :show-user="false"
      logout-label="返回选择"
      @logout="handleBackToTools"
    />

    <div class="content-grid content-grid--single">
      <ListManager
        :items="items"
        :undo-label="undoLabel"
        :can-undo="canUndo"
        @add="handleAddItem"
        @remove="handleRemoveItem"
        @undo="handleUndo"
      >
        <template #source-actions>
          <button type="button" class="secondary-btn" @click="resetFromSource">
            重新读取
          </button>
          <button type="button" class="primary-btn" @click="handleSave">
            保存
          </button>
        </template>
      </ListManager>
    </div>
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import AppHeader from '../../components/AppHeader/AppHeader.vue'
import ListManager from '../../components/ListManager/ListManager.vue'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import { LIST_KEY } from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'
import { parseAnimeContent, serializeAnimeItems, sortItemsByPinyin } from '../../utils/animePinyin'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const lastAction = ref(null)

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1000,
    offset: 24
  })
}

function getStoredItems() {
  const storedValue = localStorage.getItem(LIST_KEY)

  if (!storedValue) {
    return null
  }

  try {
    const parsed = JSON.parse(storedValue)

    if (Array.isArray(parsed)) {
      return sortItemsByPinyin(parsed)
    }
  } catch {
    localStorage.removeItem(LIST_KEY)
  }

  return null
}

const storedItems = getStoredItems()
const items = ref(storedItems ?? [])

const undoLabel = computed(() => {
  if (lastAction.value?.type === 'remove') {
    return '撤销删除'
  }

  return '撤销添加'
})

const canUndo = computed(() => Boolean(lastAction.value))

function saveItems(nextItems) {
  const sortedItems = sortItemsByPinyin(nextItems)
  items.value = sortedItems
  localStorage.setItem(LIST_KEY, JSON.stringify(sortedItems))
}

function rememberAction(type) {
  lastAction.value = {
    type,
    previousItems: [...items.value]
  }
}

async function fetchAnimeContent() {
  const data = await http.get('/api/anime')
  return typeof data.content === 'string' ? data.content : ''
}

async function loadFromSource({ showSuccess = false } = {}) {
  try {
    const content = await fetchAnimeContent()
    saveItems(parseAnimeContent(content))
    lastAction.value = null

    if (showSuccess) {
      notify('读取成功')
    }
  } catch (error) {
    notify(error instanceof Error ? error.message : '读取失败，请确认服务端已经启动。', 'danger')
  }
}

function handleAddItem(value) {
  rememberAction('add')
  saveItems([...items.value, value])
}

function handleRemoveItem(index) {
  rememberAction('remove')
  saveItems(items.value.filter((_, itemIndex) => itemIndex !== index))
}

function handleUndo() {
  if (!lastAction.value) {
    return
  }

  saveItems(lastAction.value.previousItems)
  lastAction.value = null
}

async function resetFromSource() {
  await loadFromSource({ showSuccess: true })
}

async function handleSave() {
  try {
    await http.post('/api/anime', {
      content: serializeAnimeItems(items.value)
    })

    notify('保存成功')
  } catch (error) {
    notify(error instanceof Error ? error.message : '保存失败，请确认服务端已经启动。', 'danger')
  }
}

function handleBackToTools() {
  router.push('/tools')
}

onMounted(async () => {
  if (!privateAppAvailable.value) {
    return
  }

  if (storedItems === null) {
    await loadFromSource()
  }
})
</script>

<style scoped>
.anime-agent-theme {
  --mono-ink: #111827;
  --mono-copy: #374151;
  --mono-muted: #6b7280;
  --mono-line: rgba(17, 24, 39, 0.08);
  --mono-line-strong: rgba(17, 24, 39, 0.14);
  --mono-soft: #f6f7f9;
  --mono-surface: #ffffff;
  position: relative;
  isolation: isolate;
  color: var(--mono-ink);
}

.anime-agent-theme::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #f7f8fa;
}

.anime-agent-theme :deep(.app-header),
.anime-agent-theme :deep(.panel-card) {
  border: 1px solid var(--mono-line);
  background: var(--mono-surface);
  box-shadow:
    0 18px 40px rgba(17, 24, 39, 0.07),
    0 3px 10px rgba(17, 24, 39, 0.04);
  backdrop-filter: none;
}

.anime-agent-theme :deep(.page-tag),
.anime-agent-theme :deep(.section-tag) {
  color: var(--mono-muted);
}

.anime-agent-theme :deep(.app-header h1),
.anime-agent-theme :deep(.panel-head h2),
.anime-agent-theme :deep(.list-text) {
  color: var(--mono-ink);
}

.anime-agent-theme :deep(.welcome-text),
.anime-agent-theme :deep(.search-status),
.anime-agent-theme :deep(.empty-state) {
  color: var(--mono-muted);
}

.anime-agent-theme :deep(.primary-btn),
.anime-agent-theme :deep(.secondary-btn),
.anime-agent-theme :deep(.ghost-btn),
.anime-agent-theme :deep(.danger-btn) {
  border-radius: 14px;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.anime-agent-theme :deep(.primary-btn) {
  color: #ffffff;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.16);
}

.anime-agent-theme :deep(.primary-btn:hover) {
  box-shadow: 0 18px 34px rgba(17, 24, 39, 0.2);
}

.anime-agent-theme :deep(.secondary-btn),
.anime-agent-theme :deep(.ghost-btn),
.anime-agent-theme :deep(.danger-btn) {
  color: var(--mono-copy);
  border: 1px solid var(--mono-line);
  background: var(--mono-soft);
}

.anime-agent-theme :deep(.secondary-btn:hover),
.anime-agent-theme :deep(.ghost-btn:hover),
.anime-agent-theme :deep(.danger-btn:hover) {
  border-color: var(--mono-line-strong);
  background: #eceff3;
}

.anime-agent-theme :deep(.list-input) {
  border-color: var(--mono-line);
  background: var(--mono-soft);
  color: var(--mono-ink);
}

.anime-agent-theme :deep(.list-input:focus) {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.anime-agent-theme :deep(.list-scroll::-webkit-scrollbar-thumb) {
  background: rgba(17, 24, 39, 0.18);
}

.anime-agent-theme :deep(.group-row) {
  border: 1px solid var(--mono-line);
  background: rgba(246, 247, 249, 0.94);
}

.anime-agent-theme :deep(.group-letter),
.anime-agent-theme :deep(.list-index) {
  color: var(--mono-ink);
}

.anime-agent-theme :deep(.list-index) {
  background: #eceff3;
}

.anime-agent-theme :deep(.list-item) {
  border: 1px solid var(--mono-line);
  background: var(--mono-surface);
}
</style>
