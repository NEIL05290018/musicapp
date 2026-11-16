<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { playlists, getPlaylistSongs } from '@/data/playlists'
import { library } from '@/composables/usePersonalLibrary'
import { useAuthStore } from '@/composables/useAuthStore'
import { musicPlayer, playMusic, pauseMusic } from '@/composables/useMusicPlayer'
import SongActions from '@/components/SongActions.vue'
import { t } from '@/i18n'
const route = useRoute(), router = useRouter(), auth = useAuthStore()
const error = ref('')
const featured = computed(() => playlists.find(p => p.id === route.params.id))
const personal = computed(() => library.playlists.find(p => p.id === route.params.id))
const title = computed(() => personal.value?.name || featured.value?.name)
const tracks = computed(() => personal.value?.songs || (featured.value ? getPlaylistSongs(featured.value) : []))
async function favorite() {
  if (!auth.isLoggedIn()) { router.push('/auth?next=/profile'); return }
  try { if (featured.value) await auth.toggleFavoritePlaylist(featured.value.id) } catch { error.value = t('personal.favoriteError') }
}
</script>
<template>
  <div class="library-page mx-auto max-w-6xl px-6 py-10">
    <button class="library-button mb-6" @click="router.push('/discover')">← {{ t('playlist.back') }}</button>
    <section v-if="title" class="glass-card p-6">
      <h1 class="mb-3 text-3xl font-semibold">{{ title }}</h1>
      <p class="mb-4 text-white/70">{{ featured?.description }} · {{ tracks.length }} {{ t('personal.tracks') }}</p>
      <button v-if="featured" class="library-button mb-4" :aria-pressed="auth.isPlaylistFavorited(featured.id)" @click="favorite">{{ auth.isPlaylistFavorited(featured.id) ? '♥' : '♡' }} {{ t('personal.favoritePlaylist') }}</button>
      <p v-if="error" role="alert">{{ error }}</p>
      <div v-for="song in tracks" :key="song.id" class="library-song-row">
        <button class="library-icon-button" :aria-label="t('player.play') + song.title" @click="musicPlayer.song?.id === song.id && musicPlayer.playing ? pauseMusic() : playMusic(song,tracks)">{{ musicPlayer.song?.id === song.id && musicPlayer.playing ? 'Ⅱ' : '▶' }}</button>
        <img :src="song.coverUrl || '/albums/album-' + song.coverIndex + '.jpg'" class="h-12 w-12 rounded-xl" alt="" />
        <span class="min-w-0 flex-1"><span class="block truncate">{{ song.title }}</span><span class="block text-xs text-white/60">{{ song.artist }}</span></span>
        <SongActions :song="song" />
      </div>
    </section>
    <p v-else>{{ t('personal.noTracks') }}</p>
  </div>
</template>
