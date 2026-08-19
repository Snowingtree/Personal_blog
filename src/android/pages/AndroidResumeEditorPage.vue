<template>
  <section class="android-page android-resume-page">
    <header class="android-resume-header">
      <span class="android-resume-header__icon"><FileText :size="22" /></span>
      <div>
        <p>MOBILE CV STUDIO</p>
        <h1>简历编辑</h1>
        <span>为触屏重新整理的轻量编辑器，草稿只保存在当前设备。</span>
      </div>
    </header>

    <div class="android-resume-toolbar">
      <div class="android-resume-mode" aria-label="简历视图">
        <button type="button" :class="{ 'is-active': mode === 'edit' }" @click="mode = 'edit'">
          <PencilLine :size="16" /> 编辑
        </button>
        <button type="button" :class="{ 'is-active': mode === 'preview' }" @click="mode = 'preview'">
          <Eye :size="16" /> 预览
        </button>
      </div>

      <div class="android-resume-toolbar__actions">
        <span v-if="statusMessage">{{ statusMessage }}</span>
        <button type="button" @click="resetResume"><RotateCcw :size="16" /> 重置</button>
        <button type="button" class="is-primary" @click="saveDraft"><Save :size="16" /> 保存</button>
      </div>
    </div>

    <div v-if="mode === 'edit'" class="android-resume-editor">
      <section class="android-resume-card">
        <div class="android-resume-card__heading">
          <div>
            <small>PROFILE</small>
            <h2>个人信息</h2>
          </div>
          <UserRound :size="20" />
        </div>

        <div class="android-resume-fields android-resume-fields--profile">
          <label>
            <span>姓名</span>
            <input v-model.trim="resume.profile.name" type="text" autocomplete="name" />
          </label>
          <label>
            <span>求职方向</span>
            <input v-model.trim="resume.profile.role" type="text" />
          </label>
          <label>
            <span>手机号</span>
            <input v-model.trim="resume.profile.phone" type="tel" autocomplete="tel" />
          </label>
          <label>
            <span>邮箱</span>
            <input v-model.trim="resume.profile.email" type="email" autocomplete="email" />
          </label>
          <label>
            <span>所在地</span>
            <input v-model.trim="resume.profile.location" type="text" />
          </label>
        </div>
      </section>

      <section
        v-for="(section, sectionIndex) in orderedSections"
        :key="section.key"
        class="android-resume-card android-resume-section-card"
      >
        <div class="android-resume-card__heading">
          <div>
            <small>{{ section.tag }}</small>
            <h2>{{ section.title }}</h2>
          </div>
          <div class="android-resume-section-actions">
            <button
              type="button"
              :disabled="sectionIndex === 0"
              :aria-label="`上移${section.title}`"
              @click="moveSection(section.key, -1)"
            ><ArrowUp :size="16" /></button>
            <button
              type="button"
              :disabled="sectionIndex === orderedSections.length - 1"
              :aria-label="`下移${section.title}`"
              @click="moveSection(section.key, 1)"
            ><ArrowDown :size="16" /></button>
            <label class="android-resume-visibility">
              <input v-model="resume.visibleSections[section.key]" type="checkbox" />
              <span>{{ resume.visibleSections[section.key] ? '显示' : '隐藏' }}</span>
            </label>
          </div>
        </div>

        <template v-if="section.key === 'education'">
          <article
            v-for="(education, index) in resume.education"
            :key="education.id"
            class="android-resume-education"
          >
            <div class="android-resume-education__index">
              <strong>教育 {{ index + 1 }}</strong>
              <button type="button" @click="removeEducation(index)"><Trash2 :size="15" /> 删除</button>
            </div>
            <div class="android-resume-fields">
              <label><span>学校</span><input v-model.trim="education.school" type="text" /></label>
              <label><span>专业</span><input v-model.trim="education.major" type="text" /></label>
              <label><span>学历</span><input v-model.trim="education.degree" type="text" /></label>
              <label><span>时间</span><input v-model.trim="education.period" type="text" /></label>
            </div>
          </article>
          <button class="android-resume-add" type="button" @click="addEducation">
            <Plus :size="17" /> 添加教育经历
          </button>
        </template>

        <label v-else class="android-resume-rich-field">
          <span>{{ section.description }}</span>
          <textarea v-model="resume.richText[section.key]" rows="8"></textarea>
          <small>每行会在预览中保留换行，建议使用“标题 | 角色 | 时间”和短横线描述。</small>
        </label>
      </section>
    </div>

    <section v-else class="android-resume-preview-wrap">
      <div class="android-resume-preview-actions">
        <span>移动端预览</span>
        <button type="button" @click="printResume"><Printer :size="16" /> 打印 / 导出</button>
      </div>

      <article class="android-resume-paper">
        <header>
          <h2>{{ resume.profile.name || '姓名' }}</h2>
          <p>{{ resume.profile.role || '求职方向' }}</p>
          <ul>
            <li v-if="resume.profile.phone">{{ resume.profile.phone }}</li>
            <li v-if="resume.profile.email">{{ resume.profile.email }}</li>
            <li v-if="resume.profile.location">{{ resume.profile.location }}</li>
          </ul>
        </header>

        <section
          v-for="section in visiblePreviewSections"
          :key="section.key"
          class="android-resume-paper__section"
        >
          <h3>{{ section.title }}</h3>

          <div v-if="section.key === 'education'" class="android-resume-paper__education">
            <article v-for="education in resume.education" :key="education.id">
              <div><strong>{{ education.school }}</strong><span>{{ education.period }}</span></div>
              <p>{{ [education.major, education.degree].filter(Boolean).join(' · ') }}</p>
            </article>
          </div>

          <div v-else class="android-resume-paper__richtext">
            <p v-for="(line, index) in getRichTextLines(section.key)" :key="`${section.key}-${index}`">
              {{ line }}
            </p>
          </div>
        </section>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FileText,
  PencilLine,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  UserRound
} from 'lucide-vue-next'

