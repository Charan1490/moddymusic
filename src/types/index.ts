// This type is no longer used as the generate-playlist flow returns string[]
// export type Song = {
//   title: string;
//   artist: string;
//   genre: string;
//   popularity: number;
// };

// Playlist is now a simple array of strings (e.g., "Song Title - Artist")
export type Playlist = string[];

export type HistoryItem = {
  id: string;
  mood: string;
  date: string;
  playlist: Playlist; // Updated to string[]
};
