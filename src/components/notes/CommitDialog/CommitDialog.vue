<template>
  <Teleport to="body">
    <div v-if="visible" class="note-dialog" @click.self="$emit('close')">
      <section
        class="note-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-commit-dialog-title"
      >
        <div class="note-dialog__head">
          <div>
            <p class="section-tag">提交仓库</p>
            <h3 id="note-commit-dialog-title">填写提交说明</h3>
          </div>
        </div>

        <p class="note-dialog__copy">先选提交类型，再补充这次更新说明。</p>

        <div class="note-commit-field">
          <Select
            class="note-commit-field__type-select"
            :model-value="selectedType"
            :options="selectTypeOptions"
            :disabled="busy"
            @update:model-value="handleTypeChange"
          />
          <input
            :value="subject"
            type="text"
            class="note-commit-field__input"
            :disabled="busy"
            placeholder="输入这次提交的具体说明"
            @input="handleSubjectInput"
          />
        </div>

        <p class="note-dialog__preview">提交预览：{{ previewMessage }}</p>

        <div class="note-dialog__actions">
          <button type="button" class="secondary-btn" :disabled="busy" @click="$emit('close')">
            取消
          </button>
          <button
            type="button"
            class="primary-btn"
            :disabled="busy || !subject.trim()"
            @click="$emit('confirm')"
          >
            {{ busy ? '提交中...' : '确认提交' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Select } from 'snowingress-my-components'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  busy: {
    type: Boolean,
    default: false
  },
  selectedType: {
    type: String,
    default: 'feat'
  },
  scopeLabel: {
    type: String,
    default: '(repo):'
  },
  subject: {
    type: String,
    default: ''
  },
  previewMessage: {
    type: String,
    default: ''
  },
  typeOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'confirm', 'select-type', 'update:subject'])

const selectTypeOptions = computed(() =>
  props.typeOptions
    .map((option) => ({
      label: String(option?.label ?? option?.key ?? option?.value ?? ''),
      value: String(option?.value ?? option?.key ?? option?.label ?? '')
    }))
    .filter((option) => option.label && option.value)
)

function handleTypeChange(value) {
  emit('select-type', String(value || props.selectedType))
}

function handleSubjectInput(event) {
  emit('update:subject', event?.target?.value ?? '')
}
</script>
