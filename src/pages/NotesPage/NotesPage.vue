<template>
  <main
    v-if="privateAppAvailable"
    class="display-layout display-layout--wide note-display-layout notes-agent-theme"
    :class="{
      'notes-agent-theme--android': isAndroidApp,
      'notes-agent-theme--light-code': isAndroidApp && lightCodeBlocks
    }"
  >
    <AppHeader
      v-if="!isAndroidApp"
      tag=""
      title="仓库笔记浏览"
      description=""
      :show-user="false"
      logout-label="返回"
      @logout="handleBackToTools"
    >
      <template #actions>
        <button
          type="button"
          class="secondary-btn"
          :disabled="repoBusy"
          @click="handleUpdateRepository"
        >
          更新
        </button>
        <button
          type="button"
          class="primary-btn"
          :disabled="repoBusy"
          @click="openCommitDialog"
        >
          提交
        </button>
      </template>
    </AppHeader>

    <button
      v-if="showStickyMobileDirectoryTrigger && !isAndroidApp"
      type="button"
      class="note-mobile-directory-trigger note-mobile-directory-trigger--floating"
      aria-controls="note-mobile-directory-dialog"
      :aria-label="`打开${workspaceLabel}目录`"
      @click="openMobileDirectory"
    >
      <span class="note-mobile-directory-trigger__bars" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span class="note-mobile-directory-trigger__text">目录</span>
    </button>

    <section class="panel-card note-browser-panel">
      <div v-if="!isAndroidApp" class="panel-head">
        <div class="note-panel-actions">
          <button
            v-if="isMobileView"
            ref="mobileDirectoryTriggerRef"
            type="button"
            class="note-mobile-directory-trigger"
            :aria-expanded="String(mobileDirectoryVisible)"
            aria-controls="note-mobile-directory-dialog"
            :aria-label="`打开${workspaceLabel}目录`"
            @click="openMobileDirectory"
          >
            <span class="note-mobile-directory-trigger__bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span class="note-mobile-directory-trigger__text">目录</span>
          </button>

        </div>
      </div>

      <div class="note-workspace-shell">
        <div class="note-workspace-page note-workspace-page--notes">
          <div
            ref="noteBrowserLayoutRef"
            class="note-browser-layout"
            :style="browserLayoutStyle"
          >
              <aside
                v-if="!isMobileView"
                class="note-tree-pane"
              >
                <div class="note-tree-wrap">
                  <div class="note-tree-meta">
                    <div class="note-tree-meta-bar">
                      <div class="note-sidebar-switch" role="tablist" aria-label="左侧展示切换">
                        <button
                          type="button"
                          class="note-sidebar-switch__button"
                          :class="{ 'is-active': sidebarMode === 'tree' }"
                          @click="setSidebarMode('tree')"
                        >
                          文件树
                        </button>
                        <button
                          type="button"
                          class="note-sidebar-switch__button"
                          :class="{ 'is-active': sidebarMode === 'titles' }"
                          @click="setSidebarMode('titles')"
                        >
                          标题
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="note-tree-content">
                    <ul
                      v-if="sidebarMode === 'tree' && tree.length"
                      class="note-tree-list note-tree-list--root"
                    >
                      <NoteTreeNode
                        v-for="node in tree"
                        :key="node.path"
                        :node="node"
                        :active-path="activePath"
                        :open-folders="openFolderList"
                        @toggle-folder="toggleFolder"
                        @select-file="handleSelectFile"
                      />
                    </ul>

                    <ul v-else-if="activeHeadings.length" class="note-outline-list">
                      <li v-for="heading in activeHeadings" :key="heading.id" class="note-outline-item">
                        <button
                          type="button"
                          class="note-outline-button"
                          :class="{ 'is-current': isAndroidApp && activeHeadingId === heading.id }"
                          :aria-current="isAndroidApp && activeHeadingId === heading.id ? 'location' : undefined"
                          :style="{ '--outline-indent': `${headingIndentBase + (heading.level - 1) * 16}px` }"
                          @click="jumpToHeading(heading.id)"
                        >
                          {{ heading.text }}
                        </button>
                      </li>
                    </ul>

                    <p v-else class="empty-state">{{ sidebarEmptyState }}</p>
                  </div>
                </div>
              </aside>

              <div
                class="note-layout-resizer"
                role="separator"
                aria-orientation="vertical"
                aria-label="调整左右面板宽度"
                @pointerdown="startSidebarResize"
              ></div>

              <section class="note-view-pane">
                <div v-if="!isAndroidApp" class="note-view-toolbar">
                  <div>
                    <div class="note-view-title-bar">
                      <div class="note-view-title">
                        <h3>{{ activeFileTitle }}</h3>
                        <span v-if="activeUpdatedAtLabel" class="note-view-updated">
                          最近保存：{{ activeUpdatedAtLabel }}
                        </span>
                      </div>

                      <button
                        v-if="isMobileView && (!isAndroidApp || activePath)"
                        type="button"
                        class="secondary-btn note-view-mobile-action"
                        :disabled="!activePath || loadingFile"
                        @click="reloadActiveFile"
                      >
                        重新读取
                      </button>
                    </div>
                  </div>

                  <div v-if="!isMobileView" class="note-editor-actions">
                    <button
                      type="button"
                      class="secondary-btn"
                      :disabled="!activePath || loadingFile"
                      @click="reloadActiveFile"
                    >
                      重新读取
                    </button>
                    <button
                      type="button"
                      class="primary-btn"
                      :disabled="!activePath || savingFile || !isDirty"
                      @click="saveActiveFile"
                    >
                      {{ savingFile ? '保存中...' : '保存' }}
                    </button>
                    <div class="note-mode-switch" role="tablist" aria-label="编辑模式切换">
                      <button
                        type="button"
                        class="note-mode-switch__button"
                        :class="{ 'is-active': !isEditing }"
                        :disabled="!activePath"
                        @click="setEditMode(false)"
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        class="note-mode-switch__button"
                        :class="{ 'is-active': isEditing }"
                        :disabled="!activePath"
                        @click="setEditMode(true)"
                      >
                        编辑
                      </button>
                    </div>
                  </div>
                </div>

                <p v-if="loadingFile" class="note-view-status">正在读取文件内容...</p>
                <p v-else-if="loadError" class="form-error note-view-status">{{ loadError }}</p>
                <p v-else-if="saveError && !isMobileView" class="form-error note-view-status">{{ saveError }}</p>
                <p v-else-if="activePath && isDirty" class="note-view-status">当前内容有未保存修改。</p>

                <div class="note-view-body">
                  <div
                    v-if="isEditing && !isMobileView && activePath"
                    ref="editorRef"
                    class="note-editor-shell"
                  >
                    <MdEditor
                      v-model="draftContent"
                      class="note-editor-component"
                      editor-id="notes-markdown-editor"
                      language="zh-CN"
                      theme="light"
                      :preview-theme="isAndroidApp ? 'default' : 'smart-blue'"
                      code-theme="github"
                      :preview="false"
                      :html-preview="false"
                      :no-mermaid="true"
                      :no-katex="true"
                      :no-echarts="true"
                      :no-upload-img="true"
                      :no-prettier="true"
                      :toolbars-exclude="noteEditorToolbarExcludes"
                      :footers="['markdownTotal']"
                      :sanitize="sanitizeMarkdownHtml"
                      :md-heading-id="resolveMarkdownHeadingId"
                      :style="{ height: '100%' }"
                      :read-only="loadingFile"
                      placeholder="请选择左侧 Markdown 文件后开始编辑。"
                    />
                  </div>

                  <div
                    v-else-if="activePath"
                    ref="previewRef"
                    class="note-preview-shell"
                  >
                    <MdPreview
                      class="note-markdown-component"
                      editor-id="notes-markdown-preview"
                      language="zh-CN"
                      theme="light"
                      :preview-theme="isAndroidApp ? 'default' : 'smart-blue'"
                      code-theme="github"
                      :show-code-row-number="!isAndroidApp"
                      :model-value="previewContent"
                      :md-heading-id="resolveMarkdownHeadingId"
                      :sanitize="sanitizeMarkdownHtml"
                      :no-mermaid="true"
                      :no-katex="true"
                      :no-echarts="true"
                    />
                  </div>

                  <p v-else class="empty-state note-view-empty">
                    {{ isAndroidApp ? '请从目录中选择 Markdown 文件查看内容。' : '请选择左侧 Markdown 文件查看内容。' }}
                  </p>
                </div>
              </section>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body" :disabled="!isAndroidApp">
      <Transition name="note-mobile-directory">
        <div
          v-if="isMobileView && mobileDirectoryVisible"
          class="note-mobile-directory-dialog"
          :class="{ 'note-mobile-directory-dialog--android': isAndroidApp }"
          @click.self="closeMobileDirectory"
        >
          <section
            id="note-mobile-directory-dialog"
            class="note-mobile-directory-dialog__panel"
            role="dialog"
            aria-modal="true"
            :aria-label="`${workspaceLabel}目录`"
          >
            <div v-if="!isAndroidApp" class="note-mobile-directory-dialog__head">
              <div>
                <p class="section-tag">目录</p>
                <h3>{{ workspaceLabel }}目录</h3>
              </div>
              <button
                type="button"
                class="ghost-btn note-mobile-directory-dialog__close"
                @click="closeMobileDirectory"
              >
                关闭
              </button>
            </div>

            <div class="note-mobile-directory-dialog__body">
              <div class="note-tree-meta note-tree-meta--dialog">
                <div class="note-tree-meta-bar">
                  <div class="note-sidebar-switch" role="tablist" aria-label="目录展示切换">
                    <button
                      type="button"
                      class="note-sidebar-switch__button"
                      :class="{ 'is-active': sidebarMode === 'tree' }"
                      @click="setSidebarMode('tree')"
                    >
                      文件树
                    </button>
                    <button
                      type="button"
                      class="note-sidebar-switch__button"
                      :class="{ 'is-active': sidebarMode === 'titles' }"
                      @click="setSidebarMode('titles')"
                    >
                      标题
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref="mobileDirectoryContentRef"
                class="note-tree-content note-tree-content--dialog"
              >
                <ul
                  v-if="sidebarMode === 'tree' && tree.length"
                  class="note-tree-list note-tree-list--root"
                >
                  <NoteTreeNode
                    v-for="node in tree"
                    :key="node.path"
                    :node="node"
                    :active-path="activePath"
                    :open-folders="openFolderList"
                    @toggle-folder="toggleFolder"
                    @select-file="handleSelectFile"
                  />
                </ul>

                <ul v-else-if="activeHeadings.length" class="note-outline-list">
                  <li v-for="heading in activeHeadings" :key="heading.id" class="note-outline-item">
                    <button
                      type="button"
                      class="note-outline-button"
                      :class="{ 'is-current': isAndroidApp && activeHeadingId === heading.id }"
                      :aria-current="isAndroidApp && activeHeadingId === heading.id ? 'location' : undefined"
                      :data-heading-id="heading.id"
                      :style="{ '--outline-indent': `${headingIndentBase + (heading.level - 1) * 16}px` }"
                      @click="handleMobileHeadingSelect(heading.id)"
                    >
                      {{ heading.text }}
                    </button>
                  </li>
                </ul>

                <p v-else class="empty-state">{{ sidebarEmptyState }}</p>
              </div>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Transition name="note-repo-update">
      <div
        v-if="repoUpdateDialogVisible"
        class="note-repo-update-dialog"
      >
        <section
          class="note-repo-update-dialog__panel"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="note-repo-update-title"
          aria-describedby="note-repo-update-copy"
        >
          <div class="note-repo-update-dialog__visual" aria-hidden="true">
            <span class="note-repo-update-dialog__pulse note-repo-update-dialog__pulse--outer"></span>
            <span class="note-repo-update-dialog__pulse note-repo-update-dialog__pulse--inner"></span>
            <span class="note-repo-update-dialog__ring note-repo-update-dialog__ring--outer"></span>
            <span class="note-repo-update-dialog__ring note-repo-update-dialog__ring--middle"></span>
            <span class="note-repo-update-dialog__core">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>

          <div class="note-repo-update-dialog__content">
            <p class="section-tag">仓库同步</p>
            <h3 id="note-repo-update-title">更新中</h3>
            <p id="note-repo-update-copy" class="note-repo-update-dialog__copy">
              正在获取远程提交并刷新当前笔记仓库，请稍候，完成前暂时无法进行其他操作。
            </p>

            <div class="note-repo-update-dialog__status" aria-hidden="true">
              <span class="note-repo-update-dialog__status-line"></span>
              <span class="note-repo-update-dialog__status-text">同步远端 · 校准分支 · 刷新内容</span>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <CommitDialog
      :visible="commitDialogVisible"
      :busy="repoBusy && repoAction === 'publish'"
      :selected-type="commitType"
      :scope-label="commitScopeLabel"
      :subject="commitSubject"
      :preview-message="commitPreviewMessage"
      :type-options="commitTypeOptions"
      @close="closeCommitDialog"
      @confirm="publishRepository"
      @select-type="handleCommitTypeSelect"
      @update:subject="commitSubject = $event"
    />
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MdEditor, MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import {
  getAndroidCache,
  setAndroidCache
} from '../../android/offlineCache'
import { ANDROID_TOGGLE_NOTES_DIRECTORY_EVENT } from '../../android/events'
import AppHeader from '../../components/AppHeader/AppHeader.vue'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import CommitDialog from '../../components/notes/CommitDialog/CommitDialog.vue'
import NoteTreeNode from '../../components/notes/NoteTreeNode/NoteTreeNode.vue'
import {
  APPENDIX_ACTIVE_PATH_KEY,
  APPENDIX_OPEN_FOLDERS_KEY,
  APPENDIX_READING_POSITIONS_KEY,
  APPENDIX_ROOT_PATH_KEY,
  ANDROID_LIGHT_CODE_BLOCKS_KEY,
  NOTE_ACTIVE_PATH_KEY,
  NOTE_OPEN_FOLDERS_KEY,
  NOTE_READING_POSITIONS_KEY,
  NOTE_ROOT_PATH_KEY,
  NOTE_SIDEBAR_MODE_KEY,
  NOTE_SIDEBAR_WIDTH_KEY
} from '../../constants/storage'
import {
  buildMarkdownHeadingId,
  extractMarkdownHeadings,
  normalizeMarkdownSource
} from '../../utils/markdownPreview'
import { loadNoteAssetBlob } from '../../utils/noteAssets'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import { rewriteRenderedNoteHtml } from '../../utils/noteRepo'
import http from '../../utils/http'

