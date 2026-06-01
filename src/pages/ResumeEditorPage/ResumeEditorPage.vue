<template>
  <main class="resume-editor-page">
    <ResumeEditorToolbar
      v-model:zoom="zoom"
      :can-undo="canUndo"
      :draft-status="draftStatus"
      :zoom-options="zoomOptions"
      @add-page="addPage"
      @export-pdf="exportPdf"
      @reset="resetResume"
      @save="saveDraft"
      @undo="undoResume"
    />

    <div class="resume-editor-shell">
      <ResumeEditorSidebar
        :active-block="activeBlock"
        :dragging-section-key="draggingSectionKey"
        :module-navigator="moduleNavigator"
        :resume="resume"
        @add-education="addEducation"
        @add-experience="addExperience"
        @add-project="addProject"
        @add-skill="addSkill"
        @clear-section-drag="clearSectionDrag"
        @delete-section="deleteSection"
        @drop-section="dropSection"
        @move-section="moveSection"
        @select-module="selectModule"
        @select-navigator-child="selectNavigatorChild"
        @start-section-drag="startSectionDrag"
      />

      <ResumeEditorWorkspace
        :active-block="activeBlock"
        :dragging-section-key="draggingSectionKey"
        :paper-frame-style="paperFrameStyle"
        :paper-style="paperStyle"
        :resume="resume"
        :resume-pages="resumePages"
        :zoom-scale="zoomScale"
        @commit-boundary-resize="commitSnapshot"
        @clear-section-drag="clearSectionDrag"
        @drop-section="dropSection"
        @open-profile-editor="openProfileEditor"
        @open-module-editor="openModuleEditor"
        @resize-module-boundary="resizeModuleBoundary"
        @select-entry="selectEntry"
        @select-module="selectModule"
        @select-profile="selectProfile"
        @start-section-drag="startSectionDrag"
      />

      <Transition name="resume-inline-notice">
        <div v-if="resumeNotice" class="resume-inline-notice" role="status">
          <span>{{ resumeNotice }}</span>
        </div>
      </Transition>
    </div>

    <ResumeEditorModuleDialog
      :active-block="activeBlock"
      :open="Boolean(activeModuleDialogKey)"
      :resume="resume"
      :section="activeModuleDialogSection"
      @add-education="addEducationFromDialog"
      @close="closeModuleEditor"
      @commit-snapshot="commitSnapshot"
      @remove-entry="removeEntry"
      @select-entry="selectEntry"
      @update-rich-text="updateRichTextSection"
    />

    <ResumeEditorProfileDialog
      :open="profileDialogOpen"
      :profile="resume.profile"
      @close="closeProfileEditor"
      @commit-snapshot="commitSnapshot"
    />
  </main>
</template>
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ResumeEditorModuleDialog from './components/ResumeEditorModuleDialog.vue'
import ResumeEditorProfileDialog from './components/ResumeEditorProfileDialog.vue'
import ResumeEditorSidebar from './components/ResumeEditorSidebar.vue'
import ResumeEditorToolbar from './components/ResumeEditorToolbar.vue'
import ResumeEditorWorkspace from './components/ResumeEditorWorkspace.vue'

const RESUME_EDITOR_DRAFT_KEY = 'vibe-coding-resume-editor-draft'
const PAPER_WIDTH = 794
const PAPER_HEIGHT = 1123
const PDF_A4_WIDTH_PT = 595.28
const PDF_A4_HEIGHT_PT = 841.89
const PDF_EXPORT_SCALE = 3
const PDF_IMAGE_QUALITY = 0.98
const PDF_FILE_NAME = '\u7b80\u5386.pdf'
const PAGE_CONTENT_HEIGHT = 1040
const PAGE_TOP_SAFE_GAP = 34
const PAGE_BOTTOM_SAFE_GAP = 18
const PROFILE_BLOCK_HEIGHT = 178
const MODULE_BASE_HEIGHT = 84
const MODULE_CONTENT_INSET = 18
const MODULE_FLOW_GAP = 14
const MODULE_TITLE_HEIGHT = 38
const MODULE_CONTINUATION_PADDING = 10
const DEFAULT_MODULE_BOUNDS = Object.freeze({
  top: 22,
  right: 56,
  bottom: 22,
  left: 56
})
const MODULE_BOUND_LIMITS = Object.freeze({
  top: [-42, 40],
  right: [24, 180],
  bottom: [8, 460],
  left: [24, 180]
})

const sectionControls = [
  { key: 'education', title: '\u6559\u80b2', resumeTitle: '\u6559\u80b2\u7ecf\u5386', description: '\u5b66\u6821 / \u4e13\u4e1a / \u5b66\u5386 / \u65f6\u95f4' },
  { key: 'projects', title: '\u9879\u76ee', resumeTitle: '\u9879\u76ee\u7ecf\u5386', description: '\u5bcc\u6587\u672c\u5185\u5bb9' },
  { key: 'skills', title: '\u6280\u80fd', resumeTitle: '\u6280\u80fd\u6e05\u5355', description: '\u5bcc\u6587\u672c\u5185\u5bb9' },
  { key: 'experience', title: '\u5b9e\u4e60', resumeTitle: '\u5b9e\u4e60\u7ecf\u5386', description: '\u5bcc\u6587\u672c\u5185\u5bb9' }
]
const sectionMap = new Map(sectionControls.map((section) => [section.key, section]))
const defaultSectionOrder = sectionControls.map((section) => section.key)
const legacyDefaultSectionOrder = ['experience', 'projects', 'education', 'skills']
const dialogEditableSections = new Set(['education', 'projects', 'experience', 'skills'])
const richTextSectionKeys = new Set(['experience', 'projects', 'skills'])
const MIN_SPLIT_REMAINING_HEIGHT = 120
const MIN_BOUNDARY_CONTINUATION_HEIGHT = 44
const RICH_TEXT_SPLIT_TOLERANCE = 240
const zoomOptions = [70, 80, 90, 100, 110, 120]

const resume = ref(createDefaultResume())
const activeBlock = ref({ type: 'profile', key: 'profile', index: null })
const zoom = ref(90)
const historyStack = ref([])
const draftStatus = ref('')
const draggingSectionKey = ref('')
const activeModuleDialogKey = ref('')
const profileDialogOpen = ref(false)
const resumeNotice = ref('')
let draftStatusTimer = 0
let resumeNoticeTimer = 0

const zoomScale = computed(() => zoom.value / 100)
const canUndo = computed(() => historyStack.value.length > 1)
const moduleNavigator = computed(() =>
  normalizeSectionOrder(resume.value.sectionOrder)
    .filter((key) => resume.value.visibleSections[key])
    .map((key) => ({
      ...sectionMap.get(key),
      children: getSectionNavigatorChildren(key)
    }))
)
const visibleSectionBlocks = computed(() =>
  moduleNavigator.value.filter((section) => resume.value.visibleSections[section.key])
)
const resumePages = computed(() => {
  const pages = paginateSections(visibleSectionBlocks.value)
  const requestedPageCount = normalizePageCount(resume.value.pageCount)

  while (pages.length < requestedPageCount) {
    pages.push(createResumePage(false))
  }

  return pages.map((page, index) => ({
    ...page,
    number: index + 1
  }))
})
const paperFrameStyle = computed(() => ({
  width: `${Math.round(PAPER_WIDTH * zoomScale.value)}px`,
  height: `${Math.round(PAPER_HEIGHT * zoomScale.value)}px`
}))
const paperStyle = computed(() => ({
  transform: `scale(${zoomScale.value})`
}))
const activeModuleDialogSection = computed(() =>
  activeModuleDialogKey.value ? sectionMap.get(activeModuleDialogKey.value) || null : null
)

