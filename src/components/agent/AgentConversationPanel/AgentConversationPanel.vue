<template>
  <section class="agent-conversation">
    <div v-if="showHeader" class="agent-conversation__head">
      <div>
        <p class="section-tag">Workspace</p>
        <h3>{{ title }}</h3>
      </div>
      <span v-if="modelLabel" class="agent-conversation__model">{{ modelLabel }}</span>
    </div>

    <p v-if="error" class="form-error agent-conversation__status">{{ error }}</p>
    <p v-else-if="loadingSession" class="agent-conversation__status">正在读取会话内容...</p>

    <div ref="messagesRef" class="agent-conversation__messages">
      <div v-if="!messages.length && !loadingSession" class="agent-conversation__welcome">
        <div class="agent-conversation__welcome-copy">
          <p class="agent-conversation__welcome-tag">Agent Workspace</p>
          <h3>把目标交给 Agent，持续推进到结果</h3>
          <p>
            直接输入任务、问题或待办，我会围绕同一个目标持续拆解、追问、整理和补全。
          </p>
        </div>

        <div class="agent-conversation__starter-grid">
          <button
            type="button"
            class="agent-starter-card"
            @click="$emit('update:draft', '帮我把这个目标拆成一个可执行的计划，并给出优先级。')"
          >
            <strong>拆成计划</strong>
            <span>把一个模糊目标拆成清晰步骤和优先级。</span>
          </button>
          <button
            type="button"
            class="agent-starter-card"
            @click="$emit('update:draft', '基于这个目标，先帮我整理当前问题结构，再给出推进策略。')"
          >
            <strong>整理结构</strong>
            <span>先理清问题，再组织一条可持续推进的路线。</span>
          </button>
          <button
            type="button"
            class="agent-starter-card"
            @click="$emit('update:draft', '继续往下追问，把还没考虑到的风险和细节也补出来。')"
          >
            <strong>继续深挖</strong>
            <span>自动追问缺口，把风险、细节和下一步补齐。</span>
          </button>
        </div>
      </div>

      <article
        v-for="item in messages"
        :key="item.messageId"
        :class="[
          'agent-message',
          item.role === 'user' ? 'agent-message--user' : 'agent-message--assistant'
        ]"
      >
        <span class="agent-message__role">{{ item.role === 'user' ? '你' : 'Agent' }}</span>
        <div class="agent-message__bubble">
          <p>{{ item.content }}</p>
        </div>
      </article>

      <div v-if="sending" class="agent-conversation__sending">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <div class="agent-composer" :class="{ 'is-home': !messages.length }">
      <textarea
        ref="composerRef"
        :value="draft"
        class="agent-composer__input"
        :disabled="sending"
        @input="$emit('update:draft', $event.target.value)"
        @keydown="handleComposerKeydown"
      />

      <div class="agent-composer__actions">
        <button
          type="button"
          class="agent-composer__send"
          :disabled="!canSend"
          @click="handleSendClick"
        >
          {{ sending ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  canSend: {
    type: Boolean,
    default: false
  },
  draft: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  loadingSession: {
    type: Boolean,
    default: false
  },
  messages: {
    type: Array,
    default: () => []
  },
  modelLabel: {
    type: String,
    default: ''
  },
  sending: {
    type: Boolean,
    default: false
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: '当前会话'
  }
})

const emit = defineEmits(['send', 'update:draft'])

const composerRef = ref(null)
const messagesRef = ref(null)
const shouldRestoreFocus = ref(false)

function focusComposer() {
  nextTick(() => {
    composerRef.value?.focus()
  })
}

function scrollMessagesToBottom(behavior = 'auto') {
  nextTick(() => {
    const container = messagesRef.value

    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior
    })
  })
}

function requestSend() {
  if (!props.canSend || props.sending) {
    return
  }

  shouldRestoreFocus.value = true
  emit('send')
}

function handleSendClick() {
  requestSend()
}

function handleComposerKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  requestSend()
}

watch(
  () => props.sending,
  (isSending, wasSending) => {
    if (isSending) {
      scrollMessagesToBottom()
    }

    if (wasSending && !isSending && shouldRestoreFocus.value) {
      scrollMessagesToBottom()
      focusComposer()
      shouldRestoreFocus.value = false
    }
  }
)

