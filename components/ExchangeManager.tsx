import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  Landmark, Plus, Printer, Trash2, Calculator, FileDown, 
  History, X, Building2, Pencil, Save, FileText, 
  UserCircle, ArrowLeftRight, TrendingUp, TrendingDown, Search, Container, 
  CreditCard, CheckCircle2, Copy, Check, Share2,
  ChevronDown, ChevronUp, Scale
} from 'lucide-react';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ExchangeTransaction, ExchangePaymentItem, TransactionStatus, OpeningBalanceType, Exchange } from '../types';
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

const formatCardDisplay = (card?: string): string => {
  if (!card) return '';
  const clean = card.replace(/[^0-9]/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const numberToPersianWords = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return 'صفر تومان';
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

// Helper to compute paid and remaining Toman for a transaction
const getRemittanceSettlementSummary = (t: ExchangeTransaction) => {
  const isCreditRecord = t.isOpeningBalance && t.openingBalanceType === 'CREDIT_FROM_SARRAF';
  if (isCreditRecord) {
    return {
      payments: t.settlementPayments || [],
      totalPaid: t.amountToman || 0,
      totalPending: 0,
      remaining: 0,
      progressPercent: 100,
      isFullySettled: true,
      isCreditRecord: true
    };
  }

  const payments = t.settlementPayments || [];
  if (payments.length > 0) {
    const totalPaid = payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.paidAmountToman || p.allocatedAmountToman || 0), 0);
    const totalPending = payments
      .filter(p => p.status === 'PENDING_PAYMENT')
      .reduce((sum, p) => sum + (p.allocatedAmountToman || 0), 0);
    const remaining = Math.max(0, (t.amountToman || 0) - totalPaid);
    const progressPercent = t.amountToman > 0 ? Math.min(100, Math.round((totalPaid / t.amountToman) * 100)) : 0;
    const isFullySettled = t.amountToman > 0 && remaining === 0;
    return {
      payments,
      totalPaid,
      totalPending,
      remaining,
      progressPercent,
      isFullySettled,
      isCreditRecord: false
    };
  }
  const legacyPaid = t.status === 'completed' ? (t.amountToman || 0) : (t.totalPaidToman || 0);
  const remaining = Math.max(0, (t.amountToman || 0) - legacyPaid);
  const progressPercent = t.amountToman > 0 ? Math.min(100, Math.round((legacyPaid / t.amountToman) * 100)) : 0;
  return {
    payments: [],
    totalPaid: legacyPaid,
    totalPending: 0,
    remaining,
    progressPercent,
    isFullySettled: t.status === 'completed' && remaining === 0,
    isCreditRecord: false
  };
};

