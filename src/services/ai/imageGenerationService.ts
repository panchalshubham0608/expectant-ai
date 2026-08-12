import { getGeminiClient } from './geminiCore';

/**
 * Generates an image from a text prompt and returns it as a base64 Data URI.
 *
 * @param prompt The text prompt to generate the image from.
 * @param userApiKey Optional user-provided Gemini API key.
 * @returns A promise that resolves to the base64 Data URI of the generated image.
 */
export const generateImage = async (prompt: string, userApiKey?: string): Promise<string> => {
  try {
    const ai = getGeminiClient(userApiKey);

    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
      },
    });

    const generatedImage = response.generatedImages?.[0];
    if (!generatedImage || !generatedImage.image?.imageBytes) {
      throw new Error('No image data returned from Gemini.');
    }

    const mimeType = generatedImage.image.mimeType || 'image/jpeg';
    return `data:${mimeType};base64,${generatedImage.image.imageBytes}`;
  } catch (error: any) {
    console.error(`Failed to generate image for prompt: "${prompt}"`, error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
};