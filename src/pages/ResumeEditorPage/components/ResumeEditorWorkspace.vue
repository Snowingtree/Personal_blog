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
          <article class="resume-paper" :style="paperStyle">
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

            <template v-for="section in page.sections" :key="`${page.number}-${section.key}`">
              <section
                v-if="section.key === 'experience'"
                class="resume-module"
                :class="getModuleClass('experience')"
                :style="getModuleStyle('experience')"
                draggable="true"
                @dragstart="handleModuleDragStart('experience', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('experience')"
                @dragend="$emit('clear-section-drag')"
                @click.stop="$emit('select-module', 'experience')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('experience')"
                  @start="startBoundaryResize('experience', $event)"
                />
                <h2>{{ section.title }}</h2>
                <RichTextContent :content="resume.richText?.experience" />
              </section>

              <section
                v-else-if="section.key === 'projects'"
                class="resume-module"
                :class="getModuleClass('projects')"
                :style="getModuleStyle('projects')"
                draggable="true"
                @dragstart="handleModuleDragStart('projects', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('projects')"
                @dragend="$emit('clear-section-drag')"
                @click.stop="$emit('select-module', 'projects')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('projects')"
                  @start="startBoundaryResize('projects', $event)"
                />
                <h2>{{ section.title }}</h2>
                <RichTextContent :content="resume.richText?.projects" />
              </section>

              <section
                v-else-if="section.key === 'education'"
                class="resume-module"
                :class="getModuleClass('education')"
                :style="getModuleStyle('education')"
                draggable="true"
                @dragstart="handleModuleDragStart('education', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('education')"
                @dragend="$emit('clear-section-drag')"
                @click.stop="$emit('select-module', 'education')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('education')"
                  @start="startBoundaryResize('education', $event)"
                />
                <h2>{{ section.title }}</h2>
                <article
                  v-for="(item, index) in resume.education"
                  :key="item.id"
                  class="resume-entry resume-entry--compact"
                  @click.stop="$emit('select-entry', 'education-item', index)"
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
                :class="getModuleClass('skills')"
                :style="getModuleStyle('skills')"
                draggable="true"
                @dragstart="handleModuleDragStart('skills', $event)"
                @dragover.prevent="handleModuleDragOver"
                @drop.prevent="handleModuleDrop('skills')"
                @dragend="$emit('clear-section-drag')"
                @click.stop="$emit('select-module', 'skills')"
              >
                <BoundaryHandles
                  v-if="isModuleActive('skills')"
                  @start="startBoundaryResize('skills', $event)"
                />
                <h2>{{ section.title }}</h2>
                <RichTextContent :content="resume.richText?.skills" />
              </section>
            </template>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineComponent, h, onBeforeUnmount } from 'vue'

const boundaryEdges = ['top', 'right', 'bottom', 'left']
const DEFAULT_MODULE_TOP = 22

const BoundaryHandles = defineComponent({
  name: 'BoundaryHandles',
  emits: ['start'],
  setup(_, { emit }) {
    return () =>
      h(
        'div',
        { class: 'module-boundary-handles', 'aria-label': '模块边界调整' },
        boundaryEdges.map((edge) =>
          h('button', {
            key: edge,
            type: 'button',
            draggable: 'false',
            class: ['module-boundary-handle', `module-boundary-handle--${edge}`],
            'aria-label': `调整${edge}边界`,
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
    }
  },
  setup(props) {
    return () => h('div', { class: 'resume-rich-text' }, renderRichTextBlocks(props.content))
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
  'resize-module-boundary',
  'select-entry',
  'select-module',
  'select-profile',
  'start-section-drag'
])

let boundaryResize = null

function isModuleActive(key) {
  return props.activeBlock.key === key
}

function getModuleClass(key) {
  return {
    'is-selected': isModuleActive(key),
    'is-dragging': props.draggingSectionKey === key,
    'is-drop-target': props.draggingSectionKey && props.draggingSectionKey !== key
  }
}

function getModuleStyle(key) {
  const bounds = props.resume.moduleBounds?.[key]

  if (!bounds) {
    return null
  }

  const topDelta = bounds.top - DEFAULT_MODULE_TOP
  const paddingTop = Math.max(DEFAULT_MODULE_TOP - topDelta, 4)

  return {
    marginTop: `${topDelta}px`,
    marginLeft: `${bounds.left}px`,
    marginRight: `${bounds.right}px`,
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${bounds.bottom}px`
  }
}

function handleModuleDragStart(key, event) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', key)
  emit('start-section-drag', key)
}

function handleModuleDragOver(event) {
  event.dataTransfer.dropEffect = 'move'
}

function handleModuleDrop(key) {
  emit('drop-section', key)
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

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleBoundaryResizeMove)
  window.removeEventListener('pointerup', stopBoundaryResize)
  window.removeEventListener('pointercancel', stopBoundaryResize)
})
</script>
