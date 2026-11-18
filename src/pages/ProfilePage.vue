<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/composables/useAuthStore'
import { library, libraryOwner, libraryFeedback, defaultLayout, saveLayout, createPlaylist, renamePlaylist, deletePlaylist, removeFromPlaylist, deleteMaterial, downloadAudio } from '@/composables/usePersonalLibrary'
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
const moduleIcons = { playlists: ListMusic, assets: AudioLines, favorites: Heart, recent: History }
const router = useRouter()
const editing = ref(false)
const order = ref<ModuleId[]>([...library.layout])
const dragging = ref<ModuleId | null>(null)
const dragCard = ref({ x: 0, y: 0, width: 0, height: 0 })
let dragOffset = { x: 0, y: 0 }
const message = ref('')
const playlistName = ref('')
const creating = ref(false)
const selectedAsset = ref('')
const detail = ref<Song | null>(null)
const selectedList = ref('')
const renamed = ref('')
const filter = ref('')
const confirmDelete = ref('')
const busy = ref(false)
const modules = computed(() => editing.value ? order.value : library.layout)
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
watch(libraryOwner, () => { stopDrag(); editing.value = false; selectedList.value = ''; confirmDelete.value = ''; message.value = ''; creating.value = false; selectedAsset.value = ''; detail.value = null })
watch(() => playlist.value?.name, name => { renamed.value = name || '' }, { immediate: true })
function action(callback: () => void) {
  try { callback(); message.value = t('personal.saved') } catch { message.value = t('personal.storageError') }
}
function beginEdit() { order.value = [...library.layout]; editing.value = true; message.value = '' }
function finishEdit() { action(() => { saveLayout(order.value); editing.value = false }) }
function restoreLayout() { order.value = [...defaultLayout]; message.value = t('personal.defaultPreview') }
async function addList() {
  if (!playlistName.value.trim()) return
  let id = ''
  action(() => { id = createPlaylist(playlistName.value); playlistName.value = ''; creating.value = false })
  await nextTick()
  if (id) document.querySelector<HTMLButtonElement>('[data-playlist="' + id + '"] .cover-card-open')?.focus()
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
function startDrag(event: PointerEvent, id: ModuleId) {
  if (event.button !== 0) return
  event.preventDefault()
  const card = (event.currentTarget as HTMLElement).closest('.profile-module')
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
  const cards = document.querySelectorAll<HTMLElement>('[data-module]')
  const target = Array.from(cards).find(card => {
    const grid = card.offsetParent as HTMLElement | null
    if (!grid) return false
    const origin = grid.getBoundingClientRect()
    const left = origin.left + card.offsetLeft
    const top = origin.top + card.offsetTop
    return event.clientX >= left && event.clientX <= left + card.offsetWidth
      && event.clientY >= top && event.clientY <= top + card.offsetHeight
  })?.dataset.module as ModuleId | undefined
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
function moveModule(id: ModuleId, direction: number) {
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
      <header class="profile-account glass-card mb-6 flex flex-wrap items-center justify-between gap-6 p-7">
        <div class="flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-brand-pink/70 text-2xl">{{ auth.state.user?.username.slice(0,1).toUpperCase() || '♪' }}</div>
          <div><h1 class="text-2xl font-semibold">{{ auth.state.user?.username || t('personal.guest') }}</h1><p class="mt-1 text-sm">{{ auth.state.user?.email || t('personal.guestHint') }}</p><p class="mt-2 text-xs text-white/65">{{ t('personal.localStorage') }}</p></div>
        </div>
        <button v-if="!auth.isLoggedIn()" class="library-primary" @click="router.push('/auth?next=/profile')">{{ t('sidebar.login') }}</button>
        <button v-else class="library-button" @click="auth.clearAuth()">{{ t('sidebar.logout') }}</button>
      </header>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">{{ t('personal.space') }}</h2>
        <div class="flex gap-2">
          <template v-if="editing"><button class="library-button" @click="restoreLayout">{{ t('personal.restore') }}</button><button class="library-button" @click="editing = false; stopDrag()">{{ t('personal.cancel') }}</button><button class="library-primary" @click="finishEdit">{{ t('personal.done') }}</button></template>
          <button v-else class="library-button" @click="beginEdit">{{ t('personal.editLayout') }}</button>
        </div>
      </div>
      <p v-if="editing" class="mb-4 text-sm">{{ t('personal.dragHint') }}</p>
      <p v-if="message" class="mb-4 text-sm" role="status">{{ message }}</p>
      <p v-if="libraryFeedback.error" class="mb-4 text-rose-200" role="alert">{{ t(libraryFeedback.error) }}</p>
      <TransitionGroup name="module-grid" tag="div" class="profile-grid" :class="{ 'is-editing': editing }">
        <div v-for="id in modules" :key="id" :data-module="id" class="profile-slot" :class="{ 'drop-slot': dragging === id }" :style="dragging === id ? { minHeight: dragCard.height + 'px' } : undefined">
          <Teleport to="body" :disabled="dragging !== id">
            <section class="profile-module glass-card p-5" :data-kind="id" :class="{ 'is-lifted': dragging === id }" :style="dragging === id ? { position: 'fixed', left: dragCard.x + 'px', top: dragCard.y + 'px', width: dragCard.width + 'px', height: dragCard.height + 'px', zIndex: 150 } : undefined">
              <header class="profile-module-heading">
                <h3 class="profile-module-title text-lg font-semibold"><span class="profile-module-icon"><component :is="moduleIcons[id]" class="h-4 w-4" aria-hidden="true" /></span>{{ t('personal.module.' + id) }}</h3>
                <div v-if="editing" class="flex items-center gap-1">
                  <button class="library-icon-button" :aria-label="t('personal.moveUp') + t('personal.module.' + id)" @click="moveModule(id,-1)">↑</button>
                  <button class="library-icon-button" :aria-label="t('personal.moveDown') + t('personal.module.' + id)" @click="moveModule(id,1)">↓</button>
                  <button class="module-grip library-button" :aria-label="t('personal.drag') + t('personal.module.' + id)" @pointerdown="startDrag($event,id)">⠿</button>
                </div>
                <button v-else-if="id === 'playlists'" class="library-icon-button" :aria-label="t('personal.newPlaylist')" @click="creating = true"><Plus class="h-4 w-4" aria-hidden="true" /></button>
              </header>
              <div class="module-body" :class="{ 'module-locked': editing }" :inert="editing">
                <template v-if="id === 'playlists'">
                  <div class="library-cover-grid">
                    <LibraryCoverCard v-for="list in library.playlists" :key="list.id" :data-playlist="list.id" :title="list.name" :subtitle="trackCount(list.songs.length)" :cover="playlistCover(list.songs)" :playable="list.songs.some(canPlay)" @open="selectedList = list.id" @play="playList(list.songs)" />
                    <button class="library-new-playlist" @click="creating = true"><span><Plus aria-hidden="true" /></span><strong>{{ t('personal.newPlaylist') }}</strong></button>
                  </div>
                  <p v-if="!library.playlists.length" class="cover-grid-hint">{{ t('personal.emptyPlaylists') }}</p>
                </template>
                <template v-else-if="id === 'assets'">
                  <input v-if="library.assets.length" v-model="filter" class="library-input mb-4 w-full" :aria-label="t('personal.searchAssets')" :placeholder="t('personal.searchAssets')" />
                  <p v-if="libraryFeedback.saving" class="text-sm" role="status">{{ t('personal.savingAudio') }}</p>
                  <div v-if="assets.length" class="library-cover-grid">
                    <LibraryCoverCard v-for="asset in assets" :key="asset.id" :data-material="asset.id" :title="asset.fileName" :subtitle="asset.range.startTime.toFixed(1) + '–' + asset.range.endTime.toFixed(1) + ' s · ' + t('personal.stemCount', { n: Object.keys(asset.stems).length })" :cover="materialCover(asset)" @open="selectedAsset = asset.id"><template #art><AudioLines aria-hidden="true" /></template></LibraryCoverCard>
                  </div>
                  <div v-else class="library-module-empty"><AudioLines aria-hidden="true" /><p>{{ library.assets.length ? t('personal.noTracks') : t('personal.emptyAssets') }}</p><RouterLink to="/" class="library-button">{{ t('personal.goSeparate') }}</RouterLink></div>
                </template>
                <template v-else-if="id === 'favorites'">
                  <div v-if="favorites.length || savedFeatured.length" class="library-cover-grid">
                    <LibraryCoverCard v-for="song in favorites" :key="song.id" :title="song.title" :subtitle="song.artist" :cover="cover(song)" :playable="canPlay(song)" :active="musicPlayer.song?.id === song.id && musicPlayer.playing" @open="detail = song" @play="playMusic(song,favorites.filter(canPlay))"><template #actions><SongActions :song="song" /></template></LibraryCoverCard>
                    <LibraryCoverCard v-for="list in savedFeatured" :key="list.id" :title="list.name" :subtitle="trackCount(list.songIds.length)" :cover="'/albums/album-' + list.coverIndex + '.jpg'" @open="router.push('/discover/playlist/' + list.id)" />
                  </div>
                  <div v-else class="library-module-empty"><Heart aria-hidden="true" /><p>{{ auth.isLoggedIn() ? t('personal.emptyFavorites') : t('personal.loginFavorites') }}</p><button class="library-button" @click="router.push(auth.isLoggedIn() ? '/discover' : '/auth?next=/profile')">{{ auth.isLoggedIn() ? t('personal.goDiscover') : t('sidebar.login') }}</button></div>
                </template>
                <template v-else>
                  <div v-if="library.recent.length" class="library-cover-grid">
                    <LibraryCoverCard v-for="song in library.recent.slice(0,8)" :key="song.id" :title="song.title" :subtitle="musicPlayer.song?.id === song.id && musicPlayer.playing ? t('personal.nowPlaying') : song.artist" :cover="cover(song)" :playable="canPlay(song)" :active="musicPlayer.song?.id === song.id && musicPlayer.playing" @open="detail = song" @play="playMusic(song,library.recent.filter(canPlay))"><template #actions><SongActions :song="song" /></template></LibraryCoverCard>
                  </div>
                  <div v-else class="library-module-empty"><History aria-hidden="true" /><p>{{ t('personal.emptyRecent') }}</p><RouterLink to="/discover" class="library-button">{{ t('personal.goDiscover') }}</RouterLink></div>
                </template>
              </div>
            </section>
          </Teleport>
        </div>
      </TransitionGroup>
      <RouterLink to="/about" class="profile-about-link">{{ t('personal.aboutHelp') }}<ArrowUpRight class="h-4 w-4" aria-hidden="true" /></RouterLink>
    </div>

    <LibraryDialog :status="message" :open="creating" :title="t('personal.newPlaylist')" compact @close="creating = false">
      <form class="library-create-form" @submit.prevent="addList"><label for="new-playlist-name">{{ t('personal.playlistName') }}</label><input id="new-playlist-name" v-model="playlistName" autofocus class="library-input w-full" maxlength="80" :placeholder="t('personal.playlistPlaceholder')" required /><p>{{ t('personal.playlistCoverHint') }}</p><div class="library-dialog-actions"><button type="button" class="library-button" @click="creating = false">{{ t('personal.cancel') }}</button><button class="library-primary" :disabled="!playlistName.trim()">{{ t('personal.create') }}</button></div></form>
    </LibraryDialog>

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