const ExchangeManager: React.FC = () => {
  const { 
    exchangeTransactions, addExchangeTransaction, updateExchangeTransaction, deleteExchangeTransaction, 
    exchangeRates, updateExchangeRates, exchanges, addExchange, updateExchange, deleteExchange,
    senders, addSender, deleteSender, receivers, addReceiver,
    getExchangeName, getReceiverBalance
  } = useData();
  
  const [activeTab, setActiveTab] = useState<'remittances' | 'bank_accounts' | 'offices' | 'parties'>('remittances');

  // Filter & Search States
  const [selectedSarrafFilter, setSelectedSarrafFilter] = useState<string>('all');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<'ALL' | 'UNSETTLED' | 'PARTIAL' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Quick Add Sarraf Modal/Inline state
  const [showQuickAddSarraf, setShowQuickAddSarraf] = useState(false);
  const [quickSarrafName, setQuickSarrafName] = useState('');
  const [quickSarrafPhone, setQuickSarrafPhone] = useState('');
  const [quickOpeningType, setQuickOpeningType] = useState<OpeningBalanceType>('NONE');
  const [quickOpeningToman, setQuickOpeningToman] = useState('');

  // Modal State: Register / Edit Opening Balance (مانده حساب قبلی صرافی: بدهکاری / بستانکاری)
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [obExchangeId, setObExchangeId] = useState('');
  const [obType, setObType] = useState<'DEBT_TO_SARRAF' | 'CREDIT_FROM_SARRAF'>('DEBT_TO_SARRAF');
  const [obInputMode, setObInputMode] = useState<'TOMAN' | 'AED'>('TOMAN');
  const [obTomanAmount, setObTomanAmount] = useState('');
  const [obAedAmount, setObAedAmount] = useState('');
  const [obAedRate, setObAedRate] = useState('');
  const [obDescription, setObDescription] = useState('');
  const [obDate, setObDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [obCreateSettlementRow, setObCreateSettlementRow] = useState(true);

  // Step 1: New Dirham Purchase / Remittance Form State
  const [selectedExchangeId, setSelectedExchangeId] = useState('');
  const [aedAmountInput, setAedAmountInput] = useState('');
  const [spotAedRateInput, setSpotAedRateInput] = useState('');
  const [spotUsdRateInput, setSpotUsdRateInput] = useState('');
  const [usdAedParityInput, setUsdAedParityInput] = useState('3.67');
  const [totalTomanInput, setTotalTomanInput] = useState('');
  const [receiverIdInput, setReceiverIdInput] = useState('');
  const [purposeInput, setPurposeInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [recordDate, setRecordDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));

  // Optional initial bank accounts sent by Sarraf during creation
  const [initialAccounts, setInitialAccounts] = useState<ExchangePaymentItem[]>([]);
  const [showInitialAccountBuilder, setShowInitialAccountBuilder] = useState(false);
  const [initHolderName, setInitHolderName] = useState('');
  const [initCardNumber, setInitCardNumber] = useState('');
  const [initShebaNumber, setInitShebaNumber] = useState('');
  const [initAccountNumber, setInitAccountNumber] = useState('');
  const [initBankName, setInitBankName] = useState('');
  const [initAllocatedToman, setInitAllocatedToman] = useState('');
  const [initIsPaidNow, setInitIsPaidNow] = useState(false);
  const [initTrackingCode, setInitTrackingCode] = useState('');
  const [initPayerNote, setInitPayerNote] = useState('');

  // Modal State for Managing / Adding Sarraf Bank Accounts & Payments on an Existing Remittance
  const [activeSettlementTxId, setActiveSettlementTxId] = useState<string | null>(null);
  const [payHolderName, setPayHolderName] = useState('');
  const [payCardNumber, setPayCardNumber] = useState('');
  const [payShebaNumber, setPayShebaNumber] = useState('');
  const [payAccountNumber, setPayAccountNumber] = useState('');
  const [payBankName, setPayBankName] = useState('');
  const [payAmountToman, setPayAmountToman] = useState('');
  const [payStatus, setPayStatus] = useState<'PAID' | 'PENDING_PAYMENT'>('PAID');
  const [payTrackingCode, setPayTrackingCode] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [editingPaymentItemId, setEditingPaymentItemId] = useState<string | null>(null);

  // Modal State for Marking a Pending Sarraf Account as Paid
  const [confirmPayModal, setConfirmPayModal] = useState<{ txId: string; item: ExchangePaymentItem } | null>(null);
  const [confirmTrackingCode, setConfirmTrackingCode] = useState('');
  const [confirmActualAmount, setConfirmActualAmount] = useState('');
  const [confirmPayerNote, setConfirmPayerNote] = useState('');

  // Printable Voucher Modal for a Remittance
  const [printVoucherTx, setPrintVoucherTx] = useState<ExchangeTransaction | null>(null);

  // Sarraf Detailed Ledger Modal
  const [ledgerSarrafId, setLedgerSarrafId] = useState<string | null>(null);

  // Forms for Offices, Senders, Receivers tabs
  const [officeForm, setOfficeForm] = useState({
    name: '',
    phone: '',
    address: '',
    openingBalanceType: 'NONE' as OpeningBalanceType,
    openingBalanceToman: '',
    openingBalanceDescription: ''
  });
  const [senderForm, setSenderForm] = useState({ name: '', phone: '' });
  const [receiverForm, setReceiverForm] = useState({ name: '', phone: '', address: '' });

  // Initialize default rates & default Sarraf selection
  useEffect(() => {
    if (!spotAedRateInput && exchangeRates.aed) {
      setSpotAedRateInput(exchangeRates.aed.toString());
    }
    if (!obAedRate && exchangeRates.aed) {
      setObAedRate(exchangeRates.aed.toString());
    }
    if (!spotUsdRateInput && exchangeRates.usd) {
      setSpotUsdRateInput(exchangeRates.usd.toString());
    }
    if (exchangeRates.usdAed) {
      setUsdAedParityInput(exchangeRates.usdAed.toString());
    }
  }, [exchangeRates]);

  useEffect(() => {
    if (!selectedExchangeId && exchanges.length > 0) {
      setSelectedExchangeId(exchanges[0].id);
    }
    if (!obExchangeId && exchanges.length > 0) {
      setObExchangeId(exchanges[0].id);
    }
  }, [exchanges, selectedExchangeId, obExchangeId]);

  // Open Opening Balance Modal for a specific Sarraf or default
  const handleOpenOpeningBalanceModal = (sarraf?: Exchange) => {
    const target = sarraf || exchanges.find(e => e.id === selectedExchangeId) || exchanges[0];
    if (target) {
      setObExchangeId(target.id);
      if (target.openingBalanceType && target.openingBalanceType !== 'NONE') {
        setObType(target.openingBalanceType);
      } else {
        setObType('DEBT_TO_SARRAF');
      }
      setObTomanAmount(target.openingBalanceToman ? target.openingBalanceToman.toString() : '');
      setObAedAmount(target.openingBalanceAed ? target.openingBalanceAed.toString() : '');
      setObAedRate(target.openingBalanceRate ? target.openingBalanceRate.toString() : (exchangeRates.aed ? exchangeRates.aed.toString() : '18000'));
      setObDescription(target.openingBalanceDescription || '');
    }
    setShowOpeningBalanceModal(true);
  };

  // Save Opening Balance (مانده حساب قبلی صرافی به صورت بدهکاری یا بستانکاری)
  const handleSaveOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obExchangeId) {
      alert('لطفاً صراف مورد نظر را انتخاب کنید.');
      return;
    }

    const aedNum = parseFloat(obAedAmount) || 0;
    const rateNum = parseFloat(obAedRate) || exchangeRates.aed || 18000;
    const tomanNum = obInputMode === 'AED'
      ? Math.round(aedNum * rateNum)
      : (parseFloat(obTomanAmount) || 0);

    if (tomanNum <= 0) {
      alert('لطفاً مبلغ مانده حساب قبلی را وارد کنید.');
      return;
    }

    const dateStr = obDate ? obDate.format("YYYY/MM/DD HH:mm") : new Date().toLocaleDateString('fa-IR');
    const descStr = obDescription.trim() || (
      obType === 'DEBT_TO_SARRAF'
        ? 'مانده بدهکاری از حساب قبلی به صرافی'
        : 'مانده بستانکاری (طلب ما) از حساب قبلی نزد صرافی'
    );

    if (obCreateSettlementRow) {
      // ثبت به عنوان سند مانده حساب قبلی در لیست حواله‌ها و کاردکس (با قابلیت تسویه از طریق کارت‌های صراف در صورت بدهکاری)
      addExchangeTransaction({
        exchangeId: obExchangeId,
        senderId: senders[0]?.id || 'company',
        amountToman: tomanNum,
        aedRate: obInputMode === 'AED' ? rateNum : 0,
        aedAmount: obInputMode === 'AED' ? aedNum : 0,
        actualDeliveredAmount: obInputMode === 'AED' ? aedNum : 0,
        aedDepositDate: dateStr.split(' ')[0],
        aedDeliveryDate: dateStr.split(' ')[0],
        receiverName: obType === 'DEBT_TO_SARRAF' ? 'مانده حساب قبلی (بدهکاری به صراف)' : 'مانده حساب قبلی (بستانکاری از صراف)',
        accountHolder: obType === 'DEBT_TO_SARRAF' ? 'در انتظار تسویه با کارت‌های صراف' : 'بستانکاری از قبل',
        date: dateStr,
        description: descStr,
        status: obType === 'CREDIT_FROM_SARRAF' ? 'completed' : 'debt',
        debtor: obType === 'DEBT_TO_SARRAF' ? 'sender' : 'exchange',
        debtCurrency: 'TOMAN',
        settlementPayments: [],
        totalPaidToman: 0,
        remainingToman: obType === 'DEBT_TO_SARRAF' ? tomanNum : 0,
        isOpeningBalance: true,
        openingBalanceType: obType
      });
    } else {
      // ذخیره مستقیم روی پروفایل صراف
      updateExchange(obExchangeId, {
        openingBalanceType: obType,
        openingBalanceToman: tomanNum,
        openingBalanceAed: obInputMode === 'AED' ? aedNum : undefined,
        openingBalanceRate: obInputMode === 'AED' ? rateNum : undefined,
        openingBalanceDate: dateStr,
        openingBalanceDescription: descStr
      });
    }

    setShowOpeningBalanceModal(false);
    setObTomanAmount('');
    setObAedAmount('');
    setObDescription('');
  };

  // Auto-calculate Total Toman when AED Amount or Spot AED Rate changes
  const recalculateTotalToman = (aedValStr: string, rateValStr: string) => {
    const aed = parseFloat(aedValStr) || 0;
    const rate = parseFloat(rateValStr) || 0;
    if (aed > 0 && rate > 0) {
      setTotalTomanInput(Math.round(aed * rate).toString());
    } else {
      setTotalTomanInput('');
    }
  };

  // Calculate Spot AED Rate from Spot USD Rate & 3.67 Parity
  const handleCalculateAedRateFromUsd = (usdStr: string, parityStr: string) => {
    setSpotUsdRateInput(usdStr);
    setUsdAedParityInput(parityStr);
    const usd = parseFloat(usdStr) || 0;
    const parity = parseFloat(parityStr) || 3.67;
    if (usd > 0 && parity > 0) {
      const derivedAedRate = Math.round(usd / parity);
      setSpotAedRateInput(derivedAedRate.toString());
      recalculateTotalToman(aedAmountInput, derivedAedRate.toString());
    }
  };

  // Copy helper
  const handleCopyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Quick Add Sarraf (e.g., Majid) with optional opening balance
  const handleQuickAddSarrafSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSarrafName.trim()) return;
    const openToman = parseFloat(quickOpeningToman) || 0;
    addExchange({
      name: quickSarrafName.trim(),
      phone: quickSarrafPhone.trim() || '-',
      address: 'صرافی طرف قرارداد',
      openingBalanceType: openToman > 0 ? quickOpeningType : 'NONE',
      openingBalanceToman: openToman > 0 ? openToman : 0,
      openingBalanceDate: new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD"),
      openingBalanceDescription: openToman > 0
        ? (quickOpeningType === 'DEBT_TO_SARRAF' ? 'مانده بدهکاری از قبل' : 'مانده بستانکاری از قبل')
        : undefined
    });
    setQuickSarrafName('');
    setQuickSarrafPhone('');
    setQuickOpeningType('NONE');
    setQuickOpeningToman('');
    setShowQuickAddSarraf(false);
  };

  // Add an initial account during remittance creation
  const handleAddInitialAccount = () => {
    const amountNum = parseFloat(initAllocatedToman) || 0;
    if (!initHolderName.trim() && !initCardNumber.trim() && !initShebaNumber.trim()) {
      alert('لطفاً نام صاحب حساب یا شماره کارت / شبا ارسالی صراف را وارد کنید.');
      return;
    }
    if (amountNum <= 0) {
      alert('لطفاً مبلغ تعیین‌شده برای این حساب را به تومان وارد کنید.');
      return;
    }

    const cleanCard = initCardNumber.replace(/[^0-9]/g, '');
    const cleanSheba = initShebaNumber.toUpperCase().replace(/\s+/g, '');
    const detectedBank = initBankName.trim() || detectBankFromCard(cleanCard) || detectBankFromSheba(cleanSheba) || 'بانک';

    const newItem: ExchangePaymentItem = {
      id: 'ep-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      accountHolderName: initHolderName.trim() || 'حساب معرفی‌شده صراف',
      cardNumber: cleanCard || undefined,
      shebaNumber: cleanSheba || undefined,
      accountNumber: initAccountNumber.trim() || undefined,
      bankName: detectedBank,
      allocatedAmountToman: amountNum,
      paidAmountToman: initIsPaidNow ? amountNum : 0,
      status: initIsPaidNow ? 'PAID' : 'PENDING_PAYMENT',
      paymentDate: initIsPaidNow ? (recordDate?.format("YYYY/MM/DD HH:mm") || new Date().toLocaleDateString('fa-IR')) : undefined,
      trackingCode: initTrackingCode.trim() || undefined,
      payerNote: initPayerNote.trim() || undefined
    };

    setInitialAccounts(prev => [...prev, newItem]);
    setInitHolderName('');
    setInitCardNumber('');
    setInitShebaNumber('');
    setInitAccountNumber('');
    setInitBankName('');
    setInitAllocatedToman('');
    setInitTrackingCode('');
    setInitPayerNote('');
  };

  // Submit New Dirham Purchase / Remittance from Sarraf
  const handleCreateRemittance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExchangeId) {
      alert('لطفاً ابتدا صراف (مثلاً مجید) را انتخاب یا اضافه کنید.');
      return;
    }
    const aedNum = parseFloat(aedAmountInput) || 0;
    const rateNum = parseFloat(spotAedRateInput) || 0;
    const tomanNum = parseFloat(totalTomanInput) || Math.round(aedNum * rateNum);

    if (aedNum <= 0 || rateNum <= 0 || tomanNum <= 0) {
      alert('لطفاً مقدار درهم دریافتی و نرخ لحظه‌ای درهم را به درستی وارد کنید.');
      return;
    }

    const totalInitialPaid = initialAccounts
      .filter(a => a.status === 'PAID')
      .reduce((sum, a) => sum + (a.paidAmountToman || a.allocatedAmountToman || 0), 0);
    const remaining = Math.max(0, tomanNum - totalInitialPaid);

    const status: TransactionStatus = remaining === 0
      ? 'completed'
      : totalInitialPaid > 0
        ? 'pending'
        : 'debt';

    const selectedReceiver = receivers.find(r => r.id === receiverIdInput);
    const dateFormatted = recordDate ? recordDate.format("YYYY/MM/DD HH:mm") : new Date().toLocaleDateString('fa-IR');

    const accountsSummary = initialAccounts.length > 0
      ? initialAccounts.map(a => `${a.accountHolderName} (${a.bankName})`).join(' ، ')
      : 'در انتظار اعلام حساب/کارت توسط صراف';

    addExchangeTransaction({
      exchangeId: selectedExchangeId,
      senderId: senders[0]?.id || 'company',
      receiverId: receiverIdInput || undefined,
      amountToman: tomanNum,
      aedRate: rateNum,
      usdRateAtTime: parseFloat(spotUsdRateInput) || undefined,
      aedAmount: aedNum,
      actualDeliveredAmount: aedNum,
      aedDepositDate: dateFormatted.split(' ')[0],
      aedDeliveryDate: dateFormatted.split(' ')[0],
      receiverName: selectedReceiver?.name || purposeInput.trim() || 'دریافت درهم از صراف',
      accountHolder: accountsSummary,
      date: dateFormatted,
      description: descriptionInput.trim() || `دریافت ${aedNum.toLocaleString()} درهم با نرخ لحظه‌ای ${rateNum.toLocaleString()} تومان`,
      status,
      debtor: remaining > 0 ? 'sender' : undefined,
      debtCurrency: 'TOMAN',
      settlementPayments: initialAccounts,
      totalPaidToman: totalInitialPaid,
      remainingToman: remaining
    });

    setAedAmountInput('');
    setTotalTomanInput('');
    setPurposeInput('');
    setDescriptionInput('');
    setInitialAccounts([]);
    setShowInitialAccountBuilder(false);
    setRecordDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  // Open Settlement Account Modal for a specific Remittance
  const handleOpenAddPaymentModal = (tx: ExchangeTransaction, editItem?: ExchangePaymentItem) => {
    setActiveSettlementTxId(tx.id);
    const summary = getRemittanceSettlementSummary(tx);
    if (editItem) {
      setEditingPaymentItemId(editItem.id);
      setPayHolderName(editItem.accountHolderName);
      setPayCardNumber(formatCardDisplay(editItem.cardNumber));
      setPayShebaNumber(editItem.shebaNumber || '');
      setPayAccountNumber(editItem.accountNumber || '');
      setPayBankName(editItem.bankName || '');
      setPayAmountToman((editItem.paidAmountToman || editItem.allocatedAmountToman || 0).toString());
      setPayStatus(editItem.status);
      setPayTrackingCode(editItem.trackingCode || '');
      setPayNote(editItem.payerNote || '');
    } else {
      setEditingPaymentItemId(null);
      setPayHolderName('');
      setPayCardNumber('');
      setPayShebaNumber('');
      setPayAccountNumber('');
      setPayBankName('');
      setPayAmountToman(summary.remaining > 0 ? summary.remaining.toString() : '');
      setPayStatus('PAID');
      setPayTrackingCode('');
      setPayNote('');
      setPayDate(new DateObject({ calendar: persian, locale: persian_fa }));
    }
  };

  // Save Bank Account / Payment Item onto a Remittance
  const handleSavePaymentOnRemittance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSettlementTxId) return;
    const tx = exchangeTransactions.find(t => t.id === activeSettlementTxId);
    if (!tx) return;

    const amountNum = parseFloat(payAmountToman) || 0;
    if (amountNum <= 0) {
      alert('لطفاً مبلغ اختصاص‌یافته یا واریزی به این حساب را وارد کنید.');
      return;
    }
    if (!payHolderName.trim() && !payCardNumber.trim() && !payShebaNumber.trim() && !payAccountNumber.trim()) {
      alert('لطفاً حداقل نام صاحب حساب یا شماره کارت/شبا/حساب ارسالی صراف را وارد کنید.');
      return;
    }

    const cleanCard = payCardNumber.replace(/[^0-9]/g, '');
    const cleanSheba = payShebaNumber.toUpperCase().replace(/\s+/g, '');
    const detectedBank = payBankName.trim() || detectBankFromCard(cleanCard) || detectBankFromSheba(cleanSheba) || 'بانک';
    const dateStr = payDate ? payDate.format("YYYY/MM/DD HH:mm") : new Date().toLocaleDateString('fa-IR');

    const existingPayments = tx.settlementPayments || [];
    let updatedPayments: ExchangePaymentItem[];

    if (editingPaymentItemId) {
      updatedPayments = existingPayments.map(item => {
        if (item.id !== editingPaymentItemId) return item;
        return {
          ...item,
          accountHolderName: payHolderName.trim() || 'حساب معرفی‌شده صراف',
          cardNumber: cleanCard || undefined,
          shebaNumber: cleanSheba || undefined,
          accountNumber: payAccountNumber.trim() || undefined,
          bankName: detectedBank,
          allocatedAmountToman: amountNum,
          paidAmountToman: payStatus === 'PAID' ? amountNum : 0,
          status: payStatus,
          paymentDate: payStatus === 'PAID' ? (item.paymentDate || dateStr) : undefined,
          trackingCode: payTrackingCode.trim() || undefined,
          payerNote: payNote.trim() || undefined
        };
      });
    } else {
      const newPayment: ExchangePaymentItem = {
        id: 'ep-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        accountHolderName: payHolderName.trim() || 'حساب معرفی‌شده صراف',
        cardNumber: cleanCard || undefined,
        shebaNumber: cleanSheba || undefined,
        accountNumber: payAccountNumber.trim() || undefined,
        bankName: detectedBank,
        allocatedAmountToman: amountNum,
        paidAmountToman: payStatus === 'PAID' ? amountNum : 0,
        status: payStatus,
        paymentDate: payStatus === 'PAID' ? dateStr : undefined,
        trackingCode: payTrackingCode.trim() || undefined,
        payerNote: payNote.trim() || undefined
      };
      updatedPayments = [...existingPayments, newPayment];
    }

    const totalPaid = updatedPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.paidAmountToman || p.allocatedAmountToman || 0), 0);
    const remaining = Math.max(0, (tx.amountToman || 0) - totalPaid);
    const newStatus: TransactionStatus = remaining === 0
      ? 'completed'
      : totalPaid > 0
        ? 'pending'
        : 'debt';

    const accountsSummary = updatedPayments
      .map(a => `${a.accountHolderName} (${a.bankName})`)
      .join(' ، ');

    updateExchangeTransaction(tx.id, {
      settlementPayments: updatedPayments,
      totalPaidToman: totalPaid,
      remainingToman: remaining,
      status: newStatus,
      accountHolder: accountsSummary || tx.accountHolder
    });

    setActiveSettlementTxId(null);
    setEditingPaymentItemId(null);
  };

  // Mark a Pending Sarraf Account as Paid
  const handleConfirmPendingAccountPaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPayModal) return;
    const { txId, item } = confirmPayModal;
    const tx = exchangeTransactions.find(t => t.id === txId);
    if (!tx) return;

    const paidVal = parseFloat(confirmActualAmount) || item.allocatedAmountToman;
    const nowStr = new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD HH:mm");

    const updatedPayments = (tx.settlementPayments || []).map(p => {
      if (p.id !== item.id) return p;
      return {
        ...p,
        paidAmountToman: paidVal,
        allocatedAmountToman: paidVal,
        status: 'PAID' as const,
        paymentDate: nowStr,
        trackingCode: confirmTrackingCode.trim() || p.trackingCode,
        payerNote: confirmPayerNote.trim() || p.payerNote
      };
    });

    const totalPaid = updatedPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.paidAmountToman || p.allocatedAmountToman || 0), 0);
    const remaining = Math.max(0, (tx.amountToman || 0) - totalPaid);
    const newStatus: TransactionStatus = remaining === 0
      ? 'completed'
      : totalPaid > 0
        ? 'pending'
        : 'debt';

    updateExchangeTransaction(tx.id, {
      settlementPayments: updatedPayments,
      totalPaidToman: totalPaid,
      remainingToman: remaining,
      status: newStatus
    });

    setConfirmPayModal(null);
    setConfirmTrackingCode('');
    setConfirmActualAmount('');
    setConfirmPayerNote('');
  };

  // Delete a specific bank account/payment item from a remittance
  const handleDeletePaymentItem = (tx: ExchangeTransaction, paymentId: string) => {
    if (!window.confirm('آیا از حذف این ردیف حساب/واریزی اطمینان دارید؟')) return;
    const updatedPayments = (tx.settlementPayments || []).filter(p => p.id !== paymentId);
    const totalPaid = updatedPayments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.paidAmountToman || p.allocatedAmountToman || 0), 0);
    const remaining = Math.max(0, (tx.amountToman || 0) - totalPaid);
    const newStatus: TransactionStatus = remaining === 0
      ? 'completed'
      : totalPaid > 0
        ? 'pending'
        : 'debt';

    updateExchangeTransaction(tx.id, {
      settlementPayments: updatedPayments,
      totalPaidToman: totalPaid,
      remainingToman: remaining,
      status: newStatus
    });
  };

  // Copy full WhatsApp settlement report for the Sarraf (e.g. Majid)
  const handleCopyWhatsAppReportForSarraf = (tx: ExchangeTransaction) => {
    const sarrafName = getExchangeName(tx.exchangeId);
    const summary = getRemittanceSettlementSummary(tx);

    const paymentsLines = summary.payments.length > 0
      ? summary.payments.map((p, idx) => {
          const st = p.status === 'PAID' ? '✅ واریز شد' : '⏳ در انتظار واریز';
          const cardInfo = p.cardNumber ? ` | کارت: ${formatCardDisplay(p.cardNumber)}` : '';
          const shebaInfo = p.shebaNumber ? ` | شبا: ${p.shebaNumber}` : '';
          const trackInfo = p.trackingCode ? ` | کد رهگیری: ${p.trackingCode}` : '';
          const amt = (p.status === 'PAID' ? p.paidAmountToman : p.allocatedAmountToman).toLocaleString();
          return `${idx + 1}. ${p.accountHolderName} (${p.bankName || 'بانک'}) - مبلغ: ${amt} تومان (${st})${cardInfo}${shebaInfo}${trackInfo}`;
        }).join('\n')
      : 'هنوز واریزی ثبت نشده است.';

    const titleLine = tx.isOpeningBalance
      ? `📋 صورت‌وضعیت مانده حساب قبلی (${tx.openingBalanceType === 'CREDIT_FROM_SARRAF' ? 'بستانکاری از صراف' : 'بدهکاری به صراف'})`
      : `📋 صورت‌وضعیت تسویه حواله درهم صرافی`;

    const text = `${titleLine}
👤 صراف: ${sarrafName}
📅 تاریخ: ${tx.date}
${tx.aedAmount > 0 ? `💵 مقدار درهم: ${tx.aedAmount.toLocaleString()} درهم (AED) | نرخ: ${tx.aedRate.toLocaleString()} تومان\n` : ''}💰 مبلغ کل: ${tx.amountToman.toLocaleString()} تومان

🏦 لیست واریزی‌ها به حساب‌ها/کارت‌های اعلامی شما:
${paymentsLines}

✅ مجموع واریزشده: ${summary.totalPaid.toLocaleString()} تومان
📌 مانده این ردیف: ${summary.remaining.toLocaleString()} تومان (${summary.isFullySettled ? 'تسویه کامل' : 'در حال تسویه'})`;

    navigator.clipboard.writeText(text);
    alert(`گزارش کامل تسویه برای ارسال به «${sarrafName}» در حافظه کپی شد.`);
  };

  // Filtered Remittances
  const filteredRemittances = useMemo(() => {
    return [...exchangeTransactions]
      .reverse()
      .filter(tx => {
        if (selectedSarrafFilter !== 'all' && tx.exchangeId !== selectedSarrafFilter) return false;

        const summary = getRemittanceSettlementSummary(tx);
        if (settlementStatusFilter === 'SETTLED' && !summary.isFullySettled) return false;
        if (settlementStatusFilter === 'UNSETTLED' && summary.isFullySettled) return false;
        if (settlementStatusFilter === 'PARTIAL' && (summary.isFullySettled || summary.totalPaid === 0)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const sarraf = getExchangeName(tx.exchangeId).toLowerCase();
          const rec = (tx.receiverName || '').toLowerCase();
          const desc = (tx.description || '').toLowerCase();
          const paymentMatch = (tx.settlementPayments || []).some(p =>
            (p.accountHolderName || '').toLowerCase().includes(q) ||
            (p.cardNumber || '').includes(q) ||
            (p.shebaNumber || '').toLowerCase().includes(q) ||
            (p.trackingCode || '').toLowerCase().includes(q) ||
            (p.bankName || '').toLowerCase().includes(q)
          );
          if (!sarraf.includes(q) && !rec.includes(q) && !desc.includes(q) && !paymentMatch) {
            return false;
          }
        }
        return true;
      });
  }, [exchangeTransactions, selectedSarrafFilter, settlementStatusFilter, searchQuery, getExchangeName]);

  // Per-Sarraf Summary including Opening Balance (بدهکاری / بستانکاری قبلی)
  const sarrafSummaries = useMemo(() => {
    return exchanges.map(ex => {
      const txs = exchangeTransactions.filter(t => t.exchangeId === ex.id);
      let totalAed = 0;
      let totalDebitToman = 0; // کل بدهی ما به صراف (حواله‌های دریافتی + مانده بدهی قبلی)
      let totalCreditToman = 0; // کل بستانکاری ما از صراف (واریزی‌ها به کارت‌های صراف + مانده بستانکاری قبلی)
      let paidViaCardsToman = 0;
      let openingDebitToman = ex.openingBalanceType === 'DEBT_TO_SARRAF' ? (ex.openingBalanceToman || 0) : 0;
      let openingCreditToman = ex.openingBalanceType === 'CREDIT_FROM_SARRAF' ? (ex.openingBalanceToman || 0) : 0;
      let cardsCount = 0;

      totalDebitToman += openingDebitToman;
      totalCreditToman += openingCreditToman;

      txs.forEach(t => {
        const s = getRemittanceSettlementSummary(t);
        if (t.isOpeningBalance) {
          if (t.openingBalanceType === 'CREDIT_FROM_SARRAF') {
            openingCreditToman += t.amountToman || 0;
            totalCreditToman += t.amountToman || 0;
          } else {
            openingDebitToman += t.amountToman || 0;
            totalDebitToman += t.amountToman || 0;
            paidViaCardsToman += s.totalPaid;
            totalCreditToman += s.totalPaid;
          }
        } else {
          totalAed += t.aedAmount || 0;
          totalDebitToman += t.amountToman || 0;
          paidViaCardsToman += s.totalPaid;
          totalCreditToman += s.totalPaid;
        }
        cardsCount += s.payments.length;
      });

      // netBalance > 0 means we owe the Sarraf (بدهکار به صراف)
      // netBalance < 0 means we have credit with the Sarraf (بستانکار از صراف)
      const netBalanceToman = totalDebitToman - totalCreditToman;
      const remainingToman = Math.max(0, netBalanceToman);
      const creditWithSarrafToman = netBalanceToman < 0 ? Math.abs(netBalanceToman) : 0;

      return {
        ...ex,
        txCount: txs.length,
        totalAed,
        totalToman: totalDebitToman,
        paidToman: paidViaCardsToman,
        openingDebitToman,
        openingCreditToman,
        netBalanceToman,
        remainingToman,
        creditWithSarrafToman,
        cardsCount
      };
    });
  }, [exchanges, exchangeTransactions]);

  // Global KPI Summary across all Sarrafs & Remittances
  const globalStats = useMemo(() => {
    let totalAedReceived = 0;
    let totalDebitToman = 0;
    let totalPaidViaCards = 0;
    let totalOpeningCredit = 0;
    let totalNetDebtToSarrafs = 0;
    let totalNetCreditFromSarrafs = 0;
    let pendingCardsCount = 0;

    sarrafSummaries.forEach(s => {
      totalAedReceived += s.totalAed;
      totalDebitToman += s.totalToman;
      totalPaidViaCards += s.paidToman;
      totalOpeningCredit += s.openingCreditToman;
      if (s.netBalanceToman > 0) {
        totalNetDebtToSarrafs += s.netBalanceToman;
      } else if (s.netBalanceToman < 0) {
        totalNetCreditFromSarrafs += Math.abs(s.netBalanceToman);
      }
    });

    exchangeTransactions.forEach(tx => {
      const s = getRemittanceSettlementSummary(tx);
      pendingCardsCount += s.payments.filter(p => p.status === 'PENDING_PAYMENT').length;
    });

    return {
      totalAedReceived,
      totalTomanPayable: totalDebitToman,
      totalTomanPaid: totalPaidViaCards,
      totalOpeningCredit,
      totalTomanRemaining: totalNetDebtToSarrafs,
      totalNetCreditFromSarrafs,
      pendingCardsCount
    };
  }, [sarrafSummaries, exchangeTransactions]);

  // Flattened list of all bank cards/accounts sent by Sarrafs across all remittances
  const allSarrafBankAccounts = useMemo(() => {
    const list: Array<{
      txId: string;
      txDate: string;
      exchangeId: string;
      sarrafName: string;
      aedAmount: number;
      aedRate: number;
      payment: ExchangePaymentItem;
    }> = [];

    [...exchangeTransactions].reverse().forEach(tx => {
      const sarrafName = getExchangeName(tx.exchangeId);
      (tx.settlementPayments || []).forEach(p => {
        list.push({
          txId: tx.id,
          txDate: tx.date,
          exchangeId: tx.exchangeId,
          sarrafName,
          aedAmount: tx.aedAmount,
          aedRate: tx.aedRate,
          payment: p
        });
      });
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(item =>
      item.sarrafName.toLowerCase().includes(q) ||
      (item.payment.accountHolderName || '').toLowerCase().includes(q) ||
      (item.payment.cardNumber || '').includes(q) ||
      (item.payment.shebaNumber || '').toLowerCase().includes(q) ||
      (item.payment.bankName || '').toLowerCase().includes(q) ||
      (item.payment.trackingCode || '').toLowerCase().includes(q)
    );
  }, [exchangeTransactions, getExchangeName, searchQuery]);

  // Office, Sender, Receiver form handlers
  const handleOfficeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeForm.name.trim()) return alert("نام صراف / صرافی الزامی است.");
    const openToman = parseFloat(officeForm.openingBalanceToman) || 0;
    addExchange({
      name: officeForm.name.trim(),
      phone: officeForm.phone.trim(),
      address: officeForm.address.trim(),
      openingBalanceType: openToman > 0 ? officeForm.openingBalanceType : 'NONE',
      openingBalanceToman: openToman > 0 ? openToman : 0,
      openingBalanceDate: new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD"),
      openingBalanceDescription: officeForm.openingBalanceDescription.trim() || undefined
    });
    setOfficeForm({
      name: '',
      phone: '',
      address: '',
      openingBalanceType: 'NONE',
      openingBalanceToman: '',
      openingBalanceDescription: ''
    });
  };

  const handleSenderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderForm.name.trim()) return alert("نام فرستنده الزامی است.");
    addSender(senderForm);
    setSenderForm({ name: '', phone: '' });
  };

  const handleReceiverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverForm.name.trim()) return alert("نام تحویل‌گیرنده الزامی است.");
    addReceiver(receiverForm);
    setReceiverForm({ name: '', phone: '', address: '' });
  };

  // Export PDF for Voucher
  const handleDownloadVoucherPdf = async (tx: ExchangeTransaction) => {
    const input = document.getElementById('sarraf-remittance-voucher-print');
    if (!input) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
      pdf.save(`تسویه_صرافی_${getExchangeName(tx.exchangeId)}_${tx.date.split(' ')[0].replace(/\//g, '-')}.pdf`);
    } catch {
      alert('خطا در تولید فایل PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeSettlementTx = activeSettlementTxId
    ? exchangeTransactions.find(t => t.id === activeSettlementTxId) || null
    : null;

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">مجموع درهم دریافتی از صراف‌ها</p>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1" dir="ltr">
              {globalStats.totalAedReceived.toLocaleString()} <span className="text-xs font-bold">AED</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">در {exchangeTransactions.length} سند ثبت‌شده</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Landmark size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">کل بدهی ایجادی + مانده قبلی</p>
            <div className="text-xl font-black text-slate-800 dark:text-white font-mono mt-1" dir="ltr">
              {globalStats.totalTomanPayable.toLocaleString()} <span className="text-xs font-normal text-slate-400">تومان</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">مجموع حواله‌ها و بدهی اول دوره</p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <Calculator size={24} />
          </div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">واریزی به کارت‌ها + بستانکاری قبلی</p>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1" dir="ltr">
              {(globalStats.totalTomanPaid + globalStats.totalOpeningCredit).toLocaleString()} <span className="text-xs font-normal">تومان</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1">
              {globalStats.totalNetCreditFromSarrafs > 0
                ? `طلب ما از صراف: ${globalStats.totalNetCreditFromSarrafs.toLocaleString()} ت`
                : 'مجموع پرداختی و بستانکاری ما'}
            </p>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300">مانده بدهی خالص به صراف‌ها</p>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1" dir="ltr">
              {globalStats.totalTomanRemaining.toLocaleString()} <span className="text-xs font-normal">تومان</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-500 mt-1">
              {globalStats.pendingCardsCount > 0
                ? `${globalStats.pendingCardsCount} شماره کارت صراف منتظر واریز`
                : 'قابل تسویه با کارت‌های ارسالی صراف'}
            </p>
          </div>
          <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Opening Balance Quick Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('remittances')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'remittances'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight size={16} />
            <span>دریافت درهم و تسویه با کارت‌های صراف</span>
          </button>

          <button
            onClick={() => setActiveTab('bank_accounts')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bank_accounts'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CreditCard size={16} />
            <span>لیست کارت‌ها و شباهای ارسالی صراف</span>
            {allSarrafBankAccounts.length > 0 && (
              <span className="text-[11px] font-mono opacity-75">({allSarrafBankAccounts.length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('offices')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'offices'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Landmark size={16} />
            <span>کاردکس صراف‌ها (مجید و...)</span>
          </button>

          <button
            onClick={() => setActiveTab('parties')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parties'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Container size={16} />
            <span>تحویل‌گیرندگان و اشخاص</span>
          </button>
        </div>

        {/* دکمه ثبت مانده حساب قبلی صرافی (بدهکاری / بستانکاری) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenOpeningBalanceModal()}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Scale size={16} />
            <span>ثبت مانده حساب قبلی صرافی (بدهکاری / بستانکاری)</span>
          </button>
        </div>
      </div>

      {/* Quick Sarraf Selector Bar */}
      {exchanges.length > 0 && activeTab === 'remittances' && (
        <div className="flex items-center gap-1.5 flex-wrap print:hidden">
          <span className="text-xs font-bold text-slate-500">فیلتر صراف:</span>
          <button
            onClick={() => setSelectedSarrafFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSarrafFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-700'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            همه صراف‌ها
          </button>
          {sarrafSummaries.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSarrafFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedSarrafFilter === s.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
              }`}
            >
              <span>{s.name}</span>
              {s.netBalanceToman > 0 && (
                <span className={`text-[10px] font-mono ${selectedSarrafFilter === s.id ? 'text-indigo-100' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
                  (بدهکار: {(s.netBalanceToman / 1000000).toFixed(1)}M)
                </span>
              )}
              {s.netBalanceToman < 0 && (
                <span className={`text-[10px] font-mono ${selectedSarrafFilter === s.id ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`} dir="ltr">
                  (بستانکار: {(Math.abs(s.netBalanceToman) / 1000000).toFixed(1)}M)
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* TAB 1: REMITTANCES & MULTI-CARD SETTLEMENT WORKFLOW */}
      {activeTab === 'remittances' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Step 1 Card: Receive Dirham from Sarraf at Spot Rate */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                  <Landmark size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    گام ۱: دریافت درهم از صراف (با نرخ لحظه‌ای)
                  </h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    ابتدا مقدار درهم دریافتی از صراف (مثلاً مجید) و نرخ همان لحظه را ثبت کنید؛ سپس شماره حساب‌ها یا کارت‌هایی که صراف می‌فرستد را واریز و تسویه نمایید.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleOpenOpeningBalanceModal()}
                  className="px-3.5 py-2 bg-amber-500/90 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Scale size={15} />
                  <span>ثبت مانده قبلی (بدهکار / بستانکار)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAddSarraf(!showQuickAddSarraf)}
                  className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-white/20"
                >
                  <Plus size={15} />
                  <span>تعریف سریع صراف جدید (مثلاً مجید)</span>
                </button>
              </div>
            </div>

            {/* Inline Quick Add Sarraf */}
            {showQuickAddSarraf && (
              <form
                onSubmit={handleQuickAddSarrafSubmit}
                className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end gap-3"
              >
                <div>
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">نام صراف / صرافی *</label>
                  <input
                    type="text"
                    required
                    value={quickSarrafName}
                    onChange={e => setQuickSarrafName(e.target.value)}
                    placeholder="مثال: مجید (صراف)..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">شماره تماس / واتساپ</label>
                  <input
                    type="text"
                    value={quickSarrafPhone}
                    onChange={e => setQuickSarrafPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">وضعیت مانده حساب قبلی</label>
                  <select
                    value={quickOpeningType}
                    onChange={e => setQuickOpeningType(e.target.value as OpeningBalanceType)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="NONE">بدون مانده قبلی (صفر)</option>
                    <option value="DEBT_TO_SARRAF">بدهکار به صراف (ما بدهکاریم)</option>
                    <option value="CREDIT_FROM_SARRAF">بستانکار از صراف (ما طلبکاریم)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">مبلغ مانده قبلی (تومان)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    disabled={quickOpeningType === 'NONE'}
                    value={formatNumberInput(quickOpeningToman)}
                    onChange={e => setQuickOpeningToman(cleanNumberInput(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none disabled:opacity-50 text-left"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    ذخیره صراف
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddSarraf(false)}
                    className="px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
                  >
                    بستن
                  </button>
                </div>
              </form>
            )}

            <form onSubmit={handleCreateRemittance} className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* انتخاب صراف */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    انتخاب صراف (تحویل‌دهنده درهم) <span className="text-red-500">*</span>
                  </label>
                  {exchanges.length === 0 ? (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-amber-800 dark:text-amber-300 font-bold">صرافی ثبت نشده است</span>
                      <button
                        type="button"
                        onClick={() => {
                          addExchange({ name: 'مجید (صراف)', phone: '', address: 'صرافی' });
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold"
                      >
                        + افزودن «مجید»
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedExchangeId}
                      onChange={e => setSelectedExchangeId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- انتخاب صراف --</option>
                      {exchanges.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* مقدار درهم دریافتی */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مقدار درهم دریافتی از صراف (AED) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      required
                      value={formatNumberInput(aedAmountInput)}
                      onChange={e => {
                        const cleaned = cleanNumberInput(e.target.value);
                        setAedAmountInput(cleaned);
                        recalculateTotalToman(cleaned, spotAedRateInput);
                      }}
                      placeholder="مثال: 50,000"
                      className="w-full p-2.5 pl-14 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-indigo-700 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-500">AED</span>
                  </div>
                </div>

                {/* نرخ لحظه‌ای درهم به تومان */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      نرخ همان لحظه درهم (تومان) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const rateNum = parseFloat(spotAedRateInput) || 0;
                        if (rateNum > 0) {
                          updateExchangeRates({
                            ...exchangeRates,
                            aed: rateNum
                          });
                        }
                      }}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      title="ذخیره به عنوان نرخ پیش‌فرض سیستم"
                    >
                      ذخیره در نرخ روز
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      required
                      value={formatNumberInput(spotAedRateInput)}
                      onChange={e => {
                        const cleaned = cleanNumberInput(e.target.value);
                        setSpotAedRateInput(cleaned);
                        recalculateTotalToman(aedAmountInput, cleaned);
                      }}
                      placeholder="مثال: 18,500"
                      className="w-full p-2.5 pl-14 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">تومان</span>
                  </div>
                </div>

                {/* مبلغ کل حواله به تومان */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مبلغ کل قابل پرداخت به صراف (تومان)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      required
                      value={formatNumberInput(totalTomanInput)}
                      onChange={e => setTotalTomanInput(cleanNumberInput(e.target.value))}
                      placeholder="محاسبه خودکار..."
                      className="w-full p-2.5 pl-14 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-mono font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-indigo-600">تومان</span>
                  </div>
                  {parseFloat(totalTomanInput) > 0 && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {numberToPersianWords(parseFloat(totalTomanInput))}
                    </div>
                  )}
                </div>
              </div>

              {/* ردیف دوم: تبدیل کمکی دلار با ضریب ۳.۶۷ + تاریخ + بابت/توضیحات */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">محاسبه نرخ درهم از دلار (÷ ۳.۶۷)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={formatNumberInput(spotUsdRateInput)}
                        onChange={e => handleCalculateAedRateFromUsd(cleanNumberInput(e.target.value), usdAedParityInput)}
                        placeholder="نرخ دلار..."
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-600 outline-none text-left"
                      />
                      <span className="text-xs text-slate-400">÷</span>
                      <input
                        type="number"
                        step="0.01"
                        value={usdAedParityInput}
                        onChange={e => handleCalculateAedRateFromUsd(spotUsdRateInput, e.target.value)}
                        className="w-16 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-600 outline-none text-center"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاریخ و ساعت توافق با صراف</label>
                  <DatePicker
                    value={recordDate}
                    onChange={setRecordDate}
                    calendar={persian}
                    locale={persian_fa}
                    format="YYYY/MM/DD HH:mm"
                    plugins={[<TimePicker hideSeconds />]}
                    inputClass="rmdp-input !text-xs !h-10 !w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">بابت / تحویل‌گیرنده درهم</label>
                  <input
                    type="text"
                    value={purposeInput}
                    onChange={e => setPurposeInput(e.target.value)}
                    placeholder="مثال: خرید بار گاز / تحویل در دبی..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات حواله</label>
                  <input
                    type="text"
                    value={descriptionInput}
                    onChange={e => setDescriptionInput(e.target.value)}
                    placeholder="توضیحات تکمیلی..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* بخش اختیاری: افزودن شماره حساب‌ها/کارت‌های ارسالی صراف در همان لحظه ثبت */}
              <div className="border border-indigo-200 dark:border-indigo-800/60 rounded-2xl overflow-hidden bg-indigo-50/30 dark:bg-indigo-950/15">
                <div
                  onClick={() => setShowInitialAccountBuilder(!showInitialAccountBuilder)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      ثبت شماره کارت‌ها / حساب‌های بانکی ارسالی صراف برای این حواله (می‌توانید بعد از ثبت حواله نیز به مرور اضافه کنید)
                    </span>
                    {initialAccounts.length > 0 && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ({initialAccounts.length} حساب اضافه شد)
                      </span>
                    )}
                  </div>
                  <div className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-xs font-bold">
                    <span>{showInitialAccountBuilder ? 'بستن' : 'افزودن کارت/حساب ارسالی صراف'}</span>
                    {showInitialAccountBuilder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {showInitialAccountBuilder && (
                  <div className="p-4 border-t border-indigo-200/70 dark:border-indigo-800/50 space-y-4 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">نام صاحب کارت / حساب (اعلامی صراف)</label>
                        <input
                          type="text"
                          value={initHolderName}
                          onChange={e => setInitHolderName(e.target.value)}
                          placeholder="مثال: علی محمدی"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">شماره کارت ۱۶ رقمی</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={initCardNumber}
                          onChange={e => {
                            const formatted = formatCardDisplay(e.target.value);
                            setInitCardNumber(formatted);
                            const b = detectBankFromCard(formatted);
                            if (b) setInitBankName(b);
                          }}
                          placeholder="6037 99xx xxxx xxxx"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">شماره شبا (IR) یا شماره حساب</label>
                        <input
                          type="text"
                          dir="ltr"
                          value={initShebaNumber}
                          onChange={e => {
                            const val = e.target.value.toUpperCase();
                            setInitShebaNumber(val);
                            const b = detectBankFromSheba(val);
                            if (b) setInitBankName(b);
                          }}
                          placeholder="IR..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">نام بانک</label>
                        <input
                          type="text"
                          value={initBankName}
                          onChange={e => setInitBankName(e.target.value)}
                          placeholder="تشخیص خودکار یا دستی..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">مبلغ این کارت/حساب (تومان)</label>
                          {parseFloat(totalTomanInput) > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const allocatedSoFar = initialAccounts.reduce((s, a) => s + a.allocatedAmountToman, 0);
                                const rem = Math.max(0, (parseFloat(totalTomanInput) || 0) - allocatedSoFar);
                                setInitAllocatedToman(rem.toString());
                              }}
                              className="text-[10px] text-indigo-600 hover:underline font-bold"
                            >
                              کل مانده حواله
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formatNumberInput(initAllocatedToman)}
                          onChange={e => setInitAllocatedToman(cleanNumberInput(e.target.value))}
                          placeholder="مبلغ به تومان..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 outline-none text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">وضعیت واریز به این کارت</label>
                        <select
                          value={initIsPaidNow ? 'PAID' : 'PENDING'}
                          onChange={e => setInitIsPaidNow(e.target.value === 'PAID')}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="PENDING">حساب اعلامی صراف (در انتظار واریز ما)</option>
                          <option value="PAID">واریز و پرداخت شد</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">کد رهگیری / فیش (اختیاری)</label>
                        <input
                          type="text"
                          value={initTrackingCode}
                          onChange={e => setInitTrackingCode(e.target.value)}
                          placeholder="شماره مرجع بانکی..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddInitialAccount}
                        className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all h-9"
                      >
                        <Plus size={15} />
                        <span>افزودن به لیست کارت‌های این حواله</span>
                      </button>
                    </div>

                    {initialAccounts.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {initialAccounts.map((acc, idx) => (
                          <div
                            key={acc.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-400">{idx + 1}.</span>
                              <span className="font-bold text-slate-800 dark:text-white">{acc.accountHolderName}</span>
                              <span className="text-slate-400">·</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">{acc.bankName}</span>
                              {acc.cardNumber && (
                                <span className="font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                                  {formatCardDisplay(acc.cardNumber)}
                                </span>
                              )}
                              {acc.shebaNumber && (
                                <span className="font-mono text-slate-500 text-[11px]" dir="ltr">
                                  {acc.shebaNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400" dir="ltr">
                                {acc.allocatedAmountToman.toLocaleString()} تومان
                              </span>
                              <span className={`text-[11px] font-bold ${acc.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {acc.status === 'PAID' ? 'واریز شد' : 'منتظر واریز'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setInitialAccounts(prev => prev.filter(i => i.id !== acc.id))}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  <span>ثبت حواله دریافت درهم از صراف</span>
                </button>
              </div>
            </form>
          </div>

          {/* Step 2 Section: Remittances List & Multi-Account Settlement */}
          <div className="space-y-4">
            {/* Search & Status Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white">
                  گام ۲: لیست حواله‌های درهم، مانده حساب قبلی و تسویه با کارت‌های صراف
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="جستجوی صراف، صاحب کارت، شماره کارت..."
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setSettlementStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      settlementStatusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    همه
                  </button>
                  <button
                    onClick={() => setSettlementStatusFilter('UNSETTLED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      settlementStatusFilter === 'UNSETTLED'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    تسویه‌نشده (بدهکار)
                  </button>
                  <button
                    onClick={() => setSettlementStatusFilter('PARTIAL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      settlementStatusFilter === 'PARTIAL'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    در حال تسویه
                  </button>
                  <button
                    onClick={() => setSettlementStatusFilter('SETTLED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      settlementStatusFilter === 'SETTLED'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    تسویه کامل
                  </button>
                </div>
              </div>
            </div>

            {/* Remittance Cards */}
            {filteredRemittances.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
                هیچ حواله یا مانده حسابی با این مشخصات یافت نشد. از فرم بالا اولین دریافت درهم یا مانده حساب قبلی صراف را ثبت کنید.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRemittances.map(tx => {
                  const sarrafName = getExchangeName(tx.exchangeId);
                  const summary = getRemittanceSettlementSummary(tx);

                  return (
                    <div
                      key={tx.id}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-sm overflow-hidden ${
                        summary.isCreditRecord
                          ? 'border-blue-300 dark:border-blue-800/70'
                          : summary.isFullySettled
                            ? 'border-emerald-200 dark:border-emerald-900/60'
                            : summary.totalPaid > 0
                              ? 'border-amber-300 dark:border-amber-800/70'
                              : 'border-rose-200 dark:border-rose-900/60'
                      }`}
                    >
                      {/* Top Bar of Remittance Card */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Landmark size={17} className="text-indigo-600 dark:text-indigo-400" />
                              صراف: {sarrafName}
                            </span>
                            <span>·</span>
                            <span className="font-mono" dir="ltr">{tx.date}</span>
                            <span>·</span>
                            <span className={tx.isOpeningBalance ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>
                              {tx.isOpeningBalance
                                ? (tx.openingBalanceType === 'CREDIT_FROM_SARRAF' ? 'سند مانده حساب قبلی (بستانکاری ما از صراف)' : 'سند مانده حساب قبلی (بدهکاری ما به صراف)')
                                : `بابت: ${tx.receiverName || 'دریافت درهم'}`}
                            </span>
                            <span>·</span>
                            <span className={`font-bold ${
                              summary.isCreditRecord
                                ? 'text-blue-600 dark:text-blue-400'
                                : summary.isFullySettled
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : summary.totalPaid > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {summary.isCreditRecord
                                ? '✓ بستانکاری ما نزد صراف (کسر از بدهی کل)'
                                : summary.isFullySettled
                                  ? '✓ تسویه کامل شده'
                                  : summary.totalPaid > 0
                                    ? `در حال تسویه (${summary.progressPercent}% پرداخت‌شده)`
                                    : 'بدهکار به صراف (در انتظار واریز به کارت‌های صراف)'}
                            </span>
                          </div>
                          {tx.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{tx.description}</p>
                          )}
                        </div>

                        {/* Key Financial Numbers of this Remittance */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-5 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
                          {tx.aedAmount > 0 && (
                            <>
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold">مقدار درهم</div>
                                <div className="font-mono font-black text-sm sm:text-base text-indigo-600 dark:text-indigo-400" dir="ltr">
                                  {tx.aedAmount.toLocaleString()} AED
                                </div>
                              </div>
                              <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold">نرخ درهم</div>
                                <div className="font-mono font-bold text-sm text-slate-700 dark:text-slate-200" dir="ltr">
                                  {tx.aedRate.toLocaleString()} T
                                </div>
                              </div>
                              <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
                            </>
                          )}
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              {summary.isCreditRecord ? 'مبلغ بستانکاری ما' : tx.isOpeningBalance ? 'مبلغ بدهی قبلی' : 'مبلغ کل حواله'}
                            </div>
                            <div className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white" dir="ltr">
                              {tx.amountToman.toLocaleString()} T
                            </div>
                          </div>
                          {!summary.isCreditRecord && (
                            <>
                              <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
                              <div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">پرداخت‌شده</div>
                                <div className="font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400" dir="ltr">
                                  {summary.totalPaid.toLocaleString()} T
                                </div>
                              </div>
                              <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
                              <div>
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">مانده تسویه</div>
                                <div className={`font-mono font-black text-sm sm:text-base ${summary.remaining === 0 ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
                                  {summary.remaining.toLocaleString()} T
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            summary.isCreditRecord
                              ? 'bg-blue-500'
                              : summary.isFullySettled
                                ? 'bg-emerald-500'
                                : 'bg-indigo-600'
                          }`}
                          style={{ width: `${summary.progressPercent}%` }}
                        />
                      </div>

                      {/* Bank Accounts / Cards Sent by Sarraf for this Remittance */}
                      <div className="p-4 sm:p-5 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <CreditCard size={15} className="text-indigo-600 dark:text-indigo-400" />
                            <span>
                              {summary.isCreditRecord
                                ? `این سند به عنوان بستانکاری قبلی ما از «${sarrafName}» ثبت شده و از بدهی کل ما به این صراف کسر شده است.`
                                : `شماره حساب‌ها و کارت‌های بانکی معرفی‌شده توسط «${sarrafName}» جهت تسویه (${summary.payments.length} مورد):`}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 print:hidden">
                            {!summary.isCreditRecord && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddPaymentModal(tx)}
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                              >
                                <Plus size={15} />
                                <span>ثبت شماره کارت / حساب ارسالی صراف و واریز وجه</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyWhatsAppReportForSarraf(tx)}
                              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                              title="کپی گزارش تسویه برای ارسال به صراف در واتساپ"
                            >
                              <Share2 size={14} />
                              <span>کپی گزارش برای صراف</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintVoucherTx(tx)}
                              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                              title="چاپ / PDF صورت‌جلسه تسویه این حواله"
                            >
                              <Printer size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('آیا از حذف کامل این ردیف اطمینان دارید؟')) {
                                  deleteExchangeTransaction(tx.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                              title="حذف"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {!summary.isCreditRecord && (
                          summary.payments.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-2">
                              <span>هنوز شماره کارت یا حسابی از طرف «{sarrafName}» برای تسویه این مورد ثبت نشده است.</span>
                              <button
                                type="button"
                                onClick={() => handleOpenAddPaymentModal(tx)}
                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                              >
                                + ثبت اولین کارت / حساب ارسالی صراف
                              </button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                                  <tr>
                                    <th className="px-3 py-2.5">#</th>
                                    <th className="px-3 py-2.5">صاحب حساب / کارت (اعلامی صراف)</th>
                                    <th className="px-3 py-2.5">بانک</th>
                                    <th className="px-3 py-2.5">شماره کارت / شبا / حساب</th>
                                    <th className="px-3 py-2.5 text-center">مبلغ (تومان)</th>
                                    <th className="px-3 py-2.5 text-center">کد رهگیری و تاریخ</th>
                                    <th className="px-3 py-2.5 text-center">وضعیت</th>
                                    <th className="px-3 py-2.5 text-center print:hidden">عملیات</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {summary.payments.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                      <td className="px-3 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                                      <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-white">
                                        <div>{p.accountHolderName}</div>
                                        {p.payerNote && (
                                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">{p.payerNote}</div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 font-medium text-indigo-600 dark:text-indigo-400">
                                        {p.bankName || 'بانک'}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="space-y-1">
                                          {p.cardNumber && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                                {formatCardDisplay(p.cardNumber)}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyText(p.cardNumber!, `card-${p.id}`)}
                                                className="text-slate-400 hover:text-indigo-600"
                                                title="کپی شماره کارت"
                                              >
                                                {copiedKey === `card-${p.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                              </button>
                                            </div>
                                          )}
                                          {p.shebaNumber && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono text-[11px] text-slate-500" dir="ltr">
                                                {p.shebaNumber}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyText(p.shebaNumber!, `sheba-${p.id}`)}
                                                className="text-slate-400 hover:text-indigo-600"
                                                title="کپی شماره شبا"
                                              >
                                                {copiedKey === `sheba-${p.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                              </button>
                                            </div>
                                          )}
                                          {p.accountNumber && (
                                            <div className="text-[11px] font-mono text-slate-500">
                                              حساب: {p.accountNumber}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-center font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                                        {(p.status === 'PAID' ? p.paidAmountToman : p.allocatedAmountToman).toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-500">
                                        {p.trackingCode ? <div>کد: {p.trackingCode}</div> : <div>-</div>}
                                        {p.paymentDate && <div className="text-[10px] opacity-75" dir="ltr">{p.paymentDate}</div>}
                                      </td>
                                      <td className="px-3 py-2.5 text-center">
                                        {p.status === 'PAID' ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                                            <CheckCircle2 size={13} />
                                            <span>واریز شد</span>
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setConfirmPayModal({ txId: tx.id, item: p });
                                              setConfirmActualAmount(p.allocatedAmountToman.toString());
                                              setConfirmTrackingCode(p.trackingCode || '');
                                              setConfirmPayerNote(p.payerNote || '');
                                            }}
                                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all"
                                          >
                                            منتظر واریز (ثبت پرداخت)
                                          </button>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-center print:hidden">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAddPaymentModal(tx, p)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                                            title="ویرایش"
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePaymentItem(tx, p.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                                            title="حذف"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALL SARRAF BANK ACCOUNTS & CARDS DIRECTORY */}
      {activeTab === 'bank_accounts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-600" />
                <span>بانک شماره کارت‌ها و شباهای ارسالی صراف‌ها</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تمامی حساب‌ها و کارت‌های بانکی که صراف‌ها جهت تسویه حواله‌های درهم فرستاده‌اند
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجو در شماره کارت، شبا، نام صاحب حساب، صراف..."
                className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">نام صراف</th>
                  <th className="px-4 py-3">صاحب حساب / کارت</th>
                  <th className="px-4 py-3">بانک</th>
                  <th className="px-4 py-3">شماره کارت / شبا</th>
                  <th className="px-4 py-3 text-center">مبلغ واریزی (تومان)</th>
                  <th className="px-4 py-3 text-center">بابت حواله درهم</th>
                  <th className="px-4 py-3 text-center">کد رهگیری و تاریخ</th>
                  <th className="px-4 py-3 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allSarrafBankAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      هنوز شماره کارت یا حسابی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  allSarrafBankAccounts.map(row => (
                    <tr key={row.payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">{row.sarrafName}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{row.payment.accountHolderName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.payment.bankName || 'بانک'}</td>
                      <td className="px-4 py-3 font-mono" dir="ltr">
                        {row.payment.cardNumber && <div className="font-bold">{formatCardDisplay(row.payment.cardNumber)}</div>}
                        {row.payment.shebaNumber && <div className="text-[11px] text-slate-500">{row.payment.shebaNumber}</div>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                        {(row.payment.paidAmountToman || row.payment.allocatedAmountToman).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400" dir="ltr">
                        {row.aedAmount > 0 ? `${row.aedAmount.toLocaleString()} AED (@ ${row.aedRate.toLocaleString()})` : 'مانده حساب قبلی'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-500">
                        <div>{row.payment.trackingCode || '-'}</div>
                        <div className="text-[10px]" dir="ltr">{row.payment.paymentDate || row.txDate}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.payment.status === 'PAID' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">واریز شد</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">منتظر واریز</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SARRAFS DIRECTORY & LEDGER (کاردکس صراف‌ها + ثبت مانده حساب قبلی) */}
      {activeTab === 'offices' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
              <Building2 className="text-indigo-600" size={20} />
              <span>تعریف صراف / صرافی جدید به همراه مانده حساب قبلی (بدهکاری / بستانکاری)</span>
            </h3>
            <form onSubmit={handleOfficeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">نام صراف / صرافی *</label>
                  <input
                    value={officeForm.name}
                    onChange={e => setOfficeForm({ ...officeForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white font-bold"
                    placeholder="نام صراف (مثال: مجید)..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">تلفن / واتساپ</label>
                  <input
                    value={officeForm.phone}
                    onChange={e => setOfficeForm({ ...officeForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white font-mono"
                    placeholder="0912..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">آدرس / شهر</label>
                  <input
                    value={officeForm.address}
                    onChange={e => setOfficeForm({ ...officeForm, address: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm dark:text-white"
                    placeholder="تهران / دبی..."
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">وضعیت مانده حساب قبلی صرافی</label>
                  <select
                    value={officeForm.openingBalanceType}
                    onChange={e => setOfficeForm({ ...officeForm, openingBalanceType: e.target.value as OpeningBalanceType })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="NONE">بدون مانده قبلی (حساب صفر)</option>
                    <option value="DEBT_TO_SARRAF">بدهکاری به صرافی (ما به صراف بدهکاریم)</option>
                    <option value="CREDIT_FROM_SARRAF">بستانکاری از صرافی (ما از صراف طلبکاریم)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">مبلغ مانده قبلی (تومان)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    disabled={officeForm.openingBalanceType === 'NONE'}
                    value={formatNumberInput(officeForm.openingBalanceToman)}
                    onChange={e => setOfficeForm({ ...officeForm, openingBalanceToman: cleanNumberInput(e.target.value) })}
                    placeholder="مبلغ به تومان..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none disabled:opacity-50 text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">شرح مانده حساب قبلی</label>
                  <input
                    type="text"
                    disabled={officeForm.openingBalanceType === 'NONE'}
                    value={officeForm.openingBalanceDescription}
                    onChange={e => setOfficeForm({ ...officeForm, openingBalanceDescription: e.target.value })}
                    placeholder="مثال: مانده انتقالی از حساب قبلی..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 py-2.5 transition-all shadow-sm"
                >
                  <Plus size={18} />
                  <span>ثبت صراف جدید</span>
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sarrafSummaries.map(s => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                      <Landmark size={18} className="text-indigo-600" />
                      <span>{s.name}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">{s.phone || 'بدون تلفن'} · {s.txCount} سند ثبت‌شده</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenOpeningBalanceModal(s)}
                      className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors"
                      title="ثبت / ویرایش مانده حساب قبلی صرافی"
                    >
                      <Scale size={17} />
                    </button>
                    <button
                      onClick={() => setLedgerSarrafId(s.id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors"
                      title="مشاهده کاردکس کامل صراف"
                    >
                      <History size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`آیا از حذف صراف «${s.name}» اطمینان دارید؟`)) {
                          deleteExchange(s.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {(s.openingDebitToman > 0 || s.openingCreditToman > 0) && (
                    <div className="flex justify-between p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50">
                      <span className="text-amber-800 dark:text-amber-300 font-bold">مانده حساب قبلی:</span>
                      {s.openingDebitToman > 0 ? (
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400" dir="ltr">
                          {s.openingDebitToman.toLocaleString()} T (بدهکار)
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400" dir="ltr">
                          {s.openingCreditToman.toLocaleString()} T (بستانکار)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">کل درهم دریافتی از {s.name}:</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{s.totalAed.toLocaleString()} AED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مجموع بدهی (حواله‌ها + بدهی قبلی):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">{s.totalToman.toLocaleString()} T</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">واریزشده به کارت‌های {s.name}:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{s.paidToman.toLocaleString()} T</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-300">تراز نهایی با {s.name}:</span>
                    {s.netBalanceToman === 0 ? (
                      <span className="font-mono font-black text-emerald-600">تسویه کامل (۰)</span>
                    ) : s.netBalanceToman > 0 ? (
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400" dir="ltr">
                        {s.netBalanceToman.toLocaleString()} T (بدهکار به صراف)
                      </span>
                    ) : (
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400" dir="ltr">
                        {Math.abs(s.netBalanceToman).toLocaleString()} T (بستانکار از صراف)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenOpeningBalanceModal(s)}
                    className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    ثبت مانده قبلی
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExchangeId(s.id);
                      setSelectedSarrafFilter(s.id);
                      setActiveTab('remittances');
                    }}
                    className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    حواله‌ها و تسویه
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerSarrafId(s.id)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                  >
                    کاردکس
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RECEIVERS & SENDERS */}
      {activeTab === 'parties' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <Container className="text-emerald-500" size={18} />
              <span>تحویل‌گیرندگان درهم</span>
            </h3>
            <form onSubmit={handleReceiverSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={receiverForm.name}
                onChange={e => setReceiverForm({ ...receiverForm, name: e.target.value })}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none"
                placeholder="نام تحویل‌گیرنده..."
              />
              <input
                value={receiverForm.phone}
                onChange={e => setReceiverForm({ ...receiverForm, phone: e.target.value })}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none"
                placeholder="تلفن..."
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs py-2.5">
                + ثبت تحویل‌گیرنده
              </button>
            </form>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {receivers.map(r => (
                <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">{r.name}</div>
                    <div className="text-slate-400">{r.phone}</div>
                  </div>
                  <div className="font-mono font-bold text-emerald-600" dir="ltr">
                    {getReceiverBalance(r.id).toLocaleString()} AED
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <UserCircle className="text-blue-500" size={18} />
              <span>پرداخت‌کنندگان / حساب‌های مبدا</span>
            </h3>
            <form onSubmit={handleSenderSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={senderForm.name}
                onChange={e => setSenderForm({ ...senderForm, name: e.target.value })}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none"
                placeholder="نام شخص / حساب مبدا..."
              />
              <input
                value={senderForm.phone}
                onChange={e => setSenderForm({ ...senderForm, phone: e.target.value })}
                className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none"
                placeholder="تلفن..."
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs py-2.5">
                + ثبت
              </button>
            </form>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {senders.map(s => (
                <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">{s.name}</div>
                    <div className="text-slate-400">{s.phone}</div>
                  </div>
                  <button onClick={() => deleteSender(s.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0: REGISTER / EDIT SARRAF OPENING BALANCE (ثبت مانده حساب قبلی صرافی به صورت بدهکاری یا بستانکاری) */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-6 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 sm:p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl">
                  <Scale size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    ثبت مانده حساب قبلی صرافی (بدهکاری / بستانکاری)
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    ثبت حساب انتقالی از قبل با صراف (مثلاً مجید) به صورت بدهکار یا بستانکار
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOpeningBalanceModal(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-5 space-y-4">
              {/* انتخاب صراف */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  انتخاب صراف <span className="text-red-500">*</span>
                </label>
                <select
                  value={obExchangeId}
                  onChange={e => setObExchangeId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- انتخاب صراف --</option>
                  {exchanges.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              {/* انتخاب نوع مانده حساب قبلی: بدهکاری یا بستانکاری */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع مانده حساب قبلی <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setObType('DEBT_TO_SARRAF')}
                    className={`p-3 rounded-xl border-2 text-right transition-all flex flex-col gap-1 ${
                      obType === 'DEBT_TO_SARRAF'
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center gap-1.5">
                      <TrendingDown size={15} className="text-rose-600" />
                      <span>بدهکاری به صرافی</span>
                    </div>
                    <p className="text-[10px] opacity-80">
                      ما از قبل به صراف بدهکاریم (صراف طلبکار است)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setObType('CREDIT_FROM_SARRAF')}
                    className={`p-3 rounded-xl border-2 text-right transition-all flex flex-col gap-1 ${
                      obType === 'CREDIT_FROM_SARRAF'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-black text-xs flex items-center gap-1.5">
                      <TrendingUp size={15} className="text-emerald-600" />
                      <span>بستانکاری از صرافی</span>
                    </div>
                    <p className="text-[10px] opacity-80">
                      ما از قبل از صراف طلبکاریم (صراف بدهکار است)
                    </p>
                  </button>
                </div>
              </div>

              {/* انتخاب نحوه ورود مبلغ: تومان یا درهم */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">نحوه محاسبه مبلغ مانده قبلی:</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 gap-1">
                    <button
                      type="button"
                      onClick={() => setObInputMode('TOMAN')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        obInputMode === 'TOMAN' ? 'bg-slate-800 text-white dark:bg-slate-700' : 'text-slate-500'
                      }`}
                    >
                      بر اساس تومان
                    </button>
                    <button
                      type="button"
                      onClick={() => setObInputMode('AED')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        obInputMode === 'AED' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      بر اساس درهم (AED)
                    </button>
                  </div>
                </div>

                {obInputMode === 'TOMAN' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مبلغ مانده حساب قبلی (تومان) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      required
                      value={formatNumberInput(obTomanAmount)}
                      onChange={e => setObTomanAmount(cleanNumberInput(e.target.value))}
                      placeholder="مثال: 350,000,000"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-mono font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 text-left"
                    />
                    {parseFloat(obTomanAmount) > 0 && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        {numberToPersianWords(parseFloat(obTomanAmount))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مقدار درهم قبلی (AED) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        required
                        value={formatNumberInput(obAedAmount)}
                        onChange={e => setObAedAmount(cleanNumberInput(e.target.value))}
                        placeholder="مثال: 20,000"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-indigo-600 outline-none text-left"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نرخ تبدیل درهم (تومان) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        required
                        value={formatNumberInput(obAedRate)}
                        onChange={e => setObAedRate(cleanNumberInput(e.target.value))}
                        placeholder="18,500"
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none text-left"
                      />
                    </div>
                    {(parseFloat(obAedAmount) || 0) * (parseFloat(obAedRate) || 0) > 0 && (
                      <div className="sm:col-span-2 p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-xs flex justify-between items-center">
                        <span>معادل تومانی مانده قبلی:</span>
                        <span className="font-mono font-black text-indigo-700 dark:text-indigo-300" dir="ltr">
                          {Math.round((parseFloat(obAedAmount) || 0) * (parseFloat(obAedRate) || 0)).toLocaleString()} تومان
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاریخ ثبت مانده قبلی</label>
                  <DatePicker
                    value={obDate}
                    onChange={setObDate}
                    calendar={persian}
                    locale={persian_fa}
                    format="YYYY/MM/DD HH:mm"
                    plugins={[<TimePicker hideSeconds />]}
                    inputClass="rmdp-input !text-xs !h-10 !w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات</label>
                  <input
                    type="text"
                    value={obDescription}
                    onChange={e => setObDescription(e.target.value)}
                    placeholder="مثال: مانده حساب از ماه قبل..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="obCreateSettlementRow"
                  checked={obCreateSettlementRow}
                  onChange={e => setObCreateSettlementRow(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600"
                />
                <label htmlFor="obCreateSettlementRow" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer leading-relaxed">
                  <strong>نمایش در لیست اسناد و تسویه‌ها:</strong> با فعال بودن این گزینه، یک سند مجزا برای این مانده قبلی در لیست بالا ایجاد می‌شود تا بتوانید {obType === 'DEBT_TO_SARRAF' ? 'شماره کارت‌های ارسالی صراف را برای تسویه این بدهی قبلی ثبت کنید' : 'سند بستانکاری قبلی را در کاردکس و لیست مشاهده نمایید'}.
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpeningBalanceModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`flex-[2] py-3 text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 ${
                    obType === 'DEBT_TO_SARRAF'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  }`}
                >
                  <Save size={17} />
                  <span>
                    {obType === 'DEBT_TO_SARRAF'
                      ? 'ثبت مانده بدهکاری قبلی به صرافی'
                      : 'ثبت مانده بستانکاری قبلی از صرافی'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT SARRAF BANK ACCOUNT & PAYMENT FOR A REMITTANCE */}
      {activeSettlementTx && (() => {
        const sarrafName = getExchangeName(activeSettlementTx.exchangeId);
        const summary = getRemittanceSettlementSummary(activeSettlementTx);

        return (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6 animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-4 sm:p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    {editingPaymentItemId ? 'ویرایش مشخصات کارت / واریزی به صراف' : `ثبت شماره کارت / حساب ارسالی «${sarrafName}» و واریز وجه`}
                  </h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    {activeSettlementTx.isOpeningBalance
                      ? 'بابت تسویه مانده بدهکاری حساب قبلی'
                      : `حواله ${activeSettlementTx.aedAmount.toLocaleString()} درهم با نرخ ${activeSettlementTx.aedRate.toLocaleString()} تومان`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveSettlementTxId(null);
                    setEditingPaymentItemId(null);
                  }}
                  className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Summary Banner Inside Modal */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-slate-400">مبلغ کل این ردیف</div>
                  <div className="font-mono font-bold text-slate-800 dark:text-white mt-0.5" dir="ltr">
                    {activeSettlementTx.amountToman.toLocaleString()} T
                  </div>
                </div>
                <div>
                  <div className="text-emerald-600">پرداخت‌شده تا الان</div>
                  <div className="font-mono font-bold text-emerald-600 mt-0.5" dir="ltr">
                    {summary.totalPaid.toLocaleString()} T
                  </div>
                </div>
                <div>
                  <div className="text-rose-600 font-bold">مانده قابل پرداخت</div>
                  <div className="font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5" dir="ltr">
                    {summary.remaining.toLocaleString()} T
                  </div>
                </div>
              </div>

              <form onSubmit={handleSavePaymentOnRemittance} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نام صاحب کارت / حساب اعلامی صراف <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={payHolderName}
                      onChange={e => setPayHolderName(e.target.value)}
                      placeholder="مثال: رضا کریمی"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نام بانک (تشخیص خودکار از کارت/شبا)
                    </label>
                    <input
                      type="text"
                      value={payBankName}
                      onChange={e => setPayBankName(e.target.value)}
                      placeholder="مثال: بانک ملت، ملی..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-indigo-700 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شماره کارت ۱۶ رقمی ارسالی صراف
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={payCardNumber}
                      onChange={e => {
                        const formatted = formatCardDisplay(e.target.value);
                        setPayCardNumber(formatted);
                        const detected = detectBankFromCard(formatted);
                        if (detected) setPayBankName(detected);
                      }}
                      placeholder="6104 33xx xxxx xxxx"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شماره شبا (IR) یا شماره حساب بانکی
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={payShebaNumber}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setPayShebaNumber(val);
                        const detected = detectBankFromSheba(val);
                        if (detected) setPayBankName(detected);
                      }}
                      placeholder="IR..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                      مبلغ واریزی به این کارت / حساب (تومان) <span className="text-red-500">*</span>
                    </label>
                    {summary.remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmountToman(summary.remaining.toString())}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        قرار دادن کل مانده ({summary.remaining.toLocaleString()} تومان)
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    required
                    value={formatNumberInput(payAmountToman)}
                    onChange={e => setPayAmountToman(cleanNumberInput(e.target.value))}
                    placeholder="مثال: 50,000,000"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-slate-700 rounded-xl text-base font-mono font-black text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 text-left tracking-wider"
                  />
                  {parseFloat(payAmountToman) > 0 && (
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      معادل حروف: {numberToPersianWords(parseFloat(payAmountToman))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وضعیت این حساب</label>
                    <select
                      value={payStatus}
                      onChange={e => setPayStatus(e.target.value as 'PAID' | 'PENDING_PAYMENT')}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="PAID">واریز انجام شد (کسر از بدهی صراف)</option>
                      <option value="PENDING_PAYMENT">صراف تازه فرستاده (در انتظار واریز ما)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">شماره پیگیری / فیش واریزی</label>
                    <input
                      type="text"
                      value={payTrackingCode}
                      onChange={e => setPayTrackingCode(e.target.value)}
                      placeholder="کد مرجع بانکی..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاریخ و زمان واریز</label>
                    <DatePicker
                      value={payDate}
                      onChange={setPayDate}
                      calendar={persian}
                      locale={persian_fa}
                      format="YYYY/MM/DD HH:mm"
                      plugins={[<TimePicker hideSeconds />]}
                      inputClass="rmdp-input !text-xs !h-10 !w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات (مثلاً از کدام حساب پرداخت شد)</label>
                    <input
                      type="text"
                      value={payNote}
                      onChange={e => setPayNote(e.target.value)}
                      placeholder="مثال: پرداخت پایا از حساب ملت..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSettlementTxId(null);
                      setEditingPaymentItemId(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <Save size={17} />
                    <span>{payStatus === 'PAID' ? 'ثبت واریزی و کسر از بدهی' : 'ذخیره شماره کارت در لیست انتظار واریز'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: QUICK CONFIRM PAYMENT OF A PENDING SARRAF CARD */}
      {confirmPayModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-base">تایید واریز وجه به کارت معرفی‌شده صراف</h3>
              <button onClick={() => setConfirmPayModal(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleConfirmPendingAccountPaid} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800 dark:text-white">صاحب حساب: {confirmPayModal.item.accountHolderName}</div>
                <div className="text-indigo-600">{confirmPayModal.item.bankName}</div>
                {confirmPayModal.item.cardNumber && (
                  <div className="font-mono" dir="ltr">{formatCardDisplay(confirmPayModal.item.cardNumber)}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مبلغ واریزشده نهایی (تومان)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  required
                  value={formatNumberInput(confirmActualAmount)}
                  onChange={e => setConfirmActualAmount(cleanNumberInput(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-emerald-700 dark:text-emerald-400 outline-none text-left tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">شماره پیگیری / فیش واریزی</label>
                <input
                  type="text"
                  value={confirmTrackingCode}
                  onChange={e => setConfirmTrackingCode(e.target.value)}
                  placeholder="کد رهگیری بانکی..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات</label>
                <input
                  type="text"
                  value={confirmPayerNote}
                  onChange={e => setConfirmPayerNote(e.target.value)}
                  placeholder="توضیحات واریز..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmPayModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  تایید واریز و کسر از بدهی صراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE VOUCHER FOR A REMITTANCE & ITS CARD PAYMENTS */}
      {printVoucherTx && (() => {
        const sarrafName = getExchangeName(printVoucherTx.exchangeId);
        const summary = getRemittanceSettlementSummary(printVoucherTx);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center print:hidden">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">پیش‌نمایش چاپ و PDF صورت‌وضعیت تسویه صرافی</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadVoucherPdf(printVoucherTx)}
                    disabled={isExportingPdf}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <FileDown size={14} />
                    <span>{isExportingPdf ? 'در حال تولید...' : 'دانلود PDF'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Printer size={14} />
                    <span>چاپ</span>
                  </button>
                  <button
                    onClick={() => setPrintVoucherTx(null)}
                    className="p-1.5 text-slate-500 hover:text-red-500"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div id="sarraf-remittance-voucher-print" className="p-8 bg-white text-slate-900 space-y-6" dir="rtl">
                <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">صورت‌وضعیت مالی و تسویه ریالی با صرافی</h2>
                    <p className="text-xs text-slate-500 mt-1">نام صراف طرف حساب: <strong>{sarrafName}</strong></p>
                  </div>
                  <div className="text-left text-xs font-mono space-y-1">
                    <div>تاریخ: {printVoucherTx.date}</div>
                    <div>وضعیت: {summary.isFullySettled ? 'تسویه کامل' : 'در حال تسویه'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div>
                    <div className="text-xs text-slate-500">مقدار درهم</div>
                    <div className="font-mono font-black text-base text-indigo-700 mt-1" dir="ltr">
                      {printVoucherTx.aedAmount > 0 ? `${printVoucherTx.aedAmount.toLocaleString()} AED` : 'مانده قبلی'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">نرخ درهم</div>
                    <div className="font-mono font-bold text-base text-slate-800 mt-1" dir="ltr">
                      {printVoucherTx.aedRate > 0 ? `${printVoucherTx.aedRate.toLocaleString()} تومان` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">مبلغ کل (تومان)</div>
                    <div className="font-mono font-black text-base text-slate-900 mt-1" dir="ltr">{printVoucherTx.amountToman.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">مانده تسویه‌نشده</div>
                    <div className="font-mono font-black text-base text-rose-600 mt-1" dir="ltr">{summary.remaining.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm mb-2 text-slate-800">لیست واریزی‌ها به شماره حساب‌ها / کارت‌های معرفی‌شده توسط {sarrafName}:</h4>
                  <table className="w-full text-right text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-300 p-2">#</th>
                        <th className="border border-slate-300 p-2">صاحب حساب / کارت</th>
                        <th className="border border-slate-300 p-2">بانک</th>
                        <th className="border border-slate-300 p-2">شماره کارت / شبا</th>
                        <th className="border border-slate-300 p-2 text-center">مبلغ (تومان)</th>
                        <th className="border border-slate-300 p-2 text-center">کد رهگیری و تاریخ</th>
                        <th className="border border-slate-300 p-2 text-center">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.payments.map((p, i) => (
                        <tr key={p.id}>
                          <td className="border border-slate-300 p-2 font-mono">{i + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold">{p.accountHolderName}</td>
                          <td className="border border-slate-300 p-2">{p.bankName || '-'}</td>
                          <td className="border border-slate-300 p-2 font-mono" dir="ltr">
                            {p.cardNumber ? formatCardDisplay(p.cardNumber) : p.shebaNumber || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold" dir="ltr">
                            {(p.paidAmountToman || p.allocatedAmountToman).toLocaleString()}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-mono">
                            {p.trackingCode || '-'} {p.paymentDate ? `(${p.paymentDate})` : ''}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            {p.status === 'PAID' ? 'واریز شد' : 'منتظر واریز'}
                          </td>
                        </tr>
                      ))}
                      {summary.payments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="border border-slate-300 p-4 text-center text-slate-400">
                            هیچ ردیف واریزی ثبت نشده است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td colSpan={4} className="border border-slate-300 p-2 text-left">مجموع واریزشده به حساب‌های صراف:</td>
                        <td className="border border-slate-300 p-2 text-center font-mono text-emerald-700" dir="ltr">
                          {summary.totalPaid.toLocaleString()} تومان
                        </td>
                        <td colSpan={2} className="border border-slate-300 p-2 text-center font-mono">
                          مانده: {summary.remaining.toLocaleString()} تومان
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: SARRAF DETAILED LEDGER (کاردکس اختصاصی صراف) */}
      {ledgerSarrafId && (() => {
        const sarraf = sarrafSummaries.find(s => s.id === ledgerSarrafId);
        const sarrafTxs = exchangeTransactions.filter(t => t.exchangeId === ledgerSarrafId).slice().reverse();
        if (!sarraf) return null;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-4 sm:p-5 bg-indigo-600 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-white">کاردکس جامع صراف: {sarraf.name}</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    کل درهم دریافتی: {sarraf.totalAed.toLocaleString()} AED | کل واریزی ما: {sarraf.paidToman.toLocaleString()} تومان |{' '}
                    {sarraf.netBalanceToman >= 0
                      ? `مانده بدهی به صراف: ${sarraf.netBalanceToman.toLocaleString()} تومان`
                      : `مانده بستانکاری ما از صراف: ${Math.abs(sarraf.netBalanceToman).toLocaleString()} تومان`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setLedgerSarrafId(null);
                      handleOpenOpeningBalanceModal(sarraf);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Scale size={14} />
                    <span>ثبت مانده قبلی</span>
                  </button>
                  <button onClick={() => setLedgerSarrafId(null)} className="p-1.5 text-white/80 hover:text-white rounded-xl">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(sarraf.openingBalanceType && sarraf.openingBalanceType !== 'NONE' && (sarraf.openingBalanceToman || 0) > 0) && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex justify-between items-center text-xs font-bold">
                    <span className="text-amber-900 dark:text-amber-300">
                      مانده اول دوره ثبت‌شده روی پروفایل صراف ({sarraf.openingBalanceDescription || 'مانده قبلی'}):
                    </span>
                    <span className={sarraf.openingBalanceType === 'DEBT_TO_SARRAF' ? 'text-rose-600 font-mono' : 'text-emerald-600 font-mono'} dir="ltr">
                      {(sarraf.openingBalanceToman || 0).toLocaleString()} تومان ({sarraf.openingBalanceType === 'DEBT_TO_SARRAF' ? 'بدهکار به صراف' : 'بستانکار از صراف'})
                    </span>
                  </div>
                )}

                {sarrafTxs.map(tx => {
                  const s = getRemittanceSettlementSummary(tx);
                  return (
                    <div key={tx.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-bold">
                        <span className="text-slate-800 dark:text-white">
                          {tx.isOpeningBalance
                            ? `تاریخ: ${tx.date} — سند مانده حساب قبلی (${tx.openingBalanceType === 'CREDIT_FROM_SARRAF' ? 'بستانکاری از صراف' : 'بدهکاری به صراف'})`
                            : `تاریخ: ${tx.date} — دریافت ${tx.aedAmount.toLocaleString()} درهم با نرخ ${tx.aedRate.toLocaleString()} تومان`}
                        </span>
                        <div className="flex items-center gap-3 font-mono" dir="ltr">
                          <span>مبلغ: {tx.amountToman.toLocaleString()} T</span>
                          {!s.isCreditRecord && (
                            <>
                              <span className="text-emerald-600">واریزی: {s.totalPaid.toLocaleString()} T</span>
                              <span className="text-rose-600">مانده: {s.remaining.toLocaleString()} T</span>
                            </>
                          )}
                        </div>
                      </div>
                      {s.payments.length > 0 && (
                        <div className="pl-2 border-r-2 border-indigo-400 pr-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {s.payments.map(p => (
                            <div key={p.id} className="flex flex-wrap justify-between items-center">
                              <span>
                                {p.accountHolderName} ({p.bankName}) — {p.cardNumber ? formatCardDisplay(p.cardNumber) : p.shebaNumber}
                              </span>
                              <span className="font-mono font-bold" dir="ltr">
                                {(p.paidAmountToman || p.allocatedAmountToman).toLocaleString()} T ({p.status === 'PAID' ? 'واریز شد' : 'منتظر واریز'})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sarrafTxs.length === 0 && (
                  <p className="text-center py-12 text-slate-400 text-sm">هیچ سندی برای این صراف ثبت نشده است.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ExchangeManager;