function createDefaultResume() {
  return {
    pageCount: 1,
    sectionOrder: [...defaultSectionOrder],
    visibleSections: {
      experience: true,
      projects: true,
      education: true,
      skills: true
    },
    moduleBounds: createDefaultModuleBounds(),
    profile: {
      name: '\u5218\u5b89',
      role: '\u524d\u7aef\u5f00\u53d1\u5de5\u7a0b\u5e08',
      phone: '138 0000 0000',
      email: 'liuan@example.com',
      location: '\u676d\u5dde'
    },
    richText: {
      experience:
        'Snowingress Studio | \u524d\u7aef\u5f00\u53d1\u5b9e\u4e60\u751f | 2025.07 - \u81f3\u4eca\n- \u8d1f\u8d23\u9875\u9762\u642d\u5efa\u3001\u5217\u8868\u7ba1\u7406\u3001\u7f16\u8f91\u4ea4\u4e92\u548c\u79fb\u52a8\u7aef\u9002\u914d\u3002\n- \u4f18\u5316\u56fe\u7247\u52a0\u8f7d\u548c\u63a5\u53e3\u8bf7\u6c42\u94fe\u8def\uff0c\u63d0\u5347\u5f02\u5e38\u72b6\u6001\u53ef\u8bfb\u6027\u3002',
      projects:
        '\u5728\u7ebf\u7b14\u8bb0\u4e0e AI \u95ee\u7b54\u5de5\u4f5c\u53f0 | \u4e2a\u4eba\u9879\u76ee | 2026.02 - 2026.05\n- \u5b9e\u73b0 Markdown \u6587\u4ef6\u6811\u3001\u9884\u89c8\u3001\u7f16\u8f91\u3001\u63d0\u4ea4\u4e0e AI \u51fa\u9898\u6d41\u7a0b\u3002\n- \u63a5\u5165\u540e\u53f0\u63a5\u53e3\uff0c\u7edf\u4e00\u5904\u7406\u9274\u6743\u3001\u5237\u65b0 token \u548c\u9519\u8bef\u63d0\u793a\u3002',
      skills:
        'Vue \u751f\u6001: \u719f\u6089 Vue2 / Vue3 \u5f00\u53d1\uff0c\u5177\u5907 Vue3 + TypeScript \u9879\u76ee\u5b9e\u8df5\u7ecf\u9a8c\uff0c\u719f\u6089 Composition API\u3001Pinia \u72b6\u6001\u7ba1\u7406\u53ca Vue Router \u8def\u7531\u914d\u7f6e\u3002\n\u5de5\u7a0b\u5316: \u719f\u6089 Vite \u9879\u76ee\u914d\u7f6e\u3001\u7ec4\u4ef6\u62c6\u5206\u548c\u524d\u7aef\u6784\u5efa\u6d41\u7a0b\u3002\n\u9875\u9762\u5b9e\u73b0: \u5173\u6ce8\u79fb\u52a8\u7aef\u9002\u914d\u3001\u4ea4\u4e92\u7ec6\u8282\u548c\u53ef\u7ef4\u62a4\u7684\u6837\u5f0f\u7ec4\u7ec7\u3002'
    },
    education: [
      {
        id: createId(),
        school: '\u67d0\u67d0\u5927\u5b66',
        major: '\u8f6f\u4ef6\u5de5\u7a0b',
        degree: '\u672c\u79d1',
        period: '2022.09 - 2026.06'
      }
    ]
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createDefaultModuleBounds() {
  return defaultSectionOrder.reduce((bounds, key) => {
    bounds[key] = { ...DEFAULT_MODULE_BOUNDS }
    return bounds
  }, {})
}

function normalizeSectionOrder(order) {
  if (isSameSectionOrder(order, legacyDefaultSectionOrder)) {
    return [...defaultSectionOrder]
  }

  const seen = new Set()
  const normalizedOrder = Array.isArray(order)
    ? order.filter((key) => {
        if (!sectionMap.has(key) || seen.has(key)) {
          return false
        }

        seen.add(key)
        return true
      })
    : []

  defaultSectionOrder.forEach((key) => {
    if (!seen.has(key)) {
      normalizedOrder.push(key)
    }
  })

  return normalizedOrder
}

function isSameSectionOrder(order, referenceOrder) {
  return (
    Array.isArray(order) &&
    order.length === referenceOrder.length &&
    order.every((key, index) => key === referenceOrder[index])
  )
}

function normalizeVisibleSections(visibleSections = {}) {
  return defaultSectionOrder.reduce((result, key) => {
    result[key] = visibleSections[key] !== false
    return result
  }, {})
}

function normalizeModuleBounds(moduleBounds = {}) {
  return defaultSectionOrder.reduce((result, key) => {
    result[key] = normalizeModuleBound(moduleBounds[key])
    return result
  }, {})
}

function normalizeModuleBound(bound = {}) {
  return Object.entries(DEFAULT_MODULE_BOUNDS).reduce((result, [edge, defaultValue]) => {
    result[edge] = clampNumber(bound?.[edge], MODULE_BOUND_LIMITS[edge][0], MODULE_BOUND_LIMITS[edge][1], defaultValue)
    return result
  }, {})
}

function clampNumber(value, min, max, fallback) {
  const numberValue = Number(value)
  const safeValue = Number.isFinite(numberValue) ? numberValue : fallback
  return Math.min(Math.max(Math.round(safeValue), min), max)
}

function normalizePageCount(pageCount) {
  const count = Number(pageCount)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1
}

function createResumePage(includeProfile) {
  return {
    includeProfile,
    sections: [],
    usedHeight: includeProfile ? PROFILE_BLOCK_HEIGHT : PAGE_TOP_SAFE_GAP
  }
}

function paginateSections(sections) {
  const pages = [createResumePage(true)]

  sections.forEach((section) => {
    if (richTextSectionKeys.has(section.key)) {
      paginateRichTextSection(pages, section)
      return
    }

    const sectionHeight = estimateSectionHeight(section.key)
    paginateWholeSection(pages, section, sectionHeight)
  })

  return pages.map(({ usedHeight, ...page }) => page)
}

function paginateWholeSection(pages, section, sectionHeight) {
  let currentPage = pages[pages.length - 1]

  if (shouldCreateNextPage(currentPage, sectionHeight)) {
    currentPage = createResumePage(false)
    pages.push(currentPage)
  }

  currentPage.sections.push(section)
  currentPage.usedHeight += sectionHeight
}

function paginateRichTextSection(pages, section) {
  let content = getRichTextSectionContent(section.key)
  let partIndex = 0

  if (!content) {
    paginateWholeSection(
      pages,
      { ...section, content: '', hideEmptyContent: false, isContinuation: false, partIndex: 0 },
      estimateRichTextSectionHeight(section.key, '', {
        isContinuation: false,
        continuesNext: false
      })
    )
    return
  }

  while (content) {
    let currentPage = pages[pages.length - 1]
    let isContinuation = partIndex > 0
    let availableHeight = getAvailablePageHeight(currentPage)
    const sectionHeight = estimateRichTextSectionHeight(section.key, content, {
      isContinuation,
      continuesNext: false
    })

    if (shouldCreateNextPage(currentPage, sectionHeight) && availableHeight < MIN_SPLIT_REMAINING_HEIGHT) {
      currentPage = createResumePage(false)
      pages.push(currentPage)
      isContinuation = partIndex > 0
      availableHeight = getAvailablePageHeight(currentPage)
    }

    const flowingSectionHeight = estimateRichTextSectionHeight(section.key, content, {
      isContinuation,
      continuesNext: true
    })
    const splitResult =
      sectionHeight > availableHeight
        ? flowingSectionHeight <= availableHeight
          ? {
              pageContent: content,
              restContent: '',
              carryBoundaryToNext: true,
              overflowHeight: sectionHeight - availableHeight
            }
          : splitRichTextContentForPage(section.key, content, availableHeight, { isContinuation })
        : { pageContent: content, restContent: '' }

    if (!splitResult.pageContent && currentPage.sections.length > 0) {
      currentPage = createResumePage(false)
      pages.push(currentPage)
      availableHeight = getAvailablePageHeight(currentPage)
      isContinuation = partIndex > 0
      const retrySplit = splitRichTextContentForPage(section.key, content, availableHeight, { isContinuation })
      splitResult.pageContent = retrySplit.pageContent
      splitResult.restContent = retrySplit.restContent
    }

    const pageContent = splitResult.pageContent || content
    const continuesNext = Boolean(splitResult.restContent || splitResult.carryBoundaryToNext)
    const estimatedPageHeight = estimateRichTextSectionHeight(section.key, pageContent, {
      isContinuation,
      continuesNext
    })
    const renderedHeight = continuesNext
      ? Math.min(estimatedPageHeight, availableHeight)
      : estimatedPageHeight
    currentPage.sections.push({
      ...section,
      content: pageContent,
      isContinuation,
      continuesNext,
      forcedHeight: continuesNext ? renderedHeight : null,
      partIndex
    })
    currentPage.usedHeight += renderedHeight

    if (splitResult.carryBoundaryToNext) {
      const nextPage = createResumePage(false)
      const continuationHeight = Math.min(
        Math.max(Math.ceil(splitResult.overflowHeight), MIN_BOUNDARY_CONTINUATION_HEIGHT),
        getAvailablePageHeight(nextPage)
      )
      nextPage.sections.push({
        ...section,
        content: '',
        isBoundaryContinuation: true,
        isContinuation: true,
        continuesNext: false,
        forcedHeight: continuationHeight,
        hideEmptyContent: true,
        partIndex: partIndex + 1
      })
      nextPage.usedHeight += continuationHeight + MODULE_FLOW_GAP
      pages.push(nextPage)
      return
    }

    if (!splitResult.restContent) {
      return
    }

    content = splitResult.restContent
    partIndex += 1
    pages.push(createResumePage(false))
  }
}

function shouldCreateNextPage(page, sectionHeight) {
  const pageHasContent = page.includeProfile || page.sections.length > 0
  return pageHasContent && page.usedHeight + sectionHeight + PAGE_BOTTOM_SAFE_GAP > PAGE_CONTENT_HEIGHT
}

function getAvailablePageHeight(page) {
  return Math.max(PAGE_CONTENT_HEIGHT - PAGE_BOTTOM_SAFE_GAP - page.usedHeight, 0)
}

function getRichTextSectionContent(key) {
  return String(resume.value.richText?.[key] || '').trim()
}

function splitRichTextContentForPage(key, content, availableHeight, options = {}) {
  const blocks = getRichTextRenderBlocks(content)
  const maxCandidateHeight = availableHeight + RICH_TEXT_SPLIT_TOLERANCE

  if (!blocks.length) {
    return { pageContent: content, restContent: '' }
  }

  const pageBlocks = []

  for (const block of blocks) {
    const candidateBlocks = [...pageBlocks, block]
    const candidateContent = joinRichTextRenderBlocks(candidateBlocks)

    if (
      estimateRichTextSectionHeight(key, candidateContent, {
        ...options,
        continuesNext: true
      }) <= maxCandidateHeight ||
      !pageBlocks.length
    ) {
      pageBlocks.push(block)
      continue
    }

    break
  }

  if (!pageBlocks.length) {
    return { pageContent: '', restContent: content }
  }

  return {
    pageContent: joinRichTextRenderBlocks(pageBlocks),
    restContent: joinRichTextRenderBlocks(blocks.slice(pageBlocks.length))
  }
}

function estimateSectionHeight(key) {
  const bounds = getModuleBounds(key)
  const verticalOffset = bounds.bottom - DEFAULT_MODULE_BOUNDS.bottom
  const moduleBaseHeight = MODULE_BASE_HEIGHT + verticalOffset + MODULE_FLOW_GAP

  if (key === 'experience') {
    return estimateRichTextSectionHeight(key, resume.value.richText?.experience)
  }

  if (key === 'projects') {
    return estimateRichTextSectionHeight(key, resume.value.richText?.projects)
  }

  if (key === 'education') {
    const itemCount = Math.max(resume.value.education.length, 1)
    return moduleBaseHeight + itemCount * 58 + Math.max(itemCount - 1, 0) * 12
  }

  if (key === 'skills') {
    return estimateRichTextSectionHeight(key, resume.value.richText?.skills)
  }

  return moduleBaseHeight
}

function estimateRichTextSectionHeight(key, content, options = {}) {
  const bounds = getModuleBounds(key)
  const topDelta = bounds.top - DEFAULT_MODULE_BOUNDS.top
  const topPadding = options.isContinuation
    ? MODULE_CONTINUATION_PADDING
    : Math.max(DEFAULT_MODULE_BOUNDS.top - topDelta, 4)
  const bottomPadding = options.continuesNext ? MODULE_CONTINUATION_PADDING : bounds.bottom
  const titleHeight = options.isContinuation ? 0 : MODULE_TITLE_HEIGHT
  const flowGap = options.continuesNext ? 0 : MODULE_FLOW_GAP

  return (
    (options.isContinuation ? 0 : topDelta) +
    topPadding +
    titleHeight +
    estimateRichTextContentHeight(content, getCharsPerLine(key, 54)) +
    bottomPadding +
    flowGap
  )
}

function getCharsPerLine(key, defaultCharsPerLine) {
  const bounds = getModuleBounds(key)
  const moduleContentInset = MODULE_CONTENT_INSET * 2
  const defaultContentWidth =
    PAPER_WIDTH - DEFAULT_MODULE_BOUNDS.left - DEFAULT_MODULE_BOUNDS.right - moduleContentInset
  const contentWidth = PAPER_WIDTH - bounds.left - bounds.right - moduleContentInset
  return Math.max(Math.floor(defaultCharsPerLine * (contentWidth / defaultContentWidth)), 28)
}

function getModuleBounds(key) {
  return normalizeModuleBound(resume.value.moduleBounds?.[key])
}

function estimateRichTextContentHeight(value, charsPerLine) {
  const blocks = getRichTextEstimateBlocks(value)

  if (!blocks.length) {
    return 50
  }

  const lineCount = blocks.reduce(
    (total, block) => total + Math.max(Math.ceil(getTextWidthUnits(block) / charsPerLine), 1),
    0
  )
  const blockGapHeight = Math.max(blocks.length - 1, 0) * 6

  return Math.max(lineCount, 2) * 24 + blockGapHeight
}

function getTextWidthUnits(value) {
  return Array.from(String(value || '')).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + 0.35
    }

    if (/[\u0000-\u007f]/.test(char)) {
      return total + 0.56
    }

    if (/[\uff01-\uff60\u3000-\u303f]/.test(char)) {
      return total + 0.65
    }

    return total + 1
  }, 0)
}

