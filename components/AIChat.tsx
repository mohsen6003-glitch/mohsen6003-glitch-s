
import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/gemini';
import { ChatMessage, AIModelMode } from '../types';
import { Send, Bot, MapPin, Search, User, Sparkles, Map as MapIcon, Link as LinkIcon, Maximize2, Minimize2, Navigation, Layers, Compass, ArrowRight } from 'lucide-react';
import L from 'leaflet';

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'سلام! من دستیار هوشمند مسیریاب شما هستم. می‌خواهید جایگاه‌های سوخت، مسیرهای خلوت یا مقاصد تحویل بار را روی نقشه پیدا کنم؟',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AIModelMode>(AIModelMode.MAPS_FLASH); // Default to Maps for this view
  const [location, setLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);
  
  // Map UI State
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Request location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(coords);
        },
        (error) => console.error("Location error", error)
      );
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const defaultPos: [number, number] = location ? [location.latitude, location.longitude] : [35.6892, 51.3890]; 
      
      mapRef.current = L.map(mapContainerRef.current, {
        preferCanvas: true,
        zoomControl: false, // We will add custom controls
        attributionControl: false
      }).setView(defaultPos, 13);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
      }).addTo(mapRef.current);

      markersGroupRef.current = L.layerGroup().addTo(mapRef.current);

      // Add user marker
      if (location) {
        const userIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center relative">
                    <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-75"></div>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        L.marker([location.latitude, location.longitude], { icon: userIcon }).addTo(mapRef.current);
      }
    }
    
    // Resize map when fullscreen toggles
    if (mapRef.current) {
       setTimeout(() => mapRef.current.invalidateSize(), 300);
    }

  }, [location, isMapFullscreen]);

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

      // Simple heuristic: If maps mode and response is short, zoom out slightly to show context
      if (mode === AIModelMode.MAPS_FLASH && mapRef.current) {
         // In a real app, we would parse coordinates from the response and flyTo them
      }

    } catch (error) {
        console.error("Chat Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderGroundingSource = (msg: ChatMessage) => {
    if (!msg.groundingMetadata?.groundingChunks) return null;

    const mapSources = msg.groundingMetadata.groundingChunks.filter(c => c.maps);
    const webSources = msg.groundingMetadata.groundingChunks.filter(c => c.web);

    if (mapSources.length === 0 && webSources.length === 0) return null;

    return (
      <div className="mt-3 grid gap-2 w-full">
        {mapSources.map((chunk, idx) => (
            <a
                key={idx}
                href={chunk.maps?.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group"
            >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <MapPin size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{chunk.maps?.title || 'مکان روی نقشه'}</span>
                        <Navigation size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {chunk.maps?.placeAnswerSources?.reviewSnippets?.[0] && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        "{chunk.maps.placeAnswerSources.reviewSnippets[0].reviewText}"
                        </p>
                    )}
                </div>
            </a>
        ))}
        
        {webSources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
                {webSources.map((chunk, idx) => (
                    <a key={idx} href={chunk.web?.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded-full hover:bg-blue-100 transition-colors">
                        <LinkIcon size={10} />
                        <span className="max-w-[120px] truncate">{chunk.web?.title}</span>
                    </a>
                ))}
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-6rem)] relative bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row">
      
      {/* MAP BACKGROUND / PANEL */}
      <div className={`transition-all duration-500 ease-in-out relative z-0 ${isMapFullscreen ? 'absolute inset-0 z-20 w-full h-full' : 'w-full md:w-1/2 h-1/2 md:h-full order-1 md:order-2'}`}>
        <div ref={mapContainerRef} className="w-full h-full bg-slate-200 dark:bg-slate-900 z-0" />
        
        {/* Map Overlays */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
            <button 
                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
                {isMapFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                <Compass size={20} />
            </button>
        </div>

        {/* Mode Selector Overlay on Map */}
        <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex gap-1">
             <button onClick={() => setMode(AIModelMode.MAPS_FLASH)} className={`p-2 rounded-lg transition-all ${mode === AIModelMode.MAPS_FLASH ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                 <MapIcon size={18} />
             </button>
             <button onClick={() => setMode(AIModelMode.SEARCH_FLASH)} className={`p-2 rounded-lg transition-all ${mode === AIModelMode.SEARCH_FLASH ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                 <Search size={18} />
             </button>
             <button onClick={() => setMode(AIModelMode.CHAT_PRO)} className={`p-2 rounded-lg transition-all ${mode === AIModelMode.CHAT_PRO ? 'bg-violet-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                 <Sparkles size={18} />
             </button>
        </div>
      </div>

      {/* CHAT PANEL */}
      <div className={`flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-r dark:border-slate-800 transition-all duration-500 z-10 ${isMapFullscreen ? 'absolute left-4 bottom-4 w-96 h-96 rounded-2xl shadow-2xl border' : 'w-full md:w-1/2 h-1/2 md:h-full order-2 md:order-1'}`}>
         
         {/* Chat Header (Only visible if not fullscreen map mode) */}
         {!isMapFullscreen && (
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800 dark:text-white">دستیار هوشمند لجستیک</h2>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">متصل به Google Maps</span>
                    </div>
                </div>
             </div>
         )}

         {/* Messages Area */}
         <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[95%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         {msg.role !== 'user' && (
                             <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1">
                                 <Bot size={16} />
                             </div>
                         )}
                         <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                             <div className={`px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                 msg.role === 'user' 
                                 ? 'bg-slate-800 text-white rounded-2xl rounded-tr-none' 
                                 : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none'
                             }`}>
                                 {msg.text}
                             </div>
                             {renderGroundingSource(msg)}
                         </div>
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                     <div className="flex gap-3">
                         <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1">
                             <Bot size={16} />
                         </div>
                         <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-1">
                             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
                             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
                         </div>
                     </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
         </div>

         {/* Floating Input Area */}
         <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={mode === AIModelMode.MAPS_FLASH ? "جستجوی مکان، پمپ بنزین، محاسبه فاصله..." : "پیام خود را بنویسید..."}
                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full border-none outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner transition-all"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute left-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full transition-all shadow-lg active:scale-90"
                >
                    <ArrowRight size={20} className="rotate-180" />
                </button>
            </div>
            <div className="flex justify-center mt-2 gap-4">
                 <button onClick={() => setInput('نزدیکترین پمپ بنزین کجاست؟')} className="text-[10px] text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">⛽ پمپ بنزین</button>
                 <button onClick={() => setInput('فاصله تا مرز بازرگان چقدر است؟')} className="text-[10px] text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">📍 فاصله تا مرز</button>
                 <button onClick={() => setInput('وضعیت ترافیک تهران به مشهد')} className="text-[10px] text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">🚦 ترافیک جاده</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AIChat;
