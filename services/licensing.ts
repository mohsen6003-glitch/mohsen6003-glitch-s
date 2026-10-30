
/**
 * این سرویس وظیفه مدیریت لایسنس پیشرفته و قفل سخت‌افزاری نرم‌افزار را بر عهده دارد.
 * فرمت کلید لایسنس: [EXPIRY_TIMESTAMP_HEX]-[SIGNATURE]
 * امضا: SimpleHash(SystemID + ExpiryTimestamp + SecretSalt)
 */

const SECRET_SALT = "GAS_EXPORT_SECURE_PRO_2024_V2";

// کلید مدیریتی ثابت که روی تمام سیستم‌ها کار می‌کند و انقضا ندارد
export const MASTER_LICENSE_KEY = "GAS-ADMIN-UNLIMITED-SUPER-KEY-2025";

// رمز پیش‌فرض ورود به پنل صدور لایسنس مدیریت: Admin@2025
const DEFAULT_ADMIN_PASS = "Admin@2025";

const generateHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase();
};

export const getSystemId = (): string => {
    let systemId = localStorage.getItem('app_system_id');
    if (!systemId) {
        systemId = 'GE-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Date.now().toString(36).slice(-5).toUpperCase();
        localStorage.setItem('app_system_id', systemId);
    }
    return systemId;
};

export interface LicenseStatus {
    isValid: boolean;
    isExpired: boolean;
    remainingDays: number | null;
    expiryDate: string | null;
    message: string;
    isMaster?: boolean;
    clockTampered?: boolean;
}

const checkAndRecordClock = (): boolean => {
    const now = Date.now();
    const lastSeenRaw = localStorage.getItem('app_last_seen_timestamp');
    const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) : 0;

    // اگر ساعت سیستم بیش از ۲۴ ساعت به عقب کشیده شده باشد
    if (lastSeen > 0 && now + (24 * 60 * 60 * 1000) < lastSeen) {
        return false;
    }

    if (now > lastSeen) {
        localStorage.setItem('app_last_seen_timestamp', now.toString());
    }
    return true;
};

export const validateLicense = (key: string): LicenseStatus => {
    if (!key || !key.trim()) {
        return {
            isValid: false,
            isExpired: false,
            remainingDays: null,
            expiryDate: null,
            message: "لایسنس فعال ثبت نشده است."
        };
    }

    const trimmedKey = key.trim().toUpperCase();

    // بررسی کلید مستر (مدیریتی)
    if (trimmedKey === MASTER_LICENSE_KEY) {
        localStorage.setItem('app_last_seen_timestamp', Date.now().toString());
        return { 
            isValid: true, 
            isExpired: false, 
            remainingDays: 9999, 
            expiryDate: "نامحدود", 
            message: "لایسنس مدیریتی فعال (دسترسی کامل)",
            isMaster: true
        };
    }

    if (!trimmedKey.includes('-')) {
        return {
            isValid: false,
            isExpired: false,
            remainingDays: null,
            expiryDate: null,
            message: "فرمت کلید فعال‌سازی نامعتبر است."
        };
    }

    const parts = trimmedKey.split('-');
    if (parts.length !== 2) {
        return {
            isValid: false,
            isExpired: false,
            remainingDays: null,
            expiryDate: null,
            message: "ساختار کد لایسنس صحیح نیست."
        };
    }

    const [expiryHex, signature] = parts;
    const systemId = getSystemId();
    
    // بازسازی امضا برای تایید صحت کلید متصل به شناسه سیستم
    const expectedSignature = generateHash(systemId + expiryHex + SECRET_SALT);

    if (signature !== expectedSignature) {
        return {
            isValid: false,
            isExpired: false,
            remainingDays: null,
            expiryDate: null,
            message: "کد لایسنس با شناسه این سیستم مطابقت ندارد."
        };
    }

    // بررسی دستکاری ساعت سیستم
    if (!checkAndRecordClock()) {
        return {
            isValid: true,
            isExpired: true,
            remainingDays: 0,
            expiryDate: null,
            clockTampered: true,
            message: "خطای امنیتی: تاریخ سیستم به عقب تغییر یافته است."
        };
    }

    // بررسی تاریخ انقضا
    const expiryTimestamp = parseInt(expiryHex, 16);
    if (isNaN(expiryTimestamp)) {
        return {
            isValid: false,
            isExpired: false,
            remainingDays: null,
            expiryDate: null,
            message: "اطلاعات زمانی لایسنس نامعتبر است."
        };
    }

    const now = Date.now();
    const isExpired = now > expiryTimestamp;
    const remainingMs = expiryTimestamp - now;
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    
    const expiryDateStr = new Date(expiryTimestamp).toLocaleDateString('fa-IR');

    if (isExpired) {
        return {
            isValid: true,
            isExpired: true,
            remainingDays: 0,
            expiryDate: expiryDateStr,
            message: `اعتبار لایسنس در تاریخ ${expiryDateStr} به پایان رسیده است.`
        };
    }

    return { 
        isValid: true, 
        isExpired: false, 
        remainingDays, 
        expiryDate: expiryDateStr, 
        message: `لایسنس فعال تا ${expiryDateStr} (${remainingDays} روز باقی‌مانده)` 
    };
};

