<template>
  <div class="agent-shell">
    <aside class="agent-shell__sidebar">
      <div class="agent-user-card agent-user-card--sidebar">
        <span class="agent-user-card__avatar">{{ userInitial }}</span>
        <div>
          <strong>{{ username }}</strong>
        </div>
      </div>

      <div class="agent-sidebar__launch">
        <button
          type="button"
          class="agent-sidebar__primary"
          :disabled="isCreatingSession"
          @click="$emit('create-session')"
        >
          {{ isCreatingSession ? '创建中...' : '新建对话' }}
        </button>
      </div>

      <div class="agent-sidebar__section">
        <div class="agent-sidebar__section-head">
          <span>会话</span>
          <small>{{ sessions.length }} 项</small>
        </div>

        <AgentSessionList
          :active-session-id="activeSessionId"
          :error="sessionError"
          :loading="isLoadingSessions"
          :sessions="sessions"
          :show-header="false"
          @delete-session="$emit('delete-session', $event)"
          @select-session="$emit('select-session', $event)"
        />
      </div>

      <div class="agent-sidebar__footer">
        <button type="button" class="agent-sidebar__logout" @click="$emit('logout')">
          退出登录
        </button>
      </div>
    </aside>

    <section class="agent-shell__main">
      <header class="agent-mainbar">
        <div class="agent-mainbar__copy">
          <div class="agent-mainbar__status">
            <span class="agent-mainbar__status-dot"></span>
            <span>Agent Workspace</span>
          </div>
          <h2>{{ activeSessionTitle }}</h2>
        </div>
      </header>

      <div class="agent-shell__conversation">
        <AgentConversationPanel
          :can-send="canSend"
          :draft="draft"
          :error="chatError || loadError"
          :loading-session="isLoadingSession"
          :messages="messages"
          :sending="isSending"
          :show-header="false"
          @send="$emit('send')"
          @update:draft="$emit('update:draft', $event)"
        />
      </div>
    </section>

    <aside class="agent-shell__inspector">
      <AgentContextPanel
        :ai-configs="aiConfigs"
        :config-error="loadError"
        :loading-ai-configs="isLoadingAiConfigs"
        :message-count="messages.length"
        :model-options="modelOptions"
        :selected-agent-label="selectedAgentLabel"
        :selected-ai-id="selectedAiId"
        :selected-model="selectedModel"
        :selected-model-label="selectedModelLabel"
        :sending="isSending"
        :session-count="sessions.length"
        @update:ai-id="$emit('update:ai-id', $event)"
        @update:model="$emit('update:model', $event)"
      />
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AgentContextPanel from '../AgentContextPanel/AgentContextPanel.vue'
import AgentConversationPanel from '../AgentConversationPanel/AgentConversationPanel.vue'
import AgentSessionList from '../AgentSessionList/AgentSessionList.vue'

const props = defineProps({
  activeSessionId: {
    type: String,
    default: ''
  },
  activeSessionTitle: {
    type: String,
    default: '当前会话'
  },
  aiConfigs: {
    type: Array,
    default: () => []
  },
  canSend: {
    type: Boolean,
    default: false
  },
  chatError: {
    type: String,
    default: ''
  },
  draft: {
    type: String,
    default: ''
  },
  isCreatingSession: {
    type: Boolean,
    default: false
  },
  isLoadingAiConfigs: {
    type: Boolean,
    default: false
  },
  isLoadingSession: {
    type: Boolean,
    default: false
  },
  isLoadingSessions: {
    type: Boolean,
    default: false
  },
  isSending: {
    type: Boolean,
    default: false
  },
  loadError: {
    type: String,
    default: ''
  },
  messages: {
    type: Array,
    default: () => []
  },
  modelOptions: {
    type: Array,
    default: () => []
  },
  selectedAgentLabel: {
    type: String,
    default: ''
  },
  selectedAiId: {
    type: String,
    default: ''
  },
  selectedModel: {
    type: String,
    default: ''
  },
  selectedModelLabel: {
    type: String,
    default: ''
  },
  sessionError: {
    type: String,
    default: ''
  },
  sessions: {
    type: Array,
    default: () => []
  },
  username: {
    type: String,
    default: '访客'
  }
})

