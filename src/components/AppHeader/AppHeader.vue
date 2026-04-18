<template>
  <header class="app-header">
    <div>
      <p class="page-tag">{{ tag }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="header-note">{{ description }}</p>
    </div>

    <div class="header-actions">
      <span class="welcome-text">当前用户：{{ username }}</span>
      <slot name="actions" />
      <button type="button" class="ghost-btn" @click="$emit('logout')">退出登录</button>
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
    default: '已按名称首字的拼音顺序进行 A-Z 排序'
  },
  username: {
    type: String,
    default: '访客'
  }
})

defineEmits(['logout'])
</script>