const props = defineProps({
  workspace: {
    type: String,
    default: 'notes',
    validator: (value) => value === 'notes' || value === 'appendix'
  }
})

const formatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const commitTypeOptions = [
  { key: 'feat', label: 'feat' },
  { key: 'fix', label: 'fix' },
  { key: 'docs', label: 'docs' },
  { key: 'style', label: 'style' },
  { key: 'refactor', label: 'refactor' },
  { key: 'test', label: 'test' },
  { key: 'chore', label: 'chore' },
  { key: 'perf', label: 'perf' }
]

const REPO_ACTION_TIMEOUT = 60000
const MOBILE_PREVIEW_BREAKPOINT = 900
const NOTE_META_CACHE_BUCKET = 'notes-meta'
const NOTE_FILE_CACHE_BUCKET = 'notes-files'
const headingIndentBase = 14
const noteEditorToolbarExcludes = [
  'catalog',
  'fullscreen',
  'github',
  'htmlPreview',
  'pageFullscreen',
  'preview',
  'previewOnly',
  'prettier',
  'save'
]

function readStorageValue(key, fallback = '') {
  if (typeof localStorage === 'undefined') return fallback
  const storedValue = localStorage.getItem(key)
  return storedValue === null ? fallback : storedValue
}

function readStorageArray(key) {
  if (typeof localStorage === 'undefined') return []

  try {
    const parsedValue = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsedValue) ? parsedValue.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function readStorageObject(key) {
  if (typeof localStorage === 'undefined') return {}

  try {
    const parsedValue = JSON.parse(localStorage.getItem(key) || '{}')
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : {}
  } catch {
    return {}
  }
}

function writeStorageValue(key, value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, value)
}

function writeStorageArray(key, value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

const router = useRouter()
const isAndroidApp = import.meta.env.MODE === 'android'
const isAppendixView = isAndroidApp && props.workspace === 'appendix'
const workspaceLabel = isAppendixView ? '附录' : '笔记'
const rootPathStorageKey = isAppendixView ? APPENDIX_ROOT_PATH_KEY : NOTE_ROOT_PATH_KEY
const activePathStorageKey = isAppendixView ? APPENDIX_ACTIVE_PATH_KEY : NOTE_ACTIVE_PATH_KEY
const openFoldersStorageKey = isAppendixView ? APPENDIX_OPEN_FOLDERS_KEY : NOTE_OPEN_FOLDERS_KEY
const readingPositionsStorageKey = isAppendixView
  ? APPENDIX_READING_POSITIONS_KEY
  : NOTE_READING_POSITIONS_KEY
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const files = ref([])
const lightCodeBlocks = ref(
  isAndroidApp && readStorageValue(ANDROID_LIGHT_CODE_BLOCKS_KEY) === 'true'
)
const noteRootPath = ref(isAndroidApp ? normalizeFolderPath(readStorageValue(rootPathStorageKey)) : '')
const activePath = ref(readStorageValue(activePathStorageKey))
const activeContent = ref('')
const draftContent = ref('')
const activeUpdatedAt = ref('')
const loadingFile = ref(false)
const savingFile = ref(false)
const isEditing = ref(false)
const repoBusy = ref(false)
const repoAction = ref('')
const repoBranch = ref('')
const repoHead = ref('')
const repoChangedFiles = ref([])
const loadError = ref('')
const saveError = ref('')
const openFolders = ref(new Set(readStorageArray(openFoldersStorageKey)))
const readingPositions = readStorageObject(readingPositionsStorageKey)
const sidebarMode = ref(readStorageValue(NOTE_SIDEBAR_MODE_KEY, 'tree') === 'titles' ? 'titles' : 'tree')
const commitDialogVisible = ref(false)
const commitType = ref('feat')
const commitSubject = ref('')
const editorRef = ref(null)
const previewRef = ref(null)
const noteBrowserLayoutRef = ref(null)
const mobileDirectoryTriggerRef = ref(null)
const mobileDirectoryContentRef = ref(null)
const isSidebarResizing = ref(false)
const sidebarWidth = ref(Number.parseInt(readStorageValue(NOTE_SIDEBAR_WIDTH_KEY, '280'), 10) || 280)
const isMobileView = ref(false)
const mobileDirectoryVisible = ref(false)
const isMobileDirectoryTriggerInView = ref(true)
const mobileDirectoryScrollTop = ref(0)
const activeHeadingId = ref('')
let activeHeadingScrollElement = null
let activeHeadingAnimationFrame = 0
let readingPositionSaveTimerId = 0
let scheduledReadingPositionPath = ''
let noteAssetRenderVersion = 0
let noteAssetObserver = null
let noteAssetLoadScheduled = false
const noteAssetObjectUrls = new Map()
const noteAssetLoadPromises = new Map()

const visibleFiles = computed(() => getFilesInRoot(files.value, noteRootPath.value))
const tree = computed(() => buildTree(visibleFiles.value, noteRootPath.value))
const openFolderList = computed(() => [...openFolders.value])
const previewContent = computed(() => normalizeMarkdownSource(draftContent.value))
const activeHeadings = computed(() => extractMarkdownHeadings(previewContent.value))
const browserLayoutStyle = computed(() => ({ '--note-sidebar-width': `${sidebarWidth.value}px` }))
const repoUpdateDialogVisible = computed(() => repoBusy.value && repoAction.value === 'update')
const activeFileTitle = computed(() => activePath.value ? getFileName(activePath.value).replace(/\.[^.]+$/, '') : '未选择文件')
const isDirty = computed(() => draftContent.value !== activeContent.value)
const showStickyMobileDirectoryTrigger = computed(() =>
  isMobileView.value && !mobileDirectoryVisible.value && !isMobileDirectoryTriggerInView.value
)
const activeUpdatedAtLabel = computed(() => {
  if (!activeUpdatedAt.value) return ''
  const parsedDate = new Date(activeUpdatedAt.value)
  return Number.isNaN(parsedDate.getTime()) ? '' : formatter.format(parsedDate)
})
const commitTargetLabel = computed(() => {
  if (activePath.value) return getFileName(activePath.value)
  if (repoChangedFiles.value.length === 1) return getFileName(repoChangedFiles.value[0])
  if (repoChangedFiles.value.length > 1) return `${repoChangedFiles.value.length}-files`
  return 'repo'
})
const commitScopeLabel = computed(() => `(${commitTargetLabel.value}):`)
const commitPreviewMessage = computed(() => {
  const subject = commitSubject.value.trim()
  return subject ? `${commitType.value}${commitScopeLabel.value} ${subject}` : `${commitType.value}${commitScopeLabel.value}`
})
const sidebarEmptyState = computed(() => {
  if (sidebarMode.value === 'titles') {
    return activePath.value ? '当前文档里还没有可用的大标题。' : '请先在左侧打开一个 Markdown 文件。'
  }

  return noteRootPath.value
    ? '当前根目录里还没有 Markdown 文件。'
    : '当前仓库里还没有 Markdown 文件。'
})

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 2200,
    offset: 24
  })
}

