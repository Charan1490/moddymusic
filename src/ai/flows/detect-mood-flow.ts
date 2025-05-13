
'use server';
/**
 * @fileOverview AI agent that detects mood from an image.
 *
 * - detectMoodFromImage - A function that detects mood from a facial image.
 * - DetectMoodInput - The input type for the detectMoodFromImage function.
 * - DetectMoodOutput - The return type for the detectMoodFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectMoodInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a person's face (e.g., a frame from a webcam), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectMoodInput = z.infer<typeof DetectMoodInputSchema>;

const DetectMoodOutputSchema = z.object({
  mood: z.enum(["Happy", "Sad", "Energetic", "Calm", "Neutral"])
    .describe('The detected mood. Must be one of: Happy, Sad, Energetic, Calm, Neutral.'),
});
export type DetectMoodOutput = z.infer<typeof DetectMoodOutputSchema>;

export async function detectMoodFromImage(input: DetectMoodInput): Promise<DetectMoodOutput> {
  return detectMoodFlow(input);
}

const detectMoodPrompt = ai.definePrompt({
  name: 'detectMoodPrompt',
  input: {schema: DetectMoodInputSchema},
  output: {schema: DetectMoodOutputSchema},
  prompt: `You are an expert in analyzing facial expressions from images to determine human emotions.
Analyze the provided image and identify the dominant mood of the person.
Your response must be one of the following moods: Happy, Sad, Energetic, Calm, Neutral.
Prioritize the most clearly expressed mood. If the expression is ambiguous, no clear mood is detected, or no face is present, choose 'Neutral'.

Image: {{media url=photoDataUri}}`,
  config: { // Using the default model gemini-2.0-flash which supports multimodal
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const detectMoodFlow = ai.defineFlow(
  {
    name: 'detectMoodFlow',
    inputSchema: DetectMoodInputSchema,
    outputSchema: DetectMoodOutputSchema,
  },
  async input => {
    const {output} = await detectMoodPrompt(input);
    if (!output) {
        // Fallback if AI provides no structured output, though schema should enforce.
        console.warn("AI did not provide structured output for mood detection. Falling back to Neutral.");
        return { mood: "Neutral" };
    }
    return output;
  }
);
