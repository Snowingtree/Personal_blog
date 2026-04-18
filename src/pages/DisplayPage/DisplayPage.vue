<template>
  <main v-if="privateAppAvailable" class="display-layout">
    <AppHeader
      :username="username"
      tag="展示页"
      title="动漫名称列表"
      description="已按名称首字母的拼音顺序进行 A-Z 排序"
      @logout="handleLogout"
    />

    <div class="content-grid">
      <ListManager
        :items="items"
        :undo-label="undoLabel"
        :can-undo="canUndo"
        @add="handleAddItem"
        @remove="handleRemoveItem"
        @undo="handleUndo"
      />

      <aside class="panel-card info-panel">
        <div class="panel-head">
          <div>
            <p class="section-tag">数据来源</p>
            <h2>服务端数据说明</h2>
          </div>
        </div>

        <p class="info-copy">
          页面会通过 <code>/api/anime</code> 从服务端读取列表。服务端可以连接 MySQL，也可以继续使用项目根目录下的
          <code>anime.txt</code>。
        </p>
        <p class="info-copy">
          列表会先按动漫名称首字母的拼音顺序进行 A-Z 排序，再在每个分组开始位置插入对应的字母标题。
        </p>
        <p class="info-copy">
          当服务端配置 MySQL 时，保存会覆盖数据表中的当前列表；未配置 MySQL 时，会回退到
          <code>anime.txt</code>。
        </p>

        <button type="button" class="primary-btn save-btn" @click="resetFromSource">
          重新读取数据源
        </button>
        <button type="button" class="primary-btn save-btn" @click="handleSave">
          保存到数据源
        </button>
      </aside>
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