const DRAFT_KEY = 'vibe-coding-resume-editor-draft'
const sectionDefinitions = [
  { key: 'education', tag: 'EDUCATION', title: '教育经历', description: '学校、专业和学习时间' },
  { key: 'projects', tag: 'PROJECTS', title: '项目经历', description: '项目、职责和成果' },
  { key: 'skills', tag: 'SKILLS', title: '技能清单', description: '技术栈和能力说明' },
  { key: 'experience', tag: 'EXPERIENCE', title: '实习经历', description: '公司、岗位和工作内容' }
]
const sectionMap = new Map(sectionDefinitions.map((section) => [section.key, section]))
const mode = ref('edit')
const resume = ref(createDefaultResume())
const statusMessage = ref('')
const ready = ref(false)
let statusTimer = 0

const orderedSections = computed(() => normalizeSectionOrder(resume.value.sectionOrder).map((key) => sectionMap.get(key)))
const visiblePreviewSections = computed(() =>
  orderedSections.value.filter((section) => resume.value.visibleSections[section.key] !== false)
)

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createDefaultResume() {
  return {
    pageCount: 1,
    sectionOrder: sectionDefinitions.map((section) => section.key),
    visibleSections: { education: true, projects: true, skills: true, experience: true },
    moduleBounds: {},
    profile: {
      name: '刘安',
      role: '前端开发工程师',
      phone: '138 0000 0000',
      email: 'liuan@example.com',
      location: '杭州'
    },
    richText: {
      experience: 'Snowingress Studio | 前端开发实习生 | 2025.07 - 至今\n- 负责页面搭建、列表管理、编辑交互和移动端适配。\n- 优化图片加载和接口请求链路，提升异常状态可读性。',
      projects: '在线笔记与 AI 问答工作台 | 个人项目 | 2026.02 - 2026.05\n- 实现 Markdown 文件树、预览、编辑、提交与 AI 出题流程。\n- 接入后台接口，统一处理鉴权、刷新 token 和错误提示。',
      skills: 'Vue 生态：熟悉 Vue2 / Vue3、Composition API、Pinia 和 Vue Router。\n工程化：熟悉 Vite、组件拆分和前端构建流程。\n页面实现：关注移动端适配、交互细节和可维护的样式组织。'
    },
    education: [
      { id: createId(), school: '某某大学', major: '软件工程', degree: '本科', period: '2022.09 - 2026.06' }
    ]
  }
}

function normalizeSectionOrder(order) {
  const validKeys = sectionDefinitions.map((section) => section.key)
  const normalized = Array.isArray(order) ? order.filter((key, index) => validKeys.includes(key) && order.indexOf(key) === index) : []
  validKeys.forEach((key) => {
    if (!normalized.includes(key)) normalized.push(key)
  })
  return normalized
}

function normalizeResume(value) {
  const defaults = createDefaultResume()
  const source = value && typeof value === 'object' ? value : {}
  return {
    ...defaults,
    ...source,
    sectionOrder: normalizeSectionOrder(source.sectionOrder),
    profile: { ...defaults.profile, ...(source.profile || {}) },
    visibleSections: { ...defaults.visibleSections, ...(source.visibleSections || {}) },
    richText: {
      ...defaults.richText,
      ...(source.richText || {}),
      experience: source.richText?.experience ?? source.experience ?? defaults.richText.experience,
      projects: source.richText?.projects ?? source.projects ?? defaults.richText.projects,
      skills: source.richText?.skills ?? source.skills ?? defaults.richText.skills
    },
    education: Array.isArray(source.education)
      ? source.education.map((item) => ({ id: item.id || createId(), school: '', major: '', degree: '', period: '', ...item }))
      : defaults.education
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) resume.value = normalizeResume(JSON.parse(raw))
  } catch {
    localStorage.removeItem(DRAFT_KEY)
  }
}

function writeDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(resume.value))
}

function flashStatus(message) {
  statusMessage.value = message
  window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => { statusMessage.value = '' }, 1500)
}

function saveDraft() {
  writeDraft()
  flashStatus('已保存到本机')
}

function resetResume() {
  if (!window.confirm('确认恢复默认简历内容？')) return
  resume.value = createDefaultResume()
  writeDraft()
  flashStatus('已恢复默认内容')
}

function moveSection(key, direction) {
  const order = normalizeSectionOrder(resume.value.sectionOrder)
  const currentIndex = order.indexOf(key)
  const nextIndex = currentIndex + direction
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return
  ;[order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]]
  resume.value.sectionOrder = order
}

function addEducation() {
  resume.value.education.push({ id: createId(), school: '', major: '', degree: '', period: '' })
}

function removeEducation(index) {
  resume.value.education.splice(index, 1)
}

function getRichTextLines(key) {
  return String(resume.value.richText[key] || '').split(/\r?\n/).filter((line) => line.trim())
}

function printResume() {
  window.print()
}

watch(resume, () => {
  if (!ready.value) return
  writeDraft()
}, { deep: true })

onMounted(() => {
  loadDraft()
  ready.value = true
})
</script>

<style scoped>
.android-resume-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.android-resume-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 10px 3px 7px;
}

.android-resume-header__icon {
  flex: 0 0 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #303338;
  background: #e3e4e6;
}

.android-resume-header p,
.android-resume-card__heading small {
  margin: 0 0 7px;
  color: #6e7278;
  font-size: 0.66rem;
  font-weight: 850;
  letter-spacing: 0.15em;
}

.android-resume-header h1 {
  margin: 0;
  color: #25272a;
  font-size: clamp(1.8rem, 6vw, 3rem);
  line-height: 1;
  letter-spacing: -0.05em;
}

.android-resume-header > div > span {
  display: block;
  margin-top: 9px;
  color: #74787e;
  font-size: 0.8rem;
}

.android-resume-toolbar,
.android-resume-card,
.android-resume-preview-wrap {
  border: 1px solid #dedfe1;
  background: #fff;
  box-shadow: 0 14px 38px rgba(35, 36, 39, 0.06);
}

.android-resume-toolbar {
  position: sticky;
  top: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px;
  border-radius: 19px;
}

.android-resume-mode,
.android-resume-toolbar__actions,
.android-resume-section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.android-resume-mode {
  padding: 3px;
  border-radius: 13px;
  background: #eff0f1;
}

.android-resume-mode button,
.android-resume-toolbar__actions button,
.android-resume-section-actions button,
.android-resume-preview-actions button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 0;
  border-radius: 11px;
  color: #60646a;
  background: transparent;
  font-size: 0.72rem;
  font-weight: 750;
}

.android-resume-mode button.is-active,
.android-resume-toolbar__actions button.is-primary {
  color: #fff;
  background: #36393e;
}

.android-resume-toolbar__actions > span {
  color: #777b81;
  font-size: 0.66rem;
}

.android-resume-editor {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.android-resume-card {
  padding: clamp(18px, 4vw, 26px);
  border-radius: 23px;
}

.android-resume-card__heading,
.android-resume-education__index,
.android-resume-preview-actions,
.android-resume-paper header ul,
.android-resume-paper__education article > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.android-resume-card__heading h2 {
  margin: 0;
  color: #27292d;
  font-size: 1.1rem;
}

.android-resume-card__heading > svg {
  color: #92969c;
}

.android-resume-section-actions button {
  width: 34px;
  min-height: 34px;
  padding: 0;
  background: #eff0f1;
}

.android-resume-section-actions button:disabled {
  opacity: 0.3;
}

.android-resume-visibility {
  position: relative;
}

.android-resume-visibility input {
  position: absolute;
  opacity: 0;
}

.android-resume-visibility span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 11px;
  color: #fff;
  background: #4a4e54;
  font-size: 0.66rem;
  font-weight: 750;
}

.android-resume-visibility input:not(:checked) + span {
  color: #85898f;
  background: #eeeef0;
}

.android-resume-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  margin-top: 15px;
}

.android-resume-fields--profile label:nth-child(2) {
  grid-column: span 1;
}