const userInitial = computed(() => {
  const normalized = String(props.username || '').trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'A'
})

defineEmits([
  'create-session',
  'delete-session',
  'logout',
  'select-session',
  'send',
  'update:ai-id',
  'update:draft',
  'update:model'
])
</script>

<style scoped>
.agent-shell {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr) 292px;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.agent-shell__sidebar,
.agent-shell__main,
.agent-shell__inspector {
  min-height: 0;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background: #ffffff;
  box-shadow:
    0 18px 40px rgba(24, 67, 115, 0.08),
    0 3px 10px rgba(24, 67, 115, 0.04);
}

.agent-shell__sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-radius: 26px;
  overflow: hidden;
}

.agent-user-card strong {
  display: block;
  color: #12344e;
}

.agent-sidebar__launch {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(47, 125, 255, 0.1), transparent 32%),
    linear-gradient(180deg, rgba(250, 252, 255, 0.98), rgba(245, 249, 255, 0.95));
  border: 1px solid rgba(18, 52, 78, 0.07);
}

.agent-sidebar__primary,
.agent-sidebar__logout {
  min-height: 44px;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.agent-sidebar__primary {
  border: 0;
  color: #f6fbff;
  background: linear-gradient(135deg, #2f7dff 0%, #4bb6ff 100%);
  box-shadow: 0 14px 26px rgba(47, 125, 255, 0.22);
}

.agent-sidebar__logout {
  border: 1px solid rgba(18, 52, 78, 0.08);
  color: #35556f;
  background: rgba(245, 249, 255, 0.96);
}

.agent-sidebar__primary:hover,
.agent-sidebar__logout:hover {
  transform: translateY(-1px);
}

.agent-sidebar__section {
  display: grid;
  gap: 10px;
}

.agent-sidebar__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #6f89a2;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.agent-sidebar__footer {
  display: grid;
  gap: 12px;
  margin-top: auto;
}

.agent-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(248, 252, 255, 0.98), rgba(242, 248, 255, 0.94));
  border: 1px solid rgba(18, 52, 78, 0.07);
}

.agent-user-card--sidebar {
  padding: 12px 14px;
}

.agent-user-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(47, 125, 255, 0.12);
  color: #2565ca;
  font-weight: 700;
}

.agent-shell__main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border-radius: 30px;
  overflow: hidden;
}

.agent-mainbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 4px 10px;
  border-bottom: 1px solid rgba(18, 52, 78, 0.08);
}

.agent-mainbar__copy {
  min-width: 0;
}

.agent-mainbar__copy h2 {
  margin: 0;
  color: #12344e;
  font-size: 1.42rem;
  line-height: 1.15;
}

.agent-mainbar__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: #6f8ba5;
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.agent-mainbar__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1bc47d;
  box-shadow: 0 0 0 4px rgba(27, 196, 125, 0.12);
}

.agent-shell__conversation {
  display: flex;
  min-height: 0;
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(47, 125, 255, 0.07), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(250, 252, 255, 0.98));
  border: 1px solid rgba(18, 52, 78, 0.07);
  overflow: hidden;
}

.agent-shell__inspector {
  padding: 16px;
  border-radius: 26px;
  overflow: auto;
}

@media (max-width: 1320px) {
  .agent-shell {
    grid-template-columns: 232px minmax(0, 1fr);
  }

  .agent-shell__inspector {
    grid-column: 1 / -1;
  }
}

@media (max-width: 920px) {
  .agent-shell {
    grid-template-columns: 1fr;
    height: 100%;
    min-height: 0;
  }

  .agent-shell__sidebar,
  .agent-shell__main,
  .agent-shell__inspector {
    border-radius: 24px;
  }

  .agent-mainbar {
    display: grid;
  }
}
</style>
