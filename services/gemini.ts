import { GoogleGenAI, Tool } from "@google/genai";
import { AIModelMode, ChatMessage } from "../types";

// Safely access process.env.API_KEY without crashing if process is undefined
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Error accessing process.env", e);
  }
  return '';
};

const apiKey = getApiKey();

const ai = new GoogleGenAI({ apiKey });

export const sendMessageToGemini = async (
  message: string,
  mode: AIModelMode,
  history: ChatMessage[],
  userLocation?: { latitude: number; longitude: number }
): Promise<{ text: string; groundingMetadata?: any }> => {
  try {
    if (!apiKey) {
      return { text: "خطا: کلید API یافت نشد. لطفاً تنظیمات محیطی را بررسی کنید." };
    }

    let modelName = 'gemini-3-pro-preview';
    let tools: Tool[] | undefined = undefined;
    let toolConfig: any = undefined;

    if (mode === AIModelMode.SEARCH_FLASH) {
      modelName = 'gemini-2.5-flash';
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
    }

    const chat = ai.chats.create({
      model: modelName,
      config: {
        tools,
        toolConfig,
        systemInstruction: "شما یک دستیار هوشمند و مفید برای سیستم مدیریت صادرات گاز هستید. شما به زبان فارسی صحبت می‌کنید. شما به سوالات عمومی، جستجو در اینترنت برای اطلاعات به‌روز و پیدا کردن مکان‌ها یا مسیرها در نقشه کمک می‌کنید.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage({ message });
    
    // Extract text
    const text = result.text || "متاسفانه نتوانستم پاسخی تولید کنم.";
    
    // Extract grounding metadata if available
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "متاسفانه در ارتباط با سرویس هوش مصنوعی خطایی رخ داد. لطفاً اتصال اینترنت و کلید API را بررسی کنید." };
  }
};