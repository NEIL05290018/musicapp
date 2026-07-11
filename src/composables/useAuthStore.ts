import { reactive, readonly } from 'vue'

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
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Request failed')
  }
  return data
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
      state.user = data.user
      await loadFavorites()
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  async function loadFavorites() {
    if (!state.token) return
    try {
      const [songs, playlists] = await Promise.all([
        apiFetch('/user/favorites/songs'),
        apiFetch('/user/favorites/playlists'),
      ])
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
    setAuth(data.token, data.user)
    await loadFavorites()
    return data
  }

  async function login(email: string, password: string) {
    const data = await apiFetch('/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAuth(data.token, data.user)
    await loadFavorites()
    return data
  }

  async function toggleFavoriteSong(songId: string): Promise<boolean> {
    const data = await apiFetch('/user/favorite/song', {
      method: 'POST',
      body: JSON.stringify({ song_id: songId }),
    })
    if (data.favorited) {
      state.favoriteSongIds.push(songId)
    } else {
      state.favoriteSongIds = state.favoriteSongIds.filter(id => id !== songId)
    }
    return data.favorited
  }

  async function toggleFavoritePlaylist(playlistId: string): Promise<boolean> {
    const data = await apiFetch('/user/favorite/playlist', {
      method: 'POST',
      body: JSON.stringify({ playlist_id: playlistId }),
    })
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
