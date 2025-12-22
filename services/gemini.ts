
import { GoogleGenAI, Tool } from "@google/genai";
import { AIModelMode, ChatMessage } from "../types";

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
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const sendMessageToGemini = async (
  message: string,
  mode: AIModelMode,
  history: ChatMessage[],
  userLocation?: { latitude: number; longitude: number }
): Promise<{ text: string; groundingMetadata?: any }> => {
  try {
    if (!ai) {
      return { text: "خطا: کلید API یافت نشد. لطفاً تنظیمات سیستم را بررسی کنید." };
    }

    // مدل پیش‌فرض
    let modelName = 'gemini-3-pro-preview';
    let tools: Tool[] | undefined = undefined;
    let toolConfig: any = undefined;

    // تنظیمات ابزارها بر اساس مد انتخاب شده
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
        systemInstruction: "شما دستیار ارشد سیستم صادرات گاز هستید. پاسخ‌ها را کوتاه و کاربردی به زبان فارسی بدهید. برای جستجو یا نقشه از ابزارهای در دسترس استفاده کنید.",
      },
    });
    
    const text = response.text || "پاسخی دریافت نشد.";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // مدیریت خطای لودر گوگل (Jsloader error)
    if (error.message?.includes('Jsloader') || error.message?.includes('Timeout')) {
      return { 
        text: "خطا در بارگذاری سرویس جستجوی گوگل. این مشکل معمولاً به دلیل محدودیت‌های اینترنت رخ می‌دهد. لطفاً از اتصال VPN استفاده کنید یا مد چت را به 'چت هوشمند' تغییر دهید." 
      };
    }

    return { text: "متاسفانه در ارتباط با سرور هوش مصنوعی خطایی رخ داد. لطفاً دوباره تلاش کنید." };
  }
};
