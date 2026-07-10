<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Music, Compass, Sparkles, UserRound,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/', name: 'workbench', label: 'Workbench', icon: Sparkles },
  { path: '/discover', name: 'discover', label: 'Discover', icon: Compass },
  { path: '/about', name: 'about', label: 'About', icon: UserRound },
]

function isActive(path: string): boolean {
  return route.path === path
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-white/[0.06] bg-black/40 backdrop-blur-xl">
    <div class="flex items-center gap-3 px-5 py-6">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b9cff] to-[#e04090] shadow-lg shadow-[#e04090]/20">
        <Music class="h-4.5 w-4.5 text-white" />
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

    <div class="border-t border-white/[0.06] px-5 pb-6 pt-4">
      <div class="flex items-center gap-3 rounded-lg px-3 py-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5b9cff]/30 to-[#e04090]/30">
          <UserRound class="h-4 w-4 text-white/50" />
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-medium text-white/60">Guest</span>
          <span class="text-[10px] text-white/25">Free Plan</span>
        </div>
      </div>
    </div>
  </aside>
</template>
