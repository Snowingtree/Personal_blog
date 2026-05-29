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
        <label class="editor-field">
          <span>{{ getRichTextLabel(activeBlock.type) }}</span>
          <textarea
            :value="resume.richText?.[activeBlock.type] || ''"
            rows="14"
            @input="$emit('update-rich-text', activeBlock.type, $event.target.value)"
            @change="$emit('commit-snapshot')"
          ></textarea>
        </label>
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
        <div class="entry-action-row">
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

defineProps({
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
  'section-visibility-change',
  'update-rich-text'
])

const richTextLabels = {
  experience: '实习经历内容',
  projects: '项目经历内容',
  skills: '技能清单内容'
}

function isRichTextBlock(type) {
  return Object.hasOwn(richTextLabels, type)
}

function getRichTextLabel(type) {
  return richTextLabels[type] || '内容'
}
</script>
