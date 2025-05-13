
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Webcam, Loader2, AlertCircle, Cpu, Brain } from "lucide-react"; // Added Cpu and Brain icons
import { useToast } from "@/hooks/use-toast";
import { detectMoodFromImage as detectMoodWithAI } from "@/ai/flows/detect-mood-flow";

interface MoodDetectorProps {
  onMoodDetected: (mood: string) => void;
  isLoading: boolean; // This isLoading is for playlist generation, not mood detection itself
}

export default function MoodDetector({ onMoodDetected, isLoading: isPlaylistLoading }: MoodDetectorProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isDetectingMood, setIsDetectingMood] = useState(false);
  const [detectionEngine, setDetectionEngine] = useState<'ai' | 'python' | null>(null);
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

  const captureFrameAndDetectMood = useCallback(async (engine: 'ai' | 'python') => {
    if (!videoRef.current || !streamRef.current || hasCameraPermission === false) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "Cannot detect mood without camera access.",
      });
      return;
    }

    setIsDetectingMood(true);
    setDetectionEngine(engine);
    toast({
      title: `Analyzing Expression (${engine === 'ai' ? 'AI' : 'Python'})...`,
      description: "Capturing frame and sending for mood detection.",
    });

    let detectedMoodValue: string = "Neutral";
    let detectionDetail: string | undefined = "Mood detection initiated.";

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          variant: "destructive",
          title: "Video Error",
          description: "Could not get video dimensions. Please try again.",
        });
        setIsDetectingMood(false);
        setDetectionEngine(null);
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

      if (engine === 'ai') {
        const moodResult = await detectMoodWithAI({ photoDataUri });
        detectedMoodValue = moodResult.mood;
        detectionDetail = `AI analysis complete. Detected mood: ${detectedMoodValue}.`;
      } else { // engine === 'python'
        const response = await fetch('/api/detect-mood-python', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoDataUri }),
        });
        const moodResult = await response.json();

        if (!response.ok || moodResult.error) {
          let errorMsg = moodResult.detail || moodResult.error || `Python backend error: ${response.statusText}`;
          if (response.status === 500 && (errorMsg.includes("Failed to start Python subprocess") || errorMsg.includes("Command") && errorMsg.includes("not found"))) {
            errorMsg = `Python script execution failed. Ensure Python is installed and in your system PATH. If not, set the PYTHON_EXECUTABLE environment variable in your .env file. Details: ${moodResult.detail || moodResult.error}`;
          } else if (response.status === 500 && moodResult.error) {
             errorMsg = `Python script error: ${moodResult.detail || moodResult.error}. Check Python dependencies.`;
          }
          throw new Error(errorMsg);
        }
        
        detectedMoodValue = moodResult.mood || "Neutral";
        detectionDetail = moodResult.detail || `Python analysis complete. Detected mood: ${detectedMoodValue}.`;

        if(moodResult.error) { // This case might be redundant if !response.ok covers it.
             console.warn("Python mood detection returned an error in response:", moodResult.error);
             detectionDetail = `Python analysis note: ${moodResult.error}`; // Potentially override with more specific error below
        }
      }

      toast({
        title: "Mood Detected!",
        description: `${detectionDetail} Generating playlist...`,
      });
      onMoodDetected(detectedMoodValue);

    } catch (error) {
      console.error(`Error detecting mood with ${engine}:`, error);
      let description = (error instanceof Error ? error.message : "Failed to detect mood. Please try again.");
      if (engine === 'python' && (description.includes("Failed to start Python subprocess") || description.includes("not found") || description.includes("ENOENT"))) {
          description = `Python script execution failed. Ensure Python is installed and in your system PATH. You might need to set the PYTHON_EXECUTABLE environment variable in your .env file (e.g., PYTHON_EXECUTABLE=python3 or C:\\Python39\\python.exe). Original error: ${description}`;
      }
      toast({
        title: `Mood Detection Error (${engine === 'ai' ? 'AI' : 'Python'})`,
        description: description,
        variant: "destructive",
      });
      onMoodDetected("Neutral"); // Fallback to neutral on error before playlist gen
    } finally {
      setIsDetectingMood(false);
      setDetectionEngine(null);
    }
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
          Allow camera access, look at the camera, and choose a detection method.
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
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <Button
              onClick={() => captureFrameAndDetectMood('ai')}
              disabled={isPlaylistLoading || isDetectingMood || hasCameraPermission !== true}
              size="lg"
              aria-label="Detect mood from camera using AI (Gemini)"
              className="w-full sm:w-auto"
            >
              {(isDetectingMood && detectionEngine === 'ai') ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Brain className="mr-2 h-5 w-5" />
              )}
              {(isDetectingMood && detectionEngine === 'ai') ? "Detecting (AI)..." : isPlaylistLoading ? "Generating Playlist..." : "Detect with AI"}
            </Button>
            <Button
              onClick={() => captureFrameAndDetectMood('python')}
              disabled={isPlaylistLoading || isDetectingMood || hasCameraPermission !== true}
              size="lg"
              variant="secondary"
              aria-label="Detect mood from camera using Python (Local Model)"
              className="w-full sm:w-auto"
            >
              {(isDetectingMood && detectionEngine === 'python') ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Cpu className="mr-2 h-5 w-5" />
              )}
              {(isDetectingMood && detectionEngine === 'python') ? "Detecting (Python)..." : isPlaylistLoading ? "Generating Playlist..." : "Detect with Python"}
            </Button>
          </div>
        )}
         {!isDetectingMood && isPlaylistLoading && (
          <div className="text-center mt-2">
            <p className="text-sm text-muted-foreground">Playlist is being generated based on detected mood...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    
