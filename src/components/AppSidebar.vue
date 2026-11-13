<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Compass, Sparkles, UserRound, LogIn, LogOut, Heart,
} from 'lucide-vue-next'
import { useAuthStore } from '@/composables/useAuthStore'
import { t, locale, setLocale, type Locale } from '@/i18n'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const langs: Locale[] = ['en', 'zh']

const navItems = [
  { path: '/', name: 'workbench', icon: Sparkles },
  { path: '/discover', name: 'discover', icon: Compass },
  { path: '/about', name: 'about', icon: UserRound },
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

function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}
</script>

<template>
  <aside class="fixed inset-x-0 bottom-0 z-40 flex h-16 flex-row border-t border-white/[0.08] bg-surface-elevated/95 backdrop-blur-xl md:left-0 md:top-0 md:bottom-auto md:h-screen md:w-[240px] md:flex-col md:border-r md:border-t-0 md:bg-surface-base/90">
    <div class="hidden items-center gap-3 px-5 py-6 md:flex">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red">
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.5 7L13 8.6V20.5C12.4 20.2 11.7 20 11 20C9.3 20 8 20.9 8 22C8 23.1 9.3 24 11 24C12.7 24 14 23.1 14 22V12.2L21 10.8V18.5C20.4 18.2 19.7 18 19 18C17.3 18 16 18.9 16 20C16 21.1 17.3 22 19 22C20.7 22 22 21.1 22 20V7H21.5V7Z" fill="white"/>
        </svg>
      </div>
      <span class="text-lg font-semibold tracking-tight text-white">AudioSift</span>
    </div>

    <nav :aria-label="t('sidebar.navigation')" class="flex flex-1 flex-row gap-1 px-2 md:flex-col md:px-3">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        class="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5 text-[11px] font-medium transition-all duration-200 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm"
        :class="isActive(item.path)
          ? 'bg-white/[0.08] text-white'
          : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink-secondary'"
        :aria-current="isActive(item.path) ? 'page' : undefined"
        @click="navigate(item.path)"
      >
        <component
          :is="item.icon"
          class="h-5 w-5 shrink-0 transition-colors duration-200"
          :class="isActive(item.path) ? 'text-brand-pink' : 'text-ink-muted group-hover:text-ink-secondary'"
        />
        <span class="truncate">{{ t(`nav.${item.name}`) }}</span>
      </button>
    </nav>

    <div class="hidden border-t border-white/[0.06] px-3 py-3 md:block">
      <p class="mb-2 px-3 text-[10px] uppercase tracking-wider text-ink-muted">{{ t('sidebar.language') }}</p>
      <div class="flex rounded-full bg-white/[0.04] p-0.5">
        <button
          v-for="l in langs"
          :key="l"
          class="flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-all"
          :class="locale === l ? 'bg-white/[0.10] text-white shadow-sm' : 'text-white/40 hover:text-white/70'"
          :aria-pressed="locale === l"
          @click="setLocale(l)"
        >
          {{ l === 'en' ? 'English' : '中文' }}
        </button>
      </div>
    </div>

    <div class="hidden border-t border-white/[0.06] px-3 py-4 md:block">
      <template v-if="auth.isLoggedIn() && auth.state.user">
        <div class="flex items-center gap-3 rounded-lg px-3 py-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sky/15 ring-1 ring-white/[0.10]">
            <UserRound class="h-4 w-4 text-brand-sky" />
          </div>
          <div class="flex flex-col flex-1 min-w-0">
            <span class="text-xs font-medium text-white/70 truncate">{{ auth.state.user.username }}</span>
            <span class="truncate text-[10px] text-ink-secondary">{{ auth.state.user.email }}</span>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-1 px-3 text-[10px] text-ink-muted">
          <Heart class="h-3 w-3 text-brand-pink" />
          <span>{{ t('sidebar.favSongs', { n: auth.state.favoriteSongIds.length }) }}</span>
          <span class="mx-1">·</span>
          <span>{{ t('sidebar.favPlaylists', { n: auth.state.favoritePlaylistIds.length }) }}</span>
        </div>
        <button
          class="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.08] px-3 py-2 text-xs text-white/45 hover:bg-white/[0.06] hover:text-white/70 transition-all"
          @click="handleLogout"
        >
          <LogOut class="h-3.5 w-3.5" />
          <span>{{ t('sidebar.logout') }}</span>
        </button>
      </template>
      <template v-else>
        <button
          class="flex w-full items-center justify-center gap-2 rounded-full bg-brand-pink px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-brand-pink-hover active:bg-brand-pink-active"
          @click="goToAuth"
        >
          <LogIn class="h-3.5 w-3.5" />
          <span>{{ t('sidebar.login') }}</span>
        </button>
      </template>
    </div>

    <div class="flex items-center px-2 md:hidden">
      <button
        class="mr-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.05] text-xs font-medium text-white/75"
        :aria-label="t('sidebar.switchLanguage')"
        :title="t('sidebar.switchLanguage')"
        @click="toggleLocale"
      >
        {{ locale === 'zh' ? '中' : 'EN' }}
      </button>
      <button
        v-if="auth.isLoggedIn()"
        class="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.05] text-white/65"
        :aria-label="t('sidebar.logout')"
        :title="t('sidebar.logout')"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" />
      </button>
      <button
        v-else
        class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-pink text-white"
        :aria-label="t('sidebar.login')"
        :title="t('sidebar.login')"
        @click="goToAuth"
      >
        <LogIn class="h-4 w-4" />
      </button>
    </div>
  </aside>
</template>
