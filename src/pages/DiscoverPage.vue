<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { songs as examples } from '@/data/songs'
import type { Song } from '@/data/songs'
import { playlists, getPlaylistSongs } from '@/data/playlists'
import { albumCatalog } from '@/data/albumCatalog'
import { searchSongs } from '@/composables/useMusicApi'
import { library, rememberSongs, importSong } from '@/composables/usePersonalLibrary'
import { musicPlayer, playMusic, pauseMusic } from '@/composables/useMusicPlayer'
import { openInWorkbench, handoff } from '@/composables/useWorkbenchHandoff'
import SongActions from '@/components/SongActions.vue'
import SongDetailModal from '@/components/SongDetailModal.vue'
import { t } from '@/i18n'

interface DiscoverModule {
  id: string
  title: string
  description: string
  cover: string
  color: string
  tracks: Song[]
  kind: 'theme' | 'category' | 'playlist' | 'album'
  sourceUrl?: string
}
interface PageTransition {
  finished: Promise<void>
  skipTransition: () => void
}
type TransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => PageTransition
}

const router = useRouter()
const route = useRoute()
const query = ref('')
const remote = ref<Song[]>([])
const loading = ref(false)
const notice = ref('')
const detail = ref<Song | null>(null)
const importing = ref(false)
const expandedId = ref<string | null>(null)
const transitionKey = ref<string | null>(null)
const animating = ref(false)
const closeButton = ref<HTMLButtonElement>()
let searchRevision = 0
let transitionRevision = 0
let activeTransition: PageTransition | undefined
let gridScroll = 0
let openedFromGrid = false
let disposed = false
let mounted = false

const collection = computed(() => {
  const map = new Map<string, Song>()
  const catalog = [...library.catalog.filter(song => song.localKey), ...remote.value, ...examples, ...albumCatalog.flatMap(album => album.tracks)]
  catalog.forEach(song => map.set(song.id, song))
  return [...map.values()]
})
const searchResults = computed(() => collection.value.filter(song =>
  (song.title + ' ' + song.artist + ' ' + song.album).toLowerCase().includes(query.value.toLowerCase())
))
const themes = computed<DiscoverModule[]>(() => [
  {
    id: 'theme:featured', title: t('explore.featured'), description: t('explore.featuredDescription'),
    cover: '/albums/album-32.jpg', color: '#4b4a77', kind: 'theme',
    tracks: remote.value.length ? remote.value.slice(0, 16) : albumCatalog.flatMap(album => album.tracks.slice(0, 2)).slice(0, 16),
  },
  {
    id: 'theme:local', title: t('explore.local'), description: t('explore.localDescription'),
    cover: '/albums/album-33.jpg', color: '#254e54', kind: 'theme',
    tracks: library.catalog.filter(song => song.localKey),
  },
  {
    id: 'theme:recent', title: t('personal.continueListening'), description: t('explore.recentDescription'),
    cover: '/albums/album-9.jpg', color: '#5d394f', kind: 'theme', tracks: library.recent,
  },
])
const categoryDefinitions = [
  { genre: 'Pop', color: '#b74667', cover: 5 },
  { genre: 'Electronic', color: '#395ca8', cover: 2 },
  { genre: 'Rock', color: '#a35636', cover: 4 },
  { genre: 'Jazz', color: '#93702a', cover: 10 },
  { genre: 'R&B', color: '#70519e', cover: 8 },
  { genre: 'Classical', color: '#306f60', cover: 3 },
]
const categories = computed<DiscoverModule[]>(() => categoryDefinitions.map(item => ({
  id: 'category:' + item.genre,
  title: t('explore.genre.' + item.genre),
  description: t('explore.categoryDescription', { genre: t('explore.genre.' + item.genre) }),
  cover: '/albums/album-' + (albumCatalog.find(album => album.genre === item.genre)?.coverIndex || item.cover) + '.jpg', color: item.color, kind: 'category',
  tracks: collection.value.filter(song => song.genre === item.genre),
})))
const playlistModules = computed<DiscoverModule[]>(() => playlists.map(list => ({
  id: 'playlist:' + list.id, title: list.name, description: list.description,
  cover: '/albums/album-' + list.coverIndex + '.jpg', color: '#355447', kind: 'playlist',
  tracks: getPlaylistSongs(list),
})))
const albumModules = computed<DiscoverModule[]>(() => albumCatalog.map(album => ({
  id: 'album:' + album.id, title: album.title, description: album.artist,
  cover: '/albums/album-' + album.coverIndex + '.jpg', color: '#293b4c', kind: 'album',
  tracks: album.tracks, sourceUrl: album.sourceUrl,
})))
const modules = computed(() => [...themes.value, ...categories.value, ...albumModules.value, ...playlistModules.value])
const selected = computed(() => modules.value.find(item => item.id === expandedId.value))
const playableTracks = computed(() => selected.value?.tracks.filter(isPlayable) || [])

