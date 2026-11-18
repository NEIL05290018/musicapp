<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { Play, Pause, Volume2, RotateCcw } from 'lucide-vue-next'
import { useAudioStore } from '@/composables/useAudioStore'
import type { StemType } from '@/composables/useAudioStore'
import ExportPanel from './ExportPanel.vue'
import { playback, playTrack, pausePlayback, seekPlayback, selectTrack, bounds } from '@/composables/useWorkspacePlayback'
import { formatTime } from '@/composables/useAudioUtils'
import { t } from '@/i18n'
const { state } = useAudioStore()
const hasResults = computed(() => Object.keys(state.results).length > 0)
const tracks = computed(() => ['original', ...Object.keys(state.results)] as ('original' | StemType)[])
const start = computed(() => bounds(playback.track)[0])
const end = computed(() => bounds(playback.track)[1])
const status = computed(() => playback.error ? 'error' : playback.loading ? 'loading' : playback.playing ? 'playing' : 'paused')
const selectedName = computed(() => playback.track === 'original' ? t('work.original') : t('stem.' + playback.track))
const changedSelection = computed(() => {
  const range = state.timeSelections[0]
  return state.resultRange && range && (Math.abs(range.startTime - state.resultRange.startTime) > .01 || Math.abs(range.endTime - state.resultRange.endTime) > .01)
})
function navigateTracks(event: KeyboardEvent, index: number) {
  const key = event.key
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
  event.preventDefault()
  const next = key === 'Home' ? 0 : key === 'End' ? tracks.value.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + tracks.value.length) % tracks.value.length
  selectTrack(tracks.value[next])
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')
  buttons?.[next]?.focus()
}
onUnmounted(pausePlayback)
</script>
<template>
  <section id="workspace-player" class="glass-card bench-player" :aria-label="t('work.listen')">
    <template v-if="hasResults">
      <div class="bench-result-heading"><div><h3>{{ t('bench.compare') }}</h3><p>{{ state.resultFileName }} <span aria-hidden="true">·</span> {{ formatTime(state.resultRange?.startTime ?? 0) }} – {{ formatTime(state.resultRange?.endTime ?? 0) }}</p></div><span class="bench-ready">{{ t('bench.ready') }}</span></div>
      <div class="bench-track-tabs" role="tablist" :aria-label="t('p0.chosen')"><button v-for="(track,index) in tracks" :id="'track-' + track" :key="track" role="tab" :aria-selected="playback.track === track" aria-controls="track-preview" :tabindex="playback.track === track ? 0 : -1" @click="selectTrack(track)" @keydown="navigateTracks($event,index)">{{ track === 'original' ? t('work.original') : t('stem.' + track) }}</button></div>
    </template>
    <div id="track-preview" :role="hasResults ? 'tabpanel' : undefined" :aria-labelledby="hasResults ? 'track-' + playback.track : undefined">
      <div class="bench-active-track"><strong>{{ selectedName }}</strong><span v-if="hasResults">{{ playback.track === 'original' ? t('bench.sourceAudio') : t('work.' + playback.track) }}</span><span class="bench-play-status" :data-state="status" role="status" aria-live="polite">{{ t('p0.state.' + status) }}</span></div>
      <div class="bench-transport">
        <button class="bench-play" :disabled="playback.loading" :aria-label="playback.playing ? t('player.pause') : t('player.play')" @click="playback.playing ? pausePlayback() : playTrack()"><Pause v-if="playback.playing" aria-hidden="true" /><Play v-else aria-hidden="true" /></button>
        <label class="bench-timeline"><span class="sr-only">{{ t('work.position') }}</span><input class="range-slider" type="range" :min="start" :max="end" step="0.01" :value="playback.position" :aria-valuetext="formatTime(playback.position)" @input="seekPlayback(Number(($event.target as HTMLInputElement).value))" /><span><time>{{ formatTime(playback.position) }}</time><time>{{ formatTime(end) }}</time></span></label>
        <button class="bench-loop" :aria-pressed="playback.loop" :aria-label="t('work.loop')" :title="t('work.loop')" @click="playback.loop = !playback.loop"><RotateCcw aria-hidden="true" /></button>
        <label class="bench-volume"><Volume2 aria-hidden="true" /><span class="sr-only">{{ t('work.volume') }}</span><input v-model.number="playback.volume" class="range-slider" type="range" min="0" max="1" step="0.01" /></label>
      </div>
      <label v-if="playback.track === 'original'" class="bench-selection-only"><input v-model="playback.selectionOnly" type="checkbox" @change="pausePlayback()" />{{ t('work.selectionOnly') }}</label>
    </div>
    <p v-if="changedSelection && hasResults" class="bench-result-warning" role="status">{{ t('p0.oldRange') }}</p>
    <p v-if="playback.error" class="text-sm" role="alert">{{ t('work.playError') }} <button class="underline" @click="playTrack()">{{ t('work.retry') }}</button></p>
    <ExportPanel v-if="hasResults" :selected-stem="playback.track === 'original' ? undefined : playback.track" />
  </section>
</template>
