<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useAudioStore } from '@/composables/useAudioStore'
import TrackCard from './TrackCard.vue'
import type { StemType } from '@/composables/useAudioStore'
import { playback, playTrack, pausePlayback, seekPlayback, selectTrack, bounds } from '@/composables/useWorkspacePlayback'
import { formatTime } from '@/composables/useAudioUtils'
import { t } from '@/i18n'
const { state } = useAudioStore()
const start = computed(() => bounds(playback.track)[0])
const end = computed(() => bounds(playback.track)[1])
const status = computed(() => playback.error ? 'error' : playback.loading ? 'loading' : playback.playing ? 'playing' : 'paused')
const changedSelection = computed(() => {
  const range = state.timeSelections[0]
  return state.resultRange && range && (Math.abs(range.startTime - state.resultRange.startTime) > .01 || Math.abs(range.endTime - state.resultRange.endTime) > .01)
})
onUnmounted(pausePlayback)
</script>
<template>
  <section id="workspace-player" class="glass-card p-5 space-y-4" :aria-label="t('work.listen')">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-base font-semibold">{{ t('work.listen') }}</h2>
      <span class="text-sm" role="status">{{ t('p0.chosen') }} {{ playback.track === 'original' ? t('work.original') : t('stem.' + playback.track) }}</span>
    </div>
    <div v-if="Object.keys(state.results).length" class="space-y-3">
      <p class="text-sm">{{ t('home.results') }} · {{ state.resultFileName }} · {{ formatTime(state.resultRange?.startTime ?? 0) }} – {{ formatTime(state.resultRange?.endTime ?? 0) }}</p>
      <p v-if="changedSelection" class="text-sm" role="status">{{ t('p0.oldRange') }}</p>
      <div class="grid gap-3 md:grid-cols-3">
        <TrackCard v-for="stem in (Object.keys(state.results) as StemType[])" :key="state.taskId + stem" :stem-type="stem" :stem-url="state.results[stem].url" :duration="state.results[stem].duration" />
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <button class="workspace-button" :aria-pressed="playback.track === 'original'" @click="selectTrack('original')">{{ t('work.original') }}</button>
      <button class="workspace-primary" :disabled="playback.loading" @click="playback.playing ? pausePlayback() : playTrack()">{{ playback.loading ? t('work.loading') : playback.playing ? t('player.pause') : t('player.play') }}</button>
      <label v-if="playback.track === 'original'" class="flex items-center gap-2 text-sm"><input v-model="playback.selectionOnly"  type="checkbox" @change="pausePlayback()" />{{ t('work.selectionOnly') }}</label>
      <label class="flex items-center gap-2 text-sm"><input v-model="playback.loop" type="checkbox" />{{ t('work.loop') }}</label>
    </div>
    <p class="text-sm" role="status" aria-live="polite">{{ t('p0.state.' + status) }}</p>
    <label class="block text-sm">
      {{ t('work.position') }} {{ formatTime(playback.position) }}
      <input class="range-slider mt-3" type="range" :min="start" :max="end" step="0.01" :value="playback.position" @input="seekPlayback(Number(($event.target as HTMLInputElement).value))" />
    </label>
    <label class="flex items-center gap-3 text-sm">{{ t('work.volume') }}<input v-model.number="playback.volume" class="range-slider max-w-40" type="range" min="0" max="1" step="0.01" /></label>
    <p v-if="playback.error" class="text-sm !text-red-700" role="alert">{{ t('work.playError') }} <button class="underline" @click="playTrack()">{{ t('work.retry') }}</button></p>
  </section>
</template>
