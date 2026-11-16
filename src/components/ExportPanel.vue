<script setup lang="ts">
import { Download, Package } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import { getDownloadUrl } from '@/composables/useAudioUtils'
import { downloadAudio } from '@/composables/usePersonalLibrary'
import { ref } from 'vue'
import { t } from '@/i18n'
import type { StemType } from '@/composables/useAudioStore'

const { state, setExportFormat } = useAudioStore()

const downloadError = ref(false)
async function downloadSingle(stem: StemType) {
  downloadError.value = false
  try {
    if (state.results[stem]?.localKey && state.exportFormat === 'wav') {
      await downloadAudio(state.results[stem].localKey!, 'AudioSift_' + stem + '.wav')
    } else {
      const a = document.createElement('a')
      a.href = getDownloadUrl(stem, state.taskId || '', state.exportFormat)
      a.download = 'AudioSift_' + stem + '.' + state.exportFormat
      a.click()
    }
  } catch { downloadError.value = true }
}
async function downloadAll() {
  for (const stem of Object.keys(state.results) as StemType[]) await downloadSingle(stem)
}
</script>

<template>
  <div v-if="Object.keys(state.results).length > 0" class="glass-card flex flex-col gap-4 p-4">
    <div class="flex items-center gap-2">
      <Download class="h-4 w-4 text-ink-black/65" />
      <span class="text-xs font-semibold text-ink-secondary">{{ t('export.title') }}</span>
    </div>

    <p v-if="state.resultsStoredOnly" class="text-sm">{{ t('personal.savedWav') }}</p>
    <p v-if="downloadError" role="alert">{{ t('personal.storageError') }}</p>
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex rounded-full bg-white/[0.03] p-0.5">
        <button
          v-for="fmt in (['wav', 'mp3'] as const)"
          :key="fmt"
          class="rounded-full px-4 py-2 text-xs font-medium text-ink-black transition-all duration-200"
          :class="state.exportFormat === fmt ? 'bg-ink-black/[0.10] shadow-sm' : 'hover:bg-ink-black/[0.05]'"
          :aria-pressed="state.exportFormat === fmt"
          :disabled="state.resultsStoredOnly && fmt === 'mp3'" @click="setExportFormat(fmt)"
        >
          {{ fmt === 'wav' ? t('export.wav') : t('export.mp3') }}
        </button>
      </div>

      <button
        class="flex items-center gap-2 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-brand-blue-hover active:bg-brand-blue-active"
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
        class="flex items-center gap-1.5 rounded-full border border-ink-black/15 bg-ink-black/[0.06] px-3 py-2 text-xs text-ink-black transition-colors hover:bg-ink-black/[0.10]"
        :aria-label="t('player.downloadStem', { stem: t('stem.' + stem) })"
        @click="downloadSingle(stem)"
      >
        <Download class="h-3 w-3" />
        {{ t('stem.' + stem) }}
      </button>
    </div>
  </div>
</template>
