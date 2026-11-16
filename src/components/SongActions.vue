<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Song } from '@/data/songs'
import { useAuthStore } from '@/composables/useAuthStore'
import { library, addToPlaylist, rememberSongs } from '@/composables/usePersonalLibrary'
import { t } from '@/i18n'
const props = defineProps<{ song: Song }>()
const auth = useAuthStore()
const router = useRouter()
const message = ref('')
const adding = ref(false)
const busy = ref(false)
async function favorite() {
  if (!auth.isLoggedIn()) { router.push('/auth?next=/profile'); return }
  busy.value = true
  try {
    rememberSongs([props.song])
    await auth.toggleFavoriteSong(props.song.id)
  } catch { message.value = t('personal.favoriteError') }
  finally { busy.value = false }
}
function add(event: Event) {
  const select = event.target as HTMLSelectElement
  try {
    if (select.value) { addToPlaylist(select.value, props.song); message.value = t('personal.added') }
    adding.value = false
  } catch { message.value = t('personal.storageError') }
}
</script>
<template>
  <div class="flex flex-wrap items-center gap-2" @click.stop>
    <button class="library-icon-button" :disabled="busy" :aria-label="t('personal.favorite') + song.title" :aria-pressed="auth.isSongFavorited(song.id)" @click="favorite">{{ auth.isSongFavorited(song.id) ? '♥' : '♡' }}</button>
    <button class="library-icon-button" :aria-label="t('personal.addTo') + song.title" :aria-expanded="adding" @click="adding = !adding">＋</button>
    <label v-if="adding" class="text-xs">
      <span class="sr-only">{{ t('personal.choosePlaylist') }}</span>
      <select v-if="library.playlists.length" class="library-input" @change="add">
        <option value="">{{ t('personal.choosePlaylist') }}</option>
        <option v-for="list in library.playlists" :key="list.id" :value="list.id">{{ list.name }}</option>
      </select>
      <button v-else class="underline" @click="router.push('/profile')">{{ t('personal.createFirst') }}</button>
    </label>
    <span v-if="message" class="text-xs" role="status">{{ message }}</span>
  </div>
</template>