function getRichTextEstimateBlocks(value) {
  const content = String(value || '').trim()

  if (!content) {
    return []
  }

  if (!/<\/?[a-z][\s\S]*>/i.test(content)) {
    return content
      .split(/\n+/)
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
  }

  return decodeHtmlForEstimate(
    content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getRichTextRenderBlocks(value) {
  const content = String(value || '').trim()

  if (!content) {
    return []
  }

  if (!/<\/?[a-z][\s\S]*>/i.test(content)) {
    return content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        html: false,
        source: line,
        text: line.replace(/^[-*]\s+/, '').trim()
      }))
  }

  const blocks = []
  const blockPattern = /<(p|ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi
  let match = blockPattern.exec(content)

  while (match) {
    const source = match[0]
    const tagName = match[1].toLowerCase()

    if (tagName === 'ul' || tagName === 'ol') {
      const itemPattern = /<li\b[^>]*>[\s\S]*?<\/li>/gi
      let itemMatch = itemPattern.exec(source)

      while (itemMatch) {
        const itemSource = itemMatch[0]
        blocks.push({
          html: true,
          source: `<${tagName}>${itemSource}</${tagName}>`,
          text: stripHtmlForEstimate(itemSource)
        })
        itemMatch = itemPattern.exec(source)
      }
    } else {
      blocks.push({
        html: true,
        source,
        text: stripHtmlForEstimate(source)
      })
    }

    match = blockPattern.exec(content)
  }

  if (blocks.length) {
    return blocks
  }

  return stripHtmlForEstimate(content)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      html: false,
      source: line,
      text: line
    }))
}

function joinRichTextRenderBlocks(blocks) {
  if (!blocks.length) {
    return ''
  }

  if (blocks.some((block) => block.html)) {
    return blocks
      .map((block) => (block.html ? block.source : `<p>${escapeHtml(block.source)}</p>`))
      .join('')
  }

  return blocks.map((block) => block.source).join('\n')
}

