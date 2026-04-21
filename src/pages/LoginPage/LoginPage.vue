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
import { AUTH_KEY, AUTH_TOKEN_KEY, USERNAME_KEY } from '../../constants/storage'
import http from '../../utils/http'

const router = useRouter()
const submitting = ref(false)
const serverError = ref('')
const loginTitle = '\u52A8\u6F2B\u5DE5\u5177'

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
    localStorage.setItem(USERNAME_KEY, username)
    localStorage.setItem(AUTH_TOKEN_KEY, token)

    router.push('/display')
  } catch (error) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    serverError.value = error instanceof Error ? error.message : 'Login failed. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
