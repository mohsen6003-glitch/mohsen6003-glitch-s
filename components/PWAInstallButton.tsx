import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, WifiOff, CheckCircle2 } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Offline/Online Status Badge in Header */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse'
          }`}
          title={
            isOnline
              ? 'متصل به اینترنت — تمامی استایل‌ها و فایل‌ها برای کار بدون اینترنت ذخیره شده‌اند'
              : 'حالت آفلاین فعال است — برنامه بدون نیاز به اینترنت کار می‌کند'
          }
        >
          {isOnline ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden xl:inline">آماده کار آفلاین</span>
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>حالت آفلاین</span>
            </>
          )}
        </div>

        {/* Install Button for Android / Desktop Chrome / Edge */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            title="نصب برنامه برای استفاده آفلاین روی دسکتاپ یا موبایل"
          >
            <Download size={14} />
            <span className="hidden sm:inline">نصب برنامه (آفلاین)</span>
          </button>
        )}

        {/* Install Guide Button for iOS Safari */}
        {!isInstalled && !isInstallable && isIOS && (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">راهنمای نصب آفلاین</span>
          </button>
        )}
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-right" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                نصب نسخه آفلاین روی آیفون / آیپد
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-600 dark:text-blue-400">
                  ۱
                </span>
                <span>
                  روی دکمه اشتراک‌گذاری{' '}
                  <Share className="inline h-4 w-4 text-blue-600 mx-0.5" /> در نوار پایین مرورگر سافاری بزنید.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-600 dark:text-blue-400">
                  ۲
                </span>
                <span>
                  گزینه{' '}
                  <strong className="font-bold text-slate-900 dark:text-white">Add to Home Screen</strong>{' '}
                  <PlusSquare className="inline h-4 w-4 text-slate-700 dark:text-slate-300 mx-0.5" /> را انتخاب کنید.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-600 dark:text-blue-400">
                  ۳
                </span>
                <span>
                  در بالا سمت راست روی <strong className="font-bold text-slate-900 dark:text-white">Add</strong> بزنید تا برنامه همیشه بدون اینترنت هم اجرا شود.
                </span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};

