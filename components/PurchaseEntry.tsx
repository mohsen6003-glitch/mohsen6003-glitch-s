import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import {
  Scale,
  Building2,
  Container,
  Truck,
  PhoneCall,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Filter,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  ArrowLeft,
  Layers,
  FileSpreadsheet,
  ListFilter,
  Sparkles,
  AlertCircle,
  UserPlus,
  Calculator
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import { Purchase } from '../types';
import { formatNumberInput, cleanNumberInput, numberToPersianWords } from '../utils/numberUtils';

interface PurchaseEntryProps {
  initialCompanyId?: string;
}

interface UnifiedCompanyLoad {
  id: string;
  source: 'PURCHASE' | 'TRANSACTION';
  companyId: string;
  companyName: string;
  receiverId: string;
  receiverName: string;
  driverId: string;
  driverName: string;
  plateNumber: string;
  scaleTicketNo: string;
  coordinationType: 'PHONE' | 'PROGRAM' | 'DIRECT';
  loadingStatus: 'PENDING_SCALE' | 'LOADED';
  date: string;
  volumeTons: number;
  weightKg: number;
  declaredRate: number;
  declaredRateUSD: number;
  declaredRateAED: number;
  exchangeRateUSD_AED: number;
  rateCurrency: 'TOMAN' | 'USD' | 'AED';
  unitPriceToman: number;
  totalPriceToman: number;
  totalPriceForeign: number;
  totalAmountUSD: number;
  totalAmountAED: number;
  freightRate?: number;
  freightPrice?: number;
  description: string;
  rawPurchase?: Purchase;
}

const PurchaseEntry: React.FC<PurchaseEntryProps> = ({ initialCompanyId }) => {
  const {
    companies,
    receivers,
    drivers,
    purchases,
    transactions,
    exchangeRates,
    addCompany,
    addReceiver,
    addDriver,
    addPurchase,
    updatePurchase,
    deletePurchase,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCompanyName,
    getReceiverName,
    getDriverName
  } = useData();

  // Registration Mode: 'LOADED' (Scale ticket received) vs 'PENDING_SCALE' (Phone coordination before scale ticket)
  const [entryMode, setEntryMode] = useState<'LOADED' | 'PENDING_SCALE'>('LOADED');
  const [driverInputMode, setDriverInputMode] = useState<'SELECT' | 'MANUAL'>('SELECT');
  const [weightUnit, setWeightUnit] = useState<'TON' | 'KG'>('TON');
  const [alsoRecordDriverWork, setAlsoRecordDriverWork] = useState<boolean>(true);
  const [saveManualDriverToList, setSaveManualDriverToList] = useState<boolean>(true);
  const [usdAedRateInput, setUsdAedRateInput] = useState<string>(
    exchangeRates?.usdAed ? exchangeRates.usdAed.toString() : '3.67'
  );

  const [form, setForm] = useState({
    companyId: initialCompanyId || '',
    receiverId: '',
    driverId: '',
    driverNameManual: '',
    plateNumberManual: '',
    driverPhoneManual: '',
    scaleTicketNo: '',
    coordinationType: 'PHONE' as 'PHONE' | 'PROGRAM' | 'DIRECT',
    volumeInput: '',
    declaredRate: '',
    declaredRateAED: '',
    rateCurrency: 'USD' as 'USD' | 'AED',
    description: ''
  });

  useEffect(() => {
    if (initialCompanyId) {
      setForm(prev => ({ ...prev, companyId: initialCompanyId }));
      setFilterCompanyId(initialCompanyId);
    }
  }, [initialCompanyId]);

  const [purchaseDate, setPurchaseDate] = useState<DateObject | null>(
    new DateObject({ calendar: persian, locale: persian_fa })
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Add Sender (Company) Inline Modal State
  const [showQuickCompanyModal, setShowQuickCompanyModal] = useState(false);
  const [quickCompanyForm, setQuickCompanyForm] = useState({ name: '', phone: '', address: '' });

  // Quick Add Receiver Inline Modal State
  const [showQuickReceiverModal, setShowQuickReceiverModal] = useState(false);
  const [quickReceiverForm, setQuickReceiverForm] = useState({ name: '', phone: '', address: '' });

  // Report Tabs & Filters
  const [reportTab, setReportTab] = useState<'COMPANY_BREAKDOWN' | 'RATE_MATRIX' | 'DETAILED_LIST'>('COMPANY_BREAKDOWN');
  const [filterCompanyId, setFilterCompanyId] = useState<string>(initialCompanyId || 'ALL');
  const [filterReceiverId, setFilterReceiverId] = useState<string>('ALL');
  const [filterDriverId, setFilterDriverId] = useState<string>('ALL');
  const [filterCoordination, setFilterCoordination] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: string; source: 'PURCHASE' | 'TRANSACTION' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Calculate normalized volume in Tons and Kg
  const computedWeights = useMemo(() => {
    const raw = parseFloat(form.volumeInput) || 0;
    if (weightUnit === 'KG') {
      return {
        tons: parseFloat((raw / 1000).toFixed(3)),
        kg: Math.round(raw)
      };
    }
    return {
      tons: raw,
      kg: Math.round(raw * 1000)
    };
  }, [form.volumeInput, weightUnit]);

  const currentUsdAedFactor = useMemo(() => {
    const val = parseFloat(usdAedRateInput);
    return val > 0 ? val : 3.67;
  }, [usdAedRateInput]);

  // Handlers for synchronized USD ($) and Dirham (AED) rates using the 3.67 formula
  const handleUsdRateChange = (rawVal: string) => {
    const cleaned = cleanNumberInput(rawVal);
    const usdNum = parseFloat(cleaned) || 0;
    const aedNum = usdNum > 0 ? parseFloat((usdNum * currentUsdAedFactor).toFixed(2)) : 0;
    setForm(prev => ({
      ...prev,
      declaredRate: cleaned,
      declaredRateAED: aedNum > 0 ? aedNum.toString() : '',
      rateCurrency: 'USD'
    }));
  };

  const handleAedRateChange = (rawVal: string) => {
    const cleaned = cleanNumberInput(rawVal);
    const aedNum = parseFloat(cleaned) || 0;
    const usdNum = aedNum > 0 && currentUsdAedFactor > 0 ? parseFloat((aedNum / currentUsdAedFactor).toFixed(2)) : 0;
    setForm(prev => ({
      ...prev,
      declaredRateAED: cleaned,
      declaredRate: usdNum > 0 ? usdNum.toString() : '',
      rateCurrency: 'AED'
    }));
  };

  const handleUsdAedFactorChange = (rawFactor: string) => {
    setUsdAedRateInput(rawFactor);
    const factor = parseFloat(rawFactor);
    if (factor > 0) {
      const usdNum = parseFloat(form.declaredRate) || 0;
      if (usdNum > 0) {
        const aedNum = parseFloat((usdNum * factor).toFixed(2));
        setForm(prev => ({ ...prev, declaredRateAED: aedNum.toString() }));
      }
    }
  };

  // Quick Add Company Handler
  const handleQuickAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCompanyForm.name.trim()) {
      showToast('لطفاً نام شرکت فرستنده را وارد کنید', 'error');
      return;
    }
    const newId = addCompany({
      name: quickCompanyForm.name.trim(),
      phone: quickCompanyForm.phone.trim(),
      address: quickCompanyForm.address.trim()
    });
    setForm(prev => ({ ...prev, companyId: newId }));
    setQuickCompanyForm({ name: '', phone: '', address: '' });
    setShowQuickCompanyModal(false);
    showToast(`شرکت فرستنده «${quickCompanyForm.name.trim()}» اضافه و انتخاب شد`);
  };

  // Quick Add Receiver Handler
  const handleQuickAddReceiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReceiverForm.name.trim()) {
      showToast('لطفاً نام گیرنده بار را وارد کنید', 'error');
      return;
    }
    const newId = addReceiver({
      name: quickReceiverForm.name.trim(),
      phone: quickReceiverForm.phone.trim(),
      address: quickReceiverForm.address.trim()
    });
    setForm(prev => ({ ...prev, receiverId: newId }));
    setQuickReceiverForm({ name: '', phone: '', address: '' });
    setShowQuickReceiverModal(false);
    showToast(`گیرنده «${quickReceiverForm.name.trim()}» اضافه و انتخاب شد`);
  };

  const resetForm = () => {
    setEditId(null);
    setEntryMode('LOADED');
    setUsdAedRateInput(exchangeRates?.usdAed ? exchangeRates.usdAed.toString() : '3.67');
    setForm({
      companyId: initialCompanyId || '',
      receiverId: '',
      driverId: '',
      driverNameManual: '',
      plateNumberManual: '',
      driverPhoneManual: '',
      scaleTicketNo: '',
      coordinationType: 'PHONE',
      volumeInput: '',
      declaredRate: '',
      declaredRateAED: '',
      rateCurrency: 'USD',
      description: ''
    });
    setPurchaseDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyId) {
      showToast('لطفاً فرستنده بار (شرکت مبدأ) را مشخص کنید', 'error');
      return;
    }
    if (!form.receiverId) {
      showToast('لطفاً گیرنده بار (مقصد تحویل) را مشخص کنید', 'error');
      return;
    }
    if (!purchaseDate) {
      showToast('لطفاً تاریخ را مشخص کنید', 'error');
      return;
    }

    const declaredRateUSDNum = parseFloat(form.declaredRate) || 0;
    const declaredRateAEDNum =
      parseFloat(form.declaredRateAED) ||
      (declaredRateUSDNum > 0 ? parseFloat((declaredRateUSDNum * currentUsdAedFactor).toFixed(2)) : 0);

    if (entryMode === 'LOADED') {
      if (computedWeights.tons <= 0) {
        showToast('لطفاً وزن باسکول بارگیری را وارد کنید', 'error');
        return;
      }
      if (declaredRateUSDNum <= 0 && declaredRateAEDNum <= 0) {
        showToast('لطفاً نرخ اعلامی را وارد کنید', 'error');
        return;
      }
    }

    // Resolve Driver
    let finalDriverId = form.driverId;
    let finalDriverNameManual = form.driverNameManual.trim();
    let finalPlateManual = form.plateNumberManual.trim();

    if (driverInputMode === 'MANUAL' && finalDriverNameManual) {
      if (saveManualDriverToList && !editId) {
        finalDriverId = addDriver({
          fullName: finalDriverNameManual,
          phone: form.driverPhoneManual.trim() || '---',
          plateNumber: finalPlateManual || '---',
          tankNumber: '---',
          licenseNo: '---'
        });
      }
    } else if (driverInputMode === 'SELECT' && finalDriverId) {
      const drv = drivers.find(d => d.id === finalDriverId);
      if (drv) {
        finalDriverNameManual = drv.fullName;
        finalPlateManual = drv.plateNumber;
      }
    }

    const formattedDate = purchaseDate.format('YYYY/MM/DD HH:mm');
    const finalRateUSD =
      declaredRateUSDNum > 0
        ? declaredRateUSDNum
        : currentUsdAedFactor > 0
          ? parseFloat((declaredRateAEDNum / currentUsdAedFactor).toFixed(2))
          : 0;
    const finalRateAED =
      declaredRateAEDNum > 0
        ? declaredRateAEDNum
        : parseFloat((finalRateUSD * currentUsdAedFactor).toFixed(2));

    const calculatedTotalUSD = parseFloat((computedWeights.tons * finalRateUSD).toFixed(2));
    const calculatedTotalAED = parseFloat((computedWeights.tons * finalRateAED).toFixed(2));

    let linkedTransId: string | undefined = undefined;

    // If LOADED and user wants to sync with transactions (or already had a linkedTransactionId)
    const existingPurchase = editId ? purchases.find(p => p.id === editId) : undefined;

    if (entryMode === 'LOADED' && (alsoRecordDriverWork || existingPurchase?.linkedTransactionId) && finalDriverId) {
      const txPayload = {
        driverId: finalDriverId,
        companyId: form.companyId,
        receiverId: form.receiverId,
        date: formattedDate,
        volume: computedWeights.tons,
        weightKg: computedWeights.kg,
        price: finalRateUSD,
        gasPriceUSD: finalRateUSD,
        gasPriceAED: finalRateAED,
        exchangeRateUSD_AED: currentUsdAedFactor,
        totalPrice: calculatedTotalUSD,
        freightRate: 0,
        freightPrice: 0,
        freightCurrency: 'USD' as const,
        gasCurrency: 'USD' as const,
        declaredRate: finalRateUSD,
        scaleTicketNo: form.scaleTicketNo.trim(),
        coordinationType: form.coordinationType,
        driverNameManual: finalDriverNameManual,
        plateNumberManual: finalPlateManual,
        billOfLading: form.scaleTicketNo.trim(),
        description: `${form.description ? form.description + ' | ' : ''}ثبت از باسکول بارگیری شرکت (${getCompanyName(form.companyId)} به ${getReceiverName(form.receiverId)} | نرخ: $${finalRateUSD} / ${finalRateAED} AED)`
      };

      if (existingPurchase?.linkedTransactionId) {
        updateTransaction(existingPurchase.linkedTransactionId, txPayload);
        linkedTransId = existingPurchase.linkedTransactionId;
      } else {
        linkedTransId = addTransaction(txPayload);
      }
    }

    const purchasePayload: Omit<Purchase, 'id'> = {
      companyId: form.companyId,
      receiverId: form.receiverId,
      driverId: finalDriverId || undefined,
      driverNameManual: finalDriverNameManual || undefined,
      plateNumberManual: finalPlateManual || undefined,
      driverPhoneManual: form.driverPhoneManual.trim() || undefined,
      scaleTicketNo: form.scaleTicketNo.trim() || undefined,
      coordinationType: form.coordinationType,
      loadingStatus: entryMode,
      date: formattedDate,
      volume: entryMode === 'LOADED' ? computedWeights.tons : 0,
      weightKg: entryMode === 'LOADED' ? computedWeights.kg : 0,
      price: entryMode === 'LOADED' ? finalRateUSD : 0,
      declaredRate: entryMode === 'LOADED' ? finalRateUSD : 0,
      declaredRateUSD: entryMode === 'LOADED' ? finalRateUSD : 0,
      declaredRateAED: entryMode === 'LOADED' ? finalRateAED : 0,
      exchangeRateUSD_AED: currentUsdAedFactor,
      rateCurrency: 'USD',
      totalPrice: entryMode === 'LOADED' ? calculatedTotalUSD : 0,
      totalPriceForeign: entryMode === 'LOADED' ? calculatedTotalUSD : 0,
      totalPriceUSD: entryMode === 'LOADED' ? calculatedTotalUSD : 0,
      totalPriceAED: entryMode === 'LOADED' ? calculatedTotalAED : 0,
      linkedTransactionId: linkedTransId,
      description: form.description.trim()
    };

    if (editId) {
      updatePurchase(editId, purchasePayload);
      showToast('اطلاعات باسکول بارگیری و بار شرکت با موفقیت بروزرسانی شد');
    } else {
      addPurchase(purchasePayload);
      if (entryMode === 'PENDING_SCALE') {
        showToast('هماهنگی تلفنی ثبت شد. پس از ارسال قبض باسکول توسط راننده، وزن و نرخ اعلامی را تکمیل کنید.');
      } else {
        showToast('بار بارگیری‌شده شرکت با موفقیت در سیستم ثبت شد');
      }
    }

    resetForm();
  };

  // Edit a unified load record
  const handleEditLoad = (item: UnifiedCompanyLoad) => {
    if (item.source === 'PURCHASE' && item.rawPurchase) {
      const p = item.rawPurchase;
      setEditId(p.id);
      setEntryMode('LOADED');
      setWeightUnit('TON');

      const factor = p.exchangeRateUSD_AED || 3.67;
      setUsdAedRateInput(factor.toString());

      if (p.driverId) {
        setDriverInputMode('SELECT');
      } else if (p.driverNameManual) {
        setDriverInputMode('MANUAL');
      }

      const rateUsd = p.declaredRateUSD || p.declaredRate || p.price || 0;
      const rateAed = p.declaredRateAED || (rateUsd > 0 ? parseFloat((rateUsd * factor).toFixed(2)) : 0);

      setForm({
        companyId: p.companyId || '',
        receiverId: p.receiverId || '',
        driverId: p.driverId || '',
        driverNameManual: p.driverNameManual || '',
        plateNumberManual: p.plateNumberManual || '',
        driverPhoneManual: p.driverPhoneManual || '',
        scaleTicketNo: p.scaleTicketNo || '',
        coordinationType: p.coordinationType || 'PHONE',
        volumeInput: p.volume > 0 ? p.volume.toString() : '',
        declaredRate: rateUsd > 0 ? rateUsd.toString() : '',
        declaredRateAED: rateAed > 0 ? rateAed.toString() : '',
        rateCurrency: 'USD',
        description: p.description || ''
      });

      setPurchaseDate(
        new DateObject({ date: p.date, format: 'YYYY/MM/DD HH:mm', calendar: persian, locale: persian_fa })
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    if (deleteConfirmId.source === 'PURCHASE') {
      const p = purchases.find(item => item.id === deleteConfirmId.id);
      if (p?.linkedTransactionId) {
        deleteTransaction(p.linkedTransactionId);
      }
      deletePurchase(deleteConfirmId.id);
      showToast('رکورد بار شرکت حذف شد');
    } else {
      deleteTransaction(deleteConfirmId.id);
      showToast('رکورد تراکنش بار شرکت حذف شد');
    }
    setDeleteConfirmId(null);
  };

  // Build Unified Company Loads List (combining `purchases` + unlinked `transactions` that have companyId)
  const allCompanyLoads = useMemo<UnifiedCompanyLoad[]>(() => {
    const linkedTxIds = new Set(
      purchases.map(p => p.linkedTransactionId).filter((id): id is string => Boolean(id))
    );

    const fromPurchases: UnifiedCompanyLoad[] = purchases.map(p => {
      const drv = p.driverId ? drivers.find(d => d.id === p.driverId) : undefined;
      const currency = p.rateCurrency || 'USD';
      const usdAedFactor = p.exchangeRateUSD_AED || 3.67;
      const rawRate = Number(p.declaredRateUSD || p.declaredRate || p.price) || 0;
      const declaredRateUSD =
        currency === 'AED' && !p.declaredRateUSD
          ? parseFloat((rawRate / usdAedFactor).toFixed(2))
          : rawRate;
      const declaredRateAED =
        p.declaredRateAED && p.declaredRateAED > 0
          ? Number(p.declaredRateAED)
          : parseFloat((declaredRateUSD * usdAedFactor).toFixed(2));
      const volumeTons = Number(p.volume) || 0;
      const totalAmountUSD =
        p.totalPriceUSD && p.totalPriceUSD > 0
          ? Number(p.totalPriceUSD)
          : parseFloat((volumeTons * declaredRateUSD).toFixed(2));
      const totalAmountAED =
        p.totalPriceAED && p.totalPriceAED > 0
          ? Number(p.totalPriceAED)
          : parseFloat((volumeTons * declaredRateAED).toFixed(2));

      return {
        id: p.id,
        source: 'PURCHASE',
        companyId: p.companyId,
        companyName: getCompanyName(p.companyId),
        receiverId: p.receiverId || 'UNSPECIFIED',
        receiverName: p.receiverId ? getReceiverName(p.receiverId) : 'تعیین نشده (عمومی)',
        driverId: p.driverId || '',
        driverName: drv ? drv.fullName : p.driverNameManual || 'ثبت نشده',
        plateNumber: drv ? drv.plateNumber : p.plateNumberManual || '-',
        scaleTicketNo: p.scaleTicketNo || '-',
        coordinationType: p.coordinationType || 'PHONE',
        loadingStatus: p.loadingStatus || 'LOADED',
        date: p.date,
        volumeTons,
        weightKg: p.weightKg || Math.round(volumeTons * 1000),
        declaredRate: declaredRateUSD,
        declaredRateUSD,
        declaredRateAED,
        exchangeRateUSD_AED: usdAedFactor,
        rateCurrency: currency,
        unitPriceToman: Number(p.price) || 0,
        totalPriceToman: Number(p.totalPrice) || 0,
        totalPriceForeign: totalAmountUSD,
        totalAmountUSD,
        totalAmountAED,
        freightRate: p.freightRate,
        freightPrice: p.freightPrice,
        description: p.description || '',
        rawPurchase: p
      };
    });

    const fromUnlinkedTransactions: UnifiedCompanyLoad[] = transactions
      .filter(t => Boolean(t.companyId) && !linkedTxIds.has(t.id))
      .map(t => {
        const drv = drivers.find(d => d.id === t.driverId);
        const currency = t.gasCurrency || 'USD';
        const usdAedFactor = t.exchangeRateUSD_AED || 3.67;
        const rawRate =
          Number(
            t.declaredRate ||
              (currency === 'USD' && t.gasPriceUSD ? t.gasPriceUSD : t.price)
          ) || 0;
        const declaredRateUSD = rawRate;
        const declaredRateAED =
          t.gasPriceAED && t.gasPriceAED > 0
            ? Number(t.gasPriceAED)
            : parseFloat((declaredRateUSD * usdAedFactor).toFixed(2));
        const volumeTons = Number(t.volume) || 0;
        const totalAmountUSD = parseFloat((volumeTons * declaredRateUSD).toFixed(2));
        const totalAmountAED = parseFloat((volumeTons * declaredRateAED).toFixed(2));

        return {
          id: t.id,
          source: 'TRANSACTION',
          companyId: t.companyId!,
          companyName: getCompanyName(t.companyId!),
          receiverId: t.receiverId || 'UNSPECIFIED',
          receiverName: t.receiverId ? getReceiverName(t.receiverId) : 'تعیین نشده (عمومی)',
          driverId: t.driverId,
          driverName: drv ? drv.fullName : t.driverNameManual || 'ناشناس',
          plateNumber: drv ? drv.plateNumber : t.plateNumberManual || '-',
          scaleTicketNo: t.scaleTicketNo || t.billOfLading || '-',
          coordinationType: t.coordinationType || 'PROGRAM',
          loadingStatus: 'LOADED',
          date: t.date,
          volumeTons,
          weightKg: t.weightKg || Math.round(volumeTons * 1000),
          declaredRate: declaredRateUSD,
          declaredRateUSD,
          declaredRateAED,
          exchangeRateUSD_AED: usdAedFactor,
          rateCurrency: currency,
          unitPriceToman: Number(t.price) || 0,
          totalPriceToman: Number(t.totalPrice) || 0,
          totalPriceForeign: totalAmountUSD,
          totalAmountUSD,
          totalAmountAED,
          freightRate: t.freightRate,
          freightPrice: t.freightPrice,
          description: t.description || ''
        };
      });

    return [...fromPurchases, ...fromUnlinkedTransactions].sort(
      (a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0)
    );
  }, [purchases, transactions, drivers, companies, receivers]);

  // Separate Pending Phone Coordinated Loads (waiting for driver to send scale ticket) vs Loaded
  const pendingScaleLoads = useMemo(
    () => allCompanyLoads.filter(l => l.loadingStatus === 'PENDING_SCALE'),
    [allCompanyLoads]
  );

  const loadedCompanyLoads = useMemo(
    () => allCompanyLoads.filter(l => l.loadingStatus !== 'PENDING_SCALE'),
    [allCompanyLoads]
  );

  // Filtered Loaded Records
  const filteredLoads = useMemo(() => {
    return loadedCompanyLoads.filter(item => {
      if (filterCompanyId !== 'ALL' && item.companyId !== filterCompanyId) return false;
      if (filterReceiverId !== 'ALL' && item.receiverId !== filterReceiverId) return false;
      if (filterDriverId !== 'ALL' && item.driverId !== filterDriverId) return false;
      if (filterCoordination !== 'ALL' && item.coordinationType !== filterCoordination) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          item.companyName.toLowerCase().includes(q) ||
          item.receiverName.toLowerCase().includes(q) ||
          item.driverName.toLowerCase().includes(q) ||
          item.plateNumber.toLowerCase().includes(q) ||
          item.scaleTicketNo.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.declaredRateUSD.toString().includes(q) ||
          item.declaredRateAED.toString().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [loadedCompanyLoads, filterCompanyId, filterReceiverId, filterDriverId, filterCoordination, searchQuery]);

  // 1. Grouped Report: Company -> Receiver -> Rates Breakdown
  const companyBreakdownReport = useMemo(() => {
    const companyMap = new Map<
      string,
      {
        companyId: string;
        companyName: string;
        totalLoadsCount: number;
        totalVolumeTons: number;
        totalWeightKg: number;
        totalAmountUSD: number;
        totalAmountAED: number;
        receiversMap: Map<
          string,
          {
            receiverId: string;
            receiverName: string;
            loadsCount: number;
            totalVolumeTons: number;
            totalWeightKg: number;
            totalAmountUSD: number;
            totalAmountAED: number;
            driversSet: Set<string>;
            ratesMap: Map<
              string,
              {
                rateUSD: number;
                rateAED: number;
                loadsCount: number;
                volumeTons: number;
                amountUSD: number;
                amountAED: number;
              }
            >;
          }
        >;
      }
    >();

    filteredLoads.forEach(load => {
      if (!companyMap.has(load.companyId)) {
        companyMap.set(load.companyId, {
          companyId: load.companyId,
          companyName: load.companyName,
          totalLoadsCount: 0,
          totalVolumeTons: 0,
          totalWeightKg: 0,
          totalAmountUSD: 0,
          totalAmountAED: 0,
          receiversMap: new Map()
        });
      }

      const compGroup = companyMap.get(load.companyId)!;
      compGroup.totalLoadsCount += 1;
      compGroup.totalVolumeTons += load.volumeTons;
      compGroup.totalWeightKg += load.weightKg;
      compGroup.totalAmountUSD += load.totalAmountUSD;
      compGroup.totalAmountAED += load.totalAmountAED;

      if (!compGroup.receiversMap.has(load.receiverId)) {
        compGroup.receiversMap.set(load.receiverId, {
          receiverId: load.receiverId,
          receiverName: load.receiverName,
          loadsCount: 0,
          totalVolumeTons: 0,
          totalWeightKg: 0,
          totalAmountUSD: 0,
          totalAmountAED: 0,
          driversSet: new Set(),
          ratesMap: new Map()
        });
      }

      const recGroup = compGroup.receiversMap.get(load.receiverId)!;
      recGroup.loadsCount += 1;
      recGroup.totalVolumeTons += load.volumeTons;
      recGroup.totalWeightKg += load.weightKg;
      recGroup.totalAmountUSD += load.totalAmountUSD;
      recGroup.totalAmountAED += load.totalAmountAED;
      if (load.driverName && load.driverName !== 'ثبت نشده') {
        recGroup.driversSet.add(load.driverName);
      }

      const rateKey = `${load.declaredRateUSD}`;
      if (!recGroup.ratesMap.has(rateKey)) {
        recGroup.ratesMap.set(rateKey, {
          rateUSD: load.declaredRateUSD,
          rateAED: load.declaredRateAED,
          loadsCount: 0,
          volumeTons: 0,
          amountUSD: 0,
          amountAED: 0
        });
      }

      const rateGroup = recGroup.ratesMap.get(rateKey)!;
      rateGroup.loadsCount += 1;
      rateGroup.volumeTons += load.volumeTons;
      rateGroup.amountUSD += load.totalAmountUSD;
      rateGroup.amountAED += load.totalAmountAED;
    });

    return Array.from(companyMap.values()).map(comp => ({
      ...comp,
      receivers: Array.from(comp.receiversMap.values()).map(rec => ({
        ...rec,
        driversList: Array.from(rec.driversSet),
        ratesBreakdown: Array.from(rec.ratesMap.values())
      }))
    }));
  }, [filteredLoads]);

  // 2. Flat Matrix Report: (Sender Company + Receiver + Rate) rows
  const rateMatrixRows = useMemo(() => {
    const rows: {
      key: string;
      companyId: string;
      companyName: string;
      receiverId: string;
      receiverName: string;
      rateUSD: number;
      rateAED: number;
      loadsCount: number;
      volumeTons: number;
      weightKg: number;
      amountUSD: number;
      amountAED: number;
      drivers: string[];
    }[] = [];

    companyBreakdownReport.forEach(comp => {
      comp.receivers.forEach(rec => {
        rec.ratesBreakdown.forEach(rt => {
          rows.push({
            key: `${comp.companyId}_${rec.receiverId}_${rt.rateUSD}`,
            companyId: comp.companyId,
            companyName: comp.companyName,
            receiverId: rec.receiverId,
            receiverName: rec.receiverName,
            rateUSD: rt.rateUSD,
            rateAED: rt.rateAED,
            loadsCount: rt.loadsCount,
            volumeTons: rt.volumeTons,
            weightKg: Math.round(rt.volumeTons * 1000),
            amountUSD: rt.amountUSD,
            amountAED: rt.amountAED,
            drivers: rec.driversList
          });
        });
      });
    });

    return rows;
  }, [companyBreakdownReport]);

  const formatRateBadge = (rate: number) => {
    return rate > 0 ? `$${(rate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '---';
  };

  const formatAedRateBadge = (rateAed: number) => {
    return rateAed > 0 ? `${(rateAed || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED` : '---';
  };

  const handleExportCSV = () => {
    if (filteredLoads.length === 0) {
      showToast('داده‌ای برای خروجی اکسل وجود ندارد', 'error');
      return;
    }

    const headers = [
      'تاریخ بارگیری',
      'شرکت فرستنده (مبدأ)',
      'گیرنده بار (مقصد)',
      'نام راننده',
      'پلاک خودرو',
      'شماره قبض باسکول',
      'نحوه هماهنگی',
      'وزن باسکول (تن)',
      'وزن باسکول (کیلوگرم)',
      'نرخ اعلامی دلاری ($)',
      'نرخ درهمی (AED - فرمول 3.67)',
      'جمع مبلغ دلاری ($)',
      'جمع مبلغ درهمی (AED - فرمول 3.67)',
      'توضیحات'
    ];

    const rows = filteredLoads.map(l => [
      l.date,
      l.companyName,
      l.receiverName,
      l.driverName,
      l.plateNumber,
      l.scaleTicketNo,
      l.coordinationType === 'PHONE' ? 'هماهنگی تلفنی (باسکول راننده)' : l.coordinationType === 'PROGRAM' ? 'برنامه‌ای' : 'مستقیم',
      l.volumeTons,
      l.weightKg,
      l.declaredRateUSD > 0 ? `$${l.declaredRateUSD}` : '',
      l.declaredRateAED > 0 ? `${l.declaredRateAED} AED` : '',
      l.totalAmountUSD > 0 ? `$${l.totalAmountUSD.toFixed(2)}` : '$0',
      l.totalAmountAED > 0 ? `${l.totalAmountAED.toFixed(2)} AED` : '0 AED',
      l.description
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `company_loads_report_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
    link.click();
  };

  const handleExportSummaryCSV = () => {
    if (rateMatrixRows.length === 0) {
      showToast('داده‌ای برای خروجی خلاصه وجود ندارد', 'error');
      return;
    }

    const headers = [
      'شرکت فرستنده',
      'گیرنده بار (مقصد)',
      'تعداد بار ارسالی (سرویس)',
      'نرخ اعلامی دلاری ($)',
      'نرخ درهمی (AED - فرمول 3.67)',
      'جمع وزن باسکول (تن)',
      'جمع مبلغ دلاری ($)',
      'جمع مبلغ درهمی (AED - فرمول 3.67)',
      'رانندگان حمل‌کننده'
    ];

    const rows = rateMatrixRows.map(r => [
      r.companyName,
      r.receiverName,
      r.loadsCount,
      r.rateUSD > 0 ? `$${r.rateUSD}` : '',
      r.rateAED > 0 ? `${r.rateAED} AED` : '',
      r.volumeTons.toFixed(2),
      `$${r.amountUSD.toFixed(2)}`,
      `${r.amountAED.toFixed(2)} AED`,
      r.drivers.join(' - ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `company_receiver_rate_summary_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
    link.click();
  };

  // Totals for KPI bar
  const kpiStats = useMemo(() => {
    const totalLoads = filteredLoads.length;
    const totalTons = filteredLoads.reduce((s, i) => s + i.volumeTons, 0);
    const totalAmountUSD = filteredLoads.reduce((s, i) => s + i.totalAmountUSD, 0);
    const totalAmountAED = filteredLoads.reduce((s, i) => s + i.totalAmountAED, 0);
    const uniqueCompanies = new Set(filteredLoads.map(i => i.companyId)).size;
    const uniqueReceivers = new Set(filteredLoads.map(i => i.receiverId)).size;
    return { totalLoads, totalTons, totalAmountUSD, totalAmountAED, uniqueCompanies, uniqueReceivers };
  }, [filteredLoads]);

  const currentFormRateUSDNum = parseFloat(form.declaredRate) || 0;
  const currentFormRateAEDNum =
    parseFloat(form.declaredRateAED) ||
    (currentFormRateUSDNum > 0 ? parseFloat((currentFormRateUSDNum * currentUsdAedFactor).toFixed(2)) : 0);
  const currentFormCalculatedUSD = parseFloat((computedWeights.tons * currentFormRateUSDNum).toFixed(2));
  const currentFormCalculatedAED = parseFloat((computedWeights.tons * currentFormRateAEDNum).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-5 print:hidden ${
            toastMessage.type === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-emerald-600 text-white border-emerald-500'
          }`}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6 border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-slate-900">
          گزارش جامع بارهای بارگیری‌شده شرکت‌ها (به تفکیک فرستنده، گیرنده، تعداد بار، نرخ دلاری، نرخ درهمی ۳.۶۷ و جمع مبلغ)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          تاریخ چاپ گزارش: {new Date().toLocaleDateString('fa-IR')} | تعداد کل سرویس‌ها: {kpiStats.totalLoads} بار | جمع کل تناژ باسکول: {(kpiStats.totalTons || 0).toLocaleString()} تن | جمع کل دلاری: ${(kpiStats.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} | جمع کل درهمی (فرمول 3.67): {(kpiStats.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
        </p>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">تعداد کل بارهای ثبت‌شده</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {(kpiStats.totalLoads || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">سرویس / بار</span>
            </p>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1">
              از {kpiStats.uniqueCompanies} شرکت فرستنده برای {kpiStats.uniqueReceivers} گیرنده
            </p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <Truck size={26} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">جمع وزن باسکول بارگیری</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1" dir="ltr">
              {(kpiStats.totalTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} <span className="text-xs font-normal">Ton</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono" dir="ltr">
              {Math.round((kpiStats.totalTons || 0) * 1000).toLocaleString()} Kg
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Scale size={26} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/70 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">جمع مبلغ کل (دلار $ و درهم 3.67)</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono" dir="ltr">
              ${(kpiStats.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono" dir="ltr">
              {(kpiStats.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED <span className="text-[10px] font-normal">(×3.67)</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Calculator size={26} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">بارهای تلفنی منتظر باسکول</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {pendingScaleLoads.length} <span className="text-xs font-normal text-slate-400">ماشین در بارگیری</span>
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1">
              هماهنگ‌شده تلفنی تا ارسال قبض باسکول
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <PhoneCall size={26} />
          </div>
        </div>
      </div>

      {/* Main Registration Form Card */}
      <div
        className={`rounded-2xl shadow-sm border p-6 print:hidden transition-all ${
          editId
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${
                editId
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
              }`}
            >
              {editId ? <Pencil size={24} /> : <Scale size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">
                {editId
                  ? 'تکمیل / ویرایش اطلاعات باسکول بارگیری شرکت'
                  : 'ثبت بار شرکت‌ها (بر اساس قبض باسکول بارگیری ارسالی راننده)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                پس از بارگیری ماشین و ارسال باسکول توسط راننده، فرستنده بار، گیرنده بار، وزن باسکول و نرخ اعلامی (دلاری و معادل درهمی با فرمول ۳.۶۷) را وارد کنید
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEntryMode('LOADED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  entryMode === 'LOADED'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Scale size={14} />
                باسکول بارگیری رسیده (ثبت کامل)
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('PENDING_SCALE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  entryMode === 'PENDING_SCALE'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <PhoneCall size={14} />
                پیش‌ثبت تلفنی (قبل از باسکول)
              </button>
            </div>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-bold flex items-center gap-1"
              >
                <X size={15} /> انصراف
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Sender Company & Receiver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            {/* Sender (Company) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 size={16} className="text-cyan-600" />
                  ۱. فرستنده بار در برنامه (شرکت مبدأ) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCompanyModal(true)}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> تعریف سریع شرکت فرستنده
                </button>
              </div>
              <select
                value={form.companyId}
                onChange={e => setForm({ ...form, companyId: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="">انتخاب فرستنده بار (شرکت)...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.address ? `(${c.address})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Receiver */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Container size={16} className="text-indigo-600" />
                  ۲. گیرنده بار (تحویل‌گیرنده / مقصد) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickReceiverModal(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> تعریف سریع گیرنده جدید
                </button>
              </div>
              <select
                value={form.receiverId}
                onChange={e => setForm({ ...form, receiverId: e.target.value })}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">انتخاب گیرنده بار (مقصد)...</option>
                {receivers.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.address ? `- ${r.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Driver, Coordination Type, Date, Weighbridge Scale Ticket & Declared Rate */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Driver Selection or Manual Phone Driver */}
            <div className="md:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Truck size={16} className="text-emerald-600" />
                  ۳. راننده و ماشین بارگیری‌کننده
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setDriverInputMode('SELECT')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      driverInputMode === 'SELECT'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    انتخاب از لیست رانندگان
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverInputMode('MANUAL')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      driverInputMode === 'MANUAL'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    ثبت سریع راننده تلفنی / جدید
                  </button>
                </div>
              </div>

              {driverInputMode === 'SELECT' ? (
                <select
                  value={form.driverId}
                  onChange={e => setForm({ ...form, driverId: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="">انتخاب راننده...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} | پلاک: {d.plateNumber}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      value={form.driverNameManual}
                      onChange={e => setForm({ ...form, driverNameManual: e.target.value })}
                      placeholder="نام و نام خانوادگی راننده..."
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={form.plateNumberManual}
                      onChange={e => setForm({ ...form, plateNumberManual: e.target.value })}
                      placeholder="شماره پلاک ماشین..."
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={form.driverPhoneManual}
                      onChange={e => setForm({ ...form, driverPhoneManual: e.target.value })}
                      placeholder="موبایل راننده (اختیاری)"
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveManualDriverToList}
                      onChange={e => setSaveManualDriverToList(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    این راننده به صورت خودکار به لیست رانندگان سیستم هم اضافه شود
                  </label>
                </div>
              )}
            </div>

            {/* Coordination Type & Date */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نحوه هماهنگی بارگیری
                </label>
                <select
                  value={form.coordinationType}
                  onChange={e =>
                    setForm({ ...form, coordinationType: e.target.value as 'PHONE' | 'PROGRAM' | 'DIRECT' })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="PHONE">هماهنگی تلفنی (ارسال باسکول توسط راننده)</option>
                  <option value="PROGRAM">حواله / برنامه رسمی شرکت</option>
                  <option value="DIRECT">بارگیری مستقیم</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاریخ و ساعت بارگیری
                </label>
                <DatePicker
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD HH:mm"
                  plugins={[<TimePicker hideSeconds />]}
                  inputClass="rmdp-input w-full"
                />
              </div>
            </div>

            {/* Weighbridge Scale Weight, Ticket Number & Declared Rate (When LOADED) */}
            {entryMode === 'LOADED' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Scale size={16} className="text-cyan-600" />
                      ۴. وزن باسکول بارگیری <span className="text-red-500">*</span>
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        type="button"
                        onClick={() => setWeightUnit('TON')}
                        className={`px-2 py-0.5 rounded font-bold ${
                          weightUnit === 'TON'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        تن (Ton)
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeightUnit('KG')}
                        className={`px-2 py-0.5 rounded font-bold ${
                          weightUnit === 'KG'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        کیلوگرم (Kg)
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      value={form.volumeInput}
                      onChange={e => setForm({ ...form, volumeInput: e.target.value })}
                      placeholder={weightUnit === 'TON' ? 'مثال: 22.45' : 'مثال: 22450'}
                      className="w-full p-3 pl-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-black text-lg text-left focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/40 px-2 py-1 rounded">
                      {weightUnit === 'TON' ? 'Ton' : 'Kg'}
                    </span>
                  </div>
                  {computedWeights.tons > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1 px-1">
                      <span>معادل باسکول:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                        {computedWeights.tons} Ton ({(computedWeights.kg || 0).toLocaleString()} Kg)
                      </span>
                    </div>
                  )}
                </div>

                {/* 5. Declared Rate USD ($) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                      ۵. نرخ اعلامی دلاری ($) <span className="text-red-500">*</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-black font-mono">
                      USD ($) پیش‌فرض
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={formatNumberInput(form.declaredRate)}
                      onChange={e => handleUsdRateChange(e.target.value)}
                      placeholder="مثال: 450"
                      className="w-full p-3 pl-12 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-black text-lg text-left focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-emerald-600 dark:text-emerald-400 font-mono pointer-events-none">
                      $
                    </span>
                  </div>
                </div>

                {/* 6. Dirham Rate (AED) based on 3.67 formula */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                      ۶. نرخ درهم (فرمول ۳.۶۷)
                    </label>
                    <div className="flex items-center gap-1" dir="ltr">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">×</span>
                      <input
                        type="number"
                        step="0.01"
                        value={usdAedRateInput}
                        onChange={e => handleUsdAedFactorChange(e.target.value)}
                        title="ضریب تبدیل دلار به درهم (پیش‌فرض 3.67)"
                        className="w-14 px-1.5 py-0.5 text-[11px] font-mono font-black text-center bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700 rounded text-indigo-700 dark:text-indigo-300 outline-none"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={formatNumberInput(form.declaredRateAED)}
                      onChange={e => handleAedRateChange(e.target.value)}
                      placeholder="محاسبه خودکار (دلار × 3.67)"
                      className="w-full p-3 pl-14 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-300 dark:border-indigo-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-black text-lg text-left focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono pointer-events-none">
                      AED
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">
                    نرخ دلار × {currentUsdAedFactor} = نرخ درهم هر تن
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    شماره قبض باسکول / بارنامه
                  </label>
                  <input
                    type="text"
                    value={form.scaleTicketNo}
                    onChange={e => setForm({ ...form, scaleTicketNo: e.target.value })}
                    placeholder="شماره قبض باسکول ارسالی راننده..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono outline-none"
                  />
                </div>

                {/* Live Calculated Total Amount (Weight × Declared Rate in USD and AED) */}
                <div className="md:col-span-4 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                      <Calculator size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 block">
                        جمع مبلغ محاسبه‌شده بار (بر اساس وزن باسکول و نرخ اعلامی دلاری و درهمی با فرمول ۳.۶۷):
                      </span>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-mono" dir="ltr">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          {computedWeights.tons > 0 ? `${computedWeights.tons} Ton` : '0 Ton'} × ${(currentFormRateUSDNum || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                          {computedWeights.tons > 0 ? `${computedWeights.tons} Ton` : '0 Ton'} × {(currentFormRateAEDNum || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED (×{currentUsdAedFactor})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm text-left" dir="ltr">
                      <span className="block text-[10px] text-slate-400 font-sans text-right">جمع مبلغ دلاری ($)</span>
                      <span className="font-mono font-black text-xl text-emerald-700 dark:text-emerald-300">
                        ${(currentFormCalculatedUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm text-left" dir="ltr">
                      <span className="block text-[10px] text-indigo-500 font-sans text-right">جمع مبلغ درهمی (فرمول 3.67)</span>
                      <span className="font-mono font-black text-xl text-indigo-700 dark:text-indigo-300">
                        {(currentFormCalculatedAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs">AED</span>
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Description, Sync Checkbox & Submit */}
          <div className="space-y-3">
            {entryMode === 'LOADED' && (
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoRecordDriverWork}
                  onChange={e => setAlsoRecordDriverWork(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                ثبت همزمان این سرویس در کارکرد راننده
              </label>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات تکمیلی (شماره حواله، هماهنگ‌کننده تلفنی، ملاحظات باسکول و ...)
                </label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیحات بار..."
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className={`w-full py-3.5 px-6 rounded-xl font-black text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                    editId
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                      : entryMode === 'PENDING_SCALE'
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                        : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/25'
                  }`}
                >
                  {editId ? (
                    <>
                      <Save size={20} /> ذخیره نهایی باسکول و نرخ
                    </>
                  ) : entryMode === 'PENDING_SCALE' ? (
                    <>
                      <PhoneCall size={20} /> ثبت در صف انتظار باسکول
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} /> ثبت بار شرکت و باسکول بارگیری
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Pending Phone Coordinated Loads (Waiting for Driver Scale Ticket) */}
      {pendingScaleLoads.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl animate-pulse">
                <PhoneCall size={20} />
              </div>
              <div>
                <h3 className="font-black text-amber-900 dark:text-amber-200 text-base">
                  ماشین‌های اعزامی با هماهنگی تلفنی (منتظر ارسال قبض باسکول بارگیری توسط راننده)
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  به محض اینکه راننده قبض باسکول بارگیری را فرستاد، روی دکمه «ثبت وزن باسکول و نرخ اعلامی» کلیک کنید
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full text-xs font-black">
              {pendingScaleLoads.length} مورد در انتظار باسکول
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingScaleLoads.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span dir="ltr">{item.date}</span>
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded font-bold">
                      هماهنگی تلفنی
                    </span>
                  </div>
                  <div className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                    <span className="text-cyan-600 dark:text-cyan-400">{item.companyName}</span>
                    <ArrowLeft size={14} className="text-slate-400" />
                    <span className="text-indigo-600 dark:text-indigo-400">{item.receiverName}</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Truck size={14} className="text-slate-400" />
                    <span>راننده: {item.driverName}</span>
                    {item.plateNumber !== '-' && <span className="font-mono">({item.plateNumber})</span>}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleEditLoad(item)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Scale size={14} /> ثبت وزن باسکول و نرخ اعلامی
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId({ id: item.id, source: item.source })}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comprehensive Reporting Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:border-0 print:shadow-none">
        {/* Report Header & View Tabs */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Layers size={22} className="text-cyan-600" />
                گزارش جامع بارهای شرکت‌ها (هر شرکت برای کدام گیرنده، چند بار و با چه نرخی فرستاده است)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تفکیک کامل بارهای بارگیری‌شده بر اساس شرکت فرستنده، گیرنده بار، تعداد سرویس، وزن باسکول، نرخ دلاری ($) و نرخ درهمی (AED با فرمول ۳.۶۷)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportSummaryCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded-xl hover:bg-cyan-100 text-xs font-bold transition-colors"
              >
                <FileSpreadsheet size={15} /> اکسل خلاصه (شرکت و نرخ‌ها)
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 text-xs font-bold transition-colors"
              >
                <Download size={15} /> اکسل ریز باسکول‌ها
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl hover:bg-slate-900 text-xs font-bold transition-colors"
              >
                <Printer size={15} /> چاپ گزارش
              </button>
            </div>
          </div>

          {/* Sub-navigation Tabs for Report Views */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReportTab('COMPANY_BREAKDOWN')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                reportTab === 'COMPANY_BREAKDOWN'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building2 size={16} />
              ۱. گزارش تفکیکی هر شرکت (فرستنده ⬅ گیرنده ⬅ تعداد بار، نرخ دلاری و نرخ درهم ۳.۶۷)
            </button>
            <button
              type="button"
              onClick={() => setReportTab('RATE_MATRIX')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                reportTab === 'RATE_MATRIX'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <ListFilter size={16} />
              ۲. جدول یکپارچه نرخ‌ها (نرخ دلار $، نرخ درهم AED و جمع مبالغ)
            </button>
            <button
              type="button"
              onClick={() => setReportTab('DETAILED_LIST')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                reportTab === 'DETAILED_LIST'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Scale size={16} />
              ۳. لیست ریز قبض‌های باسکول بارگیری ({filteredLoads.length} مورد)
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                فیلتر شرکت فرستنده:
              </label>
              <select
                value={filterCompanyId}
                onChange={e => setFilterCompanyId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">همه شرکت‌های فرستنده</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                فیلتر گیرنده بار (مقصد):
              </label>
              <select
                value={filterReceiverId}
                onChange={e => setFilterReceiverId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">همه گیرندگان</option>
                {receivers.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                فیلتر راننده:
              </label>
              <select
                value={filterDriverId}
                onChange={e => setFilterDriverId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">همه رانندگان</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                نحوه هماهنگی:
              </label>
              <select
                value={filterCoordination}
                onChange={e => setFilterCoordination(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">همه روش‌ها</option>
                <option value="PHONE">هماهنگی تلفنی (باسکول راننده)</option>
                <option value="PROGRAM">حواله برنامه‌ای</option>
                <option value="DIRECT">مستقیم</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                جستجو (قبض، نرخ، راننده، پلاک):
              </label>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full p-2 pr-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                />
                <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 1: COMPANY BREAKDOWN (هر شرکت برای کی، چندتا بار و با چه نرخی فرستاده است) */}
        {reportTab === 'COMPANY_BREAKDOWN' && (
          <div className="p-5 space-y-6">
            {companyBreakdownReport.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                <Scale size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-bold">هنوز باری با این مشخصات برای شرکت‌ها ثبت نشده است.</p>
                <p className="text-xs mt-1">
                  از فرم بالای صفحه، بار بارگیری‌شده و قبض باسکول راننده را ثبت کنید.
                </p>
              </div>
            ) : (
              companyBreakdownReport.map(company => (
                <div
                  key={company.companyId}
                  className="border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm break-inside-avoid"
                >
                  {/* Company Banner */}
                  <div className="bg-slate-100 dark:bg-slate-800/90 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-cyan-600 text-white rounded-xl shadow-sm">
                        <Building2 size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">شرکت فرستنده بار:</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white">{company.companyName}</h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          ارسال بار برای {company.receivers.length} گیرنده (مقصد)
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                        <span className="block text-[10px] text-slate-500">تعداد کل بار ارسالی</span>
                        <span className="font-black text-base text-cyan-700 dark:text-cyan-400">
                          {company.totalLoadsCount} بار
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                        <span className="block text-[10px] text-slate-500">جمع وزن باسکول بارگیری</span>
                        <span className="font-black text-base text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">
                          {(company.totalVolumeTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                        </span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                        <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">جمع مبلغ دلاری ($)</span>
                        <span className="font-black text-base text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">
                          ${(company.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-950/50 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-center">
                        <span className="block text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">جمع مبلغ درهمی (فرمول 3.67)</span>
                        <span className="font-black text-base text-indigo-700 dark:text-indigo-400 font-mono" dir="ltr">
                          {(company.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Receivers & Rates Table for this Company */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-bold">برای کدام گیرنده (مقصد تحویل)</th>
                          <th className="px-4 py-3 font-bold text-center">تعداد بار (سرویس)</th>
                          <th className="px-4 py-3 font-bold">نرخ اعلامی دلاری ($) و نرخ درهم (فرمول ۳.۶۷)</th>
                          <th className="px-4 py-3 font-bold">جمع وزن باسکول بارگیری</th>
                          <th className="px-4 py-3 font-bold">جمع مبلغ دلاری ($)</th>
                          <th className="px-4 py-3 font-bold">جمع مبلغ درهمی (AED - 3.67)</th>
                          <th className="px-4 py-3 font-bold print:hidden text-center">ریز قبض‌ها</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {company.receivers.map(rec => (
                          <tr
                            key={rec.receiverId}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100">
                                <Container size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span>{rec.receiverName}</span>
                              </div>
                              {rec.driversList.length > 0 && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  رانندگان: {rec.driversList.join('، ')}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                                {rec.loadsCount} بار
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                {rec.ratesBreakdown.map((rt, idx) => (
                                  <div
                                    key={idx}
                                    className="inline-flex flex-wrap items-center gap-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 px-3 py-1.5 rounded-lg text-xs"
                                  >
                                    <span className="font-black text-emerald-800 dark:text-emerald-300">
                                      {rt.loadsCount} بار:
                                    </span>
                                    <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300" dir="ltr">
                                      {formatRateBadge(rt.rateUSD)}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300" dir="ltr">
                                      نرخ درهم: {formatAedRateBadge(rt.rateAED)}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="text-slate-600 dark:text-slate-400 font-mono" dir="ltr">
                                      وزن: {(rt.volumeTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                                      ${(rt.amountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-slate-400">/</span>
                                    <span className="font-mono font-black text-indigo-700 dark:text-indigo-300" dir="ltr">
                                      {(rt.amountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-mono font-black text-slate-800 dark:text-slate-200" dir="ltr">
                                {(rec.totalVolumeTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                ({(rec.totalWeightKg || 0).toLocaleString()} Kg)
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-mono font-black text-base text-emerald-700 dark:text-emerald-400" dir="ltr">
                                ${(rec.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                وزن × نرخ دلار
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="font-mono font-black text-base text-indigo-700 dark:text-indigo-400" dir="ltr">
                                {(rec.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                              </div>
                              <div className="text-[11px] text-indigo-500/80">
                                بر اساس فرمول ۳.۶۷
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterCompanyId(company.companyId);
                                  setFilterReceiverId(rec.receiverId === 'UNSPECIFIED' ? 'ALL' : rec.receiverId);
                                  setReportTab('DETAILED_LIST');
                                }}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-slate-700 dark:text-slate-300 hover:text-cyan-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                مشاهده {rec.loadsCount} باسکول
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW 2: FLAT MATRIX TABLE (فرستنده | گیرنده | تعداد بار | نرخ دلاری | نرخ درهمی 3.67 | جمع تناژ | جمع دلاری | جمع درهمی) */}
        {reportTab === 'RATE_MATRIX' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-4">ردیف</th>
                  <th className="px-4 py-4">فرستنده بار (شرکت مبدأ)</th>
                  <th className="px-4 py-4">گیرنده بار (مقصد تحویل)</th>
                  <th className="px-4 py-4 text-center">تعداد بار ارسالی</th>
                  <th className="px-4 py-4">نرخ اعلامی دلاری ($)</th>
                  <th className="px-4 py-4">نرخ درهم (فرمول ۳.۶۷)</th>
                  <th className="px-4 py-4">جمع وزن باسکول (تن / کیلوگرم)</th>
                  <th className="px-4 py-4">جمع مبلغ دلاری ($)</th>
                  <th className="px-4 py-4">جمع مبلغ درهمی (AED)</th>
                  <th className="px-4 py-4">رانندگان حمل‌کننده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rateMatrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400">
                      موردی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  rateMatrixRows.map((row, index) => (
                    <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4 text-slate-400 font-mono">{index + 1}</td>
                      <td className="px-4 py-4 font-black text-cyan-800 dark:text-cyan-300">{row.companyName}</td>
                      <td className="px-4 py-4 font-bold text-indigo-700 dark:text-indigo-300">{row.receiverName}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-black">
                          {row.loadsCount} بار
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono font-black text-emerald-700 dark:text-emerald-400" dir="ltr">
                        {formatRateBadge(row.rateUSD)}
                      </td>
                      <td className="px-4 py-4 font-mono font-black text-indigo-700 dark:text-indigo-400" dir="ltr">
                        {formatAedRateBadge(row.rateAED)}
                      </td>
                      <td className="px-4 py-4 font-mono" dir="ltr">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {(row.volumeTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                        </span>
                        <span className="text-xs text-slate-400 block">{(row.weightKg || 0).toLocaleString()} Kg</span>
                      </td>
                      <td className="px-4 py-4 font-mono font-black text-base text-emerald-700 dark:text-emerald-400" dir="ltr">
                        ${(row.amountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 font-mono font-black text-base text-indigo-700 dark:text-indigo-400" dir="ltr">
                        {(row.amountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {row.drivers.length > 0 ? row.drivers.join('، ') : '---'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rateMatrixRows.length > 0 && (
                <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center">
                      جمع کل گزارش
                    </td>
                    <td className="px-4 py-4 text-center text-cyan-700 dark:text-cyan-300">
                      {kpiStats.totalLoads} بار
                    </td>
                    <td className="px-4 py-4">---</td>
                    <td className="px-4 py-4">---</td>
                    <td className="px-4 py-4 font-mono" dir="ltr">
                      {(kpiStats.totalTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                    </td>
                    <td className="px-4 py-4 font-mono text-emerald-700 dark:text-emerald-400 text-base" dir="ltr">
                      ${(kpiStats.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 font-mono text-indigo-700 dark:text-indigo-400 text-base" dir="ltr">
                      {(kpiStats.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* VIEW 3: DETAILED SCALE TICKETS LIST (ریز قبض‌های باسکول بارگیری) */}
        {reportTab === 'DETAILED_LIST' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5">تاریخ بارگیری</th>
                  <th className="px-4 py-3.5">فرستنده بار (شرکت)</th>
                  <th className="px-4 py-3.5">گیرنده بار (مقصد)</th>
                  <th className="px-4 py-3.5">راننده و پلاک</th>
                  <th className="px-4 py-3.5">قبض باسکول / هماهنگی</th>
                  <th className="px-4 py-3.5">وزن باسکول بارگیری</th>
                  <th className="px-4 py-3.5">نرخ اعلامی دلاری ($)</th>
                  <th className="px-4 py-3.5">نرخ درهم (فرمول ۳.۶۷)</th>
                  <th className="px-4 py-3.5">جمع مبلغ دلاری ($)</th>
                  <th className="px-4 py-3.5">جمع مبلغ درهمی (AED)</th>
                  <th className="px-4 py-3.5">توضیحات</th>
                  <th className="px-4 py-3.5 text-center print:hidden">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLoads.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-slate-400">
                      هیچ قبض باسکول بارگیری یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredLoads.map(item => (
                    <tr key={`${item.source}_${item.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap font-mono" dir="ltr">
                        {item.date}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-cyan-800 dark:text-cyan-300">{item.companyName}</td>
                      <td className="px-4 py-3.5 font-bold text-indigo-700 dark:text-indigo-300">{item.receiverName}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.driverName}</div>
                        {item.plateNumber !== '-' && (
                          <div className="text-xs text-slate-400 font-mono">پلاک: {item.plateNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          قبض: {item.scaleTicketNo}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.coordinationType === 'PHONE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {item.coordinationType === 'PHONE'
                            ? 'تلفنی (باسکول راننده)'
                            : item.coordinationType === 'PROGRAM'
                              ? 'برنامه‌ای'
                              : 'مستقیم'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono" dir="ltr">
                        <div className="font-black text-slate-800 dark:text-slate-100">
                          {(item.volumeTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                        </div>
                        <div className="text-[11px] text-slate-400">{(item.weightKg || 0).toLocaleString()} Kg</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                        {formatRateBadge(item.declaredRateUSD)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-700 dark:text-indigo-400" dir="ltr">
                        {formatAedRateBadge(item.declaredRateAED)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                        {item.totalAmountUSD > 0
                          ? `$${(item.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : '---'}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-black text-indigo-700 dark:text-indigo-300" dir="ltr">
                        {item.totalAmountAED > 0
                          ? `${(item.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED`
                          : '---'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate" title={item.description}>
                        {item.description || '---'}
                      </td>
                      <td className="px-4 py-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          {item.source === 'PURCHASE' && (
                            <button
                              type="button"
                              onClick={() => handleEditLoad(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg"
                              title="ویرایش"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId({ id: item.id, source: item.source })}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredLoads.length > 0 && (
                <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={5} className="px-4 py-3.5 text-center">
                      جمع کل ({kpiStats.totalLoads} قبض باسکول)
                    </td>
                    <td className="px-4 py-3.5 font-mono" dir="ltr">
                      {(kpiStats.totalTons || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} Ton
                    </td>
                    <td className="px-4 py-3.5">---</td>
                    <td className="px-4 py-3.5">---</td>
                    <td className="px-4 py-3.5 font-mono text-emerald-700 dark:text-emerald-400 text-base" dir="ltr">
                      ${(kpiStats.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-indigo-700 dark:text-indigo-400 text-base" dir="ltr">
                      {(kpiStats.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Quick Add Company (Sender) Modal */}
      {showQuickCompanyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Building2 size={20} className="text-cyan-600" />
                تعریف سریع شرکت فرستنده جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCompanyModal(false)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickAddCompany} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نام شرکت / فرستنده بار <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={quickCompanyForm.name}
                  onChange={e => setQuickCompanyForm({ ...quickCompanyForm, name: e.target.value })}
                  placeholder="مثال: پتروشیمی / شرکت گاز..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تلفن هماهنگی</label>
                <input
                  value={quickCompanyForm.phone}
                  onChange={e => setQuickCompanyForm({ ...quickCompanyForm, phone: e.target.value })}
                  placeholder="شماره تماس..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مبدأ / آدرس بارگیری</label>
                <input
                  value={quickCompanyForm.address}
                  onChange={e => setQuickCompanyForm({ ...quickCompanyForm, address: e.target.value })}
                  placeholder="شهر یا پالایشگاه مبدأ..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuickCompanyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold"
                >
                  ثبت و انتخاب فرستنده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Receiver Modal */}
      {showQuickReceiverModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Container size={20} className="text-indigo-600" />
                تعریف سریع گیرنده بار جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickReceiverModal(false)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleQuickAddReceiver} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نام تحویل‌گیرنده / مشتری مقصد <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={quickReceiverForm.name}
                  onChange={e => setQuickReceiverForm({ ...quickReceiverForm, name: e.target.value })}
                  placeholder="نام شرکت یا شخص گیرنده..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تلفن تماس</label>
                <input
                  value={quickReceiverForm.phone}
                  onChange={e => setQuickReceiverForm({ ...quickReceiverForm, phone: e.target.value })}
                  placeholder="شماره تماس..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">آدرس / مرز یا مقصد تحویل</label>
                <input
                  value={quickReceiverForm.address}
                  onChange={e => setQuickReceiverForm({ ...quickReceiverForm, address: e.target.value })}
                  placeholder="مقصد تحویل بار..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuickReceiverModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  ثبت و انتخاب گیرنده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <h4 className="font-black text-slate-800 dark:text-white text-base">حذف رکورد بار شرکت</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              آیا از حذف این قبض باسکول و بار ثبت‌شده اطمینان دارید؟
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseEntry;
