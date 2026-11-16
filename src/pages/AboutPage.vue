<script setup lang="ts">
import { useRouter } from 'vue-router'
import { t } from '@/i18n'
const router = useRouter()
</script>
<template>
  <section class="glass-card mx-auto my-12 max-w-xl p-8">
    <h1 class="text-2xl font-semibold">{{ t('personal.aboutHelp') }}</h1>
    <p class="my-5">{{ t('personal.helpText') }}</p>
    <button class="library-button" @click="router.push('/profile')">{{ t('nav.profile') }}</button>
  </section>
</template>