function isPlayable(song: Song) { return !!(song.localKey || song.audioSrc || song.audioUrl) }
function cover(song: Song) { return song.coverUrl || '/albums/album-' + song.coverIndex + '.jpg' }
function clock(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}
function toggle(song: Song) {
  if (musicPlayer.song?.id === song.id && musicPlayer.playing) pauseMusic()
  else void playMusic(song, selected.value?.tracks || searchResults.value)
}
async function separateSong(song: Song) {
  if (await openInWorkbench(song)) router.push('/')
}
function openModule(id: string) {
  if (animating.value) return
  gridScroll = window.scrollY
  openedFromGrid = true
  transitionKey.value = id
  router.push({ path: '/discover', query: { view: id } })
}
function closeModule() {
  if (animating.value) return
  if (openedFromGrid) router.back()
  else router.replace({ path: '/discover' })
}
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && expandedId.value && !detail.value) {
    event.preventDefault()
    closeModule()
  }
}

watch(() => route.query.view, async value => {
  const next = typeof value === 'string' ? value : null
  const previous = expandedId.value
  if (next === previous) return
  const revision = ++transitionRevision
  transitionKey.value = next || previous
  activeTransition?.skipTransition()
  const update = async () => {
    if (revision !== transitionRevision || disposed) return
    expandedId.value = next
    await nextTick()
    window.scrollTo({ top: next ? 0 : gridScroll, behavior: 'instant' as ScrollBehavior })
  }
  const transitionDocument = document as TransitionDocument
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animating.value = true
  await nextTick()
  if (revision !== transitionRevision || disposed) return
  const changesLayout = (previous === null) !== (next === null)
  if (mounted && transitionDocument.startViewTransition && !reduceMotion && changesLayout) {
    activeTransition = transitionDocument.startViewTransition(update)
    await activeTransition.finished.catch(() => {})
  } else {
    await update()
  }
  if (revision !== transitionRevision || disposed) return
  animating.value = false
  await nextTick()
  if (next) closeButton.value?.focus({ preventScroll: true })
  else {
    const origin = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-discover-module]'))
      .find(button => button.dataset.discoverModule === transitionKey.value)
    origin?.focus({ preventScroll: true })
    openedFromGrid = false
  }
}, { immediate: true })