function createFolderNode(path, name) {
  return {
    type: 'folder',
    path,
    name,
    children: []
  }
}

function createFileNode(file) {
  return {
    type: 'file',
    path: file.path,
    name: file.name,
    updatedAt: file.updatedAt
  }
}

function normalizeFolderPath(path) {
  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

function getFilesInRoot(fileList, rootPath) {
  const normalizedRoot = normalizeFolderPath(rootPath)

  if (!normalizedRoot) {
    return fileList
  }

  const rootPrefix = `${normalizedRoot}/`
  return fileList.filter((file) => normalizeFolderPath(file?.path).startsWith(rootPrefix))
}

function buildTree(fileList, rootPath = '') {
  const rootNodes = []
  const folderMap = new Map()
  const normalizedRoot = normalizeFolderPath(rootPath)
  const rootPrefix = normalizedRoot ? `${normalizedRoot}/` : ''

  fileList.forEach((file) => {
    const fullPath = normalizeFolderPath(file.path)
    const relativePath = rootPrefix && fullPath.startsWith(rootPrefix)
      ? fullPath.slice(rootPrefix.length)
      : fullPath
    const segments = relativePath.split('/').filter(Boolean)
    let parentPath = normalizedRoot
    let currentLevel = rootNodes

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1
      const currentPath = parentPath ? `${parentPath}/${segment}` : segment

      if (isFile) {
        currentLevel.push(createFileNode(file))
        return
      }

      if (!folderMap.has(currentPath)) {
        const folderNode = createFolderNode(currentPath, segment)
        folderMap.set(currentPath, folderNode)
        currentLevel.push(folderNode)
      }

      currentLevel = folderMap.get(currentPath).children
      parentPath = currentPath
    })
  })

  return rootNodes
}

function collectFolderPaths(nodes, target = []) {
  nodes.forEach((node) => {
    if (node.type === 'folder') {
      target.push(node.path)
      collectFolderPaths(node.children, target)
    }
  })

  return target
}

function persistActivePath() {
  writeStorageValue(activePathStorageKey, activePath.value)
}

function persistOpenFolders() {
  writeStorageArray(openFoldersStorageKey, [...openFolders.value])
}

function persistSidebarWidth() {
  writeStorageValue(NOTE_SIDEBAR_WIDTH_KEY, String(Math.round(sidebarWidth.value)))
}

function ensureActivePathFoldersOpen(path) {
  if (!path) {
    return
  }

  const nextOpenFolders = new Set(openFolders.value)
  const parts = path.split('/').slice(0, -1)
  let currentPath = ''

  parts.forEach((part) => {
    currentPath = currentPath ? `${currentPath}/${part}` : part
    nextOpenFolders.add(currentPath)
  })

  openFolders.value = nextOpenFolders
  persistOpenFolders()
}

function extractChangedFilePath(entry) {
  const normalizedEntry = String(entry ?? '').trim()

  if (!normalizedEntry) {
    return ''
  }

  const withoutStatus = normalizedEntry.replace(/^[A-Z?]{1,2}\s+/, '')
  const renamedPath = withoutStatus.split(' -> ').pop()

  return renamedPath ? renamedPath.trim() : ''
}

function getFileName(path) {
  return path.split('/').pop() || path
}

function resetCommitDialog() {
  commitDialogVisible.value = false
  commitType.value = 'feat'
  commitSubject.value = ''
}

async function setSidebarMode(mode) {
  sidebarMode.value = mode === 'titles' ? 'titles' : 'tree'
  writeStorageValue(NOTE_SIDEBAR_MODE_KEY, sidebarMode.value)

  if (isAndroidApp && sidebarMode.value === 'titles') {
    await revealActiveHeadingInDirectory()
  }
}

function getSidebarWidthBounds() {
  const layoutWidth = noteBrowserLayoutRef.value?.getBoundingClientRect?.().width || 0
  const minWidth = 220

  if (!layoutWidth) {
    return {
      minWidth,
      maxWidth: 560
    }
  }

  return {
    minWidth,
    maxWidth: Math.max(minWidth, Math.min(560, layoutWidth - 360))
  }
}

function clampSidebarWidth(nextWidth) {
  const { minWidth, maxWidth } = getSidebarWidthBounds()
  return Math.min(Math.max(nextWidth, minWidth), maxWidth)
}

let mobileDirectoryTriggerObserver = null

function stopMobileDirectoryTriggerObserver() {
  if (!mobileDirectoryTriggerObserver) {
    return
  }

  mobileDirectoryTriggerObserver.disconnect()
  mobileDirectoryTriggerObserver = null
}

async function syncMobileDirectoryTriggerObserver() {
  stopMobileDirectoryTriggerObserver()

  if (
    typeof window === 'undefined' ||
    !('IntersectionObserver' in window) ||
    !isMobileView.value
  ) {
    isMobileDirectoryTriggerInView.value = true
    return
  }

  await nextTick()

  const triggerElement = mobileDirectoryTriggerRef.value

  if (!triggerElement) {
    isMobileDirectoryTriggerInView.value = true
    return
  }

  mobileDirectoryTriggerObserver = new window.IntersectionObserver(
    (entries) => {
      isMobileDirectoryTriggerInView.value = Boolean(entries[0]?.isIntersecting)
    },
    {
      threshold: 0.08
    }
  )

  mobileDirectoryTriggerObserver.observe(triggerElement)
}

function stopSidebarResize() {
  if (!isSidebarResizing.value) {
    return
  }

  isSidebarResizing.value = false
  document.body.classList.remove('is-note-resizing')
}

function syncViewportState() {
  if (typeof window === 'undefined') {
    return
  }

  const nextIsMobileView = window.innerWidth <= MOBILE_PREVIEW_BREAKPOINT
  const previousIsMobileView = isMobileView.value

  isMobileView.value = nextIsMobileView

  if (nextIsMobileView) {
    stopSidebarResize()

    draftContent.value = activeContent.value
    isEditing.value = false

    if (commitDialogVisible.value) {
      resetCommitDialog()
    }
  } else if (previousIsMobileView) {
    closeMobileDirectory()
  }

  syncMobileDirectoryTriggerObserver()
}

function syncSidebarWidthToLayout() {
  syncViewportState()

  if (typeof window !== 'undefined' && window.innerWidth <= MOBILE_PREVIEW_BREAKPOINT) {
    return
  }

  sidebarWidth.value = clampSidebarWidth(sidebarWidth.value)
  persistSidebarWidth()
}

function storeMobileDirectoryScrollTop() {
  mobileDirectoryScrollTop.value = mobileDirectoryContentRef.value?.scrollTop || 0
}

async function restoreMobileDirectoryScrollTop() {
  await nextTick()

  if (!mobileDirectoryVisible.value || !mobileDirectoryContentRef.value) {
    return
  }

  mobileDirectoryContentRef.value.scrollTop = mobileDirectoryScrollTop.value
}

async function openMobileDirectory() {
  if (!isMobileView.value) {
    return
  }

  mobileDirectoryVisible.value = true
  await restoreMobileDirectoryScrollTop()

  if (isAndroidApp && sidebarMode.value === 'titles') {
    await revealActiveHeadingInDirectory()
  }
}

function handleAndroidDirectoryRequest() {
  if (mobileDirectoryVisible.value) {
    closeMobileDirectory()
    return
  }

  void openMobileDirectory()
}

function closeMobileDirectory() {
  storeMobileDirectoryScrollTop()
  mobileDirectoryVisible.value = false
}

function resolveMarkdownHeadingId({ index }) {
  return buildMarkdownHeadingId(index)
}

function sanitizeMarkdownHtml(html) {
  return rewriteRenderedNoteHtml(html, activePath.value)
}

