import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeSlideImage = async (base64DataUrl: string, prompt: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Extract base64 string (remove 'data:image/jpeg;base64,' prefix)
    const base64Data = base64DataUrl.split(',')[1];
    if (!base64Data) throw new Error("Invalid image data");

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for high quality image analysis
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        // Optional: system instruction could be added here if needed globally
        // systemInstruction: "You are a helpful teaching assistant.",
        thinkingConfig: { thinkingBudget: 1024 } // Giving it some room to think for detailed explanations
      }
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini");
    }

    return response.text;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
