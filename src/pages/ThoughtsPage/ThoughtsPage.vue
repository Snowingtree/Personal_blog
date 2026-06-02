<template>
  <main v-if="privateAppAvailable" class="thoughts-page">
    <header class="thoughts-topbar">
      <div class="thoughts-topbar__brand">
        <span aria-hidden="true">10♠</span>
        <div>
          <h1>碎碎念</h1>
          <p>记录日常、灵感和没有必要展开的小事</p>
        </div>
      </div>
      <button type="button" class="thoughts-back" @click="handleBackToTools">返回</button>
    </header>

    <div class="thoughts-layout">
      <aside class="thoughts-profile">
        <div class="thoughts-profile__cover"></div>
        <div class="thoughts-profile__body">
          <span class="thoughts-profile__avatar" aria-hidden="true">LA</span>
          <h2>Liu An</h2>
          <p>偶尔记录，随时翻看。</p>
          <dl>
            <div>
              <dt>动态</dt>
              <dd>{{ posts.length }}</dd>
            </div>
            <div>
              <dt>获赞</dt>
              <dd>{{ totalLikes }}</dd>
            </div>
            <div>
              <dt>评论</dt>
              <dd>{{ totalComments }}</dd>
            </div>
          </dl>
        </div>
      </aside>

      <section class="thoughts-stream" aria-label="碎碎念动态">
        <ThoughtComposer @publish="publishPost" @notice="notify" />

        <nav class="thoughts-tabs" aria-label="动态筛选">
          <button type="button" :class="{ 'is-active': activeFilter === 'all' }" @click="activeFilter = 'all'">
            全部动态
          </button>
          <button type="button" :class="{ 'is-active': activeFilter === 'liked' }" @click="activeFilter = 'liked'">
            我的点赞
          </button>
        </nav>

        <div class="thoughts-feed">
          <ThoughtFeedItem
            v-for="post in filteredPosts"
            :key="post.id"
            :post="post"
            :time-label="formatRelativeTime(post.createdAt)"
            @toggle-like="togglePostLike(post.id)"
            @add-comment="addPostComment(post.id, $event)"
            @remove-comment="removePostComment(post.id, $event)"
            @remove="removePost(post.id)"
            @preview-image="previewImage = $event"
          />

          <section v-if="!filteredPosts.length" class="thoughts-empty">
            <strong>{{ activeFilter === 'liked' ? '还没有点赞的动态' : '暂时没有碎碎念' }}</strong>
            <p>{{ activeFilter === 'liked' ? '点赞后的动态会集中显示在这里。' : '在上方写下第一条动态。' }}</p>
          </section>
        </div>
      </section>

      <aside class="thoughts-archive">
        <section>
          <h2>动态归档</h2>
          <ol>
            <li v-for="archive in archives" :key="archive.label">
              <span>{{ archive.label }}</span>
              <strong>{{ archive.count }}</strong>
            </li>
          </ol>
        </section>
        <section>
          <h2>记录方式</h2>
          <p>短句、图片和随手评论都会保存在当前浏览器中。</p>
        </section>
      </aside>
    </div>

    <Transition name="thought-preview">
      <div v-if="previewImage" class="thoughts-preview" role="presentation" @click.self="previewImage = ''">
        <button type="button" aria-label="关闭图片预览" @click="previewImage = ''">×</button>
        <img :src="previewImage" alt="动态图片预览" />
      </div>
    </Transition>
  </main>

  <main v-else class="auth-layout">
    <PrivateAccessLoadingOverlay :state="privateAppChecking ? 'checking' : 'denied'" />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMessage } from 'snowingress-my-components'