function stripHtmlForEstimate(value) {
  return decodeHtmlForEstimate(
    String(value || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  ).trim()
}

function decodeHtmlForEstimate(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getSectionNavigatorChildren(key) {
  if (key !== 'education') {
    return []
  }

  return resume.value.education.map((item, index) => ({
    id: item.id || `education-${index}`,
    type: 'education-item',
    sectionKey: 'education',
    index,
    label: item.school || item.major || `\u6559\u80b2\u7ecf\u5386 ${index + 1}`,
    meta: [item.major, item.degree, item.period].filter(Boolean).join(' | ') || `\u7b2c ${index + 1} \u6761\u6559\u80b2`
  }))
}
function getSnapshot() {
  return JSON.stringify(resume.value)
}

function commitSnapshot() {
  const snapshot = getSnapshot()
  const lastSnapshot = historyStack.value[historyStack.value.length - 1]

  if (snapshot !== lastSnapshot) {
    historyStack.value.push(snapshot)
    historyStack.value = historyStack.value.slice(-32)
  }
}

function selectProfile() {
  activeBlock.value = { type: 'profile', key: 'profile', index: null }
}

function selectModule(key) {
  if (key === 'experience' || key === 'projects' || key === 'skills') {
    activeBlock.value = { type: key, key, index: null }
    return
  }

  activeBlock.value = { type: 'module', key, index: null }
}

function selectEntry(type, index) {
  const sectionKeyByType = {
    'education-item': 'education'
  }

  activeBlock.value = {
    type,
    key: sectionKeyByType[type],
    index
  }
}

function selectNavigatorChild(child) {
  selectEntry(child.type, child.index)
}

function openModuleEditor(key, entryIndex = null) {
  if (!dialogEditableSections.has(key)) {
    selectModule(key)
    return
  }

  if (key === 'education' && Number.isInteger(entryIndex)) {
    selectEntry('education-item', entryIndex)
  } else {
    selectModule(key)
  }

  activeModuleDialogKey.value = key
}

function closeModuleEditor() {
  activeModuleDialogKey.value = ''
}

function openProfileEditor() {
  selectProfile()
  profileDialogOpen.value = true
}

function closeProfileEditor() {
  commitSnapshot()
  profileDialogOpen.value = false
}

function startSectionDrag(key) {
  draggingSectionKey.value = key
}

function clearSectionDrag() {
  draggingSectionKey.value = ''
}

function dropSection(targetKey) {
  const sourceKey = draggingSectionKey.value

  if (!sourceKey || sourceKey === targetKey) {
    clearSectionDrag()
    return
  }

  const nextOrder = normalizeSectionOrder(resume.value.sectionOrder)
  const sourceIndex = nextOrder.indexOf(sourceKey)
  const targetIndex = nextOrder.indexOf(targetKey)

  if (sourceIndex < 0 || targetIndex < 0) {
    clearSectionDrag()
    return
  }

  const [sectionKey] = nextOrder.splice(sourceIndex, 1)
  nextOrder.splice(targetIndex, 0, sectionKey)
  resume.value.sectionOrder = nextOrder
  selectModule(sectionKey)
  commitSnapshot()
  clearSectionDrag()
}

function moveSection(key, direction) {
  const nextOrder = normalizeSectionOrder(resume.value.sectionOrder)
  const visibleOrder = nextOrder.filter((sectionKey) => resume.value.visibleSections[sectionKey])
  const visibleIndex = visibleOrder.indexOf(key)
  const targetKey = visibleOrder[visibleIndex + direction]

  if (!sectionMap.has(key) || !targetKey) {
    return
  }

  const sourceIndex = nextOrder.indexOf(key)

  if (sourceIndex < 0) {
    return
  }

  const [sectionKey] = nextOrder.splice(sourceIndex, 1)
  const targetIndex = nextOrder.indexOf(targetKey)
  nextOrder.splice(direction > 0 ? targetIndex + 1 : targetIndex, 0, sectionKey)
  resume.value.sectionOrder = nextOrder
  selectModule(sectionKey)
  commitSnapshot()
}

function deleteSection(key) {
  if (!sectionMap.has(key)) {
    return
  }

  resume.value.visibleSections[key] = false

  if (activeBlock.value.key === key) {
    selectProfile()
  }

  commitSnapshot()
  flashStatus('\u5df2\u5220\u9664\u6a21\u5757')
}

function addExperience() {
  addSectionFromQuickAction(
    'experience',
    '\u5b9e\u4e60\u5355\u4f4d | \u5b9e\u4e60\u5c97\u4f4d | 2026.01 - 2026.06\n- \u8865\u5145\u8d1f\u8d23\u4e8b\u9879\u3001\u5173\u952e\u6210\u679c\u6216\u91cf\u5316\u6307\u6807\u3002'
  )
}

function addProject() {
  addSectionFromQuickAction(
    'projects',
    '\u9879\u76ee\u540d\u79f0 | \u8d1f\u8d23\u89d2\u8272 | 2026.01 - 2026.03\n- \u8865\u5145\u9879\u76ee\u80cc\u666f\u3001\u6280\u672f\u65b9\u6848\u548c\u4e2a\u4eba\u8d21\u732e\u3002'
  )
}

function addEducation() {
  addSectionFromQuickAction('education')
}

function appendEducationEntry() {
  resume.value.education.push({
    id: createId(),
    school: '\u5b66\u6821\u540d\u79f0',
    major: '\u4e13\u4e1a\u540d\u79f0',
    degree: '\u672c\u79d1',
    period: '2022.09 - 2026.06'
  })
  ensureSectionVisible('education')
  selectEntry('education-item', resume.value.education.length - 1)
  commitSnapshot()
}

function addEducationFromDialog() {
  appendEducationEntry()
  activeModuleDialogKey.value = 'education'
}

function addSkill() {
  addSectionFromQuickAction('skills', '\u65b0\u6280\u80fd\u5206\u7c7b: \u8865\u5145\u6280\u80fd\u63cf\u8ff0\u3002')
}

function addSectionFromQuickAction(key, fallbackRichText = '') {
  if (!sectionMap.has(key)) {
    return
  }

  if (resume.value.visibleSections[key]) {
    selectModule(key)
    showResumeNotice(`${sectionMap.get(key).resumeTitle}\u5df2\u5b58\u5728`)
    return
  }

  if (fallbackRichText && !String(resume.value.richText?.[key] || '').trim()) {
    updateRichTextSection(key, fallbackRichText)
  }

  if (key === 'education' && !resume.value.education.length) {
    resume.value.education.push({
      id: createId(),
      school: '\u5b66\u6821\u540d\u79f0',
      major: '\u4e13\u4e1a\u540d\u79f0',
      degree: '\u672c\u79d1',
      period: '2022.09 - 2026.06'
    })
  }

  ensureSectionVisible(key)
  moveSectionToVisibleEnd(key)
  selectModule(key)
  commitSnapshot()
  showResumeNotice(`${sectionMap.get(key).resumeTitle}\u5df2\u6dfb\u52a0`)
}

function moveSectionToVisibleEnd(key) {
  const nextOrder = normalizeSectionOrder(resume.value.sectionOrder).filter((sectionKey) => sectionKey !== key)
  const lastVisibleIndex = nextOrder.reduce(
    (lastIndex, sectionKey, index) => (resume.value.visibleSections[sectionKey] ? index : lastIndex),
    -1
  )

  nextOrder.splice(lastVisibleIndex + 1, 0, key)
  resume.value.sectionOrder = nextOrder
}

function ensureSectionVisible(key) {
  resume.value.visibleSections[key] = true
  resume.value.sectionOrder = normalizeSectionOrder(resume.value.sectionOrder)
  resume.value.moduleBounds = normalizeModuleBounds(resume.value.moduleBounds)
}

function resizeModuleBoundary(key, edge, delta) {
  if (!sectionMap.has(key) || !Object.hasOwn(DEFAULT_MODULE_BOUNDS, edge)) {
    return
  }

  resume.value.moduleBounds = normalizeModuleBounds(resume.value.moduleBounds)

  const bounds = resume.value.moduleBounds[key]
  const [min, max] = MODULE_BOUND_LIMITS[edge]
  const nextValueByEdge = {
    top: bounds.top + delta.y,
    right: bounds.right - delta.x,
    bottom: bounds.bottom + delta.y,
    left: bounds.left + delta.x
  }

  bounds[edge] = clampNumber(nextValueByEdge[edge], min, max, DEFAULT_MODULE_BOUNDS[edge])
}

function updateRichTextSection(key, value) {
  if (!resume.value.richText) {
    resume.value.richText = {}
  }

  resume.value.richText[key] = value
}

function removeEntry(collectionName, index) {
  const collection = resume.value[collectionName]

  if (!Array.isArray(collection) || collection.length <= 1) {
    return
  }

  collection.splice(index, 1)
  selectModule(collectionName)
  commitSnapshot()
}

function moveEntry(collectionName, index, direction) {
  const collection = resume.value[collectionName]
  const nextIndex = index + direction

  if (!Array.isArray(collection) || nextIndex < 0 || nextIndex >= collection.length) {
    return
  }

  const [item] = collection.splice(index, 1)
  collection.splice(nextIndex, 0, item)

  const entryTypeByCollection = {
    education: 'education-item'
  }

  selectEntry(entryTypeByCollection[collectionName], nextIndex)
  commitSnapshot()
}

function createSkillItem(category, details = []) {
  return {
    id: createId(),
    category,
    details
  }
}

function normalizeSkills(skills, fallbackSkills) {
  if (!Array.isArray(skills)) {
    return fallbackSkills
  }

  const normalizedSkills = skills
    .map((skill, index) => normalizeSkillItem(skill, index))
    .filter(Boolean)

  return normalizedSkills.length ? normalizedSkills : fallbackSkills
}

function normalizeSkillItem(skill, index) {
  if (typeof skill === 'string') {
    return createSkillItem(skill || `\u6280\u80fd ${index + 1}`, ['\u8865\u5145\u6280\u80fd\u63cf\u8ff0\u3002'])
  }

  if (!skill || typeof skill !== 'object') {
    return null
  }

  const details = Array.isArray(skill.details)
    ? skill.details.map((detail) => String(detail).trim()).filter(Boolean)
    : String(skill.description || skill.detail || '')
        .split('\n')
        .map((detail) => detail.trim())
        .filter(Boolean)

  return {
    id: skill.id || createId(),
    category: String(skill.category || skill.name || `\u6280\u80fd ${index + 1}`).trim(),
    details: details.length ? details : ['\u8865\u5145\u6280\u80fd\u63cf\u8ff0\u3002']
  }
}

function normalizeEducationItems(items, fallbackItems) {
  if (!Array.isArray(items)) {
    return fallbackItems
  }

  const normalizedItems = items
    .map((item, index) => normalizeEducationItem(item, index))
    .filter(Boolean)

  return normalizedItems.length ? normalizedItems : fallbackItems
}

function normalizeEducationItem(item, index) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const educationText = splitEducationMajorAndDegree(item.major, item.degree)

  return {
    id: item.id || createId(),
    school: String(item.school || `\u5b66\u6821\u540d\u79f0 ${index + 1}`).trim(),
    major: educationText.major || '\u4e13\u4e1a\u540d\u79f0',
    degree: educationText.degree || '\u672c\u79d1',
    period: String(item.period || '2022.09 - 2026.06').trim()
  }
}

function splitEducationMajorAndDegree(majorValue, degreeValue) {
  const major = String(majorValue || '').trim()
  const degree = String(degreeValue || '').trim()

  if (degree) {
    return { major, degree }
  }

  const knownDegrees = ['\u535a\u58eb\u7814\u7a76\u751f', '\u7855\u58eb\u7814\u7a76\u751f', '\u7814\u7a76\u751f', '\u672c\u79d1', '\u4e13\u79d1', '\u5927\u4e13']
  const matchedDegree = knownDegrees.find((value) => major.endsWith(value))

  if (!matchedDegree) {
    return { major, degree: '' }
  }

  return {
    major: major.slice(0, -matchedDegree.length).replace(/[\s/｜|]+$/g, '').trim(),
    degree: matchedDegree
  }
}

function normalizeRichTextSections(parsedDraft, fallbackRichText) {
  const draftRichText = parsedDraft?.richText && typeof parsedDraft.richText === 'object'
    ? parsedDraft.richText
    : {}

  return {
    experience: normalizeRichTextValue(
      draftRichText.experience,
      () => formatExperienceAsRichText(parsedDraft?.experience),
      fallbackRichText.experience
    ),
    projects: normalizeRichTextValue(
      draftRichText.projects,
      () => formatProjectsAsRichText(parsedDraft?.projects),
      fallbackRichText.projects
    ),
    skills: normalizeRichTextValue(
      draftRichText.skills,
      () => formatSkillsAsRichText(parsedDraft?.skills),
      fallbackRichText.skills
    )
  }
}

function normalizeRichTextValue(value, legacyFormatter, fallbackValue) {
  if (typeof value === 'string') {
    return value
  }

  const legacyValue = legacyFormatter()
  return legacyValue || fallbackValue
}

function formatExperienceAsRichText(items) {
  if (!Array.isArray(items) || !items.length) {
    return ''
  }

  return items
    .map((item) =>
      [
        [item.company, item.role, item.period].filter(Boolean).join(' | '),
        ...formatBulletsAsLines(item.bullets)
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n')
}

function formatProjectsAsRichText(items) {
  if (!Array.isArray(items) || !items.length) {
    return ''
  }

  return items
    .map((item) =>
      [
        [item.name, item.role, item.period].filter(Boolean).join(' | '),
        ...formatBulletsAsLines(item.bullets)
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n')
}

function formatSkillsAsRichText(skills) {
  if (!Array.isArray(skills) || !skills.length) {
    return ''
  }

  return normalizeSkills(skills, [])
    .map((skill) => `${skill.category}: ${skill.details.join('\uff0c')}`)
    .join('\n')
}

function formatBulletsAsLines(bullets) {
  return Array.isArray(bullets)
    ? bullets.map((bullet) => `- ${String(bullet).trim()}`).filter((bullet) => bullet !== '-')
    : []
}

function undoResume() {
  if (!canUndo.value) {
    return
  }

  historyStack.value.pop()
  resume.value = JSON.parse(historyStack.value[historyStack.value.length - 1])
  resume.value.pageCount = normalizePageCount(resume.value.pageCount)
  resume.value.sectionOrder = normalizeSectionOrder(resume.value.sectionOrder)
  resume.value.visibleSections = normalizeVisibleSections(resume.value.visibleSections)
  resume.value.moduleBounds = normalizeModuleBounds(resume.value.moduleBounds)
  selectProfile()
  flashStatus('\u5df2\u64a4\u9500')
}

function saveDraft() {
  commitSnapshot()
  writeDraft()
  flashStatus('\u5df2\u4fdd\u5b58')
}

function resetResume() {
  if (typeof window !== 'undefined' && !window.confirm('\u786e\u8ba4\u91cd\u7f6e\u7b80\u5386\u5185\u5bb9\uff1f')) {
    return
  }

  resume.value = createDefaultResume()
  selectProfile()
  commitSnapshot()
  flashStatus('\u5df2\u91cd\u7f6e')
}

function addPage() {
  resume.value.pageCount = Math.max(normalizePageCount(resume.value.pageCount), resumePages.value.length) + 1
  commitSnapshot()
  flashStatus('\u5df2\u6dfb\u52a0\u4e00\u9875')
}

async function exportPdf() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const pageElements = Array.from(document.querySelectorAll('.resume-paper'))

  if (!pageElements.length) {
    flashStatus('\u6ca1\u6709\u53ef\u5bfc\u51fa\u7684\u9875\u9762')
    return
  }

  flashStatus('\u6b63\u5728\u751f\u6210 PDF...')
  await nextTick()

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const pageImages = []

    for (const pageElement of pageElements) {
      pageImages.push(await renderResumePageToJpeg(pageElement))
    }

    const pdfBlob = createPdfBlobFromJpegs(pageImages)
    const saved = await savePdfBlob(pdfBlob, PDF_FILE_NAME)

    if (saved) {
      flashStatus('PDF \u5df2\u5bfc\u51fa')
    }
  } catch (error) {
    console.error(error)
    flashStatus('PDF \u5bfc\u51fa\u5931\u8d25')
  }
}

async function renderResumePageToJpeg(pageElement) {
  const clone = pageElement.cloneNode(true)
  inlineComputedStyles(pageElement, clone)
  cleanResumeExportClone(clone)

  clone.style.width = `${PAPER_WIDTH}px`
  clone.style.height = `${PAPER_HEIGHT}px`
  clone.style.transform = 'none'
  clone.style.transformOrigin = 'top left'
  clone.style.boxShadow = 'none'
  clone.style.border = '0'
  clone.style.margin = '0'
  clone.style.background = '#fff'

  const svgMarkup = createResumePageSvg(clone)
  const svgUrl = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = await loadImage(svgUrl)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(PAPER_WIDTH * PDF_EXPORT_SCALE)
    canvas.height = Math.round(PAPER_HEIGHT * PDF_EXPORT_SCALE)

    const context = canvas.getContext('2d')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await canvasToBlob(canvas, 'image/jpeg', PDF_IMAGE_QUALITY)
    const bytes = new Uint8Array(await blob.arrayBuffer())

    return {
      bytes,
      height: canvas.height,
      width: canvas.width
    }
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function inlineComputedStyles(source, target) {
  if (!(source instanceof Element) || !(target instanceof Element)) {
    return
  }

  const computedStyle = window.getComputedStyle(source)
  const inlineStyle = []

  for (const property of computedStyle) {
    inlineStyle.push(`${property}:${computedStyle.getPropertyValue(property)};`)
  }

  target.setAttribute('style', inlineStyle.join(''))

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children[index]

    if (targetChild) {
      inlineComputedStyles(sourceChild, targetChild)
    }
  })
}

function cleanResumeExportClone(clone) {
  clone.querySelectorAll('.module-boundary-handles').forEach((element) => element.remove())
  clone.querySelectorAll('.is-selected, .is-dragging, .is-drop-target').forEach(removeExportStateClasses)
  removeExportStateClasses(clone)
}

function removeExportStateClasses(element) {
  element.classList.remove('is-selected', 'is-dragging', 'is-drop-target')
}

function createResumePageSvg(pageElement) {
  const wrapper = document.createElement('div')
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  wrapper.style.width = `${PAPER_WIDTH}px`
  wrapper.style.height = `${PAPER_HEIGHT}px`
  wrapper.style.overflow = 'hidden'
  wrapper.style.background = '#fff'
  wrapper.appendChild(pageElement)

  const serialized = new XMLSerializer().serializeToString(wrapper)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAPER_WIDTH}" height="${PAPER_HEIGHT}" viewBox="0 0 ${PAPER_WIDTH} ${PAPER_HEIGHT}">`,
    `<foreignObject width="${PAPER_WIDTH}" height="${PAPER_HEIGHT}">`,
    serialized,
    '</foreignObject>',
    '</svg>'
  ].join('')
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to render PDF page.'))
    image.src = url
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Failed to create PDF page image.'))
      },
      type,
      quality
    )
  })
}

