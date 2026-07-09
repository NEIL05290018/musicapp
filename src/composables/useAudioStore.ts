import { reactive } from 'vue'

export type StemType = 'vocals' | 'music' | 'sfx'
export type SeparationStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export interface TimeSelection {
  id: string
  startTime: number
  endTime: number
}

export interface StemInfo {
  url: string
  duration: number
}

export interface AudioState {
  audioFile: File | null
  audioBuffer: AudioBuffer | null
  audioDuration: number
  audioSampleRate: number

  timeSelections: TimeSelection[]
  activeStems: StemType[]

  separationStatus: SeparationStatus
  separationProgress: number
  separationError: string | null
  taskId: string | null
  results: Record<string, StemInfo>

  exportFormat: 'wav' | 'mp3'

  playingTrack: StemType | null
  soloTrack: StemType | null
  volumes: Record<StemType, number>
}

const state = reactive<AudioState>({
  audioFile: null,
  audioBuffer: null,
  audioDuration: 0,
  audioSampleRate: 44100,

  timeSelections: [],
  activeStems: ['vocals', 'music', 'sfx'],

  separationStatus: 'idle',
  separationProgress: 0,
  separationError: null,
  taskId: null,
  results: {},

  exportFormat: 'wav',

  playingTrack: null,
  soloTrack: null,
  volumes: { vocals: 0.8, music: 0.8, sfx: 0.8 },
})

export function useAudioStore() {
  function setAudioFile(file: File | null) { state.audioFile = file }
  function setAudioBuffer(buffer: AudioBuffer | null) { state.audioBuffer = buffer }
  function setAudioInfo(duration: number, sampleRate: number) {
    state.audioDuration = duration
    state.audioSampleRate = sampleRate
  }

  function addTimeSelection(sel: TimeSelection) { state.timeSelections.push(sel) }
  function removeTimeSelection(id: string) {
    state.timeSelections = state.timeSelections.filter(s => s.id !== id)
  }
  function clearTimeSelections() { state.timeSelections = [] }

  function toggleStem(stem: StemType) {
    const idx = state.activeStems.indexOf(stem)
    if (idx >= 0) {
      state.activeStems.splice(idx, 1)
    } else {
      state.activeStems.push(stem)
    }
  }
  function setActiveStems(stems: StemType[]) { state.activeStems = stems }

  function setSeparationStatus(status: SeparationStatus) { state.separationStatus = status }
  function setSeparationProgress(progress: number) { state.separationProgress = progress }
  function setSeparationError(error: string | null) { state.separationError = error }
  function setTaskId(taskId: string | null) { state.taskId = taskId }
  function setResults(results: Record<string, StemInfo>) { state.results = results }

  function setExportFormat(format: 'wav' | 'mp3') { state.exportFormat = format }

  function setPlayingTrack(track: StemType | null) { state.playingTrack = track }
  function setSoloTrack(track: StemType | null) { state.soloTrack = track }
  function setVolume(stem: StemType, volume: number) { state.volumes[stem] = volume }

  function reset() {
    state.audioFile = null
    state.audioBuffer = null
    state.audioDuration = 0
    state.audioSampleRate = 44100
    state.timeSelections = []
    state.activeStems = ['vocals', 'music', 'sfx']
    state.separationStatus = 'idle'
    state.separationProgress = 0
    state.separationError = null
    state.taskId = null
    state.results = {}
    state.exportFormat = 'wav'
    state.playingTrack = null
    state.soloTrack = null
    state.volumes = { vocals: 0.8, music: 0.8, sfx: 0.8 }
  }

  return {
    state,
    setAudioFile,
    setAudioBuffer,
    setAudioInfo,
    addTimeSelection,
    removeTimeSelection,
    clearTimeSelections,
    toggleStem,
    setActiveStems,
    setSeparationStatus,
    setSeparationProgress,
    setSeparationError,
    setTaskId,
    setResults,
    setExportFormat,
    setPlayingTrack,
    setSoloTrack,
    setVolume,
    reset,
  }
}
