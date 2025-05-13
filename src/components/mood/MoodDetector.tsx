"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Frown, Zap, CloudSun, Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

type Mood = {
  name: string;
  icon: React.ReactElement<ComponentProps<typeof Smile>>; // Using Smile as a representative type
};

const moods: Mood[] = [
  { name: "Happy", icon: <Smile size={20} /> },
  { name: "Sad", icon: <Frown size={20} /> },
  { name: "Energetic", icon: <Zap size={20} /> },
  { name: "Calm", icon: <CloudSun size={20} /> },
];

interface MoodDetectorProps {
  onMoodSelect: (mood: string) => void;
  isLoading: boolean;
}

export default function MoodDetector({ onMoodSelect, isLoading }: MoodDetectorProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-center md:text-left">How are you feeling?</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-center md:text-left">Select a mood to get playlist recommendations.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {moods.map((mood) => (
            <Button
              key={mood.name}
              variant="outline"
              className="flex flex-col items-center justify-center h-24 p-4 gap-2 text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 ease-in-out transform hover:scale-105"
              onClick={() => onMoodSelect(mood.name)}
              disabled={isLoading}
              aria-label={`Select ${mood.name} mood`}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : mood.icon}
              <span className="text-sm font-medium">{mood.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
