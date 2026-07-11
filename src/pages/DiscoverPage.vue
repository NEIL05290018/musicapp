<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
import SongDetailModal from '@/components/SongDetailModal.vue'

interface ApiSong extends Song {
  coverUrl: string
  audioSrc: string
}

const router = useRouter()
const auth = useAuthStore()

const GLASS_COLORS = [
  { name: 'rose', rgb: '224,64,144', hex: '#e04090' },
  { name: 'sky', rgb: '91,156,255', hex: '#5b9cff' },
  { name: 'violet', rgb: '168,85,247', hex: '#a855f7' },
  { name: 'amber', rgb: '255,140,60', hex: '#ff8c3c' },
  { name: 'emerald', rgb: '52,211,153', hex: '#34d399' },
  { name: 'cyan', rgb: '6,182,212', hex: '#06b6d4' },
  { name: 'fuchsia', rgb: '217,70,239', hex: '#d946ef' },
  { name: 'lime', rgb: '132,204,22', hex: '#84cc16' },
]

function getGlassColor(index: number) {
  return GLASS_COLORS[index % GLASS_COLORS.length]
}

const banners = [
  { id: 'b1', text: 'Explore Your Music Universe', sub: 'AI-Powered Recommendation Engine', color: 'from-[#e04090] to-[#ff6b9d]' },
  { id: 'b2', text: 'Curated Playlists Daily', sub: 'Discover sounds that define you', color: 'from-[#5b9cff] to-[#7bc8ff]' },
  { id: 'b3', text: 'Deep Dive Listening', sub: 'Every track tells a story', color: 'from-[#a855f7] to-[#c084fc]' },
]

let nextColorIdx = 0
function assignColor() {
  const color = GLASS_COLORS[nextColorIdx % GLASS_COLORS.length]
  nextColorIdx++
  return color
}

const favoriteSongs = computed(() => {
  return songs.filter(s => auth.isSongFavorited(s.id))
})

const favoritePlaylists = computed(() => {
  return playlists.filter(p => auth.isPlaylistFavorited(p.id))
})

const isLoggedIn = computed(() => auth.isLoggedIn())

async function handleToggleSongFav(songId: string, event: Event) {
  event.stopPropagation()
  if (!isLoggedIn.value) {
    router.push('/auth')
    return
  }
  try {
    await auth.toggleFavoriteSong(songId)
  } catch {
    // silently fail
  }
}

