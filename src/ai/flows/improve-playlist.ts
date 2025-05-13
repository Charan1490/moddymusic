'use server';
/**
 * @fileOverview Generates a song playlist based on mood, considering music genre and artist popularity.
 *
 * - generatePlaylist - A function that generates a playlist based on mood.
 * - GeneratePlaylistInput - The input type for the generatePlaylist function.
 * - GeneratePlaylistOutput - The return type for the generatePlaylist function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePlaylistInputSchema = z.object({
  mood: z.string().describe('The mood for which to generate the playlist.'),
});
export type GeneratePlaylistInput = z.infer<typeof GeneratePlaylistInputSchema>;

const GeneratePlaylistOutputSchema = z.object({
  playlist: z.array(
    z.object({
      title: z.string().describe('The title of the song.'),
      artist: z.string().describe('The artist of the song.'),
      genre: z.string().describe('The genre of the song.'),
      popularity: z
        .number()
        .describe('The popularity score of the song (0-100).'),
    })
  ).describe('A list of songs for the playlist.'),
});
export type GeneratePlaylistOutput = z.infer<typeof GeneratePlaylistOutputSchema>;

export async function generatePlaylist(input: GeneratePlaylistInput): Promise<GeneratePlaylistOutput> {
  return generatePlaylistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePlaylistPrompt',
  input: {schema: GeneratePlaylistInputSchema},
  output: {schema: GeneratePlaylistOutputSchema},
  prompt: `You are a playlist generation expert. Generate a playlist of songs based on the mood provided.
Consider music genre and artist popularity when generating the playlist. Optimize suggestions based on relevance to the mood.

Mood: {{{mood}}}

Output a JSON array of songs with title, artist, genre, and popularity score (0-100).`,
});

const generatePlaylistFlow = ai.defineFlow(
  {
    name: 'generatePlaylistFlow',
    inputSchema: GeneratePlaylistInputSchema,
    outputSchema: GeneratePlaylistOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
