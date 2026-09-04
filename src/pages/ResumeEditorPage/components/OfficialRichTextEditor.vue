<template>
  <div
    ref="rootRef"
    class="ce-rich-text-kit"
    @click.stop="handleEditorClick"
    @keydown.stop="handleKeydown"
    @mousedown.stop
  >
    <div
      ref="editorRef"
      class="block-kit-editable notranslate"
      contenteditable="true"
      data-block-kit-editor="true"
      role="textbox"
      aria-multiline="true"
      :data-placeholder="placeholder"
      spellcheck="false"
      @blur="handleBlur"
      @input="scheduleChange"
      @keyup="refreshSelectionToolbar"
      @mouseup="refreshSelectionToolbar"
      @paste="handlePaste"
    ></div>

    <Teleport to="body">
      <div
        v-if="toolbar.visible"
        ref="toolbarRef"
        class="ce-rich-float-toolbar"
        :style="{ top: `${toolbar.top}px`, left: `${toolbar.left}px` }"
        @click.stop
        @mousedown.stop
      >
        <button
          type="button"
          title="加粗"
          :class="{ 'is-active': commandState.bold }"
          @mousedown.prevent="runCommand('bold')"
        ><strong>B</strong></button>
        <button
          type="button"
          title="斜体"
          :class="{ 'is-active': commandState.italic }"
          @mousedown.prevent="runCommand('italic')"
        ><em>I</em></button>
        <button
          type="button"
          title="下划线"
          :class="{ 'is-active': commandState.underline }"
          @mousedown.prevent="runCommand('underline')"
        ><u>U</u></button>
        <button
          type="button"
          title="删除线"
          :class="{ 'is-active': commandState.strikeThrough }"
          @mousedown.prevent="runCommand('strikeThrough')"
        ><s>S</s></button>
        <span class="ce-rich-toolbar-divider"></span>
        <button type="button" title="链接" @mousedown.prevent="openLinkEditor">
          <Link2 :size="15" />
        </button>
        <button type="button" title="行内代码" @mousedown.prevent="toggleInlineCode">
          <Code2 :size="15" />
        </button>
        <select
          title="字号"
          aria-label="字号"
          :value="toolbar.fontSize"
          @mousedown="rememberSelection"
          @change="applyFontSize"
        >
          <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}</option>
        </select>
        <label class="ce-rich-color-control" title="文字颜色" @mousedown="rememberSelection">
          <Baseline :size="15" />
          <input type="color" :value="toolbar.color" @input="applyFontColor" />
        </label>
        <select
          title="行高"
          aria-label="行高"
          :value="toolbar.lineHeight"
          @mousedown="rememberSelection"
          @change="applyLineHeight"
        >
          <option v-for="height in lineHeights" :key="height" :value="height">{{ height }}</option>
        </select>

        <form v-if="linkEditorVisible" class="ce-rich-link-editor" @submit.prevent="applyLink">
          <input
            ref="linkInputRef"
            v-model.trim="linkDraft"
            type="text"
            placeholder="https://example.com"
            aria-label="链接地址"
            @keydown.stop
          />
          <button type="submit">确定</button>
          <button type="button" title="移除链接" @mousedown.prevent="removeLink">移除</button>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Baseline, Code2, Link2 } from 'lucide-vue-next'
import { TEXT_ATTRS, TRULY } from 'sketching-plugin'

const props = defineProps({
  modelValue: {
    type: String,
    default: '[]'
  },
  targetId: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Please Enter...'
  }
})

const emit = defineEmits(['update:modelValue'])
const rootRef = ref(null)
const editorRef = ref(null)
const toolbarRef = ref(null)
const linkInputRef = ref(null)
const linkEditorVisible = ref(false)
const linkDraft = ref('')
const commandState = reactive({
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false
})
const toolbar = reactive({
  visible: false,
  top: 0,
  left: 0,
  fontSize: 14,
  color: '#1d2129',
  lineHeight: 1.5
})

