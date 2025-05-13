
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Webcam, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Possible moods the simulated "backend" can return
const possibleMoods = ["Happy", "Sad", "Energetic", "Calm"];

interface MoodDetectorProps {
  // Renamed prop for clarity
  onMoodDetected: (mood: string) => void;
  isLoading: boolean;
}

export default function MoodDetector({ onMoodDetected, isLoading }: MoodDetectorProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Request camera permission on mount
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

    // Cleanup function to stop the stream when the component unmounts
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

    setIsDetecting(true);

    // --- Simulation of Backend Processing ---
    // In a real app:
    // 1. Capture frame: const frame = captureFrame(videoRef.current);
    // 2. Send frame to Python backend API: const mood = await sendToBackend(frame);
    // 3. Call onMoodDetected(mood);

    // Simulate backend delay and response
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network/processing time

    // Simulate mood detection result (randomly choose one)
    const detectedMood = possibleMoods[Math.floor(Math.random() * possibleMoods.length)];

    toast({
      title: "Mood Detected!",
      description: `Looks like you're feeling ${detectedMood}. Generating playlist...`,
    });

    // Pass the *simulated* detected mood to the parent component
    onMoodDetected(detectedMood);

    setIsDetecting(false);
    // --- End Simulation ---

  }, [onMoodDetected, toast, hasCameraPermission]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-center md:text-left flex items-center gap-2">
          <Webcam /> Detect Your Mood
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-center md:text-left">
          Allow camera access and click the button below to detect your mood from your expression.
        </p>

        {/* Always render video element to attach stream */}
         <div className="relative aspect-video w-full max-w-md mx-auto bg-muted rounded-md overflow-hidden border">
            <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline // Important for mobile browsers
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
              disabled={isLoading || isDetecting || hasCameraPermission !== true}
              size="lg"
              aria-label="Detect mood from camera"
            >
              {isDetecting || isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Camera className="mr-2 h-5 w-5" />
              )}
              {isDetecting ? "Detecting..." : isLoading ? "Generating..." : "Detect Mood"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
