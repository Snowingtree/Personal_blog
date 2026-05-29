<template>
  <aside class="resume-inspector" aria-label="属性编辑">
    <section class="editor-panel editor-panel--inspector">
      <div class="editor-panel__head">
        <span>{{ activePanelTitle }}</span>
      </div>

      <div v-if="activeBlock.type === 'profile'" class="field-stack">
        <label class="editor-field">
          <span>姓名</span>
          <input v-model="resume.profile.name" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>职位</span>
          <input v-model="resume.profile.role" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>电话</span>
          <input v-model="resume.profile.phone" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>邮箱</span>
          <input v-model="resume.profile.email" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>城市</span>
          <input v-model="resume.profile.location" type="text" @change="$emit('commit-snapshot')" />
        </label>
      </div>

      <div v-else-if="isRichTextBlock(activeBlock.type)" class="field-stack">
        <section class="inspector-rich-preview">
          <div class="inspector-rich-preview__head">
            <span>{{ getRichTextLabel(activeBlock.type) }}</span>
            <button type="button" class="editor-btn" @click="$emit('open-module-editor', activeBlock.type)">
              编辑
            </button>
          </div>
          <div class="inspector-rich-preview__body" v-html="getRichTextPreview(activeBlock.type)"></div>
        </section>
      </div>

      <div v-else-if="activeBlock.type === 'education-item' && selectedEducation" class="field-stack">
        <label class="editor-field">
          <span>学校</span>
          <input v-model="selectedEducation.school" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>专业</span>
          <input v-model="selectedEducation.major" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>时间</span>
          <input v-model="selectedEducation.period" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <EntryActions
          :index="activeBlock.index"
          :length="resume.education.length"
          :show-move-controls="false"
          @move-up="$emit('move-entry', 'education', activeBlock.index, -1)"
          @move-down="$emit('move-entry', 'education', activeBlock.index, 1)"
          @remove="$emit('remove-entry', 'education', activeBlock.index)"
        />
      </div>

      <div v-else-if="activeSection" class="field-stack">
        <label class="module-toggle module-toggle--inspector">
          <input
            v-model="resume.visibleSections[activeSection.key]"
            type="checkbox"
            @change="$emit('section-visibility-change', activeSection.key)"
          />
          <span>显示 {{ activeSection.title }}</span>
        </label>
        <div v-if="activeSection.key !== 'education'" class="entry-action-row">
          <button
            type="button"
            class="editor-btn"
            :disabled="activeSectionIndex <= 0"
            @click="$emit('move-section', activeSectionIndex, -1)"
          >
            上移
          </button>
          <button
            type="button"
            class="editor-btn"
            :disabled="activeSectionIndex >= moduleNavigator.length - 1"
            @click="$emit('move-section', activeSectionIndex, 1)"
          >
            下移
          </button>
        </div>
      </div>

      <div v-else class="field-stack">
        <p class="section-empty-state">选择画布里的内容后编辑。</p>
      </div>
    </section>
  </aside>
</template>

<script setup>
import EntryActions from './EntryActions.vue'

const props = defineProps({
  activeBlock: {
    type: Object,
    required: true
  },
  activePanelTitle: {
    type: String,
    required: true
  },
  activeSection: {
    type: Object,
    default: null
  },
  activeSectionIndex: {
    type: Number,
    required: true
  },
  moduleNavigator: {
    type: Array,
    required: true
  },
  resume: {
    type: Object,
    required: true
  },
  selectedEducation: {
    type: Object,
    default: null
  }
})

defineEmits([
  'commit-snapshot',
  'move-entry',
  'move-section',
  'remove-entry',
  'open-module-editor',
  'section-visibility-change',
  'update-rich-text'
])

const richTextLabels = {
  experience: '实习内容',
  projects: '项目内容',
  skills: '技能内容'
}

function isRichTextBlock(type) {
  return Object.hasOwn(richTextLabels, type)
}

function getRichTextLabel(type) {
  return richTextLabels[type] || '内容'
}
function getRichTextPreview(type) {
  const content = String(props.resume.richText?.[type] || '').trim()

  if (!content) {
    return '<p class="inspector-rich-preview__empty">暂无内容</p>'
  }

  if (hasHtmlTag(content)) {
    return cleanRichTextHtml(content)
  }

  return plainTextToHtml(content)
}

function plainTextToHtml(value) {
  const lines = String(value || '')
    .split('\n')
    .map((line) => line.trim())
  const blocks = []
  let listItems = []

  const flushList = () => {
    if (!listItems.length) {
      return
    }

    blocks.push(`<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`)
    listItems = []
  }

  lines.forEach((line) => {
    if (!line) {
      flushList()
      return
    }

    if (/^[-*•]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*•]\s+/, ''))
      return
    }

    flushList()
    blocks.push(`<p>${escapeHtml(line)}</p>`)
  })

  flushList()
  return blocks.length ? blocks.join('') : '<p class="inspector-rich-preview__empty">暂无内容</p>'
}

function cleanRichTextHtml(value) {
  if (typeof document === 'undefined') {
    return escapeHtml(value)
  }

  const template = document.createElement('template')
  template.innerHTML = String(value || '')
  const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI'])

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '')
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment()
    }

    const tagName = allowedTags.has(node.tagName) ? node.tagName.toLowerCase() : 'p'
    const element = document.createElement(tagName)

    node.childNodes.forEach((child) => {
      element.appendChild(cleanNode(child))
    })

    if (!element.childNodes.length && tagName === 'p') {
      element.appendChild(document.createElement('br'))
    }

    return element
  }

  const wrapper = document.createElement('div')
  template.content.childNodes.forEach((child) => {
    wrapper.appendChild(cleanNode(child))
  })

  return wrapper.innerHTML || '<p class="inspector-rich-preview__empty">暂无内容</p>'
}

function hasHtmlTag(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
</script>
