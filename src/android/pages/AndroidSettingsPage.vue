<template>
  <section class="android-page android-home android-settings-page">
    <section class="android-profile-hero">
      <div class="android-profile-hero__avatar-wrap">
        <img :src="profileAvatar" alt="Liu An 的头像" class="android-profile-hero__avatar" />
        <span class="android-profile-hero__online" aria-label="持续更新中" />
      </div>

      <div class="android-profile-hero__copy">
        <p class="android-profile-hero__eyebrow">{{ siteHero.eyebrow }}</p>
        <h1>Liu An</h1>

        <ul class="android-profile-hero__tags" aria-label="个人方向">
          <li>前端开发</li>
          <li>AI 实验</li>
          <li>日常记录</li>
        </ul>
      </div>

      <div class="android-profile-hero__edition" aria-hidden="true">
        <span>ANDROID</span>
        <strong>01</strong>
      </div>
    </section>

    <AndroidCalendarCard />

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

      <label class="android-settings-row android-settings-row--switch">
        <div>
          <strong>代码框主题</strong>
          <span>{{ lightCodeBlocks ? '笔记代码框使用白色背景。' : '笔记代码框使用黑色背景。' }}</span>
        </div>
        <input v-model="lightCodeBlocks" type="checkbox" @change="saveCodeBlockPreference" />
        <span class="android-settings-switch" aria-hidden="true"><i /></span>
      </label>

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
          <span>{{ notesSyncing ? '正在同步 GitHub 并更新本机…' : formatSyncTime(notesLastSyncedAt) }}</span>
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

      <div class="android-settings-row android-settings-row--action">
        <div>
          <strong>笔记根目录</strong>
          <span>{{ noteRootLabel }}</span>
        </div>
        <button
          type="button"
          class="android-settings-action android-settings-action--folder"
          :disabled="!noteFolders.length"
          @click="openFolderPicker"
        >
          <FolderOpen :size="14" />
          打开文件夹
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

    <Teleport to="body">
      <Transition name="android-folder-picker">
        <div
          v-if="folderPickerVisible"
          class="android-folder-picker"
          @click.self="closeFolderPicker"
        >
          <section
            class="android-folder-picker__panel"
            role="dialog"
            aria-modal="true"
            aria-label="选择笔记根目录"
          >
            <header class="android-folder-picker__header">
              <div>
                <small>NOTE ROOT</small>
                <h2>选择笔记根目录</h2>
              </div>
              <button
                type="button"
                class="android-folder-picker__close"
                aria-label="关闭"
                @click="closeFolderPicker"
              >
                <X :size="18" />
              </button>
            </header>

            <TransitionGroup
              name="android-folder-tree"
              tag="div"
              class="android-folder-picker__list"
              role="tree"
            >
              <button
                key="all-notes"
                type="button"
                class="android-folder-picker__item android-folder-picker__item--all"
                :class="{ 'is-selected': !noteRootPath }"
                @click="selectNoteRoot('')"
              >
                <span class="android-folder-picker__folder"><FolderOpen :size="18" /></span>
                <span>
                  <strong>全部笔记</strong>
                  <small>显示仓库中的全部文件夹</small>
                </span>
                <Check v-if="!noteRootPath" :size="17" />
              </button>

              <div
                v-for="folder in visibleNoteFolders"
                :key="folder.path"
                class="android-folder-picker__item android-folder-picker__item--folder"
                :class="{ 'is-selected': noteRootPath === folder.path }"
                :style="{ '--folder-depth': folder.depth }"
                role="treeitem"
                :aria-level="folder.depth + 1"
              >
                <button
                  v-if="folder.hasChildren"
                  type="button"
                  class="android-folder-picker__toggle"
                  :class="{ 'is-open': isNoteFolderOpen(folder.path) }"
                  :aria-expanded="String(isNoteFolderOpen(folder.path))"
                  :aria-label="`${isNoteFolderOpen(folder.path) ? '收起' : '展开'} ${folder.name}`"
                  @click="toggleNoteFolder(folder.path)"
                >
                  <ChevronRight :size="16" />
                </button>
                <span v-else class="android-folder-picker__toggle-placeholder" aria-hidden="true" />

                <button
                  type="button"
                  class="android-folder-picker__select"
                  :aria-current="noteRootPath === folder.path ? 'true' : undefined"
                  @click="selectNoteRoot(folder.path)"
                >
                  <span class="android-folder-picker__folder">
                    <FolderOpen v-if="folder.hasChildren && isNoteFolderOpen(folder.path)" :size="18" />
                    <Folder v-else :size="18" />
                  </span>
                  <span class="android-folder-picker__text">
                    <strong>{{ folder.name }}</strong>
                    <small>{{ folder.path }}</small>
                  </span>
                  <Check v-if="noteRootPath === folder.path" :size="17" />
                </button>
              </div>
            </TransitionGroup>

            <p class="android-folder-picker__hint">
              点左侧箭头展开文件夹。这里只改变显示范围，更新时仍会保存全部笔记和图片。
            </p>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { createMessage } from 'snowingress-my-components'