async function getNoteAssetObjectUrl(assetPath) {
  if (noteAssetObjectUrls.has(assetPath)) {
    return noteAssetObjectUrls.get(assetPath)
  }

  if (!noteAssetLoadPromises.has(assetPath)) {
    noteAssetLoadPromises.set(
      assetPath,
      loadNoteAssetBlob(assetPath)
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob)
          noteAssetObjectUrls.set(assetPath, objectUrl)
          return objectUrl
        })
        .finally(() => {
          noteAssetLoadPromises.delete(assetPath)
        })
    )
  }

  return noteAssetLoadPromises.get(assetPath)
}

async function loadRenderedNoteAssets() {
  const renderVersion = ++noteAssetRenderVersion
  await nextTick()
  await nextTick()

  if (renderVersion !== noteAssetRenderVersion || !(previewRef.value instanceof Element)) {
    return
  }

  const images = [
    ...previewRef.value.querySelectorAll('img[data-note-asset-path]')
  ]

  await Promise.allSettled(
    images.map(async (image) => {
      const assetPath = image.getAttribute('data-note-asset-path') || ''

      if (!assetPath) {
        return
      }

      image.classList.add('is-note-asset-loading')

      try {
        const objectUrl = await getNoteAssetObjectUrl(assetPath)

        if (
          renderVersion === noteAssetRenderVersion
          && image.isConnected
          && image.getAttribute('data-note-asset-path') === assetPath
        ) {
          image.src = objectUrl
          image.classList.remove('is-note-asset-loading', 'is-note-asset-error')
        }
      } catch {
        if (renderVersion === noteAssetRenderVersion && image.isConnected) {
          image.classList.remove('is-note-asset-loading')
          image.classList.add('is-note-asset-error')
          image.title = '图片加载失败'
        }
      }
    })
  )
}

function scheduleRenderedNoteAssetLoad() {
  if (noteAssetLoadScheduled) {
    return
  }

  noteAssetLoadScheduled = true
  queueMicrotask(() => {
    noteAssetLoadScheduled = false
    void loadRenderedNoteAssets()
  })
}

async function startNoteAssetObserver() {
  noteAssetObserver?.disconnect()
  noteAssetObserver = null
  await nextTick()

  if (!(previewRef.value instanceof Element)) {
    return
  }

  noteAssetObserver = new MutationObserver(scheduleRenderedNoteAssetLoad)
  noteAssetObserver.observe(previewRef.value, {
    childList: true,
    subtree: true
  })
  scheduleRenderedNoteAssetLoad()
}

function releaseNoteAssetObjectUrls() {
  noteAssetRenderVersion += 1
  noteAssetObserver?.disconnect()
  noteAssetObserver = null
  noteAssetLoadScheduled = false

  for (const objectUrl of noteAssetObjectUrls.values()) {
    URL.revokeObjectURL(objectUrl)
  }

  noteAssetObjectUrls.clear()
  noteAssetLoadPromises.clear()
}

function resolvePreviewScrollElement() {
  if (!(previewRef.value instanceof Element)) {
    return null
  }

  const candidates = [
    previewRef.value.querySelector('.md-editor-previewOnly'),
    previewRef.value.querySelector('.md-editor-preview-wrapper'),
    previewRef.value
  ].filter((element) => element instanceof Element)

  return candidates.reduce((current, element) => {
    const currentRange = current ? current.scrollHeight - current.clientHeight : -1
    const nextRange = element.scrollHeight - element.clientHeight
    return nextRange > currentRange ? element : current
  }, null)
}

function persistReadingPositions() {
  const entries = Object.entries(readingPositions)

  if (entries.length > 200) {
    entries
      .sort((left, right) => Number(left[1]?.savedAt || 0) - Number(right[1]?.savedAt || 0))
      .slice(0, entries.length - 200)
      .forEach(([path]) => {
        delete readingPositions[path]
      })
  }

  writeStorageValue(readingPositionsStorageKey, JSON.stringify(readingPositions))
}

function saveReadingPosition(path = activePath.value) {
  if (!isAndroidApp || !path) {
    return
  }

  const scrollElement = resolvePreviewScrollElement()

  if (!scrollElement) {
    return
  }

  const maxScrollTop = Math.max(scrollElement.scrollHeight - scrollElement.clientHeight, 0)
  const scrollTop = Math.max(0, Math.min(scrollElement.scrollTop, maxScrollTop))

  readingPositions[path] = {
    scrollTop: Math.round(scrollTop),
    progress: maxScrollTop > 0 ? scrollTop / maxScrollTop : 0,
    savedAt: Date.now()
  }
  persistReadingPositions()
}

function scheduleReadingPositionSave() {
  if (!isAndroidApp || !activePath.value || typeof window === 'undefined') {
    return
  }

  window.clearTimeout(readingPositionSaveTimerId)
  scheduledReadingPositionPath = activePath.value
  readingPositionSaveTimerId = window.setTimeout(() => {
    readingPositionSaveTimerId = 0

    if (activePath.value === scheduledReadingPositionPath) {
      saveReadingPosition(scheduledReadingPositionPath)
    }
  }, 180)
}

function flushReadingPosition(path = activePath.value) {
  if (typeof window !== 'undefined') {
    window.clearTimeout(readingPositionSaveTimerId)
  }

  readingPositionSaveTimerId = 0
  scheduledReadingPositionPath = ''
  saveReadingPosition(path)
}

async function restoreReadingPosition(path = activePath.value) {
  if (!isAndroidApp || !path) {
    return
  }

  const storedPosition = readingPositions[path]

  if (!storedPosition || typeof storedPosition !== 'object') {
    return
  }

  await nextTick()
  await nextTick()

  if (typeof window !== 'undefined') {
    await new Promise((resolve) => window.requestAnimationFrame(resolve))
  }

  if (activePath.value !== path) {
    return
  }

  const scrollElement = resolvePreviewScrollElement()

  if (!scrollElement) {
    return
  }

  const maxScrollTop = Math.max(scrollElement.scrollHeight - scrollElement.clientHeight, 0)
  const storedScrollTop = Number(storedPosition.scrollTop)
  const storedProgress = Number(storedPosition.progress)
  const targetScrollTop = Number.isFinite(storedScrollTop) && storedScrollTop <= maxScrollTop
    ? storedScrollTop
    : Number.isFinite(storedProgress)
      ? storedProgress * maxScrollTop
      : 0

  scrollElement.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))
  scheduleActiveHeadingUpdate()
}

function handlePreviewScroll() {
  scheduleActiveHeadingUpdate()
  scheduleReadingPositionSave()
}

function updateActiveHeading() {
  activeHeadingAnimationFrame = 0

  if (!isAndroidApp || !activeHeadings.value.length || !(previewRef.value instanceof Element)) {
    activeHeadingId.value = ''
    return
  }

  const scrollElement = resolvePreviewScrollElement()
  const scrollTop = scrollElement?.getBoundingClientRect?.().top ?? 0
  const activationTop = scrollTop + 20
  let nextHeadingId = activeHeadings.value[0].id

  for (const heading of activeHeadings.value) {
    const headingElement = previewRef.value.querySelector(
      `#${escapeHeadingSelector(heading.id)}`
    )

    if (!headingElement) {
      continue
    }

    if (headingElement.getBoundingClientRect().top <= activationTop) {
      nextHeadingId = heading.id
      continue
    }

    break
  }

  activeHeadingId.value = nextHeadingId
}

function scheduleActiveHeadingUpdate() {
  if (!isAndroidApp || activeHeadingAnimationFrame) {
    return
  }

  activeHeadingAnimationFrame = window.requestAnimationFrame(updateActiveHeading)
}

function stopActiveHeadingTracking() {
  activeHeadingScrollElement?.removeEventListener('scroll', handlePreviewScroll)
  activeHeadingScrollElement = null

  if (activeHeadingAnimationFrame) {
    window.cancelAnimationFrame(activeHeadingAnimationFrame)
    activeHeadingAnimationFrame = 0
  }
}

async function startActiveHeadingTracking() {
  if (!isAndroidApp) {
    return
  }

  await nextTick()
  stopActiveHeadingTracking()
  activeHeadingScrollElement = resolvePreviewScrollElement()
  activeHeadingScrollElement?.addEventListener('scroll', handlePreviewScroll, {
    passive: true
  })
  scheduleActiveHeadingUpdate()
}

async function revealActiveHeadingInDirectory() {
  if (!activeHeadingId.value) {
    return
  }

  await nextTick()
  const activeButton = mobileDirectoryContentRef.value?.querySelector?.(
    `[data-heading-id="${escapeHeadingSelector(activeHeadingId.value)}"]`
  )

  activeButton?.scrollIntoView?.({
    block: 'nearest'
  })
}

function applyNoteTree(nextFiles) {
  const normalizedFiles = Array.isArray(nextFiles) ? nextFiles : []
  let visibleNoteFiles = getFilesInRoot(normalizedFiles, noteRootPath.value)

  if (noteRootPath.value && !visibleNoteFiles.length) {
    noteRootPath.value = ''
    writeStorageValue(rootPathStorageKey, '')
    visibleNoteFiles = normalizedFiles
  }

  const nextTree = buildTree(visibleNoteFiles, noteRootPath.value)
  const validFolderPaths = new Set(collectFolderPaths(nextTree))

  files.value = normalizedFiles
  openFolders.value = new Set(
    [...openFolders.value].filter((folderPath) => validFolderPaths.has(folderPath))
  )

  if (!visibleNoteFiles.length) {
    activePath.value = ''
    activeContent.value = ''
    draftContent.value = ''
    activeUpdatedAt.value = ''
    persistActivePath()
    persistOpenFolders()
    return
  }

  const hasStoredPath = visibleNoteFiles.some((file) => file.path === activePath.value)

  if (!hasStoredPath) {
    activePath.value = ''
    activeContent.value = ''
    draftContent.value = ''
    activeUpdatedAt.value = ''
    persistActivePath()
    persistOpenFolders()
    return
  }

  ensureActivePathFoldersOpen(activePath.value)
  persistOpenFolders()
}

