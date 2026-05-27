<template>
  <main v-if="privateAppAvailable" class="display-layout display-layout--wide note-display-layout notes-agent-theme">
    <NoteWorkspaceTassel
      v-if="showDesktopWorkspaceSwitch"
      :active-view="desktopWorkspaceView"
      @toggle="toggleDesktopWorkspace"
    />

    <AppHeader
      tag="笔记页"
      title="仓库笔记浏览"
      description=""
      :show-user="false"
      logout-label="返回选择"
      @logout="handleBackToTools"
    />

    <button
      v-if="showStickyMobileDirectoryTrigger"
      type="button"
      class="note-mobile-directory-trigger note-mobile-directory-trigger--floating"
      aria-controls="note-mobile-directory-dialog"
      aria-label="打开笔记目录"
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
      <div class="panel-head">
        <div>
          <p class="section-tag">{{ workspaceSectionTag }}</p>
        </div>

        <div class="note-panel-actions">
          <button
            v-if="isMobileView"
            ref="mobileDirectoryTriggerRef"
            type="button"
            class="note-mobile-directory-trigger"
            :aria-expanded="String(mobileDirectoryVisible)"
            aria-controls="note-mobile-directory-dialog"
            aria-label="打开笔记目录"
            @click="openMobileDirectory"
          >
            <span class="note-mobile-directory-trigger__bars" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span class="note-mobile-directory-trigger__text">目录</span>
          </button>

          <div
            v-if="isMobileView"
            class="note-workspace-switch"
            role="tablist"
            aria-label="工作区切换"
          >
            <button
              type="button"
              class="note-workspace-switch__button"
              :class="{ 'is-active': activeWorkspaceView === 'notes' }"
              @click="handleDesktopWorkspaceChange('notes')"
            >
              笔记
            </button>
            <button
              type="button"
              class="note-workspace-switch__button"
              :class="{ 'is-active': activeWorkspaceView === 'ai' }"
              @click="handleDesktopWorkspaceChange('ai')"
            >
              AI
            </button>
          </div>

          <div v-if="!isMobileView && activeWorkspaceView === 'notes'" class="note-repo-actions">
            <button
              type="button"
              class="secondary-btn"
              :disabled="repoBusy"
              @click="handleUpdateRepository"
            >
              {{ repoUpdateDialogVisible ? '更新中...' : '更新仓库' }}
            </button>
            <button
              type="button"
              class="primary-btn"
              :disabled="repoBusy"
              @click="openCommitDialog"
            >
              提交 GitHub
            </button>
          </div>
        </div>
      </div>

      <div class="note-workspace-shell">
        <Transition :name="workspaceTransitionName" mode="out-in">
          <div
            v-if="activeWorkspaceView === 'notes'"
            key="notes"
            class="note-workspace-page note-workspace-page--notes"
          >
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
                <div class="note-view-toolbar">
                  <div>
                    <p class="section-tag">当前文件</p>
                    <div class="note-view-title-bar">
                      <div class="note-view-title">
                        <h3>{{ activeFileTitle }}</h3>
                        <span v-if="activeUpdatedAtLabel" class="note-view-updated">
                          最近保存：{{ activeUpdatedAtLabel }}
                        </span>
                      </div>

                      <button
                        v-if="isMobileView"
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
                      preview-theme="smart-blue"
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
                      preview-theme="smart-blue"
                      code-theme="github"
                      :model-value="previewContent"
                      :md-heading-id="resolveMarkdownHeadingId"
                      :sanitize="sanitizeMarkdownHtml"
                      :no-mermaid="true"
                      :no-katex="true"
                      :no-echarts="true"
                    />
                  </div>

                  <p v-else class="empty-state note-view-empty">请选择左侧 Markdown 文件查看内容。</p>
                </div>
              </section>
            </div>
          </div>

          <NoteAiWorkspace
            v-else
            key="ai"
            class="note-workspace-page note-workspace-page--ai"
            :active-path="activePath"
            :active-file-title="activeFileTitle"
          />
        </Transition>
      </div>
    </section>

    <Transition name="note-mobile-directory">
      <div
        v-if="isMobileView && mobileDirectoryVisible"
        class="note-mobile-directory-dialog"
        @click.self="closeMobileDirectory"
      >
        <section
          id="note-mobile-directory-dialog"
          class="note-mobile-directory-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-label="笔记目录"
        >
          <div class="note-mobile-directory-dialog__head">
            <div>
              <p class="section-tag">目录</p>
              <h3>笔记目录</h3>
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
import AppHeader from '../../components/AppHeader/AppHeader.vue'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import CommitDialog from '../../components/notes/CommitDialog/CommitDialog.vue'
import NoteAiWorkspace from '../../components/notes/NoteAiWorkspace/NoteAiWorkspace.vue'
import NoteTreeNode from '../../components/notes/NoteTreeNode/NoteTreeNode.vue'
import NoteWorkspaceTassel from '../../components/notes/NoteWorkspaceTassel/NoteWorkspaceTassel.vue'
import {
  NOTE_ACTIVE_PATH_KEY,
  NOTE_DESKTOP_WORKSPACE_KEY,
  NOTE_OPEN_FOLDERS_KEY,
  NOTE_SIDEBAR_MODE_KEY,
  NOTE_SIDEBAR_WIDTH_KEY
} from '../../constants/storage'
import {
  buildMarkdownHeadingId,
  extractMarkdownHeadings,
  normalizeMarkdownSource
} from '../../utils/markdownPreview'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import { rewriteRenderedNoteHtml } from '../../utils/noteRepo'
import http from '../../utils/http'

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

