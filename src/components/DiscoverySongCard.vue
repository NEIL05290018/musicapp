<script setup lang="ts">
import type { Song } from '@/data/songs'
import SongActions from './SongActions.vue'
import { musicPlayer } from '@/composables/useMusicPlayer'
import { t } from '@/i18n'
defineProps<{ song: Song }>()
defineEmits<{ play: [song: Song]; detail: [song: Song] }>()
</script>
<template>
  <article class="discovery-music-card green-card group">
    <div class="relative mb-3 aspect-square overflow-hidden rounded-2xl">
      <img :src="song.coverUrl || '/albums/album-' + song.coverIndex + '.jpg'" alt="" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      <button class="discovery-cover-play" :aria-label="(musicPlayer.song?.id === song.id && musicPlayer.playing ? t('player.pause') : t('player.play')) + song.title" @click="$emit('play',song)">{{ musicPlayer.song?.id === song.id && musicPlayer.playing ? 'Ⅱ' : '▶' }}</button>
    </div>
    <button class="block w-full truncate text-left font-semibold" @click="$emit('detail',song)">{{ song.title }}</button>
    <p class="mb-3 mt-1 truncate text-xs text-white/60">{{ song.artist }}</p>
    <SongActions :song="song" />
  </article>
</template>
