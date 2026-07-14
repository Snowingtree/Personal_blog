<template>
  <div class="android-page android-home">
    <section class="android-profile-hero">
      <div class="android-profile-hero__avatar-wrap">
        <img :src="profileAvatar" alt="Liu An 的头像" class="android-profile-hero__avatar" />
        <span class="android-profile-hero__online" aria-label="持续更新中" />
      </div>

      <div class="android-profile-hero__copy">
        <p class="android-profile-hero__eyebrow">{{ siteHero.eyebrow }}</p>
        <h1>Liu An</h1>
        <p class="android-profile-hero__title">{{ siteHero.title }}</p>
        <p class="android-profile-hero__lead">{{ siteHero.lead }}</p>

        <ul class="android-profile-hero__tags" aria-label="个人方向">
          <li>前端开发</li>
          <li>AI 实验</li>
          <li>日常记录</li>
        </ul>
      </div>

      <div class="android-profile-hero__edition" aria-hidden="true">
        <span>ANDROID</span>
        <strong>01</strong>
      </div>
    </section>

    <AndroidCalendarCard />
  </div>
</template>

<script setup>
import profileAvatar from '../../assets/images/headerPH.png'
import { siteHero } from '../../data/siteOverview'
import AndroidCalendarCard from '../components/AndroidCalendarCard.vue'
</script>
