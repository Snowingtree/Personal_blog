<template>
  <div
    class="note-workspace-tassel"
    :class="{
      'is-ai': activeView === 'ai',
      'is-pulling': isTasselDragging,
      'is-armed': tasselPull >= TASSLE_TRIGGER_DISTANCE
    }"
    :style="tasselStyle"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    :aria-pressed="activeView === 'ai'"
    @pointerdown="handleTasselPointerDown"
    @pointermove="handleTasselPointerMove"
    @pointerup="handleTasselPointerUp"
    @pointercancel="handleTasselPointerCancel"
    @keydown.enter.prevent="emitToggle"
    @keydown.space.prevent="emitToggle"
  >
    <span class="note-workspace-tassel__cord" />
    <span class="note-workspace-tassel__head">
      <span class="note-workspace-tassel__label">{{ activeView === 'ai' ? 'AI' : '笔记' }}</span>
    </span>
    <span class="note-workspace-tassel__fringe" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const TASSLE_MAX_PULL = 72
const TASSLE_TRIGGER_DISTANCE = 46

const props = defineProps({
  activeView: {
    type: String,
    default: 'notes'
  }
})

const emit = defineEmits(['toggle'])

const tasselPull = ref(0)
const isTasselDragging = ref(false)
const tasselStyle = computed(() => ({
  '--tassel-pull': `${tasselPull.value}px`
}))
const ariaLabel = computed(() =>
  props.activeView === 'ai' ? '向下拉切换回 Markdown 笔记' : '向下拉切换到 AI 提问'
)

let tasselStartY = 0

function emitToggle() {
  emit('toggle')
}

function resetTasselPull() {
  tasselPull.value = 0
  isTasselDragging.value = false
}

function handleTasselPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  tasselStartY = event.clientY - tasselPull.value
  isTasselDragging.value = true
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function handleTasselPointerMove(event) {
  if (!isTasselDragging.value) {
    return
  }

  tasselPull.value = Math.min(TASSLE_MAX_PULL, Math.max(0, event.clientY - tasselStartY))
}

function handleTasselPointerUp(event) {
  if (!isTasselDragging.value) {
    return
  }

  if (tasselPull.value >= TASSLE_TRIGGER_DISTANCE) {
    emitToggle()
  }

  resetTasselPull()
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

function handleTasselPointerCancel(event) {
  resetTasselPull()
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}
</script>

<style scoped>
.note-workspace-tassel {
  --tassel-pull: 0px;
  --note-workspace-toggle-width: 74px;
  position: fixed;
  top: 10px;
  right: max(
    -6px,
    calc((100vw - min(1480px, 100vw - 32px)) / 4 - (var(--note-workspace-toggle-width) / 2))
  );
  z-index: 8;
  width: 74px;
  display: grid;
  justify-items: center;
  color: #1a5f94;
  user-select: none;
  touch-action: none;
  cursor: grab;
  filter: drop-shadow(0 14px 20px rgba(18, 52, 78, 0.14));
  transition: opacity 180ms ease, filter 180ms ease;
}

.note-workspace-tassel:focus-visible {
  outline: none;
}

.note-workspace-tassel.is-pulling {
  cursor: grabbing;
}

.note-workspace-tassel.is-pulling .note-workspace-tassel__cord,
.note-workspace-tassel.is-pulling .note-workspace-tassel__head {
  transition: none;
}

.note-workspace-tassel.is-ai {
  color: #1d6b8f;
}

.note-workspace-tassel__cord {
  width: 2px;
  height: calc(34px + var(--tassel-pull));
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(122, 181, 222, 0.92));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.26);
  transition: height 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.note-workspace-tassel__head {
  position: relative;
  width: 100%;
  min-height: 52px;
  display: grid;
  justify-items: center;
  align-items: center;
  padding: 10px 8px;
  border-radius: 18px;
  border: 1px solid rgba(29, 111, 170, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0) 28%),
    linear-gradient(180deg, rgba(244, 251, 255, 0.99), rgba(198, 231, 255, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 -5px 0 rgba(96, 169, 221, 0.18),
    0 12px 18px rgba(18, 52, 78, 0.12);
  transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.note-workspace-tassel.is-ai .note-workspace-tassel__head {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0) 28%),
    linear-gradient(180deg, rgba(242, 252, 255, 0.99), rgba(190, 235, 228, 0.98));
}

.note-workspace-tassel__head::after {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
  opacity: 0.88;
  pointer-events: none;
}

.note-workspace-tassel__label {
  position: relative;
  z-index: 1;
  text-align: center;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 1.06rem;
  font-weight: 700;
  color: #12344e;
}

.note-workspace-tassel__fringe {
  width: 52px;
  height: 10px;
  margin-top: 5px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(114, 182, 230, 0.94), rgba(68, 151, 213, 0.78));
  box-shadow: 0 8px 12px rgba(18, 52, 78, 0.12);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.note-workspace-tassel.is-ai .note-workspace-tassel__fringe {
  background: linear-gradient(180deg, rgba(106, 188, 172, 0.94), rgba(55, 148, 130, 0.78));
}

.note-workspace-tassel.is-armed .note-workspace-tassel__cord {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(76, 168, 228, 0.98));
}

.note-workspace-tassel.is-armed .note-workspace-tassel__head,
.note-workspace-tassel:hover .note-workspace-tassel__head,
.note-workspace-tassel:focus-visible .note-workspace-tassel__head {
  transform: translateY(2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -5px 0 rgba(96, 169, 221, 0.24),
    0 18px 24px rgba(18, 52, 78, 0.14);
}

.note-workspace-tassel.is-armed .note-workspace-tassel__fringe,
.note-workspace-tassel:hover .note-workspace-tassel__fringe,
.note-workspace-tassel:focus-visible .note-workspace-tassel__fringe {
  transform: translateY(2px);
  box-shadow: 0 12px 18px rgba(18, 52, 78, 0.18);
}

@media (max-width: 900px) {
  .note-workspace-tassel {
    display: none;
  }
}
</style>
