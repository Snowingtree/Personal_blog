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

      <div v-else-if="activeBlock.type === 'summary'" class="field-stack">
        <label class="editor-field">
          <span>内容</span>
          <textarea v-model="resume.profile.summary" rows="9" @change="$emit('commit-snapshot')"></textarea>
        </label>
      </div>

      <div v-else-if="activeBlock.type === 'experience-item' && selectedExperience" class="field-stack">
        <label class="editor-field">
          <span>公司</span>
          <input v-model="selectedExperience.company" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>岗位</span>
          <input v-model="selectedExperience.role" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>时间</span>
          <input v-model="selectedExperience.period" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>要点</span>
          <textarea
            :value="formatBullets(selectedExperience)"
            rows="7"
            @input="$emit('update-bullets', selectedExperience, $event.target.value)"
            @change="$emit('commit-snapshot')"
          ></textarea>
        </label>
        <EntryActions
          :index="activeBlock.index"
          :length="resume.experience.length"
          @move-up="$emit('move-entry', 'experience', activeBlock.index, -1)"
          @move-down="$emit('move-entry', 'experience', activeBlock.index, 1)"
          @remove="$emit('remove-entry', 'experience', activeBlock.index)"
        />
      </div>

      <div v-else-if="activeBlock.type === 'project-item' && selectedProject" class="field-stack">
        <label class="editor-field">
          <span>项目</span>
          <input v-model="selectedProject.name" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>角色</span>
          <input v-model="selectedProject.role" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>时间</span>
          <input v-model="selectedProject.period" type="text" @change="$emit('commit-snapshot')" />
        </label>
        <label class="editor-field">
          <span>要点</span>
          <textarea
            :value="formatBullets(selectedProject)"
            rows="7"
            @input="$emit('update-bullets', selectedProject, $event.target.value)"
            @change="$emit('commit-snapshot')"
          ></textarea>
        </label>
        <EntryActions
          :index="activeBlock.index"
          :length="resume.projects.length"
          @move-up="$emit('move-entry', 'projects', activeBlock.index, -1)"
          @move-down="$emit('move-entry', 'projects', activeBlock.index, 1)"
          @remove="$emit('remove-entry', 'projects', activeBlock.index)"
        />
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

      <div v-else-if="activeBlock.type === 'skills'" class="field-stack">
        <div v-for="(skill, index) in resume.skills" :key="`skill-${index}`" class="skill-editor-row">
          <input
            :value="skill"
            type="text"
            @input="$emit('update-skill', index, $event.target.value)"
            @change="$emit('commit-snapshot')"
          />
          <button type="button" class="icon-btn" @click="$emit('remove-skill', index)">删除</button>
        </div>
        <button type="button" class="editor-btn editor-btn--wide" @click="$emit('add-skill')">添加技能</button>
      </div>

      <div v-else-if="activeBlock.type === 'skill-item'" class="field-stack">
        <label class="editor-field">
          <span>技能名称</span>
          <input
            :value="resume.skills[activeBlock.index] || ''"
            type="text"
            @input="$emit('update-skill', activeBlock.index, $event.target.value)"
            @change="$emit('commit-snapshot')"
          />
        </label>
        <div class="entry-action-row">
          <button
            type="button"
            class="editor-btn"
            :disabled="activeBlock.index <= 0"
            @click="$emit('move-skill', activeBlock.index, -1)"
          >
            上移
          </button>
          <button
            type="button"
            class="editor-btn"
            :disabled="activeBlock.index >= resume.skills.length - 1"
            @click="$emit('move-skill', activeBlock.index, 1)"
          >
            下移
          </button>
          <button
            type="button"
            class="editor-btn editor-btn--danger"
            :disabled="resume.skills.length <= 1"
            @click="$emit('remove-skill', activeBlock.index)"
          >
            删除
          </button>
        </div>
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
  },
  selectedExperience: {
    type: Object,
    default: null
  },
  selectedProject: {
    type: Object,
    default: null
  }
})

defineEmits([
  'add-skill',
  'commit-snapshot',
  'move-entry',
  'move-section',
  'move-skill',
  'remove-entry',
  'remove-skill',
  'section-visibility-change',
  'update-bullets',
  'update-skill'
])

function formatBullets(item) {
  return Array.isArray(item?.bullets) ? item.bullets.join('\n') : ''
}
</script>
