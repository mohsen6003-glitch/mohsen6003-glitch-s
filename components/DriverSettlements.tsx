import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { DriverSettlement, SettlementStatus, Driver, DriverDepositCategory } from '../types';
import { 
  CreditCard, Plus, Search, Filter, Download, Printer, Copy, CheckCircle2, 
  Clock, AlertCircle, Trash2, Edit3, X, Check, ArrowUpDown, Truck, 
  Scale, FileText, ChevronDown, RefreshCw, Hash, DollarSign, Building2,
  ExternalLink, Share2, Eye, UserCheck, UserX, User, AlertTriangle,
  BadgeCheck, ShieldCheck, Phone, Wallet, History, ArrowDownLeft
} from 'lucide-react';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DriverDebtBreakdownReport from './DriverDebtBreakdownReport';
import { formatNumberInput, cleanNumberInput } from '../utils/numberUtils';

// نقشه کدهای سه رقمی شبا به نام بانک‌های ایران
const IRAN_SHEBA_CODES: Record<string, string> = {
  '010': 'بانک مرکزی',
  '011': 'بانک صنعت و معدن',
  '012': 'بانک ملت',
  '013': 'بانک رفاه کارگران',
  '014': 'بانک مسکن',
  '015': 'بانک سپه',
  '016': 'بانک کشاورزی',
  '017': 'بانک ملی ایران',
  '018': 'بانک تجارت',
  '019': 'بانک صادرات ایران',
  '020': 'بانک توسعه صادرات',
  '021': 'پست بانک ایران',
  '022': 'بانک توسعه تعاون',
  '051': 'مؤسسه اعتباری ملل',
  '053': 'بانک کارآفرین',
  '054': 'بانک پارسیان',
  '055': 'بانک اقتصاد نوین',
  '056': 'بانک سامان',
  '057': 'بانک پاسارگاد',
  '058': 'بانک سرمایه',
  '059': 'بانک سینا',
  '060': 'بانک قرض‌الحسنه مهر ایران',
  '061': 'بانک شهر',
  '062': 'بانک آینده',
  '064': 'بانک گردشگری',
  '066': 'بانک دی',
  '069': 'بانک ایران زمین',
  '070': 'بانک قرض‌الحسنه رسالت',
  '078': 'بانک خاورمیانه'
};

// نقشه ۶ رقم اول کارت‌های بانکی ایران (BIN)
const IRAN_CARD_PREFIXES: Record<string, string> = {
  '603799': 'بانک ملی ایران',
  '589210': 'بانک سپه',
  '627648': 'بانک توسعه صادرات',
  '627961': 'بانک صنعت و معدن',
  '603770': 'بانک کشاورزی',
  '628023': 'بانک مسکن',
  '627760': 'پست بانک ایران',
  '502908': 'بانک توسعه تعاون',
  '627412': 'بانک اقتصاد نوین',
  '622106': 'بانک پارسیان',
  '502229': 'بانک پاسارگاد',
  '627488': 'بانک کارآفرین',
  '621986': 'بانک سامان',
  '639346': 'بانک سینا',
  '639607': 'بانک سرمایه',
  '636214': 'بانک آینده',
  '502806': 'بانک شهر',
  '502938': 'بانک دی',
  '603769': 'بانک صادرات ایران',
  '610433': 'بانک ملت',
  '627353': 'بانک تجارت',
  '589463': 'بانک رفاه کارگران',
  '627381': 'بانک انصار',
  '505785': 'بانک ایران زمین',
  '639599': 'بانک قوامین',
  '606373': 'بانک قرض‌الحسنه مهر ایران',
  '504172': 'بانک قرض‌الحسنه رسالت',
  '505801': 'مؤسسه اعتباری کوثر',
  '606256': 'مؤسسه اعتباری ملل',
  '639347': 'بانک پاسارگاد',
  '628157': 'مؤسسه اعتباری توسعه',
  '636795': 'بانک مرکزی',
  '636949': 'بانک حکمت ایرانیان',
  '505416': 'بانک گردشگری'
};

const detectBankFromSheba = (sheba?: string): string => {
  if (!sheba) return '';
  const clean = sheba.toUpperCase().replace(/\s+/g, '').replace(/^IR/, '');
  if (clean.length >= 5) {
    const bankCode = clean.substring(2, 5);
    return IRAN_SHEBA_CODES[bankCode] || '';
  }
  return '';
};

const detectBankFromCard = (cardNumber?: string): string => {
  if (!cardNumber) return '';
  const clean = cardNumber.replace(/[^0-9]/g, '');
  if (clean.length >= 6) {
    const bin = clean.substring(0, 6);
    return IRAN_CARD_PREFIXES[bin] || '';
  }
  return '';
};

