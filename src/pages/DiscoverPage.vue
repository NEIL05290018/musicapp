<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Sparkles, TrendingUp, Clock, Compass, Search, Heart, UserRound,
  Play, Pause, SkipBack, SkipForward, ListMusic, Loader2, Music2
} from 'lucide-vue-next'
import { playlists } from '@/data/playlists'
import type { Song } from '@/data/songs'
import { songs, genres } from '@/data/songs'
import { searchSongs, resolvePlayableUrl, type MusicApiSong } from '@/composables/useMusicApi'
import { useAuthStore } from '@/composables/useAuthStore'
import { t } from '@/i18n'
import SongDetailModal from '@/components/SongDetailModal.vue'

interface ApiSong extends Song {
  coverUrl: string
  audioSrc: string
}

const router = useRouter()
const auth = useAuthStore()

const GLASS_COLORS = [
  { rgb: '224,64,144', hex: '#e04090' },
  { rgb: '79,143,255', hex: '#4f8fff' },
  { rgb: '180,100,255', hex: '#b464ff' },
  { rgb: '255,140,60', hex: '#ff8c3c' },
  { rgb: '91,156,255', hex: '#5b9cff' },
  { rgb: '52,211,153', hex: '#34d399' },
]

function getGlassColor(index: number) {
  return GLASS_COLORS[index % GLASS_COLORS.length]
}

const banners = [
  { id: 'b1', text: 'discover.bannerExplore', sub: 'discover.bannerExploreSub', path: '/', color: '#ff2d95' },
  { id: 'b2', text: 'discover.bannerPlaylists', sub: 'discover.bannerPlaylistsSub', path: '/discover', color: '#00ff9d' },
  { id: 'b3', text: 'discover.bannerListening', sub: 'discover.bannerListeningSub', path: '/discover', color: '#ffb700' },
]

const favoriteSongs = computed(() => {
  return songs.filter(s => auth.isSongFavorited(s.id))
})

const favoritePlaylists = computed(() => {
  return playlists.filter(p => auth.isPlaylistFavorited(p.id))
})

const isLoggedIn = computed(() => auth.isLoggedIn())

async function handleToggleSongFav(songId: string, event: Event) {
  event.stopPropagation()
  favoriteError.value = ''
  if (!isLoggedIn.value) {
    router.push('/auth')
    return
  }
  try {
    await auth.toggleFavoriteSong(songId)
  } catch (error) {
    favoriteError.value = error instanceof Error ? error.message : t('discover.favoriteFailed')
  }
}

async function handleTogglePlaylistFav(playlistId: string, event: Event) {
  event.stopPropagation()
  favoriteError.value = ''
  if (!isLoggedIn.value) {
    router.push('/auth')
    return
  }
  try {
    await auth.toggleFavoritePlaylist(playlistId)
  } catch (error) {
    favoriteError.value = error instanceof Error ? error.message : t('discover.favoriteFailed')
  }
}

function apiToSong(api: MusicApiSong, idx: number): ApiSong {
  return {
    id: api.id,
    title: api.title,
    artist: api.artist,
    album: api.album,
    duration: api.duration,
    coverIndex: (idx % 30) + 1,
    coverUrl: api.coverUrl,
    audioSrc: api.audioUrl,
    genre: '',
    year: 2024,
  }
}

const newSongs = ref<ApiSong[]>([])
const topSongs = ref<ApiSong[]>([])
const searchQuery = ref('')
const selectedGenre = ref('')
const allSongs = ref<Song[]>(songs)
const apiSongs = ref<MusicApiSong[]>([])
const isLoadingApi = ref(false)
const apiError = ref('')
const favoriteError = ref('')
const showDetailModal = ref(false)
const detailSong = ref<Song | null>(null)

const playQueue = ref<Song[]>([])
const queueIndex = ref(-1)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isLoadingAudioUrl = ref(false)
const playbackError = ref('')
const apiAudioUrl = ref('')
const audioRef = ref<HTMLAudioElement | null>(null)
let playTimer: ReturnType<typeof setInterval> | null = null

