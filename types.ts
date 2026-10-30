
export type DriverPreviousBalanceType = 'NONE' | 'CREDITOR' | 'DEBTOR';

export interface Driver {
  id: string;
  fullName: string;
  nationalId: string;
  licenseNo: string;
  phone: string;
  plateNumber: string;
  tankNumber: string;
  shebaNumber?: string;
  cardNumber?: string;
  accountHolderName?: string;
  isAccountHolderDriver?: boolean;
  bankName?: string;
  // فیلدهای مربوط به حساب قبلی راننده (مانده از قبل)
  previousBalanceType?: DriverPreviousBalanceType; // CREDITOR: طلبکار از شرکت (طلب قبلی) | DEBTOR: بدهکار به شرکت (بدهی قبلی)
  previousBalanceAmount?: number;                  // مبلغ حساب قبلی (تومان)
  previousBalanceDate?: string;                    // تاریخ ثبت حساب قبلی
  previousBalanceDescription?: string;             // توضیحات حساب قبلی
  includePreviousBalanceInTotal?: boolean;         // آیا در تراز کل جاری راننده محاسبه شود؟ (پیش‌فرض: true)
}

export type SettlementStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type DriverDepositCategory = 
  | 'WAYBILL'                 // تسویه حساب بارنامه
  | 'PREVIOUS_ACCOUNT'        // حساب قبلی که واریز شده
  | 'ADVANCE_BEFORE_DELIVERY' // درخواست کرایه قبل از تحویل بار (پیش‌پرداخت)
  | 'ON_ACCOUNT';             // واریزی علی‌الحساب / سایر واریزی‌های جدا از بارنامه

export interface DriverSettlement {
  id: string;
  driverId?: string;
  driverName: string;
  plateNumber: string;
  cargoWeight: number; // وزن باری که بردن (تن) - برای واریزی‌های جدا از بارنامه می‌تواند ۰ باشد
  shebaNumber?: string; // شماره شبا بانکی
  cardNumber?: string;  // شماره کارت ۱۶ رقمی
  accountHolderName?: string; // نام صاحب کارت / حساب
  isAccountHolderDriver?: boolean; // آیا حساب به نام خود راننده است؟
  bankName?: string;   // نام بانک
  amount: number;      // مبلغ پرداختی (تومان)
  ratePerTon?: number; // نرخ هر تن (اختیاری)
  billOfLading?: string; // شماره بارنامه
  date: string;        // تاریخ
  status: SettlementStatus; // وضعیت پرداخت
  trackingCode?: string; // شماره پیگیری / ارجاع واریز
  description?: string; // توضیحات
  rateCurrency?: 'TOMAN' | 'USD' | 'AED'; // واحد نرخ انتخابی: تومان، دلار یا درهم
  ratePerTonUSD?: number; // نرخ دلاری به ازای هر تن
  ratePerTonAED?: number; // نرخ درهمی به ازای هر تن
  exchangeRateUSD?: number; // نرخ تبدیل دلار به تومان
  exchangeRateUSD_AED?: number; // نرخ تبدیل صرافی دلار به درهم (3.67)
  // فیلدهای مربوط به ثبت واریزی جدا از حساب بارنامه
  isStandaloneDeposit?: boolean; // آیا واریزی جدا از حساب بارنامه است؟
  paymentCategory?: DriverDepositCategory; // نوع واریزی (بارنامه، حساب قبلی، قبل از تحویل بار، علی‌الحساب)
  deductFromWaybillBalance?: boolean; // آیا از تراز حساب بارنامه‌های راننده کسر شود؟
  depositCurrency?: 'TOMAN' | 'USD' | 'AED'; // ارز مبنای واریزی مستقل
  depositForeignAmount?: number; // مبلغ ارزی واریزی مستقل (دلار یا درهم)
}

export interface Transaction {
  id: string;
  driverId: string;
  companyId?: string;
  receiverId?: string;
  date: string;
  volume: number;
  price: number; // فی گاز به تومان
  totalPrice: number; // مبلغ کل گاز به تومان
  freightPrice?: number; // کرایه کل راننده به تومان
  freightRate?: number; // نرخ کرایه به ازای هر تن
  freightCurrency?: 'TOMAN' | 'USD' | 'AED'; // واحد نرخ کرایه: تومان/ریال یا دلار یا درهم
  freightRateUSD?: number; // نرخ کرایه دلاری هر تن
  freightRateAED?: number; // نرخ کرایه درهمی هر تن
  exchangeRate?: number; // نرخ تبدیل دلار به تومان استفاده شده
  exchangeRateUSD_AED?: number; // نرخ تبدیل صرافی دلار به درهم (3.67)
  gasCurrency?: 'USD' | 'TOMAN' | 'AED'; // واحد قیمت گاز: دلار یا تومان یا درهم
  gasPriceUSD?: number; // نرخ دلاری گاز
  gasPriceAED?: number; // نرخ درهمی گاز
  description: string;
  billOfLading?: string;
}

