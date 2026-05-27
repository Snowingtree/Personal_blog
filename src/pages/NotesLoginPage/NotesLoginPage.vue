<template>
  <main class="auth-layout notes-login-layout">
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
import { useRouter } from 'vue-router'
import LoginForm from '../../components/LoginForm/LoginForm.vue'
import { AUTH_KEY, AUTH_TOKEN_KEY, NOTE_AUTH_KEY, NOTE_USERNAME_KEY, USERNAME_KEY } from '../../constants/storage'
import http from '../../utils/http'

const router = useRouter()
const submitting = ref(false)
const serverError = ref('')
const notesTitle = '\u5DE5\u5177\u767B\u5F55'

async function handleLogin(payload) {
  serverError.value = ''
  submitting.value = true

  try {
    const data = await http.post('/api/login', payload)
    const username = typeof data.user?.username === 'string' ? data.user.username : payload.username
    const token = typeof data.token === 'string' ? data.token : ''

    if (!token) {
      throw new Error('Login succeeded but the server did not return an auth token.')
    }

    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(NOTE_AUTH_KEY, 'true')
    localStorage.setItem(USERNAME_KEY, username)
    localStorage.setItem(NOTE_USERNAME_KEY, username)
    localStorage.setItem(AUTH_TOKEN_KEY, token)

    router.push('/tools')
  } catch (error) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(NOTE_AUTH_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(NOTE_USERNAME_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
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
  width: 100%;
  min-height: 100vh;
  padding: 32px 16px;
  justify-content: center;
  background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
}

.notes-login-layout :deep(.auth-card) {
  width: min(920px, 100%);
  grid-template-columns: 0.95fr 1.05fr;
  gap: 18px;
  border: 1px solid rgba(18, 52, 78, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 24px 56px rgba(24, 67, 115, 0.1),
    0 4px 14px rgba(24, 67, 115, 0.05);
  backdrop-filter: none;
}

.notes-login-layout :deep(.brand-block) {
  align-items: center;
  justify-content: center;
  min-height: 360px;
  border: 1px solid rgba(18, 52, 78, 0.07);
  border-radius: 24px;
  color: var(--agent-ink);
  background:
    radial-gradient(circle at top right, rgba(47, 125, 255, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(250, 252, 255, 0.99), rgba(245, 249, 255, 0.96));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
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
  border-color: rgba(18, 52, 78, 0.08);
  background: rgba(248, 252, 255, 0.96);
  color: var(--agent-ink);
}

.notes-login-layout :deep(.field .wm-input.is-isFocus .wm-input__wrapper),
.notes-login-layout :deep(.field .wm-input__wrapper:focus-within) {
  border-color: rgba(47, 125, 255, 0.46);
  box-shadow: 0 0 0 4px rgba(47, 125, 255, 0.1);
}

.notes-login-layout :deep(.primary-btn) {
  color: #f6fbff;
  background: linear-gradient(135deg, var(--agent-accent) 0%, var(--agent-accent-end) 100%);
  box-shadow: 0 14px 26px rgba(47, 125, 255, 0.22);
}

.notes-login-layout :deep(.primary-btn:hover) {
  box-shadow: 0 18px 34px rgba(47, 125, 255, 0.27);
}

.notes-login-layout :deep(.secondary-btn) {
  color: var(--agent-copy);
  border: 1px solid rgba(18, 52, 78, 0.08);
  background: rgba(245, 249, 255, 0.96);
}

.notes-login-layout :deep(.secondary-btn:hover) {
  background: rgba(47, 125, 255, 0.07);
}

.notes-login-layout :deep(.form-error) {
  color: #c34a3a;
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
