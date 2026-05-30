<template>
  <section class="resume-workspace" aria-label="简历画布">
    <div class="resume-stage">
      <div class="resume-pages">
        <div
          v-for="page in resumePages"
          :key="page.number"
          class="resume-paper-frame"
          :style="paperFrameStyle"
        >
          <span class="resume-page-label">第 {{ page.number }} 页</span>
          <article
            class="resume-paper"
            :class="{ 'resume-paper--continuation': !page.includeProfile }"
            :style="paperStyle"
          >
            <header
              v-if="page.includeProfile"
              class="resume-document-hero"
              @click.stop="$emit('select-profile')"
            >
              <div>
                <h1>{{ resume.profile.name }}</h1>
                <p>{{ resume.profile.role }}</p>
              </div>
              <ul class="resume-contact-list">
                <li>{{ resume.profile.phone }}</li>
                <li>{{ resume.profile.email }}</li>
                <li>{{ resume.profile.location }}</li>
              </ul>
            </header>

            <template v-for="section in page.sections" :key="`${page.number}-${section.key}-${section.partIndex || 0}`">
              <section
                v-if="section.key === 'experience'"
                class="resume-module"
                :class="getModuleClass(section)"
                :ref="(element) => setModuleElement('experience', element)"
                :style="getModuleStyle(section)"
                draggable="true"
                @dragstart="handleModuleDragStart('experience', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('experience')"
                @dragend="handleModuleDragEnd"
                @click.stop="$emit('select-module', 'experience')"
                @dblclick.stop="$emit('open-module-editor', 'experience')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('experience')"
                  :hide-bottom="section.continuesNext"
                  :hide-top="section.isContinuation"
                  @start="startBoundaryResize('experience', $event)"
                />
                <h2 v-if="!section.isContinuation">{{ section.resumeTitle || section.title }}</h2>
                <RichTextContent
                  :content="section.content ?? resume.richText?.experience"
                  :show-empty="!section.hideEmptyContent"
                />
              </section>

              <section
                v-else-if="section.key === 'projects'"
                class="resume-module"
                :class="getModuleClass(section)"
                :ref="(element) => setModuleElement('projects', element)"
                :style="getModuleStyle(section)"
                draggable="true"
                @dragstart="handleModuleDragStart('projects', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('projects')"
                @dragend="handleModuleDragEnd"
                @click.stop="$emit('select-module', 'projects')"
                @dblclick.stop="$emit('open-module-editor', 'projects')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('projects')"
                  :hide-bottom="section.continuesNext"
                  :hide-top="section.isContinuation"
                  @start="startBoundaryResize('projects', $event)"
                />
                <h2 v-if="!section.isContinuation">{{ section.resumeTitle || section.title }}</h2>
                <RichTextContent
                  :content="section.content ?? resume.richText?.projects"
                  :show-empty="!section.hideEmptyContent"
                />
              </section>

              <section
                v-else-if="section.key === 'education'"
                class="resume-module"
                :class="getModuleClass(section)"
                :ref="(element) => setModuleElement('education', element)"
                :style="getModuleStyle(section)"
                draggable="true"
                @dragstart="handleModuleDragStart('education', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('education')"
                @dragend="handleModuleDragEnd"
                @click.stop="$emit('select-module', 'education')"
                @dblclick.stop="$emit('open-module-editor', 'education')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('education')"
                  @start="startBoundaryResize('education', $event)"
                />
                <h2>{{ section.resumeTitle || section.title }}</h2>
                <article
                  v-for="(item, index) in resume.education"
                  :key="item.id"
                  class="resume-entry resume-entry--compact"
                  :class="{ 'is-active': isEducationEntryActive(index) }"
                  @click.stop="$emit('select-entry', 'education-item', index)"
                  @dblclick.stop="$emit('open-module-editor', 'education', index)"
                >
                  <div class="resume-entry__head">
                    <div>
                      <h3>{{ item.school }}</h3>
                      <p>{{ item.major }}</p>
                    </div>
                    <span>{{ item.period }}</span>
                  </div>
                </article>
              </section>

              <section
                v-else-if="section.key === 'skills'"
                class="resume-module"
                :class="getModuleClass(section)"
                :ref="(element) => setModuleElement('skills', element)"
                :style="getModuleStyle(section)"
                draggable="true"
                @dragstart="handleModuleDragStart('skills', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('skills')"
                @dragend="handleModuleDragEnd"
                @click.stop="$emit('select-module', 'skills')"
                @dblclick.stop="$emit('open-module-editor', 'skills')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('skills')"
                  :hide-bottom="section.continuesNext"
                  :hide-top="section.isContinuation"
                  @start="startBoundaryResize('skills', $event)"
                />
                <h2 v-if="!section.isContinuation">{{ section.resumeTitle || section.title }}</h2>
                <RichTextContent
                  :content="section.content ?? resume.richText?.skills"
                  :show-empty="!section.hideEmptyContent"
                />
              </section>
            </template>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineComponent, h, nextTick, onBeforeUnmount, watch } from 'vue'

