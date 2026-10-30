
import React, { useState, useEffect } from 'react';
import {
    KeyRound,
    ShieldCheck,
    Copy,
    CheckCircle2,
    History,
    Cpu,
    CalendarClock,
    Zap,
    Lock,
    Unlock,
    AlertCircle,
    RefreshCw,
    LogOut,
    ShieldAlert,
    Settings,
    Eye,
    EyeOff
} from 'lucide-react';
import {
    generateLicenseForID,
    getSystemId,
    getAppLicenseStatus,
    saveLicenseKey,
    removeLicenseKey,
    verifyLicenseAdminPassword,
    changeLicenseAdminPassword,
    validateLicense,
    LicenseStatus
} from '../services/licensing';

const LicenseGenerator: React.FC = () => {
    // وضعیت احراز هویت پنل مدیریت لایسنس
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // اطلاعات لایسنس فعلی همین سیستم
    const [currentSystemId] = useState(() => getSystemId());
    const [currentStatus, setCurrentStatus] = useState<LicenseStatus>(() => getAppLicenseStatus());
    const [renewalKeyInput, setRenewalKeyInput] = useState('');
    const [renewalFeedback, setRenewalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmLockModal, setConfirmLockModal] = useState(false);

    // فرم تولید کلید برای مشتریان
    const [targetId, setTargetId] = useState('');
    const [days, setDays] = useState('365');
    const [generatedKey, setGeneratedKey] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedSysId, setCopiedSysId] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    // فرم تغییر رمز پنل مدیریت لایسنس
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const refresh = () => setCurrentStatus(getAppLicenseStatus());
        window.addEventListener('license-updated', refresh);
        return () => window.removeEventListener('license-updated', refresh);
    }, []);

    const handleAdminUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        if (verifyLicenseAdminPassword(adminPasswordInput)) {
            setIsUnlocked(true);
            setAdminPasswordInput('');
        } else {
            setAuthError('رمز مخفی مدیریت اشتباه است. فقط مدیر اصلی مجاز به صدور لایسنس می‌باشد.');
        }
    };

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        setGenError(null);
        if (!targetId.trim()) {
            setGenError('لطفاً شناسه سیستم مشتری (System ID) را وارد کنید.');
            return;
        }

        const key = generateLicenseForID(targetId.trim().toUpperCase(), parseInt(days, 10));
        setGeneratedKey(key);
    };

    const handleFillCurrentSystemId = () => {
        setTargetId(currentSystemId);
        setGenError(null);
    };

    const copyToClipboard = () => {
        if (!generatedKey) return;
        navigator.clipboard.writeText(generatedKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copySystemIdToClipboard = () => {
        navigator.clipboard.writeText(currentSystemId);
        setCopiedSysId(true);
        setTimeout(() => setCopiedSysId(false), 2000);
    };

    const handleUpdateCurrentLicense = (e: React.FormEvent) => {
        e.preventDefault();
        setRenewalFeedback(null);
        const trimmed = renewalKeyInput.trim().toUpperCase();
        if (!trimmed) {
            setRenewalFeedback({ type: 'error', text: 'لطفاً کد لایسنس جدید را وارد کنید.' });
            return;
        }
        const check = validateLicense(trimmed);
        if (!check.isValid || check.isExpired) {
            setRenewalFeedback({ type: 'error', text: check.message || 'کلید وارد شده معتبر نیست.' });
            return;
        }
        if (saveLicenseKey(trimmed)) {
            setCurrentStatus(getAppLicenseStatus());
            setRenewalKeyInput('');
            setRenewalFeedback({ type: 'success', text: 'لایسنس این سیستم با موفقیت بروزرسانی و تمدید شد.' });
        }
    };

    const handleLockThisSystem = () => {
        removeLicenseKey();
        setConfirmLockModal(false);
    };

    const handleChangeAdminPass = (e: React.FormEvent) => {
        e.preventDefault();
        setPassFeedback(null);
        const result = changeLicenseAdminPassword(oldPass, newPass);
        setPassFeedback({
            type: result.success ? 'success' : 'error',
            text: result.message
        });
        if (result.success) {
            setOldPass('');
            setNewPass('');
        }
    };

    // اگر هنوز رمز مدیریت وارد نشده است، صفحه قفل تب صدور لایسنس به همراه وضعیت لایسنس فعلی نمایش داده شود
    if (!isUnlocked) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* کارت وضعیت لایسنس سیستم فعلی برای کاربر */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                    وضعیت لایسنس این دستگاه
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {currentStatus.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Cpu size={16} className="text-blue-500" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">شناسه سیستم:</span>
                            <span className="font-mono font-black text-sm text-slate-800 dark:text-white" dir="ltr">
                                {currentSystemId}
                            </span>
                            <button
                                type="button"
                                onClick={copySystemIdToClipboard}
                                className="mr-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                            >
                                {copiedSysId ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                {copiedSysId ? 'کپی شد' : 'کپی'}
                            </button>
                        </div>
                    </div>

                    {/* فرم تمدید لایسنس برای کاربر عادی */}
                    <form onSubmit={handleUpdateCurrentLicense} className="mt-6 space-y-3">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                            ثبت کد تمدید لایسنس جدید برای این سیستم:
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={renewalKeyInput}
                                onChange={(e) => setRenewalKeyInput(e.target.value)}
                                dir="ltr"
                                placeholder="XXXXXXXXXXX-XXXXXXXX"
                                className="flex-1 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center uppercase text-sm outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                            >
                                <RefreshCw size={16} />
                                ثبت و تمدید اعتبار
                            </button>
                        </div>
                        {renewalFeedback && (
                            <div
                                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                    renewalFeedback.type === 'success'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                                }`}
                            >
                                {renewalFeedback.type === 'success' ? (
                                    <CheckCircle2 size={16} />
                                ) : (
                                    <AlertCircle size={16} />
                                )}
                                <span>{renewalFeedback.text}</span>
                            </div>
                        )}
                    </form>
                </div>

                {/* قفل رمز مخفی مدیریت برای دسترسی به بخش صدور کلید */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
                                <Lock size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">بخش محافظت‌شده صدور لایسنس (ویژه مدیریت)</h2>
                                <p className="text-slate-400 text-xs mt-1">
                                    جهت جلوگیری از تولید کلید توسط کاربران، ورود به پنل صدور لایسنس نیازمند رمز مخفی مدیریت است
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleAdminUnlock} className="p-8 space-y-5 max-w-lg mx-auto">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                رمز مخفی پنل صدور لایسنس:
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={adminPasswordInput}
                                    onChange={(e) => {
                                        setAdminPasswordInput(e.target.value);
                                        if (authError) setAuthError(null);
                                    }}
                                    dir="ltr"
                                    placeholder="••••••••••"
                                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-mono text-center tracking-widest"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {authError && (
                            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span>{authError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Unlock size={18} />
                            ورود به پنل صدور لایسنس
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* پنل اصلی صدور کلید لایسنس */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-900 p-8 text-white flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                            <KeyRound size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">پنل مدیریت و صدور لایسنس جدید</h2>
                            <p className="text-slate-400 text-sm mt-1">
                                تولید کد فعال‌سازی اختصاصی متصل به شناسه سخت‌افزاری (System ID)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsUnlocked(false)}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
                        >
                            <LogOut size={15} />
                            قفل کردن پنل مدیریت
                        </button>
                        <Zap className="text-amber-400 animate-pulse hidden sm:block" size={28} />
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Cpu size={16} className="text-blue-500" />
                                        شناسه سیستم مشتری (System ID)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleFillCurrentSystemId}
                                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        درج شناسه همین سیستم
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={targetId}
                                    onChange={(e) => {
                                        setTargetId(e.target.value);
                                        if (genError) setGenError(null);
                                    }}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono uppercase tracking-widest text-center"
                                    placeholder="GE-XXXXX-XXXXX"
                                    dir="ltr"
                                    spellCheck={false}
                                />
                                {genError && (
                                    <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {genError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <CalendarClock size={16} className="text-blue-500" />
                                    مدت اعتبار لایسنس
                                </label>
                                <select
                                    value={days}
                                    onChange={(e) => setDays(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold cursor-pointer"
                                >
                                    <option value="7">۷ روز (آزمایشی یک هفته‌ای)</option>
                                    <option value="30">۳۰ روز (یک ماهه)</option>
                                    <option value="90">۹۰ روز (سه ماهه)</option>
                                    <option value="180">۱۸۰ روز (شش ماهه)</option>
                                    <option value="365">۳۶۵ روز (یک ساله)</option>
                                    <option value="1095">۱۰۹۵ روز (سه ساله)</option>
                                    <option value="3650">۳۶۵۰ روز (دائمی / ۱۰ ساله)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95 mt-4"
                            >
                                <ShieldCheck size={20} />
                                صدور آنی کلید فعال‌سازی
                            </button>
                        </div>

                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 bg-slate-50/50 dark:bg-slate-800/20">
                            {generatedKey ? (
                                <div className="w-full space-y-6 animate-in zoom-in duration-300">
                                    <div className="text-center">
                                        <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full mb-3">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                            کلید لایسنس صادر شد
                                        </h3>
                                    </div>

                                    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-inner group relative">
                                        <p
                                            className="font-mono text-xl font-black text-blue-600 dark:text-blue-400 break-all text-center tracking-tighter"
                                            dir="ltr"
                                        >
                                            {generatedKey}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={copyToClipboard}
                                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-full flex items-center gap-1.5 hover:bg-slate-900 transition-all"
                                        >
                                            {copied ? (
                                                <CheckCircle2 size={12} className="text-emerald-400" />
                                            ) : (
                                                <Copy size={12} />
                                            )}
                                            {copied ? 'کپی شد' : 'کپی کلید'}
                                        </button>
                                    </div>

                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                        <strong>نکته امنیتی:</strong> این کلید فقط بر روی سیستمی با شناسه{' '}
                                        <span className="font-mono font-bold" dir="ltr">
                                            {targetId.trim().toUpperCase()}
                                        </span>{' '}
                                        قابل استفاده است و روی سیستم‌های دیگر کار نخواهد کرد.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4 opacity-30">
                                    <KeyRound size={64} className="mx-auto" />
                                    <p className="text-sm font-bold">منتظر ورود شناسه سیستم برای صدور کلید...</p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* مدیریت وضعیت قفل همین دستگاه و تغییر رمز مخفی مدیریت */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* کنترل لایسنس دستگاه فعلی */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                                <ShieldAlert size={22} />
                            </div>
                            <h3 className="font-black text-base text-slate-800 dark:text-white">
                                مدیریت قفل همین سیستم
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            وضعیت فعلی: <strong className="text-emerald-600 dark:text-emerald-400">{currentStatus.message}</strong>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            در صورتی که می‌خواهید لایسنس ثبت‌شده روی این سیستم را حذف کنید تا نرم‌افزار بلافاصله قفل شود و صفحه دریافت کد فعال‌سازی نمایش داده شود، از دکمه زیر استفاده کنید.
                        </p>
                    </div>

                    {!confirmLockModal ? (
                        <button
                            type="button"
                            onClick={() => setConfirmLockModal(true)}
                            className="w-full py-3.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                        >
                            <Lock size={16} />
                            حذف لایسنس فعلی و قفل فوری نرم‌افزار
                        </button>
                    ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
                            <p className="text-xs font-bold text-red-700 dark:text-red-300">
                                آیا مطمئن هستید؟ با این کار برنامه بلافاصله قفل شده و تا وارد کردن کد لایسنس معتبر باز نخواهد شد.
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleLockThisSystem}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black"
                                >
                                    بله، برنامه قفل شود
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmLockModal(false)}
                                    className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                                >
                                    انصراف
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* تغییر رمز مخفی تب صدور لایسنس */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                            <Settings size={22} />
                        </div>
                        <div>
                            <h3 className="font-black text-base text-slate-800 dark:text-white">
                                تغییر رمز مخفی پنل صدور لایسنس
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                رمز پیش‌فرض اولیه: <code className="font-mono">Admin@2025</code>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleChangeAdminPass} className="space-y-3">
                        <input
                            type="password"
                            value={oldPass}
                            onChange={(e) => setOldPass(e.target.value)}
                            placeholder="رمز فعلی مدیریت"
                            dir="ltr"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-center outline-none focus:border-blue-500"
                        />
                        <input
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="رمز جدید مدیریت (حداقل ۵ کاراکتر)"
                            dir="ltr"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-center outline-none focus:border-blue-500"
                        />
                        {passFeedback && (
                            <p
                                className={`text-xs font-bold ${
                                    passFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'
                                }`}
                            >
                                {passFeedback.text}
                            </p>
                        )}
                        <button
                            type="submit"
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                        >
                            ذخیره رمز جدید مدیریت
                        </button>
                    </form>
                </div>
            </div>

            {/* راهنمای مدیریت */}
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 flex gap-4 transition-colors">
                <History className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" size={24} />
                <div>
                    <h4 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm mb-1">
                        راهنمای نحوه تحویل نرم‌افزار به مشتری
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400/80 leading-relaxed">
                        هنگام نصب نرم‌افزار بر روی سیستم جدید مشتری، برنامه به صورت خودکار قفل بوده و یک کد{' '}
                        <code className="bg-indigo-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded font-mono">
                            System ID
                        </code>{' '}
                        نمایش می‌دهد. مشتری آن شناسه را برای شما ارسال می‌کند و شما در این بخش (که با رمز مخفی شما محافظت می‌شود) کلید زمان‌دار (مثلاً ۳۶۵ روزه) صادر کرده و برای مشتری ارسال می‌نمایید. پس از اتمام مهلت زمانی، برنامه مجدداً قفل شده و کد تمدید جدید درخواست می‌کند.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LicenseGenerator;

