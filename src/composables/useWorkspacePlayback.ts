import { reactive, watch } from 'vue'
import { useAudioStore } from './useAudioStore'
import { readAudio } from './usePersonalLibrary'
import { getDownloadUrl } from './useAudioUtils'
import type { StemType } from './useAudioStore'

type Track = StemType | 'original'
const { state } = useAudioStore()
export const playback = reactive({
  track: 'original' as Track, playing: false, loading: false,
  position: 0, error: false, loop: false, selectionOnly: true, volume: 0.8,
})
let audio: HTMLAudioElement | null = null
let objectUrl = ''
let sourceKey = ''
let revision = 0

export function bounds(track: Track) {
  if (track !== 'original') return [state.resultRange?.startTime ?? 0, state.resultRange?.endTime ?? state.audioDuration]
  const range = playback.selectionOnly ? state.timeSelections[0] : null
  return [range?.startTime ?? 0, range?.endTime ?? state.audioDuration]
}
function stopAudio() {
  if (audio) {
    audio.onplaying = audio.onpause = audio.onwaiting = audio.onerror = audio.ontimeupdate = audio.onended = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    audio = null
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = ''
  playback.playing = false
}
export function pausePlayback() {
  revision++
  audio?.pause()
  playback.playing = false
  playback.loading = false
}
export function seekPlayback(position: number) {
  const [start, end] = bounds(playback.track)
  playback.position = Math.max(start, Math.min(end, position))
  if (audio && audio.readyState >= 1) audio.currentTime = Math.max(0, playback.position - (playback.track === 'original' ? 0 : start))
}
export function selectTrack(track: Track) {
  if (track === playback.track) return
  const position = playback.position
  pausePlayback()
  stopAudio()
  sourceKey = ''
  playback.track = track
  playback.error = false
  seekPlayback(position)
}
export function previewSelection() {
  selectTrack('original')
  playback.selectionOnly = true
  seekPlayback(state.timeSelections[0]?.startTime ?? 0)
  return playTrack()
}
export async function playTrack(track: Track = playback.track) {
  window.dispatchEvent(new Event('audiosift:workspace-play'))
  const request = ++revision
  const previousPosition = playback.position
  audio?.pause()
  playback.playing = false
  playback.loading = true
  playback.error = false
  playback.track = track
  const [start, end] = bounds(track)
  const target = previousPosition >= start && previousPosition < end - 0.03 ? previousPosition : start
  const key = track === 'original' ? 'original' : state.taskId + '/' + track
  try {
    if (!audio || sourceKey !== key) {
      stopAudio()
      let blob: Blob
      if (track === 'original') {
        if (!state.audioFile) throw new Error('Missing file')
        blob = state.audioFile
      } else if (state.results[track]?.localKey) {
        blob = await readAudio(state.results[track].localKey!)
      } else {
        const response = await fetch(getDownloadUrl(track, state.taskId || '', 'wav'), { cache: 'no-store' })
        if (!response.ok || response.status === 204) throw new Error('Audio download failed')
        blob = await response.blob()
      }
      if (request !== revision) return
      objectUrl = URL.createObjectURL(blob)
      const element = new Audio(objectUrl)
      audio = element
      sourceKey = key
      element.onplaying = () => { playback.playing = true; playback.loading = false }
      element.onpause = () => { playback.playing = false }
      element.onwaiting = () => { playback.loading = true }
      element.onerror = () => { playback.error = true; playback.loading = false; playback.playing = false }
      element.ontimeupdate = () => {
        const [rangeStart, rangeEnd] = bounds(track)
        playback.position = element.currentTime + (track === 'original' ? 0 : rangeStart)
        if (playback.position >= rangeEnd - 0.025) {
          if (playback.loop) element.currentTime = track === 'original' ? rangeStart : 0
          else { element.pause(); playback.position = rangeEnd }
        }
      }
      element.onended = () => {
        playback.playing = false
        if (playback.loop) { playback.position = start; void playTrack(track) }
      }
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Audio load timeout')), 20000)
        element.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve() }, { once: true })
        element.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Audio load failed')) }, { once: true })
      })
    }
    if (request !== revision || !audio) return
    playback.position = target
    audio.currentTime = target - (track === 'original' ? 0 : start)
    audio.volume = playback.volume
    await audio.play()
  } catch {
    if (request === revision) { stopAudio(); sourceKey = ''; playback.error = true; playback.playing = false }
  } finally {
    if (request === revision) playback.loading = false
  }
}
watch(() => playback.volume, value => { if (audio) audio.volume = value })
watch(() => state.audioFile, () => {
  revision++; stopAudio(); sourceKey = ''
  playback.track = 'original'; playback.position = 0; playback.loading = false; playback.error = false
}, { flush: 'sync' })
watch(() => state.taskId, () => {
  if (playback.track !== 'original') { pausePlayback(); stopAudio(); sourceKey = ''; playback.track = 'original' }
})
watch(() => state.timeSelections[0], () => {
  if (playback.track === 'original' && playback.selectionOnly) { pausePlayback(); seekPlayback(state.timeSelections[0]?.startTime ?? 0) }
})