const playingSong = computed(() => {
  if (queueIndex.value >= 0 && queueIndex.value < playQueue.value.length) {
    return playQueue.value[queueIndex.value]
  }
  return null
})

const hasPrev = computed(() => playQueue.value.length > 1 && queueIndex.value > 0)
const hasNext = computed(() => playQueue.value.length > 1 && queueIndex.value < playQueue.value.length - 1)

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

function getCover(indexOrSong: number | Song | ApiSong): string {
  if (typeof indexOrSong === 'object' && 'coverUrl' in indexOrSong && indexOrSong.coverUrl) {
    return indexOrSong.coverUrl
  }
  const index = typeof indexOrSong === 'number' ? indexOrSong : indexOrSong.coverIndex
  return `/albums/album-${((index - 1) % 30) + 1}.jpg`
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function openPlaylist(id: string) {
  router.push(`/discover/playlist/${id}`)
}

function openSongDetail(song: Song) {
  detailSong.value = song
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
}

function playFromModal(song: Song) {
  showDetailModal.value = false
  playSong(song)
}

function buildQueueFromSong(song: Song, source: Song[]) {
  const idx = source.findIndex(s => s.id === song.id)
  if (idx >= 0) {
    playQueue.value = [...source]
    queueIndex.value = idx
  } else {
    playQueue.value = [song]
    queueIndex.value = 0
  }
}

function playSong(song: Song) {
  const alreadyPlaying = playingSong.value?.id === song.id

  if (alreadyPlaying) {
    if (isPlaying.value) {
      pauseSong()
    } else {
      resumeSong()
    }
    return
  }

  if (!playQueue.value.find(s => s.id === song.id)) {
    buildQueueFromSong(song, allSongs.value)
  }

  stopPlayback()
  startPlayback(song)
}

function playSongFromList(song: Song, source: Song[]) {
  buildQueueFromSong(song, source)
  stopPlayback()
  startPlayback(song)
}

async function startPlayback(song: Song | ApiSong) {
  playbackError.value = ''
  isPlaying.value = true
  currentTime.value = 0
  duration.value = song.duration || 200

  const apiSong = song as ApiSong
  if (apiSong.audioSrc) {
    isLoadingAudioUrl.value = true
    const playUrl = await resolvePlayableUrl(apiSong.audioSrc)
    isLoadingAudioUrl.value = false

    if (playUrl) {
      apiAudioUrl.value = playUrl
      if (!audioRef.value) {
        audioRef.value = new Audio()
        audioRef.value.addEventListener('ended', onAudioEnded)
        audioRef.value.addEventListener('timeupdate', onAudioTimeUpdate)
        audioRef.value.addEventListener('loadedmetadata', onAudioLoaded)
      }
      audioRef.value.src = playUrl
      audioRef.value.play().catch((error: unknown) => {
        isPlaying.value = false
        playbackError.value = error instanceof Error ? error.message : t('player.playbackFailed')
      })
      return
    }
  }

  startTimer()
}

function startTimer() {
  stopTimer()
  playTimer = setInterval(() => {
    currentTime.value += 1
    if (currentTime.value >= duration.value) {
      stopPlayback()
    }
  }, 1000)
}

function stopTimer() {
  if (playTimer) { clearInterval(playTimer); playTimer = null }
}

function onAudioTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = Math.floor(audioRef.value.currentTime)
  }
}

function onAudioLoaded() {
  if (audioRef.value) {
    duration.value = Math.floor(audioRef.value.duration) || 200
  }
}

function onAudioEnded() {
  if (hasNext.value) {
    skipNext()
  } else {
    stopPlayback()
  }
}

function pauseSong() {
  isPlaying.value = false
  stopTimer()
  if (audioRef.value) audioRef.value.pause()
}

function resumeSong() {
  isPlaying.value = true
  if (audioRef.value && audioRef.value.src) {
    audioRef.value.play().catch(() => {
      startTimer()
    })
  } else {
    startTimer()
  }
}

