import type { HistoryItem, Playlist } from "@/types"; // Playlist is now string[]
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, CalendarDays, ListMusic, Eye, Music } from "lucide-react";

interface PlaylistHistoryProps {
  history: HistoryItem[];
  onSelectHistoryItem: (playlist: Playlist, mood: string) => void; // Playlist is string[]
}

export default function PlaylistHistory({ history, onSelectHistoryItem }: PlaylistHistoryProps) {
  if (history.length === 0) {
    return (
       <Card className="shadow-md mt-8">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="text-primary" />
            Playlist History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No playlists generated yet. Start by detecting your mood!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <History className="text-primary" />
          Playlist History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {history.map((item) => (
            <AccordionItem value={item.id} key={item.id} className="border-b border-border/50">
              <AccordionTrigger className="hover:bg-accent/10 px-2 rounded-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full text-left">
                  <span className="font-semibold text-primary-focus text-base">Mood: {item.mood}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 md:mt-0">
                    <CalendarDays size={16} />
                    {new Date(item.date).toLocaleDateString()}
                    <ListMusic size={16} className="ml-2 md:ml-4" />
                    {item.playlist.length} songs
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 px-2 bg-background/30 rounded-b-md">
                 {/* Display simple list for string[] playlist */}
                <ul className="space-y-1 text-sm max-h-48 overflow-y-auto pr-2">
                  {item.playlist.map((song, index) => (
                     <li
                      key={`${song}-${index}`}
                      className="flex items-center gap-2 text-foreground/90 py-1"
                    >
                      <Music size={14} className="text-accent flex-shrink-0" />
                      <span>{song}</span> {/* Display song string */}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-accent border-accent hover:bg-accent hover:text-accent-foreground"
                  onClick={() => onSelectHistoryItem(item.playlist, item.mood)}
                >
                  <Eye size={16} className="mr-2" />
                  View this playlist
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
