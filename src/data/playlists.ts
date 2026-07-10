import type { Song } from './songs'
import { songs } from './songs'

export interface Playlist {
  id: string
  name: string
  description: string
  coverIndex: number
  songIds: string[]
  tag: string
}

export const playlists: Playlist[] = [
  {
    id: 'p001', name: 'Late Night Electronic',
    description: 'The perfect soundtrack for a midnight drive',
    coverIndex: 1, songIds: ['s001', 's005', 's009', 's015', 's020', 's026'], tag: 'Electronic',
  },
  {
    id: 'p002', name: 'Urban Rhythm',
    description: 'Groove to the pulse of the city',
    coverIndex: 6, songIds: ['s007', 's013', 's023'], tag: 'Hip-Hop',
  },
  {
    id: 'p003', name: 'Lazy Afternoon',
    description: 'Sunlight through the window, warmth in the air',
    coverIndex: 5, songIds: ['s003', 's006', 's008', 's016', 's021', 's027'], tag: 'Pop',
  },
  {
    id: 'p004', name: 'Jazz Lounge',
    description: 'Light a candle, pour some whiskey',
    coverIndex: 10, songIds: ['s019', 's022', 's028'], tag: 'Jazz',
  },
  {
    id: 'p005', name: 'Paris Midnight R&B',
    description: 'The ambiguous vibe of the Seine at night',
    coverIndex: 8, songIds: ['s012', 's017', 's024', 's029'], tag: 'R&B',
  },
  {
    id: 'p006', name: 'Scream Your Heart Out',
    description: 'Unleash the rock soul within you',
    coverIndex: 4, songIds: ['s004', 's011', 's025', 's030'], tag: 'Rock',
  },
  {
    id: 'p007', name: 'City Corners',
    description: 'Folk tunes from the little tavern down the street',
    coverIndex: 7, songIds: ['s010', 's018'], tag: 'Folk',
  },
  {
    id: 'p008', name: 'Galactic Traveler',
    description: 'An interstellar musical journey through space',
    coverIndex: 2, songIds: ['s002', 's009', 's014', 's015'], tag: 'Electronic',
  },
  {
    id: 'p009', name: 'Lynx Essentials',
    description: 'The best of electronic producer Lynx',
    coverIndex: 9, songIds: ['s001', 's005', 's015', 's020', 's026'], tag: 'Electronic',
  },
  {
    id: 'p010', name: 'Four Seasons Suite',
    description: 'Experience the seasons through Chen Nian\'s music',
    coverIndex: 3, songIds: ['s003', 's008', 's021'], tag: 'Pop',
  },
  {
    id: 'p011', name: 'Chill Vibes Only',
    description: 'Low-key beats for focused work or relaxation',
    coverIndex: 8, songIds: ['s012', 's006', 's010', 's019', 's017'], tag: 'R&B',
  },
  {
    id: 'p012', name: 'Rise and Shine',
    description: 'Energetic tracks to start your day right',
    coverIndex: 5, songIds: ['s006', 's003', 's027', 's008', 's015'], tag: 'Pop',
  },
]

export function getPlaylistSongs(playlist: Playlist): Song[] {
  return playlist.songIds.map(id => songs.find(s => s.id === id)).filter((s): s is Song => s !== undefined)
}

export function getNewSongs(limit = 8): Song[] {
  return [...songs].sort((a, b) => b.year - a.year).slice(0, limit)
}

export function getTopSongs(limit = 10): Song[] {
  return [...songs].slice(0, limit)
}
