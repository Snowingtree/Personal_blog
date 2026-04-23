<template>
  <aside class="agent-inspector">
    <section class="agent-inspector__card">
      <div class="agent-inspector__head">
        <p class="agent-inspector__eyebrow">Model</p>
        <h3>运行配置</h3>
      </div>

      <label class="agent-inspector__field">
        <span>Agent 配置</span>
        <select
          :value="selectedAiId"
          class="agent-inspector__select"
          :disabled="loadingAiConfigs || sending || !aiConfigs.length"
          @change="$emit('update:ai-id', $event.target.value)"
        >
          <option value="">{{ loadingAiConfigs ? '读取中...' : '请选择 Agent 配置' }}</option>
          <option v-for="item in aiConfigs" :key="item.aiId" :value="item.aiId">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="agent-inspector__field">
        <span>模型版本</span>
        <select
          :value="selectedModel"
          class="agent-inspector__select"
          :disabled="sending || !modelOptions.length"
          @change="$emit('update:model', $event.target.value)"
        >
          <option value="">{{ modelOptions.length ? '请选择模型版本' : '当前配置没有可用模型' }}</option>
          <option v-for="item in modelOptions" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </label>

      <p v-if="configError" class="agent-inspector__warning">
        {{ configError }}
      </p>
      <p v-else-if="!loadingAiConfigs && !aiConfigs.length" class="agent-inspector__warning">
        当前没有可用的 Agent 配置，请先补充 AI 配置。
      </p>

      <div class="agent-inspector__selected">
        <span class="agent-inspector__selected-label">当前选择</span>
        <strong>{{ selectedAgentLabel || '未选择配置' }}</strong>
        <p>{{ selectedModelLabel || '未选择模型' }}</p>
      </div>
    </section>

    <section class="agent-inspector__card">
      <div class="agent-inspector__head">
        <p class="agent-inspector__eyebrow">Status</p>
        <h3>工作台状态</h3>
      </div>

      <div class="agent-status-grid">
        <article class="agent-status-card">
          <span>会话数</span>
          <strong>{{ sessionCount }}</strong>
        </article>
        <article class="agent-status-card">
          <span>消息数</span>
          <strong>{{ messageCount }}</strong>
        </article>
      </div>
    </section>
  </aside>
</template>

<script setup>
defineProps({
  aiConfigs: {
    type: Array,
    default: () => []
  },
  configError: {
    type: String,
    default: ''
  },
  loadingAiConfigs: {
    type: Boolean,
    default: false
  },
  messageCount: {
    type: Number,
    default: 0
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
  sending: {
    type: Boolean,
    default: false
  },
  sessionCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['update:ai-id', 'update:model'])
</script>

<style scoped>
.agent-inspector {
  display: grid;
  gap: 12px;
  align-content: start;
}

.agent-inspector__card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(47, 125, 255, 0.08), transparent 30%),
    #ffffff;
  border: 1px solid rgba(18, 52, 78, 0.07);
}

.agent-inspector__head {
  display: grid;
  gap: 4px;
}

.agent-inspector__eyebrow {
  margin: 0;
  color: #6f8ba5;
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.agent-inspector__head h3 {
  margin: 0;
  color: #12344e;
}

.agent-inspector__field {
  display: grid;
  gap: 6px;
}

.agent-inspector__field > span {
  color: #6c879f;
  font-size: 0.9rem;
}

.agent-inspector__select {
  width: 100%;
  min-height: 42px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(248, 252, 255, 0.96);
  color: #12344e;
  font: inherit;
  outline: none;
}

.agent-inspector__warning {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(216, 126, 61, 0.28);
  background: rgba(255, 248, 240, 0.96);
  color: #995d24;
  line-height: 1.7;
}

.agent-inspector__selected {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(247, 250, 255, 0.98);
  border: 1px solid rgba(18, 52, 78, 0.06);
}

.agent-inspector__selected-label,
.agent-status-card span {
  color: #6f8ba5;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agent-inspector__selected strong,
.agent-status-card strong {
  color: #12344e;
}

.agent-inspector__selected p {
  margin: 0;
  color: #5f7c96;
}

.agent-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.agent-status-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(248, 252, 255, 0.98);
  border: 1px solid rgba(18, 52, 78, 0.05);
}

.agent-status-card strong {
  font-size: 1rem;
  line-height: 1.5;
}
</style>
