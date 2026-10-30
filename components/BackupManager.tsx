import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Database, Upload, FileJson, Shield, FolderInput, Lock, Unlock, KeyRound } from 'lucide-react';

const BackupManager: React.FC = () => {
  const { getAllData, importData } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Crypto Helpers ---

  const buffToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const hexToBuff = (hex: string): Uint8Array => {
    const tokens = hex.match(/.{1,2}/g);
    if (!tokens) return new Uint8Array();
    return new Uint8Array(tokens.map(byte => parseInt(byte, 16)));
  };

  const getCryptoKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  };

  const encryptData = async (data: string, pass: string) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await getCryptoKey(pass, salt);
    const enc = new TextEncoder();
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(data)
    );

    return JSON.stringify({
      isEncrypted: true,
      salt: buffToHex(salt),
      iv: buffToHex(iv),
      data: buffToHex(encryptedContent)
    });
  };

  const decryptData = async (fileContent: string, pass: string): Promise<string> => {
    const json = JSON.parse(fileContent);
    if (!json.isEncrypted) return fileContent; // Not encrypted, return as is

    const salt = hexToBuff(json.salt);
    const iv = hexToBuff(json.iv);
    const data = hexToBuff(json.data);
    
    const key = await getCryptoKey(pass, salt);
    
    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
      );
      const dec = new TextDecoder();
      return dec.decode(decrypted);
    } catch (e) {
      throw new Error("رمز عبور اشتباه است یا فایل خراب شده است.");
    }
  };

  // --- Handlers ---

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const data = getAllData();
      let finalContent = JSON.stringify(data, null, 2);
      let isEncrypted = false;
      
      // Encrypt if password provided
      if (password.trim()) {
        finalContent = await encryptData(finalContent, password.trim());
        isEncrypted = true;
      }
      
      const date = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
      const prefix = isEncrypted ? 'secure_' : '';
      const fileName = `gas_manager_${prefix}backup_${date}.json`;

      const downloadFallback = () => {
          const blob = new Blob([finalContent], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
      };

      try {
        // @ts-ignore
        if (typeof window.showSaveFilePicker === 'function') {
          // @ts-ignore
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: isEncrypted ? 'Encrypted Backup File' : 'JSON Backup File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(finalContent);
          await writable.close();
          alert(`فایل پشتیبان ${isEncrypted ? '(رمزنگاری شده) ' : ''}با موفقیت ذخیره شد.`);
        } else {
          downloadFallback();
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API failed, using fallback:', err);
        downloadFallback();
      }
    } catch (error) {
      console.error(error);
      alert('خطا در ایجاد فایل پشتیبان.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        let finalDataString = fileContent;
        const tempJson = JSON.parse(fileContent);

        if (tempJson.isEncrypted) {
            if (!password.trim()) {
                alert('این فایل رمزنگاری شده است. لطفاً رمز عبور را در کادر مربوطه وارد کنید و مجددا تلاش کنید.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                setIsProcessing(false);
                return;
            }
            try {
                finalDataString = await decryptData(fileContent, password.trim());
            } catch (err: any) {
                alert(err.message);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setIsProcessing(false);
                return;
            }
        }

        const data = JSON.parse(finalDataString);
        
        if (!data.drivers || !data.transactions) {
          alert('فایل انتخاب شده معتبر نیست یا فرمت آن صحیح نمی‌باشد.');
          return;
        }

        if (window.confirm('آیا مطمئن هستید؟ با بازگردانی نسخه پشتیبان، اطلاعات فعلی با اطلاعات فایل جایگزین خواهد شد.')) {
            importData(data);
            alert('اطلاعات با موفقیت بازیابی شد.');
        }
      } catch (error) {
        console.error('Error parsing backup file:', error);
        alert('خطا در خواندن فایل. لطفا از سالم بودن فایل JSON و صحت رمز عبور اطمینان حاصل کنید.');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">مدیریت پشتیبان‌گیری</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">تهیه نسخه پشتیبان و بازیابی اطلاعات سیستم</p>
          </div>
        </div>

        {/* Encryption Settings */}
        <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-xl shadow-inner">
            <div className="flex items-center gap-2 mb-3 text-indigo-800 dark:text-indigo-300 font-bold">
                <KeyRound size={20} />
                <h3>تنظیمات امنیتی (اختیاری)</h3>
            </div>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-4 leading-relaxed">
                برای محافظت از اطلاعات، می‌توانید یک رمز عبور تعیین کنید. 
                اگر رمز وارد کنید، فایل خروجی <strong>رمزنگاری</strong> می‌شود و برای بازگردانی آن حتماً به همین رمز نیاز خواهید داشت.
            </p>
            <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-indigo-400 dark:text-indigo-500">
                    {password ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                <input 
                    type="text" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور برای رمزنگاری / رمزگشایی فایل..."
                    className="w-full pr-10 pl-4 py-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all text-slate-900 dark:text-white shadow-sm"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <FolderInput size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">دریافت فایل پشتیبان</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-xs">
              {password 
                ? 'فایل پشتیبان رمزنگاری شده با رمز عبور وارد شده ایجاد خواهد شد.' 
                : 'فایل پشتیبان استاندارد (بدون رمز) ایجاد خواهد شد.'}
            </p>
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className={`w-full py-4 ${password ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg active:scale-95`}
            >
              {isProcessing ? (
                <span className="animate-pulse">در حال پردازش...</span>
              ) : (
                <>
                   {password ? <Lock size={20} /> : <FileJson size={20} />} 
                   {password ? 'دانلود فایل امن (Secure)' : 'دانلود فایل پشتیبان'}
                </>
              )}
            </button>
          </div>

          {/* Import Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Upload size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">بازیابی اطلاعات</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed max-w-xs">
              فایل انتخاب شده باید معتبر باشد. در صورت رمزنگاری، رمز بالا استفاده می‌شود.
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold p-2 rounded-lg mb-4 border border-rose-100 dark:border-rose-900/30">
                ⚠️ هشدار: داده‌های فعلی پاک و با فایل جایگزین می‌شوند.
            </div>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />
            <button 
              onClick={handleImportClick}
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg active:scale-95"
            >
              {isProcessing ? (
                 <span className="animate-pulse">در حال پردازش...</span>
              ) : (
                 <>
                    <Upload size={20} /> انتخاب فایل و بازیابی
                 </>
              )}
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-4 transition-colors">
             <Shield className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" size={24} />
             <div>
                 <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">توصیه‌های امنیتی</h4>
                 <p className="text-xs text-amber-700 dark:text-amber-500/80 leading-relaxed">
                     {password 
                        ? 'فایل خروجی با الگوریتم قدرتمند AES-256 رمزنگاری می‌شود. دقت کنید که هیچ راهی برای بازیابی رمز فراموش شده وجود ندارد.'
                        : 'فایل‌های پشتیبان شامل تمام اسناد مالی، تراکنش‌ها و شماره‌های تماس رانندگان هستند. از اشتراک‌گذاری آن‌ها در شبکه‌های ناامن خودداری کنید.'}
                 </p>
             </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;