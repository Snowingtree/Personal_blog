<template>
  <section class="android-page health-page">
    <header class="health-page-heading"><p>WATER & FOOD</p><h1>饮水和饮食</h1></header>
    <AndroidHealthRecordCard type="water" />
    <AndroidHealthRecordCard type="food" />
  </section>
</template>

<script setup>
import AndroidHealthRecordCard from '../components/AndroidHealthRecordCard.vue'
</script>
