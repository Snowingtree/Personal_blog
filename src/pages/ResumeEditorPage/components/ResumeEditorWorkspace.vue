<template>
  <section class="resume-workspace" aria-label="简历画布">
    <div class="workspace-ruler workspace-ruler--top">
      <span v-for="mark in rulerMarks" :key="`top-${mark}`">{{ mark }}</span>
    </div>

    <div class="resume-stage">
      <div class="resume-pages">
        <div
          v-for="page in resumePages"
          :key="page.number"
          class="resume-paper-frame"
          :style="paperFrameStyle"
        >
          <span class="resume-page-label">第 {{ page.number }} 页</span>
          <article class="resume-paper" :style="paperStyle">
            <header
              v-if="page.includeProfile"
              class="resume-document-hero"
              :class="{ 'is-selected': activeBlock.type === 'profile' }"
              @click.stop="$emit('select-profile')"
            >
              <div>
                <h1>{{ resume.profile.name }}</h1>
                <p>{{ resume.profile.role }}</p>
              </div>
              <ul class="resume-contact-list">
                <li>{{ resume.profile.phone }}</li>
                <li>{{ resume.profile.email }}</li>
                <li>{{ resume.profile.location }}</li>
              </ul>
            </header>

            <template v-for="section in page.sections" :key="`${page.number}-${section.key}`">
              <section
                v-if="section.key === 'summary'"
                class="resume-module"
                :class="{ 'is-selected': isModuleActive('summary') }"
                @click.stop="$emit('select-module', 'summary')"
              >
                <h2>{{ section.title }}</h2>
                <p class="resume-summary">{{ resume.profile.summary }}</p>
              </section>

              <section
                v-else-if="section.key === 'experience'"
                class="resume-module"
                :class="{ 'is-selected': isModuleActive('experience') }"
                @click.stop="$emit('select-module', 'experience')"
              >
                <h2>{{ section.title }}</h2>
                <article
                  v-for="(item, index) in resume.experience"
                  :key="item.id"
                  class="resume-entry"
                  :class="{ 'is-selected': activeBlock.type === 'experience-item' && activeBlock.index === index }"
                  @click.stop="$emit('select-entry', 'experience-item', index)"
                >
                  <div class="resume-entry__head">
                    <div>
                      <h3>{{ item.company }}</h3>
                      <p>{{ item.role }}</p>
                    </div>
                    <span>{{ item.period }}</span>
                  </div>
                  <ul>
                    <li v-for="bullet in item.bullets" :key="bullet">{{ bullet }}</li>
                  </ul>
                </article>
              </section>

              <section
                v-else-if="section.key === 'projects'"
                class="resume-module"
                :class="{ 'is-selected': isModuleActive('projects') }"
                @click.stop="$emit('select-module', 'projects')"
              >
                <h2>{{ section.title }}</h2>
                <article
                  v-for="(item, index) in resume.projects"
                  :key="item.id"
                  class="resume-entry"
                  :class="{ 'is-selected': activeBlock.type === 'project-item' && activeBlock.index === index }"
                  @click.stop="$emit('select-entry', 'project-item', index)"
                >
                  <div class="resume-entry__head">
                    <div>
                      <h3>{{ item.name }}</h3>
                      <p>{{ item.role }}</p>
                    </div>
                    <span>{{ item.period }}</span>
                  </div>
                  <ul>
                    <li v-for="bullet in item.bullets" :key="bullet">{{ bullet }}</li>
                  </ul>
                </article>
              </section>

              <section
                v-else-if="section.key === 'education'"
                class="resume-module"
                :class="{ 'is-selected': isModuleActive('education') }"
                @click.stop="$emit('select-module', 'education')"
              >
                <h2>{{ section.title }}</h2>
                <article
                  v-for="(item, index) in resume.education"
                  :key="item.id"
                  class="resume-entry resume-entry--compact"
                  :class="{ 'is-selected': activeBlock.type === 'education-item' && activeBlock.index === index }"
                  @click.stop="$emit('select-entry', 'education-item', index)"
                >
                  <div class="resume-entry__head">
                    <div>
                      <h3>{{ item.school }}</h3>
                      <p>{{ item.major }}</p>
                    </div>
                    <span>{{ item.period }}</span>
                  </div>
                </article>
              </section>

              <section
                v-else-if="section.key === 'skills'"
                class="resume-module"
                :class="{ 'is-selected': isModuleActive('skills') }"
                @click.stop="$emit('select-module', 'skills')"
              >
                <h2>{{ section.title }}</h2>
                <ul class="resume-skill-list">
                  <li
                    v-for="(skill, index) in resume.skills"
                    :key="`resume-skill-${index}`"
                    :class="{ 'is-selected': activeBlock.type === 'skill-item' && activeBlock.index === index }"
                    @click.stop="$emit('select-skill', index)"
                  >
                    {{ skill }}
                  </li>
                </ul>
              </section>
            </template>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  activeBlock: {
    type: Object,
    required: true
  },
  paperFrameStyle: {
    type: Object,
    required: true
  },
  paperStyle: {
    type: Object,
    required: true
  },
  resume: {
    type: Object,
    required: true
  },
  resumePages: {
    type: Array,
    required: true
  },
  rulerMarks: {
    type: Array,
    required: true
  }
})

defineEmits(['select-entry', 'select-module', 'select-profile', 'select-skill'])

function isModuleActive(key) {
  return props.activeBlock.key === key
}
</script>
