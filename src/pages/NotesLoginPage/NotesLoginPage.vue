<template>
  <main
    class="auth-layout notes-login-layout"
    :class="{ 'notes-login-layout--android': isAndroidApp }"
  >
    <LoginForm
      :submitting="submitting"
      :server-error="serverError"
      brand-tag=""
      :title="notesTitle"
      copy=""
      @login="handleLogin"
    />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '../../components/LoginForm/LoginForm.vue'
import {
  AUTH_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../../constants/storage'
import http from '../../utils/http'

const route = useRoute()
const router = useRouter()
const submitting = ref(false)
const serverError = ref('')
const notesTitle = '\u7B14\u8BB0\u767B\u5F55'
const isAndroidApp = import.meta.env.MODE === 'android'

async function handleLogin(payload) {
  serverError.value = ''
  submitting.value = true

  try {
    const data = await http.post('/api/login', payload)
    const username = typeof data.user?.username === 'string' ? data.user.username : payload.username
    const token =
      typeof data.token === 'string'
        ? data.token
        : typeof data.access_token === 'string'
          ? data.access_token
          : ''
    const refreshToken =
      typeof data.refreshToken === 'string'
        ? data.refreshToken
        : typeof data.refresh_token === 'string'
          ? data.refresh_token
          : ''

    if (!token) {
      throw new Error('Login succeeded but the server did not return an auth token.')
    }

    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(NOTE_AUTH_KEY, 'true')
    localStorage.setItem(USERNAME_KEY, username)
    localStorage.setItem(NOTE_USERNAME_KEY, username)
    localStorage.setItem(AUTH_TOKEN_KEY, token)

    if (refreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken)
    } else {
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
    }

    const requestedRedirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const isSafeRedirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
    router.push(import.meta.env.MODE === 'android' && isSafeRedirect ? requestedRedirect : import.meta.env.MODE === 'android' ? '/notes' : '/tools')
  } catch (error) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(NOTE_AUTH_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(NOTE_USERNAME_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
    serverError.value = error instanceof Error ? error.message : 'Login failed. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.notes-login-layout {
  --agent-ink: #12344e;
  --agent-copy: #35556f;
  --agent-muted: #5f7c96;
  --agent-soft: #f5f9ff;
  --agent-accent: #2f7dff;
  --agent-accent-end: #4bb6ff;
  --agent-page-background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
  --agent-card-border: rgba(18, 52, 78, 0.08);
  --agent-card-background: rgba(255, 255, 255, 0.98);
  --agent-card-shadow: 0 24px 56px rgba(24, 67, 115, 0.1), 0 4px 14px rgba(24, 67, 115, 0.05);
  --agent-brand-border: rgba(18, 52, 78, 0.07);
  --agent-brand-background:
    radial-gradient(circle at top right, rgba(47, 125, 255, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(250, 252, 255, 0.99), rgba(245, 249, 255, 0.96));
  --agent-brand-inset: inset 0 1px 0 rgba(255, 255, 255, 0.78);
  --agent-field-border: rgba(18, 52, 78, 0.08);
  --agent-field-background: rgba(248, 252, 255, 0.96);
  --agent-focus-border: rgba(47, 125, 255, 0.46);
  --agent-focus-ring: 0 0 0 4px rgba(47, 125, 255, 0.1);
  --agent-primary-text: #f6fbff;
  --agent-primary-shadow: 0 14px 26px rgba(47, 125, 255, 0.22);
  --agent-primary-shadow-hover: 0 18px 34px rgba(47, 125, 255, 0.27);
  --agent-secondary-border: rgba(18, 52, 78, 0.08);
  --agent-secondary-background: rgba(245, 249, 255, 0.96);
  --agent-secondary-background-hover: rgba(47, 125, 255, 0.07);
  --agent-error: #c34a3a;
  width: 100%;
  min-height: 100vh;
  padding: 32px 16px;
  justify-content: center;
  background: var(--agent-page-background);
}

.notes-login-layout--android {
  --agent-ink: var(--android-text-strong);
  --agent-copy: var(--android-copy);
  --agent-muted: var(--android-text-soft);
  --agent-soft: var(--android-surface-soft);
  --agent-accent: var(--android-accent);
  --agent-accent-end: var(--android-accent);
  --agent-page-background: var(--android-canvas);
  --agent-card-border: var(--android-line);
  --agent-card-background: var(--android-surface-high);
  --agent-card-shadow: var(--android-shadow);
  --agent-brand-border: var(--android-line);
  --agent-brand-background: var(--android-hero-background);
  --agent-brand-inset: inset 0 1px 0 color-mix(in srgb, var(--android-surface-high) 82%, transparent);
  --agent-field-border: var(--android-line);
  --agent-field-background: var(--android-surface-soft);
  --agent-focus-border: var(--android-accent);
  --agent-focus-ring: 0 0 0 4px var(--android-focus-outline);
  --agent-primary-text: var(--android-accent-contrast);
  --agent-primary-shadow: 0 12px 24px var(--android-accent-shadow);
  --agent-primary-shadow-hover: 0 16px 30px var(--android-accent-shadow);
  --agent-secondary-border: var(--android-line);
  --agent-secondary-background: var(--android-accent-soft);
  --agent-secondary-background-hover: var(--android-navy-soft);
}

.notes-login-layout--android :deep(.field .wm-input) {
  --wm-input-text-color: var(--android-text-strong);
  --wm-input-border-color: var(--android-line-strong);
  --wm-input-hover-border-color: var(--android-line-strong);
  --wm-input-focus-border-color: var(--android-accent);
  --wm-input-bg-color: var(--android-surface-soft);
  --wm-input-icon-color: var(--android-text-faint);
  --wm-input-placeholder-color: var(--android-text-faint);
}

.notes-login-layout :deep(.auth-card) {
  width: min(920px, 100%);
  grid-template-columns: 0.95fr 1.05fr;
  gap: 18px;
  border: 1px solid var(--agent-card-border);
  border-radius: 30px;
  background: var(--agent-card-background);
  box-shadow: var(--agent-card-shadow);
  backdrop-filter: none;
}

.notes-login-layout :deep(.brand-block) {
  align-items: center;
  justify-content: center;
  min-height: 360px;
  border: 1px solid var(--agent-brand-border);
  border-radius: 24px;
  color: var(--agent-ink);
  background: var(--agent-brand-background);
  box-shadow: var(--agent-brand-inset);
}

.notes-login-layout :deep(.brand-block h1) {
  max-width: none;
  color: var(--agent-ink);
  font-size: clamp(2.6rem, 5vw, 4.1rem);
  letter-spacing: 0;
  text-align: center;
  white-space: nowrap;
}

.notes-login-layout :deep(.login-form) {
  gap: 20px;
  padding: 34px;
}

.notes-login-layout :deep(.field) {
  color: var(--agent-copy);
}

.notes-login-layout :deep(.field .wm-input) {
  --wm-border-radius-base: 16px;
}

.notes-login-layout :deep(.field .wm-input__wrapper) {
  border-color: var(--agent-field-border);
  background: var(--agent-field-background);
  color: var(--agent-ink);
}

.notes-login-layout :deep(.field .wm-input.is-isFocus .wm-input__wrapper),
.notes-login-layout :deep(.field .wm-input__wrapper:focus-within) {
  border-color: var(--agent-focus-border);
  box-shadow: var(--agent-focus-ring);
}

.notes-login-layout :deep(.primary-btn) {
  color: var(--agent-primary-text);
  background: linear-gradient(135deg, var(--agent-accent) 0%, var(--agent-accent-end) 100%);
  box-shadow: var(--agent-primary-shadow);
}

.notes-login-layout :deep(.primary-btn:hover) {
  box-shadow: var(--agent-primary-shadow-hover);
}

.notes-login-layout :deep(.secondary-btn) {
  color: var(--agent-copy);
  border: 1px solid var(--agent-secondary-border);
  background: var(--agent-secondary-background);
}

.notes-login-layout :deep(.secondary-btn:hover) {
  background: var(--agent-secondary-background-hover);
}

.notes-login-layout :deep(.form-error) {
  color: var(--agent-error);
}

.notes-login-layout--android :deep(.field .wm-input__inner) {
  color: var(--android-text-strong);
}

.notes-login-layout--android :deep(.field .wm-input__inner::placeholder),
.notes-login-layout--android :deep(.field .wm-input__suffix) {
  color: var(--android-text-faint);
}

@media (max-width: 760px) {
  .notes-login-layout {
    padding: 20px 16px;
  }

  .notes-login-layout :deep(.auth-card) {
    grid-template-columns: 1fr;
    gap: 12px;
    border-radius: 24px;
    padding: 18px;
  }

  .notes-login-layout :deep(.brand-block) {
    min-height: 190px;
    border-radius: 20px;
    padding: 24px;
  }

  .notes-login-layout :deep(.login-form) {
    padding: 18px 4px 4px;
  }
}
</style>