import {
  Check,
  ChevronRight,
  Database,
  Folder,
  FolderOpen,
  Info,
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-vue-next'
import profileAvatar from '../../assets/images/headerPH.png'
import {
  ANDROID_LIGHT_CODE_BLOCKS_KEY,
  NOTE_ROOT_PATH_KEY
} from '../../constants/storage'
import { siteHero } from '../../data/siteOverview'
import AndroidCalendarCard from '../components/AndroidCalendarCard.vue'
import {
  NOTE_META_CACHE_BUCKET,
  syncAndroidNotesCache
} from '../dataSync'
import { getAndroidCache } from '../offlineCache'

const appVersion = '1.0.12'
const reducedMotion = ref(localStorage.getItem('android-reduced-motion') === 'true')
const lightCodeBlocks = ref(localStorage.getItem(ANDROID_LIGHT_CODE_BLOCKS_KEY) === 'true')
const notesSyncing = ref(false)
const notesLastSyncedAt = ref('')
const noteRootPath = ref(normalizeFolderPath(localStorage.getItem(NOTE_ROOT_PATH_KEY) || ''))
const noteFolders = ref([])
const openNoteFolders = ref(new Set())
const folderPickerVisible = ref(false)
const visibleNoteFolders = computed(() => noteFolders.value.filter((folder) => {
  let parentPath = folder.parentPath

  while (parentPath) {
    if (!openNoteFolders.value.has(parentPath)) {
      return false
    }

    parentPath = getParentFolderPath(parentPath)
  }

  return true
}))
const noteRootLabel = computed(() => {
  if (!noteFolders.value.length) {
    return '请先更新笔记'
  }

  return noteRootPath.value || '全部笔记'
})

function normalizeFolderPath(path) {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

function getParentFolderPath(path) {
  const normalizedPath = normalizeFolderPath(path)
  const separatorIndex = normalizedPath.lastIndexOf('/')
  return separatorIndex < 0 ? '' : normalizedPath.slice(0, separatorIndex)
}

function extractNoteFolders(files) {
  const folders = new Map()

  for (const file of Array.isArray(files) ? files : []) {
    const segments = normalizeFolderPath(file?.path).split('/').filter(Boolean)

    for (let index = 0; index < segments.length - 1; index += 1) {
      const path = segments.slice(0, index + 1).join('/')

      if (!folders.has(path)) {
        folders.set(path, {
          path,
          name: segments[index],
          depth: index,
          parentPath: segments.slice(0, index).join('/')
        })
      }
    }
  }

  const folderList = [...folders.values()]
  const parentPaths = new Set(folderList.map((folder) => folder.parentPath).filter(Boolean))

  return folderList.map((folder) => ({
    ...folder,
    hasChildren: parentPaths.has(folder.path)
  })).sort((left, right) =>
    left.path.localeCompare(right.path, 'zh-CN', {
      numeric: true,
      sensitivity: 'base'
    })
  )
}

function applyCachedTree(cachedTree) {
  noteFolders.value = extractNoteFolders(cachedTree?.files)
  const validPaths = new Set(noteFolders.value.map((folder) => folder.path))
  openNoteFolders.value = new Set(
    [...openNoteFolders.value].filter((folderPath) => validPaths.has(folderPath))
  )

  if (
    noteRootPath.value
    && !noteFolders.value.some((folder) => folder.path === noteRootPath.value)
  ) {
    noteRootPath.value = ''
    localStorage.removeItem(NOTE_ROOT_PATH_KEY)
  }

  revealSelectedNoteRoot()
}

function revealSelectedNoteRoot() {
  if (!noteRootPath.value) {
    return
  }

  const nextOpenFolders = new Set(openNoteFolders.value)
  let currentPath = noteRootPath.value

  while (currentPath) {
    nextOpenFolders.add(currentPath)
    currentPath = getParentFolderPath(currentPath)
  }

  openNoteFolders.value = nextOpenFolders
}

function isNoteFolderOpen(path) {
  return openNoteFolders.value.has(path)
}

function toggleNoteFolder(path) {
  const normalizedPath = normalizeFolderPath(path)
  const nextOpenFolders = new Set(openNoteFolders.value)

  if (nextOpenFolders.has(normalizedPath)) {
    const descendantPrefix = `${normalizedPath}/`

    for (const folderPath of nextOpenFolders) {
      if (folderPath === normalizedPath || folderPath.startsWith(descendantPrefix)) {
        nextOpenFolders.delete(folderPath)
      }
    }
  } else {
    nextOpenFolders.add(normalizedPath)
  }

  openNoteFolders.value = nextOpenFolders
}

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
    const [notesState, cachedTree] = await Promise.all([
      getAndroidCache(NOTE_META_CACHE_BUCKET, 'last-sync'),
      getAndroidCache(NOTE_META_CACHE_BUCKET, 'tree')
    ])
    notesLastSyncedAt.value = notesState?.syncedAt || ''
    applyCachedTree(cachedTree)
  } catch {}
}

