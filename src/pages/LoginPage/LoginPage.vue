<template>
  <main class="auth-layout">
    <LoginForm
      :submitting="submitting"
      :server-error="serverError"
      brand-tag=""
      :title="loginTitle"
      copy=""
      @login="handleLogin"
    />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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

const router = useRouter()
const submitting = ref(false)
const serverError = ref('')
const loginTitle = '\u5DE5\u5177\u767B\u5F55'

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

    router.push('/tools')
  } catch (error) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(NOTE_AUTH_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(NOTE_USERNAME_KEY)
    serverError.value = error instanceof Error ? error.message : 'Login failed. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
