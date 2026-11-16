import { reactive } from 'vue'
import type { Material } from './usePersonalLibrary'
import { libraryOwner, libraryFeedback, readAudio } from './usePersonalLibrary'
import { decodeAudioFile } from './useAudioUtils'
import { useAudioStore } from './useAudioStore'
import type { Song } from '@/data/songs'
import { resolvePlayableUrl } from './useMusicApi'

const { state, reset, setAudioFile, setAudioBuffer, setAudioInfo, addTimeSelection } = useAudioStore()
export const handoff = reactive({ busy: false, error: '' })
export async function openInWorkbench(item: Song | Material) {
  if (handoff.busy) return false
  handoff.busy = true; handoff.error = ''
  const owner = libraryOwner.value
  try {
    let blob: Blob
    const material = 'stems' in item ? item : null
    if (material) blob = await readAudio(material.originalKey)
    else {
      const song = item as Song
      if (song.localKey) blob = await readAudio(song.localKey)
      else {
        const url = song.audioSrc ? await resolvePlayableUrl(song.audioSrc) : song.audioUrl
        if (!url) throw new Error('No source audio')
        const response = await fetch(url)
        if (!response.ok) throw new Error('Source download failed')
        blob = await response.blob()
      }
    }
    const title = material ? material.fileName : (item as Song).title
    const name = /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(title) ? title : title + (blob.type.includes('wav') ? '.wav' : '.mp3')
    const file = new File([blob], name, { type: blob.type })
    const buffer = await decodeAudioFile(file)
    if (owner !== libraryOwner.value) return false
    window.dispatchEvent(new Event('audiosift:workspace-play'))
    reset(); setAudioInfo(buffer.duration, buffer.sampleRate); setAudioFile(file); setAudioBuffer(buffer)
    if (material) {
      addTimeSelection({ ...material.range })
      state.resultsStoredOnly = true
      state.taskId = material.id
      state.resultFileName = material.fileName
      state.resultRange = { ...material.range }
      state.results = Object.fromEntries(Object.entries(material.stems).map(([stem, info]) => [stem, { url: '', localKey: info.key, duration: info.duration }]))
      state.separationStatus = 'done'
    }
    return true
  } catch {
    handoff.error = 'personal.handoffError'
    libraryFeedback.error = 'personal.handoffError'
    return false
  } finally { handoff.busy = false }
}
