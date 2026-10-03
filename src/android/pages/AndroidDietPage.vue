<template>
  <section class="android-page health-page">
    <header class="health-page-heading"><p>WATER & FOOD</p><h1>饮水和饮食</h1><span>按实际时间，记下每次饮水和吃过的食物。</span></header>
    <AndroidHealthRecordCard type="water" />
    <AndroidHealthRecordCard type="food" />
  </section>
</template>

<script setup>
import AndroidHealthRecordCard from '../components/AndroidHealthRecordCard.vue'
</script>
