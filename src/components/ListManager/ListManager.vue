<template>
  <section class="panel-card">
    <div class="panel-head">
      <div>
        <h2>管理</h2>
      </div>
      <div v-if="$slots['source-actions']" class="panel-head-actions">
        <slot name="source-actions" />
      </div>
    </div>

    <form class="action-form" @submit.prevent="handleSearch">
      <input
        v-model.trim="draftValue"
        class="list-input"
        name="anime-search"
        type="text"
        placeholder="输入动漫名称后按回车或点击查询"
      />
      <button type="submit" class="secondary-btn">查询</button>
      <button type="button" class="primary-btn" @click="handleAdd">添加</button>
      <button
        type="button"
        class="ghost-btn undo-btn"
        :disabled="!canUndo"
        @click="$emit('undo')"
      >
        {{ undoLabel }}
      </button>
    </form>
    <p v-if="activeKeyword" class="search-status">
      当前查询：{{ activeKeyword }}。清空输入框后再次点击“查询”可恢复完整列表。
    </p>

    <div class="list-scroll">
      <TransitionGroup tag="ul" name="anime-list" class="list-wrap">
        <li
          v-for="row in visibleRows"
          :key="row.key"
          :class="row.type === 'group' ? 'group-row' : 'list-item'"
        >
          <template v-if="row.type === 'group'">
            <span class="group-letter">{{ row.letter }}</span>
          </template>

          <template v-else>
            <span class="list-index">{{ row.displayIndex }}</span>
            <span class="list-text">{{ row.value }}</span>
            <button type="button" class="danger-btn" @click="$emit('remove', row.originalIndex)">
              删除
            </button>
          </template>
        </li>
      </TransitionGroup>
    </div>

    <p v-if="!visibleItems.length" class="empty-state">
      {{ activeKeyword ? '没有匹配的动漫名称，换个关键词再试。' : '当前没有动漫名称，可以先添加一项。' }}
    </p>
  </section>
</template>

<script setup>
import { TransitionGroup, ref, toRef } from 'vue'
import { useAnimeSearch } from '../../hooks/useAnimeSearch'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  undoLabel: {
    type: String,
    default: '撤销添加'
  },
  canUndo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add', 'remove', 'undo'])
const draftValue = ref('')

const { activeKeyword, visibleItems, visibleRows, queryAnime } = useAnimeSearch(
  toRef(props, 'items')
)

function handleSearch() {
  queryAnime(draftValue.value)
}

function handleAdd() {
  if (!draftValue.value) {
    return
  }

  emit('add', draftValue.value)
  draftValue.value = ''
}
</script>
