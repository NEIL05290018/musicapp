<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Play, Pause, Volume2, Download } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { STEM_COLORS, getDownloadUrl } from '@/composables/useAudioUtils'
import type { StemType } from '@/composables/useAudioStore'

const props = defineProps<{
  stemType: StemType
  stemUrl: string
  duration: number
}>()

const { state, setPlayingTrack } = useAudioStore()

const color = STEM_COLORS[props.stemType]
const isPlaying = ref(false)
const audioRef = ref<HTMLAudioElement>()

const audioSrc = computed(() => getDownloadUrl(props.stemType, state.taskId || '', 'wav'))

const stemLabel: Record<StemType, string> = {
  vocals: '人声',
  music: '配乐',
  sfx: '音效',
}

function togglePlay() {
  if (!audioRef.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
    setPlayingTrack(null)
  } else {
    audioRef.value.volume = state.volumes[props.stemType]
    audioRef.value.play()
    isPlaying.value = true
    setPlayingTrack(props.stemType)
  }
}

function onEnded() {
  isPlaying.value = false
  setPlayingTrack(null)
}

function onVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (audioRef.value) {
    audioRef.value.volume = parseFloat(target.value)
  }
}

function handleDownload() {
  const url = getDownloadUrl(props.stemType, state.taskId || '', state.exportFormat)
  const a = document.createElement('a')
  a.href = url
  a.download = `AudioSift_${stemLabel[props.stemType]}.${state.exportFormat}`
  a.click()
}

onUnmounted(() => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
})
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]"
    :style="{ backgroundColor: color.bg, border: `1px solid ${color.border}20` }"
  >
    <audio ref="audioRef" :src="audioSrc" @ended="onEnded" />

    <div class="flex items-center gap-2">
      <div class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: color.border }" />
      <span class="text-sm font-medium text-white">{{ stemLabel[stemType] }}</span>
      <span class="ml-auto text-xs text-white/50 tabular-nums">{{ duration.toFixed(1) }}s</span>
    </div>

    <div class="h-8 rounded-lg bg-white/[0.03]">
      <div
        class="h-full rounded-lg"
        :style="{ background: `repeating-linear-gradient(90deg, ${color.border}40 0px, ${color.border}40 1px, transparent 1px, transparent 3px)` }"
      />
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-110"
        :style="{ backgroundColor: isPlaying ? '#e04090' : `${color.border}20`, color: isPlaying ? 'white' : color.border }"
        @click="togglePlay"
      >
        <Pause v-if="isPlaying" class="h-4 w-4" />
        <Play v-else class="h-4 w-4" />
      </button>

      <div class="flex flex-1 items-center gap-2">
        <Volume2 class="h-3.5 w-3.5 text-white/30" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="state.volumes[stemType]"
          class="range-slider flex-1"
          @input="onVolumeChange"
        />
      </div>

      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/60"
        @click="handleDownload"
      >
        <Download class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
