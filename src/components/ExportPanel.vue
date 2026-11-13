<script setup lang="ts">
import { Download, Package } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { getDownloadUrl } from '@/composables/useAudioUtils'
import { t } from '@/i18n'
import type { StemType } from '@/composables/useAudioStore'

const { state, setExportFormat } = useAudioStore()

function downloadAll() {
  const stems = Object.keys(state.results) as StemType[]
  stems.forEach((stem) => {
    const url = getDownloadUrl(stem, state.taskId || '', state.exportFormat)
    const a = document.createElement('a')
    a.href = url
    a.download = `AudioSift_${t(`stem.${stem}`)}.${state.exportFormat}`
    a.click()
  })
}

function downloadSingle(stem: StemType) {
  const url = getDownloadUrl(stem, state.taskId || '', state.exportFormat)
  const a = document.createElement('a')
  a.href = url
  a.download = `AudioSift_${t(`stem.${stem}`)}.${state.exportFormat}`
  a.click()
}
</script>

<template>
  <div v-if="Object.keys(state.results).length > 0" class="glass-card flex flex-col gap-4 p-4">
    <div class="flex items-center gap-2">
      <Download class="h-4 w-4 text-white/55" />
      <span class="text-xs font-semibold text-white/60">{{ t('export.title') }}</span>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex rounded-lg bg-white/[0.03] p-0.5">
        <button
          v-for="fmt in (['wav', 'mp3'] as const)"
          :key="fmt"
          class="rounded-md px-4 py-2 text-xs font-medium transition-all duration-200"
          :class="state.exportFormat === fmt ? 'bg-white/[0.10] text-white shadow-sm' : 'text-white/45 hover:text-white/65'"
          @click="setExportFormat(fmt)"
        >
          {{ fmt === 'wav' ? t('export.wav') : t('export.mp3') }}
        </button>
      </div>

      <button
        class="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f8fff] to-[#b464ff] px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(79,143,255,0.3)]"
        @click="downloadAll"
      >
        <Package class="h-4 w-4" />
        {{ t('export.downloadAll') }}
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="stem in (Object.keys(state.results) as StemType[])"
        :key="stem"
        class="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/[0.10] hover:text-white/80"
        @click="downloadSingle(stem)"
      >
        <Download class="h-3 w-3" />
        {{ t('stem.' + stem) }}
      </button>
    </div>
  </div>
</template>
