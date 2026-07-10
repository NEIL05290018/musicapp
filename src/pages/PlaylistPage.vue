<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { playlists, getPlaylistSongs } from '@/data/playlists'
import { ArrowLeft, Music, Play, Pause } from 'lucide-vue-next'
import { ref } from 'vue'
import type { Song } from '@/data/songs'

const route = useRoute()
const router = useRouter()

const playlist = computed(() => playlists.find(p => p.id === route.params.id) ?? null)
const songs = computed(() => playlist.value ? getPlaylistSongs(playlist.value) : [])

const playingSong = ref<Song | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let playTimer: ReturnType<typeof setInterval> | null = null

function goBack() {
  router.push('/discover')
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function getCover(index: number): string {
  return `/albums/album-${((index - 1) % 30) + 1}.jpg`
}

function playSong(song: Song) {
  if (playingSong.value?.id === song.id) {
    if (isPlaying.value) { stopPlayback() }
    else { resumePlayback() }
    return
  }
  stopPlayback()
  playingSong.value = song
  isPlaying.value = true
  currentTime.value = 0
  duration.value = song.duration
  playTimer = setInterval(() => {
    currentTime.value += 1
    if (currentTime.value >= duration.value) stopPlayback()
  }, 1000)
}

function stopPlayback() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
  currentTime.value = 0
  playingSong.value = null
}

function resumePlayback() {
  isPlaying.value = true
  playTimer = setInterval(() => {
    currentTime.value += 1
    if (currentTime.value >= duration.value) stopPlayback()
  }, 1000)
}

function progressPercent(): string {
  if (!duration.value) return '0%'
  return `${(currentTime.value / duration.value) * 100}%`
}
</script>

<template>
  <div class="px-8 pb-28 pt-8">
    <button
      class="mb-8 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/[0.05] hover:text-white/70 transition-all"
      @click="goBack"
    >
      <ArrowLeft class="h-4 w-4" />
      <span>Back</span>
    </button>

    <div v-if="playlist" class="flex flex-col gap-0">
      <div class="mb-10 flex items-end gap-6">
        <div class="h-[200px] w-[200px] shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
          <img :src="getCover(playlist.coverIndex)" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-end pb-2">
          <span class="mb-2 text-xs font-medium uppercase tracking-wider text-white/30">Playlist</span>
          <h1 class="text-4xl font-bold text-white">{{ playlist.name }}</h1>
          <p class="mt-2 text-sm text-white/35">{{ playlist.description }}</p>
          <p class="mt-1 text-xs text-white/20">{{ songs.length }} songs · {{ playlist.tag }}</p>
        </div>
      </div>

      <div class="space-y-0.5">
        <div
          v-for="(song, idx) in songs"
          :key="song.id"
          class="group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.05]"
          :class="{ 'bg-white/[0.06] border-white/[0.08]': playingSong?.id === song.id }"
          @click="playSong(song)"
        >
          <span class="w-6 text-right text-xs text-white/25 tabular-nums">
            <template v-if="playingSong?.id === song.id && isPlaying">
              <Pause class="h-3.5 w-3.5 text-[#e04090] ml-auto" />
            </template>
            <template v-else>
              {{ idx + 1 }}
            </template>
          </span>
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song.coverIndex)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" :class="playingSong?.id === song.id ? 'text-[#e04090]' : 'text-white/85'">
              {{ song.title }}
            </p>
            <p class="text-xs text-white/30 truncate">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <span class="text-xs text-white/20 tabular-nums">{{ formatDuration(song.duration) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20">
      <Music class="mb-3 h-12 w-12 text-white/10" />
      <p class="text-sm text-white/30">Playlist not found</p>
      <button class="mt-4 text-sm text-[#e04090] hover:underline" @click="goBack">Go back to Discover</button>
    </div>

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
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-all"
              @click="isPlaying ? stopPlayback() : resumePlayback()"
            >
              <Pause v-if="isPlaying" class="h-4 w-4" />
              <Play v-else class="h-4 w-4 ml-0.5" />
            </button>
          </div>

          <div class="flex items-center gap-3 w-[200px] shrink-0">
            <span class="text-xs text-white/40 tabular-nums w-10 text-right">{{ formatDuration(currentTime) }}</span>
            <div class="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div class="h-full rounded-full bg-white/60 transition-all duration-1000" :style="{ width: progressPercent() }" />
            </div>
            <span class="text-xs text-white/40 tabular-nums w-10">{{ formatDuration(duration) }}</span>
          </div>
        </div>
      </div>
    </Transition>
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
