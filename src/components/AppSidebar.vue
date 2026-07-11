<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Compass, Sparkles, UserRound, LogIn, LogOut, Heart,
} from 'lucide-vue-next'
import { useAuthStore } from '@/composables/useAuthStore'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { path: '/', name: 'workbench', label: 'Workbench', icon: Sparkles },
  { path: '/discover', name: 'discover', label: 'Discover', icon: Compass },
  { path: '/about', name: 'about', label: 'About', icon: UserRound },
]

onMounted(async () => {
  if (!auth.isLoggedIn()) {
    await auth.restoreSession()
  }
})

function isActive(path: string): boolean {
  return route.path === path
}

function navigate(path: string) {
  router.push(path)
}

function handleLogout() {
  auth.clearAuth()
  router.push('/discover')
}

function goToAuth() {
  router.push('/auth')
}
</script>

<template>
  <aside class="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-white/[0.06] bg-black/40 backdrop-blur-xl">
    <div class="flex items-center gap-3 px-5 py-6">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E53935] shadow-lg shadow-[#E53935]/25">
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.5 7L13 8.6V20.5C12.4 20.2 11.7 20 11 20C9.3 20 8 20.9 8 22C8 23.1 9.3 24 11 24C12.7 24 14 23.1 14 22V12.2L21 10.8V18.5C20.4 18.2 19.7 18 19 18C17.3 18 16 18.9 16 20C16 21.1 17.3 22 19 22C20.7 22 22 21.1 22 20V7H21.5V7Z" fill="white"/>
        </svg>
      </div>
      <span class="text-lg font-semibold tracking-tight text-white">AudioSift</span>
    </div>

    <nav class="flex flex-1 flex-col gap-1 px-3">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200"
        :class="isActive(item.path)
          ? 'bg-white/[0.08] text-white'
          : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'"
        @click="navigate(item.path)"
      >
        <component
          :is="item.icon"
          class="h-5 w-5 transition-colors duration-200"
          :class="isActive(item.path) ? 'text-[#e04090]' : 'text-white/35 group-hover:text-white/60'"
        />
        <span>{{ item.label }}</span>
      </div>
    </nav>

    <div class="border-t border-white/[0.06] px-3 py-4">
      <template v-if="auth.isLoggedIn() && auth.state.user">
        <div class="flex items-center gap-3 rounded-lg px-3 py-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5b9cff]/40 to-[#e04090]/40 ring-1 ring-white/[0.10]">
            <UserRound class="h-4 w-4 text-white/70" />
          </div>
          <div class="flex flex-col flex-1 min-w-0">
            <span class="text-xs font-medium text-white/70 truncate">{{ auth.state.user.username }}</span>
            <span class="text-[10px] text-white/35 truncate">{{ auth.state.user.email }}</span>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-1 text-[10px] text-white/25 px-3">
          <Heart class="h-3 w-3 text-[#e04090]" />
          <span>{{ auth.state.favoriteSongIds.length }} 首收藏</span>
          <span class="mx-1">·</span>
          <span>{{ auth.state.favoritePlaylistIds.length }} 个歌单</span>
        </div>
        <button
          class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/45 hover:bg-white/[0.06] hover:text-white/70 transition-all"
          @click="handleLogout"
        >
          <LogOut class="h-3.5 w-3.5" />
          <span>退出登录</span>
        </button>
      </template>
      <template v-else>
        <button
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#e04090] to-[#5b9cff] px-3 py-2.5 text-xs font-medium text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#e04090]/20 active:scale-[0.98]"
          @click="goToAuth"
        >
          <LogIn class="h-3.5 w-3.5" />
          <span>登录 / 注册</span>
        </button>
      </template>
    </div>
  </aside>
</template>