function openFolderPicker() {
  if (!noteFolders.value.length) {
    notify('请先更新笔记', 'warning')
    return
  }

  revealSelectedNoteRoot()
  folderPickerVisible.value = true
}

function closeFolderPicker() {
  folderPickerVisible.value = false
}

function selectNoteRoot(path) {
  noteRootPath.value = normalizeFolderPath(path)

  if (noteRootPath.value) {
    localStorage.setItem(NOTE_ROOT_PATH_KEY, noteRootPath.value)
  } else {
    localStorage.removeItem(NOTE_ROOT_PATH_KEY)
  }

  closeFolderPicker()
  notify(noteRootPath.value ? `笔记根目录已设为 ${noteRootPath.value}` : '已显示全部笔记')
}

async function updateNotes() {
  if (notesSyncing.value) return
  notesSyncing.value = true

  try {
    const result = await syncAndroidNotesCache()
    notesLastSyncedAt.value = result.syncedAt
    const cachedTree = await getAndroidCache(NOTE_META_CACHE_BUCKET, 'tree')
    applyCachedTree(cachedTree)
    const imageSummary = result.imageCount
      ? `、${result.updatedImageCount} 张图片`
      : ''
    const failedSummary = result.failedImageCount
      ? `，另有 ${result.failedImageCount} 张图片失败`
      : ''
    const repositorySummary = result.repositoryUpdated ? '服务器仓库已更新，' : '服务器仓库已是最新，'
    notify(`${repositorySummary}本机共 ${result.fileCount} 篇${imageSummary}${failedSummary}`)
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

function saveCodeBlockPreference() {
  localStorage.setItem(ANDROID_LIGHT_CODE_BLOCKS_KEY, String(lightCodeBlocks.value))
  notify(lightCodeBlocks.value ? '代码框已切换为白色' : '代码框已切换为黑色')
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
  cursor: not-allowed;
  opacity: 0.62;
}

.android-settings-action--folder {
  min-width: 104px;
  color: #3e4540;
  background: #eceeeb;
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

.android-folder-picker {
  position: fixed;
  inset: 0;
  z-index: 22000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: max(28px, env(safe-area-inset-top, 0px));
  background: rgba(27, 31, 28, 0.42);
  backdrop-filter: blur(3px);
}

.android-folder-picker__panel {
  width: min(100%, 640px);
  max-height: min(78dvh, 720px);
  display: flex;
  flex-direction: column;
  padding:
    18px
    15px
    max(18px, env(safe-area-inset-bottom, 0px));
  border: 1px solid #d9dbd7;
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
  color: #353b37;
  background: #fdfdfc;
  box-shadow: 0 -18px 48px rgba(22, 26, 23, 0.2);
}

.android-folder-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px 14px;
}

.android-folder-picker__header small {
  color: #909590;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-folder-picker__header h2 {
  margin: 3px 0 0;
  font-size: 1.08rem;
}

.android-folder-picker__close {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid #dfe1dd;
  border-radius: 11px;
  color: #565d58;
  background: #f1f2ef;
}

.android-folder-picker__list {
  min-height: 0;
  display: grid;
  gap: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.android-folder-picker__item {
  width: 100%;
  min-height: 58px;
  border: 1px solid transparent;
  border-radius: 13px;
  color: #414742;
  background: transparent;
  text-align: left;
}

.android-folder-picker__item--all {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  font: inherit;
  cursor: pointer;
}

.android-folder-picker__item--folder {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 3px;
  padding: 5px 8px 5px calc(5px + var(--folder-depth, 0) * 15px);
}

.android-folder-picker__item.is-selected {
  border-color: #d9dcd7;
  background: #e9ebe7;
}

.android-folder-picker__toggle,
.android-folder-picker__toggle-placeholder {
  width: 24px;
  height: 34px;
}

.android-folder-picker__toggle {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: #737a75;
  background: transparent;
  cursor: pointer;
}

.android-folder-picker__toggle:active {
  background: #dde0dc;
}

.android-folder-picker__toggle svg {
  transition: transform 160ms ease;
}

.android-folder-picker__toggle.is-open svg {
  transform: rotate(90deg);
}

.android-folder-picker__select {
  min-width: 0;
  min-height: 46px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 9px;
  padding: 0 2px;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.android-folder-picker__folder {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #59605b;
  background: #eef0ed;
}

.android-folder-picker__item--all > span:nth-child(2),
.android-folder-picker__text {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.android-folder-picker__item strong,
.android-folder-picker__item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.android-folder-picker__item strong {
  font-size: 0.82rem;
}

.android-folder-picker__item small {
  color: #808680;
  font-size: 0.65rem;
}

.android-folder-tree-enter-active,
.android-folder-tree-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.android-folder-tree-enter-from,
.android-folder-tree-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.android-folder-tree-leave-active {
  pointer-events: none;
}

.android-folder-picker__hint {
  margin: 12px 2px 0;
  color: #777d78;
  font-size: 0.68rem;
  line-height: 1.5;
}

.android-folder-picker-enter-active,
.android-folder-picker-leave-active {
  transition: opacity 180ms ease;
}

.android-folder-picker-enter-active .android-folder-picker__panel,
.android-folder-picker-leave-active .android-folder-picker__panel {
  transition: transform 180ms ease;
}

.android-folder-picker-enter-from,
.android-folder-picker-leave-to {
  opacity: 0;
}

.android-folder-picker-enter-from .android-folder-picker__panel,
.android-folder-picker-leave-to .android-folder-picker__panel {
  transform: translateY(26px);
}

@media (max-width: 560px) {
  .android-settings-card {
    padding: 14px;
  }
}
</style>