.android-resume-fields label,
.android-resume-rich-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.android-resume-fields label > span,
.android-resume-rich-field > span {
  color: #777b81;
  font-size: 0.68rem;
  font-weight: 700;
}

.android-resume-fields input,
.android-resume-rich-field textarea {
  width: 100%;
  border: 1px solid #dfe0e2;
  border-radius: 13px;
  color: #292b2f;
  background: #f7f7f6;
  font: inherit;
  outline: none;
}

.android-resume-fields input {
  min-height: 44px;
  padding: 10px 12px;
  font-size: 0.78rem;
}

.android-resume-rich-field {
  margin-top: 16px;
}

.android-resume-rich-field textarea {
  min-height: 176px;
  padding: 13px;
  resize: vertical;
  font-size: 0.78rem;
  line-height: 1.65;
}

.android-resume-fields input:focus,
.android-resume-rich-field textarea:focus {
  border-color: #777b81;
  box-shadow: 0 0 0 3px rgba(61, 64, 69, 0.08);
}

.android-resume-rich-field > small {
  color: #999da3;
  font-size: 0.62rem;
  line-height: 1.5;
}

.android-resume-education {
  margin-top: 15px;
  padding: 14px;
  border-radius: 17px;
  background: #f5f5f4;
}

.android-resume-education__index strong {
  font-size: 0.74rem;
}

.android-resume-education__index button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  color: #8a5b55;
  background: transparent;
  font-size: 0.66rem;
}

.android-resume-add {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 11px;
  border: 1px dashed #c8cace;
  border-radius: 14px;
  color: #55595f;
  background: #fafafa;
  font-size: 0.72rem;
  font-weight: 750;
}

.android-resume-preview-wrap {
  padding: clamp(13px, 3vw, 20px);
  border-radius: 24px;
}

.android-resume-preview-actions {
  padding: 1px 2px 12px;
  color: #74787e;
  font-size: 0.72rem;
}

.android-resume-preview-actions button {
  color: #fff;
  background: #36393e;
}

.android-resume-paper {
  min-height: 880px;
  padding: clamp(24px, 6vw, 58px);
  border: 1px solid #e1e2e4;
  color: #25272a;
  background: #fff;
  box-shadow: 0 18px 42px rgba(35, 36, 39, 0.08);
}

.android-resume-paper header {
  padding-bottom: 18px;
  border-bottom: 2px solid #32353a;
}

.android-resume-paper header h2 {
  margin: 0;
  font-size: clamp(2rem, 8vw, 3.5rem);
  letter-spacing: -0.06em;
}

.android-resume-paper header > p {
  margin: 7px 0 0;
  color: #55595f;
  font-weight: 700;
}

.android-resume-paper header ul {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin: 14px 0 0;
  padding: 0;
  color: #74787e;
  font-size: 0.7rem;
  list-style: none;
}

.android-resume-paper__section {
  margin-top: 24px;
}

.android-resume-paper__section h3 {
  margin: 0 0 12px;
  padding-bottom: 7px;
  border-bottom: 1px solid #d7d9dc;
  font-size: 0.94rem;
  letter-spacing: 0.08em;
}

.android-resume-paper__education,
.android-resume-paper__richtext {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.android-resume-paper__education article > div strong,
.android-resume-paper__education article > div span {
  font-size: 0.76rem;
}

.android-resume-paper__education article p,
.android-resume-paper__richtext p {
  margin: 4px 0 0;
  color: #55595f;
  font-size: 0.72rem;
  line-height: 1.65;
}

@media (max-width: 620px) {
  .android-resume-toolbar {
    position: static;
    align-items: stretch;
    flex-direction: column;
  }

  .android-resume-mode button {
    flex: 1;
  }

  .android-resume-toolbar__actions {
    justify-content: flex-end;
  }

  .android-resume-toolbar__actions > span {
    margin-right: auto;
  }

  .android-resume-card__heading {
    align-items: flex-start;
  }

  .android-resume-section-card .android-resume-card__heading {
    flex-direction: column;
  }

  .android-resume-section-actions {
    width: 100%;
  }

  .android-resume-section-actions .android-resume-visibility {
    margin-left: auto;
  }

  .android-resume-fields {
    grid-template-columns: 1fr;
  }

  .android-resume-paper {
    min-height: 720px;
  }
}

@media print {
  :global(.android-resume-header),
  :global(.android-resume-toolbar),
  .android-resume-preview-actions {
    display: none !important;
  }

  :global(.android-shell__content) {
    margin: 0 !important;
  }

  .android-resume-page,
  .android-resume-preview-wrap {
    width: 100%;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  .android-resume-paper {
    min-height: 0;
    border: 0;
    box-shadow: none;
  }
}
</style>
