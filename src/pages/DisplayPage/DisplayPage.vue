<template>
  <main v-if="privateAppAvailable" class="display-layout anime-agent-theme">
    <AppHeader
      tag=""
      title="动漫名称列表"
      :show-user="false"
      logout-label="返回"
      @logout="handleBackToTools"
    >
      <template #actions>
        <button type="button" class="secondary-btn" @click="resetFromSource">
          更新
        </button>
        <button type="button" class="primary-btn" @click="handleSave">
          保存
        </button>
      </template>
    </AppHeader>

    <div class="content-grid content-grid--single">
      <ListManager
        :items="items"
        :undo-label="undoLabel"
        :can-undo="canUndo"
        @add="handleAddItem"
        @remove="handleRemoveItem"
        @undo="handleUndo"
      />
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
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'
import { parseAnimeContent, serializeAnimeItems, sortItemsByPinyin } from '../../utils/animePinyin'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const lastAction = ref(null)
const LEGACY_ANIME_LIST_KEY = 'vibe-coding-anime-list'

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1000,
    offset: 24
  })
}

const items = ref([])

const undoLabel = '撤销'

const canUndo = computed(() => Boolean(lastAction.value))

function saveItems(nextItems) {
  items.value = sortItemsByPinyin(nextItems)
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
  localStorage.removeItem(LEGACY_ANIME_LIST_KEY)

  if (!privateAppAvailable.value) {
    return
  }

  await loadFromSource()
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

@media (max-width: 780px) {
  .anime-agent-theme {
    width: min(100% - 16px, 1120px);
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .anime-agent-theme :deep(.app-header) {
    gap: 12px;
    margin-bottom: 12px;
    padding: 14px;
    border-radius: 18px;
  }

  .anime-agent-theme :deep(.app-header h1) {
    font-size: clamp(1.35rem, 7vw, 1.9rem);
  }

  .anime-agent-theme :deep(.header-actions) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    gap: 8px;
  }

  .anime-agent-theme :deep(.header-actions .primary-btn),
  .anime-agent-theme :deep(.header-actions .secondary-btn),
  .anime-agent-theme :deep(.header-actions .ghost-btn) {
    width: 100%;
    min-width: 0;
    padding: 10px 8px;
    white-space: nowrap;
  }

  .anime-agent-theme :deep(.panel-card) {
    padding: 14px;
    border-radius: 18px;
  }

  .anime-agent-theme :deep(.panel-head) {
    margin-bottom: 10px;
  }

  .anime-agent-theme :deep(.panel-head h2) {
    font-size: 1.1rem;
  }

  .anime-agent-theme :deep(.action-form) {
    grid-template-columns: minmax(0, 1fr) minmax(44px, auto) minmax(44px, auto) minmax(44px, auto);
    gap: 6px;
    align-items: center;
  }

  .anime-agent-theme :deep(.action-form .list-input) {
    min-width: 0;
    padding: 10px;
    font-size: 0.9rem;
  }

  .anime-agent-theme :deep(.action-form .primary-btn),
  .anime-agent-theme :deep(.action-form .secondary-btn),
  .anime-agent-theme :deep(.action-form .ghost-btn) {
    width: auto;
    min-width: 0;
    padding: 10px 8px;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .anime-agent-theme :deep(.search-status) {
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .anime-agent-theme :deep(.list-scroll) {
    max-height: calc(100dvh - 260px);
    padding-right: 2px;
  }

  .anime-agent-theme :deep(.list-wrap) {
    gap: 8px;
  }

  .anime-agent-theme :deep(.group-row) {
    min-height: 38px;
    border-radius: 12px;
    padding: 0 12px;
  }

  .anime-agent-theme :deep(.list-item) {
    grid-template-columns: 30px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border-radius: 14px;
  }

  .anime-agent-theme :deep(.list-index) {
    width: 30px;
    height: 30px;
    font-size: 0.82rem;
  }

  .anime-agent-theme :deep(.list-text) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: normal;
  }

  .anime-agent-theme :deep(.list-item .danger-btn) {
    width: auto;
    min-width: 0;
    justify-self: end;
    padding: 8px 10px;
    font-size: 0.86rem;
    white-space: nowrap;
  }
}

@media (max-width: 380px) {
  .anime-agent-theme :deep(.action-form) {
    grid-template-columns: minmax(0, 1fr) repeat(3, 38px);
    gap: 5px;
  }

  .anime-agent-theme :deep(.action-form .primary-btn),
  .anime-agent-theme :deep(.action-form .secondary-btn),
  .anime-agent-theme :deep(.action-form .ghost-btn) {
    padding: 9px 4px;
    font-size: 0.78rem;
  }
}
</style>