function applyRepoStatus(data = {}) {
  repoBranch.value = typeof data.branch === 'string' ? data.branch : ''
  repoHead.value = typeof data.head === 'string' ? data.head : ''
  repoChangedFiles.value = Array.isArray(data.changedFiles)
    ? data.changedFiles.map(extractChangedFilePath).filter(Boolean)
    : []
}

function applyNoteFile(data, fallbackPath) {
  activePath.value = typeof data?.path === 'string' ? data.path : fallbackPath
  activeContent.value = typeof data?.content === 'string' ? data.content : ''
  draftContent.value = activeContent.value
  activeUpdatedAt.value = typeof data?.updatedAt === 'string' ? data.updatedAt : ''
  persistActivePath()
  ensureActivePathFoldersOpen(activePath.value)
}

async function hydrateNotesFromAndroidCache() {
  if (!isAndroidApp) {
    return { hasCachedContent: false, isFresh: false }
  }

  try {
    const [cachedTree, cachedRepoStatus] = await Promise.all([
      getAndroidCache(NOTE_META_CACHE_BUCKET, 'tree'),
      getAndroidCache(NOTE_META_CACHE_BUCKET, 'repo-status')
    ])

    if (Array.isArray(cachedTree?.files)) {
      applyNoteTree(cachedTree.files)
    }

    if (cachedRepoStatus && typeof cachedRepoStatus === 'object') {
      applyRepoStatus(cachedRepoStatus)
    }

    if (activePath.value) {
      const cachedFile = await getAndroidCache(NOTE_FILE_CACHE_BUCKET, activePath.value)

      if (cachedFile && typeof cachedFile.content === 'string') {
        applyNoteFile(cachedFile, activePath.value)
      }
    }

    return {
      hasCachedContent: Boolean(cachedTree || activeContent.value)
    }
  } catch {
    return { hasCachedContent: false }
  }
}

async function loadTree() {
  const data = await http.get('/api/notes/tree')
  const nextFiles = Array.isArray(data.files) ? data.files : []
  const nextTree = buildTree(nextFiles)
  applyNoteTree(nextFiles)

  if (isAndroidApp) {
    try {
      await setAndroidCache(NOTE_META_CACHE_BUCKET, 'tree', {
        files: nextFiles,
        cachedAt: new Date().toISOString()
      })
    } catch {}
  }

  return nextTree
}

async function loadRepoStatus() {
  const data = await http.get('/api/notes/repo/status')
  applyRepoStatus(data)

  if (isAndroidApp) {
    try {
      await setAndroidCache(NOTE_META_CACHE_BUCKET, 'repo-status', {
        branch: repoBranch.value,
        head: repoHead.value,
        changedFiles: repoChangedFiles.value
      })
    } catch {}
  }
}

async function openFile(path, { showSuccess = false } = {}) {
  loadingFile.value = !isAndroidApp
  loadError.value = ''
  saveError.value = ''

  if (isAndroidApp) {
    try {
      const cachedFile = await getAndroidCache(NOTE_FILE_CACHE_BUCKET, path)

      if (cachedFile && typeof cachedFile.content === 'string') {
        applyNoteFile(cachedFile, path)
      } else {
        activePath.value = path
        activeContent.value = ''
        draftContent.value = ''
        activeUpdatedAt.value = ''
        persistActivePath()
        loadError.value = `这篇${workspaceLabel}内容尚未下载到本机，请前往设置更新笔记。`
      }
    } catch {
      activePath.value = path
      activeContent.value = ''
      draftContent.value = ''
      activeUpdatedAt.value = ''
      persistActivePath()
      loadError.value = `读取本机${workspaceLabel}失败，请前往设置重新更新笔记。`
    } finally {
      loadingFile.value = false
    }

    return
  }

  try {
    const data = await http.get('/api/notes/file', {
      params: {
        path
      }
    })

    applyNoteFile(data, path)

    if (showSuccess) {
      notify('读取成功')
    }
  } catch (error) {
    activeContent.value = ''
    draftContent.value = ''
    activeUpdatedAt.value = ''
    loadError.value = error instanceof Error ? error.message : '读取失败，请确认服务端已经启动。'
  } finally {
    loadingFile.value = false
  }
}

async function handleSelectFile(path) {
  if (path === activePath.value) {
    closeMobileDirectory()
    return
  }

  if (isDirty.value && typeof window !== 'undefined') {
    const shouldContinue = window.confirm('当前文件有未保存修改，确定切换文件吗？')

    if (!shouldContinue) {
      return
    }
  }

  flushReadingPosition(activePath.value)
  await openFile(path)
  closeMobileDirectory()
  await restoreReadingPosition(path)
}

function toggleFolder(path) {
  const nextOpenFolders = new Set(openFolders.value)

  if (nextOpenFolders.has(path)) {
    nextOpenFolders.delete(path)
  } else {
    nextOpenFolders.add(path)
  }

  openFolders.value = nextOpenFolders
  persistOpenFolders()
}

async function reloadActiveFile() {
  if (!activePath.value) {
    return
  }

  if (isDirty.value && typeof window !== 'undefined') {
    const shouldReload = window.confirm('重新读取会覆盖当前未保存内容，确定继续吗？')

    if (!shouldReload) {
      return
    }
  }

  await openFile(activePath.value, { showSuccess: true })
}

async function saveActiveFile() {
  if (isMobileView.value) {
    return
  }

  if (!activePath.value || !isDirty.value) {
    return
  }

  savingFile.value = true
  saveError.value = ''
  loadError.value = ''

  try {
    const data = await http.post('/api/notes/file', {
      path: activePath.value,
      content: draftContent.value
    })

    activeContent.value = draftContent.value
    activeUpdatedAt.value = typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()

    if (isAndroidApp) {
      try {
        await setAndroidCache(NOTE_FILE_CACHE_BUCKET, activePath.value, {
          path: activePath.value,
          content: activeContent.value,
          updatedAt: activeUpdatedAt.value
        })
      } catch {}
    }

    try {
      await loadRepoStatus()
    } catch {}

    notify('保存成功')
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存失败，请确认服务端已经启动。'
  } finally {
    savingFile.value = false
  }
}

function getScrollProgress(element) {
  if (!element) {
    return 0
  }

  const maxScrollTop = element.scrollHeight - element.clientHeight

  if (maxScrollTop <= 0) {
    return 0
  }

  return element.scrollTop / maxScrollTop
}

function restoreScrollProgress(element, progress) {
  if (!element) {
    return
  }

  const maxScrollTop = element.scrollHeight - element.clientHeight
  element.scrollTop = maxScrollTop > 0 ? maxScrollTop * progress : 0
}

function resolveScrollableElement(container, mode) {
  if (!(container instanceof Element)) {
    return null
  }

  if (mode === 'editor') {
    return container.querySelector('.cm-scroller') || container
  }

  return (
    container.querySelector('.md-editor-previewOnly') ||
    container.querySelector('.md-editor-preview-wrapper') ||
    container
  )
}

function focusEditorSurface() {
  const focusTarget =
    editorRef.value?.querySelector('.cm-content[contenteditable="true"]') ||
    editorRef.value?.querySelector('.md-editor-input')

  focusTarget?.focus?.({
    preventScroll: true
  })
}

async function setEditMode(nextMode) {
  const nextEditing = Boolean(nextMode)

  if (isMobileView.value && nextEditing) {
    return
  }

  if (isEditing.value === nextEditing) {
    return
  }

  const currentElement = resolveScrollableElement(
    isEditing.value ? editorRef.value : previewRef.value,
    isEditing.value ? 'editor' : 'preview'
  )
  const scrollProgress = getScrollProgress(currentElement)

  isEditing.value = nextEditing
  await nextTick()

  const targetElement = resolveScrollableElement(
    isEditing.value ? editorRef.value : previewRef.value,
    isEditing.value ? 'editor' : 'preview'
  )
  restoreScrollProgress(targetElement, scrollProgress)

  if (isEditing.value) {
    focusEditorSurface()
  }
}

function updateSidebarWidth(clientX) {
  const layoutRect = noteBrowserLayoutRef.value?.getBoundingClientRect?.()

  if (!layoutRect) {
    return
  }

  sidebarWidth.value = clampSidebarWidth(clientX - layoutRect.left)
  persistSidebarWidth()
}

function handleSidebarResize(event) {
  if (!isSidebarResizing.value) {
    return
  }

  updateSidebarWidth(event.clientX)
}

function startSidebarResize(event) {
  if (typeof window !== 'undefined' && window.innerWidth <= MOBILE_PREVIEW_BREAKPOINT) {
    return
  }

  isSidebarResizing.value = true
  document.body.classList.add('is-note-resizing')
  updateSidebarWidth(event.clientX)
}

