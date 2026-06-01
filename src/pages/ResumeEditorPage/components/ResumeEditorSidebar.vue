<template>
  <aside class="resume-sidebar" aria-label="简历模块导航">
    <section class="editor-panel">
      <div class="editor-panel__head">
        <span>模块导航</span>
      </div>

      <div class="module-sort-list">
        <div v-for="(section, index) in moduleNavigator" :key="section.key" class="module-sort-group">
          <article
            class="module-sort-item"
            :class="{
              'is-active': isModuleActive(section.key),
              'is-dragging': draggingSectionKey === section.key
            }"
            draggable="true"
            @click="$emit('select-module', section.key)"
            @dragstart="$emit('start-section-drag', section.key)"
            @dragover.prevent
            @drop.prevent="$emit('drop-section', section.key)"
            @dragend="$emit('clear-section-drag')"
          >
            <span class="module-sort-item__handle" aria-hidden="true">⋮⋮</span>
            <button
              type="button"
              class="module-sort-item__title"
              @click.stop="$emit('select-module', section.key)"
            >
              <span>{{ section.title }}</span>
              <small>{{ section.description }}</small>
            </button>
            <div class="module-sort-item__actions" @click.stop>
              <button
                type="button"
                class="icon-btn module-sort-delete-btn"
                aria-label="删除模块"
                @click="$emit('delete-section', section.key)"
              >
                <svg
                  class="module-sort-delete-btn__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M6 6l1 15h10l1-15" />
                  <path d="M10 10v7" />
                  <path d="M14 10v7" />
                </svg>
              </button>
              <div class="module-sort-item__move-stack">
                <button
                  type="button"
                  class="icon-btn module-sort-move-btn module-sort-move-btn--up"
                  :disabled="index === 0"
                  aria-label="上移模块"
                  @click="$emit('move-section', section.key, -1)"
                >
                  <span class="module-sort-move-btn__chevron" aria-hidden="true"></span>
                </button>
                <button
                  type="button"
                  class="icon-btn module-sort-move-btn module-sort-move-btn--down"
                  :disabled="index === moduleNavigator.length - 1"
                  aria-label="下移模块"
                  @click="$emit('move-section', section.key, 1)"
                >
                  <span class="module-sort-move-btn__chevron" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </article>

          <div v-if="section.children.length" class="module-child-list">
            <button
              v-for="child in section.children"
              :key="child.id"
              type="button"
              class="module-child-item"
              :class="{ 'is-active': isNavigatorChildActive(child) }"
              @click="$emit('select-navigator-child', child)"
            >
              <span>{{ child.label }}</span>
              <small>{{ child.meta }}</small>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="editor-panel">
      <div class="editor-panel__head">
        <span>添加内容</span>
      </div>
      <div class="quick-actions">
        <button type="button" class="editor-btn" @click="$emit('add-education')">教育</button>
        <button type="button" class="editor-btn" @click="$emit('add-project')">项目</button>
        <button type="button" class="editor-btn" @click="$emit('add-skill')">技能</button>
        <button type="button" class="editor-btn" @click="$emit('add-experience')">实习</button>
      </div>
    </section>

    <RouterLink class="resume-sidebar-home-link" to="/">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M15 18l-6-6 6-6" />
        <path d="M9 12h10" />
      </svg>
      <span>返回主页</span>
    </RouterLink>
  </aside>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const props = defineProps({
  activeBlock: {
    type: Object,
    required: true
  },
  draggingSectionKey: {
    type: String,
    default: ''
  },
  moduleNavigator: {
    type: Array,
    required: true
  },
  resume: {
    type: Object,
    required: true
  }
})

defineEmits([
  'add-education',
  'add-experience',
  'add-project',
  'add-skill',
  'clear-section-drag',
  'delete-section',
  'drop-section',
  'move-section',
  'select-module',
  'select-navigator-child',
  'start-section-drag'
])

function isModuleActive(key) {
  return props.activeBlock.key === key
}

function isNavigatorChildActive(child) {
  return props.activeBlock.type === child.type && props.activeBlock.index === child.index
}
</script>
