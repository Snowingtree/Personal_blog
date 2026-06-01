<template>
  <Teleport to="body">
    <Transition name="resume-module-dialog">
      <div v-if="open" class="resume-module-dialog">
        <section class="resume-module-dialog__panel resume-profile-dialog__panel" role="dialog" aria-modal="true">
          <header class="resume-module-dialog__head">
            <div>
              <p>编辑开头</p>
              <h2>个人信息</h2>
            </div>
            <button
              type="button"
              class="icon-btn resume-module-dialog__close"
              aria-label="关闭"
              @click="closeDialog"
            >
              ×
            </button>
          </header>

          <div class="resume-module-dialog__body">
            <div class="resume-profile-dialog__grid">
              <label class="editor-field">
                <span>姓名</span>
                <input v-model="profile.name" type="text" />
              </label>
              <label class="editor-field">
                <span>岗位</span>
                <input v-model="profile.role" type="text" />
              </label>
              <label class="editor-field">
                <span>电话</span>
                <input v-model="profile.phone" type="text" />
              </label>
              <label class="editor-field">
                <span>邮箱</span>
                <input v-model="profile.email" type="email" />
              </label>
              <label class="editor-field">
                <span>地点</span>
                <input v-model="profile.location" type="text" />
              </label>
            </div>
          </div>

          <footer class="resume-module-dialog__actions">
            <button type="button" class="editor-btn editor-btn--dark" @click="closeDialog">
              完成
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  profile: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'commit-snapshot'])

function closeDialog() {
  emit('commit-snapshot')
  emit('close')
}
</script>
