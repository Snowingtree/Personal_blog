<template>
  <article class="thought-feed-item">
    <header class="thought-feed-item__head">
      <span class="thought-feed-item__avatar" aria-hidden="true">{{ post.authorInitials }}</span>
      <div>
        <strong>{{ post.author }}</strong>
        <time :datetime="post.createdAt">{{ timeLabel }}</time>
      </div>
      <button type="button" class="thought-feed-item__remove" aria-label="删除动态" title="删除动态" @click="$emit('remove')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
        </svg>
      </button>
    </header>

    <p v-if="post.content" class="thought-feed-item__content">{{ post.content }}</p>

    <div v-if="post.images.length" class="thought-feed-item__images" :class="`is-${Math.min(post.images.length, 4)}`">
      <button
        v-for="(image, index) in post.images"
        :key="image.id"
        type="button"
        :aria-label="`查看图片 ${index + 1}`"
        @click="$emit('preview-image', image.src)"
      >
        <img :src="image.src" :alt="`动态图片 ${index + 1}`" />
      </button>
    </div>

    <footer class="thought-feed-item__actions">
      <button type="button" :class="{ 'is-active': post.liked }" @click="$emit('toggle-like')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 10v10H4V10h3Zm4-1 3-5c1.2.2 2 1.2 2 2.4V9h4l-1 11H9V9h2Z" />
        </svg>
        <span>{{ post.likeCount ? `${post.likeCount} 赞` : '赞' }}</span>
      </button>
      <button type="button" @click="focusCommentInput">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14v10H9l-4 4V5Z" />
        </svg>
        <span>{{ post.comments.length ? `${post.comments.length} 评论` : '评论' }}</span>
      </button>
    </footer>

    <section v-if="post.comments.length || commentDraft" class="thought-feed-item__comments" aria-label="评论">
      <article v-for="comment in post.comments" :key="comment.id">
        <p><strong>{{ comment.author }}</strong>：{{ comment.content }}</p>
        <button type="button" aria-label="删除评论" @click="$emit('remove-comment', comment.id)">删除</button>
      </article>
    </section>

    <form class="thought-feed-item__comment-form" @submit.prevent="submitComment">
      <input ref="commentInput" v-model.trim="commentDraft" maxlength="120" type="text" placeholder="写评论..." />
      <button type="submit" :disabled="!commentDraft">发送</button>
    </form>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  timeLabel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['toggle-like', 'add-comment', 'remove-comment', 'remove', 'preview-image'])
const commentDraft = ref('')
const commentInput = ref(null)

function focusCommentInput() {
  commentInput.value?.focus()
}

function submitComment() {
  if (!commentDraft.value) {
    return
  }

  emit('add-comment', commentDraft.value)
  commentDraft.value = ''
}
</script>

<style scoped>
.thought-feed-item {
  border: 1px solid #e2e5e9;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.045);
  padding: 18px;
}

.thought-feed-item__head,
.thought-feed-item__actions,
.thought-feed-item__actions button,
.thought-feed-item__comment-form {
  display: flex;
  align-items: center;
}

.thought-feed-item__head {
  gap: 11px;
}

.thought-feed-item__avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #e8ebef;
  color: #334155;
  font-size: 0.7rem;
  font-weight: 800;
}

.thought-feed-item__head strong,
.thought-feed-item__head time {
  display: block;
}

.thought-feed-item__head strong {
  color: #253246;
  font-size: 0.9rem;
}

.thought-feed-item__head time {
  margin-top: 4px;
  color: #9299a4;
  font-size: 0.74rem;
}

.thought-feed-item__remove {
  display: grid;
  width: 30px;
  height: 30px;
  margin-left: auto;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #a5abb4;
  cursor: pointer;
}

.thought-feed-item__remove:hover {
  background: #f5f6f8;
  color: #c94a4a;
}

.thought-feed-item__remove svg,
.thought-feed-item__actions svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.thought-feed-item__content {
  margin: 15px 0 0;
  color: #333b48;
  font-size: 0.94rem;
  line-height: 1.8;
  white-space: pre-wrap;
}

.thought-feed-item__images {
  display: grid;
  width: min(520px, 100%);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 14px;
}

.thought-feed-item__images.is-1 {
  grid-template-columns: minmax(0, 320px);
}

.thought-feed-item__images.is-2,
.thought-feed-item__images.is-4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.thought-feed-item__images button {
  aspect-ratio: 1;
  overflow: hidden;
  border: 0;
  background: #eef0f3;
  cursor: pointer;
  padding: 0;
}

.thought-feed-item__images img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 180ms ease;
}

.thought-feed-item__images button:hover img {
  transform: scale(1.04);
}

.thought-feed-item__actions {
  gap: 16px;
  margin-top: 16px;
  border-top: 1px solid #edf0f2;
  padding-top: 11px;
}

.thought-feed-item__actions button {
  gap: 5px;
  border: 0;
  background: transparent;
  color: #8a929e;
  cursor: pointer;
  font-size: 0.78rem;
  padding: 3px 0;
}

.thought-feed-item__actions button.is-active {
  color: #d2574b;
}

.thought-feed-item__actions button.is-active svg {
  fill: rgba(210, 87, 75, 0.14);
}

.thought-feed-item__comments {
  margin-top: 10px;
  background: #f7f8fa;
  padding: 10px 12px;
}

.thought-feed-item__comments article {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: space-between;
}

.thought-feed-item__comments article + article {
  margin-top: 7px;
}

.thought-feed-item__comments p {
  margin: 0;
  color: #596273;
  font-size: 0.8rem;
  line-height: 1.6;
}

.thought-feed-item__comments strong {
  color: #415473;
}

.thought-feed-item__comments button {
  border: 0;
  background: transparent;
  color: #a4aab3;
  cursor: pointer;
  font-size: 0.7rem;
}

.thought-feed-item__comment-form {
  gap: 8px;
  margin-top: 10px;
}

.thought-feed-item__comment-form input {
  width: 100%;
  border: 1px solid #e4e7eb;
  outline: 0;
  background: #fafbfc;
  color: #374151;
  font: inherit;
  font-size: 0.8rem;
  padding: 8px 10px;
}

.thought-feed-item__comment-form input:focus {
  border-color: #aeb8c7;
}

.thought-feed-item__comment-form button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 3px;
  background: #e8edf3;
  color: #42516a;
  cursor: pointer;
  font-size: 0.78rem;
  padding: 8px 10px;
}

.thought-feed-item__comment-form button:disabled {
  cursor: default;
  opacity: 0.5;
}
</style>
