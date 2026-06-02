<template>
  <main v-if="privateAppAvailable" class="thoughts-page">
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
              <dt>评论</dt>
              <dd>{{ totalComments }}</dd>
            </div>
          </dl>
        </div>
        <section class="thoughts-profile__archive">
          <h2>动态归档</h2>
          <ol>
            <li v-for="archive in archives" :key="archive.label">
              <span>{{ archive.label }}</span>
              <strong>{{ archive.count }}</strong>
            </li>
          </ol>
        </section>
        <button type="button" class="thoughts-back" @click="handleBackToTools">返回</button>
      </aside>

      <section class="thoughts-stream" aria-label="碎碎念动态">
        <ThoughtComposer :publishing="isPublishing" @publish="publishPost" @notice="notify" />

        <div class="thoughts-feed">
          <ThoughtFeedItem
            v-for="post in posts"
            :key="post.id"
            :post="post"
            :time-label="formatRelativeTime(post.createdAt)"
            @add-comment="addPostComment(post.id, $event)"
            @remove-comment="removePostComment(post.id, $event)"
            @remove="removePost(post.id)"
            @preview-image="previewImage = $event"
          />

          <section v-if="isLoadingPosts || !posts.length" class="thoughts-empty">
            <strong>{{ emptyState.title }}</strong>
            <p>{{ emptyState.description }}</p>
          </section>
        </div>

        <button type="button" class="thoughts-mobile-back" @click="handleBackToTools">返回</button>
      </section>
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
import { usePrivateAppAccess } from '../../hooks/usePrivateAppAccess'
import http from '../../utils/http'
import ThoughtComposer from './components/ThoughtComposer/ThoughtComposer.vue'
import ThoughtFeedItem from './components/ThoughtFeedItem/ThoughtFeedItem.vue'

const router = useRouter()
const { privateAppAvailable, privateAppChecking } = usePrivateAppAccess()
const THOUGHTS_BACKGROUND_CLASS = 'is-thoughts-page'
const LEGACY_THOUGHTS_POSTS_KEY = 'vibe-coding-thoughts-posts'
const previewImage = ref('')
const posts = ref([])
const isLoadingPosts = ref(false)
const isPublishing = ref(false)

