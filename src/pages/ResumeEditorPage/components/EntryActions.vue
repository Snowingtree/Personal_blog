<template>
  <div class="entry-action-row">
    <button type="button" class="editor-btn" :disabled="index <= 0" @click="$emit('move-up')">
      上移
    </button>
    <button type="button" class="editor-btn" :disabled="index >= length - 1" @click="$emit('move-down')">
      下移
    </button>
    <button
      type="button"
      class="editor-btn editor-btn--danger"
      :disabled="length <= 1"
      @click="$emit('remove')"
    >
      删除
    </button>
  </div>
</template>

<script setup>
defineProps({
  index: {
    type: Number,
    required: true
  },
  length: {
    type: Number,
    required: true
  }
})

defineEmits(['move-up', 'move-down', 'remove'])
</script>
