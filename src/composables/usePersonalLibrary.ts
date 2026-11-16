import { computed, reactive, watch } from 'vue'
import { useAuthStore } from './useAuthStore'
import { getDownloadUrl } from './useAudioUtils'
import type { Song } from '@/data/songs'
import { useAudioStore } from './useAudioStore'
import type { StemInfo, TimeSelection } from './useAudioStore'

export type ModuleId = 'playlists' | 'assets' | 'favorites' | 'recent'
export const defaultLayout: ModuleId[] = ['playlists', 'assets', 'favorites', 'recent']
export interface PersonalPlaylist { id: string; name: string; songs: Song[] }
export interface Material {
  id: string; fileName: string; range: TimeSelection; createdAt: string
  originalKey: string; stems: Record<string, { key: string; duration: number }>
}
interface Library { layout: ModuleId[]; playlists: PersonalPlaylist[]; assets: Material[]; recent: Song[]; catalog: Song[] }
const auth = useAuthStore()
export const libraryOwner = computed(() => auth.state.user ? 'user-' + auth.state.user.id : 'guest')
export const library = reactive<Library>({ layout: [...defaultLayout], playlists: [], assets: [], recent: [], catalog: [] })
export const libraryFeedback = reactive({ error: '', saving: 0, opening: false })
const storageKey = (owner: string) => 'audiosift-library-v1-' + owner
function emptyLibrary(): Library { return { layout: [...defaultLayout], playlists: [], assets: [], recent: [], catalog: [] } }
function readLibrary(owner: string): Library {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(owner)) || 'null')
    if (!value) return emptyLibrary()
    const layout = Array.isArray(value.layout) ? value.layout.filter((id: ModuleId) => defaultLayout.includes(id)) : []
    return { ...emptyLibrary(), ...value, layout: [...new Set<ModuleId>([...layout, ...defaultLayout])] }
  } catch { return emptyLibrary() }
}
function commit(owner: string, update: (data: Library) => void) {
  const data = readLibrary(owner)
  update(data)
  localStorage.setItem(storageKey(owner), JSON.stringify(data))
  if (owner === libraryOwner.value) Object.assign(library, data)
}
watch(libraryOwner, (owner, previous) => { if (previous) useAudioStore().reset(); Object.assign(library, readLibrary(owner)); libraryFeedback.error = '' }, { immediate: true })
window.addEventListener('storage', event => {
  if (event.key === storageKey(libraryOwner.value)) Object.assign(library, readLibrary(libraryOwner.value))
})

let database: Promise<IDBDatabase> | undefined
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('audiosift-audio-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('audio')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(request.error) }
  })
  return database
}
async function storeFiles(files: { key: string; blob: Blob }[]) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('audio', 'readwrite')
    files.forEach(file => tx.objectStore('audio').put(file.blob, file.key))
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Audio storage failed'))
  })
}
export async function readAudio(key: string): Promise<Blob> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction('audio').objectStore('audio').get(key)
    request.onsuccess = () => request.result instanceof Blob ? resolve(request.result) : reject(new Error('Saved audio is unavailable'))
    request.onerror = () => reject(request.error)
  })
}
async function removeFiles(keys: string[]) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('audio', 'readwrite')
    keys.forEach(key => tx.objectStore('audio').delete(key))
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error)
  })
}
export function saveLayout(order: ModuleId[]) { commit(libraryOwner.value, data => { data.layout = [...order] }) }
export function createPlaylist(name: string) {
  const id = crypto.randomUUID()
  commit(libraryOwner.value, data => { data.playlists.unshift({ id, name: name.trim(), songs: [] }) })
  return id
}
export function renamePlaylist(id: string, name: string) {
  commit(libraryOwner.value, data => { const list = data.playlists.find(p => p.id === id); if (list) list.name = name.trim() })
}
export function deletePlaylist(id: string) { commit(libraryOwner.value, data => { data.playlists = data.playlists.filter(p => p.id !== id) }) }
export function addToPlaylist(id: string, song: Song) {
  commit(libraryOwner.value, data => {
    const list = data.playlists.find(p => p.id === id)
    if (list && !list.songs.some(s => s.id === song.id)) list.songs.push({ ...song })
  })
}
export function removeFromPlaylist(id: string, songId: string) {
  commit(libraryOwner.value, data => { const list = data.playlists.find(p => p.id === id); if (list) list.songs = list.songs.filter(s => s.id !== songId) })
}
export function rememberSongs(songs: Song[]) {
  commit(libraryOwner.value, data => {
    const map = new Map(data.catalog.map(song => [song.id, song]))
    songs.forEach(song => map.set(song.id, { ...song }))
    data.catalog = [...map.values()].slice(-300)
  })
}
export function recordRecent(song: Song, owner: string) {
  commit(owner, data => { data.recent = [{ ...song }, ...data.recent.filter(s => s.id !== song.id)].slice(0, 20) })
}
export async function importSong(file: File) {
  const owner = libraryOwner.value
  const key = owner + ':song:' + crypto.randomUUID()
  await storeFiles([{ key, blob: file }])
  const song: Song = { id: crypto.randomUUID(), title: file.name, artist: 'Local audio', album: '', coverIndex: 1, duration: 0, genre: '', year: new Date().getFullYear(), localKey: key }
  try { commit(owner, data => { data.catalog.unshift(song) }) }
  catch (error) { await removeFiles([key]); throw error }
  return song
}
export async function archiveMaterial(owner: string, taskId: string, file: File, range: TimeSelection, stems: Record<string, StemInfo>) {
  const existing = readLibrary(owner).assets.find(asset => asset.id === taskId)
  if (existing) return existing
  libraryFeedback.saving++
  const prefix = owner + ':material:' + taskId
  const files = [{ key: prefix + ':original', blob: file as Blob }]
  const storedStems: Material['stems'] = {}
  try {
    for (const [stem, info] of Object.entries(stems)) {
      const response = await fetch(getDownloadUrl(stem as 'music', taskId, 'wav'), { cache: 'no-store' })
      if (!response.ok || response.status === 204) throw new Error('Stem download failed')
      files.push({ key: prefix + ':' + stem, blob: await response.blob() })
      storedStems[stem] = { key: prefix + ':' + stem, duration: info.duration }
    }
    await storeFiles(files)
    try {
      commit(owner, data => {
        if (!data.assets.some(asset => asset.id === taskId)) data.assets.unshift({
          id: taskId, fileName: file.name, range: { ...range }, createdAt: new Date().toISOString(),
          originalKey: prefix + ':original', stems: storedStems,
        })
      })
    } catch (error) { await removeFiles(files.map(f => f.key)); throw error }
    return readLibrary(owner).assets.find(asset => asset.id === taskId)
  } finally { libraryFeedback.saving-- }
}
export async function deleteMaterial(asset: Material) {
  const owner = libraryOwner.value
  commit(owner, data => {
    data.assets = data.assets.filter(item => item.id !== asset.id)
    const keys = Object.values(asset.stems).map(stem => stem.key)
    data.recent = data.recent.filter(song => !song.localKey || !keys.includes(song.localKey))
    data.playlists.forEach(list => { list.songs = list.songs.filter(song => !song.localKey || !keys.includes(song.localKey)) })
  })
  await removeFiles([asset.originalKey, ...Object.values(asset.stems).map(s => s.key)])
}
export async function downloadAudio(key: string, name: string) {
  const url = URL.createObjectURL(await readAudio(key))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
