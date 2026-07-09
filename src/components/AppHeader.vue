<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Music, Sparkles, Waves, MicVocal } from 'lucide-vue-next'

const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 10
}

onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'h-14 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl' : 'h-16 bg-transparent'"
  >
    <div class="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4f8fff] to-[#e04090]">
          <Music class="h-4 w-4 text-white" />
        </div>
        <span class="text-lg font-semibold tracking-tight text-white">AudioSift</span>
      </div>
      <div class="hidden items-center gap-4 sm:flex">
        <span class="text-xs text-white/25">浏览器端 · AI 音频分离 · 阿里云部署</span>
      </div>
    </div>
  </header>
</template>
