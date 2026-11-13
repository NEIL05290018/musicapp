<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Play, Pause, Clock, Disc3, Music } from 'lucide-vue-next'
import type { Song } from '@/data/songs'
import { songs } from '@/data/songs'
import { fetchLyric, parseLyricText } from '@/composables/useMusicApi'
import { t } from '@/i18n'

const props = defineProps<{
  song: Song | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  play: [song: Song]
}>()

const lyrics = ref<{ time: number; text: string }[]>([])
const isLoadingLyric = ref(false)

function getCover(index: number): string {
  return `/albums/album-${((index - 1) % 30) + 1}.jpg`
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const similarSongs = ref<Song[]>([])

watch(() => props.song, (s) => {
  if (!s) return
  lyrics.value = []
  isLoadingLyric.value = false

  similarSongs.value = songs
    .filter((x) => x.id !== s.id && x.genre === s.genre)
    .slice(0, 4)

  if (similarSongs.value.length < 4) {
    const others = songs.filter((x) => x.id !== s.id && x.genre !== s.genre).slice(0, 4 - similarSongs.value.length)
    similarSongs.value = [...similarSongs.value, ...others]
  }
}, { immediate: true })

function onPlayClick(song: Song) {
  emit('play', song)
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="visible && song"
      class="fixed inset-0 z-[100] flex items-center justify-center p-6"
      @click.self="emit('close')"
    >
      <div class="fixed inset-0 bg-black/60 backdrop-blur-md" @click="emit('close')" />

      <div class="relative z-10 flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#111118]/90 backdrop-blur-2xl shadow-2xl">
        <button
          class="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-none bg-black/40 text-white/60 transition-colors hover:bg-black/60 hover:text-white"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>

        <div class="relative shrink-0">
          <div class="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/40 to-transparent z-10" />
          <img
            :src="getCover(song.coverIndex)"
            class="h-56 w-full object-cover"
          />
          <div class="absolute bottom-0 left-0 right-0 z-20 p-6">
            <h2 class="text-2xl font-bold text-white">{{ song.title }}</h2>
            <p class="mt-1 text-sm text-white/70">{{ song.artist }} · {{ song.album }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
          <span class="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/55">{{ song.genre }}</span>
          <span class="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/55">{{ song.year }}</span>
          <span class="ml-auto flex items-center gap-1 text-xs text-white/45">
            <Clock class="h-3 w-3" />
            {{ formatDuration(song.duration) }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="isLoadingLyric" class="flex items-center justify-center py-8">
            <div class="h-5 w-5 animate-spin rounded-full border-2 border-[#e04090]/30 border-t-[#e04090]" />
          </div>

          <div v-else-if="lyrics.length > 0" class="space-y-2">
            <div
              v-for="(line, i) in lyrics"
              :key="i"
              class="rounded-lg px-3 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/75"
            >
              {{ line.text }}
            </div>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-8 text-center">
            <Music class="mb-3 h-8 w-8 text-white/15" />
            <p class="text-sm text-white/35">{{ t('modal.noLyrics') }}</p>
            <p class="mt-1 text-xs text-white/20">{{ t('modal.noLyricsHint') }}</p>
          </div>
        </div>

        <div class="border-t border-white/[0.06] px-6 py-4">
          <div class="flex items-center gap-2 mb-3">
            <Disc3 class="h-3.5 w-3.5 text-[#e04090]" />
            <span class="text-xs font-semibold text-white/50">{{ t('modal.similar') }}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="s in similarSongs"
              :key="s.id"
              class="flex items-center gap-3 rounded-xl p-2 cursor-pointer border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.10] transition-all duration-200 group"
              @click="onPlayClick(s)"
            >
              <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                <img :src="getCover(s.coverIndex)" class="h-full w-full object-cover" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-white/80 truncate">{{ s.title }}</p>
                <p class="text-[11px] text-white/35 truncate">{{ s.artist }}</p>
              </div>
              <Play class="h-3.5 w-3.5 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </div>
        </div>

        <div class="border-t border-white/[0.06] px-6 py-4">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-none bg-[#e04090] py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-[#ff5aa5] active:bg-[#c02f76]"
            @click="onPlayClick(song)"
          >
            <Play class="h-4 w-4" />
            {{ t('modal.playNow') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active > :not([class*="fixed inset-0"]),
.modal-leave-active > :not([class*="fixed inset-0"]) {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > :not([class*="fixed inset-0"]),
.modal-leave-to > :not([class*="fixed inset-0"]) {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}
</style>
