<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAudioStore } from '@/composables/useAudioStore'
import { musicPlayer, playMusic, pauseMusic, seekMusic, skipMusic } from '@/composables/useMusicPlayer'
import { t } from '@/i18n'
const route = useRoute()
const { state } = useAudioStore()
function clock(time: number) { return Math.floor(time / 60) + ':' + String(Math.floor(time % 60)).padStart(2, '0') }
</script>
<template>
  <section v-if="musicPlayer.song && (route.path !== '/' || musicPlayer.playing || !state.audioBuffer)" class="global-player" :aria-label="t('personal.nowPlaying')">
    <div class="min-w-0">
      <p class="truncate font-semibold">{{ musicPlayer.song.title }}</p>
      <p class="truncate text-xs text-white/65">{{ musicPlayer.song.artist }}</p>
    </div>
    <div class="flex items-center gap-2">
      <button class="library-icon-button" :disabled="musicPlayer.index === 0" :aria-label="t('player.previous')" @click="skipMusic(-1)">‹</button>
      <button class="library-primary" :disabled="musicPlayer.loading" :aria-label="musicPlayer.playing ? t('player.pause') : t('player.play')" @click="musicPlayer.playing ? pauseMusic() : playMusic()">{{ musicPlayer.loading ? '…' : musicPlayer.playing ? 'Ⅱ' : '▶' }}</button>
      <button class="library-icon-button" :disabled="musicPlayer.index >= musicPlayer.queue.length - 1" :aria-label="t('player.next')" @click="skipMusic(1)">›</button>
    </div>
    <label class="flex min-w-0 items-center gap-3 text-xs">
      <span>{{ clock(musicPlayer.position) }}</span>
      <input class="range-slider" type="range" min="0" :max="musicPlayer.duration || 0" step=".1" :value="musicPlayer.position" :aria-label="t('personal.seek')" @input="seekMusic(Number(($event.target as HTMLInputElement).value))" />
      <span>{{ clock(musicPlayer.duration) }}</span>
    </label>
    <label class="flex items-center gap-2 text-xs">{{ t('work.volume') }}<input v-model.number="musicPlayer.volume" class="range-slider w-20" type="range" min="0" max="1" step=".01" /></label>
    <div v-if="musicPlayer.error" class="col-span-full text-sm text-rose-200" role="alert">{{ t('personal.playError') }} <button class="underline" @click="playMusic()">{{ t('work.retry') }}</button></div>
    <span v-else class="sr-only" role="status">{{ musicPlayer.loading ? t('work.loading') : musicPlayer.playing ? t('p0.state.playing') : t('p0.state.paused') }}</span>
  </section>
</template>