const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32]
const lineHeights = [1, 1.2, 1.5, 1.7, 2, 2.5, 3]
const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'])
const BLUE_6 = 'rgb(22,93,255)'
const GRAY_2 = 'rgb(242,243,245)'

let savedRange = null
let changeTimerId = 0
let lastEmittedValue = ''

watch(
  () => props.modelValue,
  () => {
    if (props.modelValue === lastEmittedValue || document.activeElement === editorRef.value) {
      return
    }

    syncFromModel()
  }
)

onMounted(() => {
  syncFromModel()
  document.addEventListener('selectionchange', refreshSelectionToolbar)
  window.addEventListener('resize', refreshSelectionToolbar)
  window.addEventListener('scroll', refreshSelectionToolbar, true)
})

onBeforeUnmount(() => {
  flushChange()
  document.removeEventListener('selectionchange', refreshSelectionToolbar)
  window.removeEventListener('resize', refreshSelectionToolbar)
  window.removeEventListener('scroll', refreshSelectionToolbar, true)
})

function syncFromModel() {
  if (!editorRef.value) return
  editorRef.value.innerHTML = richTextToEditorHtml(props.modelValue)
  lastEmittedValue = props.modelValue
}

function scheduleChange() {
  window.clearTimeout(changeTimerId)
  changeTimerId = window.setTimeout(flushChange, 300)
  refreshSelectionToolbar()
}

function flushChange() {
  window.clearTimeout(changeTimerId)
  changeTimerId = 0

  if (!editorRef.value) return
  const value = JSON.stringify(editorToRichText(editorRef.value))

  if (value === lastEmittedValue) return
  lastEmittedValue = value
  emit('update:modelValue', value, props.targetId)
}

function handleBlur() {
  window.setTimeout(() => {
    if (!toolbarRef.value?.contains(document.activeElement)) {
      flushChange()
    }
  }, 0)
}

function handlePaste(event) {
  const text = event.clipboardData?.getData('text/plain')
  if (typeof text !== 'string') return
  event.preventDefault()
  document.execCommand('insertText', false, text)
  scheduleChange()
}

function handleKeydown(event) {
  if (!(event.ctrlKey || event.metaKey)) return
  const commandMap = { b: 'bold', i: 'italic', u: 'underline' }
  const command = commandMap[event.key.toLowerCase()]
  if (!command) return
  event.preventDefault()
  runCommand(command)
}

function handleEditorClick(event) {
  if (event.target instanceof HTMLAnchorElement) {
    event.preventDefault()
  }
}

function selectionBelongsToEditor(selection) {
  const editor = editorRef.value
  if (!editor || !selection?.rangeCount) return false
  return editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)
}

function rememberSelection() {
  const selection = window.getSelection()
  if (selectionBelongsToEditor(selection) && !selection.isCollapsed) {
    savedRange = selection.getRangeAt(0).cloneRange()
  }
}

function restoreSelection() {
  if (!savedRange || !editorRef.value) return false
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(savedRange)
  editorRef.value.focus({ preventScroll: true })
  return true
}

function refreshSelectionToolbar() {
  const selection = window.getSelection()

  if (!selectionBelongsToEditor(selection) || selection.isCollapsed) {
    if (!linkEditorVisible.value && !toolbarRef.value?.contains(document.activeElement)) {
      toolbar.visible = false
    }
    return
  }

  savedRange = selection.getRangeAt(0).cloneRange()
  const rect = savedRange.getBoundingClientRect()
  const center = rect.left + rect.width / 2
  toolbar.left = Math.max(230, Math.min(window.innerWidth - 230, center))
  toolbar.top = Math.max(52, rect.top - 8)
  toolbar.visible = true
  updateCommandState()
  updateSelectionValues(selection.anchorNode)
}

function updateCommandState() {
  for (const command of Object.keys(commandState)) {
    try {
      commandState[command] = document.queryCommandState(command)
    } catch {
      commandState[command] = false
    }
  }
}

