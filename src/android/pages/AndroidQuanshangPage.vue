<template>
  <section class="android-page android-home android-quanshang-page">
    <section class="android-quanshang-card">
      <header class="android-quanshang-heading">
        <div class="android-quanshang-heading__title">
          <small>QUANSHANG</small>
          <h2>券商列表</h2>
        </div>
        <span class="android-quanshang-count">{{ items.length }} 张</span>
      </header>

      <p v-if="loading" class="android-quanshang-empty">加载中…</p>
      <p v-else-if="error" class="android-quanshang-empty android-quanshang-empty--error">{{ error }}</p>
      <p v-else-if="!items.length" class="android-quanshang-empty">还没有券，去主页「新增券」添加一张吧。</p>

      <ul v-else class="android-quanshang-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="android-quanshang-swipe"
          :class="{ 'is-open': swipeOpenId === item.id, 'is-sold': item.sold }"
        >
          <div class="android-quanshang-swipe__actions">
            <button
              type="button"
              class="android-quanshang-swipe__sold"
              :disabled="item.sold"
              @click="markSold(item)"
            >
              <Check :size="16" />
              <span>{{ item.sold ? '已售出' : '售出' }}</span>
            </button>
            <button
              type="button"
              class="android-quanshang-swipe__save"
              @click="saveToGallery(item)"
            >
              <Download :size="16" />
              <span>保存</span>
            </button>
          </div>

          <div
            class="android-quanshang-swipe__content"
            :class="{ 'is-dragging': swipeDragId === item.id }"
            :style="swipeStyle(item)"
            @click="onContentClick(item)"
            @touchstart="onTouchStart($event, item)"
            @touchmove="onTouchMove($event)"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
            @mousedown="onMouseDown($event, item)"
          >
            <img class="android-quanshang-item__img" :src="getQuanImage(item)" alt="券图片" />
            <div class="android-quanshang-item__info">
              <strong class="android-quanshang-item__name">{{ item.name || '未命名' }}</strong>
              <span class="android-quanshang-item__price">¥{{ formatMoney(item.price) }}</span>
              <span class="android-quanshang-item__original">原价 ¥{{ formatMoney(item.originalPrice) }}</span>
            </div>
            <span v-if="item.sold" class="android-quanshang-item__sold-badge">已售出</span>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Download } from 'lucide-vue-next'
import http from '../../utils/http'

const IMAGE_PREFIX = 'quanshang-image-'
const ACTION_WIDTH = 160

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e5e7e3"/><text x="100" y="116" font-size="52" text-anchor="middle" fill="#8a8f8b" font-family="sans-serif">券</text></svg>'
)

const items = ref([])
const loading = ref(false)
const error = ref('')
const swipeOpenId = ref('')
const swipeDragId = ref('')
const swipeDragX = ref(0)
let swipeStartX = 0
let swipeStartY = 0
let swipeStartOffset = 0
let swipeAxis = ''
let didDrag = false

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  return number.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function getQuanImage(item) {
  try {
    const stored = localStorage.getItem(IMAGE_PREFIX + item.id)
    if (stored) return stored
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

async function markSold(item) {
  if (item.sold) return

  try {
    await http.patch(`/api/quanshang/items/${item.id}/sold`)
    item.sold = true
    swipeOpenId.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败，请稍后重试'
  }
}

function saveToGallery(item) {
  const image = getQuanImage(item)
  const bridge = globalThis.AndroidBridge

  if (bridge && typeof bridge.saveImageToGallery === 'function') {
    bridge.saveImageToGallery(image)
    swipeOpenId.value = ''
    return
  }

  const link = document.createElement('a')
  link.href = image
  link.download = `quanshang-${item.id}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  swipeOpenId.value = ''
}

function swipeOffset(item) {
  if (swipeDragId.value === item.id) return swipeDragX.value
  return swipeOpenId.value === item.id ? -ACTION_WIDTH : 0
}

function swipeStyle(item) {
  const offset = swipeOffset(item)
  return offset === 0 ? {} : { transform: `translateX(${offset}px)` }
}

function beginSwipe(clientX, clientY, item) {
  swipeStartX = clientX
  swipeStartY = clientY
  swipeStartOffset = swipeOffset(item)
  swipeAxis = ''
  didDrag = false
  swipeDragId.value = item.id
  swipeDragX.value = swipeStartOffset
}

function moveSwipe(clientX, clientY) {
  if (!swipeDragId.value) return

  const deltaX = clientX - swipeStartX
  const deltaY = clientY - swipeStartY

  if (!swipeAxis) {
    if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return
    swipeAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
  }

  if (swipeAxis !== 'horizontal') return

  didDrag = true
  swipeDragX.value = Math.max(-ACTION_WIDTH, Math.min(0, swipeStartOffset + deltaX))
}

function endSwipe() {
  if (!swipeDragId.value) return

  const id = swipeDragId.value
  const offset = swipeDragX.value

  swipeOpenId.value = offset < -ACTION_WIDTH / 2 ? id : ''
  swipeDragId.value = ''
  swipeDragX.value = 0
}

function onContentClick(item) {
  if (didDrag) {
    didDrag = false
    return
  }

  if (swipeOpenId.value === item.id) {
    swipeOpenId.value = ''
  }
}

function onTouchStart(event, item) {
  if (event.touches.length !== 1) return
  const touch = event.touches[0]
  beginSwipe(touch.clientX, touch.clientY, item)
}

function onTouchMove(event) {
  if (!swipeDragId.value) return
  const touch = event.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - swipeStartX
  const deltaY = touch.clientY - swipeStartY

  if (!swipeAxis) {
    if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return
    swipeAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
  }

  if (swipeAxis === 'horizontal' && event.cancelable) {
    event.preventDefault()
  }

  moveSwipe(touch.clientX, touch.clientY)
}

function onTouchEnd() {
  endSwipe()
}

function onMouseDown(event, item) {
  if (event.button !== 0) return
  beginSwipe(event.clientX, event.clientY, item)
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
}

function onWindowMouseMove(event) {
  moveSwipe(event.clientX, event.clientY)
}

function onWindowMouseUp() {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
  endSwipe()
}

onMounted(loadItems)

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
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

.android-quanshang-swipe {
  position: relative;
  overflow: hidden;
  border-top: 1px solid #d7d7d7;
}

.android-quanshang-swipe:last-child {
  border-bottom: 1px solid #d7d7d7;
}

.android-quanshang-swipe__actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
}

.android-quanshang-swipe__sold,
.android-quanshang-swipe__save {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  color: #ffffff;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.android-quanshang-swipe__sold {
  background: #d14c3e;
}

.android-quanshang-swipe__sold:disabled {
  cursor: default;
  opacity: 0.6;
}

.android-quanshang-swipe__save {
  background: #2f6fd6;
}

.android-quanshang-swipe__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 64px;
  padding: 10px 2px;
  background: var(--android-surface);
  transition: transform 180ms ease;
}

.android-quanshang-swipe__content.is-dragging {
  transition: none;
}

.android-quanshang-swipe.is-sold .android-quanshang-swipe__content {
  opacity: 0.7;
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

.android-quanshang-item__price {
  color: #d14c3e;
  font-size: 0.94rem;
  font-weight: 800;
}

.android-quanshang-item__original {
  color: var(--android-text-faint);
  font-size: 0.7rem;
  text-decoration: line-through;
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
</style>
