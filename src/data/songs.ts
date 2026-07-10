export interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverIndex: number
  genre: string
  year: number
}

export const genres = ['Electronic', 'Pop', 'Hip-Hop', 'Rock', 'R&B', 'Classical', 'Jazz', 'Folk']

export const songs: Song[] = [
  { id: 's001', title: 'Midnight Drive', artist: 'Lynx', album: 'Nightfall', duration: 243, coverIndex: 1, genre: 'Electronic', year: 2024 },
  { id: 's002', title: 'Stardust Voyage', artist: 'Quantum Cat', album: 'Galactic Walk', duration: 198, coverIndex: 2, genre: 'Electronic', year: 2023 },
  { id: 's003', title: 'End of Summer', artist: 'Chen Nian', album: 'Four Seasons', duration: 267, coverIndex: 3, genre: 'Pop', year: 2024 },
  { id: 's004', title: 'Neon Ruins', artist: 'Nightfall', album: 'Ruins', duration: 214, coverIndex: 4, genre: 'Rock', year: 2022 },
  { id: 's005', title: 'Deep Sea Letter', artist: 'Lynx', album: 'Nightfall', duration: 301, coverIndex: 1, genre: 'Electronic', year: 2024 },
  { id: 's006', title: 'Orange Soda', artist: 'Ono', album: 'Orange Summer', duration: 176, coverIndex: 5, genre: 'Pop', year: 2023 },
  { id: 's007', title: 'Under the Streetlight', artist: 'BeatFusion', album: 'City Beats', duration: 232, coverIndex: 6, genre: 'Hip-Hop', year: 2023 },
  { id: 's008', title: 'Amber Dreams', artist: 'Chen Nian', album: 'Four Seasons', duration: 289, coverIndex: 3, genre: 'Pop', year: 2024 },
  { id: 's009', title: 'Quantum Entanglement', artist: 'Quantum Cat', album: 'Galactic Walk', duration: 195, coverIndex: 2, genre: 'Electronic', year: 2023 },
  { id: 's010', title: 'After the Rain', artist: 'Soda Green', album: 'City Memories', duration: 258, coverIndex: 7, genre: 'Folk', year: 2021 },
  { id: 's011', title: 'Aurora Night', artist: 'Nightfall', album: 'Ruins', duration: 312, coverIndex: 4, genre: 'Rock', year: 2022 },
  { id: 's012', title: 'Tipsy', artist: 'Jasmine', album: 'Midnight Paris', duration: 201, coverIndex: 8, genre: 'R&B', year: 2024 },
  { id: 's013', title: 'Last Train Home', artist: 'BeatFusion', album: 'City Beats', duration: 245, coverIndex: 6, genre: 'Hip-Hop', year: 2023 },
  { id: 's014', title: 'Moonlight Sonata Remix', artist: 'Quantum Cat', album: 'Galactic Walk', duration: 356, coverIndex: 2, genre: 'Classical', year: 2023 },
  { id: 's015', title: 'Escape Velocity', artist: 'Lynx', album: 'Backlight', duration: 223, coverIndex: 9, genre: 'Electronic', year: 2024 },
  { id: 's016', title: 'Cherry Blossoms', artist: 'Ono', album: 'Orange Summer', duration: 187, coverIndex: 5, genre: 'Pop', year: 2023 },
  { id: 's017', title: 'Blue Hour', artist: 'Jasmine', album: 'Midnight Paris', duration: 234, coverIndex: 8, genre: 'R&B', year: 2024 },
  { id: 's018', title: 'Old Vinyl', artist: 'Soda Green', album: 'City Memories', duration: 276, coverIndex: 7, genre: 'Folk', year: 2021 },
  { id: 's019', title: 'Jazz Noir', artist: 'Amber Quartet', album: 'Midnight Jazz', duration: 298, coverIndex: 10, genre: 'Jazz', year: 2022 },
  { id: 's020', title: 'Backlight Flight', artist: 'Lynx', album: 'Backlight', duration: 211, coverIndex: 9, genre: 'Electronic', year: 2024 },
  { id: 's021', title: 'Orange Sea', artist: 'Chen Nian', album: 'Four Seasons', duration: 192, coverIndex: 3, genre: 'Pop', year: 2024 },
  { id: 's022', title: 'Jazz Club at Midnight', artist: 'Amber Quartet', album: 'Midnight Jazz', duration: 315, coverIndex: 10, genre: 'Jazz', year: 2022 },
  { id: 's023', title: 'Cyberpunk City', artist: 'BeatFusion', album: 'City Beats', duration: 228, coverIndex: 6, genre: 'Hip-Hop', year: 2023 },
  { id: 's024', title: 'One Night in Paris', artist: 'Jasmine', album: 'Midnight Paris', duration: 264, coverIndex: 8, genre: 'R&B', year: 2024 },
  { id: 's025', title: 'Fireworks', artist: 'Nightfall', album: 'Ruins', duration: 197, coverIndex: 4, genre: 'Rock', year: 2022 },
  { id: 's026', title: 'Gravity Pull', artist: 'Lynx', album: 'Backlight', duration: 248, coverIndex: 9, genre: 'Electronic', year: 2024 },
  { id: 's027', title: 'Sunday Morning Coffee', artist: 'Ono', album: 'Orange Summer', duration: 164, coverIndex: 5, genre: 'Pop', year: 2023 },
  { id: 's028', title: 'Saxophone Serenade', artist: 'Amber Quartet', album: 'Midnight Jazz', duration: 287, coverIndex: 10, genre: 'Jazz', year: 2022 },
  { id: 's029', title: 'Echoes of You', artist: 'Jasmine', album: 'Midnight Paris', duration: 219, coverIndex: 8, genre: 'R&B', year: 2024 },
  { id: 's030', title: 'Highway 99', artist: 'Nightfall', album: 'Ruins', duration: 276, coverIndex: 4, genre: 'Rock', year: 2022 },
]