function stopPlayback() {
  isPlaying.value = false
  stopTimer()
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
  currentTime.value = 0
  apiAudioUrl.value = ''
}

function skipPrev() {
  if (!hasPrev.value) return
  queueIndex.value--
  const song = playQueue.value[queueIndex.value]
  stopPlayback()
  startPlayback(song)
}

function skipNext() {
  if (!hasNext.value) return
  queueIndex.value++
  const song = playQueue.value[queueIndex.value]
  stopPlayback()
  startPlayback(song)
}

function scrollContainer(dir: number, refKey: string) {
  const el = document.querySelector(`[data-scroll="${refKey}"]`) as HTMLElement
  if (!el) return
  el.scrollBy({ left: dir * 320, behavior: 'smooth' })
}

function progressPercent(): string {
  if (!duration.value) return '0%'
  return `${(currentTime.value / duration.value) * 100}%`
}

onMounted(async () => {
  isLoadingApi.value = true

  const queries = ['Taylor Swift', 'Ed Sheeran', 'BTS', 'Coldplay', 'Adele', 'Imagine Dragons']
  const allResults: MusicApiSong[] = []

  try {
    for (const q of queries) {
      const batch = await searchSongs(q, 6)
      allResults.push(...batch)
    }

    const unique = allResults.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)

    if (unique.length >= 8) {
      topSongs.value = unique.slice(0, 10).map((s, i) => apiToSong(s, i))
      newSongs.value = unique.slice(10, 18).map((s, i) => apiToSong(s, i + 10))
    } else if (unique.length > 0) {
      topSongs.value = unique.slice(0, Math.min(10, unique.length)).map((s, i) => apiToSong(s, i))
    }

    apiSongs.value = unique
    if (unique.length === 0) apiError.value = t('discover.libraryUnavailable')
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : t('discover.libraryUnavailable')
  } finally {
    isLoadingApi.value = false
  }

  if (!auth.isLoggedIn()) {
    await auth.restoreSession()
  }
})

onUnmounted(() => {
  stopPlayback()
  if (audioRef.value) {
    audioRef.value.removeEventListener('ended', onAudioEnded)
    audioRef.value.removeEventListener('timeupdate', onAudioTimeUpdate)
    audioRef.value.removeEventListener('loadedmetadata', onAudioLoaded)
    audioRef.value = null
  }
})