function updateSelectionValues(node) {
  const element = node instanceof Element ? node : node?.parentElement
  if (!element || !editorRef.value?.contains(element)) return
  const style = window.getComputedStyle(element)
  const fontSize = Number.parseFloat(style.fontSize)
  const lineHeight = Number.parseFloat(style.lineHeight) / Math.max(fontSize, 1)
  const color = cssColorToHex(style.color)
  if (Number.isFinite(fontSize)) toolbar.fontSize = closestValue(fontSizes, fontSize)
  if (Number.isFinite(lineHeight)) toolbar.lineHeight = closestValue(lineHeights, lineHeight)
  if (color) toolbar.color = color
}

function runCommand(command) {
  if (!restoreSelection()) return
  document.execCommand(command, false)
  rememberSelection()
  scheduleChange()
  updateCommandState()
}

function applyFontSize(event) {
  if (!restoreSelection()) return
  const size = Math.max(8, Math.min(72, Number(event.target.value) || 14))
  document.execCommand('fontSize', false, '7')
  editorRef.value.querySelectorAll('font[size="7"]').forEach((element) => {
    element.removeAttribute('size')
    element.style.fontSize = `${size}px`
  })
  toolbar.fontSize = size
  rememberSelection()
  scheduleChange()
}

function applyFontColor(event) {
  if (!restoreSelection()) return
  const color = event.target.value
  document.execCommand('foreColor', false, color)
  toolbar.color = color
  rememberSelection()
  scheduleChange()
}

function applyLineHeight(event) {
  if (!restoreSelection() || !savedRange) return
  const value = Math.max(1, Math.min(3, Number(event.target.value) || 1.5))
  const lines = resolveSelectedLines(savedRange)
  lines.forEach((line) => {
    line.style.lineHeight = String(value)
    line.dataset.lineHeight = String(value)
  })
  toolbar.lineHeight = value
  rememberSelection()
  scheduleChange()
}

function toggleInlineCode() {
  if (!restoreSelection() || !savedRange) return
  const common = savedRange.commonAncestorContainer instanceof Element
    ? savedRange.commonAncestorContainer
    : savedRange.commonAncestorContainer.parentElement
  const existing = common?.closest('code, [data-inline-code="true"]')

  if (existing && editorRef.value.contains(existing)) {
    existing.replaceWith(...existing.childNodes)
  } else {
    const code = document.createElement('code')
    code.dataset.inlineCode = 'true'
    code.className = 'ce-rich-inline-code'
    code.append(savedRange.extractContents())
    savedRange.insertNode(code)
    savedRange.selectNodeContents(code)
  }

  rememberSelection()
  scheduleChange()
}

function openLinkEditor() {
  if (!restoreSelection()) return
  let currentLink = ''
  const common = savedRange.commonAncestorContainer instanceof Element
    ? savedRange.commonAncestorContainer
    : savedRange.commonAncestorContainer.parentElement
  const link = common?.closest('a')
  if (link && editorRef.value.contains(link)) currentLink = link.getAttribute('href') || ''
  linkDraft.value = currentLink
  linkEditorVisible.value = true
  toolbar.visible = true
  nextTick(() => linkInputRef.value?.focus())
}

function applyLink() {
  if (!restoreSelection()) return
  const href = normalizeLink(linkDraft.value)
  if (href) {
    document.execCommand('createLink', false, href)
  } else {
    document.execCommand('unlink', false)
  }
  linkEditorVisible.value = false
  rememberSelection()
  scheduleChange()
}

function removeLink() {
  if (!restoreSelection()) return
  document.execCommand('unlink', false)
  linkEditorVisible.value = false
  rememberSelection()
  scheduleChange()
}

function resolveSelectedLines(range) {
  if (!editorRef.value) return []
  return [...editorRef.value.querySelectorAll('[data-rich-line="true"], li, p')]
    .filter((line) => {
      try {
        return range.intersectsNode(line)
      } catch {
        return false
      }
    })
}