watch(
  () => props.messages.length,
  (nextLength, previousLength) => {
    if (nextLength !== previousLength) {
      scrollMessagesToBottom()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.agent-conversation {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  padding: 16px;
  overflow: hidden;
}

.agent-conversation__head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
}

.agent-conversation__head h3 {
  margin: 2px 0 0;
  color: #12344e;
}

.agent-conversation__model {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(47, 125, 255, 0.08);
  color: #2b6fdb;
  font-size: 0.8rem;
  font-weight: 700;
}

.agent-conversation__status {
  margin: 0;
  flex: 0 0 auto;
}

.agent-conversation__messages {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  padding-bottom: 220px;
}

.agent-conversation__welcome {
  display: grid;
  gap: 20px;
  align-content: center;
  min-height: min(54dvh, 520px);
  padding: 38px 34px;
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(47, 125, 255, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(252, 254, 255, 0.99), rgba(245, 250, 255, 0.97));
  border: 1px solid rgba(18, 52, 78, 0.08);
}

.agent-conversation__welcome-copy {
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
}

.agent-conversation__welcome-tag {
  margin: 0;
  color: #4d7dff;
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.agent-conversation__welcome h3,
.agent-conversation__welcome p {
  margin: 0;
}

.agent-conversation__welcome h3 {
  max-width: 14ch;
  color: #12344e;
  font-size: clamp(2rem, 3.6vw, 3rem);
  line-height: 1.02;
}

.agent-conversation__welcome p {
  max-width: 38rem;
  color: #5f7c96;
  line-height: 1.72;
}

.agent-conversation__starter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.agent-starter-card {
  display: grid;
  gap: 8px;
  min-height: 132px;
  padding: 18px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  color: #35556f;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
}

.agent-starter-card strong,
.agent-starter-card span {
  display: block;
}

.agent-starter-card strong {
  color: #12344e;
  font-size: 1rem;
}

.agent-starter-card span {
  color: #65819b;
  line-height: 1.65;
  font-size: 0.86rem;
}

.agent-starter-card:hover {
  transform: translateY(-1px);
  border-color: rgba(47, 125, 255, 0.24);
  background: rgba(47, 125, 255, 0.06);
}

.agent-message {
  display: grid;
  gap: 8px;
  max-width: min(100%, 78%);
}

.agent-message--user {
  align-self: flex-end;
  justify-items: end;
}

.agent-message--assistant {
  align-self: flex-start;
}

.agent-message__role {
  color: #718ca8;
  font-size: 0.78rem;
  font-weight: 700;
}

.agent-message__bubble {
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(18, 52, 78, 0.07);
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(24, 67, 115, 0.05);
}

.agent-message--assistant .agent-message__bubble {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(249, 252, 255, 0.97));
}

.agent-message--user .agent-message__bubble {
  background: linear-gradient(135deg, rgba(47, 125, 255, 0.14), rgba(76, 180, 255, 0.08));
}

.agent-message__bubble p {
  margin: 0;
  color: #23445c;
  line-height: 1.78;
  white-space: pre-wrap;
}

.agent-conversation__sending {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  width: fit-content;
  border-radius: 999px;
  background: rgba(244, 249, 255, 0.96);
}

.agent-conversation__sending span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5b95ff;
  animation: agent-thinking 1.1s ease-in-out infinite;
}

.agent-conversation__sending span:nth-child(2) {
  animation-delay: 0.15s;
}

.agent-conversation__sending span:nth-child(3) {
  animation-delay: 0.3s;
}

.agent-composer {
  display: grid;
  gap: 14px;
  padding: 18px;
  min-height: 172px;
  border-radius: 26px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 252, 255, 0.98));
  box-shadow: 0 16px 26px rgba(24, 67, 115, 0.05);
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 2;
  overflow: hidden;
}

.agent-composer.is-home {
  gap: 14px;
  padding: 18px;
  min-height: 172px;
  border-radius: 26px;
  box-shadow: 0 16px 26px rgba(24, 67, 115, 0.05);
}

.agent-composer__input {
  width: 100%;
  display: block;
  min-height: 120px;
  max-height: 120px;
  border: 0;
  padding: 0;
  background: transparent;
  color: #12344e;
  font: inherit;
  line-height: 1.72;
  resize: none;
  overflow-y: auto;
  outline: none;
}

.agent-composer.is-home .agent-composer__input {
  min-height: 120px;
  max-height: 120px;
}

.agent-composer__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.agent-composer__send {
  min-width: 120px;
  min-height: 46px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #2f7dff 0%, #4bb6ff 100%);
  color: #f4f8ff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  box-shadow: 0 14px 26px rgba(47, 125, 255, 0.22);
}

.agent-composer__send:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  box-shadow: none;
}

@keyframes agent-thinking {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }

  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@media (max-width: 900px) {
  .agent-conversation__starter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .agent-conversation {
    padding: 14px;
  }

  .agent-message {
    max-width: 100%;
  }

  .agent-conversation__welcome {
    min-height: auto;
    padding: 24px 20px;
  }

  .agent-conversation__welcome-copy {
    justify-items: start;
    text-align: left;
  }

  .agent-composer__actions {
    display: flex;
    justify-content: flex-end;
  }

  .agent-composer__send {
    width: 100%;
  }

  .agent-conversation__messages {
    padding-bottom: 236px;
  }

  .agent-composer {
    left: 14px;
    right: 14px;
    bottom: 14px;
  }
}
</style>
