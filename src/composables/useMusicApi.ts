import { ref } from 'vue'
import { t } from '@/i18n'

const METING_BASE = 'https://api.injahow.cn/meting/'

export interface MetingSong {
  id: string
  name: string
  artist: string
  album: string
  pic_id: string
  url_id: string
  lyric_id: string
  source: string
  time?: number
}

export interface MusicApiSong {
  id: string
  title: string
  artist: string
  album: string
  coverUrl: string
  audioUrl: string
  lyricUrl: string
  duration: number
}

const songCache = ref<Map<string, MusicApiSong>>(new Map())
const audioCache = ref<Map<string, string>>(new Map())

function resolveCoverUrl(picId: string): string {
  return `https://api.injahow.cn/meting/pic.php?server=netease&type=cover&id=${picId}`
}

function resolveAudioUrl(audioId: string): string {
  return `https://api.injahow.cn/meting/?server=netease&type=url&id=${audioId}`
}

function resolveLyricUrl(lyricId: string): string {
  return `https://api.injahow.cn/meting/?server=netease&type=lrc&id=${lyricId}`
}

export async function searchSongs(keyword: string, limit = 20): Promise<MusicApiSong[]> {
  const keywords = ['Taylor Swift', 'Ed Sheeran', 'BTS', 'Coldplay', 'Adele', 'Imagine Dragons', 'chill', 'jazz', 'electronic', 'pop hits', 'classical', 'rock classics']
  const kw = keyword || keywords[Math.floor(Math.random() * keywords.length)]

  try {
    const url = `${METING_BASE}?server=netease&type=search&id=${encodeURIComponent(kw)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('API request failed')
    const data: MetingSong[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) throw new Error('No results found')

    const songs: MusicApiSong[] = data.slice(0, limit).map((item) => ({
      id: String(item.id),
      title: item.name || t('api.unknownSong'),
      artist: item.artist || t('api.unknownArtist'),
      album: item.album || t('api.unknownAlbum'),
      coverUrl: resolveCoverUrl(item.pic_id),
      audioUrl: resolveAudioUrl(item.url_id),
      lyricUrl: resolveLyricUrl(item.lyric_id),
      duration: item.time ? Math.round(item.time / 1000) : 200,
    }))

    songs.forEach((s) => songCache.value.set(s.id, s))
    return songs
  } catch {
    return []
  }
}

export async function fetchLyric(lyricUrl: string): Promise<string> {
  try {
    const res = await fetch(lyricUrl)
    if (!res.ok) return ''
    const data = await res.json()
    if (data && data.lrc) {
      return typeof data.lrc === 'string'
        ? data.lrc
        : data.lrc.lyric || ''
    }
    if (data && data.lyric) {
      return data.lyric
    }
    return ''
  } catch {
    return ''
  }
}

export async function resolvePlayableUrl(audioUrl: string): Promise<string> {
  if (audioCache.value.has(audioUrl)) {
    return audioCache.value.get(audioUrl)!
  }
  try {
    const res = await fetch(audioUrl)
    if (!res.ok) throw new Error('Failed to fetch audio')
    const data = await res.json()
    const playUrl = data.url || data.data?.[0]?.url || ''
    if (playUrl) {
      audioCache.value.set(audioUrl, playUrl)
    }
    return playUrl
  } catch {
    return ''
  }
}

export function getCachedSong(id: string): MusicApiSong | undefined {
  return songCache.value.get(id)
}

export function parseLyricText(rawLrc: string): { time: number; text: string }[] {
  if (!rawLrc) return []
  const lines: { time: number; text: string }[] = []
  const regex = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\](.*?)(?=\n|$)/
  const matches = rawLrc.match(/\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\][^\n]*/g)
  if (!matches) return []
  for (const match of matches) {
    const result = regex.exec(match)
    if (!result) continue
    const mins = parseInt(result[1], 10)
    const secs = parseInt(result[2], 10)
    const ms = parseInt(result[3] || '0', 10)
    const text = (result[4] || '').trim()
    if (!text) continue
    lines.push({ time: mins * 60 + secs + ms / (result[3]?.length === 3 ? 1000 : 100), text })
  }
  return lines
}
