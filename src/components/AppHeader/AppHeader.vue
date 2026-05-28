<template>
  <header class="app-header">
    <div>
      <p v-if="tag" class="page-tag">{{ tag }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="header-note">{{ description }}</p>
    </div>

    <div class="header-actions">
      <span v-if="showUser" class="welcome-text">当前用户：{{ username }}</span>
      <slot name="actions" />
      <button type="button" class="ghost-btn" @click="$emit('logout')">{{ logoutLabel }}</button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  tag: {
    type: String,
    default: '工具页'
  },
  title: {
    type: String,
    default: '动漫名称列表'
  },
  description: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: '访客'
  },
  showUser: {
    type: Boolean,
    default: true
  },
  logoutLabel: {
    type: String,
    default: '退出登录'
  }
})

defineEmits(['logout'])
</script>