function escapeHeadingSelector(value) {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(value)
  }

  return String(value).replace(/["\\#.:]/g, '\\$&')
}

async function jumpToHeading(headingId) {
  if (!headingId) {
    return
  }

  if (isAndroidApp) {
    activeHeadingId.value = headingId
  }

  if (isEditing.value) {
    await setEditMode(false)
  }

  const previewElement = previewRef.value
  const headingElement = previewElement?.querySelector?.(
    `#${escapeHeadingSelector(headingId)}`
  )

  if (!headingElement) {
    notify('没有找到对应标题位置。', 'error')
    return
  }

  headingElement.scrollIntoView({
    block: 'start',
    behavior: 'smooth'
  })
}

function handleMobileHeadingSelect(headingId) {
  closeMobileDirectory()
  jumpToHeading(headingId)
}

function openCommitDialog() {
  if (isMobileView.value) {
    return
  }

  if (!isDirty.value && !repoChangedFiles.value.length) {
    notify('当前没有可提交的仓库变更。', 'error')
    return
  }

  commitDialogVisible.value = true
}

function closeCommitDialog() {
  if (repoBusy.value && repoAction.value === 'publish') {
    return
  }

  resetCommitDialog()
}

function handleCommitTypeSelect(value) {
  commitType.value = String(value || 'feat')
}

async function handleUpdateRepository() {
  if (isDirty.value) {
    notify('请先保存当前文件，再更新仓库。', 'error')
    return
  }

  repoBusy.value = true
  repoAction.value = 'update'
  const previousHead = repoHead.value

  try {
    const result = await http.post('/api/notes/repo/update', undefined, {
      timeout: REPO_ACTION_TIMEOUT
    })

    repoBranch.value = typeof result.branch === 'string' ? result.branch : repoBranch.value
    repoHead.value = typeof result.head === 'string' ? result.head : repoHead.value
    repoChangedFiles.value = Array.isArray(result.changedFiles)
      ? result.changedFiles.map(extractChangedFilePath).filter(Boolean)
      : []

    if (result.blockedByDirty) {
      await loadRepoStatus()

      if (result.behind > 0) {
        notify(
          `已获取远程更新，但仓库里还有本地修改，先提交后再更新。远程有 ${result.behind} 个新提交。`,
          'error'
        )
      } else {
        notify('仓库里有本地改动，先提交或清理后再更新。', 'error')
      }

      return
    }

    if (result.blockedByDiverged) {
      notify(
        `本地和远程都出现了新提交：本地 ${result.ahead ?? 0} 个，远程 ${result.behind ?? 0} 个。先推送或手动 rebase/merge 后再更新。`,
        'error'
      )
      return
    }

    if (result.updated) {
      await loadTree()
    }

    if (result.updated && activePath.value) {
      await openFile(activePath.value)
    }

    if (result.upToDate || (previousHead && previousHead === repoHead.value)) {
      notify('已经是最新仓库节点。')
    } else {
      notify(`仓库已更新到 ${repoHead.value || '最新节点'}。`)
    }
  } catch (error) {
    notify(error instanceof Error ? error.message : '更新仓库失败。', 'error')
  } finally {
    repoBusy.value = false
    repoAction.value = ''
  }
}

async function publishRepository() {
  const subject = commitSubject.value.trim()

  if (!subject) {
    notify('请先填写提交说明。', 'error')
    return
  }

  if (isDirty.value) {
    await saveActiveFile()

    if (isDirty.value) {
      notify('当前文件还没有保存成功，暂时不能提交 GitHub。', 'error')
      return
    }
  }

  repoBusy.value = true
  repoAction.value = 'publish'

  try {
    await http.post(
      '/api/notes/repo/publish',
      {
        message: commitPreviewMessage.value
      },
      {
        timeout: REPO_ACTION_TIMEOUT
      }
    )

    resetCommitDialog()
    notify('仓库提交并推送成功。')

    try {
      await loadRepoStatus()
    } catch {}
  } catch (error) {
    notify(error instanceof Error ? error.message : '提交 GitHub 失败。', 'error')
  } finally {
    repoBusy.value = false
    repoAction.value = ''
  }
}

function handleBackToTools() {
  router.push('/tools')
}

watch(
  () => isMobileView.value,
  () => {
    syncMobileDirectoryTriggerObserver()
  }
)

watch(
  () => [activePath.value, previewContent.value],
  () => {
    void startNoteAssetObserver()

    if (!isAndroidApp) {
      return
    }

    activeHeadingId.value = activeHeadings.value[0]?.id || ''
    void startActiveHeadingTracking()
  },
  {
    flush: 'post'
  }
)

watch(
  previewRef,
  () => {
    void startNoteAssetObserver()
  },
  {
    flush: 'post'
  }
)

onMounted(async () => {
  if (isAndroidApp && typeof window !== 'undefined') {
    window.addEventListener(
      ANDROID_TOGGLE_NOTES_DIRECTORY_EVENT,
      handleAndroidDirectoryRequest
    )
  }

  if (!privateAppAvailable.value) {
    return
  }

  window.addEventListener('pointermove', handleSidebarResize)
  window.addEventListener('pointerup', stopSidebarResize)
  window.addEventListener('resize', syncSidebarWidthToLayout)
  syncViewportState()

  if (isAndroidApp) {
    const cacheState = await hydrateNotesFromAndroidCache()

    if (!cacheState.hasCachedContent) {
      loadError.value = `本机还没有${workspaceLabel}，请前往设置点击“更新笔记”。`
    }

    await nextTick()
    await syncMobileDirectoryTriggerObserver()
    syncSidebarWidthToLayout()
    await startActiveHeadingTracking()
    await restoreReadingPosition(activePath.value)

    return
  }

  try {
    await loadTree()
    await loadRepoStatus()

    if (activePath.value) {
      await openFile(activePath.value)
    }

    await nextTick()
    await syncMobileDirectoryTriggerObserver()
    syncSidebarWidthToLayout()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '读取文件列表失败，请确认服务端已经启动。'
  }
})

onBeforeUnmount(() => {
  flushReadingPosition(activePath.value)
  stopMobileDirectoryTriggerObserver()
  stopActiveHeadingTracking()
  releaseNoteAssetObjectUrls()

  if (typeof window !== 'undefined') {
    window.removeEventListener(
      ANDROID_TOGGLE_NOTES_DIRECTORY_EVENT,
      handleAndroidDirectoryRequest
    )
    window.removeEventListener('pointermove', handleSidebarResize)
    window.removeEventListener('pointerup', stopSidebarResize)
    window.removeEventListener('resize', syncSidebarWidthToLayout)
  }

  document.body.classList.remove('is-note-resizing')
})
</script>

<style scoped>
.notes-agent-theme {
  --mono-ink: #111827;
  --mono-copy: #374151;
  --mono-muted: #6b7280;
  --mono-line: rgba(17, 24, 39, 0.08);
  --mono-line-strong: rgba(17, 24, 39, 0.14);
  --mono-soft: #f6f7f9;
  --mono-soft-strong: #eceff3;
  --mono-surface: #ffffff;
  position: relative;
  isolation: isolate;
  color: var(--mono-ink);
}

.notes-agent-theme::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: #f7f8fa;
}

.notes-agent-theme :deep(.app-header),
.notes-agent-theme :deep(.panel-card),
.notes-agent-theme :deep(.note-tree-pane),
.notes-agent-theme :deep(.note-view-pane),
.notes-agent-theme :deep(.note-dialog__panel),
.notes-agent-theme :deep(.note-mobile-directory-dialog__panel) {
  border-color: var(--mono-line);
  background: var(--mono-surface);
  box-shadow:
    0 18px 40px rgba(17, 24, 39, 0.07),
    0 3px 10px rgba(17, 24, 39, 0.04);
  backdrop-filter: none;
}

.notes-agent-theme :deep(.app-header h1),
.notes-agent-theme :deep(.panel-head h2),
.notes-agent-theme :deep(.note-view-toolbar h3),
.notes-agent-theme :deep(.note-dialog__head h3) {
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.page-tag),
.notes-agent-theme :deep(.section-tag) {
  color: var(--mono-muted);
}