const DESKTOP_WORKSPACE_ORDER = ['notes', 'ai']
const REPO_ACTION_TIMEOUT = 60000
const MOBILE_PREVIEW_BREAKPOINT = 900
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

function writeStorageValue(key, value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, value)
}

function writeStorageArray(key, value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeDesktopWorkspaceView(value) {
  return value === 'quiz' || value === 'ai' ? 'ai' : 'notes'
}

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const files = ref([])
const activePath = ref(readStorageValue(NOTE_ACTIVE_PATH_KEY))
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
const openFolders = ref(new Set(readStorageArray(NOTE_OPEN_FOLDERS_KEY)))
const sidebarMode = ref(readStorageValue(NOTE_SIDEBAR_MODE_KEY, 'tree') === 'titles' ? 'titles' : 'tree')
const desktopWorkspaceView = ref(normalizeDesktopWorkspaceView(readStorageValue(NOTE_DESKTOP_WORKSPACE_KEY, 'notes')))
const workspaceTransitionDirection = ref('next')
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

const tree = computed(() => buildTree(files.value))
const openFolderList = computed(() => [...openFolders.value])
const previewContent = computed(() => normalizeMarkdownSource(draftContent.value))
const activeHeadings = computed(() => extractMarkdownHeadings(previewContent.value))
const browserLayoutStyle = computed(() => ({ '--note-sidebar-width': `${sidebarWidth.value}px` }))
const showDesktopWorkspaceSwitch = computed(() => !isMobileView.value)
const activeWorkspaceView = computed(() => desktopWorkspaceView.value)
const repoUpdateDialogVisible = computed(() => repoBusy.value && repoAction.value === 'update')
const workspaceTransitionName = computed(() => workspaceTransitionDirection.value === 'prev' ? 'note-workspace-prev' : 'note-workspace-next')
const workspaceSectionTag = computed(() => activeWorkspaceView.value === 'ai' ? 'AI 提问' : '仓库文件')
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

  return '当前仓库里还没有 Markdown 文件。'
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

function buildTree(fileList) {
  const rootNodes = []
  const folderMap = new Map()

  fileList.forEach((file) => {
    const segments = file.path.split('/')
    let parentPath = ''
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
  writeStorageValue(NOTE_ACTIVE_PATH_KEY, activePath.value)
}

function persistOpenFolders() {
  writeStorageArray(NOTE_OPEN_FOLDERS_KEY, [...openFolders.value])
}

function persistSidebarWidth() {
  writeStorageValue(NOTE_SIDEBAR_WIDTH_KEY, String(Math.round(sidebarWidth.value)))
}

function persistDesktopWorkspaceView() {
  writeStorageValue(NOTE_DESKTOP_WORKSPACE_KEY, desktopWorkspaceView.value)
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

function setSidebarMode(mode) {
  sidebarMode.value = mode === 'titles' ? 'titles' : 'tree'
  writeStorageValue(NOTE_SIDEBAR_MODE_KEY, sidebarMode.value)
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

function handleDesktopWorkspaceChange(nextView) {
  const normalizedView = normalizeDesktopWorkspaceView(nextView)

  if (desktopWorkspaceView.value === normalizedView) {
    return
  }

  const currentIndex = DESKTOP_WORKSPACE_ORDER.indexOf(desktopWorkspaceView.value)
  const nextIndex = DESKTOP_WORKSPACE_ORDER.indexOf(normalizedView)

  workspaceTransitionDirection.value = nextIndex < currentIndex ? 'prev' : 'next'
  stopSidebarResize()

  if (commitDialogVisible.value && !(repoBusy.value && repoAction.value === 'publish')) {
    resetCommitDialog()
  }

  closeMobileDirectory()
  desktopWorkspaceView.value = normalizedView
  persistDesktopWorkspaceView()
}

function toggleDesktopWorkspace() {
  handleDesktopWorkspaceChange(desktopWorkspaceView.value === 'ai' ? 'notes' : 'ai')
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

async function loadTree() {
  const data = await http.get('/api/notes/tree')
  const nextFiles = Array.isArray(data.files) ? data.files : []
  const nextTree = buildTree(nextFiles)
  const validFolderPaths = new Set(collectFolderPaths(nextTree))

  files.value = nextFiles
  openFolders.value = new Set(
    [...openFolders.value].filter((folderPath) => validFolderPaths.has(folderPath))
  )

  if (!nextFiles.length) {
    activePath.value = ''
    activeContent.value = ''
    draftContent.value = ''
    activeUpdatedAt.value = ''
    persistActivePath()
    persistOpenFolders()
    return
  }

  const hasStoredPath = nextFiles.some((file) => file.path === activePath.value)

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

async function loadRepoStatus() {
  const data = await http.get('/api/notes/repo/status')
  repoBranch.value = typeof data.branch === 'string' ? data.branch : ''
  repoHead.value = typeof data.head === 'string' ? data.head : ''
  repoChangedFiles.value = Array.isArray(data.changedFiles)
    ? data.changedFiles.map(extractChangedFilePath).filter(Boolean)
    : []
}

async function openFile(path, { showSuccess = false } = {}) {
  loadingFile.value = true
  loadError.value = ''
  saveError.value = ''

  try {
    const data = await http.get('/api/notes/file', {
      params: {
        path
      }
    })

    activePath.value = typeof data.path === 'string' ? data.path : path
    activeContent.value = typeof data.content === 'string' ? data.content : ''
    draftContent.value = activeContent.value
    activeUpdatedAt.value = typeof data.updatedAt === 'string' ? data.updatedAt : ''
    persistActivePath()
    ensureActivePathFoldersOpen(activePath.value)

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

  await openFile(path)
  closeMobileDirectory()
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

onMounted(async () => {
  if (!privateAppAvailable.value) {
    return
  }

  window.addEventListener('pointermove', handleSidebarResize)
  window.addEventListener('pointerup', stopSidebarResize)
  window.addEventListener('resize', syncSidebarWidthToLayout)
  syncViewportState()

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
  stopMobileDirectoryTriggerObserver()

  if (typeof window !== 'undefined') {
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
.notes-agent-theme :deep(.note-ai-view__panel),
.notes-agent-theme :deep(.note-ai-view__toolbar),
.notes-agent-theme :deep(.note-ai-view__chat-form),
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
.notes-agent-theme :deep(.note-ai-view__panel h4),
.notes-agent-theme :deep(.note-ai-view__chat-title),
.notes-agent-theme :deep(.note-dialog__head h3) {
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.page-tag),
.notes-agent-theme :deep(.section-tag),
.notes-agent-theme :deep(.note-ai-view__toolbar-tag) {
  color: var(--mono-muted);
}

.notes-agent-theme :deep(.welcome-text),
.notes-agent-theme :deep(.header-note),
.notes-agent-theme :deep(.empty-state),
.notes-agent-theme :deep(.note-view-status),
.notes-agent-theme :deep(.note-view-updated),
.notes-agent-theme :deep(.note-ai-view__status),
.notes-agent-theme :deep(.note-ai-view__toolbar-feedback),
.notes-agent-theme :deep(.note-dialog__copy),
.notes-agent-theme :deep(.note-dialog__preview) {
  color: var(--mono-muted);
}

.notes-agent-theme :deep(.primary-btn),
.notes-agent-theme :deep(.secondary-btn),
.notes-agent-theme :deep(.ghost-btn),
.notes-agent-theme :deep(.note-mobile-directory-trigger),
.notes-agent-theme :deep(.note-ai-view__history-button),
.notes-agent-theme :deep(.note-ai-view__chat-clear) {
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
.notes-agent-theme :deep(.note-mobile-directory-trigger),
.notes-agent-theme :deep(.note-ai-view__history-button),
.notes-agent-theme :deep(.note-ai-view__chat-clear) {
  color: var(--mono-copy);
  border: 1px solid var(--mono-line);
  background: var(--mono-soft);
}

.notes-agent-theme :deep(.secondary-btn:hover),
.notes-agent-theme :deep(.ghost-btn:hover),
.notes-agent-theme :deep(.note-mobile-directory-trigger:hover),
.notes-agent-theme :deep(.note-ai-view__history-button:hover),
.notes-agent-theme :deep(.note-ai-view__chat-clear:hover) {
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
.notes-agent-theme :deep(.note-view-body),
.notes-agent-theme :deep(.note-ai-view__question-stage),
.notes-agent-theme :deep(.note-ai-view__chat-shell),
.notes-agent-theme :deep(.note-ai-view__parameter-panel) {
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

.notes-agent-theme :deep(.note-workspace-switch),
.notes-agent-theme :deep(.note-mode-switch),
.notes-agent-theme :deep(.note-sidebar-switch) {
  background: var(--mono-soft-strong);
}

.notes-agent-theme :deep(.note-workspace-switch__button),
.notes-agent-theme :deep(.note-mode-switch__button),
.notes-agent-theme :deep(.note-sidebar-switch__button) {
  color: var(--mono-copy);
}

.notes-agent-theme :deep(.note-workspace-switch__button.is-active),
.notes-agent-theme :deep(.note-mode-switch__button.is-active),
.notes-agent-theme :deep(.note-sidebar-switch__button.is-active),
.notes-agent-theme :deep(.note-ai-view__parameter-toggle.is-active) {
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

.notes-agent-theme :deep(.note-ai-view__model-input),
.notes-agent-theme :deep(.note-ai-view__chat-input),
.notes-agent-theme :deep(.note-commit-field__input) {
  border-color: var(--mono-line);
  background: var(--mono-surface);
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.note-ai-view__model-input:focus),
.notes-agent-theme :deep(.note-ai-view__chat-input:focus),
.notes-agent-theme :deep(.note-commit-field__input:focus) {
  border-color: rgba(17, 24, 39, 0.38);
  box-shadow: 0 0 0 4px rgba(17, 24, 39, 0.08);
}

.notes-agent-theme :deep(.note-ai-view__context-card),
.notes-agent-theme :deep(.note-ai-view__question-card),
.notes-agent-theme :deep(.note-ai-view__answer-card),
.notes-agent-theme :deep(.note-ai-view__chat-bubble),
.notes-agent-theme :deep(.note-ai-view__chat-loading),
.notes-agent-theme :deep(.note-ai-view__chat-model-badge) {
  border-color: var(--mono-line);
  background: var(--mono-surface);
  color: var(--mono-copy);
}

.notes-agent-theme :deep(.note-ai-view__chat-item--user .note-ai-view__chat-bubble) {
  background: var(--mono-soft-strong);
}

.notes-agent-theme :deep(.note-ai-view__parameter-field) {
  border-color: var(--mono-line);
  background: var(--mono-surface);
  --parameter-accent: #111827;
  --parameter-accent-soft: rgba(17, 24, 39, 0.14);
  --parameter-accent-glow: rgba(17, 24, 39, 0.18);
}

.notes-agent-theme :deep(.note-workspace-tassel) {
  color: var(--mono-ink);
  filter: drop-shadow(0 14px 20px rgba(17, 24, 39, 0.12));
}

.notes-agent-theme :deep(.note-workspace-tassel__cord),
.notes-agent-theme :deep(.note-workspace-tassel__head),
.notes-agent-theme :deep(.note-workspace-tassel.is-ai .note-workspace-tassel__head),
.notes-agent-theme :deep(.note-workspace-tassel__fringe),
.notes-agent-theme :deep(.note-workspace-tassel.is-ai .note-workspace-tassel__fringe) {
  border-color: var(--mono-line);
  background: linear-gradient(180deg, #ffffff 0%, #e5e7eb 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 -5px 0 rgba(17, 24, 39, 0.08),
    0 12px 18px rgba(17, 24, 39, 0.12);
}

.notes-agent-theme :deep(.note-workspace-tassel__label) {
  color: var(--mono-ink);
}

.notes-agent-theme :deep(.note-mobile-directory-dialog),
.notes-agent-theme :deep(.note-dialog),
.notes-agent-theme :deep(.note-repo-update-dialog) {
  background: rgba(17, 24, 39, 0.32);
}
</style>
