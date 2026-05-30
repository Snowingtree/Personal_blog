<template>
  <Teleport to="body">
    <Transition name="resume-module-dialog">
      <div v-if="open && section" class="resume-module-dialog" @click.self="closeDialog">
        <section class="resume-module-dialog__panel" role="dialog" aria-modal="true">
          <header class="resume-module-dialog__head">
            <div>
              <p>编辑模块</p>
              <h2>{{ section.resumeTitle || section.title }}</h2>
            </div>
            <button
              type="button"
              class="icon-btn resume-module-dialog__close"
              aria-label="关闭"
              @click="closeDialog"
            >
              ×
            </button>
          </header>

          <div v-if="section.key === 'education'" class="resume-module-dialog__body">
            <div class="resume-module-dialog__tools">
              <span>教育记录</span>
              <button type="button" class="editor-btn editor-btn--dark" @click="$emit('add-education')">
                新增
              </button>
            </div>

            <div class="resume-dialog-education-list">
              <article
                v-for="(item, index) in resume.education"
                :key="item.id"
                class="resume-dialog-education-item"
                :class="{ 'is-active': isEducationActive(index) }"
                @click="$emit('select-entry', 'education-item', index)"
              >
                <div class="resume-dialog-education-item__head">
                  <strong>教育 {{ index + 1 }}</strong>
                  <button
                    type="button"
                    class="editor-btn editor-btn--danger"
                    :disabled="resume.education.length <= 1"
                    @click.stop="$emit('remove-entry', 'education', index)"
                  >
                    删除
                  </button>
                </div>

                <div class="resume-dialog-field-grid resume-dialog-field-grid--education">
                  <label class="editor-field">
                    <span>大学</span>
                    <input v-model="item.school" type="text" />
                  </label>
                  <label class="editor-field">
                    <span>专业</span>
                    <input v-model="item.major" type="text" />
                  </label>
                  <label class="editor-field">
                    <span>学历</span>
                    <input v-model="item.degree" type="text" />
                  </label>
                  <label class="editor-field">
                    <span>时间</span>
                    <input v-model="item.period" type="text" />
                  </label>
                </div>
              </article>
            </div>
          </div>

          <div v-else class="resume-module-dialog__body">
            <section class="resume-rich-editor" aria-label="富文本编辑">
              <div class="resume-rich-editor__head">
                <span>{{ richTextLabel }}</span>
                <div class="resume-rich-editor__toolbar" aria-label="编辑工具">
                  <button type="button" @mousedown.prevent @click="runEditorCommand('bold')">B</button>
                  <button type="button" @mousedown.prevent @click="runEditorCommand('italic')">I</button>
                  <button type="button" @mousedown.prevent @click="runEditorCommand('insertUnorderedList')">•</button>
                  <button type="button" @mousedown.prevent @click="runEditorCommand('insertOrderedList')">1.</button>
                  <button type="button" @mousedown.prevent @click="runEditorCommand('removeFormat')">清除</button>
                </div>
              </div>
              <div
                ref="editorRef"
                class="resume-rich-editor__area"
                contenteditable="true"
                @input="handleEditorInput"
              ></div>
            </section>
          </div>

          <footer class="resume-module-dialog__actions">
            <button type="button" class="editor-btn editor-btn--dark" @click="closeDialog">
              完成
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  activeBlock: {
    type: Object,
    required: true
  },
  open: {
    type: Boolean,
    default: false
  },
  resume: {
    type: Object,
    required: true
  },
  section: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'add-education',
  'close',
  'commit-snapshot',
  'remove-entry',
  'select-entry',
  'update-rich-text'
])

const richTextLabels = {
  experience: '实习经历内容',
  projects: '项目经历内容',
  skills: '技能清单内容'
}

const editorRef = ref(null)
const richTextLabel = computed(() => richTextLabels[props.section?.key] || '内容')
const activeRichTextKey = computed(() => (props.section?.key === 'education' ? '' : props.section?.key || ''))
const activeRichTextValue = computed(() =>
  activeRichTextKey.value ? props.resume.richText?.[activeRichTextKey.value] || '' : ''
)

watch(
  () => [props.open, activeRichTextKey.value, activeRichTextValue.value],
  async () => {
    if (!props.open || !activeRichTextKey.value) {
      return
    }

    await nextTick()
    syncEditorContent()
  },
  { immediate: true }
)

function isEducationActive(index) {
  return props.activeBlock.type === 'education-item' && props.activeBlock.index === index
}

function closeDialog() {
  handleEditorInput()
  emit('commit-snapshot')
  emit('close')
}

function syncEditorContent() {
  if (typeof document !== 'undefined' && document.activeElement === editorRef.value) {
    return
  }

  if (!editorRef.value || editorRef.value.innerHTML === activeRichTextValue.value) {
    return
  }

  editorRef.value.innerHTML = toEditorHtml(activeRichTextValue.value)
}

function runEditorCommand(command) {
  if (!editorRef.value || typeof document === 'undefined') {
    return
  }

  editorRef.value.focus()
  document.execCommand(command, false)
  handleEditorInput()
}

function handleEditorInput() {
  if (!editorRef.value || !activeRichTextKey.value) {
    return
  }

  emit('update-rich-text', activeRichTextKey.value, cleanEditorHtml(editorRef.value.innerHTML))
}

function toEditorHtml(value) {
  const content = String(value || '').trim()

  if (!content) {
    return '<p><br></p>'
  }

  if (hasHtmlTag(content)) {
    return cleanEditorHtml(content)
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
  return blocks.length ? blocks.join('') : '<p><br></p>'
}

function cleanEditorHtml(value) {
  if (typeof document === 'undefined') {
    return String(value || '')
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

  return wrapper.innerHTML || '<p><br></p>'
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
