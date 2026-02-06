import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { ContextItem } from "../types";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Helper: Convert Cloud URL to Base64
async function urlToData(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const analyzeSlideImage = async (
  imageUrl: string, 
  promptText: string, 
  modelId: string = "gemini-2.5-flash",
  contextItems: ContextItem[] = []
) => {
  try {
    const model = genAI.getGenerativeModel({ model: modelId });

    const parts: Part[] = [];

    // 1. Add Text Prompt
    const mainPrompt = promptText || "Explain this slide in detail.";
    
    // We start with the prompt instructions
    parts.push({ text: mainPrompt });

    // 2. Add Context Items
    if (contextItems.length > 0) {
      parts.push({ text: "\n\nRefer to the following related slides for context if needed:\n" });
      
      for (const item of contextItems) {
        parts.push({ text: `\n--- Context from Slide ${item.pageNumber} ---\n` });
        
        // Add Explanation if requested
        if (item.includeExplanation && item.explanation) {
             parts.push({ text: `Pre-generated Explanation for Slide ${item.pageNumber}:\n${item.explanation}\n` });
        }

        // Add Image if requested
        if (item.includeImage && item.imageUrl) {
            let base64ContextData = item.imageUrl;
            if (item.imageUrl.startsWith('http')) {
                base64ContextData = await urlToData(item.imageUrl);
            }
            // Handle data URI prefix
            const cleanContextBase64 = base64ContextData.includes(',') 
                ? base64ContextData.split(',')[1] 
                : base64ContextData;

             parts.push({
                inlineData: {
                    data: cleanContextBase64,
                    mimeType: "image/jpeg"
                }
            });
        }
      }
      parts.push({ text: "\n--- End of Context ---\n\nTarget Slide to Analyze:\n" });
    }

    // 3. Add Target Slide Image
    let base64Data = imageUrl;
    if (imageUrl.startsWith('http')) {
      base64Data = await urlToData(imageUrl);
    }
    const cleanBase64 = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;
    
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg",
      },
    });
    
    // 4. Send Request
    const result = await model.generateContent(parts);
    const response = await result.response;
    return {
      text: response.text(),
      // We populate all fields so TypeScript is happy
      usage: result.response.usageMetadata || { 
        promptTokenCount: 0, 
        candidatesTokenCount: 0, 
        totalTokenCount: 0 
      }
    };
    
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};