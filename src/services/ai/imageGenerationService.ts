import { getGeminiClient, DEFAULT_GEMINI_IMAGE_MODEL } from './geminiCore';

export interface GeneratedImage {
  data: string;
  mimeType: string;
}

/**
 * Generates an image from a text prompt and returns it as a base64 Data URI.
 *
 * @param prompt The text prompt to generate the image from.
 * @param userApiKey Optional user-provided Gemini API key.
 * @returns A promise that resolves to the base64 Data URI of the generated image.
 */
export const generateImage = async (prompt: string, userApiKey?: string): Promise<GeneratedImage> => {
  try {
    const ai = getGeminiClient(userApiKey);
    const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env;
    const model = env?.VITE_GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "4:3",
          imageSize: "1K",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
        };
      }
    }
    throw new Error("Gemini did not return an image.");

  } catch (error: any) {
    console.error(`Failed to generate image for prompt: "${prompt}"`, error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
};