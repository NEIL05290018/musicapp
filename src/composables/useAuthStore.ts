import { reactive, readonly } from 'vue'
import { t } from '@/i18n'

interface UserInfo {
  id: number
  username: string
  email: string
  avatar_url: string
  created_at: string
}

interface AuthState {
  token: string
  user: UserInfo | null
  favoriteSongIds: string[]
  favoritePlaylistIds: string[]
}

const state = reactive<AuthState>({
  token: localStorage.getItem('auth_token') || '',
  user: null,
  favoriteSongIds: [],
  favoritePlaylistIds: [],
})

const API_BASE = '/api'

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`
  }
  let res: Response
  let body: string
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    body = await res.text()
  } catch {
    throw new Error(t('auth.serviceUnavailable'))
  }
  let data
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error(t(res.ok ? 'auth.invalidResponse' : 'auth.serviceUnavailable'))
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(t('auth.invalidResponse'))
  }
  if (!res.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : ''
    throw new Error(res.status >= 500 ? t('auth.serviceUnavailable') : detail || t('auth.failed'))
  }
  return data
}

function validateAuthResponse(data: { token?: unknown; user?: UserInfo }) {
  if (typeof data.token !== 'string' || !data.token.trim() || !data.user
    || typeof data.user.id !== 'number' || typeof data.user.username !== 'string'
    || typeof data.user.email !== 'string') {
    throw new Error(t('auth.invalidResponse'))
  }
}

export function useAuthStore() {
  function setAuth(token: string, user: UserInfo) {
    state.token = token
    state.user = user
    localStorage.setItem('auth_token', token)
  }

  function clearAuth() {
    state.token = ''
    state.user = null
    state.favoriteSongIds = []
    state.favoritePlaylistIds = []
    localStorage.removeItem('auth_token')
  }

  async function restoreSession() {
    const saved = localStorage.getItem('auth_token')
    if (!saved) return false
    state.token = saved
    try {
      const data = await apiFetch('/user/me')
      if (state.token !== saved) return false
      state.user = data.user
      await loadFavorites()
      return true
    } catch {
      if (state.token === saved) clearAuth()
      return false
    }
  }

  async function loadFavorites() {
    if (!state.token) return
    const token = state.token
    try {
      const [songs, playlists] = await Promise.all([
        apiFetch('/user/favorites/songs'),
        apiFetch('/user/favorites/playlists'),
      ])
      if (token !== state.token) return
      state.favoriteSongIds = songs.song_ids || []
      state.favoritePlaylistIds = playlists.playlist_ids || []
    } catch {
      // silently fail
    }
  }

  async function register(username: string, email: string, password: string) {
    const data = await apiFetch('/user/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })
    validateAuthResponse(data)
    setAuth(data.token, data.user)
    await loadFavorites()
    return data
  }

  async function login(email: string, password: string) {
    const data = await apiFetch('/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    validateAuthResponse(data)
    setAuth(data.token, data.user)
    await loadFavorites()
    return data
  }

  async function toggleFavoriteSong(songId: string): Promise<boolean> {
    const token = state.token
    const data = await apiFetch('/user/favorite/song', {
      method: 'POST',
      body: JSON.stringify({ song_id: songId }),
    })
    if (state.token !== token) return data.favorited
    if (data.favorited) {
      state.favoriteSongIds.push(songId)
    } else {
      state.favoriteSongIds = state.favoriteSongIds.filter(id => id !== songId)
    }
    return data.favorited
  }

  async function toggleFavoritePlaylist(playlistId: string): Promise<boolean> {
    const token = state.token
    const data = await apiFetch('/user/favorite/playlist', {
      method: 'POST',
      body: JSON.stringify({ playlist_id: playlistId }),
    })
    if (state.token !== token) return data.favorited
    if (data.favorited) {
      state.favoritePlaylistIds.push(playlistId)
    } else {
      state.favoritePlaylistIds = state.favoritePlaylistIds.filter(id => id !== playlistId)
    }
    return data.favorited
  }

  function isSongFavorited(songId: string): boolean {
    return state.favoriteSongIds.includes(songId)
  }

  function isPlaylistFavorited(playlistId: string): boolean {
    return state.favoritePlaylistIds.includes(playlistId)
  }

  const isLoggedIn = () => !!state.token && !!state.user

  return {
    state: readonly(state),
    setAuth,
    clearAuth,
    restoreSession,
    loadFavorites,
    register,
    login,
    toggleFavoriteSong,
    toggleFavoritePlaylist,
    isSongFavorited,
    isPlaylistFavorited,
    isLoggedIn,
  }
}
