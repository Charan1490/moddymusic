"use client";

import { useState, useEffect } from "react";
import type { Song, Playlist, HistoryItem } from "@/types";
import { generatePlaylist } from "@/ai/flows/improve-playlist"; 
import MoodDetector from "@/components/mood/MoodDetector";
import PlaylistDisplay from "@/components/playlist/PlaylistDisplay";
import PlaylistHistory from "@/components/playlist/PlaylistHistory";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistHistory, setPlaylistHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load history from localStorage on mount (optional persistence)
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("playlistHistory");
      if (storedHistory) {
        setPlaylistHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load playlist history from localStorage", error);
      // Optionally, clear corrupted data
      // localStorage.removeItem("playlistHistory");
    }
  }, []);

  // Save history to localStorage when it changes (optional persistence)
  useEffect(() => {
    try {
      localStorage.setItem("playlistHistory", JSON.stringify(playlistHistory));
    } catch (error) {
      console.error("Failed to save playlist history to localStorage", error);
      toast({
        title: "Storage Error",
        description: "Could not save playlist history. Your browser's local storage might be full or disabled.",
        variant: "destructive",
      });
    }
  }, [playlistHistory, toast]);

  const handleMoodSelect = async (mood: string) => {
    setDetectedMood(mood);
    setCurrentPlaylist(null); // Clear previous playlist
    setIsLoading(true);

    try {
      const result = await generatePlaylist({ mood });
      if (result && result.playlist) {
        setCurrentPlaylist(result.playlist);
        const newHistoryItem: HistoryItem = {
          id: new Date().toISOString() + Math.random().toString(36).substring(2,9), // Simple unique ID
          mood,
          date: new Date().toISOString(),
          playlist: result.playlist,
        };
        setPlaylistHistory((prevHistory) => [newHistoryItem, ...prevHistory].slice(0, 10)); // Keep last 10
        toast({
          title: "Playlist Generated!",
          description: `Found ${result.playlist.length} songs for your ${mood} mood.`,
        });
      } else {
        throw new Error("AI did not return a valid playlist.");
      }
    } catch (error) {
      console.error("Error generating playlist:", error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Failed to generate playlist. Please try again."),
        variant: "destructive",
      });
      setCurrentPlaylist([]); // Set to empty array on error to show "Could not find songs" message
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (playlist: Playlist, mood: string) => {
    setCurrentPlaylist(playlist);
    setDetectedMood(mood);
    window.scrollTo({ top: 0, behavior: 'smooth' });
     toast({
        title: "Playlist Loaded",
        description: `Displaying a previous playlist for ${mood} mood.`,
      });
  };

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4 space-y-8">
      <MoodDetector onMoodSelect={handleMoodSelect} isLoading={isLoading} />
      
      <Separator className="my-8" />
      
      <PlaylistDisplay playlist={currentPlaylist} isLoading={isLoading} mood={detectedMood} />
      
      <PlaylistHistory history={playlistHistory} onSelectHistoryItem={handleSelectHistoryItem} />
    </div>
  );
}