export interface DriverPayment {
  id: string;
  driverId: string;
  date: string;
  amount: number;
  description: string;
  isStandaloneDeposit?: boolean; // آیا واریزی جدا از حساب بارنامه است؟
  paymentCategory?: DriverDepositCategory; // نوع واریزی (بارنامه، حساب قبلی، قبل از تحویل بار، علی‌الحساب)
  deductFromWaybillBalance?: boolean; // آیا از مانده حساب بارنامه‌ها کسر شود؟ (پیش‌فرض برای بارنامه و پیش‌پرداخت: true، برای حساب قبلی مجزا: false)
  trackingCode?: string;
  cardNumber?: string;
  shebaNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  settlementId?: string;
}

export interface Freight {
  id: string;
  driverId: string;
  date: string;
  amount: number;
  origin: string;
  destination: string;
  description: string;
  trackingCode?: string;
  volume?: number; // وزن بار به تن (صرفاً جهت محاسبه کرایه راننده)
  billOfLading?: string; // شماره بارنامه
  freightRate?: number; // نرخ کرایه به ازای هر تن
  freightCurrency?: 'TOMAN' | 'USD' | 'AED'; // واحد نرخ کرایه
  freightRateUSD?: number; // نرخ کرایه دلاری هر تن
  freightRateAED?: number; // نرخ کرایه درهمی هر تن
  exchangeRate?: number; // نرخ روز دلار به تومان
  exchangeRateUSD_AED?: number; // ضریب صرافی دلار به درهم (3.67)
}

export type QueueStatus = 'WAIT' | 'LOADING' | 'DONE' | 'CANCELLED';

export interface QueueItem {
  id: string;
  driverId: string;
  destination: string;
  entryTime: string;
  status: QueueStatus;
}

export interface Company {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Receiver {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Purchase {
  id: string;
  companyId: string;
  date: string;
  volume: number;
  price: number;
  totalPrice: number;
  description: string;
}

export interface Partner {
  id: string;
  fullName: string;
  phone: string;
  sharePercentage: number;
}

export interface PartnerPayment {
  id: string;
  partnerId: string;
  date: string;
  amount: number;
  description: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export type DriverExpenseCategory = 
  | 'FUEL' // سوخت و گازوئیل
  | 'OIL_CHANGE' // تعویض روغن و فیلتر
  | 'TIRES' // لاستیک و پنچرگیری
  | 'REPAIRS' // تعمیرات فنی و مکانیکی موتور و گیربکس
  | 'TOLL_TRANSIT' // عوارض آزادراه، پل، پایانه و ترانزیت
  | 'FINE' // جریمه راهنمایی و رانندگی
  | 'ALLOWANCE_FOOD' // مساعده راننده و هزینه راه و غذا
  | 'INSURANCE_INSPECTION' // بیمه، معاینه فنی و تست هیدرواستاتیک مخزن
  | 'PARKING_SCALE' // پارکینگ، توزین و باسکول
  | 'CAR_WASH' // کارواش و شستشوی تانکر
  | 'OTHER'; // سایر هزینه‌ها

export interface DriverVehicleExpense {
  id: string;
  driverId: string;
  driverName: string;
  plateNumber: string;
  category: DriverExpenseCategory;
  title: string;
  amount: number;
  date: string;
  paidBy: 'COMPANY' | 'DRIVER'; // پرداخت توسط شرکت یا راننده
  impactOnBalance: 'DEDUCT_FROM_DRIVER' | 'REIMBURSE_TO_DRIVER' | 'COMPANY_OVERHEAD';
  // DEDUCT_FROM_DRIVER: کسر از حساب راننده (بدهکار شدن راننده)
  // REIMBURSE_TO_DRIVER: بستانکار شدن راننده (استرداد وجه خرج‌شده توسط راننده)
  // COMPANY_OVERHEAD: هزینه ناوگان شرکت (بدون تغییر تراز راننده)
  invoiceNumber?: string;
  description?: string;
  createdAt: string;
}

export type OpeningBalanceType = 'NONE' | 'DEBT_TO_SARRAF' | 'CREDIT_FROM_SARRAF';

export interface Exchange {
  id: string;
  name: string;
  phone: string;
  address: string;
  openingBalanceType?: OpeningBalanceType; // بدهکاری به صراف یا بستانکاری از صراف
  openingBalanceToman?: number;            // مبلغ مانده حساب قبلی (تومان)
  openingBalanceAed?: number;              // مبلغ مانده حساب قبلی (درهم - اختیاری)
  openingBalanceRate?: number;             // نرخ درهم مانده قبلی
  openingBalanceDate?: string;             // تاریخ ثبت مانده قبلی
  openingBalanceDescription?: string;      // شرح مانده حساب قبلی
}

export interface Sender {
  id: string;
  name: string;
  phone: string;
}

export type TransactionStatus = 'pending' | 'completed' | 'debt';
export type CurrencyType = 'TOMAN' | 'AED';
export type DebtorType = 'sender' | 'exchange' | 'receiver';

export interface ExchangePaymentItem {
  id: string;
  accountHolderName: string; // نام صاحب حساب / کارت معرفی‌شده توسط صراف
  cardNumber?: string;       // شماره کارت ۱۶ رقمی ارسالی صراف
  shebaNumber?: string;      // شماره شبا ۲۴ رقمی (IR...) ارسالی صراف
  accountNumber?: string;    // شماره حساب بانکی
  bankName?: string;         // نام بانک
  allocatedAmountToman: number; // مبلغ تعیین‌شده برای واریز به این حساب (تومان)
  paidAmountToman: number;   // مبلغ واریزشده واقعی به این حساب (تومان)
  status: 'PENDING_PAYMENT' | 'PAID'; // منتظر واریز ما یا پرداخت‌شده
  paymentDate?: string;      // تاریخ و ساعت واریز
  trackingCode?: string;     // شماره پیگیری / فیش واریزی
  payerNote?: string;        // توضیحات واریز
}

export interface ExchangeTransaction {
  id: string;
  exchangeId: string;         
  senderId: string;           
  receiverId?: string;        
  amountToman: number;        
  aedRate: number;            
  usdRateAtTime?: number;     
  aedAmount: number;          
  actualDeliveredAmount: number; 
  aedDepositDate: string;     
  aedDeliveryDate: string;    
  receiverName: string;       
  accountHolder: string;      
  date: string;
  description: string;
  
