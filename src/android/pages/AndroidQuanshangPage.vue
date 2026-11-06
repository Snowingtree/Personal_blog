<template>
  <section class="android-page android-home android-quanshang-page">
    <section class="android-quanshang-card">
      <header class="android-quanshang-heading">
        <div class="android-quanshang-heading__title">
          <small>QUANSHANG</small>
          <h2>券商列表</h2>
        </div>
        <span class="android-quanshang-count">{{ unsoldCount }} / {{ items.length }}</span>
      </header>

      <p v-if="loading" class="android-quanshang-empty">加载中…</p>
      <p v-else-if="error" class="android-quanshang-empty android-quanshang-empty--error">{{ error }}</p>
      <p v-else-if="!items.length" class="android-quanshang-empty">还没有券，去主页「新增券」添加一张吧。</p>

      <ul v-else class="android-quanshang-list">
        <li
          v-for="item in sortedItems"
          :key="item.id"
          class="android-quanshang-item"
          :class="{ 'is-sold': item.sold }"
          @click="openSheet(item)"
        >
          <img class="android-quanshang-item__img" :src="getQuanImage(item)" alt="券图片" />
          <div class="android-quanshang-item__info">
            <strong class="android-quanshang-item__name">{{ item.name || '未命名' }}</strong>
            <span class="android-quanshang-item__date">{{ formatDate(item.createdAt) }}</span>
          </div>
          <span v-if="item.sold" class="android-quanshang-item__sold-badge">已完成</span>
        </li>
      </ul>
    </section>

    <Teleport to="body">
      <Transition name="android-modal">
        <div
          v-if="sheetVisible"
          class="android-quanshang-modal"
          @click.self="closeSheet"
        >
          <section
            class="android-quanshang-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-label="券操作"
          >
            <img
              class="android-quanshang-modal__img"
              :src="getQuanImage(activeItem)"
              alt="券图片"
            />

            <div class="android-quanshang-modal__info">
              <strong>{{ activeItem?.name || '未命名' }}</strong>
              <span>
                售价 ¥{{ formatMoney(activeItem?.price) }} · 原价 ¥{{ formatMoney(activeItem?.originalPrice) }}
              </span>
            </div>

            <div class="android-quanshang-modal__actions">
              <button
                v-if="activeItem?.sold"
                type="button"
                class="android-quanshang-modal__action android-quanshang-modal__action--restore"
                @click="restoreItem(activeItem)"
              >
                <span>恢复</span>
              </button>

              <template v-else>
                <button
                  type="button"
                  class="android-quanshang-modal__action android-quanshang-modal__action--complete"
                  @click="markCompleted(activeItem)"
                >
                  <Check :size="18" />
                  <span>完成</span>
                </button>
                <button
                  type="button"
                  class="android-quanshang-modal__action android-quanshang-modal__action--save"
                  @click="saveToGallery(activeItem)"
                >
                  <Download :size="18" />
                  <span>保存</span>
                </button>
                <button
                  type="button"
                  class="android-quanshang-modal__action android-quanshang-modal__action--delete"
                  @click="removeItem(activeItem)"
                >
                  <Trash2 :size="18" />
                  <span>删除</span>
                </button>
              </template>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, Download, Trash2 } from 'lucide-vue-next'
import { createMessage } from 'snowingress-my-components'
import http from '../../utils/http'

const IMAGE_PREFIX = 'quanshang-image-'

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e5e7e3"/><text x="100" y="116" font-size="52" text-anchor="middle" fill="#8a8f8b" font-family="sans-serif">券</text></svg>'
)

const items = ref([])
const loading = ref(false)
const error = ref('')
const sheetVisible = ref(false)
const activeItem = ref(null)

const sortedItems = computed(() =>
  [...items.value].sort((a, b) => Number(Boolean(a.sold)) - Number(Boolean(b.sold)))
)

const unsoldCount = computed(() => items.value.filter((item) => !item.sold).length)

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatDate(value) {
  const str = String(value || '')
  const datePart = str.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : ''
}

const QUANSHANG_IMAGE_BASE_URL = 'http://appassets.local/quanshang-images/'

function getQuanImage(item) {
  if (!item) return FALLBACK_IMAGE

  try {
    const stored = localStorage.getItem(IMAGE_PREFIX + item.id)
    if (!stored) return FALLBACK_IMAGE
    if (stored.startsWith('data:')) return stored
    return QUANSHANG_IMAGE_BASE_URL + stored
  } catch {}
  return FALLBACK_IMAGE
}

