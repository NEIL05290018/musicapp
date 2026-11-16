import { reactive, watch } from 'vue'
import type { Song } from '@/data/songs'
import { resolvePlayableUrl } from './useMusicApi'
import { libraryOwner, readAudio, recordRecent } from './usePersonalLibrary'
import { pausePlayback } from './useWorkspacePlayback'

export const musicPlayer = reactive({
  song: null as Song | null, queue: [] as Song[], index: 0,
  playing: false, loading: false, error: '', position: 0, duration: 0, volume: .8,
})
let audio: HTMLAudioElement | null = null
let revision = 0
let blobUrl = ''
function unload() {
  if (audio) {
    audio.onplaying = audio.onpause = audio.ontimeupdate = audio.onended = audio.onerror = audio.onwaiting = null
    audio.pause(); audio.removeAttribute('src'); audio.load()
  }
  audio = null
  if (blobUrl) URL.revokeObjectURL(blobUrl)
  blobUrl = ''
}
export function pauseMusic() { revision++; audio?.pause(); musicPlayer.playing = false; musicPlayer.loading = false }
export async function playMusic(song: Song = musicPlayer.song!, queue?: Song[]) {
  if (!song) return
  const request = ++revision
  const owner = libraryOwner.value
  pausePlayback()
  musicPlayer.error = ''
  musicPlayer.loading = true
  musicPlayer.playing = false
  if (queue) musicPlayer.queue = [...queue]
  else if (!musicPlayer.queue.some(s => s.id === song.id)) musicPlayer.queue = [song]
  musicPlayer.index = Math.max(0, musicPlayer.queue.findIndex(s => s.id === song.id))
  try {
    if (musicPlayer.song?.id === song.id && audio && audio.readyState >= 2 && !audio.error) {
      await audio.play()
      if (request === revision) musicPlayer.playing = !audio.paused
      return
    }
    unload()
    musicPlayer.song = song
    musicPlayer.position = 0
    musicPlayer.duration = song.duration
    let url = ''
    if (song.localKey) {
      const blob = await readAudio(song.localKey)
      if (request !== revision) return
      blobUrl = URL.createObjectURL(blob); url = blobUrl
    } else if (song.audioSrc) {
      url = await resolvePlayableUrl(song.audioSrc)
    } else if (song.audioUrl) {
      url = song.audioUrl
    }
    if (request !== revision) return
    if (!url) throw new Error('This track has no playable audio. Import a local file or choose another track.')
    const element = new Audio(url)
    audio = element
    element.volume = musicPlayer.volume
    element.onplaying = () => {
      musicPlayer.playing = true; musicPlayer.loading = false
      try { recordRecent(song, owner) } catch { /* Playback remains available when browser storage is full. */ }
    }
    element.onpause = () => { musicPlayer.playing = false }
    element.onwaiting = () => { musicPlayer.loading = true }
    element.ontimeupdate = () => {
      musicPlayer.position = element.currentTime
      if (Number.isFinite(element.duration)) musicPlayer.duration = element.duration
    }
    element.onerror = () => { musicPlayer.playing = false; musicPlayer.loading = false; musicPlayer.error = 'Audio could not be loaded. Please retry or choose another track.' }
    element.onended = () => {
      musicPlayer.playing = false
      if (musicPlayer.index < musicPlayer.queue.length - 1) skipMusic(1)
    }
    await element.play()
  } catch (error) {
    if (request === revision) {
      musicPlayer.error = error instanceof Error ? error.message : 'Playback failed'
      musicPlayer.playing = false
    }
  } finally { if (request === revision) musicPlayer.loading = false }
}
export function seekMusic(value: number) { if (audio && audio.readyState >= 1) { audio.currentTime = value; musicPlayer.position = value } }
export function skipMusic(direction: number) {
  const song = musicPlayer.queue[musicPlayer.index + direction]
  if (song) void playMusic(song)
}
watch(() => musicPlayer.volume, value => { if (audio) audio.volume = value })
watch(libraryOwner, () => {
  pauseMusic(); unload()
  musicPlayer.song = null; musicPlayer.queue = []; musicPlayer.error = ''
})

window.addEventListener('audiosift:workspace-play', pauseMusic)