function createPdfBlobFromJpegs(images) {
  const encoder = new TextEncoder()
  const parts = []
  const offsets = []
  let offset = 0

  const append = (part) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    parts.push(bytes)
    offset += bytes.length
  }
  const appendObject = (id, bodyParts) => {
    offsets[id] = offset
    append(`${id} 0 obj\n`)
    bodyParts.forEach(append)
    append('\nendobj\n')
  }

  append('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n')
  appendObject(1, ['<< /Type /Catalog /Pages 2 0 R >>'])

  const pageIds = images.map((_, index) => 3 + index * 3)
  appendObject(2, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`])

  images.forEach((image, index) => {
    const pageId = 3 + index * 3
    const contentId = pageId + 1
    const imageId = pageId + 2
    const imageName = `Im${index + 1}`
    const drawCommand = `q\n${PDF_A4_WIDTH_PT} 0 0 ${PDF_A4_HEIGHT_PT} 0 0 cm\n/${imageName} Do\nQ`

    appendObject(pageId, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_A4_WIDTH_PT} ${PDF_A4_HEIGHT_PT}] `,
      `/Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    ])
    appendObject(contentId, [`<< /Length ${encoder.encode(drawCommand).length} >>\nstream\n${drawCommand}\nendstream`])

    offsets[imageId] = offset
    append(`${imageId} 0 obj\n`)
    append(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`
    )
    append(image.bytes)
    append('\nendstream\nendobj\n')
  })

  const xrefOffset = offset
  const objectCount = 2 + images.length * 3
  append(`xref\n0 ${objectCount + 1}\n`)
  append('0000000000 65535 f \n')

  for (let id = 1; id <= objectCount; id += 1) {
    append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  }

  append(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  return new Blob(parts, { type: 'application/pdf' })
}

