<template>
  <AppHeader />
  <main class="pt-16">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
</script>