async function search() {
  const revision = ++searchRevision
  loading.value = true
  notice.value = ''
  try {
    const results = await searchSongs(query.value, 24)
    if (revision !== searchRevision || disposed) return
    remote.value = results.map((song, index) => ({
      id: song.id, title: song.title, artist: song.artist, album: song.album,
      duration: song.duration, coverIndex: index % 30 + 1, coverUrl: song.coverUrl,
      audioSrc: song.audioUrl, genre: '', year: 0,
    }))
    rememberSongs(remote.value)
    notice.value = results.length ? '' : t('explore.remoteUnavailable')
  } catch {
    notice.value = t('personal.storageError')
  } finally {
    if (revision === searchRevision && !disposed) loading.value = false
  }
}
async function addFiles(event: Event) {
  const input = event.target as HTMLInputElement
  importing.value = true
  try {
    for (const file of Array.from(input.files || [])) await importSong(file)
    notice.value = t('personal.imported')
  } catch {
    notice.value = t('personal.storageError')
  } finally {
    importing.value = false
    input.value = ''
  }
}
onMounted(() => {
  mounted = true
  void search()
  window.addEventListener('keydown', handleEscape)
})
onUnmounted(() => {
  disposed = true
  searchRevision++
  transitionRevision++
  activeTransition?.skipTransition()
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="library-page explore-page mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
    <template v-if="!expandedId">
      <header class="explore-toolbar">
        <div>
          <p class="explore-eyebrow">AudioSift</p>
          <h1 class="mt-1 text-3xl font-semibold">{{ t('nav.discover') }}</h1>
        </div>
        <form class="explore-search" @submit.prevent="search">
          <input v-model="query" class="library-input min-w-0 flex-1" :aria-label="t('personal.searchSongs')" :placeholder="t('personal.searchSongs')" />
          <button class="library-button" :disabled="loading">{{ loading ? t('personal.searching') : t('personal.search') }}</button>
          <button v-if="query" type="button" class="library-icon-button" :aria-label="t('explore.clearSearch')" @click="query = ''">×</button>
        </form>
        <label class="library-button cursor-pointer">
          {{ importing ? t('upload.decoding') : t('personal.importAudio') }}
          <input class="sr-only" type="file" accept="audio/*" multiple :disabled="importing" @change="addFiles" />
        </label>
      </header>
      <p v-if="notice" class="mb-6 text-sm text-white/65" role="status">{{ notice }}</p>

      <template v-if="!query.trim()">
        <section class="explore-themes" aria-labelledby="explore-themes-title" style="view-transition-name: explore-themes">
          <h2 id="explore-themes-title" class="sr-only">{{ t('explore.themes') }}</h2>
          <button v-for="item in themes.slice(0,2)" :key="item.id"
            class="explore-feature discover-module" :data-discover-module="item.id"
            :style="{ viewTransitionName: transitionKey === item.id ? 'discover-focus' : undefined, backgroundColor: item.color }"
            :disabled="animating" :aria-label="t('explore.open', { title: item.title })" @click="openModule(item.id)">
            <img :src="item.cover" class="explore-feature-image" alt="" fetchpriority="high" />
            <span class="explore-feature-shade" />
            <span class="explore-feature-copy">
              <span class="explore-eyebrow">{{ t('explore.themeLabel') }}</span>
              <span class="mt-3 block text-3xl font-semibold lg:text-4xl">{{ item.title }}</span>
              <span class="mt-3 block max-w-sm text-sm leading-6 text-white/80">{{ item.description }}</span>
              <span class="explore-entry">{{ t('explore.openCollection') }} <span aria-hidden="true">↗</span></span>
            </span>
          </button>
        </section>

        <section class="explore-section" aria-labelledby="explore-categories-title" style="view-transition-name: explore-categories">
          <div class="explore-section-heading">
            <h2 id="explore-categories-title">{{ t('explore.categories') }}</h2>
            <span class="text-sm text-white/55">{{ t('explore.categoriesHint') }}</span>
          </div>
          <div class="explore-category-grid">
            <button v-for="item in categories" :key="item.id" class="explore-category discover-module"
              :data-discover-module="item.id"
              :style="{ backgroundColor: item.color, viewTransitionName: transitionKey === item.id ? 'discover-focus' : undefined }"
              :disabled="animating" :aria-label="t('explore.open', { title: item.title })" @click="openModule(item.id)">
              <img :src="item.cover" alt="" loading="lazy" />
              <span class="explore-category-tint" />
              <span class="explore-category-name">{{ item.title }}</span>
              <span class="explore-category-arrow" aria-hidden="true">↗</span>
            </button>
          </div>
        </section>

        <section v-if="themes[2].tracks.length" class="explore-section">
          <div class="explore-section-heading"><h2>{{ t('personal.continueListening') }}</h2></div>
          <button class="explore-recent discover-module" :data-discover-module="themes[2].id"
            :style="{ viewTransitionName: transitionKey === themes[2].id ? 'discover-focus' : undefined }"
            :disabled="animating" @click="openModule(themes[2].id)">
            <span class="flex -space-x-5">
              <img v-for="song in themes[2].tracks.slice(0,3)" :key="song.id" :src="cover(song)" class="h-20 w-20 rounded-2xl border-2 border-[#151c25] object-cover" alt="" />
            </span>
            <span class="flex-1 text-left"><span class="block text-lg font-semibold">{{ t('explore.recentDescription') }}</span><span class="mt-1 block text-sm text-white/60">{{ themes[2].tracks.length }} {{ t('personal.tracks') }}</span></span>
            <span aria-hidden="true">↗</span>
          </button>
        </section>

        <section class="explore-section" aria-labelledby="explore-albums-title" style="view-transition-name: explore-albums">
          <div class="explore-section-heading"><h2 id="explore-albums-title">{{ t('explore.albums') }}</h2><a href="/album-artwork-credits.json" target="_blank" rel="noopener noreferrer" class="text-xs text-white/55">{{ t('explore.artworkCredit') }}</a></div>
          <div class="explore-album-grid">
            <button v-for="item in albumModules" :key="item.id" class="explore-album discover-module" :data-discover-module="item.id" :style="{ viewTransitionName: transitionKey === item.id ? 'discover-focus' : undefined }" :disabled="animating" :aria-label="t('explore.open', { title: item.title })" @click="openModule(item.id)">
              <img :src="item.cover" :alt="item.title + ' — ' + item.description" loading="lazy" />
              <span class="explore-album-copy"><strong>{{ item.title }}</strong><span>{{ item.description }}</span></span>
            </button>
          </div>
        </section>

        <section class="explore-section" aria-labelledby="explore-playlists-title" style="view-transition-name: explore-playlists">
          <div class="explore-section-heading"><h2 id="explore-playlists-title">{{ t('personal.explorePlaylists') }}</h2></div>
          <div class="explore-playlist-grid">
            <button v-for="item in playlistModules" :key="item.id" class="explore-playlist discover-module"
              :data-discover-module="item.id"
              :style="{ viewTransitionName: transitionKey === item.id ? 'discover-focus' : undefined, backgroundColor: item.color }"
              :disabled="animating" :aria-label="t('explore.open', { title: item.title })" @click="openModule(item.id)">
              <img :src="item.cover" alt="" class="aspect-square w-full object-cover" loading="lazy" />
              <span class="block px-4 pb-4 pt-3 text-left"><span class="block truncate font-semibold">{{ item.title }}</span><span class="mt-1 block text-xs text-white/65">{{ item.tracks.length }} {{ t('personal.tracks') }} · {{ t('explore.openCollection') }}</span></span>
            </button>
          </div>
        </section>
      </template>

      <section v-else class="glass-card p-5" aria-labelledby="explore-search-title" aria-live="polite">
        <h2 id="explore-search-title" class="mb-4 text-xl font-semibold">{{ t('personal.searchResults') }} · {{ searchResults.length }}</h2>
        <div v-for="song in searchResults" :key="song.id" class="library-song-row">
          <button class="library-icon-button" :disabled="!isPlayable(song)" :aria-label="t('player.play') + song.title" @click="toggle(song)">▶</button>
          <img :src="cover(song)" class="h-12 w-12 rounded-xl object-cover" alt="" />
          <button class="min-w-0 flex-1 text-left" @click="detail = song"><span class="block truncate font-medium">{{ song.title }}</span><span class="text-xs text-white/60">{{ song.artist }}</span></button>
          <span v-if="!isPlayable(song)" class="text-xs text-white/55">{{ t('personal.sample') }}</span>
          <SongActions :song="song" />
        </div>
        <p v-if="!searchResults.length" class="library-empty">{{ t('personal.noTracks') }}</p>
      </section>
    </template>

    <section v-else-if="selected" class="explore-detail" style="view-transition-name: discover-focus" aria-labelledby="explore-detail-title">
      <header class="explore-detail-hero" :style="{ backgroundColor: selected.color }">
        <img :src="selected.cover" alt="" class="explore-detail-photo" />
        <div class="explore-detail-shade" />
        <button ref="closeButton" class="explore-close library-button" :disabled="animating" @click="closeModule">← {{ t('explore.back') }}</button>
        <div class="explore-detail-copy">
          <p class="explore-eyebrow">{{ t('explore.' + selected.kind + 'Label') }}</p>
          <h1 id="explore-detail-title" class="mt-3 text-4xl font-semibold tracking-tight lg:text-5xl">{{ selected.title }}</h1>
          <p class="mt-4 max-w-2xl text-sm leading-6 text-white/80">{{ selected.description }}</p>
          <p class="mt-3 text-xs text-white/65">{{ selected.tracks.length }} {{ t('personal.tracks') }}</p>
        </div>
      </header>
      <div class="explore-detail-body">
        <div class="mb-6 flex flex-wrap items-center gap-3">
          <button class="library-primary" :disabled="!playableTracks.length || animating" @click="playMusic(playableTracks[0],playableTracks)">▶ {{ t('explore.playCollection') }}</button>
          <a v-if="selected.sourceUrl" :href="selected.sourceUrl" target="_blank" rel="noopener noreferrer" class="library-button">{{ t('explore.viewAlbum') }}</a>
          <label v-if="selected.id === 'theme:local'" class="library-button cursor-pointer">{{ t('personal.importAudio') }}<input class="sr-only" type="file" accept="audio/*" multiple :disabled="importing" @change="addFiles" /></label>
          <p class="text-sm text-white/60">{{ t('explore.browseHint') }}</p>
        </div>
        <p v-if="notice && selected.id === 'theme:local'" class="mb-4 text-sm text-white/65" role="status">{{ notice }}</p>
        <p v-if="handoff.error" class="mb-4 text-rose-200" role="alert">{{ t(handoff.error) }}</p>
        <p v-if="selected.tracks.length && !playableTracks.length" class="mb-5 text-sm text-amber-100/80">{{ t('explore.sampleHint') }}</p>
        <div class="explore-track-list">
          <div v-for="(song,index) in selected.tracks" :key="song.id" class="library-song-row explore-track-row">
            <span class="w-5 shrink-0 text-center text-xs text-white/45">{{ index + 1 }}</span>
            <button class="library-icon-button" :disabled="!isPlayable(song)" :aria-label="(musicPlayer.song?.id === song.id && musicPlayer.playing ? t('player.pause') : t('player.play')) + song.title" @click="toggle(song)">{{ musicPlayer.song?.id === song.id && musicPlayer.playing ? 'Ⅱ' : '▶' }}</button>
            <img :src="cover(song)" class="h-12 w-12 shrink-0 rounded-xl object-cover" alt="" />
            <button class="min-w-0 flex-1 text-left" @click="detail = song"><span class="block truncate font-medium">{{ song.title }}</span><span class="block truncate text-xs text-white/60">{{ song.artist }}</span></button>
            <span class="hidden text-xs text-white/50 xl:block">{{ isPlayable(song) ? clock(song.duration) : t('personal.sample') }}</span>
            <button class="library-button hidden lg:block" :disabled="!isPlayable(song) || handoff.busy" @click="separateSong(song)">{{ t('personal.separate') }}</button>
            <SongActions :song="song" />
          </div>
        </div>
        <div v-if="!selected.tracks.length" class="explore-empty">
          <h2 class="text-xl font-semibold">{{ t('explore.emptyTitle') }}</h2>
          <p class="mt-3 text-sm text-white/60">{{ selected.id === 'theme:local' ? t('explore.emptyLocal') : t('personal.noTracks') }}</p>
        </div>
      </div>
    </section>
    <section v-else class="glass-card p-8">
      <h1 class="text-xl font-semibold">{{ t('explore.notFound') }}</h1>
      <button ref="closeButton" class="library-button mt-5" @click="closeModule">{{ t('explore.back') }}</button>
    </section>
    <SongDetailModal :song="detail" :visible="!!detail" @close="detail = null" @play="song => { toggle(song); detail = null }" />
  </div>
</template>
