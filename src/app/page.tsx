"use client";

import { useState, useEffect } from "react";
import type { Playlist, HistoryItem } from "@/types";
// Use the simpler generate-playlist flow
import { generatePlaylist } from "@/ai/flows/generate-playlist";
import MoodDetector from "@/components/mood/MoodDetector";
import PlaylistDisplay from "@/components/playlist/PlaylistDisplay";
import PlaylistHistory from "@/components/playlist/PlaylistHistory";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null); // Playlist is now string[]
  const [playlistHistory, setPlaylistHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("playlistHistory");
      if (storedHistory) {
        // Ensure parsing handles potential type mismatches gracefully
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
           // Basic validation: check if items have expected structure
           const validHistory = parsedHistory.filter(item =>
             item && typeof item.id === 'string' && typeof item.mood === 'string' && typeof item.date === 'string' && Array.isArray(item.playlist)
           );
           setPlaylistHistory(validHistory);
        } else {
             console.warn("Invalid playlist history found in localStorage. Resetting.");
             localStorage.removeItem("playlistHistory");
        }
      }
    } catch (error) {
      console.error("Failed to load or parse playlist history from localStorage", error);
      localStorage.removeItem("playlistHistory"); // Clear potentially corrupted data
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    // Only save if history is not empty to avoid storing initial empty array
    if (playlistHistory.length > 0) {
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
    } else {
        // If history becomes empty (e.g., cleared by user later), remove from storage
        localStorage.removeItem("playlistHistory");
    }
  }, [playlistHistory, toast]);

  // Renamed from handleMoodSelect for clarity, but functionality is the same
  const handleMoodDetected = async (mood: string) => {
    setDetectedMood(mood);
    setCurrentPlaylist(null); // Clear previous playlist
    setIsLoading(true);

    try {
      const result = await generatePlaylist({ mood }); // Calls the correct flow
      if (result && result.playlist && Array.isArray(result.playlist)) {
        setCurrentPlaylist(result.playlist); // Playlist is string[]
        const newHistoryItem: HistoryItem = {
          id: new Date().toISOString() + Math.random().toString(36).substring(2,9), // Simple unique ID
          mood,
          date: new Date().toISOString(),
          playlist: result.playlist,
        };
        // Add to history, ensuring no duplicates and keeping the limit
        setPlaylistHistory((prevHistory) => {
            // Prevent adding exact duplicate of the most recent item
            if(prevHistory.length > 0 && prevHistory[0].mood === mood && JSON.stringify(prevHistory[0].playlist) === JSON.stringify(result.playlist)){
                return prevHistory;
            }
           return [newHistoryItem, ...prevHistory].slice(0, 10) // Keep last 10
        });
        toast({
          title: "Playlist Generated!",
          description: `Found ${result.playlist.length} songs for your ${mood} mood.`,
        });
      } else {
        // Handle cases where the playlist might be missing or not an array
        console.error("AI did not return a valid playlist array.", result);
        throw new Error("AI response did not contain a valid playlist.");
      }
    } catch (error) {
      console.error("Error generating playlist:", error);
      toast({
        title: "Error Generating Playlist",
        description: (error instanceof Error ? error.message : "Failed to generate playlist. Please try again."),
        variant: "destructive",
      });
      setCurrentPlaylist([]); // Set to empty array on error
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
      {/* Pass handleMoodDetected instead of handleMoodSelect */}
      <MoodDetector onMoodDetected={handleMoodDetected} isLoading={isLoading} />

      <Separator className="my-8" />

      <PlaylistDisplay playlist={currentPlaylist} isLoading={isLoading} mood={detectedMood} />

      <PlaylistHistory history={playlistHistory} onSelectHistoryItem={handleSelectHistoryItem} />
    </div>
  );
}
