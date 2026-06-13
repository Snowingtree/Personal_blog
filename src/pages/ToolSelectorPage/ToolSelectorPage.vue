<template>
  <main
    v-if="privateAppAvailable"
    class="tool-selector-page"
    :class="{ 'tool-selector-page--leaving': openingOptionKey }"
  >
    <header class="tool-selector-topbar" aria-label="工具入口操作">
      <button type="button" class="tool-selector-logout" aria-label="退出登录" title="退出登录" @click="handleLogout">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </button>
    </header>

    <section class="tool-selector-table" aria-label="选择入口">
      <component
        :is="option.to ? RouterLink : 'article'"
        v-for="option in toolOptions"
        :key="option.key"
        class="poker-card"
        :class="[
          `poker-card--${option.key}`,
          {
            'poker-card--pending': option.pending,
            'poker-card--opening': openingOptionKey === option.key,
            'poker-card--receding': openingOptionKey && openingOptionKey !== option.key
          }
        ]"
        :to="option.to || undefined"
        :aria-disabled="option.pending ? 'true' : undefined"
        @click="handleOptionClick($event, option)"
      >
        <span class="poker-card__corner poker-card__corner--top">
          <span>{{ option.rank }}</span>
          <span>{{ option.suit }}</span>
        </span>

        <span class="poker-card__center">
          <span class="poker-card__suit">{{ option.suit }}</span>
          <span class="poker-card__title">{{ option.title }}</span>
        </span>

        <span class="poker-card__corner poker-card__corner--bottom">
          <span>{{ option.rank }}</span>
          <span>{{ option.suit }}</span>
        </span>
      </component>
    </section>
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import {
  AUTH_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const TOOL_SELECTOR_BACKGROUND_CLASS = 'is-tool-selector-page'
const openingOptionKey = ref('')
let navigationTimer = 0

const toolOptions = [
  {
    key: 'tools',
    rank: 'A',
    suit: '\u2660',
    title: '\u7B14\u8BB0',
    to: '/notes'
  },
  {
    key: 'anime',
    rank: 'K',
    suit: '\u2665',
    title: '\u52A8\u6F2B',
    to: '/display'
  },
  {
    key: 'internship',
    rank: 'Q',
    suit: '\u2666',
    title: '\u5B9E\u4E60',
    to: '/internship'
  },
  {
    key: 'mock-exam',
    rank: 'J',
    suit: '\u2663',
    title: '\u8003\u516C',
    pending: true
  },
  {
    key: 'thoughts',
    rank: '10',
    suit: '\u2660',
    title: '\u788E\u788E\u5FF5',
    to: '/thoughts'
  }
]

function handleLogout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(NOTE_AUTH_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(NOTE_USERNAME_KEY)
  router.push('/notes-login')
}

function handleOptionClick(event, option) {
  if (!option.to || option.pending || openingOptionKey.value) {
    event.preventDefault()
    return
  }

  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }

  event.preventDefault()
  openingOptionKey.value = option.key
  navigationTimer = window.setTimeout(() => {
    navigationTimer = 0
    router.push(option.to)
  }, 280)
}

function syncToolSelectorBackground(enabled) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle(TOOL_SELECTOR_BACKGROUND_CLASS, enabled)
  document.body.classList.toggle(TOOL_SELECTOR_BACKGROUND_CLASS, enabled)
}

onMounted(() => {
  syncToolSelectorBackground(true)
})

onBeforeUnmount(() => {
  if (navigationTimer) {
    window.clearTimeout(navigationTimer)
  }

  syncToolSelectorBackground(false)
})
</script>

<style scoped>
.tool-selector-page {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 28px max(16px, calc((100vw - 1280px) / 2)) 52px;
  color: #1f2933;
  background: #ffffff;
  -webkit-user-select: none;
  user-select: none;
}

.tool-selector-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 64px;
  margin-bottom: 44px;
  padding: 12px 0;
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.tool-selector-logout {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 6px);
  grid-template-rows: repeat(3, 6px);
  gap: 6px;
  place-content: center;
  width: 52px;
  height: 52px;
  border: 1px solid rgba(31, 41, 51, 0.16);
  border-radius: 14px;
  padding: 0;
  color: #1f2933;
  background: #ffffff;
  box-shadow:
    0 10px 26px rgba(15, 23, 32, 0.1),
    inset 0 -2px 0 rgba(31, 41, 51, 0.08);
  cursor: pointer;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.tool-selector-logout span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.tool-selector-logout span:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}

.tool-selector-logout span:nth-child(2) {
  grid-column: 3;
  grid-row: 1;
}

.tool-selector-logout span:nth-child(3) {
  grid-column: 2;
  grid-row: 2;
}

.tool-selector-logout span:nth-child(4) {
  grid-column: 1;
  grid-row: 3;
}

.tool-selector-logout span:nth-child(5) {
  grid-column: 3;
  grid-row: 3;
}

.tool-selector-logout:hover,
.tool-selector-logout:focus-visible {
  transform: translate3d(0, -2px, 0) rotate(8deg);
  border-color: rgba(31, 41, 51, 0.28);
  box-shadow:
    0 14px 32px rgba(15, 23, 32, 0.14),
    inset 0 -2px 0 rgba(31, 41, 51, 0.1);
}

.tool-selector-logout:focus-visible {
  outline: 3px solid rgba(31, 41, 51, 0.12);
  outline-offset: 3px;
}