async function savePdfBlob(blob, fileName) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'PDF',
            accept: {
              'application/pdf': ['.pdf']
            }
          }
        ]
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (error) {
      if (error?.name === 'AbortError') {
        flashStatus('\u5df2\u53d6\u6d88\u5bfc\u51fa')
        return false
      }

      throw error
    }
  }

  downloadBlob(blob, fileName)
  return true
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function writeDraft() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(RESUME_EDITOR_DRAFT_KEY, JSON.stringify(resume.value))
}

function loadDraft() {
  if (typeof localStorage === 'undefined') {
    return
  }

  const rawDraft = localStorage.getItem(RESUME_EDITOR_DRAFT_KEY)

  if (!rawDraft) {
    return
  }

  try {
    const parsedDraft = JSON.parse(rawDraft)

    if (parsedDraft && typeof parsedDraft === 'object') {
      const defaultResume = createDefaultResume()

      resume.value = {
        ...defaultResume,
        ...parsedDraft,
        pageCount: normalizePageCount(parsedDraft.pageCount),
        sectionOrder: normalizeSectionOrder(parsedDraft.sectionOrder),
        moduleBounds: normalizeModuleBounds(parsedDraft.moduleBounds),
        profile: {
          ...defaultResume.profile,
          ...parsedDraft.profile
        },
        visibleSections: normalizeVisibleSections(parsedDraft.visibleSections),
        richText: normalizeRichTextSections(parsedDraft, defaultResume.richText),
        education: normalizeEducationItems(parsedDraft.education, defaultResume.education)
      }
      delete resume.value.experience
      delete resume.value.projects
      delete resume.value.skills
    }
  } catch {
    localStorage.removeItem(RESUME_EDITOR_DRAFT_KEY)
  }
}

function flashStatus(message) {
  draftStatus.value = message

  if (draftStatusTimer) {
    window.clearTimeout(draftStatusTimer)
  }

  draftStatusTimer = window.setTimeout(() => {
    draftStatus.value = ''
  }, 1400)
}

function showResumeNotice(message) {
  resumeNotice.value = message

  if (resumeNoticeTimer) {
    window.clearTimeout(resumeNoticeTimer)
  }

  resumeNoticeTimer = window.setTimeout(() => {
    resumeNotice.value = ''
  }, 1600)
}

watch(
  resume,
  () => {
    writeDraft()
  },
  { deep: true }
)

onMounted(() => {
  loadDraft()
  historyStack.value = [getSnapshot()]
})
</script>

<style>
.resume-editor-page {
  --editor-ink: #171a20;
  --editor-copy: #444b57;
  --editor-muted: #7a8391;
  --editor-line: rgba(23, 26, 32, 0.1);
  min-height: 100dvh;
  background: #eef1f5;
  color: var(--editor-ink);
}

.resume-editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) minmax(260px, 1fr) minmax(260px, 0.9fr);
  align-items: center;
  gap: 16px;
  min-height: 64px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--editor-line);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18px);
}

.resume-editor-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  color: var(--editor-ink);
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.resume-editor-brand__mark {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #171a20;
  color: #fff;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.resume-editor-toolbar__center,
.resume-editor-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.resume-editor-toolbar__center {
  justify-content: center;
}

.resume-editor-toolbar__actions {
  justify-content: flex-end;
}

.editor-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid var(--editor-line);
  border-radius: 10px;
  padding: 0 14px;
  background: #fff;
  color: var(--editor-ink);
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.editor-btn:hover,
.icon-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(23, 26, 32, 0.2);
  box-shadow: 0 12px 24px rgba(23, 26, 32, 0.08);
}

.editor-btn:disabled,
.icon-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.editor-btn--primary,
.editor-btn--dark {
  border-color: #171a20;
  background: #171a20;
  color: #fff;
}

.editor-btn--danger {
  color: #b42318;
}

.editor-btn--wide {
  width: 100%;
}

.zoom-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid var(--editor-line);
  border-radius: 10px;
  padding: 0 10px 0 12px;
  background: #fff;
  color: var(--editor-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.zoom-control select {
  border: 0;
  background: transparent;
  color: var(--editor-ink);
  font: inherit;
  outline: none;
}

.draft-status {
  color: #171a20;
  font-size: 0.88rem;
  font-weight: 800;
  white-space: nowrap;
}

.resume-editor-shell {
  position: relative;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 14px;
  height: calc(100dvh - 64px);
  padding: 14px;
}

.resume-inline-notice {
  position: absolute;
  top: 28px;
  left: 308px;
  right: 28px;
  z-index: 26;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.resume-inline-notice span {
  border: 1px solid rgba(23, 26, 32, 0.12);
  border-radius: 999px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 38px rgba(23, 26, 32, 0.16);
  color: var(--editor-ink);
  font-size: 0.9rem;
  font-weight: 900;
}

.resume-inline-notice-enter-active,
.resume-inline-notice-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.resume-inline-notice-enter-from,
.resume-inline-notice-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.resume-sidebar,
.resume-workspace {
  min-height: 0;
}

.resume-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.editor-panel {
  border: 1px solid var(--editor-line);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 40px rgba(23, 26, 32, 0.06);
}

.editor-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 0.9rem;
  font-weight: 900;
}

.module-sort-list,
.field-stack,
.quick-actions {
  display: grid;
  gap: 10px;
}

.module-sort-group {
  display: grid;
  gap: 7px;
}

.module-sort-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 56px;
  border: 1px solid var(--editor-line);
  border-radius: 12px;
  padding: 8px;
  background: #fff;
  cursor: grab;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease,
    opacity 160ms ease;
}

.module-sort-item:hover,
.module-sort-item.is-active {
  border-color: rgba(23, 26, 32, 0.28);
  box-shadow: 0 12px 26px rgba(23, 26, 32, 0.08);
}

.module-sort-item.is-dragging {
  opacity: 0.54;
  transform: scale(0.99);
}

.module-sort-item__handle {
  color: var(--editor-muted);
  font-size: 1rem;
  line-height: 1;
}

.module-toggle input {
  accent-color: #171a20;
}

.module-sort-item__title {
  display: grid;
  gap: 2px;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--editor-ink);
  text-align: left;
  cursor: pointer;
}

