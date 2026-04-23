<template>
  <div class="agent-session-list">
    <div v-if="showHeader" class="agent-session-list__head">
      <div>
        <p class="section-tag">Sessions</p>
        <h3>会话列表</h3>
      </div>

      <button
        v-if="showCreateButton"
        type="button"
        class="primary-btn agent-session-list__create"
        :disabled="creating"
        @click="$emit('create-session')"
      >
        {{ creating ? '创建中...' : '新建会话' }}
      </button>
    </div>

    <div class="agent-session-list__body">
      <p v-if="error" class="form-error agent-session-list__status">{{ error }}</p>
      <p v-else-if="loading" class="agent-session-list__status">正在读取会话列表...</p>
      <p v-else-if="!sessions.length" class="agent-session-list__status agent-session-list__status--empty">
        还没有会话，先开始第一轮对话。
      </p>

      <div v-else class="agent-session-list__items">
        <article
          v-for="item in sessions"
          :key="item.sessionId"
          class="agent-session-item"
          :class="{ 'is-active': item.sessionId === activeSessionId }"
        >
          <button
            type="button"
            class="agent-session-item__main"
            @click="$emit('select-session', item.sessionId)"
          >
            <span class="agent-session-item__title-row">
              <span class="agent-session-item__dot"></span>
              <span class="agent-session-item__title">{{ item.title }}</span>
            </span>
          </button>

          <button
            type="button"
            class="agent-session-item__delete"
            aria-label="删除会话"
            @click="$emit('delete-session', item.sessionId)"
          >
            ×
          </button>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  activeSessionId: {
    type: String,
    default: ''
  },
  creating: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  sessions: {
    type: Array,
    default: () => []
  },
  showCreateButton: {
    type: Boolean,
    default: true
  },
  showHeader: {
    type: Boolean,
    default: true
  }
})

defineEmits(['create-session', 'delete-session', 'select-session'])
</script>

<style scoped>
.agent-session-list {
  display: grid;
  gap: 12px;
  min-height: 0;
}

.agent-session-list__body {
  display: grid;
  align-content: start;
  min-height: 220px;
  height: clamp(220px, 34vh, 360px);
  padding: 10px 8px 10px 0;
  border-top: 1px solid rgba(18, 52, 78, 0.08);
}

.agent-session-list__head {
  display: grid;
  gap: 12px;
}

.agent-session-list__head h3 {
  margin: 2px 0 0;
  color: #12344e;
}

.agent-session-list__create {
  width: 100%;
}

.agent-session-list__status {
  margin: 0;
  padding-right: 8px;
  color: #6c879f;
  line-height: 1.65;
}

.agent-session-list__status--empty {
  padding: 14px;
  border-radius: 18px;
  background: rgba(246, 250, 255, 0.96);
  border: 1px dashed rgba(18, 52, 78, 0.12);
}

.agent-session-list__items {
  display: grid;
  gap: 8px;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
}

.agent-session-list__items::-webkit-scrollbar {
  width: 6px;
}

.agent-session-list__items::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(18, 52, 78, 0.18);
}

.agent-session-list__items::-webkit-scrollbar-track {
  background: transparent;
}

.agent-session-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 46px;
  padding: 6px 8px 6px 10px;
  border-radius: 14px;
  border: 1px solid rgba(122, 190, 255, 0.55);
  background: linear-gradient(180deg, rgba(246, 251, 255, 0.98), rgba(239, 247, 255, 0.94));
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.agent-session-item:hover {
  border-color: rgba(74, 151, 255, 0.7);
  background: linear-gradient(180deg, rgba(244, 250, 255, 0.99), rgba(232, 244, 255, 0.96));
  box-shadow: 0 10px 18px rgba(68, 132, 214, 0.08);
}

.agent-session-item.is-active {
  color: #0f4ea6;
  border-color: rgba(74, 151, 255, 0.85);
  background: linear-gradient(180deg, rgba(240, 248, 255, 0.99), rgba(228, 241, 255, 0.97));
  box-shadow: 0 12px 20px rgba(47, 125, 255, 0.1);
}

.agent-session-item__main {
  display: flex;
  align-items: center;
  min-width: 0;
  border: 0;
  width: 100%;
  min-height: 32px;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.agent-session-item__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.agent-session-item__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(18, 52, 78, 0.18);
}

.agent-session-item__title {
  min-width: 0;
  color: #12344e;
  font-weight: 500;
  line-height: 1.35;
  font-size: 0.94rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-session-item.is-active .agent-session-item__title {
  color: #0f4ea6;
  font-weight: 700;
}

.agent-session-item.is-active .agent-session-item__dot {
  background: rgba(47, 125, 255, 0.72);
}

.agent-session-item__delete {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.66);
  color: #7f98b2;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease, background-color 160ms ease, color 160ms ease;
}

.agent-session-item:hover .agent-session-item__delete {
  opacity: 1;
  pointer-events: auto;
}

.agent-session-item__delete:hover {
  background: rgba(18, 52, 78, 0.08);
  color: #4c647c;
}
</style>
