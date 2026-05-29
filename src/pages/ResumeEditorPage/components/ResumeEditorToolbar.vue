<template>
  <header class="resume-editor-toolbar">
    <a class="resume-editor-brand" href="/">
      <span class="resume-editor-brand__mark">CV</span>
      <span>在线简历编辑</span>
    </a>

    <div class="resume-editor-toolbar__center">
      <button type="button" class="editor-btn" :disabled="!canUndo" @click="$emit('undo')">
        撤销
      </button>
      <label class="zoom-control">
        <span>缩放</span>
        <select v-model.number="zoomModel">
          <option v-for="option in zoomOptions" :key="option" :value="option">
            {{ option }}%
          </option>
        </select>
      </label>
    </div>

    <div class="resume-editor-toolbar__actions">
      <span v-if="draftStatus" class="draft-status">{{ draftStatus }}</span>
      <button type="button" class="editor-btn" @click="$emit('add-page')">添加一页</button>
      <button type="button" class="editor-btn" @click="$emit('reset')">重置</button>
      <button type="button" class="editor-btn editor-btn--primary" @click="$emit('save')">保存</button>
      <button type="button" class="editor-btn editor-btn--dark" @click="$emit('export-pdf')">导出PDF</button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  canUndo: {
    type: Boolean,
    default: false
  },
  draftStatus: {
    type: String,
    default: ''
  },
  zoom: {
    type: Number,
    required: true
  },
  zoomOptions: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:zoom', 'undo', 'add-page', 'reset', 'save', 'export-pdf'])

const zoomModel = computed({
  get: () => props.zoom,
  set: (value) => emit('update:zoom', Number(value))
})
</script>
