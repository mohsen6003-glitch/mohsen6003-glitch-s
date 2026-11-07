
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
  // فیلدهای مربوط به تانکر بسته شده روی کامیون (ملکی شرکت یا صاحب تانکر)
  mountedTankerId?: string;                        // شناسه تانکر بسته شده روی این کامیون
  tankerCode?: string;                             // کد مخصوص تانکر (مثلاً T-101 یا K-12) برای جستجوی سریع
  isCompanyTanker?: boolean;                       // آیا تانکر متعلق به شرکت خودمان است؟
  tankOwnerId?: string;                            // شناسه صاحب تانکر (اگر تانکر متعلق به شخص دیگری است)
  tankOwnerName?: string;                          // نام صاحب تانکر
  // فیلدهای مربوط به صاحب کامیون (مالک کشنده)
  truckOwnerId?: string;                           // شناسه صاحب کامیون
  truckOwnerName?: string;                         // نام صاحب کامیون
  payFreightToTruckOwner?: boolean;                // آیا کرایه به حساب صاحب کامیون واریز می‌شود؟
  truckOwnerSharePercent?: number;                 // درصد سهم صاحب کامیون از کرایه (پیش‌فرض 100%)
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
  weightKg?: number; // وزن باسکول بارگیری به کیلوگرم
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
  declaredRate?: number; // نرخ اعلامی شرکت به واحد انتخابی
  scaleTicketNo?: string; // شماره قبض باسکول بارگیری
  coordinationType?: 'PHONE' | 'PROGRAM' | 'DIRECT'; // نحوه هماهنگی بار (تلفنی / برنامه‌ای / مستقیم)
  driverNameManual?: string; // نام راننده در ثبت تلفنی
  plateNumberManual?: string; // شماره پلاک در ثبت تلفنی
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
  companyId: string; // شرکت فرستنده بار (مبدأ)
  receiverId?: string; // تحویل‌گیرنده / گیرنده بار (مقصد)
  driverId?: string; // راننده حمل‌کننده از لیست رانندگان
  driverNameManual?: string; // نام راننده (در هماهنگی تلفنی / ثبت دستی)
  plateNumberManual?: string; // پلاک خودرو (در هماهنگی تلفنی / ثبت دستی)
  driverPhoneManual?: string; // تلفن راننده
  scaleTicketNo?: string; // شماره قبض باسکول بارگیری / بارنامه
  coordinationType?: 'PHONE' | 'PROGRAM' | 'DIRECT'; // نحوه هماهنگی: تلفنی تا ارسال باسکول، برنامه‌ای، مستقیم
  loadingStatus?: 'PENDING_SCALE' | 'LOADED'; // وضعیت: منتظر ارسال باسکول بارگیری یا بارگیری شده
  date: string; // تاریخ و زمان باسکول بارگیری
  volume: number; // وزن باسکول بارگیری (تن)
  weightKg?: number; // وزن باسکول بارگیری (کیلوگرم)
  price: number; // نرخ واحد پایه (تومان)
  declaredRate?: number; // نرخ اعلامی هر تن به ارز انتخابی
  declaredRateUSD?: number; // نرخ اعلامی دلاری ($) هر تن
  declaredRateAED?: number; // نرخ درهمی (AED) هر تن (بر اساس فرمول 3.67)
  rateCurrency?: 'TOMAN' | 'USD' | 'AED'; // واحد نرخ اعلامی
  exchangeRate?: number; // نرخ تبدیل دلار به تومان
  exchangeRateUSD_AED?: number; // نرخ تبدیل دلار به درهم (3.67)
  totalPrice: number; // مبلغ کل (تومان یا دلار)
  totalPriceForeign?: number; // مبلغ کل به ارز اعلامی (دلار یا درهم)
  totalPriceUSD?: number; // جمع مبلغ کل دلاری ($)
  totalPriceAED?: number; // جمع مبلغ کل درهمی (AED - بر اساس ضریب 3.67)
  freightRate?: number; // نرخ کرایه راننده (اختیاری)
  freightPrice?: number; // کل کرایه راننده (اختیاری)
  linkedTransactionId?: string; // شناسه تراکنش مرتبط در جدول ورود گاز
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
  openingBalanceType?: OpeningBalanceType; // بدهکاری به صراف یا بستانکاری از صراف (حساب تومانی/ریالی)
  openingBalanceToman?: number;            // مبلغ مانده حساب قبلی (تومان)
  openingBalanceAedType?: OpeningBalanceType; // وضعیت مانده قبلی درهمی مستقل (CREDIT_FROM_SARRAF: طلب درهمی از صراف | DEBT_TO_SARRAF: بدهی درهمی به صراف)
  openingBalanceAed?: number;              // مبلغ مانده حساب قبلی (درهم - AED)
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
  aedDeliveredAmount?: number; // مقدار درهم واقعی تحویل شده توسط صراف (برای محاسبه طلب یا بدهی درهمی ما نزد صراف)
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
  overpaidToman?: number;    // مبلغ اضافه واریزی ما در این حواله که به بستانکاری ریالی صراف منتقل می‌شود

  // ثبت به عنوان سند مانده حساب قبلی (بدهکاری / بستانکاری)
  isOpeningBalance?: boolean;
  openingBalanceType?: 'DEBT_TO_SARRAF' | 'CREDIT_FROM_SARRAF';
  openingBalanceCurrency?: 'TOMAN' | 'AED'; // تفکیک سند مانده قبلی تومانی یا درهمی مستقل
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

