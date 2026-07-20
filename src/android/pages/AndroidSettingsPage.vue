<template>
  <section class="android-page android-settings-page">
    <header class="android-settings-header">
      <span class="android-settings-header__icon"><Settings :size="23" /></span>
      <div>
        <p>APP PREFERENCES</p>
        <h1>设置</h1>
        <span>管理安卓专属界面的显示偏好。</span>
      </div>
    </header>

    <section class="android-settings-card">
      <div class="android-settings-card__heading">
        <SlidersHorizontal :size="18" />
        <div>
          <small>INTERFACE</small>
          <h2>界面设置</h2>
        </div>
      </div>

      <div class="android-settings-row">
        <div>
          <strong>灰白主题</strong>
          <span>安卓端固定使用简洁的灰白配色。</span>
        </div>
        <span class="android-settings-value">已启用</span>
      </div>

      <div class="android-settings-row">
        <div>
          <strong>紧凑侧栏</strong>
          <span>点击左上角头像展开或收起导航。</span>
        </div>
        <span class="android-settings-value">紧凑</span>
      </div>

      <label class="android-settings-row android-settings-row--switch">
        <div>
          <strong>减少页面动效</strong>
          <span>降低切换与抽屉动画，操作更加直接。</span>
        </div>
        <input v-model="reducedMotion" type="checkbox" @change="saveMotionPreference" />
        <span class="android-settings-switch" aria-hidden="true"><i /></span>
      </label>
    </section>

    <section class="android-settings-card">
      <div class="android-settings-card__heading">
        <Database :size="18" />
        <div>
          <small>LOCAL DATA</small>
          <h2>本机数据</h2>
        </div>
      </div>

      <div class="android-settings-row android-settings-row--action">
        <div>
          <strong>更新笔记</strong>
          <span>{{ formatSyncTime(notesLastSyncedAt) }}</span>
        </div>
        <button
          type="button"
          class="android-settings-action"
          :disabled="notesSyncing"
          @click="updateNotes"
        >
          <RefreshCw :size="14" :class="{ 'is-spinning': notesSyncing }" />
          {{ notesSyncing ? '更新中' : '更新' }}
        </button>
      </div>

    </section>

    <section class="android-settings-card">
      <div class="android-settings-card__heading">
        <Info :size="18" />
        <div>
          <small>ABOUT</small>
          <h2>应用信息</h2>
        </div>
      </div>

      <div class="android-settings-row">
        <div>
          <strong>wm的小屋</strong>
          <span>Android 专属个人空间</span>
        </div>
        <span class="android-settings-value">v{{ appVersion }}</span>
      </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { Database, Info, RefreshCw, Settings, SlidersHorizontal } from 'lucide-vue-next'
import {
  NOTE_META_CACHE_BUCKET,
  syncAndroidNotesCache
} from '../dataSync'
import { getAndroidCache } from '../offlineCache'

const appVersion = '1.0.12'
const reducedMotion = ref(localStorage.getItem('android-reduced-motion') === 'true')
const notesSyncing = ref(false)
const notesLastSyncedAt = ref('')

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1400,
    offset: 24
  })
}

function formatSyncTime(value) {
  const timestamp = new Date(value || '').getTime()

  if (!Number.isFinite(timestamp)) {
    return '尚未下载到本机'
  }

  return `上次更新：${new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)}`
}

async function loadSyncTimes() {
  try {
    const notesState = await getAndroidCache(NOTE_META_CACHE_BUCKET, 'last-sync')
    notesLastSyncedAt.value = notesState?.syncedAt || ''
  } catch {}
}

async function updateNotes() {
  if (notesSyncing.value) return
  notesSyncing.value = true

  try {
    const result = await syncAndroidNotesCache()
    notesLastSyncedAt.value = result.syncedAt
    notify(`笔记更新完成，共 ${result.fileCount} 篇`)
  } catch (error) {
    notify(error instanceof Error ? error.message : '笔记更新失败', 'danger')
  } finally {
    notesSyncing.value = false
  }
}

onMounted(loadSyncTimes)

function saveMotionPreference() {
  localStorage.setItem('android-reduced-motion', String(reducedMotion.value))
  window.dispatchEvent(
    new CustomEvent('android-motion-setting-change', {
      detail: { enabled: reducedMotion.value }
    })
  )
}
</script>

<style scoped>
.android-settings-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.android-settings-header {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 8px 3px 6px;
}

.android-settings-header__icon {
  flex: 0 0 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #303532;
  background: #e5e7e3;
}

.android-settings-header p {
  margin: 0 0 6px;
  color: #6f746f;
  font-size: 0.64rem;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.android-settings-header h1 {
  margin: 0;
  color: #252a27;
  font-size: clamp(1.65rem, 5.5vw, 2.8rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.android-settings-header > div > span {
  display: block;
  margin-top: 7px;
  color: #747a75;
  font-size: 0.78rem;
  line-height: 1.55;
}

.android-settings-card {
  padding: 17px;
  border: 1px solid #dedfdb;
  border-radius: 19px;
  background: #fdfdfc;
  box-shadow: 0 10px 28px rgba(31, 35, 32, 0.055);
}

.android-settings-card__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 13px;
  color: #484e49;
}

.android-settings-card__heading small {
  color: #909590;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-settings-card__heading h2 {
  margin: 2px 0 0;
  color: #303532;
  font-size: 1rem;
}

.android-settings-row {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid #e9eae7;
}

.android-settings-row > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.android-settings-row strong {
  color: #363b38;
  font-size: 0.84rem;
}

.android-settings-row > div > span {
  color: #7b817c;
  font-size: 0.7rem;
  line-height: 1.45;
}

.android-settings-value {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  color: #626862;
  background: #eceeeb;
  font-size: 0.64rem;
  font-weight: 700;
}

.android-settings-row--action > div {
  padding-right: 4px;
}

.android-settings-action {
  flex: 0 0 auto;
  min-width: 78px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #d8dad6;
  border-radius: 11px;
  color: #f7f8f6;
  background: #343a36;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 750;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease, background-color 160ms ease;
}

.android-settings-action:active:not(:disabled) {
  transform: scale(0.97);
}

.android-settings-action:disabled {
  cursor: wait;
  opacity: 0.62;
}

.android-settings-action .is-spinning {
  animation: android-settings-spin 800ms linear infinite;
}

@keyframes android-settings-spin {
  to {
    transform: rotate(360deg);
  }
}

.android-settings-row--switch {
  position: relative;
  cursor: pointer;
}

.android-settings-row--switch input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.android-settings-switch {
  position: relative;
  flex: 0 0 42px;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: #d8dbd6;
  transition: background-color 160ms ease;
}

.android-settings-switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 7px rgba(31, 35, 32, 0.18);
  transition: transform 180ms ease;
}

.android-settings-row--switch input:checked + .android-settings-switch {
  background: #3c423e;
}

.android-settings-row--switch input:checked + .android-settings-switch i {
  transform: translateX(18px);
}

@media (max-width: 560px) {
  .android-settings-card {
    padding: 14px;
  }
}
</style>