.module-sort-item__title span {
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-sort-item__title small {
  overflow: hidden;
  color: var(--editor-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-sort-item__actions,
.entry-action-row {
  display: flex;
  gap: 6px;
}

.module-sort-item__actions .icon-btn,
.icon-btn {
  width: 32px;
  min-height: 32px;
  padding: 0;
  font-size: 0.82rem;
}

.module-sort-item__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.module-sort-item__move-stack {
  display: grid;
  gap: 4px;
}

.module-sort-delete-btn {
  width: 30px;
  height: 48px;
  min-height: 48px;
  border-color: rgba(180, 35, 24, 0.18);
  border-radius: 8px;
  background: rgba(180, 35, 24, 0.08);
  box-shadow: none;
  color: #b42318;
  font-weight: 900;
}

.module-sort-delete-btn__icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.module-sort-delete-btn:hover {
  border-color: rgba(180, 35, 24, 0.28);
  background: #b42318;
  color: #fff;
}

.module-sort-item__actions .module-sort-move-btn {
  width: 28px;
  height: 22px;
  min-height: 22px;
  border-color: rgba(23, 26, 32, 0.08);
  border-radius: 7px;
  background: #f7f8fa;
  box-shadow: none;
  color: #596171;
}

.module-sort-item__actions .module-sort-move-btn:hover:not(:disabled) {
  border-color: rgba(23, 26, 32, 0.18);
  background: #171a20;
  color: #fff;
  transform: none;
  box-shadow: 0 8px 18px rgba(23, 26, 32, 0.12);
}

.module-sort-move-btn__chevron {
  width: 7px;
  height: 7px;
  border-top: 2px solid currentColor;
  border-left: 2px solid currentColor;
}

.module-sort-move-btn--up .module-sort-move-btn__chevron {
  transform: translateY(2px) rotate(45deg);
}

.module-sort-move-btn--down .module-sort-move-btn__chevron {
  transform: translateY(-2px) rotate(225deg);
}

.module-child-list {
  display: grid;
  gap: 6px;
  padding-left: 36px;
}

.module-child-item {
  display: grid;
  gap: 2px;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 8px 10px;
  background: #f7f8fa;
  color: var(--editor-copy);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.module-child-item:hover,
.module-child-item.is-active {
  border-color: rgba(23, 26, 32, 0.2);
  background: #fff;
  transform: translateX(2px);
}

.module-child-item span,
.module-child-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-child-item span {
  color: var(--editor-ink);
  font-size: 0.84rem;
  font-weight: 800;
}

.module-child-item small {
  color: var(--editor-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.quick-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.module-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  border: 1px solid var(--editor-line);
  border-radius: 10px;
  padding: 0 12px;
  background: #fff;
  color: var(--editor-copy);
  font-size: 0.9rem;
  font-weight: 700;
}

.module-toggle--inspector {
  justify-content: flex-start;
}

.resume-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--editor-line);
  border-radius: 18px;
  background: #fff;
}

.resume-stage {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 44px 44px 80px;
}

.resume-pages {
  display: grid;
  justify-items: center;
  gap: 56px;
  min-width: max-content;
}

.resume-paper-frame {
  position: relative;
  margin: 0 auto;
}

.resume-page-label {
  position: absolute;
  top: -28px;
  right: 0;
  color: rgba(23, 26, 32, 0.58);
  font-size: 0.78rem;
  font-weight: 800;
}

.resume-paper {
  box-sizing: border-box;
  width: 794px;
  height: 1123px;
  overflow: hidden;
  transform-origin: top left;
  border: 1px solid rgba(23, 26, 32, 0.08);
  background: #fff;
  box-shadow: 0 28px 70px rgba(23, 26, 32, 0.18);
  color: #171a20;
  font-family:
    "Inter",
    "PingFang SC",
    "Microsoft YaHei",
    Arial,
    sans-serif;
}

.resume-paper--continuation {
  padding-top: 34px;
}

.resume-document-hero,
.resume-module {
  position: relative;
  box-sizing: border-box;
  margin: 0 56px;
  padding: 22px 18px;
  cursor: grab;
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    background-color 160ms ease,
    outline-color 160ms ease;
  will-change: transform;
}

.resume-module {
  margin-bottom: 14px;
}

.resume-module:active {
  cursor: grabbing;
}

.resume-module.is-dragging {
  opacity: 0.48;
  transform: scale(0.995);
}

.resume-module.is-drop-target {
  background: linear-gradient(90deg, rgba(23, 26, 32, 0.045), transparent 72%);
}

.resume-module.is-selected {
  outline: 0;
}

.resume-module.is-selected::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 5;
  border: 2px solid #2f6bff;
  pointer-events: none;
}

.resume-module.is-selected.is-continuation-fragment::before,
.resume-module.is-selected.is-continued-fragment::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  z-index: 4;
  height: 1200px;
  border-right: 2px solid #2f6bff;
  border-left: 2px solid #2f6bff;
  pointer-events: none;
}

.resume-module.is-selected.is-continuation-fragment::before {
  bottom: 100%;
}

.resume-module.is-selected.is-continued-fragment::before {
  top: 100%;
}

.resume-module.is-selected.is-continuation-fragment::after {
  border-top: 0;
}

.resume-module.is-selected.is-continued-fragment::after {
  border-bottom: 0;
}

.module-boundary-handles {
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
}

.module-boundary-handle {
  position: absolute;
  display: block;
  width: 11px;
  height: 11px;
  border: 1px solid #a9b3c1;
  border-radius: 2px;
  padding: 0;
  background: #fff;
  box-shadow: 0 1px 4px rgba(23, 26, 32, 0.18);
  pointer-events: auto;
}

.module-boundary-handle--top,
.module-boundary-handle--bottom {
  left: 50%;
  cursor: ns-resize;
  transform: translateX(-50%);
}

.module-boundary-handle--top {
  top: -6px;
}

.module-boundary-handle--bottom {
  bottom: -6px;
}

.module-boundary-handle--left,
.module-boundary-handle--right {
  top: 50%;
  cursor: ew-resize;
  transform: translateY(-50%);
}

.module-boundary-handle--left {
  left: -6px;
}

.module-boundary-handle--right {
  right: -6px;
}

.resume-document-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 28px;
  margin-top: 0;
  padding-top: 54px;
  border-bottom: 2px solid #171a20;
}

.resume-document-hero h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: 0;
}

.resume-document-hero p {
  margin: 12px 0 0;
  color: #4d5563;
  font-size: 18px;
}

.resume-contact-list {
  display: grid;
  gap: 8px;
  align-self: center;
  margin: 0;
  padding: 0;
  list-style: none;
  color: #4d5563;
  font-size: 14px;
}

.resume-module + .resume-module {
  border-top: 1px solid rgba(23, 26, 32, 0.1);
}

.resume-module h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  color: #171a20;
  font-size: 18px;
  line-height: 1.2;
}

.resume-module h2::before {
  content: '';
  width: 22px;
  height: 3px;
  border-radius: 99px;
  background: currentColor;
}

.resume-rich-text {
  display: grid;
  gap: 8px;
  color: #3f4652;
  line-height: 1.7;
}

.resume-rich-text p {
  margin: 0;
  white-space: pre-wrap;
}

.resume-rich-text__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
}

.resume-rich-text__list li::marker {
  color: #171a20;
}

.resume-rich-text__empty {
  color: #7a8391;
}

.resume-rich-text--empty-fragment {
  min-height: 0;
}

.resume-entry + .resume-entry {
  margin-top: 18px;
}

