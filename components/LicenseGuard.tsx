
import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    KeyRound,
    Copy,
    CheckCircle2,
    Lock,
    Cpu,
    ShieldCheck,
    AlertCircle,
    Clock,
    RefreshCw
} from 'lucide-react';
import {
    getSystemId,
    saveLicenseKey,
    getAppLicenseStatus,
    validateLicense,
    LicenseStatus
} from '../services/licensing';

interface LicenseGuardProps {
    children: React.ReactNode;
}

const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
    const [status, setStatus] = useState<LicenseStatus>(() => getAppLicenseStatus());
    const [systemId] = useState<string>(() => getSystemId());
    const [licenseInput, setLicenseInput] = useState('');
    const [copiedId, setCopiedId] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const refreshLicenseStatus = () => {
        setStatus(getAppLicenseStatus());
    };

    useEffect(() => {
        refreshLicenseStatus();
        const interval = setInterval(refreshLicenseStatus, 30000);
        const handleLicenseEvent = () => refreshLicenseStatus();
        window.addEventListener('license-updated', handleLicenseEvent);
        window.addEventListener('storage', handleLicenseEvent);

        return () => {
            clearInterval(interval);
            window.removeEventListener('license-updated', handleLicenseEvent);
            window.removeEventListener('storage', handleLicenseEvent);
        };
    }, []);

    const handleCopySystemId = () => {
        navigator.clipboard.writeText(systemId);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const trimmed = licenseInput.trim().toUpperCase();
        if (!trimmed) {
            setErrorMsg('لطفاً کد لایسنس یا کلید تمدید را وارد نمایید.');
            return;
        }

        const check = validateLicense(trimmed);
        if (!check.isValid) {
            setErrorMsg(check.message || 'کد فعال‌سازی وارد شده معتبر نیست.');
            return;
        }

        if (check.isExpired) {
            setErrorMsg(check.message || 'مدت اعتبار این کلید لایسنس به پایان رسیده است. لطفاً کد تمدید جدید وارد کنید.');
            return;
        }

        const saved = saveLicenseKey(trimmed);
        if (saved) {
            setSuccessMsg('لایسنس با موفقیت تایید و نرم‌افزار فعال شد.');
            setLicenseInput('');
            setTimeout(() => {
                refreshLicenseStatus();
            }, 600);
        } else {
            setErrorMsg('خطا در ذخیره‌سازی لایسنس. مجدداً تلاش کنید.');
        }
    };

    // اگر لایسنس معتبر است و منقضی نشده، محتوای برنامه نمایش داده شود
    if (status.isValid && !status.isExpired) {
        return <>{children}</>;
    }

    const isExpiredLock = status.isValid && status.isExpired;

    return (
        <div
            className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 md:p-8 font-vazir relative overflow-hidden"
            dir="rtl"
        >
            {/* جلوه پس‌زمینه */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-xl bg-slate-900/95 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">
                {/* هدر وضعیت قفل */}
                <div
                    className={`p-8 border-b border-slate-800 flex items-center justify-between ${
                        isExpiredLock
                            ? 'bg-gradient-to-l from-amber-950/60 to-slate-900'
                            : 'bg-gradient-to-l from-blue-950/60 to-slate-900'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className={`p-4 rounded-2xl shadow-lg ${
                                isExpiredLock
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            }`}
                        >
                            {isExpiredLock ? <Clock size={32} /> : <Lock size={32} />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">
                                {isExpiredLock
                                    ? 'پایان اعتبار زمانی لایسنس'
                                    : 'قفل امنیتی و فعال‌سازی نرم‌افزار'}
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">
                                سامانه جامع مدیریت صادرات و لجستیک گاز (نسخه سازمانی)
                            </p>
                        </div>
                    </div>
                    <ShieldAlert
                        size={28}
                        className={isExpiredLock ? 'text-amber-400 animate-pulse' : 'text-blue-400'}
                    />
                </div>

                <div className="p-8 space-y-6">
                    {/* پیام وضعیت انقضا یا نیاز به فعال‌سازی اولیه */}
                    <div
                        className={`p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${
                            isExpiredLock
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                : 'bg-slate-800/70 border-slate-700 text-slate-300'
                        }`}
                    >
                        <AlertCircle
                            size={20}
                            className={`flex-shrink-0 mt-0.5 ${
                                isExpiredLock ? 'text-amber-400' : 'text-blue-400'
                            }`}
                        />
                        <div>
                            {isExpiredLock ? (
                                <>
                                    <p className="font-bold text-sm text-amber-300 mb-1">
                                        {status.clockTampered
                                            ? 'تغییر غیرمجاز تاریخ سیستم شناسایی شد!'
                                            : 'مهلت استفاده از لایسنس شما به اتمام رسیده است'}
                                    </p>
                                    <p>
                                        {status.message} جهت ادامه کار با نرم‌افزار و دسترسی به اطلاعات، لطفاً
                                        شناسه سیستم زیر را برای مدیریت ارسال کرده و کد تمدید جدید را ثبت نمایید.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-sm text-white mb-1">
                                        نرم‌افزار روی این سیستم هنوز فعال نشده است
                                    </p>
                                    <p>
                                        برای بازگشایی قفل برنامه، شناسه سخت‌افزاری سیستم (System ID) زیر را کپی
                                        کرده و جهت دریافت کد لایسنس اختصاصی به مدیر سیستم ارسال فرمایید.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* نمایش شناسه سیستم */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
                            <Cpu size={15} className="text-blue-400" />
                            شناسه اختصاصی این سیستم (System ID):
                        </label>
                        <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                            <span
                                className="font-mono text-lg md:text-xl font-black tracking-widest text-blue-400 select-all"
                                dir="ltr"
                            >
                                {systemId}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopySystemId}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                                    copiedId
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                }`}
                            >
                                {copiedId ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                                {copiedId ? 'کپی شد' : 'کپی شناسه'}
                            </button>
                        </div>
                    </div>

                    {/* فرم ورود کد لایسنس */}
                    <form onSubmit={handleActivate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                <KeyRound size={15} className="text-emerald-400" />
                                {isExpiredLock ? 'کد تمدید لایسنس جدید:' : 'کد فعال‌سازی لایسنس:'}
                            </label>
                            <input
                                type="text"
                                value={licenseInput}
                                onChange={(e) => {
                                    setLicenseInput(e.target.value);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                dir="ltr"
                                spellCheck={false}
                                placeholder="XXXXXXXXXXX-XXXXXXXX"
                                className="w-full p-4 bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl font-mono text-center text-base md:text-lg tracking-wider uppercase text-white outline-none transition-all placeholder:text-slate-600"
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-black rounded-2xl shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {isExpiredLock ? <RefreshCw size={18} /> : <ShieldCheck size={18} />}
                            {isExpiredLock ? 'ثبت کد تمدید و بازگشایی برنامه' : 'بررسی اعتبار و فعال‌سازی نرم‌افزار'}
                        </button>
                    </form>
                </div>

                <div className="px-8 py-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>محافظت شده با قفل سخت‌افزاری اختصاصی</span>
                    <span dir="ltr">Security Guard v2.6</span>
                </div>
            </div>
        </div>
    );
};

export default LicenseGuard;