  // Status & Debt Fields
  status: TransactionStatus;
  debtor?: DebtorType;       // چه کسی بدهکار است؟ (در صورت وضعیت debt)
  debtCurrency?: CurrencyType; // بدهی به چه ارزی است؟
  dueDate?: string;          // تاریخ سررسید

  // لیست حساب‌ها و کارت‌های بانکی معرفی‌شده توسط صراف جهت تسویه مبلغ حواله
  settlementPayments?: ExchangePaymentItem[];
  totalPaidToman?: number;
  remainingToman?: number;

  // ثبت به عنوان سند مانده حساب قبلی (بدهکاری / بستانکاری)
  isOpeningBalance?: boolean;
  openingBalanceType?: 'DEBT_TO_SARRAF' | 'CREDIT_FROM_SARRAF';
}

export interface ExchangeRates {
  usd: number;
  aed: number;
  usdAed?: number; // نرخ تبدیل صرافی دلار به درهم (پیش‌فرض 3.67)
}

export interface FiscalYearClosingSummary {
  closedAt: string;
  closedBy?: string;
  totalGasIncome: number;
  totalGasPurchaseCost: number;
  totalExpenses: number;
  totalFreights: number;
  netProfit: number;
  totalVolumeDelivered: number; // تناژ گاز تحویلی
  totalTransactionsCount: number;
  notes?: string;
}

export interface FiscalYear {
  id: string;
  title: string;          // مثلا: سال مالی ۱۴۰۳
  year: number;           // 1403
  startDate: string;      // 1403/01/01
  endDate: string;        // 1403/12/29
  status: 'active' | 'closed';
  closingSummary?: FiscalYearClosingSummary;
  createdAt: string;
  notes?: string;
}

export interface ResetSystemOptions {
  mode: 'operations_only' | 'full';
  createBackup: boolean;
  adminConfirmation: string;
}

export type Tab = 'dashboard' | 'register' | 'queue' | 'entry' | 'drivers' | 'driver-settlements' | 'driver-expenses' | 'reports' | 'companies' | 'receivers' | 'purchases' | 'partners' | 'expenses' | 'exchange' | 'ai-chat' | 'backup' | 'system-admin' | 'admin';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingMetadata?: GroundingMetadata;
  isLoading?: boolean;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            reviewText: string;
            authorAttribution?: {
                displayName: string;
            }
        }[]
    }
  };
}

export enum AIModelMode {
  CHAT_PRO = 'gemini-3-pro-preview',
  SEARCH_FLASH = 'gemini-2.5-flash-search',
  MAPS_FLASH = 'gemini-2.5-flash-maps',
}
