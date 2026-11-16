import { watch } from 'vue'
import { useAudioStore } from './useAudioStore'
import { uploadAndSeparate, pollStatus } from './useAudioUtils'
import { archiveMaterial, libraryOwner, libraryFeedback } from './usePersonalLibrary'
import { pausePlayback } from './useWorkspacePlayback'

const { state } = useAudioStore()
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined

function clearPolling() {
  if (timer) clearTimeout(timer)
  timer = undefined
}
async function checkStatus(taskId: string, request: number) {
  try {
    const result = await pollStatus(taskId)
    if (request !== generation) return
    state.separationProgress = result.progress
    if (result.status === 'done' && result.stems && state.submission) {
      state.resultRange = { ...state.submission.range }
      state.resultFileName = state.submission.fileName
      state.taskId = taskId
      state.resultsStoredOnly = false
      state.results = result.stems
      state.separationStatus = 'done'
      state.separationProgress = 100
      state.pendingTaskId = null
      state.separationFailure = null
      const submission = state.submission
      const file = state.audioFile
      if (file) {
        void archiveMaterial(submission.owner, taskId, file, submission.range, result.stems).then(asset => {
          if (asset && state.taskId === taskId && libraryOwner.value === submission.owner) {
            Object.entries(asset.stems).forEach(([stem, info]) => { if (state.results[stem]) state.results[stem].localKey = info.key })
          }
        }).catch(() => { if (libraryOwner.value === submission.owner) libraryFeedback.error = 'personal.archiveError' })
      }
    } else if (result.status === 'error') {
      state.separationError = result.error || null
      state.separationFailure = 'processing'
      state.separationStatus = 'error'
    } else {
      timer = setTimeout(() => void checkStatus(taskId, request), 2000)
    }
  } catch (error) {
    if (request !== generation) return
    state.separationError = error instanceof Error ? error.message : null
    state.separationFailure = 'status'
    state.separationStatus = 'error'
  }
}
export async function separate(useSubmitted = false) {
  if (!state.audioFile || state.separationStatus === 'uploading' || state.separationStatus === 'processing') return
  if (!useSubmitted) {
    state.submission = {
      owner: libraryOwner.value,
      fileName: state.audioFile.name,
      range: { ...(state.timeSelections[0] || { id: 'full', startTime: 0, endTime: state.audioDuration }) },
      stems: [...state.activeStems],
    }
  }
  const submission = state.submission
  if (!submission || !submission.stems.length) return
  const file = state.audioFile
  const request = ++generation
  clearPolling()
  pausePlayback()
  state.separationError = null
  state.separationFailure = null
  state.pendingTaskId = null
  state.separationStatus = 'uploading'
  state.separationProgress = 0
  try {
    const result = await uploadAndSeparate(file, submission.range.startTime, submission.range.endTime, submission.stems)
    if (request !== generation) return
    state.pendingTaskId = result.task_id
    state.separationStatus = 'processing'
    state.separationProgress = 10
    void checkStatus(result.task_id, request)
  } catch (error) {
    if (request !== generation) return
    state.separationError = error instanceof Error ? error.message : null
    state.separationFailure = 'request'
    state.separationStatus = 'error'
  }
}
export function retrySeparation() {
  if (state.separationFailure === 'status' && state.pendingTaskId) {
    const request = ++generation
    state.separationError = null
    state.separationFailure = null
    state.separationStatus = 'processing'
    void checkStatus(state.pendingTaskId, request)
  } else {
    void separate(true)
  }
}
watch(() => state.audioFile, () => { generation++; clearPolling() }, { flush: 'sync' })
