<script setup lang="ts">
import { computed } from 'vue'
import UploadZone from '@/components/UploadZone.vue'
import WaveformViewer from '@/components/WaveformViewer.vue'
import SeparationPanel from '@/components/SeparationPanel.vue'
import WorkspacePlayer from '@/components/WorkspacePlayer.vue'
import { useAudioStore } from '@/composables/useAudioStore'
import { t } from '@/i18n'
const { state } = useAudioStore()
const hasResults = computed(() => Object.keys(state.results).length > 0)
</script>
<template>
  <div class="audio-workspace workbench-page mx-auto px-6 pb-20">
    <header class="workbench-heading"><div><p class="workbench-kicker">AudioSift</p><h1>{{ t('home.title') }}</h1></div></header>
    <div class="workbench-layout" :class="{ 'has-results': hasResults, 'is-empty': !state.audioBuffer }">
      <section class="workbench-source" aria-labelledby="source-heading">
        <h2 id="source-heading" class="workbench-section-heading"><span>01</span>{{ t('bench.source') }}</h2>
        <UploadZone /><WaveformViewer v-if="state.audioBuffer" />
      </section>
      <aside v-if="state.audioBuffer" class="workbench-task" aria-labelledby="task-heading"><h2 id="task-heading" class="workbench-section-heading"><span>02</span>{{ t('bench.separate') }}</h2><SeparationPanel /></aside>
      <section v-if="state.audioBuffer" class="workbench-player-area" :aria-label="t('work.listen')"><h2 v-if="hasResults" class="workbench-section-heading"><span>03</span>{{ t('bench.results') }}</h2><WorkspacePlayer /></section>
    </div>
  </div>
</template>
