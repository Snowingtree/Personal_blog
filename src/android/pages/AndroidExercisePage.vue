<template>
  <section class="android-page health-page">
    <header class="health-page-heading"><p>MOVE & WEIGHT</p><h1>运动和体重</h1><span>记录每次运动和称重，看看自己的变化。</span></header>
    <AndroidHealthRecordCard type="exercise" />
    <AndroidHealthRecordCard type="weight" />
  </section>
</template>

<script setup>
import AndroidHealthRecordCard from '../components/AndroidHealthRecordCard.vue'
</script>
