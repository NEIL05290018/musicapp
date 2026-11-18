<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import { t } from '@/i18n'
const props = defineProps<{ open: boolean; title: string; compact?: boolean; status?: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const labelId = 'library-dialog-' + crypto.randomUUID()
let previousOverflow: string | undefined
function unlockScroll() {
  if (previousOverflow !== undefined) { document.body.style.overflow = previousOverflow; previousOverflow = undefined }
}
watch(() => props.open, async open => {
  await nextTick()
  if (open && props.open) {
    if (previousOverflow === undefined) previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!dialog.value?.open) dialog.value?.showModal()
  } else { dialog.value?.close(); unlockScroll() }
}, { immediate: true })
onUnmounted(unlockScroll)
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="library-dialog" :class="{ 'is-compact': compact }" :aria-labelledby="labelId" @cancel.prevent="emit('close')" @close="unlockScroll(); props.open && emit('close')" @click="($event.target === dialog) && emit('close')">
      <div class="library-dialog-content">
        <header class="library-dialog-heading"><h2 :id="labelId">{{ title }}</h2><button type="button" class="library-icon-button" :aria-label="t('modal.close')" @click="emit('close')"><X class="h-5 w-5" aria-hidden="true" /></button></header>
        <slot />
        <p v-if="status" class="library-dialog-status" role="status">{{ status }}</p>
      </div>
    </dialog>
  </Teleport>
</template>
