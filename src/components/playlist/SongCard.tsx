import type { Song } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, Music, Star, TrendingUp } from "lucide-react";

interface SongCardProps {
  song: Song;
}

export default function SongCard({ song }: SongCardProps) {
  return (
    <Card className="bg-card/80 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg leading-tight">{song.title}</CardTitle>
            <CardDescription className="text-sm">{song.artist}</CardDescription>
          </div>
          <Music size={24} className="text-accent flex-shrink-0 ml-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-xs text-muted-foreground gap-2">
          <Star size={14} className="text-yellow-500" />
          <span>Genre: {song.genre}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground gap-2">
          <TrendingUp size={14} className="text-green-500" />
          <span>Popularity: {song.popularity}/100</span>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" className="text-accent hover:text-accent-foreground hover:bg-accent/20">
            <PlayCircle size={18} className="mr-1" />
            Play
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <PauseCircle size={18} className="mr-1" />
            Pause
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