const boundaryEdges = ['top', 'right', 'bottom', 'left']
const DEFAULT_MODULE_TOP = 22

const BoundaryHandles = defineComponent({
  name: 'BoundaryHandles',
  props: {
    hideBottom: {
      type: Boolean,
      default: false
    },
    hideTop: {
      type: Boolean,
      default: false
    }
  },
  emits: ['start'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        { class: 'module-boundary-handles', 'aria-label': '模块边界调整' },
        boundaryEdges
          .filter((edge) => !(edge === 'top' && props.hideTop) && !(edge === 'bottom' && props.hideBottom))
          .map((edge) =>
          h('button', {
            key: edge,
            type: 'button',
            draggable: 'false',
            class: ['module-boundary-handle', `module-boundary-handle--${edge}`],
            'aria-label': `调整${edge}边界`,
            onClick: (event) => event.stopPropagation(),
            onPointerdown: (event) => emit('start', { edge, event })
          })
          )
      )
  }
})

const RichTextContent = defineComponent({
  name: 'RichTextContent',
  props: {
    content: {
      type: String,
      default: ''
    },
    showEmpty: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    return () => {
      const content = String(props.content || '')

      if (!content.trim() && !props.showEmpty) {
        return h('div', { class: 'resume-rich-text resume-rich-text--empty-fragment' })
      }

      if (hasHtmlTag(content)) {
        return h('div', {
          class: 'resume-rich-text resume-rich-text--html',
          innerHTML: cleanRichTextHtml(content)
        })
      }

      return h('div', { class: 'resume-rich-text' }, renderRichTextBlocks(content))
    }
  }
})

const props = defineProps({
  activeBlock: {
    type: Object,
    required: true
  },
  draggingSectionKey: {
    type: String,
    default: ''
  },
  paperFrameStyle: {
    type: Object,
    required: true
  },
  paperStyle: {
    type: Object,
    required: true
  },
  resume: {
    type: Object,
    required: true
  },
  resumePages: {
    type: Array,
    required: true
  },
  zoomScale: {
    type: Number,
    required: true
  }
})

const emit = defineEmits([
  'clear-section-drag',
  'commit-boundary-resize',
  'drop-section',
  'open-module-editor',
  'resize-module-boundary',
  'select-entry',
  'select-module',
  'select-profile',
  'start-section-drag'
])

let boundaryResize = null
let dragStartRects = null
let pendingReorderRects = null
const moduleElements = new Map()

watch(
  () =>
    props.resumePages
      .map((page) => `${page.number}:${page.sections.map((section) => section.key).join(',')}`)
      .join('|'),
  async (_, previousSignature) => {
    if (!previousSignature) {
      return
    }

    const previousRects = pendingReorderRects || captureModuleRects()
    pendingReorderRects = null
    await nextTick()
    animateModuleReorder(previousRects)
  }
)

function setModuleElement(key, element) {
  if (element) {
    moduleElements.set(key, element)
    return
  }

  moduleElements.delete(key)
}

function captureModuleRects() {
  const rects = new Map()

  moduleElements.forEach((element, key) => {
    rects.set(key, element.getBoundingClientRect())
  })

  return rects
}

function animateModuleReorder(previousRects) {
  if (typeof window === 'undefined') {
    return
  }

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  moduleElements.forEach((element, key) => {
    const previousRect = previousRects.get(key)

    if (!previousRect || typeof element.animate !== 'function') {
      return
    }

    const nextRect = element.getBoundingClientRect()
    const deltaX = previousRect.left - nextRect.left
    const deltaY = previousRect.top - nextRect.top

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return
    }

    element.animate(
      [
        {
          transform: `translate(${deltaX}px, ${deltaY}px)`,
          opacity: 0.92
        },
        {
          transform: 'translate(0, 0)',
          opacity: 1
        }
      ],
      {
        duration: 280,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
      }
    )
  })
}

function isModuleActive(key) {
  return props.activeBlock.key === key
}

function isEducationEntryActive(index) {
  return props.activeBlock.type === 'education-item' && props.activeBlock.index === index
}

