<template>
  <section class="xianyu-login-card" aria-labelledby="xianyu-login-title">
    <div class="xianyu-login-card__header">
      <div class="xianyu-login-card__privacy">
        <ShieldCheck :size="14" aria-hidden="true" />
        <span>私人空间</span>
      </div>

      <img class="xianyu-login-card__icon" :src="appIcon" alt="闲鱼记录" />
      <h1 id="xianyu-login-title">闲鱼记录</h1>
      <p>使用账号和密码登录，继续管理你的闲鱼记录</p>
    </div>

    <form class="xianyu-login-card__form" @submit.prevent="submitLogin">
      <label class="xianyu-login-card__label" for="xianyu-username">用户名</label>
      <div class="xianyu-login-card__input" :class="{ 'has-error': displayError }">
        <UserRound :size="19" aria-hidden="true" />
        <input
          id="xianyu-username"
          v-model="username"
          type="text"
          placeholder="请输入用户名"
          autocomplete="username"
          :disabled="submitting"
          autofocus
          @input="handleInput"
        />
      </div>

      <label class="xianyu-login-card__label xianyu-login-card__label--secondary" for="xianyu-password">密码</label>
      <div class="xianyu-login-card__input" :class="{ 'has-error': displayError }">
        <LockKeyhole :size="19" aria-hidden="true" />
        <input
          id="xianyu-password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码"
          autocomplete="current-password"
          :disabled="submitting"
          @input="handleInput"
        />
        <button
          type="button"
          class="xianyu-login-card__visibility"
          :aria-label="showPassword ? '隐藏密码' : '显示密码'"
          :disabled="submitting"
          @click="showPassword = !showPassword"
        >
          <EyeOff v-if="showPassword" :size="19" aria-hidden="true" />
          <Eye v-else :size="19" aria-hidden="true" />
        </button>
      </div>

      <p v-if="displayError" class="xianyu-login-card__error" role="alert">
        {{ displayError }}
      </p>

      <button class="xianyu-login-card__submit" type="submit" :disabled="submitting">
        <span>{{ submitting ? '验证中...' : '进入闲鱼' }}</span>
        <LoaderCircle v-if="submitting" class="is-loading" :size="19" aria-hidden="true" />
        <ArrowRight v-else :size="19" aria-hidden="true" />
      </button>

      <RouterLink class="xianyu-login-card__back" to="/">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>返回首页</span>
      </RouterLink>
    </form>

    <div class="xianyu-login-card__footer">
      <LockKeyhole :size="14" aria-hidden="true" />
      <span>账号和密码仅用于身份验证</span>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound
} from 'lucide-vue-next'
import appIcon from '../../../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'

const props = defineProps({
  submitting: {
    type: Boolean,
    default: false
  },
  serverError: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['login'])
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const validationError = ref('')
const dismissServerError = ref(false)

const displayError = computed(() => {
  if (validationError.value) {
    return validationError.value
  }

  return dismissServerError.value ? '' : props.serverError
})

watch(
  () => props.serverError,
  () => {
    dismissServerError.value = false
  }
)

function handleInput() {
  validationError.value = ''
  dismissServerError.value = true
}

function submitLogin() {
  const normalizedUsername = username.value.trim()

  if (!normalizedUsername || !password.value) {
    validationError.value = '请输入用户名和密码'
    return
  }

  validationError.value = ''
  dismissServerError.value = false
  emit('login', { username: normalizedUsername, password: password.value })
}
</script>

<style scoped>
.xianyu-login-card {
  width: min(420px, 100%);
  overflow: hidden;
  color: #242725;
  border: 1px solid rgba(37, 40, 38, 0.1);
  border-radius: 30px;
  background: rgba(255, 255, 254, 0.96);
  box-shadow:
    0 24px 60px rgba(35, 38, 36, 0.09),
    0 3px 10px rgba(35, 38, 36, 0.04);
}

.xianyu-login-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 30px 22px;
  text-align: center;
}

