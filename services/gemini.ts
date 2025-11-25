/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SearchResult, SocialDraft, AspectRatio, ImageResolution } from "../types";

const createAIClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Searches for real-world events using Google Search Grounding.
 */
export async function searchEvents(query: string): Promise<SearchResult> {
    const ai = createAIClient();
    
    // Using gemini-2.5-flash for speed and search capability
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find detailed information about the following request: "${query}". 
        Focus on dates, locations, and key themes. Summarize the findings clearly.`,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const text = response.text || "No results found.";
    
    // Extract grounding chunks for source links
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceLinks = chunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri && web.title)
        .map((web: any) => ({ title: web.title, uri: web.uri }));

    // De-duplicate links
    const uniqueLinks = Array.from(new Map(sourceLinks.map((item: any) => [item['uri'], item])).values());

    return {
        text,
        sourceLinks: uniqueLinks as { title: string; uri: string }[]
    };
}

/**
 * Generates structured social media content from a context string.
 */
export async function draftSocialContent(context: string): Promise<SocialDraft> {
    const ai = createAIClient();

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on this event information: "${context}", create an engaging social media post for our brand "Decko". 
        The tone should be professional yet energetic.
        Also suggest a detailed AI image prompt that would match this post visually.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    caption: { type: Type.STRING, description: "The main post caption, including emojis." },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5-10 relevant hashtags." },
                    imagePrompt: { type: Type.STRING, description: "A detailed prompt for an AI image generator to create a matching visual." }
                },
                required: ["caption", "hashtags", "imagePrompt"]
            }
        }
    });

    try {
        return JSON.parse(response.text || "{}") as SocialDraft;
    } catch (e) {
        console.error("Failed to parse JSON draft", e);
        throw new Error("Could not generate a valid draft.");
    }
}

/**
 * Generates a high-fidelity marketing image.
 */
export async function generateMarketingImage(
    prompt: string, 
    aspectRatio: AspectRatio, 
    resolution: ImageResolution
): Promise<string> {
    const ai = createAIClient();

    // Use gemini-3-pro-image-preview for high quality generation
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio,
                imageSize: resolution
            }
        }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    
    throw new Error("No image data returned.");
}

/**
 * Edits an existing image based on text instructions.
 */
export async function editMarketingImage(
    base64Image: string, 
    mimeType: string, 
    instruction: string
): Promise<string> {
    const ai = createAIClient();

    // Use gemini-2.5-flash-image for editing tasks
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                },
                { text: instruction }
            ]
        }
    });

    // Flash Image output handling (iterate to find image part)
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                 return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("No edited image returned.");
}