// قالب‌بندی شماره کارت ۴ رقم ۴ رقم
const formatCardDisplay = (card?: string): string => {
  if (!card) return '';
  const clean = card.replace(/[^0-9]/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// تبدیل اعداد به حروف فارسی برای مبالغ مالی
const numberToPersianWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return 'صفر تومان';
  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertGroup(n: number): string {
    const parts: string[] = [];
    const c = Math.floor(n / 100);
    const remainder = n % 100;
    const b = Math.floor(remainder / 10);
    const a = remainder % 10;

    if (c > 0) parts.push(hundreds[c]);
    if (remainder >= 10 && remainder < 20) {
      parts.push(teens[remainder - 10]);
    } else {
      if (b > 0) parts.push(tens[b]);
      if (a > 0) parts.push(ones[a]);
    }
    return parts.join(' و ');
  }

  let temp = Math.floor(Math.abs(num));
  const groups: string[] = [];
  let scaleIndex = 0;

  while (temp > 0) {
    const group = temp % 1000;
    if (group > 0) {
      const groupWords = convertGroup(group);
      const scale = scales[scaleIndex];
      groups.unshift(scale ? `${groupWords} ${scale}` : groupWords);
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  return groups.length > 0 ? `${groups.join(' و ')} تومان` : 'صفر تومان';
};

export const getDepositCategoryConfig = (cat?: DriverDepositCategory, isStandalone?: boolean) => {
  if (!isStandalone && (!cat || cat === 'WAYBILL')) {
    return {
      label: 'تسویه حساب بارنامه',
      shortLabel: 'تسویه بارنامه',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      desc: 'مرتبط با بارنامه و وزن بار حمل‌شده'
    };
  }
  switch (cat) {
    case 'PREVIOUS_ACCOUNT':
      return {
        label: 'واریزی بابت حساب قبلی (جدا از بارنامه)',
        shortLabel: 'حساب قبلی واریزشده',
        badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        desc: 'تسویه و واریز مانده حساب قبلی راننده (جدا از بارنامه‌های جاری)'
      };
    case 'ADVANCE_BEFORE_DELIVERY':
      return {
        label: 'درخواست کرایه قبل از تحویل بار (پیش‌پرداخت)',
        shortLabel: 'کرایه قبل از تحویل بار',
        badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        desc: 'واریز پیش‌پرداخت کرایه به درخواست راننده قبل از رسیدن و تحویل بار'
      };
    case 'ON_ACCOUNT':
    default:
      return {
        label: 'واریزی علی‌الحساب (جدا از بارنامه)',
        shortLabel: 'واریزی علی‌الحساب',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        desc: 'واریزی نقدی و علی‌الحساب به راننده بدون ارتباط با بارنامه مشخص'
      };
  }
};

const DriverSettlements: React.FC = () => {
  const { 
    drivers, 
    transactions,
    freights,
    driverSettlements, 
    addDriverSettlement, 
    updateDriverSettlement, 
    deleteDriverSettlement,
    addDriverPayment,
    exchangeRates,
    updateExchangeRates
  } = useData();

  // Search, filter, sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SettlementStatus>('ALL');
  const [cardOwnershipFilter, setCardOwnershipFilter] = useState<'ALL' | 'DRIVER' | 'OTHER'>('ALL');
  const [depositTypeFilter, setDepositTypeFilter] = useState<'ALL' | 'WAYBILL' | 'STANDALONE' | 'PREVIOUS_ACCOUNT' | 'ADVANCE_BEFORE_DELIVERY'>('ALL');
  const [startDate, setStartDate] = useState<DateObject | null>(null);
  const [endDate, setEndDate] = useState<DateObject | null>(null);

  // Modal / Drawer state
  const [showModal, setShowModal] = useState(false);
  const [showDebtBreakdownModal, setShowDebtBreakdownModal] = useState(false);
  const [editItem, setEditItem] = useState<DriverSettlement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [showPayaModal, setShowPayaModal] = useState(false);
  const [printItem, setPrintItem] = useState<DriverSettlement | null>(null);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [driverPickerSearch, setDriverPickerSearch] = useState('');
  const [showBillPicker, setShowBillPicker] = useState(false);
  const [billPickerSearch, setBillPickerSearch] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [dailyRateSavedToast, setDailyRateSavedToast] = useState(false);

  // Form State
  const [formIsStandaloneDeposit, setFormIsStandaloneDeposit] = useState<boolean>(false);
  const [formPaymentCategory, setFormPaymentCategory] = useState<DriverDepositCategory>('WAYBILL');
  const [formDeductFromWaybillBalance, setFormDeductFromWaybillBalance] = useState<boolean>(true);
  const [formDepositCurrency, setFormDepositCurrency] = useState<'TOMAN' | 'USD' | 'AED'>('TOMAN');
  const [formDepositForeignAmount, setFormDepositForeignAmount] = useState<string>('');

  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formPlateNumber, setFormPlateNumber] = useState('');
  const [formCargoWeight, setFormCargoWeight] = useState('');
  const [formShebaNumber, setFormShebaNumber] = useState('');
  const [formCardNumber, setFormCardNumber] = useState('');
  const [formIsAccountHolderDriver, setFormIsAccountHolderDriver] = useState<boolean>(true);
  const [formAccountHolderName, setFormAccountHolderName] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formRatePerTon, setFormRatePerTon] = useState('');
  const [formRateCurrency, setFormRateCurrency] = useState<'TOMAN' | 'USD' | 'AED'>('TOMAN');
  const [formExchangeRateUSD, setFormExchangeRateUSD] = useState('');
  const [formUsdAedRate, setFormUsdAedRate] = useState('3.67');
  const [formBillOfLading, setFormBillOfLading] = useState('');
  const [formDate, setFormDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [formStatus, setFormStatus] = useState<SettlementStatus>('PENDING');
  const [formTrackingCode, setFormTrackingCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [syncWithDriverLedger, setSyncWithDriverLedger] = useState(true);

  // Print voucher ref
  const printRef = useRef<HTMLDivElement>(null);

  // PDF Export states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportingId, setPdfExportingId] = useState<string | null>(null);
  const [pdfTargetItem, setPdfTargetItem] = useState<DriverSettlement | null>(null);
  const offscreenReceiptRef = useRef<HTMLDivElement>(null);

  // Open modal for new item (either waybill settlement or standalone deposit)
  const handleOpenNew = (standalone: boolean = false, category: DriverDepositCategory = 'PREVIOUS_ACCOUNT') => {
    setEditItem(null);
    setFormIsStandaloneDeposit(standalone);
    setFormPaymentCategory(standalone ? category : 'WAYBILL');
    setFormDeductFromWaybillBalance(standalone ? (category === 'PREVIOUS_ACCOUNT' ? false : true) : true);
    setFormDepositCurrency('TOMAN');
    setFormDepositForeignAmount('');
    setSelectedDriverId('');
    setSelectedTransactionId('');
    setFormDriverName('');
    setFormPlateNumber('');
    setFormCargoWeight('');
    setFormShebaNumber('');
    setFormCardNumber('');
    setFormIsAccountHolderDriver(true);
    setFormAccountHolderName('');
    setFormBankName('');
    setFormAmount('');
    setFormRatePerTon('');
    setFormRateCurrency('TOMAN');
    setFormExchangeRateUSD(exchangeRates.usd ? exchangeRates.usd.toString() : '60000');
    setFormUsdAedRate(exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67');
    setFormBillOfLading('');
    setFormDate(new DateObject({ calendar: persian, locale: persian_fa }));
    setFormStatus(standalone ? 'PAID' : 'PENDING');
    setFormTrackingCode('');
    setFormDescription(
      standalone
        ? category === 'PREVIOUS_ACCOUNT'
          ? 'واریزی بابت تسویه حساب قبلی (جدا از بارنامه)'
          : category === 'ADVANCE_BEFORE_DELIVERY'
          ? 'درخواست کرایه قبل از تحویل بار (پیش‌پرداخت کرایه)'
          : 'واریزی علی‌الحساب به حساب راننده (جدا از بارنامه)'
        : ''
    );
    setSyncWithDriverLedger(true);
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: DriverSettlement) => {
    setEditItem(item);
    const isStandalone = Boolean(item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL'));
    setFormIsStandaloneDeposit(isStandalone);
    setFormPaymentCategory(item.paymentCategory || (isStandalone ? 'PREVIOUS_ACCOUNT' : 'WAYBILL'));
    setFormDeductFromWaybillBalance(item.deductFromWaybillBalance ?? (item.paymentCategory === 'PREVIOUS_ACCOUNT' ? false : true));
    setFormDepositCurrency(item.depositCurrency || 'TOMAN');
    setFormDepositForeignAmount(item.depositForeignAmount ? item.depositForeignAmount.toString() : '');

    setSelectedDriverId(item.driverId || '');
    setFormDriverName(item.driverName);
    setFormPlateNumber(item.plateNumber);
    setFormCargoWeight(item.cargoWeight ? item.cargoWeight.toString() : '');
    setFormShebaNumber(item.shebaNumber || '');
    setFormCardNumber(item.cardNumber || '');
    const isDriverOwner = item.isAccountHolderDriver ?? true;
    setFormIsAccountHolderDriver(isDriverOwner);
    setFormAccountHolderName(item.accountHolderName || '');
    setFormBankName(item.bankName || '');
    setFormAmount(item.amount ? item.amount.toString() : '');
    setFormRateCurrency(item.rateCurrency || 'TOMAN');
    setFormExchangeRateUSD(item.exchangeRateUSD ? item.exchangeRateUSD.toString() : (exchangeRates.usd ? exchangeRates.usd.toString() : '60000'));
    setFormUsdAedRate(item.exchangeRateUSD_AED ? item.exchangeRateUSD_AED.toString() : '3.67');
    
    if (item.rateCurrency === 'USD' && item.ratePerTonUSD) {
      setFormRatePerTon(item.ratePerTonUSD.toString());
    } else if (item.rateCurrency === 'AED' && item.ratePerTonAED) {
      setFormRatePerTon(item.ratePerTonAED.toString());
    } else {
      setFormRatePerTon(item.ratePerTon ? item.ratePerTon.toString() : '');
    }

    setFormBillOfLading(item.billOfLading || '');
    setFormStatus(item.status);
    setFormTrackingCode(item.trackingCode || '');
    setFormDescription(item.description || '');
    setSyncWithDriverLedger(false);

    try {
      if (item.date) {
        setFormDate(new DateObject({ date: item.date, format: "YYYY/MM/DD", calendar: persian, locale: persian_fa }));
      }
    } catch {
      setFormDate(new DateObject({ calendar: persian, locale: persian_fa }));
    }

    setShowModal(true);
  };

  // Auto-calculate amount if ratePerTon & weight are entered
  const handleRateOrWeightChange = (
    weightVal: string, 
    rateVal: string, 
    currency: 'TOMAN' | 'USD' | 'AED' = formRateCurrency,
    exRateVal: string = formExchangeRateUSD,
    usdAedVal: string = formUsdAedRate
  ) => {
    const weight = parseFloat(weightVal) || 0;
    const rate = parseFloat(rateVal) || 0;
    const exRate = parseFloat(exRateVal) || exchangeRates.usd || 60000;
    const usdAed = parseFloat(usdAedVal) || 3.67;
    if (weight > 0 && rate > 0) {
      if (currency === 'USD') {
        const totalUsd = weight * rate;
        const totalToman = Math.round(totalUsd * exRate);
        setFormAmount(totalToman.toString());
      } else if (currency === 'AED') {
        const totalUsd = usdAed > 0 ? (weight * rate) / usdAed : 0;
        const totalToman = Math.round(totalUsd * exRate);
        setFormAmount(totalToman.toString());
      } else {
        setFormAmount(Math.round(weight * rate).toString());
      }
    }
  };

  // When selecting existing registered driver
  const handleDriverSelect = (driverId: string) => {
    setSelectedDriverId(driverId);
    setSelectedTransactionId('');
    if (!driverId) return;

    const d = drivers.find(drv => drv.id === driverId);
    if (d) {
      setFormDriverName(d.fullName);
      setFormPlateNumber(d.plateNumber || '');
      
      if (d.shebaNumber) {
        setFormShebaNumber(d.shebaNumber);
      }
      if (d.cardNumber) {
        setFormCardNumber(formatCardDisplay(d.cardNumber));
      }

      // Bank detection
      const bank = d.bankName || detectBankFromCard(d.cardNumber) || detectBankFromSheba(d.shebaNumber);
      if (bank) {
        setFormBankName(bank);
      }

      // Ownership of card / account
      if (d.isAccountHolderDriver !== undefined) {
        setFormIsAccountHolderDriver(d.isAccountHolderDriver);
        setFormAccountHolderName(d.accountHolderName || (d.isAccountHolderDriver ? d.fullName : ''));
      } else {
        setFormIsAccountHolderDriver(true);
        setFormAccountHolderName(d.fullName);
      }

      // Only auto-fill from last waybill if we are NOT in standalone deposit mode
      if (!formIsStandaloneDeposit) {
        const driverItems = [
          ...transactions.filter(t => t.driverId === driverId),
          ...freights.filter(f => f.driverId === driverId)
        ].sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
        const lastTrans: any = driverItems.slice(-1)[0];
        if (lastTrans) {
          setSelectedTransactionId(lastTrans.id);
          const wStr = lastTrans.volume ? lastTrans.volume.toString() : '';
          if (wStr) setFormCargoWeight(wStr);
          const bolVal = lastTrans.billOfLading || lastTrans.trackingCode;
          if (bolVal) {
            setFormBillOfLading(bolVal);
          }
          const currentDailyUsd = formExchangeRateUSD || (exchangeRates.usd ? exchangeRates.usd.toString() : '60000');
          const currentUsdAed = formUsdAedRate || '3.67';
          const fPrice = lastTrans.freightPrice || lastTrans.amount;
          if (lastTrans.freightCurrency === 'USD' && (lastTrans.freightRateUSD || lastTrans.freightRate)) {
            const r = (lastTrans.freightRateUSD || lastTrans.freightRate || 0).toString();
            setFormRateCurrency('USD');
            setFormRatePerTon(r);
            handleRateOrWeightChange(wStr, r, 'USD', currentDailyUsd, currentUsdAed);
          } else if (lastTrans.freightCurrency === 'AED' && (lastTrans.freightRateAED || lastTrans.freightRate)) {
            const r = (lastTrans.freightRateAED || lastTrans.freightRate || 0).toString();
            setFormRateCurrency('AED');
            setFormRatePerTon(r);
            handleRateOrWeightChange(wStr, r, 'AED', currentDailyUsd, currentUsdAed);
          } else if (lastTrans.freightRate && lastTrans.freightRate > 0) {
            const r = lastTrans.freightRate.toString();
            setFormRateCurrency('TOMAN');
            setFormRatePerTon(r);
            handleRateOrWeightChange(wStr, r, 'TOMAN', currentDailyUsd, currentUsdAed);
          } else if (fPrice && fPrice > 0) {
            setFormAmount(fPrice.toString());
          }
        }
      }
    }
  };

  // Recalculate standalone deposit Toman amount when foreign currency (USD / AED) is entered
  const handleStandaloneForeignChange = (
    foreignVal: string,
    currency: 'TOMAN' | 'USD' | 'AED' = formDepositCurrency,
    exRateVal: string = formExchangeRateUSD,
    usdAedVal: string = formUsdAedRate
  ) => {
    const fNum = parseFloat(foreignVal) || 0;
    const exRate = parseFloat(exRateVal) || exchangeRates.usd || 60000;
    const usdAed = parseFloat(usdAedVal) || 3.67;
    if (fNum > 0) {
      if (currency === 'USD') {
        setFormAmount(Math.round(fNum * exRate).toString());
      } else if (currency === 'AED') {
        const usdEq = usdAed > 0 ? fNum / usdAed : 0;
        setFormAmount(Math.round(usdEq * exRate).toString());
      }
    }
  };

  // When selecting a registered Bill of Lading (Transaction or Freight)
  const handleBillOfLadingSelect = (txId: string) => {
    setSelectedTransactionId(txId);
    if (!txId) return;

    const tx: any = transactions.find(t => t.id === txId) || freights.find(f => f.id === txId);
    if (!tx) return;

    if (tx.driverId) {
      setSelectedDriverId(tx.driverId);
      const d = drivers.find(drv => drv.id === tx.driverId);
      if (d) {
        setFormDriverName(d.fullName);
        setFormPlateNumber(d.plateNumber || '');
        if (d.shebaNumber) setFormShebaNumber(d.shebaNumber);
        if (d.cardNumber) setFormCardNumber(formatCardDisplay(d.cardNumber));
        const bank = d.bankName || detectBankFromCard(d.cardNumber) || detectBankFromSheba(d.shebaNumber);
        if (bank) setFormBankName(bank);
        if (d.isAccountHolderDriver !== undefined) {
          setFormIsAccountHolderDriver(d.isAccountHolderDriver);
          setFormAccountHolderName(d.accountHolderName || (d.isAccountHolderDriver ? d.fullName : ''));
        } else {
          setFormIsAccountHolderDriver(true);
          setFormAccountHolderName(d.fullName);
        }
      }
    }

    const weightStr = tx.volume ? tx.volume.toString() : '';
    setFormCargoWeight(weightStr);
    const bolStr = tx.billOfLading || tx.trackingCode || `BL-${tx.id.slice(-5).toUpperCase()}`;
    setFormBillOfLading(bolStr);

    const currentDailyUsd = formExchangeRateUSD || (exchangeRates.usd ? exchangeRates.usd.toString() : '60000');
    const currentUsdAed = formUsdAedRate || '3.67';
    const fPrice = tx.freightPrice || tx.amount;

    if (tx.freightCurrency === 'USD' && (tx.freightRateUSD || tx.freightRate)) {
      const r = (tx.freightRateUSD || tx.freightRate || 0).toString();
      setFormRateCurrency('USD');
      setFormRatePerTon(r);
      handleRateOrWeightChange(weightStr, r, 'USD', currentDailyUsd, currentUsdAed);
    } else if (tx.freightCurrency === 'AED' && (tx.freightRateAED || tx.freightRate)) {
      const r = (tx.freightRateAED || tx.freightRate || 0).toString();
      setFormRateCurrency('AED');
      setFormRatePerTon(r);
      handleRateOrWeightChange(weightStr, r, 'AED', currentDailyUsd, currentUsdAed);
    } else if (tx.freightRate && tx.freightRate > 0) {
      const r = tx.freightRate.toString();
      setFormRateCurrency('TOMAN');
      setFormRatePerTon(r);
      handleRateOrWeightChange(weightStr, r, 'TOMAN', currentDailyUsd, currentUsdAed);
    } else if (fPrice && tx.volume > 0) {
      const r = Math.round(fPrice / tx.volume).toString();
      setFormRateCurrency('TOMAN');
      setFormRatePerTon(r);
      setFormAmount(fPrice.toString());
    } else if (fPrice && fPrice > 0) {
      setFormAmount(fPrice.toString());
    }
  };

  // Save current daily rate to system global exchangeRates
  const handleSaveSystemDailyRate = () => {
    const usdVal = parseFloat(formExchangeRateUSD) || exchangeRates.usd || 60000;
    const usdAedVal = parseFloat(formUsdAedRate) || 3.67;
    const aedVal = usdAedVal > 0 ? Math.round(usdVal / usdAedVal) : exchangeRates.aed;
    updateExchangeRates({
      usd: usdVal,
      aed: aedVal,
      usdAed: usdAedVal
    });
    setDailyRateSavedToast(true);
    setTimeout(() => setDailyRateSavedToast(false), 2500);
  };

  // Handle Card formatting and bank auto-detection
  const handleCardChange = (val: string) => {
    const formatted = formatCardDisplay(val);
    setFormCardNumber(formatted);
    const bank = detectBankFromCard(formatted);
    if (bank && !formBankName) {
      setFormBankName(bank);
    }
  };

  // Handle Sheba formatting and bank auto-detection
  const handleShebaChange = (val: string) => {
    let clean = val.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!clean.startsWith('IR') && clean.length > 0) {
      if (/^\d+$/.test(clean)) {
        clean = 'IR' + clean;
      }
    }
    if (clean.length > 26) clean = clean.substring(0, 26);
    setFormShebaNumber(clean);

    const bank = detectBankFromSheba(clean);
    if (bank && !formBankName) {
      setFormBankName(bank);
    }
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDriverName.trim()) {
      alert("لطفاً نام راننده را وارد کنید.");
      return;
    }
    if (!formPlateNumber.trim()) {
      alert("لطفاً شماره پلاک ماشین را وارد کنید.");
      return;
    }
    const weightNum = formIsStandaloneDeposit ? (parseFloat(formCargoWeight) || 0) : (parseFloat(formCargoWeight) || 0);
    if (!formIsStandaloneDeposit && weightNum <= 0) {
      alert("لطفاً وزن بار حمل شده را وارد کنید، یا در صورتی که واریزی مربوط به بارنامه نیست، از بالای فرم گزینه «ثبت واریزی جدا از بارنامه» را انتخاب نمایید.");
      return;
    }
    const amountNum = parseFloat(formAmount) || 0;
    if (amountNum <= 0) {
      alert("لطفاً مبلغ واریزی / پرداختی را وارد کنید.");
      return;
    }

    const dateStr = formDate ? formDate.format("YYYY/MM/DD") : new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD");
    const autoBank = formBankName.trim() || detectBankFromCard(formCardNumber) || detectBankFromSheba(formShebaNumber) || 'بانک';
    const finalHolderName = formIsAccountHolderDriver 
      ? formDriverName.trim() 
      : (formAccountHolderName.trim() || 'شخص دیگر');

    const cleanCard = formCardNumber.replace(/[^0-9]/g, '');
    const exRateVal = parseFloat(formExchangeRateUSD) || exchangeRates.usd || 60000;
    const usdAedVal = parseFloat(formUsdAedRate) || 3.67;
    const rateNum = !formIsStandaloneDeposit ? (parseFloat(formRatePerTon) || undefined) : undefined;
    
    let rateUSD: number | undefined = undefined;
    let rateAED: number | undefined = undefined;
    let rateToman: number | undefined = undefined;

    if (rateNum) {
      if (formRateCurrency === 'USD') {
        rateUSD = rateNum;
        rateAED = parseFloat((rateNum * usdAedVal).toFixed(2));
        rateToman = Math.round(rateNum * exRateVal);
      } else if (formRateCurrency === 'AED') {
        rateAED = rateNum;
        rateUSD = usdAedVal > 0 ? parseFloat((rateNum / usdAedVal).toFixed(2)) : 0;
        rateToman = Math.round(rateUSD * exRateVal);
      } else {
        rateToman = rateNum;
        rateUSD = exRateVal > 0 ? parseFloat((rateNum / exRateVal).toFixed(2)) : 0;
        rateAED = parseFloat((rateUSD * usdAedVal).toFixed(2));
      }
    }

    const finalCategory: DriverDepositCategory = formIsStandaloneDeposit
      ? (formPaymentCategory === 'WAYBILL' ? 'PREVIOUS_ACCOUNT' : formPaymentCategory)
      : 'WAYBILL';
    const catConfig = getDepositCategoryConfig(finalCategory, formIsStandaloneDeposit);
    const foreignAmtNum = formIsStandaloneDeposit && formDepositCurrency !== 'TOMAN'
      ? (parseFloat(formDepositForeignAmount) || undefined)
      : undefined;

    if (editItem) {
      updateDriverSettlement(editItem.id, {
        driverId: selectedDriverId || undefined,
        driverName: formDriverName.trim(),
        plateNumber: formPlateNumber.trim(),
        cargoWeight: weightNum,
        shebaNumber: formShebaNumber.trim().toUpperCase(),
        cardNumber: cleanCard || undefined,
        isAccountHolderDriver: formIsAccountHolderDriver,
        accountHolderName: finalHolderName,
        bankName: autoBank,
        amount: amountNum,
        ratePerTon: rateToman,
        rateCurrency: formRateCurrency,
        ratePerTonUSD: rateUSD,
        ratePerTonAED: rateAED,
        exchangeRateUSD: exRateVal,
        exchangeRateUSD_AED: usdAedVal,
        billOfLading: formIsStandaloneDeposit ? (formBillOfLading.trim() || undefined) : (formBillOfLading.trim() || undefined),
        date: dateStr,
        status: formStatus,
        trackingCode: formTrackingCode.trim() || undefined,
        description: formDescription.trim() || (formIsStandaloneDeposit ? catConfig.label : undefined),
        isStandaloneDeposit: formIsStandaloneDeposit,
        paymentCategory: finalCategory,
        deductFromWaybillBalance: formIsStandaloneDeposit ? formDeductFromWaybillBalance : true,
        depositCurrency: formIsStandaloneDeposit ? formDepositCurrency : undefined,
        depositForeignAmount: foreignAmtNum,
      });
    } else {
      addDriverSettlement({
        driverId: selectedDriverId || undefined,
        driverName: formDriverName.trim(),
        plateNumber: formPlateNumber.trim(),
        cargoWeight: weightNum,
        shebaNumber: formShebaNumber.trim().toUpperCase(),
        cardNumber: cleanCard || undefined,
        isAccountHolderDriver: formIsAccountHolderDriver,
        accountHolderName: finalHolderName,
        bankName: autoBank,
        amount: amountNum,
        ratePerTon: rateToman,
        rateCurrency: formRateCurrency,
        ratePerTonUSD: rateUSD,
        ratePerTonAED: rateAED,
        exchangeRateUSD: exRateVal,
        exchangeRateUSD_AED: usdAedVal,
        billOfLading: formBillOfLading.trim() || undefined,
        date: dateStr,
        status: formStatus,
        trackingCode: formTrackingCode.trim() || undefined,
        description: formDescription.trim() || (formIsStandaloneDeposit ? catConfig.label : undefined),
        isStandaloneDeposit: formIsStandaloneDeposit,
        paymentCategory: finalCategory,
        deductFromWaybillBalance: formIsStandaloneDeposit ? formDeductFromWaybillBalance : true,
        depositCurrency: formIsStandaloneDeposit ? formDepositCurrency : undefined,
        depositForeignAmount: foreignAmtNum,
      });

      // If requested, also record in driver ledger
      if (syncWithDriverLedger && selectedDriverId && formStatus === 'PAID') {
        const ledgerDesc = formIsStandaloneDeposit
          ? `[${catConfig.shortLabel}] ${formDescription.trim() || catConfig.label}${foreignAmtNum ? ` (${foreignAmtNum.toLocaleString()} ${formDepositCurrency} به نرخ ${exRateVal.toLocaleString()})` : ''} - ${formShebaNumber ? `شبا: ${formShebaNumber}` : ''} ${cleanCard ? `کارت: ${cleanCard}` : ''} (${formIsAccountHolderDriver ? 'به نام راننده' : `به نام ${finalHolderName}`})`
          : `تسویه بارنامه ${formBillOfLading || 'دستی'} - وزن: ${weightNum} تن - ${formShebaNumber ? `شبا: ${formShebaNumber}` : ''} ${cleanCard ? `کارت: ${cleanCard}` : ''} (${formIsAccountHolderDriver ? 'به نام راننده' : `به نام ${finalHolderName}`})`;

        addDriverPayment({
          driverId: selectedDriverId,
          date: dateStr,
          amount: amountNum,
          description: ledgerDesc,
          isStandaloneDeposit: formIsStandaloneDeposit,
          paymentCategory: finalCategory,
          deductFromWaybillBalance: formIsStandaloneDeposit ? formDeductFromWaybillBalance : true,
          trackingCode: formTrackingCode.trim() || undefined,
          cardNumber: cleanCard || undefined,
          shebaNumber: formShebaNumber.trim().toUpperCase() || undefined,
          accountHolderName: finalHolderName,
          bankName: autoBank
        });
      }
    }

    setShowModal(false);
  };

  // Quick Status Toggle
  const handleToggleStatus = (item: DriverSettlement) => {
    const nextStatus: Record<SettlementStatus, SettlementStatus> = {
      'PENDING': 'PAID',
      'PAID': 'PENDING',
      'CANCELLED': 'PENDING'
    };
    updateDriverSettlement(item.id, { status: nextStatus[item.status] });
  };

  // Copy to clipboard
  const handleCopySheba = (sheba: string, id: string) => {
    if (!sheba) return;
    navigator.clipboard.writeText(sheba);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCard = (card: string, id: string) => {
    if (!card) return;
    const clean = card.replace(/[^0-9]/g, '');
    navigator.clipboard.writeText(clean);
    setCopiedCardId(id);
    setTimeout(() => setCopiedCardId(null), 2000);
  };

  // Copy full payment message for banking / messenger
  const handleCopyBankingText = (item: DriverSettlement) => {
    const holderInfo = item.isAccountHolderDriver !== false
      ? `به نام خود راننده (${item.driverName})`
      : `به نام: ${item.accountHolderName || 'شخص دیگر (غیر)'}`;
    const isStandalone = Boolean(item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL'));
    const catCfg = getDepositCategoryConfig(item.paymentCategory, isStandalone);

    const text = `${isStandalone ? `سند واریزی راننده (${catCfg.shortLabel})` : 'پرداخت کرایه حمل بار'}
راننده: ${item.driverName}
پلاک خودرو: ${item.plateNumber}
${isStandalone ? `نوع واریزی: ${catCfg.label}` : `وزن بار: ${item.cargoWeight} تن`}
مبلغ واریزی: ${item.amount.toLocaleString()} تومان (${numberToPersianWords(item.amount)})
${item.cardNumber ? `شماره کارت: ${formatCardDisplay(item.cardNumber)}` : ''}
${item.shebaNumber ? `شماره شبا: ${item.shebaNumber}` : ''}
بانک: ${item.bankName || 'بانک'}
صاحب کارت/حساب اعلامی: ${holderInfo}
تاریخ: ${item.date}
${item.billOfLading ? `شماره بارنامه/مرجع: ${item.billOfLading}` : ''}
${item.description ? `توضیحات: ${item.description}` : ''}`;

    navigator.clipboard.writeText(text);
    alert("اطلاعات پرداخت و شماره کارت راننده برای انتقال بانکی کپی شد.");
  };

  // Filtered drivers for Quick Driver Picker
  const pickerFilteredDrivers = useMemo(() => {
    if (!driverPickerSearch.trim()) return drivers;
    const q = driverPickerSearch.toLowerCase();
    return drivers.filter(d => 
      (d.fullName || '').toLowerCase().includes(q) ||
      (d.plateNumber || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.cardNumber || '').includes(q) ||
      (d.shebaNumber || '').toLowerCase().includes(q)
    );
  }, [drivers, driverPickerSearch]);

  // Available Bills of Lading (Transactions + Driver Freights) filtered by selected driver (newest first)
  const availableBillsOfLading = useMemo(() => {
    const combined = [
      ...transactions,
      ...freights.map(f => ({
        ...f,
        volume: f.volume || 0,
        billOfLading: f.billOfLading || f.trackingCode,
        freightPrice: f.amount
      }))
    ].sort((a, b) => parseInt(b.id || '0') - parseInt(a.id || '0'));
    return selectedDriverId
      ? combined.filter(t => t.driverId === selectedDriverId)
      : combined;
  }, [transactions, freights, selectedDriverId]);

  // Filtered Bills of Lading for the modal picker
  const pickerFilteredBills = useMemo(() => {
    const base = [
      ...transactions,
      ...freights.map(f => ({
        ...f,
        volume: f.volume || 0,
        billOfLading: f.billOfLading || f.trackingCode,
        freightPrice: f.amount
      }))
    ].sort((a, b) => parseInt(b.id || '0') - parseInt(a.id || '0'));
    if (!billPickerSearch.trim()) return base;
    const q = billPickerSearch.toLowerCase();
    return base.filter(t => {
      const drv = drivers.find(d => d.id === t.driverId);
      const drvName = (drv?.fullName || '').toLowerCase();
      const drvPlate = (drv?.plateNumber || '').toLowerCase();
      const bol = (t.billOfLading || '').toLowerCase();
      const dt = (t.date || '').toLowerCase();
      return bol.includes(q) || drvName.includes(q) || drvPlate.includes(q) || dt.includes(q);
    });
  }, [transactions, freights, drivers, billPickerSearch]);

  // Filtered and Sorted list
  const filteredList = useMemo(() => {
    return driverSettlements.filter(item => {
      // Search
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        (item.driverName || '').toLowerCase().includes(term) ||
        (item.plateNumber || '').toLowerCase().includes(term) ||
        (item.shebaNumber || '').toLowerCase().includes(term) ||
        (item.cardNumber || '').includes(term) ||
        (item.accountHolderName || '').toLowerCase().includes(term) ||
        (item.bankName || '').toLowerCase().includes(term) ||
        (item.billOfLading || '').toLowerCase().includes(term) ||
        (item.trackingCode || '').toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term);

      // Status
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      // Ownership filter (driver vs other)
      let matchOwnership = true;
      if (cardOwnershipFilter === 'DRIVER') {
        matchOwnership = item.isAccountHolderDriver !== false;
      } else if (cardOwnershipFilter === 'OTHER') {
        matchOwnership = item.isAccountHolderDriver === false;
      }

      // Deposit Type Filter (Waybill vs Standalone / Previous Account / Advance)
      const isStandalone = Boolean(item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL'));
      let matchDepositType = true;
      if (depositTypeFilter === 'WAYBILL') {
        matchDepositType = !isStandalone;
      } else if (depositTypeFilter === 'STANDALONE') {
        matchDepositType = isStandalone;
      } else if (depositTypeFilter === 'PREVIOUS_ACCOUNT') {
        matchDepositType = item.paymentCategory === 'PREVIOUS_ACCOUNT';
      } else if (depositTypeFilter === 'ADVANCE_BEFORE_DELIVERY') {
        matchDepositType = item.paymentCategory === 'ADVANCE_BEFORE_DELIVERY';
      }

      // Dates
      let matchDate = true;
      if (startDate || endDate) {
        try {
          const [y, m, d] = item.date.split('/').map(Number);
          const itemDateObj = new DateObject({ calendar: persian, date: new Date(y, m - 1, d) });
          if (startDate && itemDateObj < startDate) matchDate = false;
          if (endDate && itemDateObj > endDate) matchDate = false;
        } catch {
          // ignore date parse issues
        }
      }

      return matchSearch && matchStatus && matchOwnership && matchDepositType && matchDate;
    });
  }, [driverSettlements, searchTerm, statusFilter, cardOwnershipFilter, depositTypeFilter, startDate, endDate]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    const totalAmount = driverSettlements.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalWeight = driverSettlements.reduce((sum, item) => sum + (item.cargoWeight || 0), 0);
    const paidItems = driverSettlements.filter(item => item.status === 'PAID');
    const paidAmount = paidItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const pendingItems = driverSettlements.filter(item => item.status === 'PENDING');
    const pendingAmount = pendingItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const otherAccountCount = driverSettlements.filter(item => item.isAccountHolderDriver === false).length;
    const standaloneItems = driverSettlements.filter(item => item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL'));
    const standaloneAmount = standaloneItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const prevAccountCount = standaloneItems.filter(item => item.paymentCategory === 'PREVIOUS_ACCOUNT').length;
    const advanceCount = standaloneItems.filter(item => item.paymentCategory === 'ADVANCE_BEFORE_DELIVERY').length;

    return {
      count: driverSettlements.length,
      totalAmount,
      totalWeight,
      paidCount: paidItems.length,
      paidAmount,
      pendingCount: pendingItems.length,
      pendingAmount,
      otherAccountCount,
      standaloneCount: standaloneItems.length,
      standaloneAmount,
      prevAccountCount,
      advanceCount
    };
  }, [driverSettlements]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert("رکوردی برای خروجی وجود ندارد.");
      return;
    }
    const headers = ["ردیف", "نام راننده", "شماره پلاک", "وزن بار (تن)", "شماره کارت", "شماره شبا", "صاحب حساب/کارت", "کارت به نام راننده است؟", "بانک", "مبلغ (تومان)", "تاریخ", "شماره بارنامه", "وضعیت", "کد پیگیری", "توضیحات"];
    const rows = filteredList.map((item, index) => [
      index + 1,
      `"${item.driverName}"`,
      `"${item.plateNumber}"`,
      item.cargoWeight,
      `"${item.cardNumber || ''}"`,
      `"${item.shebaNumber || ''}"`,
      `"${item.accountHolderName || item.driverName}"`,
      item.isAccountHolderDriver !== false ? 'بله (خود راننده)' : 'خیر (شخص دیگر)',
      `"${item.bankName || ''}"`,
      item.amount,
      `"${item.date}"`,
      `"${item.billOfLading || ''}"`,
      item.status === 'PAID' ? 'پرداخت شده' : item.status === 'PENDING' ? 'در انتظار' : 'لغو شده',
      `"${item.trackingCode || ''}"`,
      `"${item.description || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `driver_settlements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct print voucher
  const handlePrint = () => {
    window.print();
  };

  // Export receipt as PDF using jspdf and html2canvas
  const generateReceiptPDF = async (element: HTMLElement, settlement: DriverSettlement) => {
    try {
      setIsExportingPdf(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden, .no-pdf');
          hiddenElements.forEach((el: any) => {
            el.style.display = 'none';
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      if (imgHeight > (pageHeight - margin * 2)) {
        const scaleFactor = (pageHeight - margin * 2) / imgHeight;
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth * scaleFactor, imgHeight * scaleFactor, undefined, 'FAST');
      } else {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight, undefined, 'FAST');
      }

      const cleanDriverName = (settlement.driverName || 'driver').trim().replace(/[/\\?%*:|"<>]/g, '_');
      const cleanDate = (settlement.date || 'date').trim().replace(/[/\\?%*:|"<>]/g, '_');
      const filename = `رسید_پرداخت_${cleanDriverName}_${cleanDate}.pdf`;
      pdf.save(filename);
      return true;
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      alert('خطا در صدور خروجی PDF رسید. لطفاً مجدداً امتحان نمایید.');
      return false;
    } finally {
      setIsExportingPdf(false);
      setPdfExportingId(null);
    }
  };

  // Direct export of the currently open receipt in modal
  const handleExportCurrentReceiptPDF = async () => {
    if (!printItem || !printRef.current) return;
    setPdfExportingId(printItem.id);
    await generateReceiptPDF(printRef.current, printItem);
  };

  // Direct export from a specific table row
  const handleExportRowReceiptPDF = (item: DriverSettlement) => {
    setPdfTargetItem(item);
    setPdfExportingId(item.id);
    setIsExportingPdf(true);
    setTimeout(async () => {
      if (offscreenReceiptRef.current) {
        await generateReceiptPDF(offscreenReceiptRef.current, item);
        setPdfTargetItem(null);
      } else {
        setIsExportingPdf(false);
        setPdfExportingId(null);
      }
    }, 150);
  };

  // Reusable High-Fidelity Receipt Voucher Layout for Print & PDF
  const renderReceiptVoucher = (item: DriverSettlement) => {
    const driverObj = drivers.find(d => d.id === item.driverId || d.fullName === item.driverName);
    const isStandalone = Boolean(item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL'));
    const catCfg = getDepositCategoryConfig(item.paymentCategory, isStandalone);
    return (
      <div className="space-y-4 bg-white text-slate-900 p-6 rounded-2xl border border-slate-200" dir="rtl">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-md">
                LPG
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {isStandalone ? `رسید رسمی واریزی راننده (${catCfg.shortLabel})` : 'رسید و سند رسمی پرداخت کرایه راننده'}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">سیستم مدیریت هوشمند ترابری و صادرات گاز مایع</p>
              </div>
            </div>
            <div className="text-left font-mono text-xs">
              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block mb-1 border ${
                item.status === 'PAID' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : item.status === 'PENDING'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                {item.status === 'PAID' ? '✓ پرداخت قطعی و تسویه شده' : item.status === 'PENDING' ? '⏳ در انتظار واریز' : '✕ لغو شده'}
              </div>
              <div className="text-slate-700 font-bold">شماره سند: #{item.id.slice(-6).toUpperCase()}</div>
              <div className="text-slate-500 text-[11px]">تاریخ ثبت: {item.date}</div>
            </div>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="text-slate-500 block mb-0.5">نام و نام خانوادگی راننده:</span>
            <span className="font-bold text-sm text-slate-900">{item.driverName}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">شماره پلاک ماشین تانکر:</span>
            <span className="font-bold font-mono text-sm text-slate-900" dir="ltr">{item.plateNumber}</span>
          </div>
          {isStandalone ? (
            <>
              <div>
                <span className="text-slate-500 block mb-0.5">نوع واریزی (جدا از حساب بارنامه):</span>
                <span className="font-bold text-xs text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded border border-purple-300 inline-block">
                  {catCfg.label}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">وضعیت در حساب بارنامه‌ها:</span>
                <span className="font-bold text-xs text-slate-800">
                  {item.deductFromWaybillBalance === false
                    ? 'ثبت مستقل (بدون کسر از بارنامه‌های جاری)'
                    : 'منظور در تراز کل راننده (پیش‌پرداخت / کسر از طلب)'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-slate-500 block mb-0.5">وزن بار خالص حمل شده:</span>
                <span className="font-bold font-mono text-sm text-slate-900">{item.cargoWeight.toLocaleString()} تن</span>
                {item.ratePerTon ? <span className="text-[10px] text-slate-500 mr-2 font-mono">({item.ratePerTon.toLocaleString()} ت/تن)</span> : null}
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">شماره بارنامه حمل:</span>
                <span className="font-bold font-mono text-sm text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">{item.billOfLading || 'حمل مستقیم / دستی'}</span>
              </div>
            </>
          )}
          {(item.exchangeRateUSD || item.ratePerTonUSD || item.ratePerTonAED || item.depositForeignAmount) && (
            <div className="col-span-2 bg-white p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 font-medium">نرخ روز محاسبه فیش و اطلاعات ارزی:</span>
              <div className="font-mono font-bold text-slate-800 flex items-center gap-2" dir="ltr">
                {item.depositForeignAmount && item.depositCurrency ? (
                  <span className="text-indigo-700">مبلغ ارزی: {item.depositForeignAmount.toLocaleString()} {item.depositCurrency}</span>
                ) : null}
                {item.ratePerTonUSD ? <span className="text-blue-700">${item.ratePerTonUSD}/Ton</span> : null}
                {item.ratePerTonAED ? <span className="text-amber-700">| {item.ratePerTonAED} AED/Ton</span> : null}
                {item.exchangeRateUSD ? <span className="text-emerald-700">| نرخ روز دلار: {item.exchangeRateUSD.toLocaleString()} T</span> : null}
                {item.exchangeRateUSD_AED ? <span className="text-slate-500">(صرافی: {item.exchangeRateUSD_AED})</span> : null}
              </div>
            </div>
          )}
          {driverObj?.phone && (
            <div>
              <span className="text-slate-500 block mb-0.5">شماره تماس راننده:</span>
              <span className="font-bold font-mono text-xs text-slate-800" dir="ltr">{driverObj.phone}</span>
            </div>
          )}

          {/* بانک و حساب */}
          <div className="col-span-2 pt-2.5 mt-1 border-t border-slate-200 space-y-1.5">
            {item.cardNumber && (
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500">شماره کارت بانکی واریز شده:</span>
                <span className="font-bold font-mono text-xs tracking-wider text-slate-800" dir="ltr">{formatCardDisplay(item.cardNumber)}</span>
              </div>
            )}
            {item.shebaNumber && (
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500">شماره شبا مقصد (IR):</span>
                <span className="font-bold font-mono text-xs text-slate-800" dir="ltr">{item.shebaNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="text-slate-500">بانک و نام صاحب حساب:</span>
              <span className="font-bold text-slate-800">
                {item.bankName || 'بانک عامل'} | {item.isAccountHolderDriver !== false ? `به نام خود راننده (${item.driverName})` : `به نام: ${item.accountHolderName || 'شخص ثالث'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Amount Box */}
        <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-xl text-center">
          <span className="text-xs text-emerald-800 font-bold block mb-1">مبلغ خالص واریز شده به حساب راننده:</span>
          <div className="text-2xl font-black text-emerald-700 font-mono tracking-wide">
            {item.amount.toLocaleString()} تومان
          </div>
          <div className="text-xs text-emerald-900 mt-1 font-bold">
            {numberToPersianWords(item.amount)}
          </div>
        </div>

        {item.trackingCode && (
          <div className="text-xs text-slate-700 bg-slate-100 p-2.5 rounded-xl flex justify-between font-mono">
            <span>کد / شناسه پیگیری بانکی:</span>
            <span className="font-bold">{item.trackingCode}</span>
          </div>
        )}

        {item.description && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700">بابت / توضیحات سند:</span> {item.description}
          </div>
        )}

        {/* Signatures & Seal */}
        <div className="grid grid-cols-3 gap-3 pt-5 mt-3 border-t-2 border-slate-200 text-center text-xs">
          <div className="space-y-8">
            <span className="font-bold text-slate-700 block">امضاء و اثر انگشت راننده</span>
            <div className="h-6"></div>
          </div>
          <div className="space-y-8">
            <span className="font-bold text-slate-700 block">امضاء مسئول مالی و حسابداری</span>
            <div className="h-6"></div>
          </div>
          <div className="space-y-8">
            <span className="font-bold text-slate-700 block">امضاء مدیر ترابری و لجستیک</span>
            <div className="h-6"></div>
          </div>
        </div>

        {/* Digital Verification Footer */}
        <div className="text-[10px] text-slate-400 text-center pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span>سامانه لجستیک و امور مالی پایانه صادرات گاز مایع</span>
          <span className="font-mono">تاریخ صدور / چاپ: {new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD - HH:mm")}</span>
          <span className="text-emerald-600 font-bold">تایید مالی سیستمی ✓</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      
      {/* Top Banner / Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
              <CreditCard size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">تنظیم و لیست پرداختی رانندگان</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {filteredList.length} رکورد
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                ثبت دستی مبالغ واریزی، پلاک خودرو، تناژ بار برده‌شده، شماره کارت و شبا با تعیین وضعیت مالکیت حساب
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPayaModal(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-2 text-sm transition-all shadow-sm"
              title="مشاهده و کپی کدهای شبا جهت واریز گروهی پایا"
            >
              <ExternalLink size={16} className="text-blue-500" />
              <span>خروجی واریز پایا</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-2 text-sm transition-all shadow-sm"
            >
              <Download size={16} className="text-emerald-500" />
              <span>خروجی اکسل</span>
            </button>

            <button
              onClick={() => setShowDebtBreakdownModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-rose-600/20"
              title="مشاهده گزارش تفکیکی بدهی و حساب هر راننده بر اساس بارهای انجام‌شده و پیش‌پرداخت‌ها"
            >
              <FileText size={17} />
              <span>گزارش تفکیکی بدهی رانندگان (بارها و پیش‌پرداخت‌ها)</span>
            </button>

            <button
              onClick={() => handleOpenNew(true, 'PREVIOUS_ACCOUNT')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-purple-600/25"
            >
              <Wallet size={18} />
              <span>ثبت واریزی جدا از بارنامه (حساب قبلی / قبل از تحویل)</span>
            </button>

            <button
              onClick={() => handleOpenNew(false, 'WAYBILL')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-emerald-600/25"
            >
              <Plus size={18} />
              <span>تنظیم پرداختی بارنامه</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1.5">
              <span>کل مبالغ پرداختی</span>
              <DollarSign size={16} className="text-emerald-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {stats.totalAmount.toLocaleString()} <span className="text-xs font-normal text-slate-400">تومان</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              تعداد کل اسناد: {stats.count}
            </div>
          </div>

          <div 
            onClick={() => setDepositTypeFilter(depositTypeFilter === 'STANDALONE' ? 'ALL' : 'STANDALONE')}
            className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 cursor-pointer hover:border-purple-400 transition-all"
          >
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold mb-1.5">
              <span>واریزی جدا از بارنامه</span>
              <Wallet size={16} className="text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-700 dark:text-purple-300">
              {stats.standaloneAmount.toLocaleString()} <span className="text-xs font-normal text-purple-600/70">تومان</span>
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
              {stats.standaloneCount} مورد ({stats.prevAccountCount} حساب قبلی، {stats.advanceCount} قبل از تحویل)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold mb-1.5">
              <span>مجموع تناژ بارهای حمل‌شده</span>
              <Scale size={16} className="text-blue-500" />
            </div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {stats.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">تن</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              محاسبه شده از بارنامه‌ها
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1.5">
              <span>واریز شده (تأیید شده)</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {stats.paidAmount.toLocaleString()} <span className="text-xs font-normal text-emerald-600/70">تومان</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              {stats.paidCount} پرداخت نهایی شده
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold mb-1.5">
              <span>در نوبت واریز</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300">
              {stats.pendingAmount.toLocaleString()} <span className="text-xs font-normal text-amber-600/70">تومان</span>
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
              {stats.pendingCount} راننده در انتظار ({stats.otherAccountCount} کارت به نام غیر)
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی نام راننده، شماره پلاک، کارت، شبا، صاحب حساب، بارنامه..."
              className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-800 dark:text-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Ownership Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setCardOwnershipFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              cardOwnershipFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            همه حساب‌ها
          </button>
          <button
            onClick={() => setCardOwnershipFilter('DRIVER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              cardOwnershipFilter === 'DRIVER'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-400'
            }`}
          >
            <UserCheck size={13} />
            به نام خود راننده
          </button>
          <button
            onClick={() => setCardOwnershipFilter('OTHER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              cardOwnershipFilter === 'OTHER'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:text-amber-800 dark:text-amber-400'
            }`}
          >
            <UserX size={13} />
            به نام شخص دیگر
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            همه وضعیت‌ها
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-600 hover:text-amber-700 dark:text-amber-400'
            }`}
          >
            در انتظار ({stats.pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
            }`}
          >
            پرداخت شده ({stats.paidCount})
          </button>
        </div>

        {/* Deposit Type Filter Tabs (Waybill vs Standalone / Previous Account / Advance) */}
        <div className="w-full pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 ml-1">نوع سند پرداختی:</span>
            <button
              onClick={() => setDepositTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                depositTypeFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              همه موارد ({stats.count})
            </button>
            <button
              onClick={() => setDepositTypeFilter('WAYBILL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                depositTypeFilter === 'WAYBILL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <FileText size={13} />
              تسویه بارنامه‌ها ({stats.count - stats.standaloneCount})
            </button>
            <button
              onClick={() => setDepositTypeFilter('STANDALONE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                depositTypeFilter === 'STANDALONE'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              <Wallet size={13} />
              همه واریزی‌های جدا از بارنامه ({stats.standaloneCount})
            </button>
            <button
              onClick={() => setDepositTypeFilter('PREVIOUS_ACCOUNT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                depositTypeFilter === 'PREVIOUS_ACCOUNT'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100'
              }`}
            >
              حساب قبلی که واریز شده ({stats.prevAccountCount})
            </button>
            <button
              onClick={() => setDepositTypeFilter('ADVANCE_BEFORE_DELIVERY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                depositTypeFilter === 'ADVANCE_BEFORE_DELIVERY'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
              }`}
            >
              درخواست کرایه قبل از تحویل بار ({stats.advanceCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <CreditCard size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">رکوردی برای پرداخت رانندگان یافت نشد</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              می‌توانید با زدن دکمه‌های زیر، تسویه بارنامه یا واریزی جدا از حساب بارنامه (حساب قبلی / درخواست کرایه قبل از تحویل بار) ثبت کنید.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleOpenNew(true, 'PREVIOUS_ACCOUNT')}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl inline-flex items-center gap-2 text-sm shadow-md"
              >
                <Wallet size={16} />
                ثبت واریزی جدا از بارنامه
              </button>
              <button
                onClick={() => handleOpenNew(false, 'WAYBILL')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl inline-flex items-center gap-2 text-sm shadow-md"
              >
                <Plus size={16} />
                تنظیم پرداختی بارنامه
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pr-6">#</th>
                  <th className="p-4">نام راننده</th>
                  <th className="p-4">شماره پلاک ماشین</th>
                  <th className="p-4">وزن بار (تن)</th>
                  <th className="p-4">اطلاعات حساب، کارت و شبا</th>
                  <th className="p-4">مبلغ پرداختی (تومان)</th>
                  <th className="p-4">تاریخ / بارنامه</th>
                  <th className="p-4 text-center">وضعیت پرداخت</th>
                  <th className="p-4 pl-6 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {filteredList.map((item, index) => {
                  const isShebaCopied = copiedId === item.id;
                  const isCardCopied = copiedCardId === item.id;
                  const isAccountDriver = item.isAccountHolderDriver !== false;

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="p-4 pr-6 text-xs text-slate-400 font-mono">
                        {index + 1}
                      </td>

                      {/* راننده */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-black shrink-0">
                            {item.driverName.charAt(0)}
                          </span>
                          <div>
                            <div>{item.driverName}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* پلاک ماشین */}
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          <Truck size={14} className="text-slate-400 shrink-0" />
                          <span>{item.plateNumber}</span>
                        </div>
                      </td>

                      {/* وزن بار یا نوع واریزی جدا از بارنامه */}
                      <td className="p-4">
                        {(item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL')) ? (
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${getDepositCategoryConfig(item.paymentCategory, true).badgeClass}`}>
                              <Wallet size={13} />
                              {getDepositCategoryConfig(item.paymentCategory, true).shortLabel}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {item.deductFromWaybillBalance === false ? 'جدا از حساب بارنامه‌ها' : 'منظور در تراز راننده'}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Scale size={15} className="text-blue-500 shrink-0" />
                              <span className="font-mono text-base">{item.cargoWeight.toLocaleString()}</span>
                              <span className="text-xs text-slate-400 font-normal">تن</span>
                            </div>
                            {item.ratePerTon && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                نرخ هر تن: {item.ratePerTon.toLocaleString()}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* اطلاعات کارت، شبا و وضعیت مالکیت حساب اعلامی */}
                      <td className="p-4">
                        <div className="space-y-1.5">
                          {/* نمایش شماره کارت */}
                          {item.cardNumber && (
                            <div className="flex items-center gap-1.5">
                              <code 
                                onClick={() => handleCopyCard(item.cardNumber!, item.id)}
                                className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-400 transition-all select-all flex items-center gap-1.5"
                                title="کلیک جهت کپی شماره کارت"
                                dir="ltr"
                              >
                                {formatCardDisplay(item.cardNumber)}
                                {isCardCopied ? (
                                  <Check size={12} className="text-emerald-500 animate-in zoom-in" />
                                ) : (
                                  <Copy size={12} className="text-slate-400 hover:text-blue-500" />
                                )}
                              </code>
                            </div>
                          )}

                          {/* نمایش شماره شبا */}
                          {item.shebaNumber && (
                            <div className="flex items-center gap-1.5">
                              <code 
                                onClick={() => handleCopySheba(item.shebaNumber!, item.id)}
                                className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-all select-all flex items-center gap-1.5"
                                title="کلیک جهت کپی شبا"
                                dir="ltr"
                              >
                                {item.shebaNumber}
                                {isShebaCopied ? (
                                  <Check size={12} className="text-emerald-500 animate-in zoom-in" />
                                ) : (
                                  <Copy size={12} className="text-slate-400 hover:text-emerald-500" />
                                )}
                              </code>
                            </div>
                          )}

                          {/* وضعیت مالکیت کارت: به نام خود راننده یا شخص دیگر */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {isAccountDriver ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                کارت به نام خود راننده
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                <AlertTriangle size={11} className="text-amber-600" />
                                به نام: {item.accountHolderName || 'شخص دیگر (غیر)'}
                              </span>
                            )}

                            {item.bankName && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Building2 size={11} />
                                {item.bankName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* مبلغ پرداختی */}
                      <td className="p-4">
                        <div className="font-black text-slate-900 dark:text-white text-base">
                          {item.amount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">تومان</span>
                        </div>
                        {item.depositForeignAmount && item.depositCurrency && item.depositCurrency !== 'TOMAN' && (
                          <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            معادل ارزی: {item.depositForeignAmount.toLocaleString()} {item.depositCurrency}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={numberToPersianWords(item.amount)}>
                          {numberToPersianWords(item.amount)}
                        </div>
                      </td>

                      {/* تاریخ و بارنامه / نوع واریزی */}
                      <td className="p-4">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">
                          {item.date}
                        </div>
                        {(item.isStandaloneDeposit || (item.paymentCategory && item.paymentCategory !== 'WAYBILL')) ? (
                          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                            جدا از بارنامه {item.billOfLading ? `(${item.billOfLading})` : ''}
                          </div>
                        ) : item.billOfLading ? (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <FileText size={11} />
                            <span>بارنامه: {item.billOfLading}</span>
                          </div>
                        ) : null}
                      </td>

                      {/* وضعیت پرداخت */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
                            item.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : item.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                          title="کلیک برای تغییر سریع وضعیت"
                        >
                          {item.status === 'PAID' && <CheckCircle2 size={13} />}
                          {item.status === 'PENDING' && <Clock size={13} />}
                          {item.status === 'CANCELLED' && <AlertCircle size={13} />}
                          <span>
                            {item.status === 'PAID' ? 'پرداخت شده' : item.status === 'PENDING' ? 'در انتظار واریز' : 'لغو شده'}
                          </span>
                        </button>
                      </td>

                      {/* عملیات */}
                      <td className="p-4 pl-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopyBankingText(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all"
                            title="کپی پیام مشخصات واریز برای بانک / راننده"
                          >
                            <Share2 size={16} />
                          </button>

                          <button
                            onClick={() => handleExportRowReceiptPDF(item)}
                            disabled={isExportingPdf && pdfExportingId === item.id}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all relative"
                            title="دانلود فوری رسید پرداخت راننده به صورت PDF"
                          >
                            {isExportingPdf && pdfExportingId === item.id ? (
                              <RefreshCw size={16} className="animate-spin text-rose-600" />
                            ) : (
                              <FileText size={16} />
                            )}
                          </button>

                          <button
                            onClick={() => setPrintItem(item)}
                            className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                            title="مشاهده فیش رسید، چاپ مستقیم و خروجی PDF"
                          >
                            <Printer size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-all"
                            title="ویرایش"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف پرداخت راننده "${item.driverName}" مطمئن هستید؟`)) {
                                deleteDriverSettlement(item.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Settlement */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 md:p-8 animate-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${
                  formIsStandaloneDeposit
                    ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {formIsStandaloneDeposit ? <Wallet size={24} /> : <CreditCard size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {editItem 
                      ? (formIsStandaloneDeposit ? 'ویرایش واریزی جدا از بارنامه' : 'ویرایش پرداختی بارنامه راننده')
                      : (formIsStandaloneDeposit ? 'ثبت واریزی جدا از حساب بارنامه' : 'تنظیم فیش پرداختی بارنامه راننده')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formIsStandaloneDeposit
                      ? 'ثبت واریزی بابت حساب قبلی که واریز شده یا درخواست کرایه قبل از تحویل بار (بدون نیاز به ثبت بارنامه)'
                      : 'انتخاب بارنامه، وزن بار برده‌شده، شماره کارت و شبا با تعیین مالکیت حساب'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* سوییچر بالای فرم: انتخاب بین تسویه بارنامه یا ثبت واریزی جدا از حساب بارنامه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setFormIsStandaloneDeposit(false);
                    setFormPaymentCategory('WAYBILL');
                    setFormDeductFromWaybillBalance(true);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    !formIsStandaloneDeposit
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <FileText size={16} />
                  <span>۱. تسویه حساب بارنامه (مرتبط با بار)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormIsStandaloneDeposit(true);
                    const nextCat = formPaymentCategory === 'WAYBILL' ? 'PREVIOUS_ACCOUNT' : formPaymentCategory;
                    setFormPaymentCategory(nextCat);
                    setFormDeductFromWaybillBalance(nextCat === 'PREVIOUS_ACCOUNT' ? false : true);
                    setSelectedTransactionId('');
                    setFormCargoWeight('');
                    setFormBillOfLading('');
                    setFormStatus('PAID');
                    if (!formDescription) {
                      setFormDescription(
                        nextCat === 'PREVIOUS_ACCOUNT'
                          ? 'واریزی بابت تسویه حساب قبلی (جدا از بارنامه)'
                          : 'درخواست کرایه قبل از تحویل بار (پیش‌پرداخت کرایه)'
                      );
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    formIsStandaloneDeposit
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <Wallet size={16} />
                  <span>۲. ثبت واریزی جدا از بارنامه (حساب قبلی / قبل از تحویل)</span>
                </button>
              </div>
              
              {/* بخش هوشمند انتخاب راننده از لیست موجود */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <UserCheck size={16} className="text-blue-600" />
                    انتخاب راننده از لیست سیستم (پر شدن خودکار نام، پلاک، کارت و شبا)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDriverPicker(true)}
                    className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    <Search size={13} />
                    جستجو در رانندگان ({drivers.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                    className="md:col-span-3 w-full p-2.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="">-- انتخاب مستقیم از لیست رانندگان --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} | پلاک: {d.plateNumber} {d.cardNumber ? `| کارت: ${d.cardNumber.slice(0, 4)}...` : ''} {d.shebaNumber ? `| شبا: ${d.shebaNumber.slice(0, 8)}...` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowDriverPicker(true)}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Search size={14} />
                    لیست سریع
                  </button>
                </div>
              </div>

              {/* اگر در حالت واریزی جدا از بارنامه هستیم: انتخاب علت واریزی (حساب قبلی / درخواست کرایه قبل از تحویل بار) */}
              {formIsStandaloneDeposit ? (
                <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-200/80 dark:border-purple-800/60 pb-2">
                    <span className="text-xs font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Wallet size={16} className="text-purple-600" />
                      نوع و علت واریزی جدا از حساب بارنامه را انتخاب کنید:
                    </span>
                    <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md">
                      بدون نیاز به بارنامه و وزن بار
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {/* ۱. حساب قبلی که واریز شده */}
                    <div
                      onClick={() => {
                        setFormPaymentCategory('PREVIOUS_ACCOUNT');
                        setFormDeductFromWaybillBalance(false);
                        setFormDescription('واریزی بابت تسویه حساب قبلی (جدا از بارنامه)');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formPaymentCategory === 'PREVIOUS_ACCOUNT'
                          ? 'bg-white dark:bg-slate-900 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-900/50 border-purple-200/70 dark:border-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-purple-800 dark:text-purple-300">۱. حساب قبلی که واریز شده</span>
                        {formPaymentCategory === 'PREVIOUS_ACCOUNT' && <Check size={14} className="text-purple-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        مبلغی که بابت بدهی یا مانده حساب قبلی به حساب راننده واریز شده است.
                      </p>
                    </div>

                    {/* ۲. درخواست کرایه قبل از تحویل بار */}
                    <div
                      onClick={() => {
                        setFormPaymentCategory('ADVANCE_BEFORE_DELIVERY');
                        setFormDeductFromWaybillBalance(true);
                        setFormDescription('درخواست کرایه قبل از تحویل بار (پیش‌پرداخت کرایه)');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formPaymentCategory === 'ADVANCE_BEFORE_DELIVERY'
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-900/50 border-purple-200/70 dark:border-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-indigo-800 dark:text-indigo-300">۲. کرایه قبل از تحویل بار</span>
                        {formPaymentCategory === 'ADVANCE_BEFORE_DELIVERY' && <Check size={14} className="text-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        راننده قبل از رسیدن و تحویل بار درخواست پیش‌پرداخت کرایه کرده است.
                      </p>
                    </div>

                    {/* ۳. واریزی علی‌الحساب */}
                    <div
                      onClick={() => {
                        setFormPaymentCategory('ON_ACCOUNT');
                        setFormDeductFromWaybillBalance(true);
                        setFormDescription('واریزی علی‌الحساب به حساب راننده (جدا از بارنامه)');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formPaymentCategory === 'ON_ACCOUNT'
                          ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-900/50 border-purple-200/70 dark:border-slate-700 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-blue-800 dark:text-blue-300">۳. واریزی علی‌الحساب</span>
                        {formPaymentCategory === 'ON_ACCOUNT' && <Check size={14} className="text-blue-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        پرداخت مساعده یا علی‌الحساب نقدی به راننده جدا از بارنامه خاص.
                      </p>
                    </div>
                  </div>

                  {/* نحوه تاثیر در تراز حساب بارنامه‌های راننده */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      نحوه اعمال در حساب بارنامه‌های راننده:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFormDeductFromWaybillBalance(false)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex items-start gap-2 ${
                          !formDeductFromWaybillBalance
                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-900 dark:text-purple-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input type="radio" checked={!formDeductFromWaybillBalance} readOnly className="mt-1" />
                        <div>
                          <div className="text-xs font-bold">ثبت کاملاً جدا از حساب بارنامه‌ها</div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            مانده بارنامه‌های فعلی تغییر نمی‌کند (مناسب حساب قبلی که تسویه شده)
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormDeductFromWaybillBalance(true)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex items-start gap-2 ${
                          formDeductFromWaybillBalance
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input type="radio" checked={formDeductFromWaybillBalance} readOnly className="mt-1" />
                        <div>
                          <div className="text-xs font-bold">کسر از تراز کل راننده (پیش‌پرداخت)</div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            از کل طلب راننده کسر می‌شود (مناسب پیش‌پرداخت کرایه قبل از تحویل بار)
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* بخش هوشمند انتخاب بارنامه ثبت‌شده جهت صدور فیش پرداختی */
                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <FileText size={16} className="text-amber-600" />
                      انتخاب بارنامه جهت تنظیم فیش پرداختی (فراخوانی خودکار وزن بار، راننده و نرخ کرایه)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBillPicker(true)}
                      className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <Search size={13} />
                      جستجو در کل بارنامه‌ها ({transactions.length + freights.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <select
                      value={selectedTransactionId}
                      onChange={(e) => handleBillOfLadingSelect(e.target.value)}
                      className="md:col-span-3 w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-amber-500"
                    >
                      <option value="">
                        {selectedDriverId 
                          ? `-- انتخاب از بارنامه‌های این راننده (${availableBillsOfLading.length} مورد) --` 
                          : `-- انتخاب مستقیم بارنامه از لیست کل بارها (${availableBillsOfLading.length} مورد) --`}
                      </option>
                      {availableBillsOfLading.map(tx => {
                        const drv = drivers.find(d => d.id === tx.driverId);
                        const bolLabel = tx.billOfLading || `BL-${tx.id.slice(-5).toUpperCase()}`;
                        const isSettled = driverSettlements.some(s => s.billOfLading && s.billOfLading === tx.billOfLading && s.status === 'PAID');
                        const rateInfo = tx.freightCurrency === 'USD' 
                          ? `$${tx.freightRateUSD || tx.freightRate}/تن` 
                          : tx.freightCurrency === 'AED'
                            ? `${tx.freightRateAED || tx.freightRate} AED/تن`
                            : tx.freightRate 
                              ? `${tx.freightRate.toLocaleString()} ت/تن`
                              : tx.freightPrice 
                                ? `کرایه: ${tx.freightPrice.toLocaleString()} ت`
                                : '';
                        return (
                          <option key={tx.id} value={tx.id}>
                            بارنامه: {bolLabel} | {drv ? drv.fullName : 'راننده'} | وزن: {tx.volume} تن | تاریخ: {tx.date.split(' ')[0]} {rateInfo ? `| ${rateInfo}` : ''} {isSettled ? ' (✓ تسویه شده)' : ''}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowBillPicker(true)}
                      className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <FileText size={14} />
                      لیست بارنامه‌ها
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* نام راننده */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    نام و نام خانوادگی راننده <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    placeholder="مثال: رضا محمدی"
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-900 dark:text-white"
                  />
                </div>

                {/* شماره پلاک ماشین */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    شماره پلاک ماشین <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPlateNumber}
                    onChange={(e) => setFormPlateNumber(e.target.value)}
                    placeholder="مثال: ۱۲ ع ۳۴۵ ایران ۶۶"
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-900 dark:text-white"
                  />
                </div>

                {/* شماره بارنامه یا کد مرجع */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>{formIsStandaloneDeposit ? 'شماره مرجع / سند (اختیاری)' : 'شماره بارنامه'}</span>
                    <Hash size={13} className="text-amber-500" />
                  </label>
                  <input
                    type="text"
                    value={formBillOfLading}
                    onChange={(e) => setFormBillOfLading(e.target.value)}
                    placeholder={formIsStandaloneDeposit ? 'بدون نیاز به بارنامه (اختیاری)...' : 'انتخاب از بالا یا ورود دستی...'}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold font-mono outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* بخش محاسبه مبلغ: در حالت بارنامه (بر اساس وزن و فی) و در حالت جدا از بارنامه (بر اساس مبلغ مستقیم یا ارز روز) */}
              {formIsStandaloneDeposit ? (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-600" />
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-300">
                        محاسبه مبلغ واریزی جدا از بارنامه (تومان، دلار یا درهم با نرخ روز)
                      </span>
                    </div>
                    <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-emerald-200 dark:border-slate-700 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setFormDepositCurrency('TOMAN')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          formDepositCurrency === 'TOMAN' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                        }`}
                      >
                        تومان مستقیم
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormDepositCurrency('USD');
                          handleStandaloneForeignChange(formDepositForeignAmount, 'USD', formExchangeRateUSD, formUsdAedRate);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          formDepositCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-500'
                        }`}
                      >
                        معادل دلار ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormDepositCurrency('AED');
                          handleStandaloneForeignChange(formDepositForeignAmount, 'AED', formExchangeRateUSD, formUsdAedRate);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          formDepositCurrency === 'AED' ? 'bg-amber-600 text-white' : 'text-slate-500'
                        }`}
                      >
                        معادل درهم (AED)
                      </button>
                    </div>
                  </div>

                  {formDepositCurrency !== 'TOMAN' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          مبلغ واریزی به {formDepositCurrency === 'USD' ? 'دلار ($)' : 'درهم (AED)'}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formatNumberInput(formDepositForeignAmount)}
                          onChange={(e) => {
                            const cleaned = cleanNumberInput(e.target.value);
                            setFormDepositForeignAmount(cleaned);
                            handleStandaloneForeignChange(cleaned, formDepositCurrency, formExchangeRateUSD, formUsdAedRate);
                          }}
                          placeholder={formDepositCurrency === 'USD' ? 'مثال: 300' : 'مثال: 1,000'}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-indigo-700 dark:text-indigo-400 outline-none text-left"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نرخ روز دلار (تومان)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formatNumberInput(formExchangeRateUSD)}
                          onChange={(e) => {
                            const cleaned = cleanNumberInput(e.target.value);
                            setFormExchangeRateUSD(cleaned);
                            handleStandaloneForeignChange(formDepositForeignAmount, formDepositCurrency, cleaned, formUsdAedRate);
                          }}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-blue-700 dark:text-blue-400 outline-none text-left"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          ضریب صرافی (دلار به درهم)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={formUsdAedRate}
                          onChange={(e) => {
                            setFormUsdAedRate(e.target.value);
                            handleStandaloneForeignChange(formDepositForeignAmount, formDepositCurrency, formExchangeRateUSD, e.target.value);
                          }}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* بخش ویژه: تعیین نرخ روز ارز و محاسبه کرایه فیش پرداختی بارنامه */
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-600" />
                      <span className="text-sm font-black text-emerald-950 dark:text-emerald-300">
                        تعیین نرخ روز ارز و محاسبه مبلغ فیش پرداختی
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dailyRateSavedToast && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                          ✓ نرخ روز در کل سیستم ذخیره شد
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveSystemDailyRate}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                        title="ذخیره نرخ واردشده به عنوان نرخ روز پیش‌فرض کل برنامه"
                      >
                        <Check size={12} />
                        ثبت به عنوان نرخ روز سیستم
                      </button>
                    </div>
                  </div>

                  {/* ردیف تعیین نرخ روز دلار، نرخ صرافی ۳.۶۷ و وزن بار */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* نرخ روز دلار به تومان */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          نرخ روز دلار (تومان)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const sysRate = exchangeRates.usd ? exchangeRates.usd.toString() : '60000';
                            setFormExchangeRateUSD(sysRate);
                            handleRateOrWeightChange(formCargoWeight, formRatePerTon, formRateCurrency, sysRate, formUsdAedRate);
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          نرخ سیستم ({exchangeRates.usd?.toLocaleString()} T)
                        </button>
                      </div>
                      <div className="relative">
                        <input 
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formatNumberInput(formExchangeRateUSD)} 
                          onChange={(e) => {
                            const cleaned = cleanNumberInput(e.target.value);
                            setFormExchangeRateUSD(cleaned);
                            handleRateOrWeightChange(formCargoWeight, formRatePerTon, formRateCurrency, cleaned, formUsdAedRate);
                          }}
                          placeholder="60,000"
                          className="w-full p-2.5 pl-12 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-blue-700 dark:text-blue-400 outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">تومان</span>
                      </div>
                    </div>

                    {/* نرخ تبدیل صرافی دلار به درهم (۳.۶۷) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          نرخ صرافی (دلار به درهم)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setFormUsdAedRate('3.67');
                            handleRateOrWeightChange(formCargoWeight, formRatePerTon, formRateCurrency, formExchangeRateUSD, '3.67');
                          }}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          پایه (۳.۶۷)
                        </button>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.001"
                          value={formUsdAedRate} 
                          onChange={(e) => {
                            setFormUsdAedRate(e.target.value);
                            handleRateOrWeightChange(formCargoWeight, formRatePerTon, formRateCurrency, formExchangeRateUSD, e.target.value);
                          }}
                          placeholder="3.67"
                          className="w-full p-2.5 pl-14 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-600">AED/$</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                        <span>نرخ روز هر درهم:</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                          {Math.round((parseFloat(formExchangeRateUSD) || 0) / (parseFloat(formUsdAedRate) || 3.67)).toLocaleString()} تومان
                        </span>
                      </div>
                    </div>

                    {/* وزن باری که بردن (تن) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>وزن بار حمل شده <span className="text-red-500">*</span></span>
                        <Scale size={13} className="text-blue-500" />
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          required={!formIsStandaloneDeposit}
                          value={formCargoWeight}
                          onChange={(e) => {
                            setFormCargoWeight(e.target.value);
                            handleRateOrWeightChange(e.target.value, formRatePerTon);
                          }}
                          placeholder="مثال: 22.45"
                          className="w-full p-2.5 pl-10 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          تن
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ردیف تعیین نرخ کرایه هر تن بر اساس ارز انتخابی */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          فی کرایه هر تن:
                        </label>
                        <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-emerald-200 dark:border-slate-700 gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormRateCurrency('TOMAN');
                              handleRateOrWeightChange(formCargoWeight, formRatePerTon, 'TOMAN', formExchangeRateUSD, formUsdAedRate);
                            }}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                              formRateCurrency === 'TOMAN'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            تومان/ریال
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormRateCurrency('USD');
                              handleRateOrWeightChange(formCargoWeight, formRatePerTon, 'USD', formExchangeRateUSD, formUsdAedRate);
                            }}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                              formRateCurrency === 'USD'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            دلار ($)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormRateCurrency('AED');
                              handleRateOrWeightChange(formCargoWeight, formRatePerTon, 'AED', formExchangeRateUSD, formUsdAedRate);
                            }}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                              formRateCurrency === 'AED'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            درهم (AED ۳.۶۷)
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formatNumberInput(formRatePerTon)}
                          onChange={(e) => {
                            const cleaned = cleanNumberInput(e.target.value);
                            setFormRatePerTon(cleaned);
                            handleRateOrWeightChange(formCargoWeight, cleaned, formRateCurrency, formExchangeRateUSD, formUsdAedRate);
                          }}
                          placeholder={formRateCurrency === 'USD' ? 'مثال: 25.00' : formRateCurrency === 'AED' ? 'مثال: 91.75' : 'مثال: 1,200,000'}
                          className="w-full p-2.5 pl-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:border-emerald-500 text-slate-900 dark:text-white text-left"
                        />
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                          formRateCurrency === 'USD' ? 'text-blue-600' : formRateCurrency === 'AED' ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {formRateCurrency === 'USD' ? 'USD $' : formRateCurrency === 'AED' ? 'AED' : 'تومان'}
                        </span>
                      </div>
                    </div>

                    {/* نمایش معادل لحظه‌ای فیش بر اساس نرخ روز */}
                    {(() => {
                      const ex = parseFloat(formExchangeRateUSD) || exchangeRates.usd || 60000;
                      const ua = parseFloat(formUsdAedRate) || 3.67;
                      const amtToman = parseFloat(formAmount) || 0;
                      const amtUsd = ex > 0 ? amtToman / ex : 0;
                      const amtAed = amtUsd * ua;

                      return (
                        <div className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-emerald-200 dark:border-slate-700 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>معادل ارزی کل فیش به نرخ روز:</span>
                            <div className="font-mono font-bold flex items-center gap-1.5" dir="ltr">
                              <span className="text-blue-600 font-black">${amtUsd.toFixed(1)}</span>
                              <span>|</span>
                              <span className="text-amber-600 font-black">{amtAed.toFixed(1)} AED</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-1">
                            <span>جمع کل به ریال:</span>
                            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400" dir="ltr">
                              {(amtToman * 10).toLocaleString()} ریال
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* بخش مشخصات کارت، شبا و وضعیت مالکیت حساب اعلامی راننده */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-emerald-600" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      مشخصات کارت و شماره شبای اعلامی
                    </span>
                  </div>
                  {formBankName && (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-100/60 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                      <Building2 size={13} />
                      {formBankName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* شماره کارت بانکی (۱۶ رقمی) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>شماره کارت بانکی (۱۶ رقمی)</span>
                      <span className="text-[10px] text-slate-400">جهت کارت‌به‌کارت</span>
                    </label>
                    <input
                      type="text"
                      value={formCardNumber}
                      onChange={(e) => handleCardChange(e.target.value)}
                      placeholder="---- ---- ---- ----"
                      dir="ltr"
                      maxLength={19}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-left outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  {/* شماره شبا بانکی (۲۴ رقمی) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>شماره شبا بانکی (IR)</span>
                      <span className="text-[10px] text-slate-400">جهت حواله پایا/ساتنا</span>
                    </label>
                    <input
                      type="text"
                      value={formShebaNumber}
                      onChange={(e) => handleShebaChange(e.target.value)}
                      placeholder="IR000000000000000000000000"
                      dir="ltr"
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider text-left outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* مالکیت حساب/کارت اعلامی (به نام خود راننده است یا غیر؟) */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    مالکیت کارت / حساب اعلامی راننده:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* کارت به نام خود راننده */}
                    <div 
                      onClick={() => {
                        setFormIsAccountHolderDriver(true);
                        setFormAccountHolderName(formDriverName);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        formIsAccountHolderDriver 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="accountOwnership" 
                        checked={formIsAccountHolderDriver} 
                        onChange={() => {
                          setFormIsAccountHolderDriver(true);
                          setFormAccountHolderName(formDriverName);
                        }}
                        className="mt-1 text-emerald-600"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          <UserCheck size={14} className="text-emerald-600" />
                          <span>شماره کارت به نام خود راننده است</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          واریزی مستقیماً به نام راننده {formDriverName ? `(${formDriverName})` : ''} ثبت و انتقال می‌یابد.
                        </p>
                      </div>
                    </div>

                    {/* کارت به نام شخص دیگر */}
                    <div 
                      onClick={() => setFormIsAccountHolderDriver(false)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        !formIsAccountHolderDriver 
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="accountOwnership" 
                        checked={!formIsAccountHolderDriver} 
                        onChange={() => setFormIsAccountHolderDriver(false)}
                        className="mt-1 text-amber-600"
                      />
                      <div>
                        <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <UserX size={14} className="text-amber-600" />
                          <span>شماره کارت به نام شخص دیگری است</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          کارت اعلامی متعلق به همسر، مالک کامیون یا بستگان راننده است.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* فیلد نام صاحب کارت اعلامی در صورتی که به نام شخص دیگر باشد */}
                  {!formIsAccountHolderDriver && (
                    <div className="mt-3 p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 animate-in fade-in">
                      <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1.5 flex items-center justify-between">
                        <span>نام و مشخصات صاحب کارت اعلامی <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">برای جلوگیری از خطای مغایرت در امور مالی</span>
                      </label>
                      <input
                        type="text"
                        required={!formIsAccountHolderDriver}
                        value={formAccountHolderName}
                        onChange={(e) => setFormAccountHolderName(e.target.value)}
                        placeholder="مثال: زهرا احمدی (همسر) یا حمید باقری (مالک کامیون)"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* مبلغ پرداختی (تومان) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مبلغ واریزی / پرداختی به راننده <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      required
                      value={formatNumberInput(formAmount)}
                      onChange={(e) => setFormAmount(cleanNumberInput(e.target.value))}
                      placeholder="مثال: 15,000,000"
                      className="w-full p-3 pl-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-left tracking-wider"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      تومان
                    </span>
                  </div>
                  {formAmount && parseFloat(formAmount) > 0 && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      معادل: {numberToPersianWords(parseFloat(formAmount))}
                    </div>
                  )}
                </div>

                {/* تاریخ پرداخت / سررسید */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاریخ واریز / حواله
                  </label>
                  <DatePicker
                    value={formDate}
                    onChange={setFormDate}
                    calendar={persian}
                    locale={persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* کد پیگیری بانکی */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    کد پیگیری / شماره فیش واریزی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={formTrackingCode}
                    onChange={(e) => setFormTrackingCode(e.target.value)}
                    placeholder="مثال: TRF-87654321"
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* وضعیت پرداخت */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    وضعیت واریز
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as SettlementStatus)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="PAID">پرداخت و واریز شده (قطعی)</option>
                    <option value="PENDING">در انتظار واریز (در نوبت حواله پایا/کارت)</option>
                    <option value="CANCELLED">لغو شده</option>
                  </select>
                </div>

                {/* توضیحات + پیشنهادهای سریع */}
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      بابت / توضیحات و یادداشت
                    </label>
                    {formIsStandaloneDeposit && (
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          'واریزی بابت تسویه حساب قبلی (جدا از بارنامه)',
                          'درخواست کرایه قبل از تحویل بار (پیش‌پرداخت کرایه)',
                          'علی‌الحساب کرایه راه قبل از رسیدن به مقصد',
                          'تسویه مانده بدهی قبلی به کارت راننده'
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormDescription(preset)}
                            className="text-[10px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={formIsStandaloneDeposit ? "مثلاً: واریز حساب قبلی راننده یا پیش‌پرداخت کرایه قبل از تحویل بار..." : "مثلاً: کرایه حمل از بندرعباس به مرز میلک..."}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-white font-black text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 ${
                    formIsStandaloneDeposit
                      ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  <Check size={18} />
                  {editItem ? 'ذخیره تغییرات' : (formIsStandaloneDeposit ? 'ثبت واریزی جدا از بارنامه' : 'ثبت پرداختی بارنامه')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick Driver Picker */}
      {showDriverPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">انتخاب راننده از لیست سیستم</h3>
                  <p className="text-xs text-slate-400">جهت پر شدن آنی نام، پلاک و اطلاعات کارت و شبا</p>
                </div>
              </div>
              <button onClick={() => setShowDriverPicker(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={driverPickerSearch}
                onChange={(e) => setDriverPickerSearch(e.target.value)}
                placeholder="جستجوی نام راننده، شماره پلاک، تلفن، شماره کارت..."
                className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {pickerFilteredDrivers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  راننده‌ای با این مشخصات یافت نشد.
                </div>
              ) : (
                pickerFilteredDrivers.map(d => (
                  <div
                    key={d.id}
                    onClick={() => {
                      handleDriverSelect(d.id);
                      setShowDriverPicker(false);
                    }}
                    className="p-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                        {d.fullName}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {d.plateNumber}
                        </span>
                        {d.phone && <span>{d.phone}</span>}
                      </div>
                      {d.cardNumber && (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-1" dir="ltr">
                          کارت: {formatCardDisplay(d.cardNumber)}
                        </div>
                      )}
                      {d.isAccountHolderDriver === false && d.accountHolderName && (
                        <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                          به نام: {d.accountHolderName}
                        </div>
                      )}
                    </div>
                    <button className="px-3 py-1.5 bg-white dark:bg-slate-900 text-blue-600 group-hover:bg-blue-600 group-hover:text-white rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all">
                      انتخاب
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick Bill of Lading Picker */}
      {showBillPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">انتخاب بارنامه جهت صدور فیش پرداختی</h3>
                  <p className="text-xs text-slate-400">با انتخاب بارنامه، مشخصات راننده، وزن بار و نرخ کرایه به صورت خودکار بارگذاری می‌شود</p>
                </div>
              </div>
              <button onClick={() => setShowBillPicker(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={billPickerSearch}
                onChange={(e) => setBillPickerSearch(e.target.value)}
                placeholder="جستجوی شماره بارنامه، نام راننده، پلاک خودرو، تاریخ..."
                className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {pickerFilteredBills.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  بارنامه‌ای با این مشخصات یافت نشد.
                </div>
              ) : (
                pickerFilteredBills.map(tx => {
                  const drv = drivers.find(d => d.id === tx.driverId);
                  const bolNumber = tx.billOfLading || `BL-${tx.id.slice(-5).toUpperCase()}`;
                  const existingSettlement = driverSettlements.find(s => s.billOfLading && s.billOfLading === tx.billOfLading);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        handleBillOfLadingSelect(tx.id);
                        setShowBillPicker(false);
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-800/60 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            بارنامه: {bolNumber}
                          </span>
                          <span className="font-bold text-sm text-slate-800 dark:text-white">
                            {drv ? drv.fullName : 'راننده نامشخص'}
                          </span>
                          {drv?.plateNumber && (
                            <span className="text-[11px] font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                              {drv.plateNumber}
                            </span>
                          )}
                          {existingSettlement && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              existingSettlement.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {existingSettlement.status === 'PAID' ? '✓ تسویه شده' : '⏳ فیش در انتظار'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>تاریخ: <strong className="font-mono">{tx.date}</strong></span>
                          <span>وزن بار: <strong className="font-mono text-slate-800 dark:text-slate-200">{tx.volume} تن</strong></span>
                          {tx.freightCurrency === 'USD' && (tx.freightRateUSD || tx.freightRate) ? (
                            <span className="text-blue-600 font-mono font-bold">نرخ کرایه: ${tx.freightRateUSD || tx.freightRate}/تن</span>
                          ) : tx.freightCurrency === 'AED' && (tx.freightRateAED || tx.freightRate) ? (
                            <span className="text-amber-600 font-mono font-bold">نرخ کرایه: {tx.freightRateAED || tx.freightRate} AED/تن</span>
                          ) : tx.freightRate ? (
                            <span className="text-emerald-600 font-mono font-bold">نرخ کرایه: {tx.freightRate.toLocaleString()} ت/تن</span>
                          ) : null}
                          {tx.freightPrice ? (
                            <span>کرایه ثبت‌شده: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{tx.freightPrice.toLocaleString()} ت</strong></span>
                          ) : null}
                        </div>
                      </div>
                      <button className="px-3 py-1.5 bg-white dark:bg-slate-900 text-amber-600 group-hover:bg-amber-600 group-hover:text-white rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all shrink-0">
                        انتخاب بارنامه
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Paya / Bulk Banking Export */}
      {showPayaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <ExternalLink size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    لیست واریز پایا و ساتنا (حواله بانکی)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    فرمت متنی استاندارد جهت کپی یا ارسال به حسابداری و همراه بانک
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPayaModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                این متن شامل شماره کارت، شبا، مبلغ، نام راننده، پلاک و صاحب کارت اعلامی است و جهت واریز بدون خطا در اینترنت‌بانک استفاده می‌شود.
              </div>

              <textarea
                readOnly
                rows={10}
                className="w-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 rounded-2xl border border-slate-800 select-all outline-none leading-relaxed"
                value={filteredList.map((item, i) => {
                  const holder = item.isAccountHolderDriver !== false ? `به نام خود راننده (${item.driverName})` : `به نام: ${item.accountHolderName || 'شخص دیگر'}`;
                  return `${i + 1}. ${item.cardNumber ? `کارت: ${formatCardDisplay(item.cardNumber)} | ` : ''}${item.shebaNumber ? `شبا: ${item.shebaNumber} | ` : ''}مبلغ: ${item.amount.toLocaleString()} ت | راننده: ${item.driverName} | ${holder} | پلاک: ${item.plateNumber} | بار: ${item.cargoWeight} تن`;
                }).join('\n')}
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  تعداد کل موارد: {filteredList.length} ردیف
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const text = filteredList.map((item, i) => {
                        const holder = item.isAccountHolderDriver !== false ? `به نام خود راننده (${item.driverName})` : `به نام: ${item.accountHolderName || 'شخص دیگر'}`;
                        return `${i + 1}. ${item.cardNumber ? `کارت: ${formatCardDisplay(item.cardNumber)} | ` : ''}${item.shebaNumber ? `شبا: ${item.shebaNumber} | ` : ''}مبلغ: ${item.amount.toLocaleString()} ت | راننده: ${item.driverName} | ${holder} | پلاک: ${item.plateNumber} | بار: ${item.cargoWeight} تن`;
                      }).join('\n');
                      navigator.clipboard.writeText(text);
                      alert("متن لیست پایا و حواله‌ها کپی شد!");
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Copy size={16} />
                    کپی تمام متن
                  </button>
                  <button
                    onClick={() => setShowPayaModal(false)}
                    className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
                  >
                    بستن
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Driver Payment Voucher / Receipt */}
      {printItem && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 md:p-8 relative my-8" dir="rtl">
            <button 
              onClick={() => setPrintItem(null)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl print:hidden transition-colors"
              title="بستن پنجره"
            >
              <X size={20} />
            </button>

            {/* Printable & PDF Area */}
            <div ref={printRef} className="space-y-4">
              {renderReceiptVoucher(printItem)}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setPrintItem(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl"
              >
                بستن
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleCopyBankingText(printItem)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  title="کپی پیام مشخصات واریز"
                >
                  <Copy size={15} />
                  <span>کپی مشخصات</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
                  title="چاپ مستقیم با پرینتر سیستم"
                >
                  <Printer size={16} />
                  <span>چاپ مستقیم فیش</span>
                </button>

                <button
                  onClick={handleExportCurrentReceiptPDF}
                  disabled={isExportingPdf}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                  title="خروجی و دانلود فایل PDF رسید با jspdf و html2canvas"
                >
                  {isExportingPdf && pdfExportingId === printItem.id ? (
                    <RefreshCw size={16} className="animate-spin text-white" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>{isExportingPdf && pdfExportingId === printItem.id ? 'در حال صدور PDF...' : 'دانلود رسید PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offscreen Receipt Container for instant 1-click background PDF export */}
      {pdfTargetItem && (
        <div 
          className="fixed -left-[9999px] top-0 pointer-events-none" 
          style={{ width: '680px', backgroundColor: '#ffffff' }}
          dir="rtl"
        >
          <div ref={offscreenReceiptRef} className="p-4 bg-white">
            {renderReceiptVoucher(pdfTargetItem)}
          </div>
        </div>
      )}

      {/* Driver Debt & Loads/Prepayments Breakdown Report Modal */}
      {showDebtBreakdownModal && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0">
          <div className="w-full max-w-6xl my-auto animate-in fade-in zoom-in-95 duration-150">
            <DriverDebtBreakdownReport
              onClose={() => setShowDebtBreakdownModal(false)}
              isModal={true}
              onOpenPaymentModal={(driverId, standalone) => {
                setShowDebtBreakdownModal(false);
                handleOpenNew(standalone, standalone ? 'ADVANCE_BEFORE_DELIVERY' : 'WAYBILL');
                handleDriverSelect(driverId);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverSettlements;