function richTextToEditorHtml(raw) {
  const lines = parseRichText(raw)
  if (!lines.length) return '<div data-rich-line="true"><br></div>'

  return lines.map((line) => {
    const config = line?.config && typeof line.config === 'object' ? line.config : {}
    const configAttr = escapeAttribute(JSON.stringify(config))
    const lineHeight = finiteNumber(config[TEXT_ATTRS.LINE_HEIGHT])
    const lineStyle = lineHeight ? ` style="line-height:${clamp(lineHeight, 1, 3)}"` : ''

    if (isTruthy(config[TEXT_ATTRS.DIVIDING_LINE])) {
      return `<div data-rich-line="true" data-divider="true" data-line-config="${configAttr}" contenteditable="false" class="ce-rich-divider-line"><span class="ce-rich-divider"></span></div>`
    }

    const content = renderRuns(Array.isArray(line?.chars) ? line.chars : []) || '<br>'
    const unorderedLevel = finiteNumber(config[TEXT_ATTRS.UNORDERED_LIST_LEVEL])
    const orderedLevel = finiteNumber(config[TEXT_ATTRS.ORDERED_LIST_LEVEL])

    if (unorderedLevel) {
      return `<ul class="ce-rich-list" data-list-level="${unorderedLevel}"><li data-rich-line="true" data-list-type="bullet" data-list-level="${unorderedLevel}" data-line-config="${configAttr}"${lineStyle}>${content}</li></ul>`
    }

    if (orderedLevel) {
      const start = Math.max(1, finiteNumber(config[TEXT_ATTRS.ORDERED_LIST_START]) || 1)
      return `<ol class="ce-rich-list" start="${start}" data-list-level="${orderedLevel}"><li value="${start}" data-rich-line="true" data-list-type="order" data-list-level="${orderedLevel}" data-list-start="${start}" data-line-config="${configAttr}"${lineStyle}>${content}</li></ol>`
    }

    return `<div data-rich-line="true" data-line-config="${configAttr}"${lineStyle}>${content}</div>`
  }).join('')
}

function renderRuns(chars) {
  const groups = []

  chars.forEach((item) => {
    const char = String(item?.char ?? '')
    const config = item?.config && typeof item.config === 'object' ? item.config : {}
    const signature = JSON.stringify(config)
    const last = groups.at(-1)
    if (last?.signature === signature) {
      last.text += char
    } else {
      groups.push({ signature, text: char, config })
    }
  })

  return groups.map(({ text, config }) => {
    const style = inlineStyle(config)
    const configAttr = escapeAttribute(JSON.stringify(config))
    const content = escapeHtml(text)
    const span = `<span data-rich-config="${configAttr}"${style ? ` style="${style}"` : ''}>${content}</span>`
    const href = normalizeLink(config[TEXT_ATTRS.LINK])
    return href ? `<a href="${escapeAttribute(href)}" class="ce-rich-link">${span}</a>` : span
  }).join('')
}

function editorToRichText(editor) {
  const lines = []
  const orphanNodes = []

  const flushOrphans = () => {
    if (!orphanNodes.length) return
    const container = document.createElement('div')
    orphanNodes.splice(0).forEach((node) => container.append(node.cloneNode(true)))
    lines.push(serializeLine(container, {}))
  }

  const processList = (list, level = 1) => {
    const listType = list.tagName === 'OL' ? 'order' : 'bullet'
    const items = [...list.children].filter((child) => child.tagName === 'LI')
    items.forEach((item, index) => {
      const start = Number(item.dataset.listStart || item.value || list.start || index + 1)
      lines.push(serializeLine(item, { type: listType, level, start }))
      ;[...item.children]
        .filter((child) => child.tagName === 'UL' || child.tagName === 'OL')
        .forEach((child) => processList(child, level + 1))
    })
  }

  ;[...editor.childNodes].forEach((node) => {
    if (node instanceof HTMLUListElement || node instanceof HTMLOListElement) {
      flushOrphans()
      processList(node, Math.max(1, Number(node.dataset.listLevel) || 1))
      return
    }

    if (node instanceof HTMLElement && (BLOCK_TAGS.has(node.tagName) || node.dataset.richLine)) {
      flushOrphans()
      lines.push(serializeLine(node, {}))
      return
    }

    if (node instanceof HTMLBRElement) {
      flushOrphans()
      lines.push({ chars: [], config: {} })
      return
    }

    orphanNodes.push(node)
  })

  flushOrphans()
  return lines.length ? lines : [{ chars: [], config: {} }]
}

