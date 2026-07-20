<template>
  <main
    class="auth-layout tool-login-layout"
    :class="{ 'xianyu-login-layout': isXianyuLogin }"
  >
    <XianyuLoginCard
      v-if="isXianyuLogin"
      :submitting="submitting"
      :server-error="serverError"
      @login="handleLogin"
    />
    <LoginForm
      v-else
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
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '../../components/LoginForm/LoginForm.vue'
import XianyuLoginCard from '../../android/features/xianyu/XianyuLoginCard.vue'
import {
  AUTH_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  NOTE_AUTH_KEY,
  NOTE_USERNAME_KEY,
  USERNAME_KEY
} from '../../constants/storage'
import http from '../../utils/http'
import { getXianyuApiBaseUrl } from '../../android/features/xianyu/api'

const route = useRoute()
const router = useRouter()
const submitting = ref(false)
const serverError = ref('')
const isXianyuLogin = route.name === 'xianyu-login'
const isAndroidApp = import.meta.env.MODE === 'android'
const loginTitle = '\u5DE5\u5177\u767B\u5F55'

function getLoginErrorMessage(error) {
  const rawMessage = error instanceof Error ? String(error.message || '').trim() : ''

  if (!isXianyuLogin) {
    return rawMessage || '登录失败，请稍后重试'
  }

  if (/invalid username or password|invalid password/i.test(rawMessage)) {
    return '用户名或密码错误'
  }

  if (/username and password are required|password is required/i.test(rawMessage)) {
    return '请输入用户名和密码'
  }

  if (/too many|rate limit|retry after|429/i.test(rawMessage)) {
    return '登录尝试次数过多，请稍后再试'
  }

  if (/network error|failed to fetch|connection|err_/i.test(rawMessage)) {
    return '无法连接公网登录服务，请检查网络后重试'
  }

  if (/timeout|timed out/i.test(rawMessage)) {
    return '连接登录服务超时，请稍后重试'
  }

  if (/authentication service is temporarily unavailable|server returned 500/i.test(rawMessage)) {
    return '登录服务暂时不可用，请稍后重试'
  }

  if (/[\u3400-\u9fff]/.test(rawMessage)) {
    return rawMessage
  }

  return '登录失败，请检查用户名和密码后重试'
}

async function handleLogin(payload) {
  serverError.value = ''
  submitting.value = true

  try {
    const xianyuBaseUrl = isXianyuLogin ? getXianyuApiBaseUrl() : ''
    const data = await http.post(
      '/api/login',
      payload,
      xianyuBaseUrl ? { baseURL: xianyuBaseUrl } : undefined
    )
    const username = typeof data.user?.username === 'string'
      ? data.user.username
      : typeof payload.username === 'string'
        ? payload.username
        : ''
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
      throw new Error('登录成功，但服务器没有返回登录令牌')
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
    const defaultRedirect = isXianyuLogin ? '/xianyu' : isAndroidApp ? '/notes' : '/tools'
    const safeRedirect = requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : defaultRedirect

    router.push(safeRedirect)
  } catch (error) {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(NOTE_AUTH_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(NOTE_USERNAME_KEY)
    serverError.value = getLoginErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.tool-login-layout {
  width: min(1120px, calc(100% - 32px));
  justify-content: center;
  min-height: 100vh;
  padding: 32px 0 40px;
  background: #ffffff;
}

.tool-login-layout :deep(.auth-card) {
  width: min(960px, 100%);
  border: 1px solid #e7e7e7;
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.08);
  backdrop-filter: none;
}

.tool-login-layout :deep(.brand-block) {
  color: #f7f7f7;
  background: #171717;
  box-shadow: none;
}

.tool-login-layout :deep(.brand-tag) {
  color: #bdbdbd;
}

.tool-login-layout :deep(.brand-copy) {
  color: rgba(247, 247, 247, 0.78);
}

.tool-login-layout :deep(.field) {
  color: #4f4f4f;
}

.tool-login-layout :deep(.field .wm-input__wrapper) {
  border-color: #dedede;
  background: #ffffff;
  color: #171717;
  box-shadow: none;
}

.tool-login-layout :deep(.field .wm-input__wrapper:focus-within) {
  border-color: #9b9b9b;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
}

.tool-login-layout :deep(.primary-btn) {
  color: #ffffff;
  background: #171717;
  box-shadow: none;
}

.tool-login-layout :deep(.primary-btn:hover) {
  box-shadow: none;
}

.tool-login-layout :deep(.primary-btn:disabled) {
  opacity: 0.62;
  transform: none;
}

.tool-login-layout :deep(.secondary-btn) {
  color: #171717;
  border: 1px solid #e7e7e7;
  background: #f4f4f4;
}

.tool-login-layout :deep(.secondary-btn:hover) {
  background: #ececec;
}

.tool-login-layout :deep(.form-error) {
  color: #d14c3e;
}

.tool-login-layout.xianyu-login-layout {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding:
    max(28px, env(safe-area-inset-top, 0px))
    22px
    max(28px, env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.96) 0, rgba(255, 255, 255, 0) 42%),
    #f1f2ef;
}

@media (max-width: 720px) {
  .tool-login-layout {
    width: min(100% - 24px, 1120px);
    padding: 24px 0;
  }

  .tool-login-layout :deep(.auth-card) {
    grid-template-columns: 1fr;
    padding: 16px;
    border-radius: 24px;
  }

  .tool-login-layout :deep(.brand-block),
  .tool-login-layout :deep(.login-form) {
    padding: 22px;
  }

  .tool-login-layout :deep(.login-actions) {
    display: grid;
  }

  .tool-login-layout.xianyu-login-layout {
    width: 100%;
    padding:
      max(20px, env(safe-area-inset-top, 0px))
      14px
      max(20px, env(safe-area-inset-bottom, 0px));
  }
}
</style>