export type TankerContractType =
  | 'COMPANY_OWNED_NONE'    // تانکر ملکی شرکت خودمان (بدون کسر حق تانکر / اجاره)
  | 'PERCENTAGE_OF_FREIGHT' // درصدی از کرایه هر سرویس کامیون
  | 'PER_TON'               // مبلغ مشخص به ازای هر تن بار حمل شده
  | 'PER_TRIP'              // مبلغ مشخص به ازای هر سرویس / بارنامه
  | 'FIXED_RENT';           // اجاره ثابت ماهانه / توافقی

export type TankerMountStatus = 'MOUNTED' | 'STANDBY' | 'MAINTENANCE';

export type TankerOwnershipType = 'COMPANY_OWNED' | 'EXTERNAL_OWNER';

export interface TankerTransferRecord {
  id: string;
  date: string;
  actionType: 'MOUNT' | 'TRANSFER' | 'SWAP' | 'UNMOUNT';
  fromDriverId?: string;
  fromDriverName?: string;
  fromTruckPlate?: string;
  toDriverId?: string;
  toDriverName?: string;
  toTruckPlate?: string;
  swappedWithTankerId?: string;
  swappedWithTankerCode?: string;
  swappedWithTankNumber?: string;
  note?: string;
}

export interface TankerUnit {
  id: string;
  ownershipType?: TankerOwnershipType; // COMPANY_OWNED: متعلق به شرکت خودمان | EXTERNAL_OWNER: متعلق به صاحب تانکر دیگر
  isCompanyOwned?: boolean;         // آیا تانکر متعلق به شرکت خودمان است؟
  ownerId: string;                  // شناسه صاحب تانکر ('COMPANY' برای تانکرهای ملکی شرکت)
  ownerName: string;                // نام صاحب تانکر ('شرکت (ملکی)' یا نام مالک)
  tankerCode?: string;              // کد مخصوص تانکر (مثلاً T-101، K-05) برای پیدا کردن سریع تانکر
  tankNumber: string;               // شماره مخزن / شماره تانکر یا پلاک مخزن
  serialOrChassis?: string;         // شماره شاسی یا سریال مخزن
  capacityTons?: number;            // ظرفیت مخزن (تن) - مثلاً 22 یا 25 تن
  tankType?: string;                // نوع تانکر (۴ محور صادراتی، ۳ محور، دوجداره LPG و ...)
  status: TankerMountStatus;        // وضعیت: بسته شده روی کامیون، آزاد، در حال تعمیر
  assignedDriverId?: string;        // شناسه راننده / کامیونی که تانکر روی آن بسته شده است
  assignedDriverName?: string;      // نام راننده / صاحب کشنده
  assignedTruckPlate?: string;      // پلاک کامیون (کشنده) که تانکر روی آن بسته شده
  mountedDate?: string;             // تاریخ بسته شدن تانکر روی کامیون
  unmountedDate?: string;           // تاریخ باز شدن (در صورت فک)
  mountHistory?: TankerTransferRecord[]; // تاریخچه بستن، جابه‌جایی و تعویض تانکر بین کامیون‌ها
  contractType: TankerContractType; // مدل محاسبه حق تانکر / اجاره
  sharePercentage?: number;         // درصد سهم تانکر از کرایه کامیون (مثلاً 25%)
  ratePerTon?: number;              // نرخ حق تانکر به ازای هر تن
  ratePerTrip?: number;             // نرخ حق تانکر به ازای هر سرویس
  fixedMonthlyRent?: number;        // مبلغ اجاره ثابت ماهانه
  rateCurrency?: 'TOMAN' | 'USD' | 'AED'; // واحد نرخ (تومان، دلار، درهم)
  autoCalculateFromTruckLoads?: boolean; // آیا به صورت خودکار از روی بارهای کامیون متصل محاسبه شود؟
  deductFromDriverFreight?: boolean; // آیا سهم تانکر از کرایه راننده کسر شود یا جداگانه پرداخت شود؟
  hydroTestExpiry?: string;         // تاریخ اعتبار تست هیدرواستاتیک مخزن
  description?: string;             // توضیحات توافق
  createdAt: string;
}

