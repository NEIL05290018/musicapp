<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Music2, Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-vue-next'
import { useAuthStore } from '@/composables/useAuthStore'
import { t } from '@/i18n'

const router = useRouter()
const auth = useAuthStore()

const isRegister = ref(false)
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

async function submit() {
  errorMsg.value = ''

  if (!email.value.trim() || !password.value.trim()) {
    errorMsg.value = t('auth.fillEmailPassword')
    return
  }

  if (isRegister.value) {
    if (!username.value.trim()) {
      errorMsg.value = t('auth.fillUsername')
      return
    }
    if (password.value !== confirmPassword.value) {
      errorMsg.value = t('auth.passwordMismatch')
      return
    }
  }

  isLoading.value = true
  try {
    if (isRegister.value) {
      await auth.register(username.value.trim(), email.value.trim(), password.value)
    } else {
      await auth.login(email.value.trim(), password.value)
    }
    router.push('/discover')
  } catch (e: any) {
    errorMsg.value = e.message || t('auth.failed')
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.push('/discover')
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[2] ml-[240px] backdrop-blur-[12px] bg-black/25" />
  <div class="relative z-[3] flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-md">
      <button
        class="mb-6 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>{{ t('auth.back') }}</span>
      </button>

      <div class="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e04090] to-[#5b9cff] shadow-lg shadow-[#e04090]/20">
            <Music2 class="h-7 w-7 text-white" />
          </div>
          <h1 class="text-xl font-bold text-white">{{ isRegister ? t('auth.createAccount') : t('auth.welcomeBack') }}</h1>
          <p class="mt-1 text-sm text-white/40">
            {{ isRegister ? t('auth.registerSub') : t('auth.loginSub') }}
          </p>
        </div>

        <div v-if="errorMsg" class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {{ errorMsg }}
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div v-if="isRegister" class="relative">
            <User class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              v-model="username"
              type="text"
              :placeholder="t('auth.username')"
              class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
            />
          </div>

          <div class="relative">
            <Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              v-model="email"
              type="email"
              :placeholder="t('auth.email')"
              class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
            />
          </div>

          <div class="relative">
            <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              v-model="password"
              type="password"
              :placeholder="t('auth.password')"
              class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
            />
          </div>

          <div v-if="isRegister" class="relative">
            <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.confirmPassword')"
              class="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/25 outline-none backdrop-blur-sm transition-all focus:border-white/[0.15] focus:bg-white/[0.06]"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full rounded-none bg-[#e04090] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff5aa5] active:bg-[#c02f76] disabled:opacity-60 disabled:pointer-events-none"
          >
            <Loader2 v-if="isLoading" class="mx-auto h-4 w-4 animate-spin" />
            <span v-else>{{ isRegister ? t('auth.register') : t('auth.login') }}</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-sm text-white/35">
            {{ isRegister ? t('auth.haveAccount') : t('auth.noAccount') }}
          </span>
          <button
            class="ml-1 text-sm font-medium text-[#5b9cff] hover:text-[#7bc8ff] transition-colors"
            @click="isRegister = !isRegister; errorMsg = ''"
          >
            {{ isRegister ? t('auth.loginNow') : t('auth.registerNow') }}
          </button>
        </div>

        <div class="mt-6 border-t border-white/[0.06] pt-6">
          <p class="text-center text-xs text-white/25 mb-3">{{ t('auth.testAccounts') }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="rounded-none border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              @click="email = 'test@alice.com'; password = 'password123'"
            >
              <span class="font-medium text-white/60">Alice</span>
              <span class="block text-white/25">test@alice.com</span>
            </button>
            <button
              class="rounded-none border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              @click="email = 'test@bob.com'; password = 'password123'"
            >
              <span class="font-medium text-white/60">Bob</span>
              <span class="block text-white/25">test@bob.com</span>
            </button>
            <button
              class="rounded-none border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              @click="email = 'test@carol.com'; password = 'password123'"
            >
              <span class="font-medium text-white/60">Carol</span>
              <span class="block text-white/25">test@carol.com</span>
            </button>
            <button
              class="rounded-none border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              @click="email = 'admin@audiosift.com'; password = 'admin123'"
            >
              <span class="font-medium text-white/60">Admin</span>
              <span class="block text-white/25">admin@audiosift.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
