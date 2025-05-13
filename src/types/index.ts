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

export interface User {
  _id: string; // Typically ObjectId from MongoDB, but string for simplicity here
  email: string;
  hashedPassword?: string; // Optional because we don't always fetch it
  createdAt: Date;
}

export interface SessionPayload {
  userId: string;
  email: string;
  expiresAt?: Date;
}
