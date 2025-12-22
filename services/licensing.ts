
/**
 * این سرویس وظیفه مدیریت لایسنس را بر عهده دارد.
 * فرمول تولید کد لایسنس: SHA256(SystemID + SecretSalt)
 */

const SECRET_SALT = "GAS_EXPORT_SECURE_2024"; // این رشته باید پیش شما مخفی بماند

// تابع کمکی برای تولید هش ساده (جایگزین SHA برای سرعت و سادگی در فرانت)
const generateHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).toUpperCase();
};

export const getSystemId = (): string => {
    let systemId = localStorage.getItem('app_system_id');
    if (!systemId) {
        // تولید یک شناسه تصادفی در اولین اجرا
        systemId = 'GAS-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
        localStorage.setItem('app_system_id', systemId);
    }
    return systemId;
};

export const validateLicense = (key: string): boolean => {
    if (!key) return false;
    const systemId = getSystemId();
    // کد صحیح باید هش شناسه سیستم + رشته مخفی ما باشد
    const expectedKey = generateHash(systemId + SECRET_SALT);
    return key.trim().toUpperCase() === expectedKey;
};

export const isAppLicensed = (): boolean => {
    const savedKey = localStorage.getItem('app_license_key');
    return validateLicense(savedKey || '');
};

export const saveLicenseKey = (key: string): boolean => {
    if (validateLicense(key)) {
        localStorage.setItem('app_license_key', key.toUpperCase());
        return true;
    }
    return false;
};

// این تابع فقط برای شما (توسعه‌دهنده) است تا برای مشتری کد بسازید
// می‌توانید در کنسول مرورگر از آن استفاده کنید: console.log(generateLicenseForID('ID-HERE'))
export const generateLicenseForID = (id: string): string => {
    return generateHash(id + SECRET_SALT);
};
