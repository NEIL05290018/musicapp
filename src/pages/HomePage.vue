<script setup lang="ts">
import { Music, Sparkles, Waves, MicVocal } from 'lucide-vue-next'
import UploadZone from '@/components/UploadZone.vue'
import WaveformViewer from '@/components/WaveformViewer.vue'
import SeparationPanel from '@/components/SeparationPanel.vue'
import TrackCard from '@/components/TrackCard.vue'
import ExportPanel from '@/components/ExportPanel.vue'
import { useAudioStore } from '@/composables/useAudioStore'
import { STEM_COLORS } from '@/composables/useAudioUtils'
import type { StemType } from '@/composables/useAudioStore'

const { state } = useAudioStore()

const features = [
  { icon: MicVocal, key: 'vocals' as StemType },
  { icon: Music, key: 'music' as StemType },
  { icon: Waves, key: 'sfx' as StemType },
]
</script>

<template>
  <div class="mx-auto max-w-[1000px] px-6 pb-20">
    <section class="mb-8 pt-10 text-center">
      <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
        <Sparkles class="h-3.5 w-3.5 text-[#e04090]" />
        <span class="text-xs text-white/70">Demucs AI · Hybrid Transformer v4 · GPU 加速推理</span>
      </div>
      <h1 class="mb-3 text-3xl font-bold tracking-tight text-white/95">智能音频分离</h1>
      <p class="mx-auto max-w-lg text-sm leading-relaxed text-white/55">
        上传音乐文件，选择分离时段，AI 模型将精准提取人声、配乐与音效三条独立音轨
      </p>

      <div class="mt-5 flex items-center justify-center gap-6">
        <div
          v-for="f in features"
          :key="f.key"
          class="flex items-center gap-2"
        >
          <div
            class="flex h-7 w-7 items-center justify-center rounded-lg"
            :style="{ backgroundColor: `${STEM_COLORS[f.key].border}28`, color: STEM_COLORS[f.key].border }"
          >
            <component :is="f.icon" class="h-4 w-4" />
          </div>
          <span class="text-sm font-medium text-white/65">{{ STEM_COLORS[f.key].label }}</span>
        </div>
      </div>
    </section>

    <div class="flex flex-col gap-4">
      <UploadZone />

      <WaveformViewer v-if="state.audioBuffer" />

      <SeparationPanel v-if="state.audioBuffer" />

      <div v-if="Object.keys(state.results).length > 0" class="flex flex-col gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.05] p-5 backdrop-blur-xl">
        <span class="text-xs font-semibold text-white/60">分离结果</span>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TrackCard
            v-for="stem in (Object.keys(state.results) as StemType[])"
            :key="stem"
            :stem-type="stem"
            :stem-url="state.results[stem]?.url || ''"
            :duration="state.results[stem]?.duration || 0"
          />
        </div>
      </div>

      <ExportPanel />
    </div>
  </div>
</template>