function serializeLine(source, listContext) {
  const baseConfig = parseConfig(source.dataset?.lineConfig)
  const config = { ...baseConfig }
  delete config[TEXT_ATTRS.BREAK_LINE_START]

  if (source.dataset?.divider === 'true' || source.querySelector?.('.ce-rich-divider')) {
    config[TEXT_ATTRS.DIVIDING_LINE] = TRULY
    return { chars: [], config }
  }

  const lineHeight = finiteNumber(source.dataset?.lineHeight || source.style?.lineHeight)
  if (lineHeight) config[TEXT_ATTRS.LINE_HEIGHT] = String(clamp(lineHeight, 1, 3))

  const listType = listContext.type || source.dataset?.listType
  const listLevel = Math.max(1, Number(listContext.level || source.dataset?.listLevel) || 1)
  if (listType === 'bullet') {
    config[TEXT_ATTRS.UNORDERED_LIST_LEVEL] = String(listLevel)
    delete config[TEXT_ATTRS.ORDERED_LIST_LEVEL]
    delete config[TEXT_ATTRS.ORDERED_LIST_START]
  } else if (listType === 'order') {
    config[TEXT_ATTRS.ORDERED_LIST_LEVEL] = String(listLevel)
    config[TEXT_ATTRS.ORDERED_LIST_START] = String(Math.max(1, Number(listContext.start || source.dataset?.listStart) || 1))
    delete config[TEXT_ATTRS.UNORDERED_LIST_LEVEL]
  }

  const clone = source.cloneNode(true)
  clone.querySelectorAll('ul, ol, [data-rich-marker], [contenteditable="false"]').forEach((node) => node.remove())
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT)
  const chars = []
  let textNode = walker.nextNode()

  while (textNode) {
    const char = textNode.nodeValue?.replaceAll('\u200b', '') || ''
    if (char) chars.push({ char, config: readInlineConfig(textNode, clone) })
    textNode = walker.nextNode()
  }

  return { chars, config }
}

function readInlineConfig(textNode, boundary) {
  const chain = []
  let element = textNode.parentElement
  while (element && element !== boundary) {
    chain.unshift(element)
    element = element.parentElement
  }

  const config = {}
  chain.forEach((node) => {
    Object.assign(config, parseConfig(node.dataset?.richConfig))
    const tag = node.tagName
    if (tag === 'B' || tag === 'STRONG') config[TEXT_ATTRS.WEIGHT] = 'bold'
    if (tag === 'I' || tag === 'EM') config[TEXT_ATTRS.STYLE] = 'italic'
    if (tag === 'U') config[TEXT_ATTRS.UNDERLINE] = TRULY
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') config[TEXT_ATTRS.STRIKE_THROUGH] = TRULY
    if (tag === 'CODE' || node.dataset?.inlineCode === 'true') config[TEXT_ATTRS.BACKGROUND] = GRAY_2
    if (tag === 'A') {
      const href = normalizeLink(node.getAttribute('href'))
      if (href) {
        config[TEXT_ATTRS.LINK] = href
        config[TEXT_ATTRS.COLOR] = BLUE_6
      }
    }

    applyElementStyle(config, node)
  })

  return cleanInlineConfig(config)
}

