<script setup lang="ts">
import { Download, Package } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { getDownloadUrl } from '@/composables/useAudioUtils'
import type { StemType } from '@/composables/useAudioStore'

const { state, setExportFormat } = useAudioStore()

const stemLabel: Record<StemType, string> = {
  vocals: '人声',
  music: '配乐',
  sfx: '音效',
}

function downloadAll() {
  const stems = Object.keys(state.results) as StemType[]
  stems.forEach((stem) => {
    const url = getDownloadUrl(stem, state.taskId || '', state.exportFormat)
    const a = document.createElement('a')
    a.href = url
    a.download = `AudioSift_${stemLabel[stem]}.${state.exportFormat}`
    a.click()
  })
}

function downloadSingle(stem: StemType) {
  const url = getDownloadUrl(stem, state.taskId || '', state.exportFormat)
  const a = document.createElement('a')
  a.href = url
  a.download = `AudioSift_${stemLabel[stem]}.${state.exportFormat}`
  a.click()
}
</script>

<template>
  <div v-if="Object.keys(state.results).length > 0" class="glass-card flex flex-col gap-4 p-4">
    <div class="flex items-center gap-2">
      <Download class="h-4 w-4 text-white/40" />
      <span class="text-xs font-medium text-white/40">导出设置</span>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex rounded-lg bg-white/[0.03] p-0.5">
        <button
          v-for="fmt in (['wav', 'mp3'] as const)"
          :key="fmt"
          class="rounded-md px-4 py-2 text-xs font-medium transition-all duration-200"
          :class="state.exportFormat === fmt ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/30 hover:text-white/50'"
          @click="setExportFormat(fmt)"
        >
          {{ fmt === 'wav' ? 'WAV 无损' : 'MP3 压缩' }}
        </button>
      </div>

      <button
        class="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f8fff] to-[#b464ff] px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(79,143,255,0.3)]"
        @click="downloadAll"
      >
        <Package class="h-4 w-4" />
        打包下载全部
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="stem in (Object.keys(state.results) as StemType[])"
        :key="stem"
        class="flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
        @click="downloadSingle(stem)"
      >
        <Download class="h-3 w-3" />
        {{ stemLabel[stem] }}
      </button>
    </div>
  </div>
</template>
