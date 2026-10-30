import React, { useState, useEffect } from 'react';
import { X, Settings, Bell, Mail, Smartphone, Save, CheckCircle, Clock } from 'lucide-react';

export interface MonthlyReportSettings {
  autoGenerateEnabled: boolean;
  scheduleDay: number; // day of month (e.g. 1 or 30)
  autoNotifyEmail: boolean;
  defaultEmail: string;
  autoNotifyWhatsapp: boolean;
  defaultWhatsapp: string;
  companyName: string;
  includeDetailedTransactions: boolean;
}

interface MonthlyReportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: MonthlyReportSettings) => void;
  currentSettings: MonthlyReportSettings;
}

export const MonthlyReportSettingsModal: React.FC<MonthlyReportSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<MonthlyReportSettings>(currentSettings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                تنظیمات تولید و ارسال خودکار گزارش ماهانه
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                زمان‌بندی و دریافت‌کنندگان خودکار فایل PDF گزارش‌های مالی
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {savedSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle size={18} />
              تنظیمات با موفقیت ذخیره شد.
            </div>
          )}

          {/* Toggle Auto-Generate */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <label className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                تولید خودکار در پایان هر ماه
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ترازنامه و صورت سود و زیان ماهانه به محض پایان هر ماه به صورت خودکار بایگانی شود.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoGenerateEnabled}
                onChange={(e) => setSettings({ ...settings, autoGenerateEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Company Name on PDF Header */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان شرکت / مجموعه در سربرگ PDF
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="مثال: شرکت بازرگانی صادرات گاز البرز"
            />
          </div>

          {/* Recipients Settings */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Bell size={15} className="text-blue-500" /> دریافت‌کنندگان پیش‌فرض گزارش ماهانه
            </h4>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" /> ایمیل مدیریت یا حسابداری:
                </label>
                <input
                  type="checkbox"
                  checked={settings.autoNotifyEmail}
                  onChange={(e) => setSettings({ ...settings, autoNotifyEmail: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <input
                type="email"
                value={settings.defaultEmail}
                onChange={(e) => setSettings({ ...settings, defaultEmail: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="financial@company.com"
              />
            </div>

            {/* WhatsApp Phone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-slate-400" /> شماره واتساپ مدیر / شرکا:
                </label>
                <input
                  type="checkbox"
                  checked={settings.autoNotifyWhatsapp}
                  onChange={(e) => setSettings({ ...settings, autoNotifyWhatsapp: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <input
                type="text"
                value={settings.defaultWhatsapp}
                onChange={(e) => setSettings({ ...settings, defaultWhatsapp: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="09121234567"
              />
            </div>

            {/* Include detailed tables checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="include_detailed"
                checked={settings.includeDetailedTransactions}
                onChange={(e) => setSettings({ ...settings, includeDetailedTransactions: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="include_detailed" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                پیوست کردن جدول ریز بارنامه‌ها در انتهای فایل PDF گزارش
              </label>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              <Save size={16} />
              ذخیره تنظیمات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
