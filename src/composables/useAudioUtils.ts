import type { StemType } from './useAudioStore'
import { t } from '@/i18n'

const API_BASE = '/api'

export const STEM_COLORS: Record<StemType, { bg: string; border: string; glow: string }> = {
  vocals: { bg: 'rgba(79,143,255,0.15)', border: '#4f8fff', glow: 'rgba(79,143,255,0.3)' },
  music: { bg: 'rgba(180,100,255,0.15)', border: '#b464ff', glow: 'rgba(180,100,255,0.3)' },
  sfx: { bg: 'rgba(255,140,60,0.15)', border: '#ff8c3c', glow: 'rgba(255,140,60,0.3)' },
}

export function decodeAudioFile(file: File): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const audioContext = new AudioContext()
        const buffer = await audioContext.decodeAudioData(reader.result as ArrayBuffer)
        audioContext.close()
        resolve(buffer)
      } catch {
        reject(new Error(t('utils.decodeFailed')))
      }
    }
    reader.onerror = () => reject(new Error(t('utils.readFailed')))
    reader.readAsArrayBuffer(file)
  })
}

export function extractPeaks(
  buffer: AudioBuffer,
  targetWidth: number,
  startTime: number = 0,
  endTime?: number
): Float32Array {
  const channelData = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = endTime ? Math.floor(endTime * sampleRate) : channelData.length
  const samplesPerPixel = Math.max(1, Math.floor((endSample - startSample) / targetWidth))
  const peaks = new Float32Array(targetWidth)

  for (let i = 0; i < targetWidth; i++) {
    let max = 0
    const sampleStart = startSample + i * samplesPerPixel
    for (let j = 0; j < samplesPerPixel; j++) {
      const idx = sampleStart + j
      if (idx >= endSample) break
      const val = Math.abs(channelData[idx])
      if (val > max) max = val
    }
    peaks[i] = max
  }
  return peaks
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}

export function generateUUID(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}

export interface SeparateResponse {
  task_id: string
  status: string
  message: string
}

export interface StatusResponse {
  task_id: string
  status: string
  progress: number
  stems?: Record<string, { url: string; duration: number }>
  error?: string
}

export async function uploadAndSeparate(
  file: File,
  startTime: number,
  endTime: number,
  activeStems: StemType[],
): Promise<SeparateResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('start_time', String(startTime))
  formData.append('end_time', String(endTime > 0 ? endTime : -1))
  formData.append('stems', activeStems.join(','))

  try {
    const res = await fetch(`${API_BASE}/separate`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: t('utils.requestFailed') }))
      throw new Error(err.detail || t('utils.serverError'))
    }

    return res.json()
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(t('utils.backendDown'))
    }
    throw err
  }
}

export async function pollStatus(taskId: string): Promise<StatusResponse> {
  try {
    const res = await fetch(`${API_BASE}/status/${taskId}`)
    if (!res.ok) {
      throw new Error(t('utils.statusFailed'))
    }
    return res.json()
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(t('utils.connectionLost'))
    }
    throw err
  }
}

export function getDownloadUrl(stem: string, taskId: string, format: 'wav' | 'mp3'): string {
  return `${API_BASE}/download/${stem}/${taskId}?format=${format}`
}
