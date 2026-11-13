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
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : t('auth.failed')
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.push('/discover')
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[2] ml-0 bg-surface-base/70 backdrop-blur-[12px] md:ml-[240px]" />
  <div class="relative z-[3] flex min-h-screen items-center justify-center px-4 pb-20 md:pb-0">
    <div class="w-full max-w-md">
      <button
        class="mb-6 flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
        type="button"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>{{ t('auth.back') }}</span>
      </button>

      <div class="rounded-[28px] border border-white/[0.08] bg-surface-modal p-6 sm:p-8">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-pink">
            <Music2 class="h-7 w-7 text-white" />
          </div>
          <h1 class="text-xl font-bold text-white">{{ isRegister ? t('auth.createAccount') : t('auth.welcomeBack') }}</h1>
          <p class="mt-1 text-sm text-ink-secondary">
            {{ isRegister ? t('auth.registerSub') : t('auth.loginSub') }}
          </p>
        </div>

        <div v-if="errorMsg" class="mb-4 rounded-[28px] border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm text-semantic-error" role="alert">
          {{ errorMsg }}
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <div v-if="isRegister" class="relative">
            <User class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <label for="auth-username" class="sr-only">{{ t('auth.username') }}</label>
            <input
              v-model="username"
              id="auth-username"
              type="text"
              :placeholder="t('auth.username')"
              autocomplete="username"
              minlength="2"
              maxlength="50"
              required
              class="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/50 outline-none transition-all focus:border-brand-blue/50 focus:bg-white/[0.06]"
            />
          </div>

          <div class="relative">
            <Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <label for="auth-email" class="sr-only">{{ t('auth.email') }}</label>
            <input
              v-model="email"
              id="auth-email"
              type="email"
              :placeholder="t('auth.email')"
              autocomplete="email"
              required
              class="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/50 outline-none transition-all focus:border-brand-blue/50 focus:bg-white/[0.06]"
            />
          </div>

          <div class="relative">
            <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <label for="auth-password" class="sr-only">{{ t('auth.password') }}</label>
            <input
              v-model="password"
              id="auth-password"
              type="password"
              :placeholder="t('auth.password')"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              :minlength="isRegister ? 6 : undefined"
              required
              class="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/50 outline-none transition-all focus:border-brand-blue/50 focus:bg-white/[0.06]"
            />
          </div>

          <div v-if="isRegister" class="relative">
            <Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <label for="auth-confirm-password" class="sr-only">{{ t('auth.confirmPassword') }}</label>
            <input
              v-model="confirmPassword"
              id="auth-confirm-password"
              type="password"
              :placeholder="t('auth.confirmPassword')"
              autocomplete="new-password"
              minlength="6"
              required
              class="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white/90 placeholder:text-white/50 outline-none transition-all focus:border-brand-blue/50 focus:bg-white/[0.06]"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full rounded-full bg-brand-pink py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-hover active:bg-brand-pink-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Loader2 v-if="isLoading" class="mx-auto h-4 w-4 animate-spin" />
            <span v-else>{{ isRegister ? t('auth.register') : t('auth.login') }}</span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-sm text-ink-secondary">
            {{ isRegister ? t('auth.haveAccount') : t('auth.noAccount') }}
          </span>
          <button
            type="button"
            class="ml-1 rounded-full px-1 text-sm font-medium text-brand-sky transition-colors hover:text-brand-blue-hover"
            @click="isRegister = !isRegister; errorMsg = ''"
          >
            {{ isRegister ? t('auth.loginNow') : t('auth.registerNow') }}
          </button>
        </div>

        <div class="mt-6 border-t border-white/[0.06] pt-6">
          <p class="mb-3 text-center text-xs text-ink-muted">{{ t('auth.testAccounts') }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/65 transition-all hover:bg-white/[0.06] hover:text-white"
              @click="email = 'test@alice.com'; password = 'password123'"
            >
              <span class="font-medium text-white/90">Alice</span>
              <span class="block text-ink-secondary">test@alice.com</span>
            </button>
            <button
              type="button"
              class="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/65 transition-all hover:bg-white/[0.06] hover:text-white"
              @click="email = 'test@bob.com'; password = 'password123'"
            >
              <span class="font-medium text-white/90">Bob</span>
              <span class="block text-ink-secondary">test@bob.com</span>
            </button>
            <button
              type="button"
              class="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/65 transition-all hover:bg-white/[0.06] hover:text-white"
              @click="email = 'test@carol.com'; password = 'password123'"
            >
              <span class="font-medium text-white/90">Carol</span>
              <span class="block text-ink-secondary">test@carol.com</span>
            </button>
            <button
              type="button"
              class="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-white/65 transition-all hover:bg-white/[0.06] hover:text-white"
              @click="email = 'admin@audiosift.com'; password = 'admin123'"
            >
              <span class="font-medium text-white/90">Admin</span>
              <span class="block text-ink-secondary">admin@audiosift.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