function getModuleClass(sectionOrKey) {
  const section = typeof sectionOrKey === 'string' ? { key: sectionOrKey } : sectionOrKey
  const key = section.key

  return {
    'is-selected': isModuleActive(key),
    'is-dragging': props.draggingSectionKey === key,
    'is-drop-target': props.draggingSectionKey && props.draggingSectionKey !== key,
    'is-continuation-fragment': Boolean(section.isContinuation),
    'is-continued-fragment': Boolean(section.continuesNext),
    'is-boundary-continuation': Boolean(section.isBoundaryContinuation)
  }
}

function getModuleStyle(sectionOrKey) {
  const section = typeof sectionOrKey === 'string' ? { key: sectionOrKey } : sectionOrKey
  const key = section.key
  const bounds = props.resume.moduleBounds?.[key]

  if (!bounds) {
    return null
  }

  const topDelta = bounds.top - DEFAULT_MODULE_TOP
  const paddingTop = Math.max(DEFAULT_MODULE_TOP - topDelta, 4)
  const style = {
    marginTop: section.isContinuation ? '0px' : `${topDelta}px`,
    marginLeft: `${bounds.left}px`,
    marginRight: `${bounds.right}px`,
    paddingTop: section.isContinuation ? '10px' : `${paddingTop}px`,
    paddingBottom: section.continuesNext ? '10px' : `${bounds.bottom}px`
  }

  if (section.continuesNext) {
    style.marginBottom = '0px'
  }

  if (Number.isFinite(section.forcedHeight)) {
    style.minHeight = `${Math.max(Math.round(section.forcedHeight), 0)}px`
  }

  return style
}

function handleModuleDragStart(key, event) {
  dragStartRects = captureModuleRects()
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', key)
  emit('start-section-drag', key)
}

function handleModuleDragOver(event) {
  event.dataTransfer.dropEffect = 'move'
}

function handleModuleDrop(key) {
  if (props.draggingSectionKey && props.draggingSectionKey !== key) {
    pendingReorderRects = dragStartRects || captureModuleRects()
  }

  emit('drop-section', key)
}

function handleModuleDragEnd() {
  dragStartRects = null
  emit('clear-section-drag')
}

function startBoundaryResize(key, payload) {
  const event = payload.event
  event.preventDefault()
  event.stopPropagation()

  boundaryResize = {
    key,
    edge: payload.edge,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false
  }

  window.addEventListener('pointermove', handleBoundaryResizeMove)
  window.addEventListener('pointerup', stopBoundaryResize, { once: true })
  window.addEventListener('pointercancel', stopBoundaryResize, { once: true })
}

function handleBoundaryResizeMove(event) {
  if (!boundaryResize) {
    return
  }

  const delta = {
    x: (event.clientX - boundaryResize.lastX) / props.zoomScale,
    y: (event.clientY - boundaryResize.lastY) / props.zoomScale
  }

  if (Math.abs(delta.x) < 0.5 && Math.abs(delta.y) < 0.5) {
    return
  }

  boundaryResize.lastX = event.clientX
  boundaryResize.lastY = event.clientY
  boundaryResize.moved = true
  emit('resize-module-boundary', boundaryResize.key, boundaryResize.edge, delta)
}

function stopBoundaryResize() {
  if (!boundaryResize) {
    return
  }

  const shouldCommit = boundaryResize.moved
  boundaryResize = null
  window.removeEventListener('pointermove', handleBoundaryResizeMove)
  window.removeEventListener('pointercancel', stopBoundaryResize)

  if (shouldCommit) {
    emit('commit-boundary-resize')
  }
}

function renderRichTextBlocks(content) {
  const lines = String(content || '')
    .split('\n')
    .map((line) => line.trim())

  const nodes = []
  let listItems = []

  const flushList = () => {
    if (!listItems.length) {
      return
    }

    nodes.push(
      h(
        'ul',
        { class: 'resume-rich-text__list', key: `list-${nodes.length}` },
        listItems.map((item, index) => h('li', { key: index }, item))
      )
    )
    listItems = []
  }

  lines.forEach((line, index) => {
    if (!line) {
      flushList()
      return
    }

    if (/^[-*•]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*•]\s+/, ''))
      return
    }

    flushList()
    nodes.push(h('p', { key: `paragraph-${index}` }, line))
  })

  flushList()
  return nodes.length ? nodes : [h('p', { class: 'resume-rich-text__empty' }, '暂无内容')]
}

function cleanRichTextHtml(value) {
  if (typeof document === 'undefined') {
    return ''
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

    return element
  }

  const wrapper = document.createElement('div')
  template.content.childNodes.forEach((child) => {
    wrapper.appendChild(cleanNode(child))
  })

  return wrapper.innerHTML
}

function hasHtmlTag(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleBoundaryResizeMove)
  window.removeEventListener('pointerup', stopBoundaryResize)
  window.removeEventListener('pointercancel', stopBoundaryResize)
})
</script>