function applyElementStyle(config, element) {
  const style = element.style
  const weight = style.fontWeight
  if (weight) {
    if (weight === 'normal' || Number(weight) < 600) delete config[TEXT_ATTRS.WEIGHT]
    else config[TEXT_ATTRS.WEIGHT] = 'bold'
  }
  if (style.fontStyle) {
    if (style.fontStyle === 'normal') delete config[TEXT_ATTRS.STYLE]
    else config[TEXT_ATTRS.STYLE] = 'italic'
  }
  if (style.fontSize) {
    const size = finiteNumber(style.fontSize)
    if (size) config[TEXT_ATTRS.SIZE] = clamp(size, 8, 72)
  }
  const color = normalizeCssColor(style.color || element.getAttribute('color'))
  if (color) config[TEXT_ATTRS.COLOR] = color
  const background = normalizeCssColor(style.backgroundColor)
  if (background && background !== 'rgba(0, 0, 0, 0)') config[TEXT_ATTRS.BACKGROUND] = background

  const decoration = `${style.textDecoration} ${style.textDecorationLine}`
  if (decoration.includes('underline')) config[TEXT_ATTRS.UNDERLINE] = TRULY
  if (decoration.includes('line-through')) config[TEXT_ATTRS.STRIKE_THROUGH] = TRULY
  if (decoration.includes('none')) {
    delete config[TEXT_ATTRS.UNDERLINE]
    delete config[TEXT_ATTRS.STRIKE_THROUGH]
  }
}

function cleanInlineConfig(config) {
  const cleaned = {}
  const supported = [
    TEXT_ATTRS.WEIGHT,
    TEXT_ATTRS.STYLE,
    TEXT_ATTRS.UNDERLINE,
    TEXT_ATTRS.STRIKE_THROUGH,
    TEXT_ATTRS.BACKGROUND,
    TEXT_ATTRS.COLOR,
    TEXT_ATTRS.SIZE,
    TEXT_ATTRS.LINK,
    TEXT_ATTRS.FAMILY
  ]
  supported.forEach((key) => {
    if (config[key] !== undefined && config[key] !== null && config[key] !== '') {
      cleaned[key] = config[key]
    }
  })
  return cleaned
}

function inlineStyle(config) {
  const styles = []
  if (config[TEXT_ATTRS.WEIGHT] === 'bold') styles.push('font-weight:bold')
  if (config[TEXT_ATTRS.STYLE] === 'italic') styles.push('font-style:italic')
  const size = finiteNumber(config[TEXT_ATTRS.SIZE])
  if (size) styles.push(`font-size:${clamp(size, 8, 72)}px`)
  const color = normalizeCssColor(config[TEXT_ATTRS.COLOR])
  const background = normalizeCssColor(config[TEXT_ATTRS.BACKGROUND])
  if (color) styles.push(`color:${color}`)
  if (background) styles.push(`background-color:${background}`)
  const decorations = []
  if (isTruthy(config[TEXT_ATTRS.UNDERLINE])) decorations.push('underline')
  if (isTruthy(config[TEXT_ATTRS.STRIKE_THROUGH])) decorations.push('line-through')
  if (decorations.length) styles.push(`text-decoration:${decorations.join(' ')}`)
  return styles.join(';')
}

