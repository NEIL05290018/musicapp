<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, TrendingUp, Clock, Compass, Search, Play, Pause, SkipBack, SkipForward, ListMusic } from 'lucide-vue-next'
import { playlists, getNewSongs, getTopSongs } from '@/data/playlists'
import type { Song } from '@/data/songs'
import { songs, genres } from '@/data/songs'

const router = useRouter()

const banners = [
  { id: 'b1', text: 'Explore Your Music Universe', sub: 'AI-Powered Recommendation Engine', color: 'from-[#e04090] to-[#ff6b9d]' },
  { id: 'b2', text: 'Curated Playlists Daily', sub: 'Discover sounds that define you', color: 'from-[#5b9cff] to-[#7bc8ff]' },
  { id: 'b3', text: 'Deep Dive Listening', sub: 'Every track tells a story', color: 'from-[#a855f7] to-[#c084fc]' },
]

const newSongs = ref<Song[]>(getNewSongs(8))
const topSongs = ref<Song[]>(getTopSongs(10))
const searchQuery = ref('')
const selectedGenre = ref('')
const allSongs = ref<Song[]>(songs)

const playingSong = ref<Song | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let playTimer: ReturnType<typeof setInterval> | null = null

const filteredSongs = computed(() => {
  let result = [...allSongs.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q)
    )
  }
  if (selectedGenre.value) {
    result = result.filter(s => s.genre === selectedGenre.value)
  }
  return result
})

function openPlaylist(id: string) {
  router.push(`/discover/playlist/${id}`)
}

function playSong(song: Song) {
  if (playingSong.value?.id === song.id) {
    if (isPlaying.value) {
      pauseSong()
    } else {
      resumeSong()
    }
    return
  }
  stopPlayback()
  playingSong.value = song
  isPlaying.value = true
  currentTime.value = 0
  duration.value = song.duration
  playTimer = setInterval(() => {
    currentTime.value += 1
    if (currentTime.value >= duration.value) {
      stopPlayback()
    }
  }, 1000)
}

function pauseSong() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
}

function resumeSong() {
  isPlaying.value = true
  playTimer = setInterval(() => {
    currentTime.value += 1
    if (currentTime.value >= duration.value) {
      stopPlayback()
    }
  }, 1000)
}

function stopPlayback() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
  currentTime.value = 0
  playingSong.value = null
}

