<template>
  <aside class="android-sidebar" :class="{ 'is-expanded': expanded }">
    <div class="android-sidebar__brand-row">
      <div class="android-sidebar__brand">
        <button
          type="button"
          class="android-sidebar__brand-mark"
          :aria-label="expanded ? '收起导航栏' : '展开导航栏'"
          :title="expanded ? '收起导航栏' : '展开导航栏'"
          @click="emit('toggle')"
        >
          LA
        </button>

        <RouterLink class="android-sidebar__brand-copy" to="/" title="返回首页" @click="emit('navigate')">
          <strong>Liu An</strong>
          <small>Personal Space</small>
        </RouterLink>
      </div>
    </div>

    <nav class="android-sidebar__nav" aria-label="安卓应用导航">
      <section v-for="group in navigationGroups" :key="group.label" class="android-sidebar__group">
        <p class="android-sidebar__group-label">{{ group.label }}</p>

        <component
          :is="item.href ? 'a' : RouterLink"
          v-for="item in group.items"
          :key="item.key"
          v-bind="item.href ? { href: item.href, target: item.target, rel: item.target ? 'noreferrer' : undefined } : { to: item.to }"
          class="android-sidebar__item"
          :class="{ 'is-active': !item.href && route.meta.androidNavKey === item.key }"
          :title="item.label"
          @click="emit('navigate')"
        >
          <component :is="item.icon" :size="20" stroke-width="1.9" />
          <span class="android-sidebar__item-label">{{ item.label }}</span>
          <span v-if="item.private" class="android-sidebar__private-dot" aria-label="私有模块" />
          <ArrowUpRight v-if="item.href" class="android-sidebar__external" :size="14" />
        </component>
      </section>
    </nav>

  </aside>
</template>

<script setup>
import { RouterLink, useRoute } from 'vue-router'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  FileText,
  Fish,
  Github,
  House,
  Images,
  NotebookPen,
  Settings,
  Sparkles
} from 'lucide-vue-next'

defineProps({
  expanded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle', 'navigate'])
const route = useRoute()

const navigationGroups = [
  {
    label: '概览',
    items: [{ key: 'home', label: '首页', to: '/', icon: House }]
  },
  {
    label: '内容',
    items: [
      { key: 'articles', label: '文章', to: '/articles', icon: FileText },
      { key: 'ai-shares', label: 'AI 分享', to: '/ai-shares', icon: Sparkles },
      { key: 'photo-wall', label: '照片墙', to: '/photo-wall', icon: Images }
    ]
  },
  {
    label: '工作区',
    items: [{ key: 'xianyu', label: '闲鱼', to: '/xianyu', icon: Fish }]
  },
  {
    label: '私人工具',
    items: [
      { key: 'internship', label: '实习管理', to: '/internship', icon: BriefcaseBusiness, private: true },
      { key: 'notes', label: '笔记', to: '/notes', icon: NotebookPen, private: true }
    ]
  },
  {
    label: '外部管理',
    items: [{ key: 'github', label: 'GitHub', to: '/github', icon: Github }]
  },
  {
    label: '设置',
    items: [{ key: 'settings', label: '设置', to: '/settings', icon: Settings }]
  }
]
</script>
