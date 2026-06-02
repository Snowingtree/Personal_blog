<template>
  <main v-if="privateAppAvailable" class="thoughts-page">
    <div class="thoughts-layout">
      <div class="thoughts-sidebar">
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
        </aside>
        <section class="thoughts-back-panel" aria-label="页面导航">
          <button type="button" class="thoughts-back" @click="handleBackToTools">返回</button>
        </section>
      </div>

      <Transition name="thought-view" mode="out-in">
        <section v-if="!isManagingPosts" key="feed" class="thoughts-stream" aria-label="碎碎念动态">
          <div class="thoughts-feed">
            <ThoughtFeedItem
              v-for="post in posts"
              :key="post.id"
              :post="post"
              :time-label="formatRelativeTime(post.createdAt)"
              @add-comment="addPostComment(post.id, $event)"
              @remove-comment="removePostComment(post.id, $event)"
              @remove="openRemovePostDialog(post.id)"
              @preview-image="previewImage = $event"
            />

            <section v-if="isLoadingPosts || !posts.length" class="thoughts-empty">
              <strong>{{ emptyState.title }}</strong>
              <p>{{ emptyState.description }}</p>
            </section>
          </div>

          <button type="button" class="thoughts-mobile-back" @click="handleBackToTools">返回</button>
        </section>

        <section v-else key="manager" class="thoughts-stream thoughts-manager" aria-label="动态管理">
          <header class="thoughts-manager__head">
            <div>
              <p>THOUGHTS MANAGER</p>
              <h1>动态管理</h1>
            </div>
          </header>

          <dl class="thoughts-manager__summary">
            <div>
              <dt>动态</dt>
              <dd>{{ posts.length }}</dd>
            </div>
            <div>
              <dt>图片</dt>
              <dd>{{ totalImages }}</dd>
            </div>
            <div>
              <dt>评论</dt>
              <dd>{{ totalComments }}</dd>
            </div>
          </dl>

          <section class="thoughts-manager__list" aria-label="动态列表">
            <header>
              <strong>全部动态</strong>
              <span>{{ posts.length }} 条记录</span>
            </header>

            <ol v-if="posts.length">
              <li v-for="(post, index) in posts" :key="post.id">
                <span class="thoughts-manager__index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div class="thoughts-manager__content">
                  <time :datetime="post.createdAt">{{ formatManagementTime(post.createdAt) }}</time>
                  <p>{{ getPostExcerpt(post.content) }}</p>
                  <small>{{ post.images.length }} 张图片 · {{ post.comments.length }} 条评论</small>
                </div>
                <button
                  type="button"
                  class="thoughts-manager__remove"
                  aria-label="删除动态"
                  title="删除动态"
                  @click="openRemovePostDialog(post.id)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                  </svg>
                </button>
              </li>
            </ol>

            <div v-else class="thoughts-manager__empty">暂无可管理的动态</div>
          </section>

          <button type="button" class="thoughts-mobile-back" @click="handleBackToTools">返回</button>
        </section>
      </Transition>
    </div>

    <div class="thoughts-action-rail">
      <button
        type="button"
        class="thoughts-create-button"
        aria-label="添加碎碎念"
        title="添加碎碎念"
        @click="openComposerDialog"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        class="thoughts-manage-button"
        :class="{ 'is-active': isManagingPosts }"
        :aria-pressed="isManagingPosts"
        aria-label="管理动态"
        title="管理动态"
        @click="toggleManagementView"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h8M17 7h2M5 12h2m4 0h8M5 17h8m4 0h2" />
          <circle cx="15" cy="7" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="15" cy="17" r="2" />
        </svg>
      </button>
    </div>

    <Transition name="thought-preview">
      <div v-if="previewImage" class="thoughts-preview" role="presentation" @click.self="previewImage = ''">
        <button type="button" aria-label="关闭图片预览" @click="previewImage = ''">×</button>
        <img :src="previewImage" alt="动态图片预览" />
      </div>
    </Transition>

    <Transition name="thought-dialog">
      <div v-if="isComposerOpen" class="thoughts-dialog-mask" @click.self="closeComposerDialog">
        <section
          class="thoughts-composer-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="thoughts-composer-title"
        >
          <header>
            <h2 id="thoughts-composer-title">添加碎碎念</h2>
            <button
              type="button"
              aria-label="关闭发布弹窗"
              title="关闭"
              :disabled="isPublishing"
              @click="closeComposerDialog"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>
          <ThoughtComposer :publishing="isPublishing" @publish="publishPost" @notice="notify" />
        </section>
      </div>
    </Transition>

    <Transition name="thought-dialog">
      <div v-if="removingPostId" class="thoughts-dialog-mask" @click.self="closeRemovePostDialog">
        <section class="thoughts-dialog" role="dialog" aria-modal="true" aria-labelledby="thoughts-remove-title">
          <h2 id="thoughts-remove-title">删除动态</h2>
          <p>确认删除这条碎碎念吗？删除后无法恢复。</p>
          <footer>
            <button type="button" class="thoughts-dialog__cancel" :disabled="isRemovingPost" @click="closeRemovePostDialog">
              取消
            </button>
            <button type="button" class="thoughts-dialog__confirm" :disabled="isRemovingPost" @click="confirmRemovePost">
              {{ isRemovingPost ? '删除中' : '删除' }}
            </button>
          </footer>
        </section>
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
const isComposerOpen = ref(false)
const isManagingPosts = ref(false)
const removingPostId = ref('')
const posts = ref([])
const isLoadingPosts = ref(false)
const isPublishing = ref(false)
const isRemovingPost = ref(false)

