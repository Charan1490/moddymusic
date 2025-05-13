
'use server';
/**
 * @fileOverview AI agent that refines a music playlist based on user feedback.
 *
 * - improvePlaylist - A function that refines a playlist based on an existing playlist and user feedback.
 * - ImprovePlaylistInput - The input type for the improvePlaylist function.
 * - ImprovePlaylistOutput - The return type for the improvePlaylist function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImprovePlaylistInputSchema = z.object({
  currentPlaylist: z
    .array(z.string())
    .describe('The current list of songs in the playlist. Each string is a song title and artist.'),
  userFeedback: z
    .string()
    .describe('User feedback on how to improve the playlist. e.g., "more upbeat", "less rock", "add songs like Artist X".'),
   mood: z.string().optional().describe('The original mood for which the playlist was generated. This helps maintain context.')
});
export type ImprovePlaylistInput = z.infer<typeof ImprovePlaylistInputSchema>;

const ImprovePlaylistOutputSchema = z.object({
  improvedPlaylist: z
    .array(z.string())
    .describe('An array of songs for the improved playlist, based on the feedback. Each string should be a song title and artist.'),
});
export type ImprovePlaylistOutput = z.infer<typeof ImprovePlaylistOutputSchema>;

export async function improvePlaylist(input: ImprovePlaylistInput): Promise<ImprovePlaylistOutput> {
  return improvePlaylistFlow(input);
}

const improvePlaylistPrompt = ai.definePrompt({
  name: 'improvePlaylistPrompt',
  input: {schema: ImprovePlaylistInputSchema},
  output: {schema: ImprovePlaylistOutputSchema},
  prompt: `You are an expert playlist curator. You will refine an existing music playlist based on user feedback.
The goal is to adjust the playlist to better match the user's preferences while ideally staying suitable for the original mood if provided.

Original Mood (if specified by user): {{{mood}}}
Existing Playlist:
{{#each currentPlaylist}}
- {{{this}}}
{{/each}}

User Feedback: "{{{userFeedback}}}"

Based on the feedback, generate an improved playlist of approximately 10 songs.
Each song entry in the output array should be a string containing the song title and artist.
Ensure the new playlist incorporates the user's suggestions effectively. If the feedback is vague, try to make sensible adjustments.
If the feedback requests removal of certain types of songs, ensure they are not present in the new playlist.
If the feedback requests additions, try to add relevant songs.
Maintain a good flow and variety in the improved playlist unless the feedback specifies otherwise.
`,
  config: {
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

const improvePlaylistFlow = ai.defineFlow(
  {
    name: 'improvePlaylistFlow',
    inputSchema: ImprovePlaylistInputSchema,
    outputSchema: ImprovePlaylistOutputSchema,
  },
  async input => {
    const {output} = await improvePlaylistPrompt(input);
    if (!output || !output.improvedPlaylist) {
        // Fallback if AI provides no structured output
        console.warn("AI did not provide structured output for playlist improvement. Returning original playlist.");
        return { improvedPlaylist: input.currentPlaylist };
    }
    return output;
  }
);
