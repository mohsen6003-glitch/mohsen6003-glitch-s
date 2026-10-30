import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { FiscalYear, FiscalYearClosingSummary } from '../types';
import { 
  Calendar, ShieldAlert, AlertTriangle, CheckCircle2, RotateCcw, 
  Trash2, Plus, Lock, Unlock, FileText, Download, Printer, 
  Building2, Fuel, Users, Wallet, RefreshCw, KeyRound, 
  Check, X, ChevronRight, BarChart3, HelpCircle, Archive
} from 'lucide-react';
import { getPersianDateInfo } from '../utils/dateUtils';

const SystemAdminManager: React.FC = () => {
  const { 
    fiscalYears, 
    activeFiscalYearId, 
    activeFiscalYear,
    addFiscalYear, 
    updateFiscalYear, 
    deleteFiscalYear, 
    setActiveFiscalYear, 
    closeFiscalYear, 
    reopenFiscalYear,
    resetSystemData, 
    downloadBackupFile,
    transactions,
    purchases,
    expenses,
    freights,
    drivers,
    companies,
    receivers,
    partners,
    exchanges,
    getSystemFinancials
  } = useData();

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'fiscal_years' | 'system_reset'>('fiscal_years');

  // --- Fiscal Year Modals ---
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [showCloseYearModal, setShowCloseYearModal] = useState(false);
  const [closingYearTarget, setClosingYearTarget] = useState<FiscalYear | null>(null);
  const [viewReportYear, setViewReportYear] = useState<FiscalYear | null>(null);

  // New Fiscal Year Form
  const [newYearTitle, setNewYearTitle] = useState('');
  const [newYearNumber, setNewYearNumber] = useState<number>(1404);
  const [newYearStartDate, setNewYearStartDate] = useState('1404/01/01');
  const [newYearEndDate, setNewYearEndDate] = useState('1404/12/29');
  const [newYearSetAsActive, setNewYearSetAsActive] = useState(true);
  const [newYearNotes, setNewYearNotes] = useState('');

  // Close Year Form
  const [closingNotes, setClosingNotes] = useState('');
  const [closedByName, setClosedByName] = useState('مدیر ارشد مالی');

  // --- System Reset States ---
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [resetModalMode, setResetModalMode] = useState<'operations_only' | 'full' | null>(null);
  const [confirmKeywordInput, setConfirmKeywordInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [resetAlertMessage, setResetAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Printable Reference for Balance Sheet Voucher
  const printReportRef = useRef<HTMLDivElement>(null);

  // Financial metrics for current active year
  const systemFinancials = useMemo(() => getSystemFinancials(), [getSystemFinancials]);
  const totalVolumeDelivered = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.volume || 0), 0);
  }, [transactions]);

  // Current Persian Date for defaults
  const todayInfo = useMemo(() => getPersianDateInfo(new Date()), []);

  // Format numbers with comma
  const formatNumber = (num: number = 0) => num.toLocaleString('fa-IR');

  // Handle Admin PIN Unlock (Default pin: 1234 or direct unlock)
  const handleUnlockAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminPinInput.trim() === '1234' || adminPinInput.trim() === 'admin') {
      setAdminUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Open Close Year Modal
  const handleOpenCloseYear = (fy: FiscalYear) => {
    setClosingYearTarget(fy);
    setClosingNotes(`بستن دوره مالی سال ${fy.year} و قطعی کردن بیلان عملکرد`);
    setShowCloseYearModal(true);
  };

  // Execute Close Year
  const handleConfirmCloseYear = () => {
    if (!closingYearTarget) return;
    const summary = closeFiscalYear(closingYearTarget.id, closingNotes, closedByName);
    setShowCloseYearModal(false);
    // Open the generated report for review
    const updatedTarget: FiscalYear = {
      ...closingYearTarget,
      status: 'closed',
      closingSummary: summary
    };
    setViewReportYear(updatedTarget);
    setResetAlertMessage({
      type: 'success',
      text: `سال مالی ${closingYearTarget.title} با موفقیت بسته شد و کارنامه مالی ثبت گردید.`
    });
  };

  // Execute Add Fiscal Year
  const handleAddYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearTitle.trim()) {
      alert('لطفاً عنوان دوره سالانه را وارد کنید.');
      return;
    }

    addFiscalYear({
      title: newYearTitle.trim(),
      year: Number(newYearNumber) || 1404,
      startDate: newYearStartDate.trim() || '1404/01/01',
      endDate: newYearEndDate.trim() || '1404/12/29',
      status: newYearSetAsActive ? 'active' : 'active',
      notes: newYearNotes.trim()
    });

    setShowAddYearModal(false);
    setResetAlertMessage({
      type: 'success',
      text: `دوره سالانه «${newYearTitle}» با موفقیت در سامانه ثبت گردید.`
    });

    // Reset fields
    setNewYearTitle('');
    setNewYearNotes('');
  };

  // Execute System Reset
  const handleExecuteReset = () => {
    if (confirmKeywordInput.trim().toUpperCase() !== 'RESET') {
      alert('برای تایید، لطفاً کلمه RESET را با حروف بزرگ انگلیسی در کادر مربوطه بنویسید.');
      return;
    }

    if (!resetModalMode) return;

    setIsResetting(true);
    setTimeout(() => {
      const res = resetSystemData({
        mode: resetModalMode,
        createBackup: autoBackupEnabled,
        adminConfirmation: confirmKeywordInput.trim().toUpperCase()
      });

      setIsResetting(false);
      setResetModalMode(null);
      setConfirmKeywordInput('');

      if (res.success) {
        setResetAlertMessage({
          type: 'success',
          text: res.message + (res.backupDownloaded ? ' (یک نسخه پشتیبان اضطراری به صورت خودکار دانلود شد)' : '')
        });
      } else {
        setResetAlertMessage({
          type: 'error',
          text: res.message
        });
      }
    }, 600);
  };

  // Direct Print for Fiscal Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Alert Banner */}
      {resetAlertMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all ${
          resetAlertMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {resetAlertMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-bold">{resetAlertMessage.text}</span>
          </div>
          <button 
            onClick={() => setResetAlertMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldAlert size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  مدیریت سیستم و دوره‌های سالانه
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  پنل اختصاصی مدیر
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                ثبت و بستن سال‌های مالی، محاسبه سود و زیان سالانه، و بازنشانی ایمن داده‌ها با پشتیبان‌گیری خودکار
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => downloadBackupFile()}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              title="دانلود فایل پشتیبان کامل از کلیه داده‌ها"
            >
              <Download size={16} className="text-blue-500" />
              <span>پشتیبان‌گیری فوری</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-8 gap-4">
          <button
            onClick={() => setActiveSubTab('fiscal_years')}
            className={`pb-3.5 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'fiscal_years'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={18} />
            <span>ثبت و بستن دوره‌های سالانه (سال مالی)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {fiscalYears.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('system_reset')}
            className={`pb-3.5 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'system_reset'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <RotateCcw size={18} />
            <span>بازنشانی و ریست اطلاعات برنامه</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
              مدیر
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: FISCAL YEARS & ANNUAL PERIOD CLOSING */}
      {/* ======================================================== */}
      {activeSubTab === 'fiscal_years' && (
        <div className="space-y-6">
          
          {/* Current Active Fiscal Year Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-indigo-800/40">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                    دوره سالانه فعال در سامانه
                  </span>
                  <span className="text-xs text-indigo-300 font-mono">
                    از {activeFiscalYear?.startDate || '۱۴۰۳/۰۱/۰۱'} تا {activeFiscalYear?.endDate || '۱۴۰۳/۱۲/۲۹'}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  {activeFiscalYear?.title || 'سال مالی جاری (۱۴۰۳)'}
                  <span className="text-sm font-normal text-slate-400">
                    (کد سال: {activeFiscalYear?.year || 1403})
                  </span>
                </h2>
                {activeFiscalYear?.notes && (
                  <p className="text-xs text-indigo-200/80 max-w-xl">
                    توضیحات: {activeFiscalYear.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons for Active Year */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowAddYearModal(true)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  <Plus size={18} />
                  <span>ثبت سال مالی جدید</span>
                </button>

                {activeFiscalYear?.status === 'active' ? (
                  <button
                    onClick={() => activeFiscalYear && handleOpenCloseYear(activeFiscalYear)}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <Lock size={18} />
                    <span>بستن سال مالی جاری و محاسبه بیلان</span>
                  </button>
                ) : (
                  <button
                    onClick={() => activeFiscalYear && setViewReportYear(activeFiscalYear)}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-2xl flex items-center gap-2 transition-all border border-slate-700"
                  >
                    <FileText size={18} />
                    <span>مشاهده کارنامه مالی ثبت‌شده</span>
                  </button>
                )}
              </div>
            </div>

            {/* Performance Indicators Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-xs text-indigo-300 font-medium block mb-1">
                  حجم گاز تحویلی سال
                </span>
                <div className="text-2xl font-black font-mono tabular-nums text-white flex items-baseline gap-1">
                  {formatNumber(Math.round(totalVolumeDelivered))}
                  <span className="text-xs font-normal text-slate-400">تن</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  از مجموع {formatNumber(transactions.length)} بارنامه ثبت شده
                </span>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-xs text-indigo-300 font-medium block mb-1">
                  درآمد کل فروش گاز
                </span>
                <div className="text-xl font-black font-mono tabular-nums text-emerald-400 flex items-baseline gap-1">
                  {formatNumber(systemFinancials.totalIncome)}
                  <span className="text-xs font-normal text-slate-400">تومان</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  فروش گاز به خریداران
                </span>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-xs text-indigo-300 font-medium block mb-1">
                  بهای خرید و هزینه‌ها
                </span>
                <div className="text-xl font-black font-mono tabular-nums text-rose-300 flex items-baseline gap-1">
                  {formatNumber(systemFinancials.totalCost + systemFinancials.totalExpense + systemFinancials.totalFreights)}
                  <span className="text-xs font-normal text-slate-400">تومان</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  خرید گاز + کرایه‌ها + مخارج
                </span>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <span className="text-xs text-indigo-300 font-medium block mb-1">
                  سود خالص سالانه تا کنون
                </span>
                <div className={`text-xl font-black font-mono tabular-nums flex items-baseline gap-1 ${
                  systemFinancials.netProfit >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {formatNumber(systemFinancials.netProfit)}
                  <span className="text-xs font-normal text-slate-400">تومان</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  تراز سود نهایی سال
                </span>
              </div>
            </div>
          </div>

          {/* Historical Fiscal Years Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Archive size={20} className="text-indigo-600" />
                  آرشیو و لیست دوره‌های مالی ثبت‌شده
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تمام سال‌های کاری ثبت‌شده در سیستم همراه با وضعیت و اسناد پایانی
                </p>
              </div>

              <button
                onClick={() => setShowAddYearModal(true)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-200 dark:border-indigo-800"
              >
                <Plus size={16} />
                <span>تعریف دوره جدید</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">عنوان دوره سالانه</th>
                    <th className="py-3 px-4">سال</th>
                    <th className="py-3 px-4">بازه زمانی (شروع - پایان)</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">عملکرد ثبت‌شده</th>
                    <th className="py-3 px-4 text-center">عملیات مدیریت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {fiscalYears.map((fy) => {
                    const isActive = fy.id === activeFiscalYearId;
                    const isClosed = fy.status === 'closed';

                    return (
                      <tr key={fy.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                          <span>{fy.title}</span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              جاری
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {fy.year}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {fy.startDate} الی {fy.endDate}
                        </td>
                        <td className="py-4 px-4">
                          {isClosed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Lock size={12} />
                              بسته شده (مختومه)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle2 size={12} />
                              دوره باز و فعال
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs font-mono">
                          {fy.closingSummary ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                                سود نهایی: {formatNumber(fy.closingSummary.netProfit)} تومان
                              </span>
                              <span className="text-slate-500 text-[11px] block">
                                تناژ کل: {formatNumber(Math.round(fy.closingSummary.totalVolumeDelivered))} تن
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              در حال ثبت عملیات
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isActive && (
                              <button
                                onClick={() => setActiveFiscalYear(fy.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors"
                                title="تنظیم به عنوان سال مالی جاری"
                              >
                                انتخاب به عنوان جاری
                              </button>
                            )}

                            {fy.closingSummary && (
                              <button
                                onClick={() => setViewReportYear(fy)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                                title="مشاهده کارنامه مالی اختتامیه"
                              >
                                <FileText size={16} />
                              </button>
                            )}

                            {!isClosed ? (
                              <button
                                onClick={() => handleOpenCloseYear(fy)}
                                className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors"
                                title="بستن سال مالی"
                              >
                                <Lock size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`آیا از بازگشایی مجدد دوره ${fy.title} اطمینان دارید؟`)) {
                                    reopenFiscalYear(fy.id);
                                  }
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                                title="بازگشایی سال مالی جهت اصلاحات"
                              >
                                <Unlock size={16} />
                              </button>
                            )}

                            {fiscalYears.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm(`آیا از حذف تعریف دوره «${fy.title}» اطمینان دارید؟`)) {
                                    deleteFiscalYear(fy.id);
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                title="حذف تعریف دوره"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: SYSTEM RESET & ADMIN FACTORY WIPE */}
      {/* ======================================================== */}
      {activeSubTab === 'system_reset' && (
        <div className="space-y-6">

          {/* Admin Unlock Guard Banner if locked */}
          {!adminUnlocked ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-md text-center max-w-lg mx-auto space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock size={36} />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  قفل امنیتی مدیر سیستم
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  بخش بازنشانی و ریست اطلاعات فقط در دسترس مدیر سیستم می‌باشد. لطفاً رمز عبور مدیر (پیش‌فرض: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-rose-600">1234</code>) را وارد نمایید.
                </p>
              </div>

              <form onSubmit={handleUnlockAdmin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminPinInput(e.target.value);
                      setPinError(false);
                    }}
                    placeholder="رمز عبور مدیر سیستم..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-center font-mono text-lg tracking-widest outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white transition-all"
                  />
                  {pinError && (
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-bold block mt-2">
                      رمز عبور اشتباه است. (می‌توانید از ۱۲۳۴ استفاده کنید)
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-600/30"
                  >
                    تایید و باز کردن قفل مدیر
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUnlocked(true);
                    }}
                    className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs rounded-xl"
                  >
                    ورود مستقیم
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Unlocked Admin Panel */
            <div className="space-y-6">
              
              {/* Security Warning Box */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded-2xl shrink-0">
                    <AlertTriangle size={26} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-amber-900 dark:text-amber-300">
                      مکانیزم حفاظت از داده‌ها و پشتیبان‌گیری خودکار
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-400/90 leading-relaxed mt-1">
                      قبل از اجرای هرگونه عملیات حذف، سیستم به صورت کاملاً خودکار یک فایل پشتیبان با تاریخ و ساعت دقیق روی سیستم شما دانلود خواهد کرد تا در صورت نیاز به بازگردانی، هیچ اطلاعاتی از بین نرود.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAdminUnlocked(false)}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    قفل کردن مجدد پنل
                  </button>
                </div>
              </div>

              {/* Reset Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Option 1: Operational Cleanup (Recommended for New Fiscal Year) */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col justify-between hover:border-indigo-400 transition-all group">
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <RefreshCw size={28} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-slate-900 dark:text-white">
                          پاکسازی اسناد عملیاتی و تراکنش‌ها
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                          پیشنهادی سال نو
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        مناسب برای آغاز سال مالی جدید؛ اسناد دوره‌ای پاک شده اما اطلاعات پایه دست‌نخورده باقی می‌ماند.
                      </p>
                    </div>

                    {/* What gets deleted vs kept */}
                    <div className="space-y-2.5 pt-2">
                      <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1">
                          ❌ مواردی که پاکسازی می‌شوند:
                        </span>
                        <ul className="text-[11px] text-rose-600 dark:text-rose-400/80 space-y-0.5 list-disc list-inside">
                          <li>اسناد ورود و فروش گاز مایع ({transactions.length} رکورد)</li>
                          <li>خریدهای گاز از شرکت‌ها ({purchases.length} رکورد)</li>
                          <li>هزینه‌های جاری و صف بارگیری</li>
                          <li>پرداخت‌ها و تسویه‌حساب‌های رانندگان</li>
                          <li>تراکنش‌های صرافی و حساب شرکا</li>
                        </ul>
                      </div>

                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                          ✅ تعاریف پایه‌ای که حفظ خواهند شد:
                        </span>
                        <ul className="text-[11px] text-emerald-700 dark:text-emerald-400/90 space-y-0.5 list-disc list-inside">
                          <li>بانک اطلاعاتی رانندگان و شماره‌های شبا ({drivers.length} راننده)</li>
                          <li>شرکت‌های همکار ({companies.length} شرکت)</li>
                          <li>تحویل‌گیرندگان و شرکا ({receivers.length + partners.length} طرف حساب)</li>
                          <li>صرافی‌ها و تعرفه‌های پایه</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setResetModalMode('operations_only');
                        setConfirmKeywordInput('');
                      }}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <RefreshCw size={18} />
                      <span>شروع پاکسازی اسناد عملیاتی</span>
                    </button>
                  </div>
                </div>

                {/* Option 2: Full Factory Reset */}
                <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col justify-between hover:border-rose-400 transition-all group">
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <Trash2 size={28} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-rose-600 dark:text-rose-400">
                          ریست کامل کارخانه‌ای (Full Factory Reset)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        حذف ۱۰۰ درصدی تمام اطلاعات ذخیره شده و بازگرداندن سیستم به حالت اولیه خام (نصب اولیه).
                      </p>
                    </div>

                    {/* What gets deleted */}
                    <div className="space-y-2.5 pt-2">
                      <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block mb-1">
                          ⚠️ توجه جدی: تمام اطلاعات زیر کاملاً پاک خواهند شد:
                        </span>
                        <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                          کلیه رانندگان، شرکت‌ها، خریداران، تمام اسناد مالی، ورود گاز، خریدهای گاز، هزینه‌ها، صرافی‌ها، شرکا و دوره‌های سالانه پاک شده و نرم‌افزار به صورت کاملاً خام آماده بهره‌برداری مجدد خواهد بود.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setResetModalMode('full');
                        setConfirmKeywordInput('');
                      }}
                      className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/30 active:scale-95"
                    >
                      <Trash2 size={18} />
                      <span>ریست کامل و پاکسازی کل داده‌ها</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Data Summary Quick Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
                <span>
                  مجموع رکوردها در سیستم: <strong className="text-slate-800 dark:text-slate-200 font-mono">{transactions.length + purchases.length + expenses.length + drivers.length + companies.length}</strong>
                </span>
                <span>
                  پشتیبان‌گیری اضطراری خودکار: <strong className="text-emerald-600 font-bold">فعال</strong>
                </span>
                <span>
                  نسخه پایگاه داده نرم‌افزار: <strong className="font-mono text-slate-700 dark:text-slate-300">2.8.0</strong>
                </span>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD NEW FISCAL YEAR */}
      {/* ======================================================== */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-indigo-600" size={20} />
                تعریف دوره سالانه جدید
              </h3>
              <button 
                onClick={() => setShowAddYearModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddYearSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان سال مالی
                </label>
                <input
                  type="text"
                  required
                  value={newYearTitle}
                  onChange={(e) => setNewYearTitle(e.target.value)}
                  placeholder="مثال: سال مالی ۱۴۰۴"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سال
                  </label>
                  <input
                    type="number"
                    value={newYearNumber}
                    onChange={(e) => setNewYearNumber(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاریخ شروع
                  </label>
                  <input
                    type="text"
                    value={newYearStartDate}
                    onChange={(e) => setNewYearStartDate(e.target.value)}
                    placeholder="1404/01/01"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاریخ پایان
                  </label>
                  <input
                    type="text"
                    value={newYearEndDate}
                    onChange={(e) => setNewYearEndDate(e.target.value)}
                    placeholder="1404/12/29"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  توضیحات و اهداف دوره
                </label>
                <textarea
                  rows={2}
                  value={newYearNotes}
                  onChange={(e) => setNewYearNotes(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="setAsActive"
                  checked={newYearSetAsActive}
                  onChange={(e) => setNewYearSetAsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="setAsActive" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  تنظیم این سال به عنوان دوره مالی جاری در سیستم
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  ثبت دوره سالانه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CLOSE FISCAL YEAR CONFIRMATION */}
      {/* ======================================================== */}
      {showCloseYearModal && closingYearTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    بستن سال مالی و قطعی‌سازی بیلان
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">{closingYearTarget.title}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCloseYearModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Calculated summary preview */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block border-b border-slate-200 dark:border-slate-700 pb-2">
                خلاصه محاسباتی عملکرد سال جاری برای ثبت اختتامیه:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500">حجم گاز تحویلی:</div>
                <div className="font-mono font-bold text-left">{formatNumber(Math.round(totalVolumeDelivered))} تن</div>
                
                <div className="text-slate-500">تعداد کل بارنامه‌ها:</div>
                <div className="font-mono font-bold text-left">{formatNumber(transactions.length)} فقره</div>

                <div className="text-slate-500">فروش کل گاز:</div>
                <div className="font-mono font-bold text-emerald-600 text-left">{formatNumber(systemFinancials.totalIncome)} تومان</div>

                <div className="text-slate-500">بهای تمام‌شده خرید:</div>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-left">{formatNumber(systemFinancials.totalCost)} تومان</div>

                <div className="text-slate-500">کرایه حمل پرداخت شده:</div>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-left">{formatNumber(systemFinancials.totalFreights)} تومان</div>

                <div className="text-slate-500">هزینه‌های جاری:</div>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-left">{formatNumber(systemFinancials.totalExpense)} تومان</div>

                <div className="text-slate-900 dark:text-white font-bold border-t border-slate-200 dark:border-slate-700 pt-2">سود خالص نهایی سال:</div>
                <div className="font-mono font-black text-amber-600 dark:text-amber-400 text-left border-t border-slate-200 dark:border-slate-700 pt-2 text-sm">
                  {formatNumber(systemFinancials.netProfit)} تومان
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نام تایید کننده سند اختتامیه
                </label>
                <input
                  type="text"
                  value={closedByName}
                  onChange={(e) => setClosedByName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  یادداشت و صورتجلسه بستن سال
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseYearModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseYear}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/30"
              >
                تایید و بستن قطعی سال مالی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ANNUAL BALANCE SHEET / CLOSING REPORT VOUCHER */}
      {/* ======================================================== */}
      {viewReportYear && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            
            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="text-amber-400" size={20} />
                <span className="font-bold text-sm">کارنامه رسمی اختتامیه {viewReportYear.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={16} />
                  <span>چاپ سند</span>
                </button>
                <button
                  onClick={() => setViewReportYear(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Report Body */}
            <div ref={printReportRef} className="p-8 space-y-6 text-slate-900 dark:text-white bg-white dark:bg-slate-900">
              
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-6 text-center space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-right text-xs text-slate-500 font-mono">
                    <div>کد دوره: {viewReportYear.year}</div>
                    <div>تاریخ صدور: {todayInfo.formatted}</div>
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-wide">شرکت بازرگانی و ترانزیت گاز مایع</h2>
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      صورت بیلان و کارنامه رسمی اختتامیه سال مالی
                    </h3>
                  </div>
                  <div className="text-left text-xs text-slate-500 font-mono">
                    <div>وضعیت: قطعی / مختومه</div>
                    <div>نسخه رسمی</div>
                  </div>
                </div>
              </div>

              {/* Period Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-500">عنوان دوره مالی: </span>
                  <strong className="text-slate-800 dark:text-white">{viewReportYear.title}</strong>
                </div>
                <div>
                  <span className="text-slate-500">بازه زمانی: </span>
                  <span className="font-mono">{viewReportYear.startDate} الی {viewReportYear.endDate}</span>
                </div>
                <div>
                  <span className="text-slate-500">تایید شده توسط: </span>
                  <span>{viewReportYear.closingSummary?.closedBy || 'مدیر سیستم'}</span>
                </div>
                <div>
                  <span className="text-slate-500">تاریخ بستن حساب‌ها: </span>
                  <span className="font-mono">{viewReportYear.closingSummary?.closedAt ? viewReportYear.closingSummary.closedAt.slice(0, 10) : todayInfo.formatted}</span>
                </div>
              </div>

              {/* Report Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">ردیف</th>
                      <th className="py-2.5 px-4">شرح سرفصل مالی و عملیاتی</th>
                      <th className="py-2.5 px-4">مقدار / واحد</th>
                      <th className="py-2.5 px-4 text-left">مبلغ نهایی (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-4 font-mono">۱</td>
                      <td className="py-2.5 px-4">مجموع گاز تحویلی و بارگیری شده</td>
                      <td className="py-2.5 px-4 font-mono">{formatNumber(Math.round(viewReportYear.closingSummary?.totalVolumeDelivered || totalVolumeDelivered))} تن</td>
                      <td className="py-2.5 px-4 text-left font-mono">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono">۲</td>
                      <td className="py-2.5 px-4">تعداد بارنامه‌ها و اسناد تردد</td>
                      <td className="py-2.5 px-4 font-mono">{formatNumber(viewReportYear.closingSummary?.totalTransactionsCount || transactions.length)} فقره</td>
                      <td className="py-2.5 px-4 text-left font-mono">-</td>
                    </tr>
                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                      <td className="py-2.5 px-4 font-mono">۳</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700 dark:text-emerald-300">درآمد حاصل از فروش گاز مایع</td>
                      <td className="py-2.5 px-4 font-mono">-</td>
                      <td className="py-2.5 px-4 text-left font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {formatNumber(viewReportYear.closingSummary?.totalGasIncome || systemFinancials.totalIncome)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono">۴</td>
                      <td className="py-2.5 px-4">بهای تمام شده خرید گاز از مبادی</td>
                      <td className="py-2.5 px-4 font-mono">-</td>
                      <td className="py-2.5 px-4 text-left font-mono">
                        {formatNumber(viewReportYear.closingSummary?.totalGasPurchaseCost || systemFinancials.totalCost)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono">۵</td>
                      <td className="py-2.5 px-4">کرایه حمل پرداخت شده به رانندگان</td>
                      <td className="py-2.5 px-4 font-mono">-</td>
                      <td className="py-2.5 px-4 text-left font-mono">
                        {formatNumber(viewReportYear.closingSummary?.totalFreights || systemFinancials.totalFreights)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-mono">۶</td>
                      <td className="py-2.5 px-4">هزینه‌های عمومی و اداری</td>
                      <td className="py-2.5 px-4 font-mono">-</td>
                      <td className="py-2.5 px-4 text-left font-mono">
                        {formatNumber(viewReportYear.closingSummary?.totalExpenses || systemFinancials.totalExpense)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                      <td className="py-3 px-4 font-mono">★</td>
                      <td className="py-3 px-4 text-indigo-700 dark:text-indigo-300">سود خالص نهایی دوره سالانه (ترازنامه)</td>
                      <td className="py-3 px-4 font-mono">-</td>
                      <td className="py-3 px-4 text-left font-mono font-black text-amber-600 dark:text-amber-400">
                        {formatNumber(viewReportYear.closingSummary?.netProfit || systemFinancials.netProfit)} تومان
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {viewReportYear.closingSummary?.notes && (
                <div className="text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-bold">یادداشت اختتامیه: </span>
                  <span className="text-slate-600 dark:text-slate-300">{viewReportYear.closingSummary.notes}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">مدیر مالی و حسابداری</div>
                  <div className="text-slate-400 mt-6">(امضاء و تایید)</div>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">مدیر ترابری و لجستیک</div>
                  <div className="text-slate-400 mt-6">(امضاء و تایید)</div>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">مدیر عامل / هیئت مدیره</div>
                  <div className="text-slate-400 mt-6">(مهر و امضاء نهایی)</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: SYSTEM RESET CONFIRMATION WITH KEYWORD MATCH */}
      {/* ======================================================== */}
      {resetModalMode && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-rose-300 dark:border-rose-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
            
            <div className="flex items-center gap-3 pb-4 border-b border-rose-100 dark:border-rose-950">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-600 dark:text-rose-400">
                  تایید نهایی {resetModalMode === 'operations_only' ? 'پاکسازی اسناد عملیاتی' : 'ریست کامل کارخانه‌ای'}
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  دسترسی انحصاری مدیر ارشد سیستم
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={16} />
                  هشدار غیرقابل بازگشت:
                </div>
                <p className="leading-relaxed">
                  {resetModalMode === 'operations_only'
                    ? 'با اجرای این دستور، تمام اسناد ورود گاز، خرید گاز، هزینه‌ها، صف و پرداخت‌های رانندگان پاک خواهند شد، اما لیست رانندگان و شرکت‌ها حفظ می‌شوند.'
                    : 'با اجرای این دستور، نرم‌افزار به طور کامل تخلیه شده و همه اطلاعات به حالت روز اول بازمی‌گردد.'}
                </p>
              </div>

              {/* Auto Backup Notice */}
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
                <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                <span>
                  یک نسخه پشتیبان کامل اضطراری به صورت خودکار دانلود خواهد شد.
                </span>
              </div>

              {/* Keyword Confirmation Input */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  برای تایید، عبارت <code className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-black text-rose-600 tracking-wider">RESET</code> را تایپ نمایید:
                </label>
                <input
                  type="text"
                  value={confirmKeywordInput}
                  onChange={(e) => setConfirmKeywordInput(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800 rounded-xl font-mono text-center font-black tracking-widest text-lg outline-none focus:ring-2 focus:ring-rose-500 uppercase text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setResetModalMode(null);
                  setConfirmKeywordInput('');
                }}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                انصراف و لغو
              </button>

              <button
                type="button"
                disabled={confirmKeywordInput.trim().toUpperCase() !== 'RESET' || isResetting}
                onClick={handleExecuteReset}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
              >
                {isResetting ? (
                  <span className="animate-pulse">در حال پشتیبان‌گیری و پاکسازی...</span>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>تایید قطعی و پاکسازی</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SystemAdminManager;
