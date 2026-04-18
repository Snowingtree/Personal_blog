<template>
  <li class="note-tree-node">
    <button
      v-if="node.type === 'folder'"
      type="button"
      class="note-tree-button note-tree-button--folder"
      :class="{ 'is-open': isOpen }"
      @click="$emit('toggle-folder', node.path)"
    >
      <span class="note-tree-button__caret">{{ isOpen ? '▾' : '▸' }}</span>
      <span class="note-tree-button__icon note-tree-button__icon--folder" aria-hidden="true"></span>
      <span class="note-tree-button__label">{{ node.name }}</span>
    </button>

    <button
      v-else
      type="button"
      class="note-tree-button note-tree-button--file"
      :class="{ 'is-active': activePath === node.path }"
      @click="$emit('select-file', node.path)"
    >
      <span class="note-tree-button__caret note-tree-button__caret--placeholder" aria-hidden="true"></span>
      <span class="note-tree-button__icon note-tree-button__icon--file" aria-hidden="true"></span>
      <span class="note-tree-button__label">{{ node.name }}</span>
    </button>

    <ul v-if="node.type === 'folder' && isOpen" class="note-tree-list">
      <NoteTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :active-path="activePath"
        :open-folders="openFolders"
        @toggle-folder="$emit('toggle-folder', $event)"
        @select-file="$emit('select-file', $event)"
      />
    </ul>
  </li>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({
  name: 'NoteTreeNode'
})

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  activePath: {
    type: String,
    default: ''
  },
  openFolders: {
    type: Array,
    default: () => []
  }
})

defineEmits(['toggle-folder', 'select-file'])

const isOpen = computed(() => props.openFolders.includes(props.node.path))
</script>
