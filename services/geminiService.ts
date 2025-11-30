import { GoogleGenerativeAI } from "@google/generative-ai";

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

export const analyzeSlideImage = async (imageUrl: string, promptText: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" }); // or gemini-1.5-pro

    // 1. CHECK: Is this a URL? If so, convert it.
    let base64Data = imageUrl;
    if (imageUrl.startsWith('http')) {
      base64Data = await urlToData(imageUrl);
    }

    // 2. Prepare the image data for Gemini
    // Remove the "data:image/jpeg;base64," prefix if present
    const cleanBase64 = base64Data.split(',')[1]; 
    
    // We assume JPEG, but you could extract the real type from the blob if needed
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: "image/jpeg",
      },
    };

    const prompt = promptText || "Explain this slide in detail.";
    
    // 3. Send Request
    const result = await model.generateContent([prompt, imagePart]);
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