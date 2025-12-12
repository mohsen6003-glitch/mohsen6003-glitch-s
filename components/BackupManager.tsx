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
      
      // Create current date string for filename (e.g. 1402-05-10)
      const date = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
      const prefix = isEncrypted ? 'secure_' : '';
      const fileName = `gas_manager_${prefix}backup_${date}.json`;

      // Helper for legacy download method
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
        // Check if File System Access API is supported (for "Save As" dialog)
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
        
        // Check if looks like our encrypted format
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
        
        // Basic validation
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
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">مدیریت پشتیبان‌گیری</h2>
            <p className="text-sm text-slate-500">تهیه نسخه پشتیبان و بازیابی اطلاعات سیستم</p>
          </div>
        </div>

        {/* Encryption Settings */}
        <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-indigo-800 font-bold">
                <KeyRound size={20} />
                <h3>تنظیمات امنیتی (اختیاری)</h3>
            </div>
            <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                برای محافظت از اطلاعات، می‌توانید یک رمز عبور تعیین کنید. 
                اگر رمز وارد کنید، فایل خروجی <strong>رمزنگاری</strong> می‌شود و برای بازگردانی آن حتماً به همین رمز نیاز خواهید داشت.
            </p>
            <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-indigo-400">
                    {password ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                <input 
                    type="text" // Using text to allow user to see the password they are setting for backup
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور برای رمزنگاری / رمزگشایی فایل..."
                    className="w-full pr-10 pl-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
              <FolderInput size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">دریافت فایل پشتیبان</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {password 
                ? 'فایل پشتیبان رمزنگاری شده با رمز عبور وارد شده ایجاد خواهد شد.' 
                : 'فایل پشتیبان استاندارد (بدون رمز) ایجاد خواهد شد.'}
            </p>
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className={`w-full py-3 ${password ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50`}
            >
              {isProcessing ? (
                <span className="animate-pulse">در حال پردازش...</span>
              ) : (
                <>
                   {password ? <Lock size={20} /> : <FileJson size={20} />} 
                   {password ? 'دانلود فایل رمزنگاری شده' : 'دانلود فایل معمولی'}
                </>
              )}
            </button>
          </div>

          {/* Import Section */}
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">بازیابی اطلاعات</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              اگر فایل انتخابی رمزنگاری شده باشد، از رمز عبور وارد شده در بالا برای بازگشایی آن استفاده می‌شود.
              <span className="block mt-1 text-red-500 font-medium text-xs">توجه: اطلاعات فعلی با اطلاعات فایل جایگزین می‌شود.</span>
            </p>
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                 <span className="animate-pulse">در حال پردازش...</span>
              ) : (
                 <>
                    <Upload size={20} /> انتخاب فایل پشتیبان
                 </>
              )}
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
             <Shield className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
             <div>
                 <h4 className="font-bold text-amber-800 text-sm">نکته امنیتی</h4>
                 <p className="text-xs text-amber-700 mt-1">
                     {password 
                        ? 'فایل خروجی با الگوریتم AES-GCM رمزنگاری می‌شود. اگر رمز عبور را فراموش کنید، امکان بازیابی فایل وجود نخواهد داشت.'
                        : 'فایل‌های پشتیبان شامل تمام اطلاعات مالی و شخصی رانندگان هستند. لطفاً این فایل‌ها را در مکان امنی نگهداری کنید.'}
                 </p>
             </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;