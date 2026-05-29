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
        @drop-section="dropSection"
        @move-section="moveSection"
        @section-visibility-change="handleSectionVisibilityChange"
        @select-module="selectModule"
        @select-navigator-child="selectNavigatorChild"
        @start-section-drag="startSectionDrag"
      />

      <ResumeEditorWorkspace
        :active-block="activeBlock"
        :paper-frame-style="paperFrameStyle"
        :paper-style="paperStyle"
        :resume="resume"
        :resume-pages="resumePages"
        :ruler-marks="rulerMarks"
        @select-entry="selectEntry"
        @select-module="selectModule"
        @select-profile="selectProfile"
        @select-skill="selectSkill"
      />

      <ResumeEditorInspector
        :active-block="activeBlock"
        :active-panel-title="activePanelTitle"
        :active-section="activeSection"
        :active-section-index="activeSectionIndex"
        :module-navigator="moduleNavigator"
        :resume="resume"
        :selected-education="selectedEducation"
        :selected-experience="selectedExperience"
        :selected-project="selectedProject"
        @add-skill="addSkill"
        @commit-snapshot="commitSnapshot"
        @move-entry="moveEntry"
        @move-section="moveSection"
        @move-skill="moveSkill"
        @remove-entry="removeEntry"
        @remove-skill="removeSkill"
        @section-visibility-change="handleSectionVisibilityChange"
        @update-bullets="updateBullets"
        @update-skill="updateSkill"
      />
    </div>
  </main>
</template>
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ResumeEditorInspector from './components/ResumeEditorInspector.vue'
import ResumeEditorSidebar from './components/ResumeEditorSidebar.vue'
import ResumeEditorToolbar from './components/ResumeEditorToolbar.vue'
import ResumeEditorWorkspace from './components/ResumeEditorWorkspace.vue'

const RESUME_EDITOR_DRAFT_KEY = 'vibe-coding-resume-editor-draft'
const PAPER_WIDTH = 794
const PAPER_HEIGHT = 1123
const PAGE_CONTENT_HEIGHT = 1040
const PROFILE_BLOCK_HEIGHT = 178
const MODULE_BASE_HEIGHT = 84

const sectionControls = [
  { key: 'summary', title: '个人优势', description: '一段概要' },
  { key: 'experience', title: '工作经历', description: '公司 / 岗位 / 要点' },
  { key: 'projects', title: '项目经历', description: '项目 / 角色 / 成果' },
  { key: 'education', title: '教育经历', description: '学校 / 专业 / 时间' },
  { key: 'skills', title: '技能清单', description: '标签式技能' }
]
const sectionMap = new Map(sectionControls.map((section) => [section.key, section]))
const defaultSectionOrder = sectionControls.map((section) => section.key)
const zoomOptions = [70, 80, 90, 100, 110, 120]
const rulerMarks = [0, 25, 50, 75, 100]

const resume = ref(createDefaultResume())
const activeBlock = ref({ type: 'profile', key: 'profile', index: null })
const zoom = ref(90)
const historyStack = ref([])
const draftStatus = ref('')
const draggingSectionKey = ref('')
let draftStatusTimer = 0

