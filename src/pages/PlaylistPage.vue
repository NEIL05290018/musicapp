<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { playlists, getPlaylistSongs } from '@/data/playlists'
import { ArrowLeft, Music, Play, Pause } from 'lucide-vue-next'
import { onUnmounted, ref } from 'vue'
import type { Song } from '@/data/songs'
import { t } from '@/i18n'

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
    if (isPlaying.value) { pausePlayback() }
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
  pausePlayback()
  currentTime.value = 0
  playingSong.value = null
}

function pausePlayback() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
}

function resumePlayback() {
  if (playTimer) clearInterval(playTimer)
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

onUnmounted(() => {
  if (playTimer) clearInterval(playTimer)
})
</script>

<template>
  <div class="px-4 pb-28 pt-6 sm:px-8 sm:pt-8">
    <button
      class="mb-8 flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-secondary transition-all hover:bg-white/[0.05] hover:text-white"
      :aria-label="t('playlist.back')"
      @click="goBack"
    >
      <ArrowLeft class="h-4 w-4" />
      <span>{{ t('playlist.back') }}</span>
    </button>

    <div v-if="playlist" class="flex flex-col gap-0">
      <div class="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div class="h-36 w-36 shrink-0 overflow-hidden rounded-[28px] sm:h-[200px] sm:w-[200px]">
          <img :src="getCover(playlist.coverIndex)" :alt="playlist.name" class="h-full w-full object-cover" />
        </div>
        <div class="flex flex-col justify-end pb-2">
          <span class="mb-2 text-xs font-medium uppercase tracking-wider text-white/55">{{ t('playlist.label') }}</span>
          <h1 class="text-3xl font-bold text-white sm:text-4xl">{{ playlist.name }}</h1>
          <p class="mt-2 text-sm text-ink-secondary">{{ playlist.description }}</p>
          <p class="mt-1 text-xs text-white/55">{{ t('playlist.songCount', { n: songs.length }) }} · {{ playlist.tag }}</p>
        </div>
      </div>

      <div class="space-y-0.5">
        <div
          v-for="(song, idx) in songs"
          :key="song.id"
          class="group flex cursor-pointer items-center gap-3 rounded-[28px] border border-transparent px-3 py-3 transition-all hover:bg-white/[0.04] hover:border-white/[0.08] sm:gap-4 sm:px-4"
          :class="{ 'bg-white/[0.06] border-white/[0.08]': playingSong?.id === song.id }"
          role="button"
          tabindex="0"
          :aria-pressed="playingSong?.id === song.id && isPlaying"
          :aria-label="`${playingSong?.id === song.id && isPlaying ? t('player.pause') : t('player.play')} ${song.title}`"
          @keydown.enter="playSong(song)"
          @keydown.space.prevent="playSong(song)"
          @click="playSong(song)"
        >
          <span class="w-6 text-right text-xs text-ink-muted tabular-nums">
            <template v-if="playingSong?.id === song.id && isPlaying">
              <Pause class="ml-auto h-3.5 w-3.5 text-brand-pink" />
            </template>
            <template v-else>
              {{ idx + 1 }}
            </template>
          </span>
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song.coverIndex)"             :alt="`${song.album} — ${song.artist}`" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-medium" :class="playingSong?.id === song.id ? 'text-brand-pink' : 'text-white/85'">
              {{ song.title }}
            </p>
            <p class="truncate text-xs text-ink-muted">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <span class="text-xs text-ink-muted tabular-nums">{{ formatDuration(song.duration) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20">
      <Music class="mb-3 h-12 w-12 text-white/10" />
      <p class="text-sm text-white/55">{{ t('playlist.notFound') }}</p>
      <button class="mt-4 rounded-full px-4 py-2 text-sm text-brand-pink hover:bg-white/[0.05]" @click="goBack">
        {{ t('playlist.goBack') }}
      </button>
    </div>

    <Transition name="player-slide">
      <div v-if="playingSong" class="fixed bottom-16 left-0 right-0 z-50 border-t border-white/[0.08] bg-surface-elevated/95 backdrop-blur-2xl md:bottom-0 md:left-[240px]">
        <div class="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <img :src="getCover(playingSong.coverIndex)" :alt="playingSong.album" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ playingSong.title }}</p>
              <p class="text-xs text-ink-secondary truncate">{{ playingSong.artist }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white transition-colors hover:bg-brand-pink-hover"
              :aria-label="isPlaying ? t('player.pause') : t('player.play')"
              :title="isPlaying ? t('player.pause') : t('player.play')"
              @click="isPlaying ? pausePlayback() : resumePlayback()"
            >
              <Pause v-if="isPlaying" class="h-4 w-4" />
              <Play v-else class="h-4 w-4 ml-0.5" />
            </button>
          </div>

          <div class="flex w-[112px] shrink-0 items-center gap-2 sm:w-[200px] sm:gap-3">
            <span class="w-10 text-right text-xs text-ink-secondary tabular-nums">{{ formatDuration(currentTime) }}</span>
            <div
              class="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              :aria-valuenow="duration ? Math.round((currentTime / duration) * 100) : 0"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="t('player.progress')"
            >
              <div class="h-full rounded-full bg-white/60 transition-all duration-1000" :style="{ width: progressPercent() }" />
            </div>
            <span class="w-10 text-xs text-ink-secondary tabular-nums">{{ formatDuration(duration) }}</span>
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
