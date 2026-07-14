<template>
  <section class="android-page android-github-page">
    <header class="android-github-header">
      <span class="android-github-header__icon"><Github :size="23" /></span>
      <div>
        <p>EXTERNAL PROFILE</p>
        <h1>GitHub</h1>
        <span>在应用内查看 Snowingtree 的公开项目，左侧导航不会离开。</span>
      </div>
    </header>

    <section class="android-github-profile">
      <div class="android-github-profile__identity">
        <span><Github :size="25" /></span>
        <div>
          <small>DEVELOPER PROFILE</small>
          <h2>Snowingtree</h2>
          <p>个人项目、组件实验与持续更新的开发记录。</p>
        </div>
      </div>

      <a
        href="https://github.com/Snowingtree?tab=repositories"
        target="_blank"
        rel="noreferrer"
      >
        浏览器打开
        <ExternalLink :size="15" />
      </a>
    </section>

    <section class="android-github-repositories">
      <div class="android-github-repositories__heading">
        <div>
          <p>REPOSITORIES</p>
          <h2>公开仓库</h2>
        </div>
        <button type="button" :disabled="loading" aria-label="刷新仓库" @click="loadRepositories">
          <RefreshCw :size="17" :class="{ 'is-spinning': loading }" />
        </button>
      </div>

      <div v-if="loading && !repositories.length" class="android-github-state">
        正在读取 GitHub 仓库…
      </div>

      <div v-else-if="errorMessage && !repositories.length" class="android-github-state">
        <strong>暂时无法读取仓库</strong>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-else class="android-github-list">
        <a
          v-for="repository in repositories"
          :key="repository.id"
          :href="repository.html_url"
          target="_blank"
          rel="noreferrer"
          class="android-github-repository"
        >
          <div class="android-github-repository__title">
            <BookOpen :size="17" />
            <h3>{{ repository.name }}</h3>
            <ExternalLink :size="14" />
          </div>
          <p>{{ repository.description || '这个仓库暂时没有填写介绍。' }}</p>
          <div class="android-github-repository__meta">
            <span v-if="repository.language">{{ repository.language }}</span>
            <span><Star :size="13" /> {{ repository.stargazers_count }}</span>
            <span><GitFork :size="13" /> {{ repository.forks_count }}</span>
          </div>
        </a>
      </div>
    </section>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BookOpen, ExternalLink, GitFork, Github, RefreshCw, Star } from 'lucide-vue-next'

const repositories = ref([])
const loading = ref(false)
const errorMessage = ref('')
let requestController = null

async function loadRepositories() {
  requestController?.abort()
  requestController = new AbortController()
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      'https://api.github.com/users/Snowingtree/repos?sort=updated&per_page=12',
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal: requestController.signal
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub 返回 ${response.status}`)
    }

    const data = await response.json()
    repositories.value = Array.isArray(data) ? data : []
  } catch (error) {
    if (error?.name !== 'AbortError') {
      errorMessage.value = '请检查网络后重试。'
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadRepositories)
onBeforeUnmount(() => requestController?.abort())
</script>

<style scoped>
.android-github-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.android-github-header {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 8px 3px 6px;
}

.android-github-header__icon {
  flex: 0 0 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #303532;
  background: #e5e7e3;
}

.android-github-header p,
.android-github-repositories__heading p {
  margin: 0 0 6px;
  color: #6f746f;
  font-size: 0.64rem;
  font-weight: 850;
  letter-spacing: 0.14em;
}

.android-github-header h1,
.android-github-repositories__heading h2 {
  margin: 0;
  color: #252a27;
  letter-spacing: -0.04em;
}

.android-github-header h1 {
  font-size: clamp(1.65rem, 5.5vw, 2.8rem);
  line-height: 1;
}

.android-github-header > div > span {
  display: block;
  max-width: 620px;
  margin-top: 7px;
  color: #747a75;
  font-size: 0.78rem;
  line-height: 1.55;
}

.android-github-profile,
.android-github-repositories {
  border: 1px solid #dedfdb;
  border-radius: 19px;
  background: #fdfdfc;
  box-shadow: 0 10px 28px rgba(31, 35, 32, 0.055);
}

.android-github-profile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 17px;
}

.android-github-profile__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.android-github-profile__identity > span {
  flex: 0 0 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  background: #343936;
}

.android-github-profile small {
  color: #8a8f8a;
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.android-github-profile h2 {
  margin: 3px 0 0;
  color: #292e2b;
  font-size: 1.1rem;
}

.android-github-profile p {
  margin: 5px 0 0;
  color: #777d78;
  font-size: 0.72rem;
  line-height: 1.5;
}

.android-github-profile > a {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 11px;
  border-radius: 11px;
  color: #fff;
  background: #343936;
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
}

.android-github-repositories {
  padding: 17px;
}

.android-github-repositories__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.android-github-repositories__heading h2 {
  font-size: 1.22rem;
}

.android-github-repositories__heading button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 11px;
  color: #4f5550;
  background: #eceeeb;
}

.android-github-repositories__heading button:disabled {
  opacity: 0.6;
}

.is-spinning {
  animation: github-spin 0.8s linear infinite;
}

.android-github-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
}

.android-github-repository {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 14px;
  border: 1px solid #e4e6e2;
  border-radius: 14px;
  color: inherit;
  background: #f7f8f6;
  text-decoration: none;
}

.android-github-repository__title {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  color: #3b403d;
}

.android-github-repository h3 {
  margin: 0;
  overflow: hidden;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.android-github-repository > p {
  flex: 1;
  display: -webkit-box;
  margin: 9px 0 0;
  color: #777d78;
  font-size: 0.7rem;
  line-height: 1.5;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.android-github-repository__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 11px;
  margin-top: 12px;
  color: #7c827d;
  font-size: 0.62rem;
}

.android-github-repository__meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.android-github-state {
  display: grid;
  gap: 5px;
  margin-top: 14px;
  padding: 30px 14px;
  border: 1px dashed #d4d6d1;
  border-radius: 14px;
  color: #7b817c;
  font-size: 0.76rem;
  text-align: center;
}

.android-github-state strong {
  color: #3a3f3c;
}

@keyframes github-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .android-github-profile {
    align-items: flex-start;
    padding: 14px;
  }

  .android-github-profile > a {
    padding: 9px;
    font-size: 0;
  }

  .android-github-profile > a svg {
    width: 17px;
    height: 17px;
  }

  .android-github-repositories {
    padding: 14px;
  }

  .android-github-list {
    grid-template-columns: 1fr;
  }
}
</style>
