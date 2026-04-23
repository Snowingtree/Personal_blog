<template>
  <main v-if="privateAppAvailable" class="display-layout">
    <AppHeader
      :username="username"
      tag="展示页"
      title="动漫名称列表"
      @logout="handleLogout"
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
import { AUTH_KEY, AUTH_TOKEN_KEY, LIST_KEY, USERNAME_KEY } from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'
import { parseAnimeContent, serializeAnimeItems, sortItemsByPinyin } from '../../utils/animePinyin'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const username = ref(localStorage.getItem(USERNAME_KEY) || '访客')
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

function handleLogout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  router.push('/login')
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