import { useRouter } from 'vue-router'
import PrivateAccessLoadingOverlay from '../../components/PrivateAccessLoadingOverlay/PrivateAccessLoadingOverlay.vue'
import { THOUGHTS_POSTS_KEY } from '../../constants/storage'
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import ThoughtComposer from './components/ThoughtComposer/ThoughtComposer.vue'
import ThoughtFeedItem from './components/ThoughtFeedItem/ThoughtFeedItem.vue'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const THOUGHTS_BACKGROUND_CLASS = 'is-thoughts-page'
const activeFilter = ref('all')
const previewImage = ref('')
const posts = ref(readStoredPosts())

const filteredPosts = computed(() => (
  activeFilter.value === 'liked'
    ? posts.value.filter((post) => post.liked)
    : posts.value
))

const totalLikes = computed(() => posts.value.reduce((sum, post) => sum + post.likeCount, 0))
const totalComments = computed(() => posts.value.reduce((sum, post) => sum + post.comments.length, 0))
const archives = computed(() => {
  const archiveMap = new Map()

  posts.value.forEach((post) => {
    const date = new Date(post.createdAt)
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`
    archiveMap.set(label, (archiveMap.get(label) || 0) + 1)
  })

  return [...archiveMap.entries()].map(([label, count]) => ({ label, count }))
})

watch(posts, persistPosts, { deep: true })

onMounted(() => {
  syncThoughtsBackground(true)
})

onBeforeUnmount(() => {
  syncThoughtsBackground(false)
})

function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createInitialPosts() {
  return [
    {
      id: createId(),
      author: 'Liu An',
      authorInitials: 'LA',
      content: '碎碎念页面开始搭建。这里适合放一些不需要写成长文章，但以后可能会想再翻看的记录。',
      images: [],
      liked: false,
      likeCount: 0,
      comments: [],
      createdAt: new Date().toISOString()
    }
  ]
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return []
  }

  return images.slice(0, 4).reduce((validImages, image) => {
    if (image && typeof image.id === 'string' && typeof image.src === 'string') {
      validImages.push({
        id: image.id,
        name: typeof image.name === 'string' ? image.name : '',
        size: Number.isFinite(image.size) ? image.size : 0,
        src: image.src
      })
    }

    return validImages
  }, [])
}

function normalizeComments(comments) {
  if (!Array.isArray(comments)) {
    return []
  }

  return comments.reduce((validComments, comment) => {
    if (comment && typeof comment.id === 'string' && typeof comment.content === 'string') {
      validComments.push({
        id: comment.id,
        author: typeof comment.author === 'string' ? comment.author : 'Liu An',
        content: comment.content,
        createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : new Date().toISOString()
      })
    }

    return validComments
  }, [])
}

function normalizePost(post) {
  if (!post || typeof post.id !== 'string' || typeof post.content !== 'string') {
    return null
  }

  return {
    id: post.id,
    author: typeof post.author === 'string' ? post.author : 'Liu An',
    authorInitials: typeof post.authorInitials === 'string' ? post.authorInitials : 'LA',
    content: post.content,
    images: normalizeImages(post.images),
    liked: Boolean(post.liked),
    likeCount: Number.isFinite(post.likeCount) ? Math.max(0, post.likeCount) : 0,
    comments: normalizeComments(post.comments),
    createdAt: typeof post.createdAt === 'string' ? post.createdAt : new Date().toISOString()
  }
}

function readStoredPosts() {
  const storedValue = localStorage.getItem(THOUGHTS_POSTS_KEY)

  if (!storedValue) {
    return createInitialPosts()
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (Array.isArray(parsedValue)) {
      return parsedValue.reduce((validPosts, post) => {
        const normalizedPost = normalizePost(post)

        if (normalizedPost) {
          validPosts.push(normalizedPost)
        }

        return validPosts
      }, [])
    }
  } catch {
    localStorage.removeItem(THOUGHTS_POSTS_KEY)
  }

  return createInitialPosts()
}

function persistPosts(nextPosts) {
  try {
    localStorage.setItem(THOUGHTS_POSTS_KEY, JSON.stringify(nextPosts))
  } catch {
    notify('浏览器存储空间不足，请减少单条动态中的图片大小', 'danger')
  }
}

function publishPost(payload) {
  posts.value = [
    {
      id: createId(),
      author: 'Liu An',
      authorInitials: 'LA',
      content: payload.content,
      images: payload.images,
      liked: false,
      likeCount: 0,
      comments: [],
      createdAt: new Date().toISOString()
    },
    ...posts.value
  ]
  activeFilter.value = 'all'
  notify('发布成功')
}

function togglePostLike(postId) {
  posts.value = posts.value.map((post) => (
    post.id === postId
      ? {
          ...post,
          liked: !post.liked,
          likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1))
        }
      : post
  ))
}

function addPostComment(postId, content) {
  posts.value = posts.value.map((post) => (
    post.id === postId
      ? {
          ...post,
          comments: [
            ...post.comments,
            {
              id: createId(),
              author: 'Liu An',
              content,
              createdAt: new Date().toISOString()
            }
          ]
        }
      : post
  ))
}

function removePostComment(postId, commentId) {
  posts.value = posts.value.map((post) => (
    post.id === postId
      ? { ...post, comments: post.comments.filter((comment) => comment.id !== commentId) }
      : post
  ))
}

function removePost(postId) {
  posts.value = posts.value.filter((post) => post.id !== postId)
  notify('动态已删除')
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime()
  const delta = Date.now() - timestamp

  if (!Number.isFinite(timestamp) || delta < 60 * 1000) {
    return '刚刚'
  }

  if (delta < 60 * 60 * 1000) {
    return `${Math.floor(delta / (60 * 1000))} 分钟前`
  }

  if (delta < 24 * 60 * 60 * 1000) {
    return `${Math.floor(delta / (60 * 60 * 1000))} 小时前`
  }

  const date = new Date(timestamp)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function notify(message, type = 'success') {
  createMessage({
    message,
    type,
    duration: 1200,
    offset: 24
  })
}

function syncThoughtsBackground(enabled) {
  document.documentElement.classList.toggle(THOUGHTS_BACKGROUND_CLASS, enabled)
  document.body.classList.toggle(THOUGHTS_BACKGROUND_CLASS, enabled)
}

function handleBackToTools() {
  router.push('/tools')
}
</script>

<style scoped>
.thoughts-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f4f5f7;
  color: #273142;
}

.thoughts-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 72px;
  border-bottom: 1px solid #e2e5e9;
  background: rgba(255, 255, 255, 0.96);
  padding: 11px max(18px, calc((100vw - 1180px) / 2));
}

.thoughts-topbar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thoughts-topbar__brand > span {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: #253246;
  color: #ffffff;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.82rem;
  font-weight: 800;
}

.thoughts-topbar h1,
.thoughts-topbar p,
.thoughts-profile h2,
.thoughts-profile p,
.thoughts-profile dl,
.thoughts-archive h2,
.thoughts-archive p {
  margin: 0;
}

.thoughts-topbar h1 {
  color: #253246;
  font-size: 1.04rem;
}

.thoughts-topbar p {
  margin-top: 2px;
  color: #9299a4;
  font-size: 0.76rem;
}

.thoughts-back {
  border: 1px solid #dfe3e8;
  border-radius: 5px;
  background: #ffffff;
  color: #526073;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 9px 15px;
}

.thoughts-back:hover {
  background: #f5f6f8;
}

.thoughts-layout {
  display: grid;
  width: min(1180px, calc(100% - 36px));
  grid-template-columns: 220px minmax(0, 1fr) 220px;
  gap: 18px;
  align-items: start;
  margin: 0 auto;
  padding: 22px 0 48px;
}

.thoughts-profile,
.thoughts-archive {
  position: sticky;
  top: 94px;
}

.thoughts-profile {
  overflow: hidden;
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
}

.thoughts-profile__cover {
  height: 78px;
  background:
    linear-gradient(135deg, rgba(37, 50, 70, 0.98), rgba(80, 95, 117, 0.92));
}

.thoughts-profile__body {
  padding: 0 15px 16px;
}

.thoughts-profile__avatar {
  display: grid;
  width: 62px;
  height: 62px;
  margin-top: -31px;
  place-items: center;
  border: 4px solid #ffffff;
  border-radius: 50%;
  background: #dfe4ea;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 800;
}

.thoughts-profile h2 {
  margin-top: 9px;
  color: #253246;
  font-size: 1rem;
}

.thoughts-profile p {
  margin-top: 6px;
  color: #8c949f;
  font-size: 0.78rem;
  line-height: 1.6;
}

.thoughts-profile dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 16px;
  border-top: 1px solid #edf0f2;
  padding-top: 12px;
  text-align: center;
}

.thoughts-profile dt {
  color: #a1a7b0;
  font-size: 0.7rem;
}

.thoughts-profile dd {
  margin: 3px 0 0;
  color: #445168;
  font-size: 0.88rem;
  font-weight: 800;
}

.thoughts-stream {
  min-width: 0;
}

.thoughts-tabs {
  display: flex;
  gap: 20px;
  margin-top: 18px;
  border-bottom: 1px solid #dfe3e8;
}

.thoughts-tabs button {
  position: relative;
  border: 0;
  background: transparent;
  color: #8b929d;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0 2px 11px;
}

.thoughts-tabs button.is-active {
  color: #34435a;
}

.thoughts-tabs button.is-active::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: #34435a;
}

.thoughts-feed {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.thoughts-empty {
  border: 1px dashed #d7dce3;
  background: rgba(255, 255, 255, 0.64);
  padding: 54px 20px;
  text-align: center;
}

.thoughts-empty strong {
  color: #596579;
  font-size: 0.94rem;
}

.thoughts-empty p {
  margin: 7px 0 0;
  color: #a0a6af;
  font-size: 0.8rem;
}

.thoughts-archive {
  display: grid;
  gap: 12px;
}

.thoughts-archive section {
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
  padding: 15px;
}

.thoughts-archive h2 {
  color: #3d4a5f;
  font-size: 0.88rem;
}

.thoughts-archive ol {
  display: grid;
  gap: 10px;
  margin: 13px 0 0;
  padding: 0;
  list-style: none;
}

.thoughts-archive li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #7c8490;
  font-size: 0.76rem;
}

.thoughts-archive strong {
  color: #4f5f75;
}

.thoughts-archive p {
  margin-top: 9px;
  color: #9199a4;
  font-size: 0.76rem;
  line-height: 1.7;
}

.thoughts-preview {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.82);
  padding: 24px;
}

.thoughts-preview img {
  max-width: min(100%, 1100px);
  max-height: calc(100vh - 48px);
  object-fit: contain;
}

.thoughts-preview button {
  position: fixed;
  top: 20px;
  right: 24px;
  border: 0;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-size: 2rem;
}

.thought-preview-enter-active,
.thought-preview-leave-active {
  transition: opacity 180ms ease;
}

.thought-preview-enter-from,
.thought-preview-leave-to {
  opacity: 0;
}

@media (max-width: 980px) {
  .thoughts-layout {
    grid-template-columns: minmax(0, 1fr) 210px;
  }

  .thoughts-profile {
    display: none;
  }
}

@media (max-width: 720px) {
  .thoughts-topbar {
    min-height: 64px;
    padding: 10px 14px;
  }

  .thoughts-topbar p {
    display: none;
  }

  .thoughts-topbar__brand > span {
    width: 40px;
    height: 40px;
  }

  .thoughts-layout {
    width: min(100% - 20px, 680px);
    grid-template-columns: 1fr;
    padding-top: 12px;
  }

  .thoughts-archive {
    position: static;
    grid-row: 2;
  }

  .thoughts-archive section:last-child {
    display: none;
  }
}
</style>
