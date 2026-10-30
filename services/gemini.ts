
import { GoogleGenAI, Tool } from "@google/genai";
import { AIModelMode, ChatMessage } from "../types";

export const sendMessageToGemini = async (
  message: string,
  mode: AIModelMode,
  history: ChatMessage[],
  userLocation?: { latitude: number; longitude: number }
): Promise<{ text: string; groundingMetadata?: any }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    // Model selection based on guidelines
    let modelName: string;
    let tools: Tool[] | undefined = undefined;
    let toolConfig: any = undefined;

    if (mode === AIModelMode.SEARCH_FLASH) {
      modelName = 'gemini-3-flash-preview';
      tools = [{ googleSearch: {} }];
    } else if (mode === AIModelMode.MAPS_FLASH) {
      modelName = 'gemini-2.5-flash';
      tools = [{ googleMaps: {} }];
      if (userLocation) {
        toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          },
        };
      }
    } else {
      modelName = 'gemini-3-pro-preview';
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        tools,
        toolConfig,
        systemInstruction: `You are the "GasExport Geo-Assistant", an expert AI integrated into a logistics map. 
        Your goal is to help with routing, finding gas stations, checking traffic, and locating facilities.
        
        When in MAPS mode:
        1. Always be precise about distances and times.
        2. If you find a location, reference it clearly so the UI can render a map card.
        3. Keep responses concise and actionable for a driver or logistics manager.
        4. Use Persian language for responses.`,
      },
    });
    
    const text = response.text || "متاسفانه پاسخی دریافت نشد.";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { text: "خطای سیستم: دسترسی به سرویس هوش مصنوعی امکان‌پذیر نیست." };
  }
};
