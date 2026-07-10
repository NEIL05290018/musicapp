<template>
  <AlbumWall />
  <AppSidebar />
  <main class="relative z-10 ml-[240px] min-h-screen">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import AlbumWall from '@/components/AlbumWall.vue'
import AppSidebar from '@/components/AppSidebar.vue'
</script>
