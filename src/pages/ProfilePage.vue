<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/composables/useAuthStore'
import { library, libraryOwner, libraryFeedback, defaultLayout, saveCardOrder, createPlaylist, renamePlaylist, deletePlaylist, removeFromPlaylist, deleteMaterial, downloadAudio } from '@/composables/usePersonalLibrary'
import type { ModuleId, Material } from '@/composables/usePersonalLibrary'
import { musicPlayer, playMusic } from '@/composables/useMusicPlayer'
import { openInWorkbench, handoff } from '@/composables/useWorkbenchHandoff'
import { songs as exampleSongs } from '@/data/songs'
import { playlists as featuredPlaylists } from '@/data/playlists'
import type { Song } from '@/data/songs'
import SongActions from '@/components/SongActions.vue'
import LibraryCoverCard from '@/components/LibraryCoverCard.vue'
import LibraryDialog from '@/components/LibraryDialog.vue'
import SongDetailModal from '@/components/SongDetailModal.vue'
import { ListMusic, AudioLines, Heart, History, ArrowUpRight, Plus, Music2, Play, FolderOpen } from 'lucide-vue-next'
import { t } from '@/i18n'

const auth = useAuthStore()
const router = useRouter()
const editing = ref(false)
const collection = ref<ModuleId | ''>('')
const order = ref<string[]>([...library.cardOrder])
const dragging = ref<string | null>(null)
const dragCard = ref({ x: 0, y: 0, width: 0, height: 0 })
let dragOffset = { x: 0, y: 0 }
const message = ref('')
const selectedAsset = ref('')
const detail = ref<Song | null>(null)
const selectedList = ref('')
const renamed = ref('')
const filter = ref('')
const confirmDelete = ref('')
const busy = ref(false)
const playlist = computed(() => library.playlists.find(list => list.id === selectedList.value))
const material = computed(() => library.assets.find(asset => asset.id === selectedAsset.value))
const assets = computed(() => library.assets.filter(asset => asset.fileName.toLowerCase().includes(filter.value.toLowerCase())))
const favorites = computed(() => {
  const all = new Map([...exampleSongs, ...library.catalog].map(song => [song.id, song]))
  return auth.state.favoriteSongIds.map(id => all.get(id) || {
    id, title: t('personal.savedUnknown') + ' ' + id, artist: t('api.unknownArtist'),
    album: '', duration: 0, coverIndex: 1, genre: '', year: 0,
  })
})
const savedFeatured = computed(() => featuredPlaylists.filter(p => auth.isPlaylistFavorited(p.id)))
const cardData = computed(() => [
  { id: 'playlists', title: t('personal.module.playlists'), subtitle: t('personal.playlistCount', { n: library.playlists.length }), cover: playlistCover(library.playlists.find(list => list.songs.length)?.songs || []), icon: ListMusic, accent: '#a777ff' },
  { id: 'assets', title: t('personal.module.assets'), subtitle: t('personal.itemCount', { n: library.assets.length }), cover: library.assets[0] ? materialCover(library.assets[0]) : '', icon: AudioLines, accent: '#459bfa' },
  { id: 'favorites', title: t('personal.module.favorites'), subtitle: t('personal.itemCount', { n: favorites.value.length + savedFeatured.value.length }), cover: cover(favorites.value[0]), icon: Heart, accent: '#ed569b' },
  { id: 'recent', title: t('personal.module.recent'), subtitle: trackCount(library.recent.length), cover: cover(library.recent[0]), icon: History, accent: '#e5a548' },
  ...library.playlists.map(list => ({ id: 'playlist:' + list.id, title: list.name, subtitle: trackCount(list.songs.length), cover: playlistCover(list.songs), icon: Music2, accent: '#a777ff' })),
])
const cards = computed(() => {
  const map = new Map(cardData.value.map(card => [card.id, card]))
  return [...new Set([...(editing.value ? order.value : library.cardOrder), ...map.keys()])].flatMap(id => {
    const card = map.get(id); return card ? [card] : []
  })
})
function openCard(id: string) {
  message.value = ''
  if (id.startsWith('playlist:')) selectedList.value = id.slice(9)
  else collection.value = id as ModuleId
}
watch(() => cardData.value.map(card => card.id).join(','), () => {
  if (!editing.value) return
  const keys = new Set(cardData.value.map(card => card.id))
  order.value = [...new Set([...order.value.filter(key => keys.has(key)), ...keys])]
})
watch(libraryOwner, () => { stopDrag(); editing.value = false; selectedList.value = ''; confirmDelete.value = ''; message.value = ''; collection.value = ''; selectedAsset.value = ''; detail.value = null })
watch(() => playlist.value?.name, name => { renamed.value = name || '' }, { immediate: true })
function action(callback: () => void) {
  try { callback(); message.value = t('personal.saved') } catch { message.value = t('personal.storageError') }
}
function beginEdit() { order.value = [...library.cardOrder]; editing.value = true; message.value = '' }
function finishEdit() { action(() => { saveCardOrder(order.value); editing.value = false }) }
function restoreLayout() { order.value = [...defaultLayout, ...library.playlists.map(list => 'playlist:' + list.id)]; message.value = t('personal.defaultPreview') }
async function addList() {
  let count = 1
  const base = t('personal.newPlaylist')
  while (library.playlists.some(list => list.name === base + ' ' + count)) count++
  let id = ''
  action(() => { id = createPlaylist(base + ' ' + count) })
  collection.value = ''
  await nextTick()
  if (id) document.querySelector<HTMLButtonElement>('[data-card="playlist:' + id + '"] .cover-card-open')?.focus()
}
function cover(song?: Song) {
  if (!song) return ''
  if (song.coverUrl) return song.coverUrl
  if (song.localKey && !song.album) return ''
  return '/albums/album-' + song.coverIndex + '.jpg'
}
function playlistCover(songs: Song[]) { return cover(songs[songs.length - 1]) }
function canPlay(song: Song) { return !!(song.localKey || song.audioSrc || song.audioUrl) }
function playList(songs: Song[]) {
  const available = songs.filter(canPlay)
  if (available.length) void playMusic(available[0], available)
}
function materialCover(asset: Material) { return cover(library.catalog.find(song => song.title === asset.fileName)) }
function trackCount(count: number) { return t('personal.trackCount', { n: count }) }
function closePlaylist() { selectedList.value = ''; confirmDelete.value = '' }
function closeMaterial() { selectedAsset.value = ''; confirmDelete.value = '' }
function startDrag(event: PointerEvent, id: string) {
  if (event.button !== 0) return
  event.preventDefault()
  const card = (event.currentTarget as HTMLElement).closest('.profile-tile')
  if (!card) return
  const rect = card.getBoundingClientRect()
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  dragCard.value = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  dragging.value = id
  window.addEventListener('pointermove', dragMove)
  window.addEventListener('pointerup', stopDrag, { once: true })
  window.addEventListener('pointercancel', stopDrag, { once: true })
}
function dragMove(event: PointerEvent) {
  dragCard.value.x = event.clientX - dragOffset.x
  dragCard.value.y = event.clientY - dragOffset.y
  const cards = document.querySelectorAll<HTMLElement>('[data-card]')
  const target = Array.from(cards).find(card => {
    const grid = card.offsetParent as HTMLElement | null
    if (!grid) return false
    const origin = grid.getBoundingClientRect()
    const left = origin.left + card.offsetLeft
    const top = origin.top + card.offsetTop
    return event.clientX >= left && event.clientX <= left + card.offsetWidth
      && event.clientY >= top && event.clientY <= top + card.offsetHeight
  })?.dataset.card
  if (target && dragging.value && target !== dragging.value) {
    const next = [...order.value]
    const from = next.indexOf(dragging.value), to = next.indexOf(target)
    next.splice(from, 1); next.splice(to, 0, dragging.value)
    order.value = next
  }
  if (event.clientY > window.innerHeight - 90) window.scrollBy(0, 16)
  if (event.clientY < 90) window.scrollBy(0, -16)
}
function stopDrag() {
  dragging.value = null
  window.removeEventListener('pointermove', dragMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}
function moveModule(id: string, direction: number) {
  const index = order.value.indexOf(id), target = index + direction
  if (target < 0 || target >= order.value.length) return
  const next = [...order.value]; [next[index], next[target]] = [next[target], next[index]]; order.value = next
}
async function openMaterial(asset: Material) { if (await openInWorkbench(asset)) router.push('/') }
async function removeMaterial(asset: Material) {
  busy.value = true
  try { await deleteMaterial(asset); confirmDelete.value = ''; message.value = t('personal.deleted') }
  catch { message.value = t('personal.storageError') }
  finally { busy.value = false }
}
function materialSong(asset: Material, stem: string): Song {
  const info = asset.stems[stem]
  return { id: asset.id + ':' + stem, localKey: info.key, title: asset.fileName + ' · ' + t('stem.' + stem), artist: t('personal.materials'), album: '', coverIndex: 1, duration: info.duration, genre: '', year: 0 }
}
function listen(asset: Material, stem: string) { void playMusic(materialSong(asset, stem)) }
async function download(asset: Material, stem: string) {
  try { await downloadAudio(asset.stems[stem].key, asset.fileName.replace(/\.[^.]+$/, '') + '-' + stem + '.wav') }
  catch { message.value = t('personal.storageError') }
}
onUnmounted(stopDrag)
</script>

<template>
  <div class="library-page profile-page relative min-h-screen px-6 py-10">
    <div class="relative z-10 mx-auto max-w-6xl">
      <header class="profile-account profile-identity flex flex-wrap items-center justify-between gap-6">
        <div class="flex items-center gap-5">
          <div class="profile-avatar">{{ auth.state.user?.username.slice(0,1).toUpperCase() || '♪' }}</div>
          <div><h1 class="text-3xl font-semibold text-white">{{ auth.state.user?.username || t('personal.guest') }}</h1><p class="mt-2 text-sm">{{ auth.state.user?.email || t('personal.guestHint') }}</p><p class="mt-3 text-xs text-white/55">{{ t('personal.localStorage') }}</p></div>
        </div>
        <button v-if="!auth.isLoggedIn()" class="library-primary" @click="router.push('/auth?next=/profile')">{{ t('sidebar.login') }}</button><button v-else class="library-button" @click="auth.clearAuth()">{{ t('sidebar.logout') }}</button>
      </header>
      <div class="profile-library-toolbar">
        <div><button v-if="collection" class="profile-back" @click="collection = ''; message = ''">← {{ t('personal.backLibrary') }}</button><h2>{{ collection ? t('personal.module.' + collection) : t('personal.space') }}</h2></div>
        <div class="flex flex-wrap gap-2">
          <template v-if="editing"><button class="library-button" @click="restoreLayout">{{ t('personal.restore') }}</button><button class="library-button" @click="editing = false; stopDrag()">{{ t('personal.cancel') }}</button><button class="library-primary" @click="finishEdit">{{ t('personal.done') }}</button></template>
          <template v-else><button v-if="!collection" class="library-button" @click="beginEdit">{{ t('personal.editLayout') }}</button><button class="library-primary inline-flex items-center gap-2" @click="addList"><Plus class="h-4 w-4" aria-hidden="true" />{{ t('personal.newPlaylist') }}</button></template>
        </div>
      </div>
      <p v-if="editing" class="mb-5 text-sm text-white/60">{{ t('personal.cardDragHint') }}</p>
      <p v-if="message" class="mb-4 text-sm" role="status">{{ message }}</p><p v-if="libraryFeedback.error" class="mb-4 text-rose-200" role="alert">{{ t(libraryFeedback.error) }}</p>
      <TransitionGroup v-if="!collection" name="module-grid" tag="div" class="profile-music-grid" :class="{ 'is-editing': editing }">
        <div v-for="card in cards" :key="card.id" :data-card="card.id" class="profile-slot" :class="{ 'drop-slot': dragging === card.id }" :style="dragging === card.id ? { minHeight: dragCard.height + 'px' } : undefined">
          <Teleport to="body" :disabled="dragging !== card.id">
            <section class="profile-tile" :class="{ 'is-lifted': dragging === card.id }" :style="{ '--module-accent': card.accent, ...(dragging === card.id ? { position: 'fixed', left: dragCard.x + 'px', top: dragCard.y + 'px', width: dragCard.width + 'px', height: dragCard.height + 'px', zIndex: 150 } : {}) }">
              <LibraryCoverCard :title="card.title" :subtitle="card.subtitle" :cover="card.cover" :inert="editing" @open="openCard(card.id)"><template #art><component :is="card.icon" aria-hidden="true" /></template></LibraryCoverCard>
              <div v-if="editing" class="profile-tile-tools"><button class="library-icon-button" :disabled="cards[0]?.id === card.id" :aria-label="t('personal.moveUp') + card.title" @click="moveModule(card.id,-1)">←</button><button class="library-icon-button" :disabled="cards[cards.length - 1]?.id === card.id" :aria-label="t('personal.moveDown') + card.title" @click="moveModule(card.id,1)">→</button><button class="library-icon-button module-grip" :aria-label="t('personal.drag') + card.title" @pointerdown="startDrag($event,card.id)">⠿</button></div>
            </section>
          </Teleport>
        </div>
      </TransitionGroup>
      <div v-else class="profile-collection-view">
        <template v-if="collection === 'playlists'">
          <div v-if="library.playlists.length" class="profile-music-grid"><LibraryCoverCard v-for="list in library.playlists" :key="list.id" :title="list.name" :subtitle="trackCount(list.songs.length)" :cover="playlistCover(list.songs)" :playable="list.songs.some(canPlay)" @open="selectedList = list.id" @play="playList(list.songs)" /></div>
          <p v-else class="library-empty">{{ t('personal.emptyPlaylists') }}</p>
        </template>
        <template v-else-if="collection === 'assets'">
          <input v-if="library.assets.length" v-model="filter" class="library-input mb-6 w-full max-w-md" :aria-label="t('personal.searchAssets')" :placeholder="t('personal.searchAssets')" />
          <div v-if="assets.length" class="profile-music-grid"><LibraryCoverCard v-for="asset in assets" :key="asset.id" :data-material="asset.id" :title="asset.fileName" :subtitle="asset.range.startTime.toFixed(1) + '–' + asset.range.endTime.toFixed(1) + ' s · ' + t('personal.stemCount', { n: Object.keys(asset.stems).length })" :cover="materialCover(asset)" @open="selectedAsset = asset.id"><template #art><AudioLines aria-hidden="true" /></template></LibraryCoverCard></div>
          <div v-else class="library-module-empty"><AudioLines aria-hidden="true" /><p>{{ library.assets.length ? t('personal.noTracks') : t('personal.emptyAssets') }}</p><RouterLink to="/" class="library-button">{{ t('personal.goSeparate') }}</RouterLink></div>
        </template>
        <template v-else-if="collection === 'favorites'">
          <div v-if="favorites.length || savedFeatured.length" class="profile-music-grid"><LibraryCoverCard v-for="song in favorites" :key="song.id" :title="song.title" :subtitle="song.artist" :cover="cover(song)" :playable="canPlay(song)" :active="musicPlayer.song?.id === song.id && musicPlayer.playing" @open="detail = song" @play="playMusic(song,favorites.filter(canPlay))"><template #actions><SongActions :song="song" /></template></LibraryCoverCard><LibraryCoverCard v-for="list in savedFeatured" :key="list.id" :title="list.name" :subtitle="trackCount(list.songIds.length)" :cover="'/albums/album-' + list.coverIndex + '.jpg'" @open="router.push('/discover/playlist/' + list.id)" /></div>
          <div v-else class="library-module-empty"><Heart aria-hidden="true" /><p>{{ auth.isLoggedIn() ? t('personal.emptyFavorites') : t('personal.loginFavorites') }}</p><button class="library-button" @click="router.push(auth.isLoggedIn() ? '/discover' : '/auth?next=/profile')">{{ auth.isLoggedIn() ? t('personal.goDiscover') : t('sidebar.login') }}</button></div>
        </template>
        <template v-else>
          <div v-if="library.recent.length" class="profile-music-grid"><LibraryCoverCard v-for="song in library.recent" :key="song.id" :title="song.title" :subtitle="musicPlayer.song?.id === song.id && musicPlayer.playing ? t('personal.nowPlaying') : song.artist" :cover="cover(song)" :playable="canPlay(song)" :active="musicPlayer.song?.id === song.id && musicPlayer.playing" @open="detail = song" @play="playMusic(song,library.recent.filter(canPlay))"><template #actions><SongActions :song="song" /></template></LibraryCoverCard></div>
          <div v-else class="library-module-empty"><History aria-hidden="true" /><p>{{ t('personal.emptyRecent') }}</p><RouterLink to="/discover" class="library-button">{{ t('personal.goDiscover') }}</RouterLink></div>
        </template>
      </div>
      <RouterLink to="/about" class="profile-about-link">{{ t('personal.aboutHelp') }}<ArrowUpRight class="h-4 w-4" aria-hidden="true" /></RouterLink>
    </div>

    <LibraryDialog :status="message" :open="!!playlist" :title="playlist?.name || ''" @close="closePlaylist">
      <template v-if="playlist">
        <div class="library-collection-heading"><div class="library-collection-art"><img v-if="playlistCover(playlist.songs)" :src="playlistCover(playlist.songs)" alt="" /><Music2 v-else aria-hidden="true" /></div><div><p>{{ trackCount(playlist.songs.length) }}</p><p class="library-collection-note">{{ t('personal.playlistCoverHint') }}</p></div></div>
        <div class="library-dialog-actions"><button class="library-primary inline-flex items-center gap-2" :disabled="!playlist.songs.some(canPlay)" @click="playList(playlist.songs)"><Play class="h-4 w-4" aria-hidden="true" />{{ t('personal.playAvailable') }}</button><button class="library-button" @click="router.push('/discover'); closePlaylist()">{{ t('personal.addMusic') }}</button></div>
        <div v-for="song in playlist.songs" :key="song.id" class="library-song-row">
          <button class="library-icon-button" :disabled="!canPlay(song)" :aria-label="t('player.play') + song.title" @click="playMusic(song,playlist.songs.filter(canPlay))"><Play class="h-4 w-4" aria-hidden="true" /></button>
          <img v-if="cover(song)" :src="cover(song)" alt="" class="h-10 w-10 rounded-lg object-cover" />
          <span class="min-w-0 flex-1"><span class="block truncate">{{ song.title }}</span><small class="library-track-note">{{ canPlay(song) ? song.artist : t('personal.sample') }}</small></span>
          <button class="library-icon-button" :aria-label="t('personal.remove') + song.title" @click="action(() => removeFromPlaylist(playlist!.id,song.id))">×</button>
        </div>
        <p v-if="!playlist.songs.length" class="library-empty">{{ t('personal.addFromDiscover') }}</p>
        <details class="library-manage-playlist"><summary>{{ t('personal.managePlaylist') }}</summary><form class="mt-4 flex flex-wrap gap-2" @submit.prevent="action(() => renamePlaylist(playlist!.id, renamed))"><input v-model="renamed" maxlength="80" class="library-input min-w-0 flex-1" :aria-label="t('personal.rename')" /><button class="library-button" :disabled="!renamed.trim()">{{ t('personal.rename') }}</button><button type="button" class="library-button" @click="confirmDelete = playlist.id">{{ t('personal.delete') }}</button></form></details>
        <div v-if="confirmDelete === playlist.id" class="library-dialog-actions"><button class="library-primary" @click="action(() => deletePlaylist(playlist!.id)); confirmDelete = ''">{{ t('personal.confirmDelete') }}</button><button class="library-button" @click="confirmDelete = ''">{{ t('personal.cancel') }}</button></div>
      </template>
    </LibraryDialog>

    <LibraryDialog :status="message" :open="!!material" :title="material?.fileName || ''" @close="closeMaterial">
      <template v-if="material">
        <div class="library-material-summary"><AudioLines aria-hidden="true" /><div><p>{{ material.range.startTime.toFixed(2) }}–{{ material.range.endTime.toFixed(2) }} s</p><small>{{ new Date(material.createdAt).toLocaleDateString() }}</small></div></div>
        <div v-for="(stem, key) in material.stems" :key="key" class="library-material-row"><button class="library-button" @click="listen(material,String(key))">▶ {{ t('stem.' + key) }}</button><span>{{ stem.duration.toFixed(1) }} s</span><SongActions :song="materialSong(material,String(key))" /><button class="library-button" @click="download(material,String(key))">{{ t('personal.download') }}</button></div>
        <div class="library-dialog-actions"><button class="library-primary inline-flex items-center gap-2" :disabled="handoff.busy" @click="openMaterial(material)"><FolderOpen class="h-4 w-4" aria-hidden="true" />{{ t('personal.toWorkbench') }}</button><button class="library-button" @click="confirmDelete = material.id">{{ t('personal.delete') }}</button></div>
        <div v-if="confirmDelete === material.id" class="library-dialog-actions"><button class="library-primary" :disabled="busy" @click="removeMaterial(material)">{{ t('personal.confirmDelete') }}</button><button class="library-button" @click="confirmDelete = ''">{{ t('personal.cancel') }}</button></div>
      </template>
    </LibraryDialog>
    <SongDetailModal :song="detail" :visible="!!detail" @close="detail = null" @play="playMusic($event)" />
  </div>
</template>