.resume-entry {
  position: relative;
  border-radius: 10px;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.resume-entry--compact {
  padding: 10px 12px;
  margin: -10px -12px;
}

.resume-entry.is-active {
  background: rgba(47, 107, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(47, 107, 255, 0.16);
}

.resume-entry__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
}

.resume-entry__education-line {
  display: grid;
  grid-template-columns: minmax(140px, 1.2fr) minmax(100px, 0.9fr) minmax(52px, 0.45fr) auto;
  gap: 14px;
  align-items: center;
  color: #4d5563;
  font-size: 14px;
  line-height: 1.5;
}

.resume-entry__education-line strong,
.resume-entry__education-line span,
.resume-entry__education-line time {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-entry__education-line strong {
  color: #171a20;
  font-size: 15px;
}

.resume-entry__education-line time {
  color: #626b78;
  font-style: normal;
}

.resume-entry h3 {
  margin: 0;
  color: #171a20;
  font-size: 17px;
}

.resume-entry p {
  margin: 6px 0 0;
  color: #626b78;
  font-size: 14px;
}

.resume-entry__head > span {
  color: #626b78;
  font-size: 13px;
  white-space: nowrap;
}

.resume-entry ul {
  display: grid;
  gap: 7px;
  margin: 12px 0 0;
  padding-left: 20px;
  color: #3f4652;
  line-height: 1.65;
}

.resume-entry li::marker {
  color: #171a20;
}

.is-selected {
  outline: 2px solid rgba(23, 26, 32, 0.6);
  outline-offset: 5px;
}

.editor-field {
  display: grid;
  gap: 7px;
}

.editor-field span {
  color: var(--editor-muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.editor-field input,
.editor-field textarea {
  width: 100%;
  border: 1px solid var(--editor-line);
  border-radius: 10px;
  padding: 11px 12px;
  background: #fff;
  color: var(--editor-ink);
  font: inherit;
  line-height: 1.5;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.editor-field textarea {
  resize: vertical;
}

.editor-field input:focus,
.editor-field textarea:focus {
  border-color: rgba(23, 26, 32, 0.34);
  box-shadow: 0 0 0 4px rgba(23, 26, 32, 0.08);
}

.inspector-rich-preview {
  display: grid;
  gap: 10px;
}

.inspector-rich-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.inspector-rich-preview__head span {
  color: var(--editor-muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.inspector-rich-preview__body {
  min-height: 220px;
  max-height: 420px;
  overflow: auto;
  border: 1px solid rgba(23, 26, 32, 0.14);
  border-radius: 12px;
  padding: 12px 14px;
  background: #fff;
  color: var(--editor-ink);
  line-height: 1.65;
}

.inspector-rich-preview__body p {
  margin: 0 0 9px;
}

.inspector-rich-preview__body ul,
.inspector-rich-preview__body ol {
  margin: 0 0 9px;
  padding-left: 20px;
}

.inspector-rich-preview__empty {
  color: var(--editor-muted);
}

.resume-module-dialog {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 20, 26, 0.4);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.resume-module-dialog__panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(920px, 100%);
  max-height: min(760px, calc(100dvh - 48px));
  border: 1px solid rgba(23, 26, 32, 0.1);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 30px 80px rgba(17, 20, 26, 0.28);
  overflow: hidden;
}

.resume-module-dialog__head,
.resume-module-dialog__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
}

.resume-module-dialog__head {
  border-bottom: 1px solid var(--editor-line);
}

.resume-module-dialog__head p,
.resume-module-dialog__head h2 {
  margin: 0;
}

.resume-module-dialog__head p {
  color: var(--editor-muted);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resume-module-dialog__head h2 {
  margin-top: 4px;
  color: var(--editor-ink);
  font-size: 1.45rem;
  line-height: 1.2;
}

.resume-module-dialog__close {
  width: 38px;
  min-height: 38px;
  font-size: 1.35rem;
}

.resume-module-dialog__body {
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

.resume-module-dialog__actions {
  justify-content: flex-end;
  border-top: 1px solid var(--editor-line);
}

.resume-profile-dialog__panel {
  width: min(720px, 100%);
}

.resume-profile-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.resume-profile-dialog__grid .editor-field:first-child,
.resume-profile-dialog__grid .editor-field:nth-child(2) {
  grid-column: span 1;
}

.resume-module-dialog__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: var(--editor-muted);
  font-size: 0.9rem;
  font-weight: 900;
}

.resume-dialog-education-list {
  display: grid;
  gap: 12px;
}

.resume-dialog-education-item {
  display: grid;
  gap: 14px;
  border: 1px solid var(--editor-line);
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.resume-dialog-education-item.is-active {
  border-color: rgba(47, 107, 255, 0.28);
  background: rgba(47, 107, 255, 0.04);
  box-shadow: 0 14px 30px rgba(47, 107, 255, 0.08);
}

.resume-dialog-education-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.resume-dialog-education-item__head strong {
  color: var(--editor-ink);
  font-size: 0.96rem;
}

.resume-dialog-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 0.7fr);
  gap: 12px;
}

.resume-dialog-field-grid--education {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(110px, 0.55fr) minmax(150px, 0.75fr);
}

.resume-module-dialog-enter-active,
.resume-module-dialog-leave-active {
  transition: opacity 180ms ease;
}

.resume-module-dialog-enter-active .resume-module-dialog__panel,
.resume-module-dialog-leave-active .resume-module-dialog__panel {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.resume-module-dialog-enter-from,
.resume-module-dialog-leave-to {
  opacity: 0;
}

.resume-module-dialog-enter-from .resume-module-dialog__panel,
.resume-module-dialog-leave-to .resume-module-dialog__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}

.resume-rich-editor {
  display: grid;
  gap: 10px;
}

.resume-rich-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.resume-rich-editor__head > span {
  color: var(--editor-muted);
  font-size: 0.86rem;
  font-weight: 900;
}

.resume-rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.resume-rich-editor__toolbar button {
  min-width: 34px;
  min-height: 32px;
  border: 1px solid var(--editor-line);
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
  color: var(--editor-ink);
  font-weight: 900;
  cursor: pointer;
}

.resume-rich-editor__toolbar button:hover {
  border-color: rgba(23, 26, 32, 0.22);
  background: #f7f8fa;
}

.resume-rich-editor__toolbar button:focus {
  outline: none;
  box-shadow: none;
}

.resume-rich-editor__area {
  min-height: 420px;
  max-height: 520px;
  overflow: auto;
  border: 1px solid rgba(23, 26, 32, 0.24);
  border-radius: 12px;
  padding: 14px 16px;
  background: #fff;
  color: var(--editor-ink);
  line-height: 1.7;
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(23, 26, 32, 0.04);
}

.resume-rich-editor__area:focus {
  border-color: rgba(23, 26, 32, 0.34);
  box-shadow: inset 0 0 0 1px rgba(23, 26, 32, 0.06);
}

.resume-rich-editor__area p {
  margin: 0 0 10px;
}

.resume-rich-editor__area ul,
.resume-rich-editor__area ol {
  margin: 0 0 10px;
  padding-left: 22px;
}

.resume-rich-text--html p {
  margin: 0;
}

.resume-rich-text--html ul,
.resume-rich-text--html ol {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
}

.entry-action-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.section-empty-state {
  margin: 0;
  border: 1px dashed var(--editor-line);
  border-radius: 12px;
  padding: 18px;
  color: var(--editor-muted);
  text-align: center;
}

@media (max-width: 1180px) {
  .resume-editor-toolbar {
    grid-template-columns: 1fr;
  }

  .resume-editor-toolbar__center,
  .resume-editor-toolbar__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .resume-editor-shell {
    grid-template-columns: 250px minmax(0, 1fr);
    height: auto;
  }

}

@media (max-width: 820px) {
  .resume-editor-shell {
    grid-template-columns: 1fr;
  }

  .resume-inline-notice {
    top: 22px;
    left: 22px;
    right: 22px;
  }

  .resume-sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resume-stage {
    padding: 22px;
  }

  .resume-dialog-field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .resume-editor-toolbar {
    padding: 10px;
  }

  .resume-editor-toolbar__center,
  .resume-editor-toolbar__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resume-editor-toolbar__center > *,
  .resume-editor-toolbar__actions > * {
    width: 100%;
  }

  .resume-sidebar {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resume-module-dialog {
    padding: 12px;
  }

  .resume-module-dialog__panel {
    max-height: calc(100dvh - 24px);
  }

  .resume-module-dialog__head,
  .resume-module-dialog__actions,
  .resume-module-dialog__body {
    padding: 14px;
  }

  .resume-profile-dialog__grid {
    grid-template-columns: 1fr;
  }
}

@media print {
  @page {
    size: A4;
    margin: 0;
  }

  :global(html),
  :global(body) {
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    background: #fff;
  }

  .resume-editor-page {
    min-height: auto;
    background: #fff;
  }

  .resume-editor-toolbar,
  .resume-sidebar,
  .resume-module-dialog {
    display: none !important;
  }

  .resume-editor-shell {
    display: block;
    height: auto;
    padding: 0;
  }

  .resume-workspace {
    display: block;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: #fff;
  }

  .resume-stage {
    overflow: visible;
    padding: 0;
  }

  .resume-pages {
    display: block;
    min-width: 0;
  }

  .resume-paper-frame {
    width: 210mm !important;
    height: 297mm !important;
    margin: 0;
    break-after: page;
    page-break-after: always;
  }

  .resume-paper-frame:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .resume-page-label {
    display: none;
  }

  .resume-paper {
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    transform: none !important;
    border: 0;
    box-shadow: none;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .is-selected {
    outline: 0;
  }
}
</style>