export const getSavedLicenseKey = (): string => {
    return localStorage.getItem('app_license_key') || '';
};

export const getAppLicenseStatus = (): LicenseStatus => {
    const savedKey = getSavedLicenseKey();
    return validateLicense(savedKey);
};

export const saveLicenseKey = (key: string): boolean => {
    const status = validateLicense(key);
    if (status.isValid && !status.isExpired) {
        localStorage.setItem('app_license_key', key.trim().toUpperCase());
        window.dispatchEvent(new Event('license-updated'));
        return true;
    }
    return false;
};

export const removeLicenseKey = (): void => {
    localStorage.removeItem('app_license_key');
    window.dispatchEvent(new Event('license-updated'));
};

/**
 * تابع کمکی برای تولید لایسنس (فقط برای مدیریت)
 * @param id شناسه سیستم مشتری
 * @param days تعداد روز اعتبار (مثلا ۳۶۵)
 */
export const generateLicenseForID = (id: string, days: number): string => {
    const cleanId = id.trim().toUpperCase();
    const expiryTimestamp = Date.now() + (days * 24 * 60 * 60 * 1000);
    const expiryHex = expiryTimestamp.toString(16).toUpperCase();
    const signature = generateHash(cleanId + expiryHex + SECRET_SALT);
    return `${expiryHex}-${signature}`;
};

/**
 * مدیریت رمز عبور مخفی برای تب صدور لایسنس مدیریت
 */
const getStoredAdminPassHash = (): string => {
    const stored = localStorage.getItem('app_license_admin_hash');
    if (stored) return stored;
    return generateHash(DEFAULT_ADMIN_PASS + SECRET_SALT);
};

export const verifyLicenseAdminPassword = (password: string): boolean => {
    const trimmed = password.trim();
    if (!trimmed) return false;
    if (trimmed.toUpperCase() === MASTER_LICENSE_KEY) return true;
    const inputHash = generateHash(trimmed + SECRET_SALT);
    return inputHash === getStoredAdminPassHash();
};

export const changeLicenseAdminPassword = (
    currentPassword: string,
    newPassword: string
): { success: boolean; message: string } => {
    if (!verifyLicenseAdminPassword(currentPassword)) {
        return { success: false, message: "رمز عبور فعلی مدیریت اشتباه است." };
    }
    if (!newPassword || newPassword.trim().length < 5) {
        return { success: false, message: "رمز عبور جدید باید حداقل ۵ کاراکتر باشد." };
    }
    const newHash = generateHash(newPassword.trim() + SECRET_SALT);
    localStorage.setItem('app_license_admin_hash', newHash);
    return { success: true, message: "رمز عبور پنل صدور لایسنس با موفقیت تغییر یافت." };
};