.notes-agent-theme :deep(img.is-note-asset-loading) {
  min-height: 72px;
  border-radius: 12px;
  background:
    linear-gradient(100deg, #f0f1f2 20%, #fafafa 38%, #f0f1f2 56%);
  background-size: 220% 100%;
  animation: note-asset-loading 1.2s linear infinite;
}

.notes-agent-theme :deep(img.is-note-asset-error) {
  min-height: 72px;
  border: 1px dashed var(--mono-line-strong);
  border-radius: 12px;
  background: var(--mono-soft);
}

@keyframes note-asset-loading {
  to {
    background-position-x: -220%;
  }
}

.notes-agent-theme :deep(.welcome-text),
.notes-agent-theme :deep(.header-note),
.notes-agent-theme :deep(.empty-state),
.notes-agent-theme :deep(.note-view-status),
.notes-agent-theme :deep(.note-view-updated),
.notes-agent-theme :deep(.note-dialog__copy),
.notes-agent-theme :deep(.note-dialog__preview) {
  color: var(--mono-muted);
}

.notes-agent-theme :deep(.primary-btn),
.notes-agent-theme :deep(.secondary-btn),
.notes-agent-theme :deep(.ghost-btn),
.notes-agent-theme :deep(.note-mobile-directory-trigger) {
  border-radius: 14px;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.notes-agent-theme :deep(.primary-btn) {
  color: #ffffff;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  box-shadow: 0 14px 26px rgba(17, 24, 39, 0.16);
}

.notes-agent-theme :deep(.primary-btn:hover) {
  box-shadow: 0 18px 34px rgba(17, 24, 39, 0.2);
}

.notes-agent-theme :deep(.secondary-btn),
.notes-agent-theme :deep(.ghost-btn),
.notes-agent-theme :deep(.note-mobile-directory-trigger) {
  color: var(--mono-copy);
  border: 1px solid var(--mono-line);
  background: var(--mono-soft);
}

.notes-agent-theme :deep(.secondary-btn:hover),
.notes-agent-theme :deep(.ghost-btn:hover),
.notes-agent-theme :deep(.note-mobile-directory-trigger:hover) {
  border-color: var(--mono-line-strong);
  background: var(--mono-soft-strong);
}

.notes-agent-theme :deep(.note-browser-panel) {
  background: var(--mono-surface);
}

.notes-agent-theme :deep(.note-browser-layout) {
  background: var(--mono-soft);
}

.notes-agent-theme :deep(.note-tree-wrap),
.notes-agent-theme :deep(.note-tree-meta),
.notes-agent-theme :deep(.note-view-toolbar),
.notes-agent-theme :deep(.note-view-body) {
  border-color: var(--mono-line);
  background: var(--mono-soft);
}

.notes-agent-theme :deep(.note-tree-content::-webkit-scrollbar-thumb),
.notes-agent-theme :deep(.note-preview-shell .md-editor-previewOnly::-webkit-scrollbar-thumb) {
  background: rgba(17, 24, 39, 0.18);
}

.notes-agent-theme :deep(.note-tree-button),
.notes-agent-theme :deep(.note-outline-button) {
  color: var(--mono-copy);
}

.notes-agent-theme :deep(.note-tree-button:hover),
.notes-agent-theme :deep(.note-outline-button:hover) {
  background: var(--mono-soft-strong);
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.note-tree-button--file.is-active) {
  color: var(--mono-ink);
  background: #e5e7eb;
  box-shadow: inset 3px 0 0 #111827;
}

.notes-agent-theme :deep(.note-tree-button__caret) {
  color: var(--mono-copy);
}

.notes-agent-theme :deep(.note-tree-button__icon--folder) {
  background: linear-gradient(180deg, #6b7280 0%, #374151 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.notes-agent-theme :deep(.note-tree-button__icon--folder::before) {
  background: #9ca3af;
}

.notes-agent-theme :deep(.note-tree-button__icon--file) {
  border-color: rgba(17, 24, 39, 0.24);
  background: var(--mono-soft-strong);
}

.notes-agent-theme :deep(.note-tree-button__icon--file::before) {
  background: rgba(17, 24, 39, 0.22);
}

.notes-agent-theme :deep(.note-mode-switch),
.notes-agent-theme :deep(.note-sidebar-switch) {
  background: var(--mono-soft-strong);
}

.notes-agent-theme :deep(.note-mode-switch__button),
.notes-agent-theme :deep(.note-sidebar-switch__button) {
  color: var(--mono-copy);
}

.notes-agent-theme :deep(.note-mode-switch__button.is-active),
.notes-agent-theme :deep(.note-sidebar-switch__button.is-active) {
  color: #ffffff;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  box-shadow: 0 10px 22px rgba(17, 24, 39, 0.16);
}

.notes-agent-theme :deep(.note-layout-resizer) {
  background: rgba(17, 24, 39, 0.08);
}

.notes-agent-theme :deep(.note-editor-shell .md-editor),
.notes-agent-theme :deep(.note-preview-shell .md-editor) {
  --md-color: #374151;
  --md-hover-color: #111827;
  --md-bk-color: #ffffff;
  --md-bk-color-outstand: #f6f7f9;
  --md-bk-hover-color: #eceff3;
  --md-border-color: rgba(17, 24, 39, 0.08);
  --md-border-hover-color: rgba(17, 24, 39, 0.18);
  --md-border-active-color: rgba(17, 24, 39, 0.38);
  border-color: var(--mono-line);
  background: var(--mono-surface);
}

.notes-agent-theme :deep(.note-editor-shell .md-editor-toolbar-wrapper),
.notes-agent-theme :deep(.note-editor-shell .md-editor-footer) {
  background: var(--mono-soft);
  border-color: var(--mono-line);
}

.notes-agent-theme :deep(.note-preview-shell .md-editor-preview),
.notes-agent-theme :deep(.note-markdown) {
  color: var(--mono-copy);
}

.notes-agent-theme :deep(.note-preview-shell .md-editor-preview strong),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview b),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview h1),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview h2),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview h3),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview h4),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview h5),
.notes-agent-theme :deep(.note-preview-shell .md-editor-preview h6),
.notes-agent-theme :deep(.note-markdown strong),
.notes-agent-theme :deep(.note-markdown b),
.notes-agent-theme :deep(.note-markdown h1),
.notes-agent-theme :deep(.note-markdown h2),
.notes-agent-theme :deep(.note-markdown h3),
.notes-agent-theme :deep(.note-markdown h4),
.notes-agent-theme :deep(.note-markdown h5),
.notes-agent-theme :deep(.note-markdown h6) {
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.note-preview-shell .md-editor-preview a),
.notes-agent-theme :deep(.note-markdown a) {
  color: var(--mono-ink);
  text-decoration-color: rgba(17, 24, 39, 0.3);
}

.notes-agent-theme :deep(.note-preview-shell .md-editor-preview blockquote),
.notes-agent-theme :deep(.note-markdown blockquote),
.notes-agent-theme :deep(.note-markdown thead th) {
  border-color: rgba(17, 24, 39, 0.2);
  background: var(--mono-soft);
}

.notes-agent-theme :deep(.note-markdown__task-checkbox) {
  accent-color: #111827;
}