const totalComments = computed(() => posts.value.reduce((sum, post) => sum + post.comments.length, 0))
const totalImages = computed(() => posts.value.reduce((sum, post) => sum + post.images.length, 0))
const emptyState = computed(() => {
  if (isLoadingPosts.value) {
    return {
      title: '正在读取动态',
      description: '正在从数据库同步碎碎念。'
    }
  }

  return {
    title: '暂时没有碎碎念',
    description: '点击右侧加号写下第一条动态。'
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
    isComposerOpen.value = false
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

function openRemovePostDialog(postId) {
  removingPostId.value = postId
}

function openComposerDialog() {
  isComposerOpen.value = true
}

function toggleManagementView() {
  isManagingPosts.value = !isManagingPosts.value
}

function closeComposerDialog() {
  if (!isPublishing.value) {
    isComposerOpen.value = false
  }
}

function closeRemovePostDialog() {
  if (!isRemovingPost.value) {
    removingPostId.value = ''
  }
}

async function confirmRemovePost() {
  const postId = removingPostId.value

  if (!postId || isRemovingPost.value) {
    return
  }

  isRemovingPost.value = true

  try {
    await http.delete(`/api/thoughts/posts/${encodeURIComponent(postId)}`)
    posts.value = posts.value.filter((post) => post.id !== postId)
    removingPostId.value = ''
    notify('动态已删除')
  } catch (error) {
    notify(getErrorMessage(error, '动态删除失败'), 'danger')
  } finally {
    isRemovingPost.value = false
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

function formatManagementTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '时间未知'
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getPostExcerpt(content) {
  const normalizedContent = typeof content === 'string'
    ? content.replace(/\s+/g, ' ').trim()
    : ''

  return normalizedContent || '仅包含图片'
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
  width: 100%;
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

.thoughts-sidebar {
  position: sticky;
  top: 22px;
  grid-column: 1;
  display: grid;
  gap: 18px;
  align-self: start;
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

.thoughts-back-panel {
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.thoughts-stream {
  grid-column: 2;
  min-width: 0;
}

.thoughts-feed {
  display: grid;
  gap: 12px;
  margin-top: 0;
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

.thoughts-manager {
  display: grid;
  gap: 14px;
}

.thoughts-manager__head,
.thoughts-manager__list > header,
.thoughts-manager__list li {
  display: flex;
  align-items: center;
}

.thoughts-manager__head {
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px 20px;
}

.thoughts-manager__head p,
.thoughts-manager__head h1 {
  margin: 0;
}

.thoughts-manager__head p {
  color: #9aa2ad;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.thoughts-manager__head h1 {
  margin-top: 4px;
  color: #253246;
  font-size: 1.22rem;
}

.thoughts-manager__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 0;
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #e7eaee;
}

.thoughts-manager__summary div {
  background: #ffffff;
  padding: 15px 18px;
}

.thoughts-manager__summary dt {
  color: #9aa2ad;
  font-size: 0.72rem;
}

.thoughts-manager__summary dd {
  margin: 4px 0 0;
  color: #334155;
  font-size: 1.25rem;
  font-weight: 800;
}

.thoughts-manager__list {
  overflow: hidden;
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
}

.thoughts-manager__list > header {
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #edf0f2;
  padding: 14px 18px;
}

.thoughts-manager__list > header strong {
  color: #3d4a5f;
  font-size: 0.88rem;
}

.thoughts-manager__list > header span,
.thoughts-manager__content small {
  color: #9aa2ad;
  font-size: 0.72rem;
}

.thoughts-manager__list ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.thoughts-manager__list li {
  gap: 14px;
  min-height: 82px;
  padding: 13px 18px;
}

.thoughts-manager__list li + li {
  border-top: 1px solid #edf0f2;
}

.thoughts-manager__index {
  color: #b1b7c0;
  font-size: 0.74rem;
  font-weight: 800;
}

.thoughts-manager__content {
  min-width: 0;
  flex: 1;
}

.thoughts-manager__content time {
  color: #87909e;
  font-size: 0.72rem;
}

.thoughts-manager__content p {
  overflow: hidden;
  margin: 4px 0;
  color: #445168;
  font-size: 0.84rem;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thoughts-manager__remove {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #a5abb4;
  cursor: pointer;
}

.thoughts-manager__remove:hover {
  background: #fdf1f1;
  color: #c94a4a;
}

.thoughts-manager__remove svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.thoughts-manager__empty {
  color: #9aa2ad;
  font-size: 0.82rem;
  padding: 48px 20px;
  text-align: center;
}

.thought-view-enter-active,
.thought-view-leave-active {
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

.thought-view-enter-from,
.thought-view-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.thoughts-action-rail {
  position: fixed;
  top: 22px;
  right: max(18px, calc((100vw - 1180px) / 2 - 72px));
  z-index: 20;
  display: grid;
  gap: 10px;
}

.thoughts-create-button,
.thoughts-manage-button {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.thoughts-create-button {
  border: 0;
  background: #253246;
  box-shadow: 0 14px 28px rgba(37, 50, 70, 0.24);
  color: #ffffff;
}

.thoughts-create-button:hover {
  background: #182235;
  box-shadow: 0 18px 32px rgba(37, 50, 70, 0.3);
  transform: scale(1.06);
}

.thoughts-manage-button {
  border: 1px solid #dce1e7;
  background: #ffffff;
  box-shadow: 0 10px 22px rgba(37, 50, 70, 0.12);
  color: #677386;
}

.thoughts-manage-button:hover,
.thoughts-manage-button.is-active {
  border-color: #253246;
  background: #253246;
  color: #ffffff;
  transform: scale(1.06);
}

.thoughts-create-button svg,
.thoughts-manage-button svg {
  width: 23px;
  height: 23px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
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

.thoughts-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgba(17, 24, 39, 0.34);
  padding: 20px;
}

.thoughts-dialog {
  width: min(100%, 360px);
  border: 1px solid #e1e5ea;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(17, 24, 39, 0.2);
  padding: 22px;
}

.thoughts-composer-dialog {
  width: min(100%, 680px);
  max-height: min(820px, calc(100vh - 40px));
  overflow-y: auto;
  border: 1px solid #e1e5ea;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(17, 24, 39, 0.2);
  padding: 18px;
}

.thoughts-composer-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.thoughts-composer-dialog h2 {
  margin: 0;
  color: #273142;
  font-size: 1.08rem;
}

.thoughts-composer-dialog > header button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e1e5ea;
  border-radius: 5px;
  background: #ffffff;
  color: #718096;
  cursor: pointer;
}

.thoughts-composer-dialog > header button:hover {
  background: #f5f6f8;
}

.thoughts-composer-dialog > header button:disabled {
  cursor: default;
  opacity: 0.58;
}

.thoughts-composer-dialog > header svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.thoughts-composer-dialog :deep(.thought-composer) {
  border: 0;
  box-shadow: none;
  padding: 0;
}

.thoughts-dialog h2,
.thoughts-dialog p {
  margin: 0;
}

.thoughts-dialog h2 {
  color: #273142;
  font-size: 1.08rem;
}

.thoughts-dialog p {
  margin-top: 10px;
  color: #7d8693;
  font-size: 0.84rem;
  line-height: 1.7;
}

.thoughts-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 20px;
}

.thoughts-dialog button {
  min-width: 68px;
  border: 1px solid #e1e5ea;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 8px 13px;
}

.thoughts-dialog button:disabled {
  cursor: default;
  opacity: 0.58;
}

.thoughts-dialog__cancel {
  background: #ffffff;
  color: #687386;
}

.thoughts-dialog__confirm {
  border-color: #bc4747;
  background: #bc4747;
  color: #ffffff;
}

.thought-dialog-enter-active,
.thought-dialog-leave-active {
  transition: opacity 170ms ease;
}

.thought-dialog-enter-active .thoughts-dialog,
.thought-dialog-leave-active .thoughts-dialog,
.thought-dialog-enter-active .thoughts-composer-dialog,
.thought-dialog-leave-active .thoughts-composer-dialog {
  transition:
    opacity 170ms ease,
    transform 170ms ease;
}

.thought-dialog-enter-from,
.thought-dialog-leave-to,
.thought-dialog-enter-from .thoughts-dialog,
.thought-dialog-leave-to .thoughts-dialog,
.thought-dialog-enter-from .thoughts-composer-dialog,
.thought-dialog-leave-to .thoughts-composer-dialog {
  opacity: 0;
}

.thought-dialog-enter-from .thoughts-dialog,
.thought-dialog-leave-to .thoughts-dialog,
.thought-dialog-enter-from .thoughts-composer-dialog,
.thought-dialog-leave-to .thoughts-composer-dialog {
  transform: scale(0.96) translateY(5px);
}

@media (max-width: 980px) {
  .thoughts-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .thoughts-sidebar {
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

  .thoughts-action-rail {
    top: auto;
    right: 18px;
    bottom: 20px;
  }

  .thoughts-create-button,
  .thoughts-manage-button {
    width: 50px;
    height: 50px;
  }

  .thoughts-create-button:hover,
  .thoughts-manage-button:hover,
  .thoughts-manage-button.is-active {
    transform: scale(1.06);
  }

  .thoughts-composer-dialog {
    max-height: calc(100vh - 24px);
    padding: 14px;
  }

}
</style>