watch(playingSong, (song) => {
  if (song) {
    document.title = `${song.title} - ${song.artist} | AudioSift`
  } else {
    document.title = t('discover.documentTitle')
  }
})
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[2] ml-0 bg-surface-base/35 backdrop-blur-[12px] md:ml-[240px]" />
  <div class="relative z-[3] px-4 pb-28 pt-6 sm:px-8 sm:pt-8">
    <div class="mb-10 flex flex-wrap items-end gap-3">
      <Compass class="h-7 w-7 text-brand-pink" aria-hidden="true" />
      <h1 class="text-2xl font-bold text-white">{{ t('discover.title') }}</h1>
      <div v-if="isLoadingApi" class="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1">
        <Loader2 class="h-3 w-3 animate-spin text-brand-pink" />
        <span class="text-xs text-ink-secondary">{{ t('discover.loading') }}</span>
      </div>
      <div v-else-if="apiSongs.length > 0" class="rounded-full bg-semantic-success/15 px-3 py-1">
        <span class="text-xs font-medium text-semantic-success">{{ t('discover.libraryConnected') }}</span>
      </div>
      <p v-if="apiError" class="w-full text-sm text-semantic-warning" role="status">{{ apiError }}</p>
    </div>

    <section v-if="isLoggedIn" class="mb-10">
      <div class="rounded-[28px] border border-white/[0.08] bg-surface-card p-5 sm:p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink">
            <UserRound class="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-white">{{ t('discover.myMusic') }}</h2>
            <p class="text-xs text-ink-secondary">
              <Heart class="mr-1 inline h-3 w-3 text-brand-pink" />
              {{ t('discover.favSummary', { s: auth.state.favoriteSongIds.length, p: auth.state.favoritePlaylistIds.length }) }}
            </p>
          </div>
        </div>

        <div v-if="favoriteSongs.length > 0">
          <div class="mb-3 flex items-center gap-2">
            <Heart class="h-3.5 w-3.5 text-brand-pink" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-secondary">{{ t('discover.favSongs') }}</h3>
          </div>
          <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <article
              v-for="(song, idx) in favoriteSongs" :key="'fav-' + song.id"
              class="group w-[160px] shrink-0 rounded-[28px] border border-white/[0.08] bg-surface-card p-2.5 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-card-hover"
            >
              <div class="relative mb-2.5 aspect-square overflow-hidden rounded-lg">
                <img :src="getCover(song)" :alt="`${song.title} — ${song.artist}`" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <button
                  class="absolute inset-0 flex items-center justify-center bg-surface-base/30 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  :aria-label="`${t('player.play')} ${song.title}`"
                  @click="playSongFromList(song, favoriteSongs)"
                >
                  <Play v-if="playingSong?.id !== song.id || !isPlaying" class="h-7 w-7 text-white" />
                  <Pause v-else class="h-7 w-7 text-white" />
                </button>
                <button
                  class="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-base/90 text-brand-pink opacity-100 transition-opacity hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  :aria-label="t('discover.removeSongFavorite', { song: song.title })"
                  :title="t('discover.removeFavorite')"
                  :aria-pressed="true"
                  @click="handleToggleSongFav(song.id, $event)"
                >
                  <Heart class="h-3.5 w-3.5" :class="auth.isSongFavorited(song.id) ? 'fill-brand-pink' : ''" />
                </button>
              </div>
              <button class="block max-w-full truncate text-left text-xs font-medium text-white/90 hover:text-brand-pink" @click="openSongDetail(song)">
                {{ song.title }}
              </button>
              <p class="mt-0.5 truncate text-[10px] text-ink-muted">{{ song.artist }}</p>
            </article>
          </div>
        </div>

        <div v-if="favoritePlaylists.length > 0" class="mt-5">
          <div class="mb-3 flex items-center gap-2">
            <ListMusic class="h-3.5 w-3.5 text-brand-sky" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-secondary">{{ t('discover.favPlaylists') }}</h3>
          </div>
          <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <article
              v-for="(pl, idx) in favoritePlaylists" :key="'favpl-' + pl.id"
              class="group w-[160px] shrink-0 rounded-[28px] border border-white/[0.08] bg-surface-card p-2.5 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-card-hover"
            >
              <div class="relative mb-2.5 aspect-square overflow-hidden rounded-lg">
                <img :src="getCover(pl.coverIndex)" :alt="pl.name" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <button
                  class="absolute inset-0 flex items-center justify-center bg-surface-base/30 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  :aria-label="t('playlist.open', { playlist: pl.name })"
                  @click="openPlaylist(pl.id)"
                >
                  <ListMusic class="h-7 w-7 text-white" />
                </button>
                <button
                  class="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-base/90 text-brand-sky opacity-100 transition-opacity hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  :aria-label="t('discover.removePlaylistFavorite', { playlist: pl.name })"
                  :title="t('discover.removeFavorite')"
                  :aria-pressed="true"
                  @click="handleTogglePlaylistFav(pl.id, $event)"
                >
                  <Heart class="h-3.5 w-3.5" :class="auth.isPlaylistFavorited(pl.id) ? 'fill-brand-sky' : ''" />
                </button>
              </div>
              <button class="block max-w-full truncate text-left text-xs font-medium text-white/90 hover:text-brand-sky" @click="openPlaylist(pl.id)">
                {{ pl.name }}
              </button>
              <p class="mt-0.5 truncate text-[10px] text-ink-muted">{{ pl.description }}</p>
            </article>
          </div>
        </div>

        <div v-if="favoriteSongs.length === 0 && favoritePlaylists.length === 0" class="text-center py-6">
          <Heart class="mx-auto mb-2 h-8 w-8 text-white/45" />
          <p class="text-sm text-white/75">{{ t('discover.noFavs') }}</p>
          <p class="mt-1 text-xs text-white/55">{{ t('discover.noFavsHint') }}</p>
        </div>
        <p v-if="favoriteError" class="mt-4 text-sm text-semantic-error" role="alert">{{ favoriteError }}</p>
      </div>
    </section>

    <div class="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      <button
        v-for="banner in banners"
        :key="banner.id"
        type="button"
        class="group relative cursor-pointer overflow-hidden rounded-[28px] border bg-surface-card px-6 py-9 text-center transition-all duration-500 hover:-translate-y-1 hover:bg-surface-card-hover sm:px-8 sm:py-12"
        :style="{ borderColor: `${banner.color}3d` }"
        @mouseenter="(e: MouseEvent) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${banner.color}80`; el.style.boxShadow = `0 12px 32px ${banner.color}22` }"
        @mouseleave="(e: MouseEvent) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${banner.color}3d`; el.style.boxShadow = '' }"
        @click="router.push(banner.path)"
      >
        <div
          class="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full transition-opacity duration-500 opacity-80 group-hover:opacity-100"
          :style="{ background: `radial-gradient(circle, ${banner.color}30 0%, transparent 70%)` }"
        />
        <h2 class="relative text-xl font-semibold tracking-tight text-white sm:text-2xl">{{ t(banner.text) }}</h2>
        <p class="relative mt-2 text-sm text-ink-secondary">{{ t(banner.sub) }}</p>
        <p class="relative mt-7 text-sm font-semibold" :style="{ color: banner.color }">
          {{ t('discover.learnMore') }}<span class="ml-1" aria-hidden="true">›</span>
        </p>
      </button>
    </div>

    <section class="mb-12">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <TrendingUp class="h-4 w-4 text-[#e04090]" />
          <h2 class="text-sm font-semibold uppercase tracking-wider text-white/75">{{ t('discover.trending') }}</h2>
        </div>
        <div class="flex gap-2">
          <button class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-white/65 transition-all hover:bg-white/[0.10] hover:text-white" :aria-label="t('discover.scrollPrevious')" @click="scrollContainer(-1, 'topScroll')">←</button>
          <button class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-white/65 transition-all hover:bg-white/[0.10] hover:text-white" :aria-label="t('discover.scrollNext')" @click="scrollContainer(1, 'topScroll')">→</button>
        </div>
      </div>
      <div data-scroll="topScroll" class="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-2">
        <article
          v-for="(song, idx) in topSongs" :key="song.id"
          class="group w-[180px] shrink-0 snap-start rounded-[28px] border bg-surface-card p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-card-hover"
          :style="{
            border: `1px solid rgba(${getGlassColor(idx).rgb},0.08)`,
          }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.25)`; el.style.boxShadow = `0 0 24px rgba(${c.rgb},0.15)`; el.style.backgroundColor = `rgba(${c.rgb},0.06)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.08)`; el.style.boxShadow = ''; el.style.backgroundColor = '' }"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img :src="getCover(song)" :alt="`${song.title} — ${song.artist}`" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <button
              class="absolute inset-0 flex items-center justify-center bg-surface-base/30 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              :aria-label="`${t('player.play')} ${song.title}`"
              @click="playSongFromList(song, topSongs)"
            >
              <Play v-if="playingSong?.id !== song.id || !isPlaying" class="h-8 w-8 text-white" />
              <Pause v-else class="h-8 w-8 text-white" />
            </button>
            <button
              class="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface-base/90 text-white/75 opacity-0 transition-all hover:scale-110 hover:text-brand-pink group-hover:opacity-100 group-focus-within:opacity-100"
              :class="auth.isSongFavorited(song.id) ? '!opacity-100 !text-[#e04090]' : ''"
              :aria-pressed="auth.isSongFavorited(song.id)"
              :aria-label="auth.isSongFavorited(song.id) ? t('discover.removeSongFavorite', { song: song.title }) : t('discover.addSongFavorite', { song: song.title })"
              :title="auth.isSongFavorited(song.id) ? t('discover.removeFavorite') : t('discover.addFavorite')"
              @click="handleToggleSongFav(song.id, $event)"
            >
              <Heart class="h-4 w-4" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
            </button>
          </div>
          <button class="block max-w-full truncate text-left text-sm font-medium text-white/90 hover:text-brand-pink" @click="openSongDetail(song)">
            {{ song.title }}
          </button>
          <p class="mt-0.5 truncate text-xs text-ink-secondary">{{ song.artist }}</p>
        </article>
      </div>
    </section>

    <section class="mb-12">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4 text-[#e04090]" />
          <h2 class="text-sm font-semibold uppercase tracking-wider text-white/75">{{ t('discover.newReleases') }}</h2>
        </div>
      </div>
      <div class="space-y-1">
        <article
          v-for="(song, idx) in newSongs" :key="song.id"
          class="group flex items-center gap-3 rounded-[28px] border px-3 py-3 transition-all hover:bg-surface-card sm:gap-4 sm:px-4"
          :style="{
            borderColor: `rgba(${getGlassColor(idx).rgb},0.04)`,
            backgroundColor: playingSong?.id === song.id ? `rgba(${getGlassColor(idx).rgb},0.08)` : 'transparent'
          }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.12)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.12)` : `rgba(${c.rgb},0.04)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.04)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.08)` : '' }"
        >
          <button
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.08] hover:text-brand-pink"
            :aria-label="`${t('player.play')} ${song.title}`"
            @click="playSongFromList(song, newSongs)"
          >
            <Pause v-if="playingSong?.id === song.id && isPlaying" class="h-4 w-4" />
            <Play v-else class="h-4 w-4" />
          </button>
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song)" :alt="`${song.title} — ${song.artist}`" class="h-full w-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <button class="block max-w-full truncate text-left text-sm font-medium text-white/90 hover:text-brand-pink" @click="openSongDetail(song)">
              {{ song.title }}
            </button>
            <p class="truncate text-xs text-ink-secondary">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <button
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/65 transition-all hover:bg-white/[0.08] hover:text-brand-pink"
            :class="auth.isSongFavorited(song.id) ? '!text-[#e04090]' : ''"
            :aria-pressed="auth.isSongFavorited(song.id)"
            :aria-label="auth.isSongFavorited(song.id) ? t('discover.removeSongFavorite', { song: song.title }) : t('discover.addSongFavorite', { song: song.title })"
            :title="auth.isSongFavorited(song.id) ? t('discover.removeFavorite') : t('discover.addFavorite')"
            @click="handleToggleSongFav(song.id, $event)"
          >
            <Heart class="h-4 w-4" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
          </button>
          <span class="text-xs text-ink-muted tabular-nums">{{ formatDuration(song.duration) }}</span>
        </article>
      </div>
    </section>

    <section class="mb-12">
      <div class="mb-4 flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-[#e04090]" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-white/75">{{ t('discover.featuredPlaylists') }}</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <article
          v-for="(pl, idx) in playlists" :key="pl.id"
          class="group rounded-[28px] border bg-surface-card p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-card-hover"
          :style="{ border: `1px solid rgba(${getGlassColor(idx).rgb},0.06)` }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.2)`; el.style.boxShadow = `0 0 20px rgba(${c.rgb},0.1)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.06)`; el.style.boxShadow = '' }"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img :src="getCover(pl.coverIndex)" :alt="pl.name" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <button
              class="absolute inset-0 flex items-center justify-center bg-surface-base/30 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              :aria-label="t('playlist.open', { playlist: pl.name })"
              @click="openPlaylist(pl.id)"
            >
              <ListMusic class="h-8 w-8 text-white" />
            </button>
            <button
              class="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-base/90 text-white/75 opacity-100 transition-all hover:scale-110 hover:text-brand-sky sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              :class="auth.isPlaylistFavorited(pl.id) ? '!opacity-100 !text-[#5b9cff]' : ''"
              :aria-pressed="auth.isPlaylistFavorited(pl.id)"
              :aria-label="auth.isPlaylistFavorited(pl.id) ? t('discover.removePlaylistFavorite', { playlist: pl.name }) : t('discover.addPlaylistFavorite', { playlist: pl.name })"
              :title="auth.isPlaylistFavorited(pl.id) ? t('discover.removeFavorite') : t('discover.addFavorite')"
              @click="handleTogglePlaylistFav(pl.id, $event)"
            >
              <Heart class="h-4 w-4" :class="auth.isPlaylistFavorited(pl.id) ? 'fill-[#5b9cff]' : ''" />
            </button>
          </div>
          <button class="block max-w-full truncate text-left text-sm font-medium text-white/90 hover:text-brand-sky" @click="openPlaylist(pl.id)">
            {{ pl.name }}
          </button>
          <p class="mt-0.5 truncate text-xs text-ink-muted">{{ pl.description }}</p>
        </article>
      </div>
    </section>

    <section>
      <div class="mb-4 flex items-center gap-2">
        <Search class="h-4 w-4 text-[#e04090]" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-white/75">{{ t('discover.browseAll') }}</h2>
      </div>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[240px] max-w-[400px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            v-model="searchQuery" type="text" :placeholder="t('discover.searchPlaceholder')"
            :aria-label="t('discover.searchPlaceholder')"
            class="w-full rounded-2xl border border-white/[0.10] bg-surface-card px-4 py-3 pl-10 text-sm text-white/90 placeholder:text-white/50 outline-none transition-all focus:border-brand-blue/50 focus:bg-surface-card-hover"
          />
        </div>
        <select
          v-model="selectedGenre"
          class="cursor-pointer rounded-full border border-white/[0.10] bg-surface-card px-4 py-3 text-sm text-white/75 transition-all hover:bg-surface-card-hover"
          :aria-label="t('discover.allGenres')"
        >
          <option value="">{{ t('discover.allGenres') }}</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div class="space-y-0.5 max-h-[400px] overflow-y-auto pr-1">
        <article
          v-for="(song, idx) in filteredSongs" :key="song.id"
          class="group flex items-center gap-2 rounded-[28px] border px-3 py-3 transition-all hover:bg-surface-card focus-within:border-brand-pink/30 sm:gap-4 sm:px-4"
          :style="{
            borderColor: `rgba(${getGlassColor(idx).rgb},0.03)`,
            backgroundColor: playingSong?.id === song.id ? `rgba(${getGlassColor(idx).rgb},0.08)` : 'transparent'
          }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.10)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.10)` : `rgba(${c.rgb},0.03)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.03)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.08)` : '' }"
        >
          <button
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.08] hover:text-brand-pink"
            :aria-label="`${t('player.play')} ${song.title}`"
            @click="playSongFromList(song, filteredSongs)"
          >
            <Pause v-if="playingSong?.id === song.id && isPlaying" class="h-4 w-4" />
            <Play v-else class="h-4 w-4" />
          </button>
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song)" :alt="`${song.title} — ${song.artist}`" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div class="flex-1 min-w-0">
            <button class="block max-w-full truncate text-left text-sm font-medium text-white/90 hover:text-brand-pink" @click="openSongDetail(song)">
              {{ song.title }}
            </button>
            <p class="truncate text-xs text-ink-secondary">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <span class="hidden w-16 shrink-0 rounded-full border border-white/[0.10] bg-white/[0.03] px-2 py-1 text-right text-[10px] text-white/65 sm:block">{{ song.genre }}</span>
          <button
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/65 transition-all hover:bg-white/[0.08] hover:text-brand-pink"
            :class="auth.isSongFavorited(song.id) ? '!text-[#e04090]' : ''"
            :aria-pressed="auth.isSongFavorited(song.id)"
            :aria-label="auth.isSongFavorited(song.id) ? t('discover.removeSongFavorite', { song: song.title }) : t('discover.addSongFavorite', { song: song.title })"
            :title="auth.isSongFavorited(song.id) ? t('discover.removeFavorite') : t('discover.addFavorite')"
            @click="handleToggleSongFav(song.id, $event)"
          >
            <Heart class="h-3.5 w-3.5" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
          </button>
          <span class="w-12 text-right text-xs text-ink-muted tabular-nums">{{ formatDuration(song.duration) }}</span>
        </article>
        <div v-if="filteredSongs.length === 0" class="flex flex-col items-center justify-center py-16">
          <Search class="mb-3 h-10 w-10 text-white/45" />
          <p class="text-sm text-white/70">{{ t('discover.noMatches') }}</p>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="player-slide">
        <div v-if="playingSong" class="fixed bottom-16 left-0 right-0 z-50 border-t border-white/[0.08] bg-surface-elevated/95 backdrop-blur-2xl md:bottom-0 md:left-[240px]">
          <div class="absolute bottom-full left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div
            class="absolute left-0 right-0 top-0 h-0.5 bg-white/[0.10] sm:hidden"
            role="progressbar"
            :aria-valuenow="duration ? Math.round((currentTime / duration) * 100) : 0"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="t('player.progress')"
          >
            <div class="h-full bg-brand-pink" :style="{ width: progressPercent() }" />
          </div>
          <div class="flex items-center gap-2 px-3 py-3 sm:gap-4 sm:px-6">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.08]">
                <img :src="getCover(playingSong as ApiSong)" :alt="playingSong.album" class="h-full w-full object-cover" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ playingSong.title }}</p>
                <p class="text-xs text-white/45 truncate">{{ playingSong.artist }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                class="transition-colors"
                :class="hasPrev ? 'text-ink-secondary hover:text-white' : 'cursor-not-allowed text-ink-muted'"
                :disabled="!hasPrev"
                :aria-label="t('player.previous')"
                :title="t('player.previous')"
                @click="skipPrev"
              >
                <SkipBack class="h-5 w-5" />
              </button>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white transition-colors hover:bg-brand-pink-hover"
                :aria-label="isPlaying ? t('player.pause') : t('player.play')"
                :title="isPlaying ? t('player.pause') : t('player.play')"
                @click="isPlaying ? pauseSong() : resumeSong()"
              >
                <Loader2 v-if="isLoadingAudioUrl" class="h-4 w-4 animate-spin" />
                <Pause v-else-if="isPlaying" class="h-4 w-4" />
                <Play v-else class="h-4 w-4 ml-0.5" />
              </button>
              <button
                class="transition-colors"
                :class="hasNext ? 'text-ink-secondary hover:text-white' : 'cursor-not-allowed text-ink-muted'"
                :disabled="!hasNext"
                :aria-label="t('player.next')"
                :title="t('player.next')"
                @click="skipNext"
              >
                <SkipForward class="h-5 w-5" />
              </button>
            </div>

            <div class="hidden w-[280px] shrink-0 items-center gap-3 sm:flex">
              <span class="text-xs text-white/45 tabular-nums w-10 text-right">{{ formatDuration(currentTime) }}</span>
              <div
                class="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.10]"
                role="progressbar"
                :aria-valuenow="duration ? Math.round((currentTime / duration) * 100) : 0"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="t('player.progress')"
              >
                <div
                  class="h-full rounded-full bg-gradient-to-r from-[#e04090] to-[#5b9cff] transition-all duration-1000"
                  :style="{ width: progressPercent() }"
                />
              </div>
              <span class="text-xs text-white/45 tabular-nums w-10">{{ formatDuration(duration) }}</span>
            </div>
            <p v-if="playbackError" class="px-4 pb-2 text-xs text-semantic-error" role="alert">{{ playbackError }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SongDetailModal
      :song="detailSong"
      :visible="showDetailModal"
      @close="closeDetailModal"
      @play="playFromModal"
    />
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