async function handleTogglePlaylistFav(playlistId: string, event: Event) {
  event.stopPropagation()
  if (!isLoggedIn.value) {
    router.push('/auth')
    return
  }
  try {
    await auth.toggleFavoritePlaylist(playlistId)
  } catch {
    // silently fail
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
const showDetailModal = ref(false)
const detailSong = ref<Song | null>(null)

const playQueue = ref<Song[]>([])
const queueIndex = ref(-1)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isLoadingAudioUrl = ref(false)
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
      audioRef.value.play().catch(() => {
        isPlaying.value = false
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

  const queries = ['周杰伦', 'Taylor Swift', '邓紫棋', '林俊杰', 'Ed Sheeran', 'BTS']
  const allResults: MusicApiSong[] = []

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
  isLoadingApi.value = false

  if (!auth.isLoggedIn()) {
    await auth.restoreSession()
  }
})

watch(playingSong, (song) => {
  if (song) {
    document.title = `${song.title} - ${song.artist} | AudioSift`
  } else {
    document.title = 'AudioSift - AI 音频分离'
  }
})
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[2] ml-[240px] backdrop-blur-[12px] bg-black/25" />
  <div class="relative z-[3] px-8 pb-28 pt-8">
    <div class="mb-10 flex items-end gap-3">
      <Compass class="h-7 w-7 text-[#e04090]" />
      <h1 class="text-2xl font-bold text-white">Discover</h1>
      <div v-if="isLoadingApi" class="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1">
        <Loader2 class="h-3 w-3 animate-spin text-[#e04090]" />
        <span class="text-xs text-white/40">正在加载在线曲库...</span>
      </div>
      <div v-else-if="apiSongs.length > 0" class="rounded-full bg-emerald-500/15 px-3 py-1">
        <span class="text-xs font-medium text-emerald-400">在线曲库已连接</span>
      </div>
    </div>

    <section v-if="isLoggedIn" class="mb-10">
      <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
        <div class="flex items-center gap-3 mb-5">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#e04090] to-[#5b9cff]">
            <UserRound class="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-white">我的音乐中心</h2>
            <p class="text-xs text-white/35">
              <Heart class="inline h-3 w-3 text-[#e04090] mr-1" />
              {{ auth.state.favoriteSongIds.length }} 首收藏歌曲 · {{ auth.state.favoritePlaylistIds.length }} 个收藏歌单
            </p>
          </div>
        </div>

        <div v-if="favoriteSongs.length > 0">
          <div class="mb-3 flex items-center gap-2">
            <Heart class="h-3.5 w-3.5 text-[#e04090]" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-white/50">收藏歌曲</h3>
          </div>
          <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <div
              v-for="(song, idx) in favoriteSongs" :key="'fav-' + song.id"
              class="group shrink-0 w-[160px] cursor-pointer rounded-xl bg-white/[0.04] p-2.5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] border border-white/[0.04] hover:border-white/[0.10]"
              @click="playSongFromList(song, favoriteSongs)"
              @dblclick="openSongDetail(song)"
            >
              <div class="relative mb-2.5 aspect-square overflow-hidden rounded-lg">
                <img :src="getCover(song)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <Play v-if="playingSong?.id !== song.id || !isPlaying" class="h-7 w-7 text-white" />
                  <Pause v-else class="h-7 w-7 text-white" />
                </div>
                <button
                  class="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-[#e04090] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  @click="handleToggleSongFav(song.id, $event)"
                >
                  <Heart class="h-3.5 w-3.5" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
                </button>
              </div>
              <p class="text-xs font-medium text-white/80 truncate">{{ song.title }}</p>
              <p class="text-[10px] text-white/35 truncate mt-0.5">{{ song.artist }}</p>
            </div>
          </div>
        </div>

        <div v-if="favoritePlaylists.length > 0" class="mt-5">
          <div class="mb-3 flex items-center gap-2">
            <ListMusic class="h-3.5 w-3.5 text-[#5b9cff]" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-white/50">收藏歌单</h3>
          </div>
          <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <div
              v-for="(pl, idx) in favoritePlaylists" :key="'favpl-' + pl.id"
              class="group shrink-0 w-[160px] cursor-pointer rounded-xl bg-white/[0.04] p-2.5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] border border-white/[0.04] hover:border-white/[0.10]"
              @click="openPlaylist(pl.id)"
            >
              <div class="relative mb-2.5 aspect-square overflow-hidden rounded-lg">
                <img :src="getCover(pl.coverIndex)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ListMusic class="h-7 w-7 text-white" />
                </div>
                <button
                  class="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-[#5b9cff] backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  @click="handleTogglePlaylistFav(pl.id, $event)"
                >
                  <Heart class="h-3.5 w-3.5" :class="auth.isPlaylistFavorited(pl.id) ? 'fill-[#5b9cff]' : ''" />
                </button>
              </div>
              <p class="text-xs font-medium text-white/80 truncate">{{ pl.name }}</p>
              <p class="text-[10px] text-white/35 truncate mt-0.5">{{ pl.description }}</p>
            </div>
          </div>
        </div>

        <div v-if="favoriteSongs.length === 0 && favoritePlaylists.length === 0" class="text-center py-6">
          <Heart class="mx-auto h-8 w-8 text-white/10 mb-2" />
          <p class="text-sm text-white/25">还没有收藏内容</p>
          <p class="text-xs text-white/15 mt-1">浏览下方歌曲和歌单，点击心形图标即可收藏</p>
        </div>
      </div>
    </section>

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
          <h2 class="text-sm font-semibold uppercase tracking-wider text-white/55">Trending Now</h2>
        </div>
        <div class="flex gap-2">
          <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/40 hover:bg-white/[0.10] hover:text-white/70 transition-all" @click="scrollContainer(-1, 'topScroll')">←</button>
          <button class="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/40 hover:bg-white/[0.10] hover:text-white/70 transition-all" @click="scrollContainer(1, 'topScroll')">→</button>
        </div>
      </div>
      <div data-scroll="topScroll" class="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        <div
          v-for="(song, idx) in topSongs" :key="song.id"
          class="group shrink-0 w-[180px] cursor-pointer rounded-xl bg-white/[0.03] p-3 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
          :style="{
            border: `1px solid rgba(${getGlassColor(idx).rgb},0.08)`,
          }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.25)`; el.style.boxShadow = `0 0 24px rgba(${c.rgb},0.15)`; el.style.backgroundColor = `rgba(${c.rgb},0.06)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.08)`; el.style.boxShadow = ''; el.style.backgroundColor = '' }"
          @click="playSongFromList(song, topSongs)"
          @dblclick="openSongDetail(song)"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img :src="getCover(song)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <Play v-if="playingSong?.id !== song.id || !isPlaying" class="h-8 w-8 text-white" />
              <Pause v-else class="h-8 w-8 text-white" />
            </div>
            <button
              class="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:text-[#e04090]"
              :class="auth.isSongFavorited(song.id) ? '!opacity-100 !text-[#e04090]' : ''"
              @click="handleToggleSongFav(song.id, $event)"
            >
              <Heart class="h-4 w-4" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
            </button>
          </div>
          <p class="text-sm font-medium text-white/85 truncate">{{ song.title }}</p>
          <p class="text-xs text-white/40 truncate mt-0.5">{{ song.artist }}</p>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4 text-[#e04090]" />
          <h2 class="text-sm font-semibold uppercase tracking-wider text-white/55">New Releases</h2>
        </div>
      </div>
      <div class="space-y-1">
        <div
          v-for="(song, idx) in newSongs" :key="song.id"
          class="group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer transition-all border"
          :style="{
            borderColor: `rgba(${getGlassColor(idx).rgb},0.04)`,
            backgroundColor: playingSong?.id === song.id ? `rgba(${getGlassColor(idx).rgb},0.08)` : 'transparent'
          }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.12)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.12)` : `rgba(${c.rgb},0.04)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.04)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.08)` : '' }"
          @click="playSongFromList(song, newSongs)"
          @dblclick="openSongDetail(song)"
        >
          <span class="w-6 text-right text-xs text-white/35 tabular-nums">{{ idx + 1 }}</span>
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song)" class="h-full w-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white/85 truncate">{{ song.title }}</p>
            <p class="text-xs text-white/40 truncate">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <button
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/25 hover:text-[#e04090] hover:bg-white/[0.08] transition-all"
            :class="auth.isSongFavorited(song.id) ? '!text-[#e04090]' : ''"
            @click="handleToggleSongFav(song.id, $event)"
          >
            <Heart class="h-4 w-4" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
          </button>
          <span class="text-xs text-white/30 tabular-nums">{{ formatDuration(song.duration) }}</span>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <div class="mb-4 flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-[#e04090]" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-white/55">Featured Playlists</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div
          v-for="(pl, idx) in playlists" :key="pl.id"
          class="group cursor-pointer rounded-xl bg-white/[0.03] p-3 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
          :style="{ border: `1px solid rgba(${getGlassColor(idx).rgb},0.06)` }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.2)`; el.style.boxShadow = `0 0 20px rgba(${c.rgb},0.1)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.06)`; el.style.boxShadow = '' }"
          @click="openPlaylist(pl.id)"
        >
          <div class="relative mb-3 aspect-square overflow-hidden rounded-lg">
            <img :src="getCover(pl.coverIndex)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ListMusic class="h-8 w-8 text-white" />
            </div>
            <button
              class="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:text-[#5b9cff]"
              :class="auth.isPlaylistFavorited(pl.id) ? '!opacity-100 !text-[#5b9cff]' : ''"
              @click="handleTogglePlaylistFav(pl.id, $event)"
            >
              <Heart class="h-4 w-4" :class="auth.isPlaylistFavorited(pl.id) ? 'fill-[#5b9cff]' : ''" />
            </button>
          </div>
          <p class="text-sm font-medium text-white/85 truncate">{{ pl.name }}</p>
          <p class="text-xs text-white/35 truncate mt-0.5">{{ pl.description }}</p>
        </div>
      </div>
    </section>

    <section>
      <div class="mb-4 flex items-center gap-2">
        <Search class="h-4 w-4 text-[#e04090]" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-white/55">Browse All</h2>
      </div>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[240px] max-w-[400px]">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            v-model="searchQuery" type="text" placeholder="Search songs, artists or albums..."
            class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
          />
        </div>
        <select v-model="selectedGenre" class="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white/60 outline-none backdrop-blur-sm cursor-pointer hover:bg-white/[0.06] transition-all">
          <option value="">All Genres</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <div class="space-y-0.5 max-h-[400px] overflow-y-auto pr-1">
        <div
          v-for="(song, idx) in filteredSongs" :key="song.id"
          class="group flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer transition-all border"
          :style="{
            borderColor: `rgba(${getGlassColor(idx).rgb},0.03)`,
            backgroundColor: playingSong?.id === song.id ? `rgba(${getGlassColor(idx).rgb},0.08)` : 'transparent'
          }"
          @mouseenter="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.10)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.10)` : `rgba(${c.rgb},0.03)` }"
          @mouseleave="(e: MouseEvent) => { const c = getGlassColor(idx); const el = e.currentTarget as HTMLElement; el.style.borderColor = `rgba(${c.rgb},0.03)`; el.style.backgroundColor = playingSong?.id === song.id ? `rgba(${c.rgb},0.08)` : '' }"
          @click="playSongFromList(song, filteredSongs)"
          @dblclick="openSongDetail(song)"
        >
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
            <img :src="getCover(song)" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white/85 truncate">{{ song.title }}</p>
            <p class="text-xs text-white/40 truncate">{{ song.artist }} · {{ song.album }}</p>
          </div>
          <span class="w-16 text-right shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/30">{{ song.genre }}</span>
          <button
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/20 hover:text-[#e04090] hover:bg-white/[0.08] transition-all"
            :class="auth.isSongFavorited(song.id) ? '!text-[#e04090]' : ''"
            @click="handleToggleSongFav(song.id, $event)"
          >
            <Heart class="h-3.5 w-3.5" :class="auth.isSongFavorited(song.id) ? 'fill-[#e04090]' : ''" />
          </button>
          <span class="w-12 text-right text-xs text-white/30 tabular-nums">{{ formatDuration(song.duration) }}</span>
        </div>
        <div v-if="filteredSongs.length === 0" class="flex flex-col items-center justify-center py-16">
          <Search class="mb-3 h-10 w-10 text-white/10" />
          <p class="text-sm text-white/25">No matching songs found</p>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="player-slide">
        <div v-if="playingSong" class="fixed bottom-0 left-0 right-0 z-50 ml-[240px] border-t border-white/[0.08] bg-black/75 backdrop-blur-2xl">
          <div class="absolute bottom-full left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div class="flex items-center gap-4 px-6 py-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.08]">
                <img :src="getCover(playingSong as ApiSong)" class="h-full w-full object-cover" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-white truncate">{{ playingSong.title }}</p>
                <p class="text-xs text-white/45 truncate">{{ playingSong.artist }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                class="transition-colors"
                :class="hasPrev ? 'text-white/40 hover:text-white/70' : 'text-white/15 cursor-not-allowed'"
                :disabled="!hasPrev"
                @click="skipPrev"
              >
                <SkipBack class="h-5 w-5" />
              </button>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-all"
                @click="isPlaying ? pauseSong() : resumeSong()"
              >
                <Loader2 v-if="isLoadingAudioUrl" class="h-4 w-4 animate-spin" />
                <Pause v-else-if="isPlaying" class="h-4 w-4" />
                <Play v-else class="h-4 w-4 ml-0.5" />
              </button>
              <button
                class="transition-colors"
                :class="hasNext ? 'text-white/40 hover:text-white/70' : 'text-white/15 cursor-not-allowed'"
                :disabled="!hasNext"
                @click="skipNext"
              >
                <SkipForward class="h-5 w-5" />
              </button>
            </div>

            <div class="flex items-center gap-3 w-[280px] shrink-0">
              <span class="text-xs text-white/45 tabular-nums w-10 text-right">{{ formatDuration(currentTime) }}</span>
              <div class="flex-1 h-1 rounded-full bg-white/[0.10] overflow-hidden cursor-pointer group/progress">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-[#e04090] to-[#5b9cff] transition-all duration-1000"
                  :style="{ width: progressPercent() }"
                />
              </div>
              <span class="text-xs text-white/45 tabular-nums w-10">{{ formatDuration(duration) }}</span>
            </div>
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
