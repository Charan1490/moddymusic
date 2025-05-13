import type { Playlist } from "@/types"; // Playlist is now string[]
// Removed: import SongCard from "./SongCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ListMusic, Info, Music } from "lucide-react";

interface PlaylistDisplayProps {
  playlist: Playlist | null; // string[] | null
  isLoading: boolean;
  mood: string | null;
}

export default function PlaylistDisplay({ playlist, isLoading, mood }: PlaylistDisplayProps) {
  return (
    <Card className="shadow-lg min-h-[300px]">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ListMusic className="text-primary" />
          Current Playlist {mood && <span className="text-base font-normal text-muted-foreground">for {mood}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-60">
            <LoadingSpinner size={48} className="text-primary" />
            <p className="mt-4 text-muted-foreground">Generating your playlist...</p>
          </div>
        )}
        {!isLoading && !playlist && (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <Info size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {mood ? "No playlist generated yet." : "Detect your mood to discover new music!"}
            </p>
          </div>
        )}
        {!isLoading && playlist && playlist.length === 0 && (
           <div className="flex flex-col items-center justify-center h-60 text-center">
            <Info size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              Could not find any songs for "{mood}". Try detecting your mood again.
            </p>
          </div>
        )}
        {/* Display simple list for string[] playlist */}
        {!isLoading && playlist && playlist.length > 0 && (
          <ul className="space-y-2">
            {playlist.map((song, index) => (
              <li
                key={`${song}-${index}`}
                className="flex items-center gap-3 p-3 bg-card/80 rounded-md border border-border/50 hover:bg-accent/10 transition-colors"
              >
                 <Music size={18} className="text-accent flex-shrink-0" />
                <span className="text-sm">{song}</span> {/* Display the song string directly */}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
