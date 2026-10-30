<template>
  <section class="android-page android-home android-xianyu-page">
    <section class="android-xianyu-card">
      <header class="android-xianyu-heading">
        <div class="android-xianyu-heading__title">
          <small>XIANYU</small>
          <h2>咸鱼列表</h2>
        </div>
        <span class="android-xianyu-count">{{ items.length }} 条</span>
      </header>

      <p v-if="loading" class="android-xianyu-status">加载中…</p>
      <p v-else-if="error" class="android-xianyu-status android-xianyu-status--error">{{ error }}</p>
      <p v-else-if="!items.length" class="android-xianyu-status">暂无数据</p>

      <ul v-else class="android-xianyu-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="android-xianyu-item"
        >
          <strong class="android-xianyu-name" :title="item.name">{{ item.name }}</strong>
          <button
            type="button"
            class="android-xianyu-copy"
            :class="{ 'is-copied': copiedId === item.id }"
            @click="copyItem(item)"
          >
            <Check v-if="copiedId === item.id" :size="16" />
            <Copy v-else :size="16" />
            <span>{{ copiedId === item.id ? '已复制' : '复制' }}</span>
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'
import http from '../../utils/http'

const items = ref([])
const loading = ref(false)
const error = ref('')
const copiedId = ref('')
let copiedTimerId = 0

async function loadItems() {
  loading.value = true
  error.value = ''

  try {
    const data = await http.get('/api/xianyu/items')
    items.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    items.value = []
    error.value = err instanceof Error ? err.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

async function copyItem(item) {
  try {
    await copyText(item.url)
    copiedId.value = item.id
    window.clearTimeout(copiedTimerId)
    copiedTimerId = window.setTimeout(() => {
      copiedId.value = ''
    }, 1500)
  } catch {
    copiedId.value = ''
  }
}

onMounted(loadItems)
</script>

<style scoped>
.android-xianyu-page {
  height: calc(100dvh - var(--android-bottom-nav-space));
  min-height: 0;
  overflow: hidden;
}

.android-xianyu-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 17px;
  border: 1px solid var(--android-line);
  border-radius: 19px;
  background: var(--android-surface);
  box-shadow: var(--android-shadow);
}

.android-xianyu-heading {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
}

.android-xianyu-heading__title small {
  color: var(--android-text-faint);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-xianyu-heading__title h2 {
  margin: 2px 0 0;
  color: var(--android-text-strong);
  font-size: 1rem;
}

.android-xianyu-count {
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--android-accent);
  background: var(--android-accent-soft);
  font-size: 0.64rem;
  font-weight: 700;
}

.android-xianyu-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.android-xianyu-status {
  flex: 1;
  margin: 0;
  display: grid;
  place-items: center;
  color: var(--android-text-faint);
  font-size: 0.82rem;
  text-align: center;
}

.android-xianyu-status--error {
  color: #d14c3e;
  padding: 0 12px;
  line-height: 1.5;
}

.android-xianyu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 54px;
  padding: 8px 2px;
  border-top: 1px solid var(--android-line);
}

.android-xianyu-name {
  min-width: 0;
  overflow: hidden;
  color: var(--android-text-strong);
  font-size: 0.86rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.android-xianyu-copy {
  flex: 0 0 auto;
  min-width: 74px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--android-line-strong);
  border-radius: 11px;
  color: var(--android-accent-contrast);
  background: var(--android-accent);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 750;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease;
}

.android-xianyu-copy:active {
  transform: scale(0.97);
}

.android-xianyu-copy.is-copied {
  color: var(--android-text-strong);
  background: var(--android-surface-muted);
}
</style>
