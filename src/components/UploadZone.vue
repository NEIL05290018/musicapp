<script setup lang="ts">
import { ref } from 'vue'
import { Upload, FileAudio, AlertCircle } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { decodeAudioFile } from '@/composables/useAudioUtils'
import { t } from '@/i18n'

const { state, setAudioFile, setAudioBuffer, setAudioInfo } = useAudioStore()

const isDragging = ref(false)
const error = ref<string | null>(null)
const isLoading = ref(false)
const inputRef = ref<HTMLInputElement>()

function validateFile(file: File): string | null {
  const validExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac']
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!validExtensions.includes(ext)) {
    return t('upload.invalidFormat')
  }
  if (file.size > 100 * 1024 * 1024) {
    return t('upload.tooLarge')
  }
  return null
}

async function processFile(file: File) {
  const validationError = validateFile(file)
  if (validationError) {
    error.value = validationError
    return
  }
  error.value = null
  isLoading.value = true
  try {
    const buffer = await decodeAudioFile(file)
    setAudioFile(file)
    setAudioBuffer(buffer)
    setAudioInfo(buffer.duration, buffer.sampleRate)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('upload.failed')
  } finally {
    isLoading.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onClick() {
  inputRef.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) processFile(file)
}

function handleReset() {
  setAudioFile(null)
  setAudioBuffer(null)
  error.value = null
}
</script>

<template>
  <div>
    <div
      v-if="state.audioBuffer && state.audioFile"
      class="glass-card flex items-center gap-4 p-4"
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4f8fff]/10">
        <FileAudio class="h-5 w-5 text-[#4f8fff]" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-white/90">{{ state.audioFile.name }}</p>
        <p class="text-xs text-white/55">
          {{ (state.audioFile.size / 1024 / 1024).toFixed(1) }} MB ·
          {{ t('upload.channels', { n: state.audioBuffer.numberOfChannels }) }} ·
          {{ (state.audioBuffer.sampleRate / 1000).toFixed(1) }}kHz
        </p>
      </div>
      <button
        class="rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/80"
        @click="handleReset"
      >
        {{ t('upload.replace') }}
      </button>
    </div>

    <div
      v-else
      class="glass-card flex cursor-pointer flex-col items-center justify-center gap-4 p-12 transition-all duration-300"
      :class="isDragging
        ? 'border-[#4f8fff]/40 bg-[#4f8fff]/5 shadow-[0_0_40px_rgba(79,143,255,0.1)]'
        : 'hover:border-white/[0.1]'"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @click="onClick"
    >
      <input
        ref="inputRef"
        type="file"
        accept=".mp3,.wav,.flac,.ogg,.m4a,.aac,audio/*"
        class="hidden"
        @change="onFileChange"
      />

      <div v-if="isLoading" class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-2 border-[#4f8fff]/30 border-t-[#4f8fff]" />
        <span class="text-sm text-white/65">{{ t('upload.decoding') }}</span>
      </div>

      <template v-else>
        <div
          class="flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300"
          :class="isDragging ? 'bg-[#4f8fff]/20 scale-110' : 'bg-white/[0.04]'"
        >
          <Upload
            class="h-7 w-7 transition-colors duration-300"
            :class="isDragging ? 'text-[#4f8fff]' : 'text-white/30'"
          />
        </div>
        <div class="text-center">
          <p class="text-sm font-medium text-white/70">
            {{ t('upload.dropHint') }}<span class="text-[#4f8fff]">{{ t('upload.clickHere') }}</span>
          </p>
          <p class="mt-1 text-xs text-white/45">
            {{ t('upload.formats') }}
          </p>
        </div>
      </template>

      <div v-if="error" class="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2">
        <AlertCircle class="h-4 w-4 text-red-300" />
        <span class="text-sm text-red-300 font-medium">{{ error }}</span>
      </div>
    </div>
  </div>
</template>