.notes-agent-theme :deep(.note-commit-field__input) {
  border-color: var(--mono-line);
  background: var(--mono-surface);
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.note-commit-field__input:focus) {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.notes-agent-theme :deep(.note-mobile-directory-dialog),
.notes-agent-theme :deep(.note-dialog),
.notes-agent-theme :deep(.note-repo-update-dialog) {
  background: rgba(17, 24, 39, 0.32);
}

.notes-agent-theme :deep(.note-repo-update-dialog) {
  backdrop-filter: blur(14px);
}

.notes-agent-theme :deep(.note-repo-update-dialog__panel) {
  border-color: var(--mono-line);
  background: var(--mono-surface);
  box-shadow:
    0 28px 70px rgba(17, 24, 39, 0.18),
    0 4px 14px rgba(17, 24, 39, 0.08);
}

.notes-agent-theme :deep(.note-repo-update-dialog__panel::before),
.notes-agent-theme :deep(.note-repo-update-dialog__panel::after) {
  display: none;
}

.notes-agent-theme :deep(.note-repo-update-dialog__pulse--outer) {
  background: radial-gradient(circle, rgba(17, 24, 39, 0.08), transparent 68%);
}

.notes-agent-theme :deep(.note-repo-update-dialog__pulse--inner) {
  background: radial-gradient(circle, rgba(107, 114, 128, 0.1), transparent 66%);
}

.notes-agent-theme :deep(.note-repo-update-dialog__ring--outer) {
  border-color: rgba(17, 24, 39, 0.1);
  border-top-color: #111827;
  border-right-color: rgba(55, 65, 81, 0.72);
  box-shadow: 0 0 24px rgba(17, 24, 39, 0.08);
}

.notes-agent-theme :deep(.note-repo-update-dialog__ring--middle) {
  border-color: rgba(17, 24, 39, 0.08);
  border-bottom-color: #6b7280;
  border-left-color: rgba(107, 114, 128, 0.72);
}

.notes-agent-theme :deep(.note-repo-update-dialog__core) {
  background: linear-gradient(145deg, #111827 0%, #374151 100%);
  box-shadow:
    0 18px 34px rgba(17, 24, 39, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.notes-agent-theme :deep(.note-repo-update-dialog__content .section-tag) {
  color: var(--mono-muted);
}

.notes-agent-theme :deep(.note-repo-update-dialog__content h3) {
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.note-repo-update-dialog__copy) {
  color: var(--mono-muted);
}

.notes-agent-theme :deep(.note-repo-update-dialog__status) {
  border-color: var(--mono-line);
  background: var(--mono-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.notes-agent-theme :deep(.note-repo-update-dialog__status-line) {
  background: linear-gradient(90deg, rgba(17, 24, 39, 0.08), #111827, #6b7280, rgba(17, 24, 39, 0.1));
  background-size: 200% 100%;
}

.notes-agent-theme :deep(.note-repo-update-dialog__status-text) {
  color: var(--mono-copy);
}

/* Android keeps the application navigation fixed and gives the note reader its own scroll area. */
.notes-agent-theme--android {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: calc(100dvh - var(--android-bottom-nav-space, 84px));
  min-height: 0;
  gap: 8px;
  padding:
    max(18px, var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))
    8px
    0;
  overflow: hidden;
  background: var(--android-canvas, #f2f3f0);
}

:global(html[data-android-theme='warm']) .notes-agent-theme--android {
  --mono-ink: var(--android-ink);
  --mono-copy: var(--android-copy);
  --mono-muted: var(--android-muted);
  --mono-line: color-mix(in srgb, var(--android-ink) 9%, transparent);
  --mono-line-strong: color-mix(in srgb, var(--android-ink) 16%, transparent);
  --mono-soft: var(--android-surface-soft);
  --mono-soft-strong: var(--android-surface-muted);
  --mono-surface: var(--android-surface);
}

:global(html[data-android-theme='warm']) .notes-agent-theme--android :deep(.primary-btn),
:global(html[data-android-theme='warm']) .notes-agent-theme--android :deep(.note-mode-switch__button.is-active),
:global(html[data-android-theme='warm']) .notes-agent-theme--android :deep(.note-sidebar-switch__button.is-active) {
  color: var(--android-accent-contrast);
  background: linear-gradient(
    135deg,
    var(--android-accent) 0%,
    color-mix(in srgb, var(--android-accent) 76%, #3f2c20) 100%
  );
  box-shadow: 0 12px 24px var(--android-accent-shadow);
}

:global(html[data-android-theme='warm']) .notes-agent-theme--android :deep(.note-tree-button--file.is-active) {
  color: var(--android-ink);
  background: var(--android-accent-soft);
  box-shadow: inset 3px 0 0 var(--android-accent);
}

:global(html[data-android-theme='warm']) .notes-agent-theme--android :deep(.note-tree-button__icon--folder) {
  background: linear-gradient(180deg, #b18462 0%, var(--android-accent) 100%);
}

.notes-agent-theme--android::before {
  background: var(--android-canvas, #f2f3f0);
}

.notes-agent-theme--android .note-browser-panel {
  min-width: 0;
  min-height: 0;
  flex: 1;
  gap: 7px;
  padding: 5px;
  overflow: hidden;
  border: 1px solid var(--android-line, #dedfdb);
  border-bottom: 0;
  border-radius: 16px 16px 0 0;
  background: var(--android-surface, #fdfdfc);
  box-shadow: 0 8px 24px rgba(31, 35, 32, 0.05);
}

.notes-agent-theme--android .note-browser-panel > .panel-head {
  min-height: 34px;
  flex: 0 0 auto;
  align-items: center;
  margin: 0;
}

.notes-agent-theme--android .note-panel-actions {
  width: auto;
  display: flex;
  justify-content: flex-start;
}

.notes-agent-theme--android .note-mobile-directory-trigger {
  width: auto;
  min-height: 34px;
  gap: 7px;
  padding: 7px 11px;
  border-radius: 11px;
  font-size: 0.82rem;
}

.notes-agent-theme--android .note-workspace-shell,
.notes-agent-theme--android .note-workspace-page,
.notes-agent-theme--android .note-browser-layout {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.notes-agent-theme--android .note-browser-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  align-content: stretch;
  background: transparent;
}

.notes-agent-theme--android .note-layout-resizer {
  display: none;
}

.notes-agent-theme--android .note-view-pane {
  min-width: 0;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: transparent;
  box-shadow: none;
}

.notes-agent-theme--android .note-view-toolbar {
  flex: 0 0 auto;
  gap: 8px;
}

.notes-agent-theme--android .note-view-title-bar {
  min-height: 32px;
  align-items: center;
}

.notes-agent-theme--android .note-view-title {
  min-width: 0;
  gap: 2px;
}

.notes-agent-theme--android .note-view-toolbar h3 {
  max-width: 100%;
  overflow: hidden;
  font-size: 1.05rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-agent-theme--android .note-view-updated {
  font-size: 0.72rem;
}

.notes-agent-theme--android .note-view-title-bar .note-view-mobile-action {
  min-height: 30px;
  padding: 7px 10px;
  border-radius: 10px;
}

.notes-agent-theme--android .note-view-status {
  flex: 0 0 auto;
  font-size: 0.78rem;
}

.notes-agent-theme--android .note-view-body {
  min-width: 0;
  max-width: 100%;
  min-height: 0 !important;
  overflow: hidden;
  border-radius: 12px;
  background: var(--android-surface-high, #ffffff);
}

.notes-agent-theme--android .note-editor-shell,
.notes-agent-theme--android .note-preview-shell,
.notes-agent-theme--android :deep(.note-preview-shell .md-editor),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-content),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-content-wrapper),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-previewOnly),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview-wrapper) {
  min-width: 0;
  max-width: 100%;
  height: 100%;
  min-height: 0;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor) {
  border: 0;
  border-radius: 12px;
  background: var(--android-surface-high, #ffffff);
  box-shadow: none;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-previewOnly),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview-wrapper) {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
  scrollbar-gutter: auto;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 14px 14px 28px;
  color: var(--android-text-strong, #303632);
  background: var(--android-surface-high, #ffffff);
  background-image: none;
  font-size: 0.9rem;
  line-height: 1.56;
  overflow-wrap: anywhere;
  word-break: normal;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview > :first-child) {
  margin-top: 0;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h1),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h2),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h3),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h4),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h5),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h6) {
  padding: 0;
  margin: 1.15em 0 0.55em;
  line-height: 1.32;
  text-align: left;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h1) {
  font-size: 1.36rem;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h2) {
  font-size: 1.18rem;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview h3) {
  font-size: 1.03rem;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview p) {
  margin: 0.5em 0;
  line-height: 1.56;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview ul),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview ol) {
  margin: 0.58em 0;
  padding-inline-start: 1.35em;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview li) {
  margin: 0.14em 0;
  line-height: 1.52;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview blockquote) {
  margin: 0.75em 0;
  padding: 0.55em 0.8em;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-code),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview pre),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview table) {
  margin-block: 0.75em;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview table) {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-code pre code) {
  padding: 0.78em 0.88em;
  font-size: 0.8rem;
  line-height: 1.5;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-code pre code),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-code-block) {
  overflow: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-code pre code::-webkit-scrollbar),
.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-code-block::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.notes-agent-theme--android.notes-agent-theme--light-code :deep(.note-preview-shell .md-editor-preview) {
  --md-theme-code-block-color: #24292f;
  --md-theme-code-block-bg-color: #ffffff;
  --md-theme-code-before-bg-color: #f6f8fa;
  --md-theme-code-copy-tips-color: #24292f;
  --md-theme-code-copy-tips-bg-color: #ffffff;
  --md-theme-code-active-color: #0969da;
}

.notes-agent-theme--android.notes-agent-theme--light-code :deep(.note-preview-shell .md-editor-code) {
  overflow: hidden;
  border: 1px solid #d8dee4;
  border-radius: 6px;
  background: #ffffff;
}

.notes-agent-theme--android.notes-agent-theme--light-code :deep(.note-preview-shell .md-editor-code-head) {
  color: #57606a;
  box-shadow: inset 0 -1px #d8dee4;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-scrn span[rn-wrapper]) {
  display: none;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview .md-editor-scrn pre code) {
  padding-inline-start: 0.88em !important;
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-preview hr) {
  margin: 1.1em 0;
}

.notes-agent-theme--android .note-view-empty {
  min-height: 100%;
  padding: 18px;
  font-size: 0.88rem;
  line-height: 1.65;
  text-align: center;
}

.notes-agent-theme--android :deep(.note-dialog),
.notes-agent-theme--android .note-repo-update-dialog {
  inset: 0;
  padding:
    max(18px, var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))
    8px
    max(20px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
}

.note-mobile-directory-dialog--android {
  inset:
    0
    0
    var(--android-bottom-nav-space, 84px)
    0;
  justify-content: center;
  align-items: flex-end;
  padding: 0;
  z-index: 20020;
  isolation: isolate;
  overflow: hidden;
  overscroll-behavior: contain;
  background: rgba(20, 24, 22, 0.34);
  backdrop-filter: blur(2px);
}

.notes-agent-theme--android :deep(.note-preview-shell .md-editor-code-head) {
  z-index: 2;
}

.note-mobile-directory-dialog--android .note-mobile-directory-dialog__panel {
  width: 100%;
  max-width: none;
  height: min(78dvh, 720px);
  max-height: calc(100dvh - var(--android-bottom-nav-space, 84px) - 46px);
  gap: 10px;
  padding:
    16px
    14px
    max(16px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));
  border-width: 1px 0 0;
  border-color: var(--android-line, #dedfdb);
  border-radius: 24px 24px 0 0;
  color: #343a36;
  background: var(--android-surface, #fdfdfc);
  box-shadow: 0 -18px 48px rgba(20, 24, 22, 0.2);
  transform: none;
  transition: none;
  will-change: auto;
}

.note-mobile-directory-dialog--android .note-mobile-directory-dialog__body,
.note-mobile-directory-dialog--android .note-tree-content--dialog {
  min-height: 0;
  flex: 1;
}

.note-mobile-directory-dialog--android .note-tree-content--dialog {
  max-height: none;
  padding-right: 3px;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.note-mobile-directory-dialog--android .note-tree-meta--dialog {
  border: 0;
  background: transparent;
}

.note-mobile-directory-dialog--android .note-sidebar-switch {
  padding: 4px;
  border: 1px solid #e2e4e0;
  background: #eff0ed;
}

.note-mobile-directory-dialog--android .note-sidebar-switch__button {
  padding: 8px 11px;
  color: #59615c;
  font-size: 0.82rem;
  background: transparent;
  box-shadow: none;
}

.note-mobile-directory-dialog--android .note-sidebar-switch__button.is-active {
  color: #ffffff;
  background: #353a37;
  box-shadow: 0 6px 14px rgba(35, 40, 37, 0.13);
}

.note-mobile-directory-dialog--android :deep(.note-tree-button),
.note-mobile-directory-dialog--android .note-outline-button {
  color: #3f4742;
  border-color: transparent;
}

.note-mobile-directory-dialog--android :deep(.note-tree-button:hover),
.note-mobile-directory-dialog--android .note-outline-button:hover {
  color: #252a27;
  background: #eff0ed;
}

.note-mobile-directory-dialog--android .note-outline-button.is-current {
  color: #202522;
  font-weight: 700;
  background: #dfe2de;
  border-radius: 9px;
  box-shadow: none;
}

.note-mobile-directory-dialog--android :deep(.note-tree-button--file.is-active) {
  color: #262b28;
  background: #e3e5e2;
  box-shadow: inset 3px 0 0 #4b514d;
}

.note-mobile-directory-dialog--android :deep(.note-tree-button__caret) {
  color: #69716c;
}

.note-mobile-directory-dialog--android :deep(.note-tree-button__icon--folder) {
  background: linear-gradient(180deg, #737b76 0%, #505752 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.note-mobile-directory-dialog--android :deep(.note-tree-button__icon--folder::before) {
  background: #a9afab;
}

.note-mobile-directory-dialog--android :deep(.note-tree-button__icon--file) {
  border-color: #b8bdb9;
  background: #f3f4f2;
}

.note-mobile-directory-dialog--android :deep(.note-tree-button__icon--file::before) {
  background: #c8ccc9;
}

.note-mobile-directory-dialog--android .note-tree-content::-webkit-scrollbar-thumb {
  background: #b8bdb9;
}

.note-mobile-directory-dialog--android .empty-state {
  color: #7a817c;
}

.note-mobile-directory-enter-active.note-mobile-directory-dialog--android,
.note-mobile-directory-leave-active.note-mobile-directory-dialog--android {
  transition: opacity 180ms ease;
}

.note-mobile-directory-enter-from.note-mobile-directory-dialog--android,
.note-mobile-directory-leave-to.note-mobile-directory-dialog--android {
  opacity: 0;
}

.note-mobile-directory-enter-from.note-mobile-directory-dialog--android .note-mobile-directory-dialog__panel,
.note-mobile-directory-leave-to.note-mobile-directory-dialog--android .note-mobile-directory-dialog__panel {
  opacity: 1;
  transform: none;
}

.notes-agent-theme--android :deep(.note-dialog__panel),
.notes-agent-theme--android .note-repo-update-dialog__panel {
  width: 100%;
  max-width: 520px;
  max-height: 100%;
  overflow-y: auto;
  border-radius: 18px;
}
</style>