const totalComments = computed(() => posts.value.reduce((sum, post) => sum + post.comments.length, 0))
const emptyState = computed(() => {
  if (isLoadingPosts.value) {
    return {
      title: '正在读取动态',
      description: '正在从数据库同步碎碎念。'
    }
  }

  return {
    title: '暂时没有碎碎念',
    description: '在上方写下第一条动态。'
  }
})
const archives = computed(() => {
  const archiveMap = new Map()

  posts.value.forEach((post) => {
    const date = new Date(post.createdAt)
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`
    archiveMap.set(label, (archiveMap.get(label) || 0) + 1)
  })

  return [...archiveMap.entries()].map(([label, count]) => ({ label, count }))
})

watch(privateAppAvailable, (available) => {
  if (available) {
    loadPosts()
  }
}, { immediate: true })

onMounted(() => {
  removeLegacyStoredPosts()
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
    comments: normalizeComments(post.comments),
    createdAt: typeof post.createdAt === 'string' ? post.createdAt : new Date().toISOString()
  }
}

async function loadPosts() {
  if (isLoadingPosts.value) {
    return
  }

  isLoadingPosts.value = true

  try {
    const data = await http.get('/api/thoughts/posts')
    posts.value = Array.isArray(data.posts)
      ? data.posts.reduce((validPosts, post) => {
          const normalizedPost = normalizePost(post)

          if (normalizedPost) {
            validPosts.push(normalizedPost)
          }

          return validPosts
        }, [])
      : []
  } catch (error) {
    notify(getErrorMessage(error, '动态读取失败'), 'danger')
  } finally {
    isLoadingPosts.value = false
  }
}

function createPostUpdateBody(post, overrides = {}) {
  return {
    content: post.content,
    comments: post.comments,
    ...overrides
  }
}

function replacePost(nextPost) {
  const normalizedPost = normalizePost(nextPost)

  if (!normalizedPost) {
    return
  }

  posts.value = posts.value.map((post) => (
    post.id === normalizedPost.id ? normalizedPost : post
  ))
}

async function publishPost(payload) {
  if (isPublishing.value) {
    return
  }

  isPublishing.value = true

  try {
    const data = await http.post('/api/thoughts/posts', {
      content: payload.content,
      images: payload.images
    })
    const post = normalizePost(data.post)

    if (post) {
      posts.value = [post, ...posts.value]
    }

    payload.reset?.()
    notify('发布成功')
  } catch (error) {
    notify(getErrorMessage(error, '发布失败'), 'danger')
  } finally {
    isPublishing.value = false
  }
}

async function addPostComment(postId, content) {
  const post = posts.value.find((item) => item.id === postId)

  if (!post) {
    return
  }

  try {
    const data = await http.put(`/api/thoughts/posts/${encodeURIComponent(postId)}`, createPostUpdateBody(post, {
      comments: [
        ...post.comments,
        {
          id: createId(),
          author: 'Liu An',
          content,
          createdAt: new Date().toISOString()
        }
      ]
    }))
    replacePost(data.post)
  } catch (error) {
    notify(getErrorMessage(error, '评论保存失败'), 'danger')
  }
}

async function removePostComment(postId, commentId) {
  const post = posts.value.find((item) => item.id === postId)

  if (!post) {
    return
  }

  try {
    const data = await http.put(`/api/thoughts/posts/${encodeURIComponent(postId)}`, createPostUpdateBody(post, {
      comments: post.comments.filter((comment) => comment.id !== commentId)
    }))
    replacePost(data.post)
  } catch (error) {
    notify(getErrorMessage(error, '评论删除失败'), 'danger')
  }
}

async function removePost(postId) {
  try {
    await http.delete(`/api/thoughts/posts/${encodeURIComponent(postId)}`)
    posts.value = posts.value.filter((post) => post.id !== postId)
    notify('动态已删除')
  } catch (error) {
    notify(getErrorMessage(error, '动态删除失败'), 'danger')
  }
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
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

function removeLegacyStoredPosts() {
  try {
    localStorage.removeItem(LEGACY_THOUGHTS_POSTS_KEY)
  } catch {
    // The page can still use the API when browser storage is unavailable.
  }
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

.thoughts-profile h2,
.thoughts-profile p,
.thoughts-profile dl {
  margin: 0;
}

.thoughts-back,
.thoughts-mobile-back {
  border: 1px solid #dfe3e8;
  border-radius: 5px;
  background: #ffffff;
  color: #526073;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  padding: 9px 15px;
}

.thoughts-back:hover,
.thoughts-mobile-back:hover {
  background: #f5f6f8;
}

.thoughts-back {
  width: calc(100% - 30px);
  margin: 0 15px 15px;
}

.thoughts-mobile-back {
  display: none;
}

.thoughts-layout {
  display: grid;
  width: min(1180px, calc(100% - 36px));
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  margin: 0 auto;
  padding: 22px 0 48px;
}

.thoughts-profile {
  position: sticky;
  top: 22px;
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
  grid-template-columns: repeat(2, 1fr);
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

.thoughts-profile__archive {
  margin: 0 15px 15px;
  border-top: 1px solid #edf0f2;
  padding-top: 14px;
}

.thoughts-profile__archive h2 {
  margin: 0;
  color: #3d4a5f;
  font-size: 0.88rem;
}

.thoughts-profile__archive ol {
  display: grid;
  gap: 10px;
  margin: 13px 0 0;
  padding: 0;
  list-style: none;
}

.thoughts-profile__archive li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #7c8490;
  font-size: 0.76rem;
}

.thoughts-profile__archive strong {
  color: #4f5f75;
}

.thoughts-stream {
  min-width: 0;
}

.thoughts-feed {
  display: grid;
  gap: 12px;
  margin-top: 18px;
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
    grid-template-columns: minmax(0, 1fr);
  }

  .thoughts-profile {
    display: none;
  }
}

@media (max-width: 720px) {
  .thoughts-layout {
    width: min(100% - 20px, 680px);
    grid-template-columns: 1fr;
    padding-top: 12px;
  }

  .thoughts-mobile-back {
    display: block;
    width: 100%;
    margin-top: 12px;
  }

}
</style>
