<template>
  <section class="android-page android-home android-life-page">
    <section class="android-profile-hero">
      <div class="android-profile-hero__avatar-wrap">
        <img :src="profileAvatar" alt="Liu An 的头像" class="android-profile-hero__avatar" />
        <span class="android-profile-hero__online" aria-label="持续更新中" />
      </div>

      <div class="android-profile-hero__copy">
        <p class="android-profile-hero__eyebrow">生活主页</p>
        <h1>Liu An</h1>

        <ul class="android-profile-hero__tags" aria-label="个人方向">
          <li>前端开发</li>
          <li>AI 实验</li>
          <li>日常记录</li>
        </ul>
      </div>

      <button
        type="button"
        class="android-profile-mode-switch"
        aria-label="返回主页"
        @click="goHome"
      >
        <ToggleRight :size="17" />
        <span>主页</span>
      </button>
    </section>

    <section class="android-settings-card">
      <div class="android-settings-card__heading">
        <Sprout :size="18" />
        <div>
          <small>LIFE</small>
          <h2>生活记录</h2>
        </div>
      </div>

      <div class="android-life-empty">
        <p>这里将用于展示生活记录。</p>
        <span>功能正在筹备中，敬请期待。</span>
      </div>
    </section>
  </section>
</template>

<script setup>
import { Sprout, ToggleRight } from 'lucide-vue-next'
import profileAvatar from '../../assets/images/headerPH.png'
import { setAndroidAppMode } from '../appMode'

function goHome() {
  setAndroidAppMode('personal')
}
</script>

<style scoped>
.android-profile-mode-switch {
  position: absolute;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--android-line-strong);
  border-radius: 999px;
  color: var(--android-accent-contrast);
  background: var(--android-accent);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 7px 16px var(--android-accent-shadow);
}

.android-life-empty {
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 28px 0;
  color: var(--android-text-soft);
  text-align: center;
}

.android-life-empty p {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
}

.android-life-empty span {
  color: var(--android-text-faint);
  font-size: 0.72rem;
}

@media (max-width: 560px) {
  .android-life-page .android-profile-hero {
    padding-right: 86px;
  }
}
</style>
