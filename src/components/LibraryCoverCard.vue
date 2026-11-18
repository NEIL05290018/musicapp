<script setup lang="ts">
import { ref, watch } from 'vue'
import { Music2, Play } from 'lucide-vue-next'
import { t } from '@/i18n'

const props = defineProps<{ title: string; subtitle?: string; cover?: string; playable?: boolean; active?: boolean }>()
defineEmits<{ open: []; play: [] }>()
const failed = ref(false)
watch(() => props.cover, () => { failed.value = false })
</script>

<template>
  <article class="library-cover-card" :class="{ 'is-active': active }">
    <button type="button" class="cover-card-open" :aria-label="title" :title="title" @click="$emit('open')">
      <span class="library-cover-art">
        <img v-if="cover && !failed" :src="cover" alt="" loading="lazy" @error="failed = true" />
        <span v-else class="library-cover-fallback"><slot name="art"><Music2 aria-hidden="true" /></slot></span>
      </span>
      <strong>{{ title }}</strong><span v-if="subtitle" class="library-cover-subtitle">{{ subtitle }}</span>
    </button>
    <button v-if="playable" type="button" class="cover-card-play" :aria-label="t('player.play') + ' ' + title" @click="$emit('play')"><Play aria-hidden="true" /></button>
    <div v-if="$slots.actions" class="cover-card-actions"><slot name="actions" /></div>
  </article>
</template>