.tool-selector-table {
  display: grid;
  grid-template-columns: repeat(5, minmax(160px, 1fr));
  gap: clamp(18px, 3vw, 38px);
  align-items: center;
  justify-items: center;
  min-height: 100vh;
  min-height: calc(100vh - 188px);
}

.poker-card {
  --card-accent: #1f2933;
  --card-rotate: 0deg;
  --card-hover-rotate: 0deg;
  position: relative;
  display: grid;
  width: min(100%, 280px);
  aspect-ratio: 5 / 7;
  padding: 22px;
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 18px;
  color: var(--card-accent);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(247, 248, 250, 0.98));
  box-shadow:
    0 28px 52px rgba(15, 23, 32, 0.16),
    inset 0 0 0 8px #ffffff,
    inset 0 0 0 10px rgba(31, 41, 51, 0.08);
  text-decoration: none;
  transform: translate3d(0, 0, 0) rotate(var(--card-rotate)) scale(1);
  transform-origin: 50% 72%;
  will-change: transform;
  transition:
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 280ms ease,
    border-color 280ms ease,
    opacity 220ms ease;
}

.tool-selector-page--leaving .tool-selector-topbar {
  opacity: 0;
  transform: translateY(-8px);
}

.tool-selector-page--leaving .tool-selector-table {
  pointer-events: none;
}

.poker-card--opening,
.poker-card--opening:hover,
.poker-card--opening:focus-visible {
  z-index: 2;
  border-color: rgba(31, 41, 51, 0.24);
  box-shadow:
    0 42px 78px rgba(15, 23, 32, 0.22),
    inset 0 0 0 8px #ffffff,
    inset 0 0 0 10px rgba(31, 41, 51, 0.1);
  transform: translate3d(0, -22px, 0) rotate(var(--card-hover-rotate)) scale(1.055);
}

.poker-card--receding {
  opacity: 0;
  transform: translate3d(0, 10px, 0) rotate(var(--card-rotate)) scale(0.965);
}

.poker-card--tools {
  --card-accent: #1f2933;
  --card-rotate: -4deg;
  --card-hover-rotate: -1.5deg;
}

.poker-card--anime {
  --card-accent: #b4232f;
  --card-rotate: 4deg;
  --card-hover-rotate: 1.5deg;
}

.poker-card--internship {
  --card-accent: #b4232f;
  --card-rotate: -1deg;
  --card-hover-rotate: 0.5deg;
}

.poker-card--mock-exam {
  --card-accent: #1f2933;
  --card-rotate: 2.5deg;
  --card-hover-rotate: 0.75deg;
}

.poker-card--thoughts {
  --card-accent: #1f2933;
  --card-rotate: -2deg;
  --card-hover-rotate: -0.5deg;
}

.poker-card--pending {
  --card-accent: #a7adb5;
  border-color: rgba(107, 114, 128, 0.1);
  background: linear-gradient(135deg, rgba(252, 252, 252, 0.9), rgba(246, 247, 248, 0.86));
  box-shadow:
    0 18px 36px rgba(15, 23, 32, 0.08),
    inset 0 0 0 8px rgba(255, 255, 255, 0.88),
    inset 0 0 0 10px rgba(107, 114, 128, 0.06);
  cursor: default;
}

.poker-card:hover,
.poker-card:focus-visible {
  transform: translate3d(0, -14px, 0) rotate(var(--card-hover-rotate)) scale(1.025);
  border-color: rgba(31, 41, 51, 0.2);
  box-shadow:
    0 36px 70px rgba(15, 23, 32, 0.2),
    inset 0 0 0 8px #ffffff,
    inset 0 0 0 10px rgba(31, 41, 51, 0.1);
}

.poker-card--pending:hover {
  transform: translate3d(0, -6px, 0) rotate(var(--card-hover-rotate)) scale(1.008);
  border-color: rgba(107, 114, 128, 0.14);
  box-shadow:
    0 22px 42px rgba(15, 23, 32, 0.1),
    inset 0 0 0 8px rgba(255, 255, 255, 0.9),
    inset 0 0 0 10px rgba(107, 114, 128, 0.07);
}

.poker-card:focus-visible {
  outline: 3px solid rgba(31, 41, 51, 0.12);
  outline-offset: 8px;
}

.poker-card__corner {
  position: absolute;
  display: grid;
  justify-items: center;
  width: 42px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1;
}

.poker-card__corner--top {
  top: 24px;
  left: 24px;
}

.poker-card__corner--bottom {
  right: 24px;
  bottom: 24px;
  transform: rotate(180deg);
}

.poker-card__center {
  display: grid;
  place-items: center;
  align-self: center;
  justify-self: center;
  gap: 14px;
  text-align: center;
}

.poker-card__suit {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(5.6rem, 14vw, 8.5rem);
  line-height: 0.82;
}

.poker-card__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: 0;
}

@media (max-width: 760px) {
  .tool-selector-page {
    padding-top: 18px;
  }

  .tool-selector-topbar {
    margin-bottom: 26px;
  }

  .tool-selector-table {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 28px;
  }

  .poker-card {
    width: min(100%, 280px);
  }
}

@media (min-width: 761px) and (max-width: 980px) {
  .tool-selector-table {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}

@media (min-width: 981px) and (max-width: 1160px) {
  .tool-selector-table {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-selector-topbar,
  .poker-card {
    transition-duration: 1ms;
  }
}
</style>
