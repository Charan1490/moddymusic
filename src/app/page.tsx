
"use client";

import { useState, useEffect } from "react";
import type { Playlist, HistoryItem } from "@/types";
import { generatePlaylist } from "@/ai/flows/generate-playlist";
import { improvePlaylist } from "@/ai/flows/improve-playlist-flow"; // Import the new flow
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
  const [playlistFeedback, setPlaylistFeedback] = useState<string>(""); // State for feedback
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("playlistHistory");
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
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
      localStorage.removeItem("playlistHistory");
    }
  }, []);

  useEffect(() => {
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
        localStorage.removeItem("playlistHistory");
    }
  }, [playlistHistory, toast]);

  const handleMoodDetected = async (mood: string) => {
    setDetectedMood(mood);
    setCurrentPlaylist(null);
    setPlaylistFeedback(""); // Clear feedback when new mood is detected
    setIsLoading(true);

    try {
      const result = await generatePlaylist({ mood });
      if (result && result.playlist && Array.isArray(result.playlist)) {
        setCurrentPlaylist(result.playlist);
        const newHistoryItem: HistoryItem = {
          id: new Date().toISOString() + Math.random().toString(36).substring(2,9),
          mood,
          date: new Date().toISOString(),
          playlist: result.playlist,
        };
        setPlaylistHistory((prevHistory) => {
            if(prevHistory.length > 0 && prevHistory[0].mood === mood && JSON.stringify(prevHistory[0].playlist) === JSON.stringify(result.playlist)){
                return prevHistory;
            }
           return [newHistoryItem, ...prevHistory].slice(0, 10)
        });
        toast({
          title: "Playlist Generated!",
          description: `Found ${result.playlist.length} songs for your ${mood} mood.`,
        });
      } else {
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
      setCurrentPlaylist([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprovePlaylist = async (feedback: string) => {
    if (!currentPlaylist || currentPlaylist.length === 0) {
      toast({
        title: "Cannot Improve",
        description: "There is no current playlist to improve.",
        variant: "destructive",
      });
      return;
    }
    if (!feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide some feedback to improve the playlist.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "Improving Playlist...",
      description: "AI is working on your feedback.",
    });

    try {
      const result = await improvePlaylist({
        currentPlaylist,
        userFeedback: feedback,
        mood: detectedMood || undefined,
      });
      if (result && result.improvedPlaylist && Array.isArray(result.improvedPlaylist)) {
        setCurrentPlaylist(result.improvedPlaylist);
        const newHistoryItem: HistoryItem = {
          id: new Date().toISOString() + Math.random().toString(36).substring(2,9) + "-improved",
          mood: `${detectedMood} (Improved)`,
          date: new Date().toISOString(),
          playlist: result.improvedPlaylist,
        };
         setPlaylistHistory((prevHistory) => [newHistoryItem, ...prevHistory].slice(0, 10));
        toast({
          title: "Playlist Improved!",
          description: `Generated ${result.improvedPlaylist.length} songs based on your feedback.`,
        });
        setPlaylistFeedback(""); // Clear feedback after successful improvement
      } else {
        console.error("AI did not return a valid improved playlist array.", result);
        throw new Error("AI response did not contain a valid improved playlist.");
      }
    } catch (error) {
      console.error("Error improving playlist:", error);
      toast({
        title: "Error Improving Playlist",
        description: (error instanceof Error ? error.message : "Failed to improve playlist. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (playlist: Playlist, mood: string) => {
    setCurrentPlaylist(playlist);
    setDetectedMood(mood.replace(" (Improved)","")); // Remove (Improved) suffix if present
    setPlaylistFeedback(""); // Clear feedback when loading from history
    window.scrollTo({ top: 0, behavior: 'smooth' });
     toast({
        title: "Playlist Loaded",
        description: `Displaying a previous playlist for ${mood} mood.`,
      });
  };

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4 space-y-8">
      <MoodDetector onMoodDetected={handleMoodDetected} isLoading={isLoading} />

      <Separator className="my-8" />

      <PlaylistDisplay
        playlist={currentPlaylist}
        isLoading={isLoading}
        mood={detectedMood}
        feedback={playlistFeedback}
        onFeedbackChange={setPlaylistFeedback}
        onImprovePlaylist={handleImprovePlaylist}
      />

      <PlaylistHistory history={playlistHistory} onSelectHistoryItem={handleSelectHistoryItem} />
    </div>
  );
}