export interface TankerOwner {
  id: string;
  fullName: string;
  nationalId?: string;
  phone: string;
  shebaNumber?: string;
  cardNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  previousBalanceType?: DriverPreviousBalanceType; // NONE | CREDITOR | DEBTOR
  previousBalanceAmount?: number;                  // مبلغ حساب قبلی (تومان)
  previousBalanceDate?: string;
  previousBalanceDescription?: string;
  description?: string;
  createdAt: string;
}

export type TankerLedgerEntryType =
  | 'PAYMENT_TO_OWNER'   // واریزی / پرداخت وجه به صاحب تانکر (بدهکار شدن صاحب تانکر / کسر از طلب)
  | 'MANUAL_EARNING'     // ثبت کارکرد / اجاره دوره‌ای یا حق تانکر دستی (بستانکار شدن صاحب تانکر)
  | 'TANKER_EXPENSE';    // هزینه تعمیرات، لاستیک، شیرآلات یا تست تانکر به حساب صاحب تانکر (کسر از طلب صاحب تانکر)

export interface TankerOwnerLedgerEntry {
  id: string;
  ownerId: string;
  tankerId?: string;          // تانکر مرتبط
  driverId?: string;          // کامیون مرتبط
  entryType: TankerLedgerEntryType;
  date: string;
  amount: number;             // مبلغ به تومان
  currency?: 'TOMAN' | 'USD' | 'AED';
  foreignAmount?: number;     // مبلغ ارزی (دلار یا درهم)
  exchangeRate?: number;      // نرخ تبدیل دلار به تومان
  exchangeRateUSD_AED?: number; // ضریب 3.67
  trackingCode?: string;      // کد رهگیری / فیش واریز
  cardNumber?: string;
  shebaNumber?: string;
  bankName?: string;
  description: string;
  createdAt: string;
}

export type TruckOwnerFreightMode =
  | 'FULL_TO_OWNER'         // کل کرایه کامیون (۱۰۰٪) به حساب صاحب کامیون منظور و واریز می‌شود
  | 'PERCENTAGE_OF_FREIGHT' // درصدی از کرایه هر سرویس برای صاحب کامیون (مثلاً ۸۰٪ صاحب کامیون، ۲۰٪ راننده)
  | 'PER_TON'               // مبلغ مشخص به ازای هر تن بار برای صاحب کامیون
  | 'MANUAL_ONLY';          // ثبت دستی کارکرد و برداشت‌ها