function parseRichText(raw) {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseConfig(raw) {
  try {
    const parsed = JSON.parse(raw || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeLink(value) {
  const link = String(value || '').trim()
  if (!link) return ''
  if (/^(https?:|mailto:|tel:|#)/i.test(link)) return link
  return `https://${link}`
}

function normalizeCssColor(value) {
  const color = String(value || '').trim()
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color
  const match = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (!match) return ''
  return `rgb(${Math.round(Number(match[1]))},${Math.round(Number(match[2]))},${Math.round(Number(match[3]))})`
}

function cssColorToHex(value) {
  const color = normalizeCssColor(value)
  if (color.startsWith('#')) return color.slice(0, 7)
  const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/)
  if (!match) return ''
  return `#${match.slice(1).map((item) => Number(item).toString(16).padStart(2, '0')).join('')}`
}

function finiteNumber(value) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : 0
}

function closestValue(values, target) {
  return values.reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function isTruthy(value) {
  return value === true || String(value) === TRULY
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttribute(value) {
  return escapeHtml(value)
}
</script>

<style scoped>
.ce-rich-text-kit {
  position: relative;
  width: 100%;
  min-width: 0;
  margin-top: 6px;
  color: #1d2129;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  word-break: break-all;
}

.block-kit-editable {
  position: relative;
  min-height: 220px;
  padding: 2px 0 20px;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  cursor: text;
  user-select: text;
}

.block-kit-editable:empty::before {
  color: #c9cdd4;
  content: attr(data-placeholder);
  pointer-events: none;
}

.block-kit-editable :deep([data-rich-line="true"]) {
  min-height: 1.5em;
  margin: 0;
}

.block-kit-editable :deep(.ce-rich-list) {
  margin: 0;
  padding-left: 22px;
}

.block-kit-editable :deep(.ce-rich-list[data-list-level="2"]) { padding-left: 40px; }
.block-kit-editable :deep(.ce-rich-list[data-list-level="3"]) { padding-left: 58px; }

.block-kit-editable :deep(.ce-rich-divider-line) {
  box-sizing: border-box;
  min-height: 7px;
  padding: 2px 0 4px;
  user-select: none;
}

.block-kit-editable :deep(.ce-rich-divider) {
  display: block;
  width: 100%;
  border-bottom: 1px solid #e5e6eb;
}

.block-kit-editable :deep(.ce-rich-link) {
  color: #165dff;
  text-decoration: none;
}

.block-kit-editable :deep(.ce-rich-inline-code),
.block-kit-editable :deep(code) {
  padding: 1px 3px;
  border-radius: 3px;
  background: #f2f3f5;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
</style>

<style>
.ce-rich-float-toolbar {
  position: fixed;
  z-index: 220;
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 34px;
  padding: 4px;
  border: 1px solid #e5e6eb;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(0 0 0 / 16%);
  transform: translate(-50%, -100%);
  user-select: none;
}

.ce-rich-float-toolbar > button,
.ce-rich-float-toolbar > select,
.ce-rich-color-control {
  box-sizing: border-box;
  height: 27px;
  border: 0;
  border-radius: 3px;
  color: #4e5969;
  background: transparent;
}

.ce-rich-float-toolbar > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  padding: 0;
  cursor: pointer;
}

.ce-rich-float-toolbar > button:hover,
.ce-rich-float-toolbar > button.is-active {
  color: #165dff;
  background: #e8f3ff;
}

.ce-rich-float-toolbar > select {
  width: 47px;
  padding: 0 3px;
  outline: none;
  cursor: pointer;
}

.ce-rich-toolbar-divider {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: #e5e6eb;
}

.ce-rich-color-control {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  cursor: pointer;
}

.ce-rich-color-control input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.ce-rich-color-control::after {
  position: absolute;
  right: 6px;
  bottom: 2px;
  left: 6px;
  height: 2px;
  background: currentColor;
  content: '';
}

.ce-rich-link-editor {
  position: absolute;
  top: calc(100% + 5px);
  left: 82px;
  display: flex;
  gap: 5px;
  padding: 6px;
  border: 1px solid #e5e6eb;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(0 0 0 / 14%);
}

.ce-rich-link-editor input {
  box-sizing: border-box;
  width: 210px;
  height: 27px;
  padding: 0 7px;
  border: 1px solid #c9cdd4;
  border-radius: 3px;
  outline: none;
}

.ce-rich-link-editor button {
  min-width: 44px;
  height: 27px;
  padding: 0 7px;
  border: 1px solid #c9cdd4;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
}
</style>
