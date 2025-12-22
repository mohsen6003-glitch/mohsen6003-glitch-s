
import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Copy, CheckCircle2, Lock, Terminal } from 'lucide-react';
import { getSystemId, saveLicenseKey, isAppLicensed } from '../services/licensing';

interface LicenseGuardProps {
    children: React.ReactNode;
}

const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
    const [isLicensed, setIsLicensed] = useState<boolean>(false);
    const [licenseInput, setLicenseInput] = useState('');
    const [systemId, setSystemId] = useState('');
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setSystemId(getSystemId());
        setIsLicensed(isAppLicensed());
    }, []);

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        if (saveLicenseKey(licenseInput)) {
            setIsLicensed(true);
            setError(false);
            window.location.reload(); // بازنشانی برای اطمینان
        } else {
            setError(true);
            setTimeout(() => setError(false), 3000);
        }
    };

    const copySystemId = () => {
        navigator.clipboard.writeText(systemId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLicensed) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[9999]" dir="rtl">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700 animate-in fade-in zoom-in duration-500">
                <div className="bg-slate-800 p-8 text-center relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Lock size={120} className="text-white" />
                    </div>
                    <div className="inline-flex p-4 bg-red-500 rounded-2xl text-white mb-4 shadow-lg shadow-red-500/30">
                        <ShieldAlert size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">فعالسازی نرم‌افزار</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        برای استفاده از سیستم مدیریت صادرات گاز، نیاز به کد فعالسازی معتبر دارید.
                    </p>
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">شناسه اختصاصی سیستم شما</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl group hover:border-blue-300 transition-colors">
                            <code className="flex-1 font-mono text-sm font-bold text-slate-700 text-center select-all">{systemId}</code>
                            <button 
                                onClick={copySystemId}
                                className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-white border shadow-sm text-slate-400 hover:text-blue-600'}`}
                            >
                                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400 text-center">شناسه بالا را کپی کرده و برای دریافت کد فعالسازی به مدیر سیستم ارسال کنید.</p>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <KeyRound size={16} className="text-blue-600" />
                                کد فعالسازی را وارد کنید
                            </label>
                            <input 
                                type="text"
                                value={licenseInput}
                                onChange={(e) => setLicenseInput(e.target.value)}
                                className={`w-full p-4 bg-white border-2 rounded-2xl text-center font-mono text-lg tracking-[0.2em] focus:ring-4 outline-none transition-all ${error ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
                                placeholder="XXXX-XXXX-XXXX"
                                required
                            />
                            {error && <p className="text-red-500 text-xs mt-2 text-center font-bold">کد فعالسازی وارد شده معتبر نیست!</p>}
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                        >
                            تأیید و ورود به برنامه
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Terminal size={14} />
                            <span className="text-[10px]">v2.5.0 Stable</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                        <div className="text-[10px] text-slate-400 font-medium">تمامی حقوق محفوظ است</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicenseGuard;