export interface TruckOwner {
  id: string;
  fullName: string;
  nationalId?: string;
  phone: string;
  shebaNumber?: string;
  cardNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  previousBalanceType?: DriverPreviousBalanceType; // NONE | CREDITOR | DEBTOR
  previousBalanceAmount?: number;                  // مبلغ حساب قبلی (تومان)
  previousBalanceDate?: string;
  previousBalanceDescription?: string;
  description?: string;
  createdAt: string;
}

export interface OwnedTruckUnit {
  id: string;
  ownerId: string;                  // شناسه صاحب کامیون
  ownerName: string;                // نام صاحب کامیون
  driverId?: string;                // شناسه راننده / کامیون در لیست رانندگان
  driverName: string;               // نام راننده کامیون
  plateNumber: string;              // شماره پلاک کامیون (کشنده)
  truckModel?: string;              // مدل کشنده (مثلاً ولوو FH500، اسکانیا، داف و ...)
  tankNumber?: string;              // شماره تانکر متصل
  freightMode: TruckOwnerFreightMode; // نحوه محاسبه و واریز کرایه
  ownerSharePercentage?: number;    // درصد سهم صاحب کامیون از کرایه (در حالت درصدی، یا 100 در حالت کامل)
  ratePerTon?: number;              // نرخ هر تن برای صاحب کامیون
  rateCurrency?: 'TOMAN' | 'USD' | 'AED';
  depositFreightToOwnerAccount: boolean; // آیا کرایه بارها به حساب بانکی صاحب کامیون واریز می‌شود؟
  syncBankInfoToDriver?: boolean;   // جایگزینی خودکار شماره کارت/شبای صاحب کامیون روی پروفایل راننده
  description?: string;
  createdAt: string;
}

export type TruckOwnerLedgerEntryType =
  | 'FREIGHT_DEPOSIT_TO_OWNER' // واریز کرایه به حساب صاحب کامیون
  | 'OWNER_WITHDRAWAL'         // برداشت وجه / مساعده توسط صاحب کامیون
  | 'TRUCK_EXPENSE_FOR_OWNER'  // هزینه کامیون (لاستیک، بیمه، تعمیرات، اقساط) به حساب صاحب کامیون
  | 'MANUAL_CREDIT';           // ثبت بستانکاری / کرایه توافقی دستی برای صاحب کامیون

export interface TruckOwnerLedgerEntry {
  id: string;
  ownerId: string;
  truckUnitId?: string;        // کامیون مرتبط
  driverId?: string;           // راننده کامیون مرتبط
  entryType: TruckOwnerLedgerEntryType;
  date: string;
  amount: number;              // مبلغ به تومان
  currency?: 'TOMAN' | 'USD' | 'AED';
  foreignAmount?: number;
  exchangeRate?: number;
  exchangeRateUSD_AED?: number;
  trackingCode?: string;       // شماره پیگیری / فیش واریز یا برداشت
  billOfLading?: string;       // شماره بارنامه مرتبط (اختیاری)
  cardNumber?: string;
  shebaNumber?: string;
  bankName?: string;
  alsoRecordInDriverPayments?: boolean; // آیا همزمان در پرداختی‌های کامیون/راننده هم ثبت شده است؟
  description: string;
  createdAt: string;
}

export type Tab = 'dashboard' | 'register' | 'queue' | 'entry' | 'drivers' | 'truck-owners' | 'tanker-owners' | 'driver-settlements' | 'driver-expenses' | 'reports' | 'companies' | 'receivers' | 'purchases' | 'partners' | 'expenses' | 'exchange' | 'ai-chat' | 'backup' | 'system-admin' | 'admin';

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