const zoomScale = computed(() => zoom.value / 100)
const canUndo = computed(() => historyStack.value.length > 1)
const moduleNavigator = computed(() =>
  normalizeSectionOrder(resume.value.sectionOrder).map((key) => ({
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
const activeSection = computed(() =>
  activeBlock.value.key ? sectionMap.get(activeBlock.value.key) || null : null
)
const activeSectionIndex = computed(() =>
  activeSection.value ? moduleNavigator.value.findIndex((section) => section.key === activeSection.value.key) : -1
)
const paperFrameStyle = computed(() => ({
  width: `${Math.round(PAPER_WIDTH * zoomScale.value)}px`,
  height: `${Math.round(PAPER_HEIGHT * zoomScale.value)}px`
}))
const paperStyle = computed(() => ({
  transform: `scale(${zoomScale.value})`
}))
const activePanelTitle = computed(() => {
  if (activeBlock.value.type === 'profile') {
    return '基本信息'
  }

  if (activeBlock.value.type === 'experience-item') {
    return '工作经历'
  }

  if (activeBlock.value.type === 'project-item') {
    return '项目经历'
  }

  if (activeBlock.value.type === 'education-item') {
    return '教育经历'
  }

  if (activeBlock.value.type === 'skill-item') {
    return '技能条目'
  }

  return activeSection.value?.title || '属性编辑'
})
const selectedExperience = computed(() => resume.value.experience[activeBlock.value.index] || null)
const selectedProject = computed(() => resume.value.projects[activeBlock.value.index] || null)
const selectedEducation = computed(() => resume.value.education[activeBlock.value.index] || null)

function createDefaultResume() {
  return {
    pageCount: 1,
    sectionOrder: [...defaultSectionOrder],
    visibleSections: {
      summary: true,
      experience: true,
      projects: true,
      education: true,
      skills: true
    },
    profile: {
      name: '刘安',
      role: '前端开发工程师',
      phone: '138 0000 0000',
      email: 'liuan@example.com',
      location: '杭州',
      summary:
        '关注工程质量、交互体验和产品落地，熟悉 Vue 技术栈，能够独立完成从页面搭建、状态组织到接口联调的完整前端工作。'
    },
    experience: [
      {
        id: createId(),
        company: 'Snowingress Studio',
        role: '前端开发实习生',
        period: '2025.07 - 至今',
        bullets: [
          '负责内部工具页面搭建，完成登录、列表管理、编辑器交互和移动端适配。',
          '优化图片与接口请求链路，减少首屏等待时间并提升异常状态可读性。',
          '参与组件样式收敛，沉淀可复用的表单、弹窗和卡片布局。'
        ]
      }
    ],
    projects: [
      {
        id: createId(),
        name: '在线笔记与 AI 问答工作台',
        role: '个人项目',
        period: '2026.02 - 2026.05',
        bullets: [
          '实现 Markdown 文件树、预览、编辑、提交与 AI 出题流程。',
          '接入私有后台接口，统一处理鉴权、刷新 token 和错误提示。',
          '针对移动端重构布局，保证窄屏下核心操作可用。'
        ]
      }
    ],
    education: [
      {
        id: createId(),
        school: '某某大学',
        major: '软件工程 本科',
        period: '2022.09 - 2026.06'
      }
    ],
    skills: ['Vue 3', 'JavaScript', 'Vite', 'Node.js', 'MySQL', 'UI 还原']
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeSectionOrder(order) {
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

function normalizeVisibleSections(visibleSections = {}) {
  return defaultSectionOrder.reduce((result, key) => {
    result[key] = visibleSections[key] !== false
    return result
  }, {})
}

function normalizePageCount(pageCount) {
  const count = Number(pageCount)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1
}

function createResumePage(includeProfile) {
  return {
    includeProfile,
    sections: [],
    usedHeight: includeProfile ? PROFILE_BLOCK_HEIGHT : 0
  }
}

function paginateSections(sections) {
  const pages = [createResumePage(true)]

  sections.forEach((section) => {
    const sectionHeight = estimateSectionHeight(section.key)
    let currentPage = pages[pages.length - 1]
    const currentPageHasContent = currentPage.includeProfile || currentPage.sections.length > 0

    if (currentPageHasContent && currentPage.usedHeight + sectionHeight > PAGE_CONTENT_HEIGHT) {
      currentPage = createResumePage(false)
      pages.push(currentPage)
    }

    currentPage.sections.push(section)
    currentPage.usedHeight += sectionHeight
  })

  return pages.map(({ usedHeight, ...page }) => page)
}

function estimateSectionHeight(key) {
  if (key === 'summary') {
    return MODULE_BASE_HEIGHT + estimateTextLines(resume.value.profile.summary, 48) * 25
  }

  if (key === 'experience') {
    return estimateTimelineSectionHeight(resume.value.experience, 'company', 'role')
  }

  if (key === 'projects') {
    return estimateTimelineSectionHeight(resume.value.projects, 'name', 'role')
  }

  if (key === 'education') {
    const itemCount = Math.max(resume.value.education.length, 1)
    return MODULE_BASE_HEIGHT + itemCount * 58 + Math.max(itemCount - 1, 0) * 12
  }

  if (key === 'skills') {
    const rows = Math.max(Math.ceil(resume.value.skills.length / 4), 1)
    return MODULE_BASE_HEIGHT + rows * 36
  }

  return MODULE_BASE_HEIGHT
}

function estimateTimelineSectionHeight(items, titleKey, subtitleKey) {
  const normalizedItems = Array.isArray(items) && items.length ? items : [{}]

  return (
    MODULE_BASE_HEIGHT +
    normalizedItems.reduce((total, item) => {
      const titleLines = estimateTextLines(item[titleKey], 26)
      const subtitleLines = estimateTextLines(item[subtitleKey], 34)
      const bulletHeight = estimateBulletHeight(item.bullets)
      return total + 42 + titleLines * 20 + subtitleLines * 18 + bulletHeight
    }, 0) +
    Math.max(normalizedItems.length - 1, 0) * 18
  )
}

function estimateBulletHeight(bullets) {
  if (!Array.isArray(bullets) || !bullets.length) {
    return 0
  }

  return bullets.reduce((total, bullet) => total + estimateTextLines(bullet, 52) * 24 + 7, 12)
}

function estimateTextLines(value, charsPerLine) {
  const text = String(value || '').trim()

  if (!text) {
    return 1
  }

  return text
    .split(/\n+/)
    .reduce((total, line) => total + Math.max(Math.ceil(line.length / charsPerLine), 1), 0)
}

function getSectionNavigatorChildren(key) {
  if (key === 'summary') {
    return [
      {
        id: 'summary-content',
        type: 'summary',
        sectionKey: 'summary',
        index: null,
        label: '个人优势内容',
        meta: getExcerpt(resume.value.profile.summary, 18)
      }
    ]
  }

  if (key === 'experience') {
    return resume.value.experience.map((item, index) => ({
      id: item.id || `experience-${index}`,
      type: 'experience-item',
      sectionKey: 'experience',
      index,
      label: item.company || item.role || `工作经历 ${index + 1}`,
      meta: [item.role, item.period].filter(Boolean).join(' · ') || `第 ${index + 1} 条`
    }))
  }

  if (key === 'projects') {
    return resume.value.projects.map((item, index) => ({
      id: item.id || `project-${index}`,
      type: 'project-item',
      sectionKey: 'projects',
      index,
      label: item.name || item.role || `项目经历 ${index + 1}`,
      meta: [item.role, item.period].filter(Boolean).join(' · ') || `第 ${index + 1} 条`
    }))
  }

  if (key === 'education') {
    return resume.value.education.map((item, index) => ({
      id: item.id || `education-${index}`,
      type: 'education-item',
      sectionKey: 'education',
      index,
      label: item.school || item.major || `教育经历 ${index + 1}`,
      meta: [item.major, item.period].filter(Boolean).join(' · ') || `第 ${index + 1} 条`
    }))
  }

  if (key === 'skills') {
    return resume.value.skills.map((skill, index) => ({
      id: `skill-${index}-${skill}`,
      type: 'skill-item',
      sectionKey: 'skills',
      index,
      label: skill || `技能 ${index + 1}`,
      meta: `第 ${index + 1} 项`
    }))
  }

  return []
}

function getExcerpt(value, limit) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()

  if (!text) {
    return '点击编辑内容'
  }

  return text.length > limit ? `${text.slice(0, limit)}...` : text
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
  if (key === 'summary' || key === 'skills') {
    activeBlock.value = { type: key, key, index: null }
    return
  }

  activeBlock.value = { type: 'module', key, index: null }
}

function selectEntry(type, index) {
  const sectionKeyByType = {
    'experience-item': 'experience',
    'project-item': 'projects',
    'education-item': 'education'
  }

  activeBlock.value = {
    type,
    key: sectionKeyByType[type],
    index
  }
}

function selectSkill(index) {
  if (index < 0 || index >= resume.value.skills.length) {
    selectModule('skills')
    return
  }

  activeBlock.value = { type: 'skill-item', key: 'skills', index }
}

function selectNavigatorChild(child) {
  if (child.type === 'summary') {
    selectModule('summary')
    return
  }

  if (child.type === 'skill-item') {
    selectSkill(child.index)
    return
  }

  selectEntry(child.type, child.index)
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

function moveSection(index, direction) {
  const nextOrder = normalizeSectionOrder(resume.value.sectionOrder)
  const nextIndex = index + direction

  if (nextIndex < 0 || nextIndex >= nextOrder.length) {
    return
  }

  const [sectionKey] = nextOrder.splice(index, 1)
  nextOrder.splice(nextIndex, 0, sectionKey)
  resume.value.sectionOrder = nextOrder
  selectModule(sectionKey)
  commitSnapshot()
}

function handleSectionVisibilityChange(key) {
  if (!resume.value.visibleSections[key] && activeBlock.value.key === key) {
    selectProfile()
  }

  commitSnapshot()
}

function addExperience() {
  resume.value.experience.push({
    id: createId(),
    company: '公司名称',
    role: '岗位名称',
    period: '2026.01 - 2026.06',
    bullets: ['补充负责事项、关键成果或量化指标。']
  })
  ensureSectionVisible('experience')
  selectEntry('experience-item', resume.value.experience.length - 1)
  commitSnapshot()
}

function addProject() {
  resume.value.projects.push({
    id: createId(),
    name: '项目名称',
    role: '负责角色',
    period: '2026.01 - 2026.03',
    bullets: ['补充项目背景、技术方案和个人贡献。']
  })
  ensureSectionVisible('projects')
  selectEntry('project-item', resume.value.projects.length - 1)
  commitSnapshot()
}

function addEducation() {
  resume.value.education.push({
    id: createId(),
    school: '学校名称',
    major: '专业 / 学历',
    period: '2022.09 - 2026.06'
  })
  ensureSectionVisible('education')
  selectEntry('education-item', resume.value.education.length - 1)
  commitSnapshot()
}

function addSkill() {
  resume.value.skills.push('新技能')
  ensureSectionVisible('skills')
  selectSkill(resume.value.skills.length - 1)
  commitSnapshot()
}

function ensureSectionVisible(key) {
  resume.value.visibleSections[key] = true
  resume.value.sectionOrder = normalizeSectionOrder(resume.value.sectionOrder)
}

function removeSkill(index) {
  resume.value.skills.splice(index, 1)

  if (activeBlock.value.type === 'skill-item') {
    const nextIndex = Math.min(index, resume.value.skills.length - 1)

    if (nextIndex >= 0) {
      selectSkill(nextIndex)
    } else {
      selectModule('skills')
    }
  }

  commitSnapshot()
}

function updateSkill(index, value) {
  if (index < 0 || index >= resume.value.skills.length) {
    return
  }

  resume.value.skills[index] = value
}

function moveSkill(index, direction) {
  const nextIndex = index + direction

  if (nextIndex < 0 || nextIndex >= resume.value.skills.length) {
    return
  }

  const [skill] = resume.value.skills.splice(index, 1)
  resume.value.skills.splice(nextIndex, 0, skill)
  selectSkill(nextIndex)
  commitSnapshot()
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
    experience: 'experience-item',
    projects: 'project-item',
    education: 'education-item'
  }

  selectEntry(entryTypeByCollection[collectionName], nextIndex)
  commitSnapshot()
}

function updateBullets(item, value) {
  if (!item) {
    return
  }

  item.bullets = String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
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
  selectProfile()
  flashStatus('已撤销')
}

function saveDraft() {
  commitSnapshot()
  writeDraft()
  flashStatus('草稿已保存')
}

function resetResume() {
  if (typeof window !== 'undefined' && !window.confirm('确认重置为示例简历吗？')) {
    return
  }

  resume.value = createDefaultResume()
  selectProfile()
  commitSnapshot()
  flashStatus('已重置')
}

function addPage() {
  resume.value.pageCount = Math.max(normalizePageCount(resume.value.pageCount), resumePages.value.length) + 1
  commitSnapshot()
  flashStatus('已添加一页')
}

async function exportPdf() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const previousTitle = document.title
  const exportTitle = `${sanitizeFileName(resume.value.profile.name || 'resume')}-简历`
  let fallbackTimer = 0

  const restoreTitle = () => {
    document.title = previousTitle
    window.removeEventListener('afterprint', restoreTitle)

    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer)
    }
  }

  document.title = exportTitle
  window.addEventListener('afterprint', restoreTitle)
  flashStatus('正在打开PDF导出')
  await nextTick()

  window.setTimeout(() => {
    window.print()
    fallbackTimer = window.setTimeout(restoreTitle, 1200)
  }, 80)
}

function sanitizeFileName(fileName) {
  return String(fileName)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
        profile: {
          ...defaultResume.profile,
          ...parsedDraft.profile
        },
        visibleSections: normalizeVisibleSections(parsedDraft.visibleSections),
        experience: Array.isArray(parsedDraft.experience)
          ? parsedDraft.experience
          : defaultResume.experience,
        projects: Array.isArray(parsedDraft.projects)
          ? parsedDraft.projects
          : defaultResume.projects,
        education: Array.isArray(parsedDraft.education)
          ? parsedDraft.education
          : defaultResume.education,
        skills: Array.isArray(parsedDraft.skills) ? parsedDraft.skills : defaultResume.skills
      }
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
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  gap: 14px;
  height: calc(100dvh - 64px);
  padding: 14px;
}

.resume-sidebar,
.resume-inspector,
.resume-workspace {
  min-height: 0;
}

.resume-sidebar,
.resume-inspector {
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

.editor-panel--inspector {
  flex: 1;
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
  grid-template-columns: auto auto minmax(0, 1fr) auto;
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

.module-sort-item__visible {
  display: inline-flex;
  align-items: center;
}

.module-sort-item__visible input,
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

.workspace-ruler {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  min-height: 34px;
  border-bottom: 1px solid var(--editor-line);
  background: rgba(255, 255, 255, 0.94);
  color: var(--editor-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.workspace-ruler span {
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 8px;
}

.workspace-ruler span::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 12px;
  background: rgba(23, 26, 32, 0.24);
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

.resume-document-hero,
.resume-module {
  position: relative;
  margin: 0 56px;
  padding: 22px 0;
  cursor: pointer;
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

.resume-summary {
  margin: 0;
  color: #444b57;
  line-height: 1.8;
}

.resume-entry + .resume-entry {
  margin-top: 18px;
}

.resume-entry {
  position: relative;
  border-radius: 10px;
}

.resume-entry__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
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

.resume-skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.resume-skill-list li {
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(23, 26, 32, 0.14);
  background: #fff;
  color: #171a20;
  font-size: 13px;
  font-weight: 800;
}

.is-selected {
  outline: 2px solid rgba(23, 26, 32, 0.6);
  outline-offset: 5px;
}

.resume-entry.is-selected {
  outline-offset: 7px;
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
.editor-field textarea,
.skill-editor-row input {
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
.editor-field textarea:focus,
.skill-editor-row input:focus {
  border-color: rgba(23, 26, 32, 0.34);
  box-shadow: 0 0 0 4px rgba(23, 26, 32, 0.08);
}

.entry-action-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.skill-editor-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.skill-editor-row .icon-btn {
  width: auto;
  padding: 0 10px;
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

  .resume-inspector {
    grid-column: 1 / -1;
    max-height: 420px;
  }
}

@media (max-width: 820px) {
  .resume-editor-shell {
    grid-template-columns: 1fr;
  }

  .resume-sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resume-stage {
    padding: 22px;
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
  .resume-inspector,
  .workspace-ruler {
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