.xianyu-login-card__privacy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  padding: 6px 10px;
  color: #626763;
  border: 1px solid #e4e5e2;
  border-radius: 999px;
  background: #f6f6f4;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.xianyu-login-card__icon {
  width: 82px;
  height: 82px;
  object-fit: cover;
  border: 5px solid #f1f1ee;
  border-radius: 24px;
  box-shadow: 0 10px 24px rgba(37, 40, 38, 0.14);
}

.xianyu-login-card__header h1 {
  margin: 20px 0 0;
  color: #202321;
  font-size: 1.72rem;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.xianyu-login-card__header p {
  margin: 10px 0 0;
  color: #7a7e7a;
  font-size: 0.9rem;
  line-height: 1.65;
}

.xianyu-login-card__form {
  display: flex;
  flex-direction: column;
  padding: 4px 30px 26px;
}

.xianyu-login-card__label {
  margin-bottom: 9px;
  color: #555a56;
  font-size: 0.82rem;
  font-weight: 700;
}

.xianyu-login-card__label--secondary {
  margin-top: 15px;
}

.xianyu-login-card__input {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px 0 16px;
  color: #858a86;
  border: 1px solid #dadcd8;
  border-radius: 16px;
  background: #fafaf8;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.xianyu-login-card__input:focus-within {
  color: #343936;
  border-color: #808581;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(52, 57, 54, 0.08);
}

.xianyu-login-card__input.has-error {
  border-color: #c76a61;
  box-shadow: 0 0 0 4px rgba(199, 106, 97, 0.08);
}

.xianyu-login-card__input input {
  min-width: 0;
  flex: 1;
  align-self: stretch;
  padding: 0;
  color: #242725;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 0.96rem;
}

.xianyu-login-card__input input::placeholder {
  color: #a0a4a0;
}

.xianyu-login-card__visibility {
  width: 38px;
  height: 38px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: #7a7e7a;
  border: 0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}

.xianyu-login-card__visibility:hover {
  color: #343936;
  background: #ededeb;
}

.xianyu-login-card__error {
  margin: 10px 2px 0;
  color: #ba5147;
  font-size: 0.8rem;
  line-height: 1.5;
}

.xianyu-login-card__submit {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 18px;
  padding: 0 20px;
  color: #ffffff;
  border: 0;
  border-radius: 16px;
  background: #2e322f;
  box-shadow: 0 10px 22px rgba(37, 40, 38, 0.16);
  font: inherit;
  font-weight: 750;
  cursor: pointer;
  transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.xianyu-login-card__submit:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #1f2220;
  box-shadow: 0 13px 26px rgba(37, 40, 38, 0.2);
}

.xianyu-login-card__submit:disabled,
.xianyu-login-card__visibility:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.xianyu-login-card__submit .is-loading {
  animation: xianyu-login-spin 0.8s linear infinite;
}

.xianyu-login-card__back {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 6px;
  margin-top: 17px;
  padding: 5px 8px;
  color: #707570;
  border-radius: 8px;
  font-size: 0.82rem;
  text-decoration: none;
}

.xianyu-login-card__back:hover {
  color: #242725;
  background: #f1f1ef;
}

.xianyu-login-card__footer {
  min-height: 47px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  color: #898d89;
  border-top: 1px solid #ececea;
  background: #fafaf8;
  font-size: 0.72rem;
}

@keyframes xianyu-login-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .xianyu-login-card {
    border-radius: 25px;
  }

  .xianyu-login-card__header {
    padding: 28px 22px 20px;
  }

  .xianyu-login-card__privacy {
    margin-bottom: 17px;
  }

  .xianyu-login-card__icon {
    width: 76px;
    height: 76px;
    border-radius: 22px;
  }

  .xianyu-login-card__header h1 {
    margin-top: 17px;
    font-size: 1.58rem;
  }

  .xianyu-login-card__form {
    padding: 4px 22px 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xianyu-login-card__input,
  .xianyu-login-card__submit {
    transition: none;
  }
}
</style>
