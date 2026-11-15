<template>
  <a
    href="#main-content"
    class="sr-only rounded-full bg-brand-blue px-4 py-3 font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
  >
    {{ t('a11y.skipToMain') }}
  </a>
  <AlbumWall />
  <AppSidebar />
  <main id="main-content" class="relative z-10 ml-0 min-h-screen pb-20 md:ml-[240px] md:pb-0">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import AlbumWall from '@/components/AlbumWall.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { t } from '@/i18n'
</script>