function scrollContainer(dir: number, refKey: string) {
  const el = document.querySelector(`[data-scroll="${refKey}"]`) as HTMLElement
  if (!el) return
  el.scrollBy({ left: dir * 320, behavior: 'smooth' })
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function getCover(index: number): string {
  return `/albums/album-${((index - 1) % 30) + 1}.jpg`
}

function progressPercent(): string {
  if (!duration.value) return '0%'
  return `${(currentTime.value / duration.value) * 100}%`
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[2] ml-[240px] backdrop-blur-[12px] bg-black/30" />
  <div class="relative z-[3] px-8 pb-28 pt-8">
    <div class="mb-10 flex items-end gap-3">
      <Compass class="h-7 w-7 text-[#e04090]" />
      <h1 class="text-2xl font-bold text-white">Discover</h1>
    </div>

    <div class="mb-12 grid grid-cols-3 gap-4">
      <div
        v-for="banner in banners"
        :key="banner.id"
        class="group relative cursor-pointer overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:scale-[1.02]"
        :class="`bg-gradient-to-br ${banner.color}`"
      >
        <div class="absolute right-4 top-4 opacity-20 group-hover:opacity-40 transition-opacity">
          <Sparkles class="h-12 w-12 text-white" />
        </div>
        <h2 class="relative text-lg font-bold text-white">{{ banner.text }}</h2>
        <p class="relative mt-1 text-sm text-white/80">{{ banner.sub }}</p>
      </div>
    </div>

    <section class="mb-12">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <TrendingUp class="h-4 w-4 text-[#e04090]" />
          <h2 class="text-sm font-semibold uppercase tracking-wider text-white/50">Trending Now</h2>
        </div>
        <div class="flex gap-2">
          <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/40 hover:bg-white/[0.1] hover:text-white/70 transition-all" @click="scrollContainer(-1, 'topScroll')">←</button>
          <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/40 hover:bg-white/[0.1] hover:text-white/70 transition-all" @click="scrollContainer(1, 'topScroll')">→</button>
        </div>
      </div>
      <div data-scroll="topScroll" class="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        <div
          v-for="song in topSongs" :key="song.id"
          class="group shrink-0 w-[180px] cursor-pointer rounded-xl bg-white/[0.03] p-3 backdrop-blur-sm border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
          @click="playSong(song)"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img :src="getCover(song.coverIndex)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <Play v-if="playingSong?.id !== song.id || !isPlaying" class="h-8 w-8 text-white" />
              <Pause v-else class="h-8 w-8 text-white" />
            </div>
          </div>
          <p class="text-sm font-medium text-white/90 truncate">{{ song.title }}</p>
          <p class="text-xs text-white/35 truncate mt-0.5">{{ song.artist }}</p>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4 text-[#e04090]" />
          <h2 class="text-sm font-semibold uppercase tracking-wider text-white/50">New Releases</h2>
        </div>
      </div>
      <div class="space-y-1">
        <div
          v-for="(song, idx) in newSongs" :key="song.id"
          class="group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.05]"
          @click="playSong(song)"
        >
          <span class="w-6 text-right text-xs text-white/25 tabular-nums">{{ idx + 1 }}</span>
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song.coverIndex)" class="h-full w-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white/85 truncate">{{ song.title }}</p>
            <p class="text-xs text-white/30 truncate">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <span class="text-xs text-white/20 tabular-nums">{{ formatDuration(song.duration) }}</span>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <div class="mb-4 flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-[#e04090]" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-white/50">Featured Playlists</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div
          v-for="pl in playlists" :key="pl.id"
          class="group cursor-pointer rounded-xl bg-white/[0.03] p-3 backdrop-blur-sm border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
          @click="openPlaylist(pl.id)"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img :src="getCover(pl.coverIndex)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ListMusic class="h-8 w-8 text-white" />
            </div>
          </div>
          <p class="text-sm font-medium text-white/90 truncate">{{ pl.name }}</p>
          <p class="text-xs text-white/30 truncate mt-0.5">{{ pl.description }}</p>
        </div>
      </div>
    </section>

    <section>
      <div class="mb-4 flex items-center gap-2">
        <Search class="h-4 w-4 text-[#e04090]" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-white/50">Browse All</h2>
      </div>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[240px] max-w-[400px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            v-model="searchQuery" type="text" placeholder="Search songs, artists or albums..."
            class="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/20 outline-none backdrop-blur-sm transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
          />
        </div>
        <select v-model="selectedGenre" class="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white/60 outline-none backdrop-blur-sm cursor-pointer hover:bg-white/[0.05] transition-all">
          <option value="">All Genres</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div class="space-y-0.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        <div
          v-for="song in filteredSongs" :key="song.id"
          class="group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.05]"
          @click="playSong(song)"
        >
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song.coverIndex)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white/85 truncate">{{ song.title }}</p>
            <p class="text-xs text-white/30 truncate">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <span class="w-16 text-right shrink-0 rounded-md border border-white/[0.04] bg-white/[0.02] px-2 py-0.5 text-[10px] text-white/20">{{ song.genre }}</span>
          <span class="w-12 text-right text-xs text-white/20 tabular-nums">{{ formatDuration(song.duration) }}</span>
        </div>
        <div v-if="filteredSongs.length === 0" class="flex flex-col items-center justify-center py-16">
          <Search class="mb-3 h-10 w-10 text-white/10" />
          <p class="text-sm text-white/20">No matching songs found</p>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="player-slide">
        <div v-if="playingSong" class="fixed bottom-0 left-0 right-0 z-50 ml-[240px] border-t border-white/[0.06] bg-black/70 backdrop-blur-2xl">
          <div class="flex items-center gap-4 px-6 py-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                <img :src="getCover(playingSong.coverIndex)" class="h-full w-full object-cover" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ playingSong.title }}</p>
                <p class="text-xs text-white/40 truncate">{{ playingSong.artist }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button class="text-white/30 hover:text-white/60 transition-colors">
                <SkipBack class="h-5 w-5" />
              </button>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-all"
                @click="isPlaying ? pauseSong() : resumeSong()"
              >
                <Pause v-if="isPlaying" class="h-4 w-4" />
                <Play v-else class="h-4 w-4 ml-0.5" />
              </button>
              <button class="text-white/30 hover:text-white/60 transition-colors">
                <SkipForward class="h-5 w-5" />
              </button>
            </div>

            <div class="flex items-center gap-3 w-[200px] shrink-0">
              <span class="text-xs text-white/40 tabular-nums w-10 text-right">{{ formatDuration(currentTime) }}</span>
              <div class="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden cursor-pointer">
                <div class="h-full rounded-full bg-white/60 transition-all duration-1000" :style="{ width: progressPercent() }" />
              </div>
              <span class="text-xs text-white/40 tabular-nums w-10">{{ formatDuration(duration) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.player-slide-enter-active,
.player-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.player-slide-enter-from,
.player-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
