import type { Song } from "@/types";
import SongCard from "./SongCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ListMusic, Info } from "lucide-react";

interface PlaylistDisplayProps {
  playlist: Song[] | null;
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
              {mood ? "No playlist generated yet." : "Select a mood to discover new music!"}
            </p>
          </div>
        )}
        {!isLoading && playlist && playlist.length === 0 && (
           <div className="flex flex-col items-center justify-center h-60 text-center">
            <Info size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              Could not find any songs for "{mood}". Try another mood.
            </p>
          </div>
        )}
        {!isLoading && playlist && playlist.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlist.map((song, index) => (
              <SongCard key={`${song.title}-${index}`} song={song} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
