import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../utils/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white shadow-xl border border-amber-400/40 print:hidden"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
      <WifiOff size={15} className="shrink-0" />
      <span>حالت آفلاین فعال است — رابط کاربری و اطلاعات از حافظه داخلی اجرا می‌شوند.</span>
    </div>
  );
};
