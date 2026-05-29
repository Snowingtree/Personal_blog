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
            <span class="module-sort-item__handle" aria-hidden="true">☰</span>
            <label class="module-sort-item__visible" @click.stop>
              <input
                v-model="resume.visibleSections[section.key]"
                type="checkbox"
                @change="$emit('section-visibility-change', section.key)"
              />
            </label>
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
                class="icon-btn"
                :disabled="index === 0"
                aria-label="上移模块"
                @click="$emit('move-section', index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="icon-btn"
                :disabled="index === moduleNavigator.length - 1"
                aria-label="下移模块"
                @click="$emit('move-section', index, 1)"
              >
                ↓
              </button>
            </div>
          </article>

          <div v-if="resume.visibleSections[section.key] && section.children.length" class="module-child-list">
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
        <button type="button" class="editor-btn" @click="$emit('add-experience')">经历</button>
        <button type="button" class="editor-btn" @click="$emit('add-project')">项目</button>
        <button type="button" class="editor-btn" @click="$emit('add-education')">教育</button>
        <button type="button" class="editor-btn" @click="$emit('add-skill')">技能</button>
      </div>
    </section>
  </aside>
</template>

<script setup>
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
  'drop-section',
  'move-section',
  'section-visibility-change',
  'select-module',
  'select-navigator-child',
  'start-section-drag'
])

function isModuleActive(key) {
  return props.activeBlock.key === key
}

function isNavigatorChildActive(child) {
  if (child.type === 'summary') {
    return props.activeBlock.type === 'summary'
  }

  return props.activeBlock.type === child.type && props.activeBlock.index === child.index
}
</script>
