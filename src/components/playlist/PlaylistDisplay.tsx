
import type { Playlist } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ListMusic, Info, Music, Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PlaylistDisplayProps {
  playlist: Playlist | null;
  isLoading: boolean;
  mood: string | null;
  feedback: string;
  onFeedbackChange: (feedback: string) => void;
  onImprovePlaylist: (feedback: string) => void;
}

export default function PlaylistDisplay({
  playlist,
  isLoading,
  mood,
  feedback,
  onFeedbackChange,
  onImprovePlaylist,
}: PlaylistDisplayProps) {
  const canImprovePlaylist = playlist && playlist.length > 0 && !isLoading;

  return (
    <Card className="shadow-lg min-h-[300px]">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ListMusic className="text-primary" />
          Current Playlist {mood && <span className="text-base font-normal text-muted-foreground">for {mood}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !currentPlaylist && ( // Show main loading spinner only if playlist is not yet set
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
        {playlist && playlist.length > 0 && (
          <>
            <ul className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-2">
              {playlist.map((song, index) => (
                <li
                  key={`${song}-${index}-${mood}`} // Add mood to key for potential re-renders
                  className="flex items-center gap-3 p-3 bg-card/80 rounded-md border border-border/50 hover:bg-accent/10 transition-colors"
                >
                   <Music size={18} className="text-accent flex-shrink-0" />
                  <span className="text-sm">{song}</span>
                </li>
              ))}
            </ul>
            {canImprovePlaylist && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-md font-semibold text-foreground">Want to improve this playlist?</h3>
                <Textarea
                  placeholder="e.g., Make it more upbeat, add some 80s rock, remove instrumental songs..."
                  value={feedback}
                  onChange={(e) => onFeedbackChange(e.target.value)}
                  className="min-h-[80px]"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => onImprovePlaylist(feedback)}
                  disabled={isLoading || !feedback.trim()}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Improving..." : "Improve This Playlist"}
                </Button>
              </div>
            )}
            {isLoading && currentPlaylist && ( // Show "Improving..." text if loading while playlist is already displayed
                <div className="flex items-center justify-center pt-4 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>AI is working on your feedback...</span>
                </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
