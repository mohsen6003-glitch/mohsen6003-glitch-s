import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/gemini';
import { ChatMessage, AIModelMode } from '../types';
import { Send, Bot, MapPin, Search, User, Sparkles, Map as MapIcon, Link as LinkIcon, AlertCircle } from 'lucide-react';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'سلام! من دستیار هوشمند شما هستم. می‌توانم در مورد سوالات عمومی، جستجوی قیمت‌های لحظه‌ای یا پیدا کردن مکان‌ها روی نقشه به شما کمک کنم.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AIModelMode>(AIModelMode.CHAT_PRO);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get location for Map mode
  useEffect(() => {
    if (mode === AIModelMode.MAPS_FLASH && !location) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    // Fallback or notify user
                }
            );
        }
    }
  }, [mode]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(userMsg.text, mode, messages, location);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date(),
        groundingMetadata: response.groundingMetadata
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        console.error("Chat Error", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "متاسفانه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
            timestamp: new Date()
        }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderGroundingSource = (msg: ChatMessage) => {
    if (!msg.groundingMetadata?.groundingChunks) return null;

    const webSources = msg.groundingMetadata.groundingChunks.filter(c => c.web);
    const mapSources = msg.groundingMetadata.groundingChunks.filter(c => c.maps);

    if (webSources.length === 0 && mapSources.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {webSources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {webSources.map((chunk, idx) => (
              <a 
                key={idx} 
                href={chunk.web?.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors border border-blue-200"
              >
                <LinkIcon size={12} />
                <span className="max-w-[150px] truncate">{chunk.web?.title || 'منبع وب'}</span>
              </a>
            ))}
          </div>
        )}
        
        {mapSources.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {mapSources.map((chunk, idx) => (
                    <a
                        key={idx}
                        href={chunk.maps?.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin size={14} className="text-emerald-600" />
                            <span className="font-semibold text-sm text-emerald-900">{chunk.maps?.title || 'مکان نقشه'}</span>
                        </div>
                         {chunk.maps?.placeAnswerSources?.reviewSnippets?.[0] && (
                             <p className="text-xs text-slate-600 line-clamp-2 pl-5 italic">
                                "{chunk.maps.placeAnswerSources.reviewSnippets[0].reviewText}"
                             </p>
                         )}
                    </a>
                ))}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">دستیار هوشمند</h2>
            <p className="text-xs text-slate-500">قدرت گرفته از جمنای</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-200 p-1 rounded-lg self-start sm:self-auto">
          <button 
            onClick={() => setMode(AIModelMode.CHAT_PRO)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${mode === AIModelMode.CHAT_PRO ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <Sparkles size={14} /> چت هوشمند
          </button>
          <button 
            onClick={() => setMode(AIModelMode.SEARCH_FLASH)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${mode === AIModelMode.SEARCH_FLASH ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <Search size={14} /> جستجو
          </button>
          <button 
            onClick={() => setMode(AIModelMode.MAPS_FLASH)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${mode === AIModelMode.MAPS_FLASH ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <MapIcon size={14} /> نقشه
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] lg:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-violet-600 text-white'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
                {renderGroundingSource(msg)}
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                         <Bot size={16} className="text-white" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        {mode === AIModelMode.MAPS_FLASH && !location && (
            <div className="flex items-center gap-2 text-amber-600 text-xs mb-2 bg-amber-50 p-2 rounded border border-amber-100">
                <AlertCircle size={14} />
                <span>در حال دریافت موقعیت مکانی... برای نتیجه بهتر لوکیشن خود را روشن کنید.</span>
            </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
                mode === AIModelMode.MAPS_FLASH 
                ? "درباره مکان‌های نزدیک بپرسید..." 
                : mode === AIModelMode.SEARCH_FLASH
                ? "جستجو در وب..."
                : "هر سوالی دارید بپرسید..."
            }
            className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-xl transition-colors shadow-sm"
          >
            <Send size={20} className="rotate-180" /> {/* Rotate send icon for RTL */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;