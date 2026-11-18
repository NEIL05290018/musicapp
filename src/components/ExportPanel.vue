<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useAudioStore } from '@/composables/useAudioStore'
import { getDownloadUrl } from '@/composables/useAudioUtils'
import { downloadAudio } from '@/composables/usePersonalLibrary'
import { t } from '@/i18n'
import type { StemType } from '@/composables/useAudioStore'
const props = defineProps<{ selectedStem?: StemType }>()
const { state, setExportFormat } = useAudioStore()
const downloadError = ref(false)
const downloading = ref(false)
const retryAll = ref(false)
watch(() => props.selectedStem, () => { downloadError.value = false })
async function downloadSingle(stem: StemType) {
  if (state.results[stem]?.localKey && state.exportFormat === 'wav') {
    await downloadAudio(state.results[stem].localKey!, 'AudioSift_' + stem + '.wav')
  } else {
    const response = await fetch(getDownloadUrl(stem, state.taskId || '', state.exportFormat))
    if (!response.ok || response.status === 204) throw new Error('Download unavailable')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'AudioSift_' + stem + '.' + state.exportFormat
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
async function download(all = false) {
  if (downloading.value || (!all && !props.selectedStem)) return
  downloadError.value = false
  retryAll.value = all
  downloading.value = true
  try {
    const stems = all ? Object.keys(state.results) as StemType[] : [props.selectedStem!]
    for (const stem of stems) await downloadSingle(stem)
  } catch { downloadError.value = true }
  finally { downloading.value = false }
}
</script>
<template>
  <footer class="bench-export">
    <div class="bench-export-main">
      <p class="bench-export-hint">{{ selectedStem ? t('bench.downloadHint', { track: t('stem.' + selectedStem) }) : t('bench.chooseDownload') }}</p>
      <label><span class="sr-only">{{ t('export.title') }}</span><select class="workspace-input" :value="state.exportFormat" :disabled="downloading" @change="setExportFormat(($event.target as HTMLSelectElement).value as 'wav' | 'mp3')"><option value="wav">WAV</option><option value="mp3" :disabled="state.resultsStoredOnly">MP3</option></select></label>
      <button class="workspace-primary" :disabled="!selectedStem || downloading" :aria-label="selectedStem ? t('player.downloadStem', { stem: t('stem.' + selectedStem) }) : t('bench.downloadSelected')" @click="download()"><Download aria-hidden="true" />{{ downloading ? t('bench.downloading') : t('bench.downloadSelected') }}</button>
    </div>
    <details class="bench-export-more"><summary>{{ t('bench.moreExport') }}</summary><p v-if="state.resultsStoredOnly">{{ t('personal.savedWav') }}</p><button class="workspace-button" :disabled="downloading" @click="download(true)">{{ t('export.downloadAll') }}</button></details>
    <p v-if="downloadError" role="alert">{{ t('bench.downloadError') }} <button class="underline" @click="download(retryAll)">{{ t('work.retry') }}</button></p>
  </footer>
</template>
