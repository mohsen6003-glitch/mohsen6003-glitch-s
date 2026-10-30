import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Send, 
  Copy, 
  Check, 
  Mail, 
  MessageSquare, 
  FileText, 
  Smartphone,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { MonthlyReportData } from './MonthlyReportPdfTemplate';

interface MonthlyReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: MonthlyReportData;
  onDownloadPdf: () => Promise<void>;
  isExportingPdf: boolean;
}

export const MonthlyReportShareModal: React.FC<MonthlyReportShareModalProps> = ({
  isOpen,
  onClose,
  reportData,
  onDownloadPdf,
  isExportingPdf
}) => {
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  if (!isOpen) return null;

  const formattedSummaryText = `📊 *گزارش صورت وضعیت مالی ماهانه صادرات گاز*
🗓 *دوره مالی:* ${reportData.monthName} ماه سال ${reportData.year}
🔖 *شماره سند:* ${reportData.reportCode}

━━━━━━━━━━━━━━━━━━━
💰 *درآمد فروش گاز:* ${reportData.totalSalesIncome.toLocaleString()} تومان (${reportData.totalSalesVolume.toFixed(2)} تن)
🛒 *بهای خرید گاز:* ${reportData.totalPurchaseCost.toLocaleString()} تومان
🚛 *کرایه حمل رانندگان:* ${reportData.totalFreightsCost.toLocaleString()} تومان
🧾 *هزینه‌های جاری:* ${reportData.totalExpensesCost.toLocaleString()} تومان
━━━━━━━━━━━━━━━━━━━
⭐ *سود خالص عملیاتی:* ${reportData.netProfit.toLocaleString()} تومان
📈 *حاشیه سود خالص:* ${reportData.netMarginPercentage.toFixed(1)}%
⚡ *تعداد کل بارنامه‌ها:* ${reportData.salesCount} مورد

🏢 سیستم جامع مدیریت صادرات گاز
تاریخ صدور: ${reportData.generatedDate}`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedSummaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(formattedSummaryText);
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    const encodedText = encodeURIComponent(formattedSummaryText);
    const url = `https://t.me/share/url?url=${encodeURIComponent('https://ger-system.local')}&text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`گزارش مالی ماهانه ${reportData.monthName} ${reportData.year} - سیستم صادرات گاز`);
    const body = encodeURIComponent(formattedSummaryText);
    const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `گزارش مالی ماهانه ${reportData.monthName} ${reportData.year}`,
          text: formattedSummaryText
        });
      } catch (err) {
        console.log('Share canceled or not supported');
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Share2 size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                ارسال و اشتراک‌گذاری گزارش مالی
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                گزارش {reportData.monthName} ماه سال {reportData.year} (کد: {reportData.reportCode})
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

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick PDF Download banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-4 shadow-lg shadow-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm">دانلود فایل PDF رسمی گزارش</h4>
                <p className="text-xs text-blue-100 mt-0.5">آماده برای چاپ، ارسال سازمانی و بایگانی</p>
              </div>
            </div>
            <button
              onClick={onDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow active:scale-95 disabled:opacity-50"
            >
              <Download size={16} />
              {isExportingPdf ? 'در حال تولید PDF...' : 'دانلود PDF'}
            </button>
          </div>

          {/* Key Summary Preview Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> خلاصه شاخص‌های مالی ماه
              </span>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'متن کپی شد!' : 'کپی متن گزارش'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400">درآمد کل فروش:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">
                  {reportData.totalSalesIncome.toLocaleString()} T
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400">سود خالص دوره:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm" dir="ltr">
                  {reportData.netProfit.toLocaleString()} T
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400">حجم صادرات:</span>
                <span className="font-bold text-slate-800 dark:text-white" dir="ltr">
                  {reportData.totalSalesVolume.toFixed(2)} تن
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="block text-[10px] text-slate-400">حاشیه سود:</span>
                <span className="font-bold text-slate-800 dark:text-white" dir="ltr">
                  {reportData.netMarginPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Direct Share Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ارسال سریع از طریق پیام‌رسان‌ها و شبکه‌ها:
            </h4>

            {/* Phone input for WhatsApp */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="شماره واتساپ مخاطب (اختیاری، مثال: 09121234567)"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
              >
                <MessageSquare size={16} />
                ارسال به واتساپ
              </button>
            </div>

            {/* Email input for Email share */}
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="آدرس ایمیل مخاطب (اختیاری، مثال: accountant@company.com)"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleShareEmail}
                className="px-4 py-2.5 bg-slate-700 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow active:scale-95 whitespace-nowrap"
              >
                <Mail size={16} />
                ارسال با ایمیل
              </button>
            </div>

            {/* Telegram and Web Share Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleShareTelegram}
                className="p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Send size={16} />
                اشتراک در تلگرام
              </button>

              <button
                onClick={handleWebShare}
                className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Smartphone size={16} />
                اشتراک‌گذاری در دستگاه
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
