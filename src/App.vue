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
    <div class="flex justify-end px-6 pt-4">
      <button class="library-button flex items-center gap-2" @click="router.push(auth.isLoggedIn() ? '/profile' : '/auth?next=/profile')">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-brand-pink/40">{{ auth.state.user?.username.slice(0,1).toUpperCase() || '♪' }}</span>
        {{ auth.state.user?.username || t('sidebar.login') }}
      </button>
    </div>
    <router-view />
  </main>
  <GlobalMusicPlayer />
</template>

<script setup lang="ts">
import GlobalMusicPlayer from '@/components/GlobalMusicPlayer.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/composables/useAuthStore'
const router = useRouter()
const auth = useAuthStore()
import AlbumWall from '@/components/AlbumWall.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { t } from '@/i18n'
</script>
