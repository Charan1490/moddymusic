export type Song = {
  title: string;
  artist: string;
  genre: string;
  popularity: number;
};

export type Playlist = Song[];

export type HistoryItem = {
  id: string;
  mood: string;
  date: string; 
  playlist: Playlist;
};
