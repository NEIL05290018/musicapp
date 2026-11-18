<script setup lang="ts">
import { Compass, AudioLines, Library, ArrowUpRight, MousePointer2 } from 'lucide-vue-next'
import AboutBackdrop from '@/components/AboutBackdrop.vue'
import { t } from '@/i18n'

const features = [
  { key: 'discover', path: '/discover', icon: Compass },
  { key: 'workbench', path: '/', icon: AudioLines },
  { key: 'library', path: '/profile', icon: Library },
]
</script>

<template>
  <section class="about-page" aria-labelledby="about-heading">
    <AboutBackdrop />
    <div class="about-content">
      <div class="about-intro">
        <header class="about-hero">
          <p class="about-eyebrow">{{ t('about.title') }}</p>
          <h1 id="about-heading">{{ t('about.guideTitle') }}</h1>
          <p class="about-description">{{ t('about.guideDescription') }}</p>
          <div class="about-actions">
            <RouterLink class="library-primary" to="/">{{ t('about.openWorkbench') }}<ArrowUpRight aria-hidden="true" /></RouterLink>
            <RouterLink class="library-button" to="/discover">{{ t('about.exploreMusic') }}</RouterLink>
          </div>
        </header>
        <p class="about-reveal-hint"><MousePointer2 class="h-4 w-4" aria-hidden="true" />{{ t('about.prompt') }}</p>
      </div>

      <div class="about-features">
        <RouterLink v-for="feature in features" :key="feature.key" :to="feature.path" class="about-feature" :data-feature="feature.key">
          <div class="about-feature-heading"><component :is="feature.icon" class="h-5 w-5" aria-hidden="true" /><ArrowUpRight class="h-4 w-4" aria-hidden="true" /></div>
          <h2>{{ t('about.' + feature.key + 'Title') }}</h2>
          <p>{{ t('about.' + feature.key + 'Description') }}</p>
        </RouterLink>
      </div>

      <section class="about-quickstart" aria-labelledby="quickstart-heading">
        <h2 id="quickstart-heading">{{ t('about.quickstart') }}</h2>
        <ol>
          <li v-for="step in [1, 2, 3, 4]" :key="step"><span class="about-step-number">0{{ step }}</span><div><h3>{{ t('about.step' + step + 'Title') }}</h3><p>{{ t('about.step' + step + 'Description') }}</p></div></li>
        </ol>
        <p class="about-track-note">{{ t('about.trackNote') }}</p>
      </section>
    </div>
  </section>
</template>