async function loadItems() {
  loading.value = true
  error.value = ''

  try {
    const data = await http.get('/api/quanshang/items')
    items.value = Array.isArray(data.items) ? data.items : []
  } catch (err) {
    items.value = []
    error.value = err instanceof Error ? err.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function markCompleted(item) {
  if (!item || item.sold) return

  try {
    await http.patch(`/api/quanshang/items/${item.id}/sold`)
    item.sold = true
    closeSheet()
    createMessage({ message: '已完成', type: 'success', duration: 1400, offset: 24 })
  } catch (err) {
    createMessage({
      message: err instanceof Error ? err.message : '操作失败，请稍后重试',
      type: 'error',
      duration: 1800,
      offset: 24
    })
  }
}

async function restoreItem(item) {
  if (!item || !item.sold) return

  try {
    await http.patch(`/api/quanshang/items/${item.id}/sold`, { sold: false })
    item.sold = false
    closeSheet()
    createMessage({ message: '已恢复', type: 'success', duration: 1400, offset: 24 })
  } catch (err) {
    createMessage({
      message: err instanceof Error ? err.message : '操作失败，请稍后重试',
      type: 'error',
      duration: 1800,
      offset: 24
    })
  }
}

async function removeItem(item) {
  if (!item) return

  try {
    await http.delete(`/api/quanshang/items/${item.id}`)
    items.value = items.value.filter((it) => it.id !== item.id)
    closeSheet()
    createMessage({ message: '已删除', type: 'success', duration: 1400, offset: 24 })
  } catch (err) {
    createMessage({
      message: err instanceof Error ? err.message : '删除失败，请稍后重试',
      type: 'error',
      duration: 1800,
      offset: 24
    })
  }
}

async function saveToGallery(item) {
  if (!item) return

  let image = getQuanImage(item)
  const bridge = globalThis.AndroidBridge

  // 文件系统图片（非 base64）→ 先 fetch 转 base64，再交给原生层
  if (!image.startsWith('data:') && bridge) {
    try {
      const response = await fetch(image)
      const blob = await response.blob()
      image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(blob)
      })
    } catch {
      createMessage({ message: '保存失败，请重试', type: 'error', duration: 1800, offset: 24 })
      return
    }
  }

  if (bridge && typeof bridge.saveImageToGallery === 'function') {
    const ok = bridge.saveImageToGallery(image)
    if (ok) {
      createMessage({ message: '已保存到相册', type: 'success', duration: 1400, offset: 24 })
    } else {
      createMessage({ message: '保存失败，请重试', type: 'error', duration: 1800, offset: 24 })
    }
    return
  }

  const link = document.createElement('a')
  link.href = image
  link.download = `quanshang-${item.id}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  createMessage({ message: '已保存到相册', type: 'success', duration: 1400, offset: 24 })
}

function openSheet(item) {
  if (!item) return
  activeItem.value = item
  sheetVisible.value = true
}

function closeSheet() {
  sheetVisible.value = false
  activeItem.value = null
}

onMounted(loadItems)
</script>

<style scoped>
.android-quanshang-page {
  height: calc(100dvh - var(--android-bottom-nav-space));
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.android-quanshang-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 17px;
  border: 1px solid var(--android-line);
  border-right: none;
  border-radius: 19px;
  background: var(--android-surface);
  box-shadow: var(--android-shadow);
}

.android-quanshang-heading {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
}

.android-quanshang-heading__title small {
  color: var(--android-text-faint);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-quanshang-heading__title h2 {
  margin: 2px 0 0;
  color: var(--android-text-strong);
  font-size: 1rem;
}

.android-quanshang-count {
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--android-accent);
  background: var(--android-accent-soft);
  font-size: 0.64rem;
  font-weight: 700;
}

.android-quanshang-empty {
  flex: 1;
  margin: 0;
  display: grid;
  place-items: center;
  color: var(--android-text-faint);
  font-size: 0.82rem;
  text-align: center;
}

.android-quanshang-empty--error {
  color: #d14c3e;
  padding: 0 12px;
  line-height: 1.5;
}

.android-quanshang-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.android-quanshang-item {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 10px 2px;
  border-top: 1px solid #d7d7d7;
  cursor: pointer;
}

.android-quanshang-item:last-child {
  border-bottom: 1px solid #d7d7d7;
}

.android-quanshang-item.is-sold {
  opacity: 0.7;
  cursor: not-allowed;
}

.android-quanshang-item__img {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--android-surface-muted);
}

.android-quanshang-item__info {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;
}

.android-quanshang-item__name {
  overflow: hidden;
  color: var(--android-text-strong);
  font-size: 0.86rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.android-quanshang-item__date {
  color: var(--android-text-faint);
  font-size: 0.7rem;
}

.android-quanshang-item__sold-badge {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  color: #ffffff;
  background: #d14c3e;
  font-size: 0.62rem;
  font-weight: 700;
}

.android-quanshang-modal {
  position: fixed;
  inset: 0;
  z-index: 22000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(17, 24, 39, 0.4);
  backdrop-filter: blur(3px);
}

.android-quanshang-modal__panel {
  width: min(340px, 100%);
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 16px;
  background: var(--android-surface);
  box-shadow: 0 18px 50px rgba(17, 24, 39, 0.2);
}

.android-quanshang-modal__img {
  width: 100%;
  height: 180px;
  object-fit: contain;
  border-radius: 12px;
  background: var(--android-surface-muted);
}

.android-quanshang-modal__info {
  display: grid;
  gap: 4px;
  text-align: center;
}

.android-quanshang-modal__info strong {
  color: var(--android-text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.android-quanshang-modal__info span {
  color: var(--android-text-faint);
  font-size: 0.76rem;
}

.android-quanshang-modal__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.android-quanshang-modal__action {
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.android-quanshang-modal__action--complete {
  background: #8a8f8b;
}

.android-quanshang-modal__action--complete:disabled {
  cursor: default;
  opacity: 0.6;
}

.android-quanshang-modal__action--save {
  background: #2f6fd6;
}

.android-quanshang-modal__action--delete {
  background: #d14c3e;
}

.android-quanshang-modal__action--restore {
  grid-column: 1 / -1;
  background: #1d9e75;
}

.android-modal-enter-active,
.android-modal-leave-active {
  transition: opacity 160ms ease;
}

.android-modal-enter-active .android-quanshang-modal__panel,
.android-modal-leave-active .android-quanshang-modal__panel {
  transition: transform 160ms ease;
}

.android-modal-enter-from,
.android-modal-leave-to {
  opacity: 0;
}

.android-modal-enter-from .android-quanshang-modal__panel,
.android-modal-leave-to .android-quanshang-modal__panel {
  transform: scale(0.94);
}
</style>
