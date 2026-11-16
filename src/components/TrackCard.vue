<script setup lang="ts">
import { playback, selectTrack } from '@/composables/useWorkspacePlayback'
import { ref } from 'vue'
import { t } from '@/i18n'
import { downloadAudio } from '@/composables/usePersonalLibrary'
import { getDownloadUrl } from '@/composables/useAudioUtils'
import { useAudioStore } from '@/composables/useAudioStore'
import type { StemType } from '@/composables/useAudioStore'
const props = defineProps<{ stemType: StemType; stemUrl: string; duration: number }>()
const { state } = useAudioStore()
const downloadError = ref(false)
async function download() {
  try {
    downloadError.value = false
    const key = state.results[props.stemType]?.localKey
    if (key && state.exportFormat === 'wav') await downloadAudio(key, props.stemType + '.wav')
    else window.location.href = getDownloadUrl(props.stemType, state.taskId || '', state.exportFormat)
  } catch { downloadError.value = true }
}
</script>
<template>
  <div class="white-card p-4 space-y-3" :class="{ 'active-track': playback.track === stemType }">
    <div class="flex justify-between gap-2"><h3 class="font-semibold">{{ t('stem.' + stemType) }}</h3><span class="text-sm">{{ duration.toFixed(1) }} s</span></div>
    <p class="text-sm">{{ t('work.' + stemType) }}</p>
    <button class="workspace-button w-full" :aria-pressed="playback.track === stemType" @click="selectTrack(stemType)">
      {{ playback.track === stemType ? t('p0.selected') : t('p0.selectTrack', { track: t('stem.' + stemType) }) }}
    </button>
    <button class="block text-sm underline" @click="download">{{ t('player.downloadStem', { stem: t('stem.' + stemType) }) }}</button>
    <p v-if="downloadError" role="alert">{{ t('personal.storageError') }}</p>
  </div>
</template>
