<template>
  <section class="android-page android-home android-xianyu-page">
    <section class="android-xianyu-card">
      <header class="android-xianyu-heading">
        <div class="android-xianyu-heading__title">
          <small>XIANYU</small>
          <h2>咸鱼列表</h2>
        </div>
        <span class="android-xianyu-count">{{ items.length }} 条</span>
      </header>

      <ul class="android-xianyu-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="android-xianyu-item"
        >
          <strong class="android-xianyu-name" :title="item.name">{{ item.name }}</strong>
          <button
            type="button"
            class="android-xianyu-copy"
            :class="{ 'is-copied': copiedId === item.id }"
            @click="copyItem(item)"
          >
            <Check v-if="copiedId === item.id" :size="16" />
            <Copy v-else :size="16" />
            <span>{{ copiedId === item.id ? '已复制' : '复制' }}</span>
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

const items = ref([
  { id: '1', name: '索尼 A7M4 相机', url: 'https://www.goofish.com/item?id=1' },
  { id: '2', name: '罗技 GPW 鼠标', url: 'https://www.goofish.com/item?id=2' },
  { id: '3', name: '戴森吹风机', url: 'https://www.goofish.com/item?id=3' },
  { id: '4', name: '任天堂 Switch OLED', url: 'https://www.goofish.com/item?id=4' },
  { id: '5', name: 'AirPods Pro 2', url: 'https://www.goofish.com/item?id=5' },
  { id: '6', name: 'iPhone 15 Pro', url: 'https://www.goofish.com/item?id=6' },
  { id: '7', name: '小米手环 9', url: 'https://www.goofish.com/item?id=7' },
  { id: '8', name: '富士 X-T5 微单', url: 'https://www.goofish.com/item?id=8' },
  { id: '9', name: 'iPad Pro 12.9', url: 'https://www.goofish.com/item?id=9' },
  { id: '10', name: 'PS5 游戏机', url: 'https://www.goofish.com/item?id=10' },
  { id: '11', name: '大疆 Mini 4 Pro', url: 'https://www.goofish.com/item?id=11' },
  { id: '12', name: 'MacBook Air M3', url: 'https://www.goofish.com/item?id=12' },
  { id: '13', name: '佳能 RF 50mm', url: 'https://www.goofish.com/item?id=13' },
  { id: '14', name: '罗技 MX Master 3S', url: 'https://www.goofish.com/item?id=14' },
  { id: '15', name: 'Kindle Paperwhite', url: 'https://www.goofish.com/item?id=15' }
])

const copiedId = ref('')
let copiedTimerId = 0

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

async function copyItem(item) {
  try {
    await copyText(item.url)
    copiedId.value = item.id
    window.clearTimeout(copiedTimerId)
    copiedTimerId = window.setTimeout(() => {
      copiedId.value = ''
    }, 1500)
  } catch {
    copiedId.value = ''
  }
}
</script>

<style scoped>
.android-xianyu-page {
  height: calc(100dvh - var(--android-bottom-nav-space));
  min-height: 0;
  overflow: hidden;
}

.android-xianyu-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 17px;
  border: 1px solid var(--android-line);
  border-radius: 19px;
  background: var(--android-surface);
  box-shadow: var(--android-shadow);
}

.android-xianyu-heading {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
}

.android-xianyu-heading__title small {
  color: var(--android-text-faint);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-xianyu-heading__title h2 {
  margin: 2px 0 0;
  color: var(--android-text-strong);
  font-size: 1rem;
}

.android-xianyu-count {
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--android-accent);
  background: var(--android-accent-soft);
  font-size: 0.64rem;
  font-weight: 700;
}

.android-xianyu-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.android-xianyu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 54px;
  padding: 8px 2px;
  border-top: 1px solid var(--android-line);
}

.android-xianyu-name {
  min-width: 0;
  overflow: hidden;
  color: var(--android-text-strong);
  font-size: 0.86rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.android-xianyu-copy {
  flex: 0 0 auto;
  min-width: 74px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--android-line-strong);
  border-radius: 11px;
  color: var(--android-accent-contrast);
  background: var(--android-accent);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 750;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease;
}

.android-xianyu-copy:active {
  transform: scale(0.97);
}

.android-xianyu-copy.is-copied {
  color: var(--android-text-strong);
  background: var(--android-surface-muted);
}
</style>
