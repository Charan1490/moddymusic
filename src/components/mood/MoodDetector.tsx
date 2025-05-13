
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Webcam, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectMoodFromImage } from "@/ai/flows/detect-mood-flow"; // Import the new AI flow

interface MoodDetectorProps {
  onMoodDetected: (mood: string) => void;
  isLoading: boolean; // This isLoading is for playlist generation, not mood detection itself
}

export default function MoodDetector({ onMoodDetected, isLoading }: MoodDetectorProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDetectingMood, setIsDetectingMood] = useState(false); // Renamed for clarity, specific to this component's detection phase
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
         console.error("getUserMedia not supported on this browser");
         setHasCameraPermission(false);
         toast({
            variant: 'destructive',
            title: 'Unsupported Browser',
            description: 'Your browser does not support camera access.',
          });
          return;
      }
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description:
            "Please enable camera permissions in your browser settings to detect mood.",
        });
      }
    };

    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [toast]);

  const captureFrameAndDetectMood = useCallback(async () => {
    if (!videoRef.current || !streamRef.current || hasCameraPermission === false) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "Cannot detect mood without camera access.",
      });
      return;
    }

    setIsDetectingMood(true);
    toast({
      title: "Analyzing Expression...",
      description: "Capturing frame and sending to AI for mood detection.",
    });

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      // Ensure video dimensions are available
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          variant: "destructive",
          title: "Video Error",
          description: "Could not get video dimensions. Please try again.",
        });
        setIsDetectingMood(false);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context for frame capture.");
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUri = canvas.toDataURL('image/jpeg');

      const moodResult = await detectMoodFromImage({ photoDataUri });
      const detectedMood = moodResult.mood;

      toast({
        title: "Mood Detected!",
        description: `AI analysis complete. Detected mood: ${detectedMood}. Generating playlist...`,
      });

      onMoodDetected(detectedMood);

    } catch (error) {
      console.error("Error detecting mood with AI:", error);
      toast({
        title: "AI Mood Detection Error",
        description: (error instanceof Error ? error.message : "Failed to detect mood using AI. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsDetectingMood(false);
    }
  }, [onMoodDetected, toast, hasCameraPermission]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-center md:text-left flex items-center gap-2">
          <Webcam /> Detect Your Mood with AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-center md:text-left">
          Allow camera access, look at the camera, and click the button. Our AI will try to detect your mood from your expression.
        </p>

         <div className="relative aspect-video w-full max-w-md mx-auto bg-muted rounded-md overflow-hidden border">
            <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline 
            />
             {hasCameraPermission === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    <p className="ml-2 text-white">Initializing camera...</p>
                </div>
            )}
         </div>


        {hasCameraPermission === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              Camera permission was denied or is unavailable. Please enable it in your browser settings and refresh the page.
            </AlertDescription>
          </Alert>
        )}

        {hasCameraPermission === true && (
          <div className="flex justify-center">
            <Button
              onClick={captureFrameAndDetectMood}
              disabled={isLoading || isDetectingMood || hasCameraPermission !== true}
              size="lg"
              aria-label="Detect mood from camera using AI"
            >
              {isDetectingMood ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Camera className="mr-2 h-5 w-5" />
              )}
              {isDetectingMood ? "Detecting Mood..." : isLoading ? "Generating Playlist..." : "Detect Mood with AI"}
            </Button>
          </div>
        )}
         {!isDetectingMood && isLoading && (
          <div className="text-center mt-2">
            <p className="text-sm text-muted-foreground">Playlist is being generated based on detected mood...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
