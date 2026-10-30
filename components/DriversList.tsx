
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Users, DollarSign, X, History, FileText, SlidersHorizontal, TrendingUp, TrendingDown, Truck, WalletCards, Search, Printer, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, Fuel, Pencil, Save, Download, ListPlus, Calculator, ArrowDownLeft, FileDown, Settings2, CheckSquare, Square, Trash2, CalendarDays, RotateCcw, Calendar, Wrench, Receipt } from 'lucide-react';
import { Driver, DriverDepositCategory, DriverPreviousBalanceType } from '../types';
import { getDepositCategoryConfig } from './DriverSettlements';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ExportModal from './ExportModal';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import DriverExpensesManager, { DRIVER_EXPENSE_CATEGORIES_CONFIG } from './DriverExpensesManager';
import DriverDebtBreakdownReport from './DriverDebtBreakdownReport';
import { formatNumberInput, cleanNumberInput, numberToPersianWords } from '../utils/numberUtils';

type SortKey = 'fullName' | 'plateNumber' | 'previousBalance' | 'balance' | 'nationalId' | 'tankNumber' | 'licenseNo' | 'phone';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const DriversList: React.FC = () => {
  const { drivers, transactions, driverPayments, freights, driverVehicleExpenses, getDriverBalance, addDriverPayment, addDriverSettlement, addTransaction, addFreight, updateDriver, deleteDriver, exchangeRates, updateExchangeRates, addToQueue, queue, updateTransaction, updateDriverPayment, updateFreight, updateDriverVehicleExpense } = useData();
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalDriverId, setExpenseModalDriverId] = useState<string | null>(null);

  const [showDebtBreakdownModal, setShowDebtBreakdownModal] = useState(false);
  const [breakdownDriverId, setBreakdownDriverId] = useState<string | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [payIsStandalone, setPayIsStandalone] = useState<boolean>(false);
  const [payCategory, setPayCategory] = useState<DriverDepositCategory>('WAYBILL');
  const [payDeductFromBalance, setPayDeductFromBalance] = useState<boolean>(true);
  const [payTrackingCode, setPayTrackingCode] = useState('');
  const [paySelectedTxId, setPaySelectedTxId] = useState('');
  const [payBillOfLading, setPayBillOfLading] = useState('');
  const [payCargoWeight, setPayCargoWeight] = useState('');
  const [payRatePerTon, setPayRatePerTon] = useState('');
  const [payRateCurrency, setPayRateCurrency] = useState<'TOMAN' | 'USD' | 'AED'>('TOMAN');
  const [payExchangeRate, setPayExchangeRate] = useState('');
  const [payUsdAedRate, setPayUsdAedRate] = useState('3.67');
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payDate, setPayDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));

  const openPaymentModal = (driverId: string, standalone: boolean = false, category: DriverDepositCategory = standalone ? 'PREVIOUS_ACCOUNT' : 'WAYBILL') => {
    setSelectedDriverId(driverId);
    setPayIsStandalone(standalone);
    setPayCategory(category);
    setPayDeductFromBalance(standalone ? (category === 'PREVIOUS_ACCOUNT' ? false : true) : true);
    setPayTrackingCode('');
    setPayExchangeRate(exchangeRates.usd ? exchangeRates.usd.toString() : '60000');
    setPayUsdAedRate(exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67');
    setPaySelectedTxId('');
    setPayBillOfLading('');
    setPayCargoWeight('');
    setPayRatePerTon('');
    setPayRateCurrency('TOMAN');
    setPayAmount('');
    setPayDesc('');
    setPayDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const [freightDriverId, setFreightDriverId] = useState<string | null>(null);
  const [freightAmount, setFreightAmount] = useState('');
  const [freightOrigin, setFreightOrigin] = useState('');
  const [freightDest, setFreightDest] = useState('');
  const [freightDesc, setFreightDesc] = useState('');
  const [freightTrackingCode, setFreightTrackingCode] = useState('');

  const [transDriverId, setTransDriverId] = useState<string | null>(null);
  const [transVolume, setTransVolume] = useState('');
  const [transPrice, setTransPrice] = useState('');
  const [transFreightRate, setTransFreightRate] = useState(''); 
  const [transFreightPrice, setTransFreightPrice] = useState(''); 
  const [transBillOfLading, setTransBillOfLading] = useState('');
  const [transDesc, setTransDesc] = useState('');
  const [transDate, setTransDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  
  // انتخاب نرخ دلار، درهم و ریال/تومان در ثبت بار رانندگان
  const [transFreightCurrency, setTransFreightCurrency] = useState<'TOMAN' | 'USD' | 'AED'>('TOMAN');
  const [transGasCurrency, setTransGasCurrency] = useState<'USD' | 'TOMAN'>('USD');
  const [transExchangeRate, setTransExchangeRate] = useState<string>('');
  const [transUsdAedRate, setTransUsdAedRate] = useState<string>('3.67');
  const [showRialEquivalent, setShowRialEquivalent] = useState<boolean>(true);

  // Auto-fill exchange rate when modal opens
  useEffect(() => {
    if (transDriverId) {
      setTransExchangeRate(exchangeRates.usd ? exchangeRates.usd.toString() : '60000');
      setTransUsdAedRate(exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67');
    }
  }, [transDriverId, exchangeRates.usd, exchangeRates.usdAed]);

  // محاسبه خودکار کرایه بر اساس نرخ و وزن بار و نرخ تبدیل صرافی ۳.۶۷
  useEffect(() => {
      const vol = parseFloat(transVolume) || 0;
      const rate = parseFloat(transFreightRate) || 0;
      const exRate = parseFloat(transExchangeRate) || exchangeRates.usd || 60000;
      const usdAed = parseFloat(transUsdAedRate) || 3.67;
      if (vol > 0 && rate > 0) {
          if (transFreightCurrency === 'USD') {
              // نرخ به دلار است، کل کرایه به تومان معادل می‌شود
              const totalUsd = vol * rate;
              const totalToman = Math.round(totalUsd * exRate);
              setTransFreightPrice(totalToman.toString());
          } else if (transFreightCurrency === 'AED') {
              // نرخ به درهم صرافی است، تبدیل به دلار با تقسیم بر ۳.۶۷ و سپس تبدیل به تومان
              const totalUsd = usdAed > 0 ? (vol * rate) / usdAed : 0;
              const totalToman = Math.round(totalUsd * exRate);
              setTransFreightPrice(totalToman.toString());
          } else {
              // نرخ به تومان/ریال است
              setTransFreightPrice(Math.round(vol * rate).toString());
          }
      }
  }, [transVolume, transFreightRate, transFreightCurrency, transExchangeRate, transUsdAedRate, exchangeRates.usd]);

  // History Filter States
  const [historyStartDate, setHistoryStartDate] = useState<DateObject | null>(null);
  const [historyEndDate, setHistoryEndDate] = useState<DateObject | null>(null);

  const [historyDriverId, setHistoryDriverId] = useState<string | null>(null);
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);
  
  const [editHistoryItem, setEditHistoryItem] = useState<{id: string, type: 'transaction' | 'payment' | 'freight' | 'expense', description: string} | null>(null);

  const [adjustDriverId, setAdjustDriverId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit'); 
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');

  const [queueDriverId, setQueueDriverId] = useState<string | null>(null);
  const [queueDestination, setQueueDestination] = useState('');

  const [editDriverId, setEditDriverId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    fullName: '', 
    phone: '', 
    plateNumber: '', 
    tankNumber: '', 
    nationalId: '', 
    licenseNo: '', 
    shebaNumber: '', 
    cardNumber: '',
    accountHolderName: '',
    isAccountHolderDriver: true,
    bankName: '',
    previousBalanceType: 'NONE' as DriverPreviousBalanceType,
    previousBalanceAmount: '',
    previousBalanceDescription: '',
    includePreviousBalanceInTotal: true
  });

  // مودال اختصاصی ثبت و مدیریت حساب قبلی راننده
  const [prevAccountDriverId, setPrevAccountDriverId] = useState<string | null>(null);
  const [prevAccountForm, setPrevAccountForm] = useState({
    previousBalanceType: 'CREDITOR' as DriverPreviousBalanceType,
    previousBalanceAmount: '',
    previousBalanceDescription: '',
    includePreviousBalanceInTotal: true
  });

  const [viewCurrency, setViewCurrency] = useState<'toman' | 'usd' | 'aed'>('toman');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');

  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['fullName', 'plateNumber', 'phone', 'previousBalance', 'balance', 'actions']);

  const availableColumns = [
      { id: 'fullName', label: 'نام راننده' },
      { id: 'nationalId', label: 'کد ملی' },
      { id: 'plateNumber', label: 'شماره پلاک' },
      { id: 'tankNumber', label: 'شماره تانکر' },
      { id: 'licenseNo', label: 'شماره گواهینامه' },
      { id: 'phone', label: 'تلفن تماس' },
      { id: 'previousBalance', label: 'حساب قبلی' },
      { id: 'balance', label: 'تراز مالی کل' },
      { id: 'actions', label: 'عملیات' },
  ];

  const exportColumns = [
      { id: 'fullName', label: 'نام راننده' },
      { id: 'plateNumber', label: 'پلاک' },
      { id: 'phone', label: 'تلفن' },
      { id: 'previousBalance', label: 'حساب قبلی' },
      { id: 'balance', label: 'تراز مالی' },
      { id: 'nationalId', label: 'کد ملی' },
      { id: 'licenseNo', label: 'شماره گواهینامه' },
      { id: 'tankNumber', label: 'شماره تانکر' },
  ];

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const totalPayments = driverPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalEarnings = freights.reduce((sum, f) => sum + f.amount, 0) + transactions.reduce((sum, t) => sum + (t.freightPrice || 0), 0);
  const totalBalance = drivers.reduce((sum, d) => sum + getDriverBalance(d.id), 0);

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => {
        let newSet;
        if (prev.includes(id)) {
            newSet = prev.filter(c => c !== id);
        } else {
            newSet = [...prev, id];
        }
        return availableColumns.filter(c => newSet.includes(c.id)).map(c => c.id);
    });
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDrivers = useMemo(() => {
    let result = drivers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
          (d.fullName || '').toLowerCase().includes(term) ||
          (d.phone || '').includes(term) ||
          (d.plateNumber || '').includes(term) ||
          (d.nationalId || '').includes(term)
      );
    }

    const driversWithBalance = result.map(d => {
        const prevType = d.previousBalanceType || 'NONE';
        const prevRawAmount = d.previousBalanceAmount || 0;
        const signedPrevBalance =
            prevType === 'CREDITOR' ? prevRawAmount : prevType === 'DEBTOR' ? -prevRawAmount : 0;
        const paidTowardPrevious = driverPayments
            .filter(p => p.driverId === d.id && p.paymentCategory === 'PREVIOUS_ACCOUNT')
            .reduce((sum, p) => sum + p.amount, 0);
        return {
            ...d,
            previousBalance: signedPrevBalance,
            paidTowardPrevious,
            balance: getDriverBalance(d.id)
        };
    });

    if (sortConfig !== null) {
        driversWithBalance.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof typeof a];
            let bValue: any = b[sortConfig.key as keyof typeof b];

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return driversWithBalance;
  }, [drivers, driverPayments, searchTerm, sortConfig, getDriverBalance]);


  const recalculatePayAmount = (
    weightVal: string,
    rateVal: string,
    currency: 'TOMAN' | 'USD' | 'AED',
    exRateVal: string,
    usdAedVal: string
  ) => {
    const w = parseFloat(weightVal) || 0;
    const r = parseFloat(rateVal) || 0;
    const ex = parseFloat(exRateVal) || exchangeRates.usd || 60000;
    const ua = parseFloat(usdAedVal) || 3.67;
    if (w > 0 && r > 0) {
      if (currency === 'USD') {
        setPayAmount(Math.round(w * r * ex).toString());
      } else if (currency === 'AED') {
        const usdTotal = ua > 0 ? (w * r) / ua : 0;
        setPayAmount(Math.round(usdTotal * ex).toString());
      } else {
        setPayAmount(Math.round(w * r).toString());
      }
    }
  };

  const handleSelectPayBillOfLading = (txId: string) => {
    setPaySelectedTxId(txId);
    if (!txId) return;
    const tx = transactions.find(t => t.id === txId) || freights.find(f => f.id === txId);
    if (!tx) return;

    const volVal = (tx as any).volume || 0;
    const wStr = volVal ? volVal.toString() : '';
    const bolStr = (tx as any).billOfLading || (tx as any).trackingCode || `BL-${tx.id.slice(-5).toUpperCase()}`;
    setPayCargoWeight(wStr);
    setPayBillOfLading(bolStr);

    const exStr = payExchangeRate || (exchangeRates.usd ? exchangeRates.usd.toString() : '60000');
    const uaStr = payUsdAedRate || '3.67';
    const fCurrency = (tx as any).freightCurrency;
    const fRateUSD = (tx as any).freightRateUSD;
    const fRateAED = (tx as any).freightRateAED;
    const fRate = (tx as any).freightRate;
    const fPrice = (tx as any).freightPrice || (tx as any).amount;

    if (fCurrency === 'USD' && (fRateUSD || fRate)) {
      const rStr = (fRateUSD || fRate || 0).toString();
      setPayRateCurrency('USD');
      setPayRatePerTon(rStr);
      recalculatePayAmount(wStr, rStr, 'USD', exStr, uaStr);
    } else if (fCurrency === 'AED' && (fRateAED || fRate)) {
      const rStr = (fRateAED || fRate || 0).toString();
      setPayRateCurrency('AED');
      setPayRatePerTon(rStr);
      recalculatePayAmount(wStr, rStr, 'AED', exStr, uaStr);
    } else if (fRate && fRate > 0) {
      const rStr = fRate.toString();
      setPayRateCurrency('TOMAN');
      setPayRatePerTon(rStr);
      recalculatePayAmount(wStr, rStr, 'TOMAN', exStr, uaStr);
    } else if (fPrice && fPrice > 0) {
      setPayAmount(fPrice.toString());
    }
  };

  const handlePayment = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedDriverId || !payAmount || !payDate) return;
      
      const drv = drivers.find(d => d.id === selectedDriverId);
      const exRateNum = parseFloat(payExchangeRate) || exchangeRates.usd || 60000;
      const usdAedNum = parseFloat(payUsdAedRate) || 3.67;
      const effectiveCategory: DriverDepositCategory = payIsStandalone
        ? (payCategory === 'WAYBILL' ? 'PREVIOUS_ACCOUNT' : payCategory)
        : 'WAYBILL';
      const catCfg = getDepositCategoryConfig(effectiveCategory);
      const catPart = payIsStandalone ? `[${catCfg.label}] ` : '';
      const bolPart = (!payIsStandalone && payBillOfLading) ? `بارنامه: ${payBillOfLading} | ` : (payBillOfLading ? `مرجع: ${payBillOfLading} | ` : '');
      const trackPart = payTrackingCode ? `رهگیری: ${payTrackingCode} | ` : '';
      const ratePart = (!payIsStandalone && (payRateCurrency === 'USD' || payRateCurrency === 'AED'))
        ? `نرخ روز دلار: ${exRateNum.toLocaleString()} T (صرافی: ${usdAedNum}) | `
        : '';
      const defaultLabel = payIsStandalone ? catCfg.label : 'تسویه کرایه حمل';
      const finalDesc = `${catPart}${bolPart}${trackPart}${ratePart}${payDesc || defaultLabel}`;

      addDriverPayment({
          driverId: selectedDriverId,
          amount: parseFloat(payAmount),
          date: payDate.format("YYYY/MM/DD HH:mm"),
          description: finalDesc,
          isStandaloneDeposit: payIsStandalone,
          paymentCategory: effectiveCategory,
          deductFromWaybillBalance: payIsStandalone ? payDeductFromBalance : true,
          trackingCode: payTrackingCode || undefined,
          cardNumber: drv?.cardNumber,
          shebaNumber: drv?.shebaNumber,
          accountHolderName: drv?.accountHolderName || drv?.fullName,
          bankName: drv?.bankName
      });

      if (drv) {
        const rateNum = !payIsStandalone ? (parseFloat(payRatePerTon) || undefined) : undefined;
        addDriverSettlement({
          driverId: drv.id,
          driverName: drv.fullName,
          plateNumber: drv.plateNumber,
          cargoWeight: payIsStandalone ? (parseFloat(payCargoWeight) || 0) : (parseFloat(payCargoWeight) || 0),
          shebaNumber: drv.shebaNumber,
          cardNumber: drv.cardNumber,
          isAccountHolderDriver: drv.isAccountHolderDriver ?? true,
          accountHolderName: drv.accountHolderName || drv.fullName,
          bankName: drv.bankName || 'بانک',
          amount: parseFloat(payAmount),
          ratePerTon: (!payIsStandalone && payRateCurrency === 'TOMAN') ? rateNum : undefined,
          rateCurrency: payRateCurrency,
          ratePerTonUSD: (!payIsStandalone && payRateCurrency === 'USD') ? rateNum : undefined,
          ratePerTonAED: (!payIsStandalone && payRateCurrency === 'AED') ? rateNum : undefined,
          exchangeRateUSD: exRateNum,
          exchangeRateUSD_AED: usdAedNum,
          billOfLading: payBillOfLading || undefined,
          trackingCode: payTrackingCode || undefined,
          date: payDate.format("YYYY/MM/DD"),
          status: 'PAID',
          description: finalDesc,
          isStandaloneDeposit: payIsStandalone,
          paymentCategory: effectiveCategory,
          deductFromWaybillBalance: payIsStandalone ? payDeductFromBalance : true
        });
      }
      
      alert(payIsStandalone ? 'واریزی جداگانه راننده با موفقیت ثبت شد.' : 'فیش پرداختی و تسویه حساب راننده با موفقیت ثبت شد.');
      setSelectedDriverId(null);
      setPayAmount('');
      setPayDesc('');
      setPayBillOfLading('');
      setPayCargoWeight('');
      setPayRatePerTon('');
      setPaySelectedTxId('');
      setPayTrackingCode('');
      setPayDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const calculateTransTotal = () => {
      const vol = parseFloat(transVolume || '0');
      const exRate = parseFloat(transExchangeRate) || exchangeRates.usd || 60000;
      let totalUsd = 0;
      let totalToman = 0;
      if (transGasCurrency === 'USD') {
          const priUsd = parseFloat(transPrice || '0');
          totalUsd = vol * priUsd;
          totalToman = Math.round(totalUsd * exRate);
      } else {
          totalToman = Math.round(vol * parseFloat(transPrice || '0'));
          totalUsd = exRate > 0 ? parseFloat((totalToman / exRate).toFixed(2)) : 0;
      }
      return {
          usd: totalUsd,
          toman: totalToman,
          rial: totalToman * 10
      };
  };

  const calculateFreightTotal = () => {
      const vol = parseFloat(transVolume || '0');
      const exRate = parseFloat(transExchangeRate) || exchangeRates.usd || 60000;
      const usdAed = parseFloat(transUsdAedRate) || 3.67;
      const rate = parseFloat(transFreightRate || '0');
      let totalUsd = 0;
      let totalAed = 0;
      let totalToman = 0;
      let rateUsd = 0;
      let rateAed = 0;
      let rateToman = 0;

      if (transFreightCurrency === 'USD') {
          rateUsd = rate;
          rateAed = parseFloat((rate * usdAed).toFixed(2));
          rateToman = Math.round(rate * exRate);
          totalUsd = vol * rateUsd;
          totalAed = parseFloat((totalUsd * usdAed).toFixed(2));
          totalToman = Math.round(totalUsd * exRate);
      } else if (transFreightCurrency === 'AED') {
          rateAed = rate;
          rateUsd = usdAed > 0 ? parseFloat((rate / usdAed).toFixed(2)) : 0;
          rateToman = Math.round(rateUsd * exRate);
          totalAed = vol * rateAed;
          totalUsd = usdAed > 0 ? (vol * rateAed) / usdAed : 0;
          totalToman = Math.round(totalUsd * exRate);
      } else {
          rateToman = rate;
          rateUsd = exRate > 0 ? parseFloat((rate / exRate).toFixed(2)) : 0;
          rateAed = parseFloat((rateUsd * usdAed).toFixed(2));
          totalToman = transFreightPrice ? parseFloat(transFreightPrice) : Math.round(vol * rate);
          totalUsd = exRate > 0 ? totalToman / exRate : 0;
          totalAed = parseFloat((totalUsd * usdAed).toFixed(2));
      }

      return {
          usd: totalUsd,
          aed: totalAed,
          toman: totalToman,
          rial: totalToman * 10,
          rateUsd,
          rateAed,
          rateToman
      };
  };

  const handleTransaction = (e: React.FormEvent) => {
      e.preventDefault();
      if (!transDriverId || !transVolume || (!transFreightRate && !transFreightPrice) || !transDate) {
          alert("لطفاً وزن بار، نرخ کرایه راننده و تاریخ را جهت محاسبه کرایه وارد کنید.");
          return;
      }

      const vol = parseFloat(transVolume) || 0;
      const exRate = parseFloat(transExchangeRate) || exchangeRates.usd || 60000;
      const usdAed = parseFloat(transUsdAedRate) || 3.67;
      
      const freightTotal = calculateFreightTotal();
      const freightRateVal = parseFloat(transFreightRate) || 0;

      let freightDescPart = '';
      if (transFreightCurrency === 'USD') {
          freightDescPart = `کرایه: $${freightRateVal}/تن ($${freightTotal.usd.toLocaleString()} | صرافی ۳.۶۷: ${freightTotal.aed.toLocaleString()} AED | ${freightTotal.toman.toLocaleString()} T)`;
      } else if (transFreightCurrency === 'AED') {
          freightDescPart = `کرایه: ${freightRateVal} AED/تن (${freightTotal.aed.toLocaleString()} AED | معادل صرافی ۳.۶۷: $${freightTotal.usd.toFixed(1)} | ${freightTotal.toman.toLocaleString()} T)`;
      } else {
          freightDescPart = `کرایه: ${freightRateVal.toLocaleString()} تومان/تن (${freightTotal.toman.toLocaleString()} T | معادل $${freightTotal.usd.toFixed(1)} - ${freightTotal.aed.toLocaleString()} AED)`;
      }

      // فقط کرایه راننده ثبت می‌شود و باری در لیست تراکنش‌های بار/فروش ثبت نمی‌گردد
      addFreight({
          driverId: transDriverId,
          date: transDate.format("YYYY/MM/DD HH:mm"),
          amount: freightTotal.toman,
          origin: '',
          destination: '',
          trackingCode: transBillOfLading || undefined,
          billOfLading: transBillOfLading || undefined,
          volume: vol,
          freightRate: freightRateVal,
          freightCurrency: transFreightCurrency,
          freightRateUSD: freightTotal.rateUsd,
          freightRateAED: freightTotal.rateAed,
          exchangeRate: exRate,
          exchangeRateUSD_AED: usdAed,
          description: `${transDesc ? `${transDesc} | ` : ''}${freightDescPart}`
      });

      alert(`کرایه راننده محاسبه و در حساب راننده منظور گردید (بدون ثبت بار):\nمبلغ کرایه: ${freightTotal.toman.toLocaleString()} تومان (${freightTotal.rial.toLocaleString()} ریال)\nمعادل دلاری: $${freightTotal.usd.toLocaleString()} | معادل درهمی (۳.۶۷): ${freightTotal.aed.toLocaleString()} AED`);
      setTransDriverId(null);
      setTransVolume('');
      setTransPrice('');
      setTransFreightRate('');
      setTransFreightPrice('');
      setTransBillOfLading('');
      setTransDesc('');
      setTransDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const handleOpenEdit = (driver: Driver) => {
      setEditDriverId(driver.id);
      setEditForm({
          fullName: driver.fullName,
          phone: driver.phone,
          plateNumber: driver.plateNumber,
          tankNumber: driver.tankNumber,
          nationalId: driver.nationalId || '',
          licenseNo: driver.licenseNo || '',
          shebaNumber: driver.shebaNumber || '',
          cardNumber: driver.cardNumber || '',
          accountHolderName: driver.accountHolderName || '',
          isAccountHolderDriver: driver.isAccountHolderDriver ?? true,
          bankName: driver.bankName || '',
          previousBalanceType: driver.previousBalanceType || 'NONE',
          previousBalanceAmount: driver.previousBalanceAmount ? driver.previousBalanceAmount.toString() : '',
          previousBalanceDescription: driver.previousBalanceDescription || '',
          includePreviousBalanceInTotal: driver.includePreviousBalanceInTotal ?? true
      });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editDriverId) {
          const prevAmountNum =
              editForm.previousBalanceType !== 'NONE'
                  ? parseFloat(cleanNumberInput(editForm.previousBalanceAmount)) || 0
                  : 0;
          updateDriver(editDriverId, {
              ...editForm,
              previousBalanceType: prevAmountNum > 0 ? editForm.previousBalanceType : 'NONE',
              previousBalanceAmount: prevAmountNum,
              previousBalanceDate:
                  prevAmountNum > 0
                      ? drivers.find(d => d.id === editDriverId)?.previousBalanceDate ||
                        new Date().toLocaleDateString('fa-IR')
                      : undefined,
              previousBalanceDescription:
                  prevAmountNum > 0
                      ? editForm.previousBalanceDescription ||
                        (editForm.previousBalanceType === 'CREDITOR'
                            ? 'مانده طلب از حساب قبلی'
                            : 'مانده بدهی از حساب قبلی')
                      : undefined
          });
          setEditDriverId(null);
      }
  };

  const handleOpenPrevAccountModal = (driver: Driver) => {
      setPrevAccountDriverId(driver.id);
      setPrevAccountForm({
          previousBalanceType:
              driver.previousBalanceType && driver.previousBalanceType !== 'NONE'
                  ? driver.previousBalanceType
                  : 'CREDITOR',
          previousBalanceAmount: driver.previousBalanceAmount
              ? driver.previousBalanceAmount.toString()
              : '',
          previousBalanceDescription: driver.previousBalanceDescription || '',
          includePreviousBalanceInTotal: driver.includePreviousBalanceInTotal ?? true
      });
  };

  const handleSavePrevAccount = (e: React.FormEvent) => {
      e.preventDefault();
      if (!prevAccountDriverId) return;
      const prevAmountNum =
          prevAccountForm.previousBalanceType !== 'NONE'
              ? parseFloat(cleanNumberInput(prevAccountForm.previousBalanceAmount)) || 0
              : 0;
      updateDriver(prevAccountDriverId, {
          previousBalanceType: prevAmountNum > 0 ? prevAccountForm.previousBalanceType : 'NONE',
          previousBalanceAmount: prevAmountNum,
          previousBalanceDate:
              prevAmountNum > 0 ? new Date().toLocaleDateString('fa-IR') : undefined,
          previousBalanceDescription:
              prevAmountNum > 0
                  ? prevAccountForm.previousBalanceDescription ||
                    (prevAccountForm.previousBalanceType === 'CREDITOR'
                        ? 'مانده طلب از حساب قبلی'
                        : 'مانده بدهی از حساب قبلی')
                  : undefined,
          includePreviousBalanceInTotal: prevAccountForm.includePreviousBalanceInTotal
      });
      setPrevAccountDriverId(null);
  };

  const handleDeleteDriver = (id: string, name: string) => {
      if (window.confirm(`آیا از حذف راننده "${name}" اطمینان دارید؟ تمامی سوابق این راننده نیز ممکن است تحت تاثیر قرار گیرد.`)) {
          deleteDriver(id);
          alert('راننده حذف شد.');
      }
  };

  const formatBalance = (balanceToman: number) => {
      if (viewCurrency === 'usd') {
          const val = balanceToman / exchangeRates.usd;
          return `$${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
      } else if (viewCurrency === 'aed') {
          const val = balanceToman / exchangeRates.aed;
          return `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} د.ا`;
      }
      return `${balanceToman.toLocaleString()} تومان`;
  };

  const openExportModal = (type: 'csv' | 'pdf') => {
      if (sortedDrivers.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      setExportType(type);
      setShowExportModal(true);
  };

  const handleExportConfirm = (selectedIds: string[]) => {
      if (exportType === 'csv') {
          handleExportCSV(selectedIds);
      } else {
          handleExportPDF(selectedIds);
      }
  };

  const handleExportCSV = (selectedIds: string[]) => {
      const headers = exportColumns.filter(c => selectedIds.includes(c.id)).map(c => c.label);
      const rows = sortedDrivers.map(d => {
          const rowData: Record<string, any> = {
            fullName: d.fullName,
            plateNumber: d.plateNumber,
            phone: d.phone,
            balance: d.balance,
            nationalId: d.nationalId,
            licenseNo: d.licenseNo || '-',
            tankNumber: d.tankNumber || '-',
          };
          return selectedIds.map(id => rowData[id]);
      });

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `drivers_list_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = async (selectedIds: string[]) => {
      setIsExportingPdf(true);
      const input = document.getElementById('drivers-list-table-container');
      if (input) {
          const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff', onclone: (clonedDoc) => {
              const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden');
              hiddenElements.forEach((el: any) => el.style.display = 'none');
          }});
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
          pdf.save(`drivers_list_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.pdf`);
          setIsExportingPdf(false);
      } else {
           setIsExportingPdf(false);
      }
  };

  const historyData = useMemo(() => {
    if (!historyDriverId) return [];
    
    const drTransactions = transactions.filter(t => t.driverId === historyDriverId).map(t => ({ 
        id: t.id, 
        date: t.date, 
        type: 'transaction' as const, 
        amount: t.freightPrice || 0, 
        volume: t.volume, 
        price: t.price,
        freightCurrency: t.freightCurrency,
        freightRate: t.freightRate,
        freightRateUSD: t.freightRateUSD,
        exchangeRate: t.exchangeRate,
        gasCurrency: t.gasCurrency,
        gasPriceUSD: t.gasPriceUSD,
        description: t.description, 
        billOfLading: t.billOfLading 
    }));
    const drPayments = driverPayments.filter(p => p.driverId === historyDriverId).map(p => ({ 
        id: p.id, 
        date: p.date, 
        type: 'payment' as const, 
        amount: p.amount, 
        volume: 0, 
        price: 0,
        description: p.description,
        isStandaloneDeposit: p.isStandaloneDeposit,
        paymentCategory: p.paymentCategory,
        deductFromWaybillBalance: p.deductFromWaybillBalance,
        trackingCode: p.trackingCode
    }));
    const drFreights = freights.filter(f => f.driverId === historyDriverId).map(f => ({ 
        id: f.id, 
        date: f.date, 
        type: 'freight' as const, 
        amount: f.amount, 
        volume: f.volume || 0, 
        price: 0, 
        freightCurrency: f.freightCurrency,
        freightRate: f.freightRate,
        freightRateUSD: f.freightRateUSD,
        freightRateAED: f.freightRateAED,
        exchangeRate: f.exchangeRate,
        billOfLading: f.billOfLading || f.trackingCode,
        description: (f.origin || f.destination)
          ? `کرایه بار (${f.origin || ''} به ${f.destination || ''})${f.trackingCode ? ` [کد: ${f.trackingCode}]` : ''} - ${f.description}`
          : f.description
    }));
    const drExpenses = (driverVehicleExpenses || []).filter(e => e.driverId === historyDriverId).map(e => ({
        id: e.id,
        date: e.date,
        type: 'expense' as const,
        amount: e.amount,
        volume: 0,
        price: 0,
        description: `هزینه خودرو و راننده (${DRIVER_EXPENSE_CATEGORIES_CONFIG[e.category]?.label || e.category}): ${e.title} [پرداخت: ${e.paidBy === 'COMPANY' ? 'شرکت' : 'راننده'}]${e.invoiceNumber ? ` [فاکتور: ${e.invoiceNumber}]` : ''} ${e.description ? `- ${e.description}` : ''}`,
        impactOnBalance: e.impactOnBalance,
        category: e.category,
        paidBy: e.paidBy
    }));

    let all = [...drTransactions, ...drPayments, ...drFreights, ...drExpenses];

    // Apply Date Filters
    if (historyStartDate || historyEndDate) {
        all = all.filter(item => {
            const itemTime = parseInt(item.id);
            if (historyStartDate) {
                const start = historyStartDate.toDate().getTime();
                if (itemTime < start) return false;
            }
            if (historyEndDate) {
                const end = historyEndDate.toDate().setHours(23, 59, 59, 999);
                if (itemTime > end) return false;
            }
            return true;
        });
    }

    return all.sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
  }, [historyDriverId, transactions, driverPayments, freights, driverVehicleExpenses, historyStartDate, historyEndDate]);

  const historyDriver = drivers.find(d => d.id === historyDriverId);

  const handleHistoryExportCSV = () => {
      if (historyData.length === 0) return alert('داده‌ای وجود ندارد.');
      const headers = ['تاریخ', 'شرح عملیات', 'حجم (تن)', 'فی (تومان)', 'بدهکار (پرداخت/کسر)', 'بستانکار (کرایه/طلب)', 'توضیحات'];
      const rows = historyData.map(item => {
          const isExpense = item.type === 'expense';
          const isCredit = item.type === 'freight' || item.type === 'transaction' || (isExpense && (item as any).impactOnBalance === 'REIMBURSE_TO_DRIVER');
          const isDebit = item.type === 'payment' || (isExpense && (item as any).impactOnBalance === 'DEDUCT_FROM_DRIVER');
          return [
              item.date, 
              item.type === 'payment' ? 'پرداخت وجه' : item.type === 'freight' ? 'کرایه حمل' : item.type === 'transaction' ? 'حمل گاز (کرایه)' : 'هزینه راننده/خودرو', 
              item.volume || 0,
              item.price || 0,
              isDebit ? item.amount : 0, 
              isCredit ? item.amount : 0, 
              item.description
          ];
      });
      const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `driver_history_${historyDriver?.fullName}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  const handleHistoryExportPDF = async () => {
      const input = document.getElementById('driver-history-table-container');
      if (input) {
          setIsExportingHistoryPdf(true);
          try {
              const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`history-${historyDriver?.fullName}.pdf`);
          } catch (err) { alert("خطا در ایجاد PDF"); } finally { setIsExportingHistoryPdf(false); }
      }
  };

  const handleHistoryPrint = () => {
      const printContent = document.getElementById('driver-history-table-container');
      if (printContent && historyDriver) {
          const windowUrl = 'about:blank';
          const uniqueName = new Date().getTime();
          const windowName = 'Print' + uniqueName;
          const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
          if (printWindow) {
              printWindow.document.write(`<html dir="rtl"><head><title>چاپ ریز حساب - ${historyDriver.fullName}</title><link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet"><style>body { font-family: 'Vazirmatn', sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; } th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: right; } th { background-color: #f8fafc; color: #475569; } .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #334155; padding-bottom: 10px; } .info { margin-bottom: 20px; display: flex; gap: 20px; font-size: 14px; }</style></head><body><div class="header"><h2>ریز حساب راننده: ${historyDriver.fullName}</h2><p>تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}</p></div><div class="info"><span><strong>کد ملی:</strong> ${historyDriver.nationalId}</span><span><strong>شماره پلاک:</strong> ${historyDriver.plateNumber}</span><span><strong>تلفن:</strong> ${historyDriver.phone}</span></div>${printContent.innerHTML}</body></html>`);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
          }
      }
  };

  const handlePrint = () => window.print();

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
      if (sortConfig?.key !== colKey) return <ArrowUpDown size={14} className="text-slate-400" />;
      if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="text-blue-600" />;
      return <ArrowDown size={14} className="text-blue-600" />;
  };

  const handleEditHistoryClick = (item: any) => setEditHistoryItem({ id: item.id, type: item.type, description: item.description || '' });

  const handleSaveHistoryDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHistoryItem) return;
    const { id, type, description } = editHistoryItem;
    switch(type) {
        case 'transaction': updateTransaction(id, { description }); break;
        case 'payment': updateDriverPayment(id, { description }); break;
        case 'freight': updateFreight(id, { description }); break;
        case 'expense': updateDriverVehicleExpense(id, { description }); break;
    }
    setEditHistoryItem(null);
  };

  const clearHistoryFilters = () => {
    setHistoryStartDate(null);
    setHistoryEndDate(null);
  };

  const totalVehicleExpenses = (driverVehicleExpenses || []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
        <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExportConfirm} columns={exportColumns} title="لیست رانندگان" type={exportType} />
        <div className="hidden print:block text-center mb-6"><h1 className="text-2xl font-bold text-slate-900">لیست رانندگان و وضعیت مالی</h1><p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm"><div><h3 className="text-emerald-800 dark:text-emerald-300 font-bold text-lg mb-1">مجموع پرداختی</h3><p className="text-emerald-600 dark:text-emerald-500 text-xs">کل مبالغ پرداختی</p></div><div className="text-xl font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">{totalPayments.toLocaleString()}</div></div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between shadow-sm"><div><h3 className="text-blue-800 dark:text-blue-300 font-bold text-lg mb-1">مجموع درآمد</h3><p className="text-blue-600 dark:text-blue-500 text-xs">کرایه‌ها + حمل گاز</p></div><div className="text-xl font-bold text-blue-700 dark:text-blue-400" dir="ltr">{totalEarnings.toLocaleString()}</div></div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-center justify-between shadow-sm"><div><h3 className="text-indigo-800 dark:text-indigo-300 font-bold text-lg mb-1">مانده کل</h3><p className="text-indigo-600 dark:text-indigo-500 text-xs">طلب رانندگان</p></div><div className="text-xl font-bold text-indigo-700 dark:text-indigo-400" dir="ltr">{totalBalance.toLocaleString()}</div></div>
            <div 
              onClick={() => { setExpenseModalDriverId(null); setShowExpenseModal(true); }}
              className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-amber-400 transition-all group"
            >
              <div>
                <h3 className="text-amber-800 dark:text-amber-300 font-bold text-lg mb-1 group-hover:text-amber-900">هزینه‌های خودرو و راننده</h3>
                <p className="text-amber-600 dark:text-amber-500 text-xs">{driverVehicleExpenses.length} سند ثبت‌شده</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400 font-mono" dir="ltr">{totalVehicleExpenses.toLocaleString()}</div>
                <span className="text-[10px] text-amber-600 font-bold">مشاهده و ثبت &larr;</span>
              </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-4 mt-6 print:hidden">
            <div className="flex items-center gap-3 w-full lg:w-auto"><div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"><Users size={24} /></div><h2 className="text-xl font-bold text-slate-800 dark:text-white">بانک اطلاعات رانندگان</h2></div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-wrap">
                <div className="relative w-full sm:w-64"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو..." className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-shadow" />{searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={14} /></button>)}</div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-lg w-full sm:w-auto justify-center shadow-sm"><button onClick={() => setViewCurrency('toman')} className={`px-3 py-1 text-xs rounded transition-all ${viewCurrency === 'toman' ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'text-slate-600 dark:text-slate-400'}`}>تومان</button><button onClick={() => setViewCurrency('usd')} className={`px-3 py-1 text-xs rounded transition-all ${viewCurrency === 'usd' ? 'bg-blue-600 dark:bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>دلار</button></div>
                <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"><Settings2 size={16} /> ستون‌ها</button>
                <button 
                  onClick={() => { setBreakdownDriverId(null); setShowDebtBreakdownModal(true); }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-lg text-sm font-bold shadow-md hover:from-rose-700 hover:to-amber-700 transition-all active:scale-95"
                  title="گزارش تفکیک‌شده بدهی و حساب رانندگان بر اساس بارهای انجام‌شده و پیش‌پرداخت‌ها"
                >
                  <Receipt size={16} />
                  <span>گزارش تفکیکی بدهی (بارها و پیش‌پرداخت‌ها)</span>
                </button>
                <button 
                  onClick={() => { setExpenseModalDriverId(null); setShowExpenseModal(true); }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95"
                  title="ثبت و مدیریت هزینه‌های راننده و خودرو"
                >
                  <Wrench size={16} />
                  <span>هزینه‌های راننده و ماشین</span>
                  {driverVehicleExpenses.length > 0 && (
                    <span className="bg-white/20 text-white text-[11px] px-1.5 py-0.2 rounded font-mono">
                      {driverVehicleExpenses.length}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => openExportModal('pdf')} disabled={isExportingPdf} className="p-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg" title="PDF خروجی">{isExportingPdf ? '...' : <FileDown size={16} />}</button>
                    <button onClick={() => openExportModal('csv')} className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg" title="CSV خروجی"><Download size={16} /></button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"><Printer size={16} /> چاپ</button>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:border-0 print:shadow-none">
            <div className="overflow-x-auto" id="drivers-list-table-container">
            <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800">
                <tr>
                    {visibleColumns.includes('fullName') && (<th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('fullName')}>نام راننده <SortIcon colKey="fullName" /></th>)}
                    {visibleColumns.includes('plateNumber') && (<th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('plateNumber')}>پلاک <SortIcon colKey="plateNumber" /></th>)}
                    {visibleColumns.includes('phone') && (<th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('phone')}>تلفن <SortIcon colKey="phone" /></th>)}
                    {visibleColumns.includes('previousBalance') && (<th className="px-6 py-4 cursor-pointer bg-purple-50/40 dark:bg-purple-950/15" onClick={() => handleSort('previousBalance')}>حساب قبلی <SortIcon colKey="previousBalance" /></th>)}
                    {visibleColumns.includes('balance') && (<th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('balance')}>تراز مالی کل <SortIcon colKey="balance" /></th>)}
                    {visibleColumns.includes('actions') && (<th className="px-6 py-4 text-center print:hidden">عملیات</th>)}
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                {sortedDrivers.map((d) => {
                    const hasPrevBalance = (d.previousBalanceAmount || 0) > 0 && d.previousBalanceType && d.previousBalanceType !== 'NONE';
                    const isPrevCreditor = d.previousBalanceType === 'CREDITOR';
                    const prevRemaining = hasPrevBalance && isPrevCreditor
                        ? Math.max(0, (d.previousBalanceAmount || 0) - d.paidTowardPrevious)
                        : (d.previousBalanceAmount || 0);

                    return (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-800 dark:text-slate-200">
                        {visibleColumns.includes('fullName') && (<td className="px-6 py-4 font-medium">{d.fullName}</td>)}
                        {visibleColumns.includes('plateNumber') && (<td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded font-mono text-sm dark:text-slate-300">{d.plateNumber}</span></td>)}
                        {visibleColumns.includes('phone') && (<td className="px-6 py-4 text-slate-600 dark:text-slate-400">{d.phone}</td>)}
                        {visibleColumns.includes('previousBalance') && (
                            <td className="px-6 py-4 bg-purple-50/20 dark:bg-purple-950/10">
                                {hasPrevBalance ? (
                                    <div
                                        onClick={() => handleOpenPrevAccountModal(d)}
                                        className="cursor-pointer group inline-flex flex-col gap-0.5"
                                        title="کلیک جهت ویرایش یا مشاهده جزئیات حساب قبلی"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                    isPrevCreditor
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                                }`}
                                            >
                                                {isPrevCreditor ? 'طلب قبلی:' : 'بدهی قبلی:'}
                                            </span>
                                            <span
                                                className={`font-mono font-black text-xs ${
                                                    isPrevCreditor
                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                        : 'text-rose-600 dark:text-rose-400'
                                                }`}
                                                dir="ltr"
                                            >
                                                {(d.previousBalanceAmount || 0).toLocaleString()} T
                                            </span>
                                        </div>
                                        {d.paidTowardPrevious > 0 && (
                                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                                واریزشده: {d.paidTowardPrevious.toLocaleString()} T | مانده: {prevRemaining.toLocaleString()} T
                                            </div>
                                        )}
                                        {d.previousBalanceDescription && (
                                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                                {d.previousBalanceDescription}
                                            </div>
                                        )}
                                    </div>
                                ) : d.paidTowardPrevious > 0 ? (
                                    <div
                                        onClick={() => handleOpenPrevAccountModal(d)}
                                        className="cursor-pointer inline-flex flex-col gap-0.5"
                                    >
                                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                                            واریزی حساب قبلی: {d.paidTowardPrevious.toLocaleString()} T
                                        </span>
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                                            + ثبت اصل مانده حساب قبلی
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPrevAccountModal(d)}
                                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-2.5 py-1 rounded-lg border border-dashed border-purple-300 dark:border-purple-800 transition-all"
                                    >
                                        + ثبت حساب قبلی
                                    </button>
                                )}
                            </td>
                        )}
                        {visibleColumns.includes('balance') && (<td className="px-6 py-4" dir="ltr"><div className="font-bold">{formatBalance(d.balance)}</div></td>)}
                        {visibleColumns.includes('actions') && (
                            <td className="px-6 py-4 text-center print:hidden">
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <button onClick={() => setTransDriverId(d.id)} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold">بار</button>
                                    <button onClick={() => setHistoryDriverId(d.id)} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all font-bold">سابقه</button>
                                    <button
                                      onClick={() => handleOpenPrevAccountModal(d)}
                                      className="text-[10px] bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800 px-2 py-1 rounded hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50 transition-all font-bold"
                                      title="ثبت و مدیریت حساب قبلی این راننده (طلب قبلی یا بدهی قبلی)"
                                    >
                                      حساب قبلی
                                    </button>
                                    <button 
                                      onClick={() => { setBreakdownDriverId(d.id); setShowDebtBreakdownModal(true); }}
                                      className="text-[10px] bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all font-bold"
                                      title="مشاهده گزارش تفکیکی بدهی و حساب این راننده (بارهای انجام‌شده و پیش‌پرداخت‌ها)"
                                    >
                                      تفکیک بدهی/بار
                                    </button>
                                    <button onClick={() => openPaymentModal(d.id, false, 'WAYBILL')} className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all font-bold">تسویه</button>
                                    <button 
                                      onClick={() => openPaymentModal(d.id, true, 'PREVIOUS_ACCOUNT')} 
                                      className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all font-bold"
                                      title="ثبت واریزی جدا از حساب بارنامه (حساب قبلی / درخواست کرایه قبل از تحویل بار)"
                                    >
                                      واریزی جدا
                                    </button>
                                    <button 
                                      onClick={() => { setExpenseModalDriverId(d.id); setShowExpenseModal(true); }}
                                      className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all font-bold flex items-center gap-1"
                                      title="ثبت و مشاهده هزینه‌های این راننده و خودرو"
                                    >
                                      <Wrench size={10} />
                                      هزینه‌ها
                                    </button>
                                    <button onClick={() => handleOpenEdit(d)} className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all" title="ویرایش"><Pencil size={14}/></button>
                                    <button onClick={() => handleDeleteDriver(d.id, d.fullName)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all" title="حذف"><Trash2 size={14}/></button>
                                </div>
                            </td>
                        )}
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        </div>

        {/* Dedicated Previous Account Management Modal (مدیریت و ثبت حساب قبلی راننده) */}
        {prevAccountDriverId && (() => {
            const targetDriver = drivers.find(d => d.id === prevAccountDriverId);
            if (!targetDriver) return null;
            const prevPayments = driverPayments.filter(
                p => p.driverId === targetDriver.id && p.paymentCategory === 'PREVIOUS_ACCOUNT'
            );
            const totalPaidPrev = prevPayments.reduce((s, p) => s + p.amount, 0);
            const parsedAmount = parseFloat(cleanNumberInput(prevAccountForm.previousBalanceAmount)) || 0;
            const netRemainingPrev =
                prevAccountForm.previousBalanceType === 'CREDITOR'
                    ? Math.max(0, parsedAmount - totalPaidPrev)
                    : parsedAmount;

            return (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[65] flex items-center justify-center p-4 print:hidden backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6 animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/15 rounded-xl">
                                    <History size={22} />
                                </div>
                                <div>
                                    <h3 className="font-black text-base sm:text-lg text-white">
                                        ثبت و مدیریت حساب قبلی راننده
                                    </h3>
                                    <p className="text-xs text-purple-200 mt-0.5">
                                        {targetDriver.fullName} | پلاک: {targetDriver.plateNumber}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPrevAccountDriverId(null)}
                                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePrevAccount} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                                    نوع حساب قبلی راننده را مشخص کنید:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPrevAccountForm({
                                                ...prevAccountForm,
                                                previousBalanceType: 'CREDITOR'
                                            })
                                        }
                                        className={`p-3 rounded-xl border text-right transition-all ${
                                            prevAccountForm.previousBalanceType === 'CREDITOR'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-black flex items-center gap-1">
                                            <TrendingUp size={14} />
                                            <span>طلب قبلی راننده</span>
                                        </div>
                                        <div className="text-[10px] opacity-80 mt-0.5">
                                            راننده از قبل از شرکت طلبکار است
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPrevAccountForm({
                                                ...prevAccountForm,
                                                previousBalanceType: 'DEBTOR'
                                            })
                                        }
                                        className={`p-3 rounded-xl border text-right transition-all ${
                                            prevAccountForm.previousBalanceType === 'DEBTOR'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-black flex items-center gap-1">
                                            <TrendingDown size={14} />
                                            <span>بدهی قبلی راننده</span>
                                        </div>
                                        <div className="text-[10px] opacity-80 mt-0.5">
                                            راننده از قبل به شرکت بدهکار است
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPrevAccountForm({
                                                ...prevAccountForm,
                                                previousBalanceType: 'NONE',
                                                previousBalanceAmount: ''
                                            })
                                        }
                                        className={`p-3 rounded-xl border text-right transition-all ${
                                            prevAccountForm.previousBalanceType === 'NONE'
                                                ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-black">بدون حساب قبلی (۰)</div>
                                        <div className="text-[10px] opacity-80 mt-0.5">
                                            تسویه کامل حساب قبلی
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {prevAccountForm.previousBalanceType !== 'NONE' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            {prevAccountForm.previousBalanceType === 'CREDITOR'
                                                ? 'مبلغ کل طلب قبلی راننده (تومان)'
                                                : 'مبلغ کل بدهی قبلی راننده (تومان)'}
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            dir="ltr"
                                            value={formatNumberInput(prevAccountForm.previousBalanceAmount)}
                                            onChange={e =>
                                                setPrevAccountForm({
                                                    ...prevAccountForm,
                                                    previousBalanceAmount: cleanNumberInput(e.target.value)
                                                })
                                            }
                                            placeholder="مثال: 35,000,000"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-purple-300 dark:border-slate-700 rounded-xl font-mono font-black text-base text-left tracking-wider text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        {parsedAmount > 0 && (
                                            <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 mt-1.5">
                                                معادل به حروف: {numberToPersianWords(parsedAmount)}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            توضیحات حساب قبلی (بابت چه دوره یا بارنامه‌ای بوده است؟)
                                        </label>
                                        <input
                                            type="text"
                                            value={prevAccountForm.previousBalanceDescription}
                                            onChange={e =>
                                                setPrevAccountForm({
                                                    ...prevAccountForm,
                                                    previousBalanceDescription: e.target.value
                                                })
                                            }
                                            placeholder="مثال: مانده حساب بارهای سال قبل یا مساعده قبلی..."
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/50">
                                        <input
                                            type="checkbox"
                                            id="includePrevInTotalModal"
                                            checked={prevAccountForm.includePreviousBalanceInTotal}
                                            onChange={e =>
                                                setPrevAccountForm({
                                                    ...prevAccountForm,
                                                    includePreviousBalanceInTotal: e.target.checked
                                                })
                                            }
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                        <label
                                            htmlFor="includePrevInTotalModal"
                                            className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                        >
                                            لحاظ کردن حساب قبلی در «تراز مالی کل» راننده
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* خلاصه وضعیت واریزی‌های انجام‌شده بابت حساب قبلی */}
                            <div className="p-4 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600 dark:text-slate-400 font-bold">
                                        مجموع واریزی‌های ثبت‌شده بابت حساب قبلی ({prevPayments.length} فقره):
                                    </span>
                                    <span className="font-mono font-black text-purple-700 dark:text-purple-400" dir="ltr">
                                        {totalPaidPrev.toLocaleString()} T
                                    </span>
                                </div>
                                {prevAccountForm.previousBalanceType === 'CREDITOR' && parsedAmount > 0 && (
                                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                                        <span className="font-black text-slate-800 dark:text-slate-200">
                                            مانده باقیمانده از طلب قبلی راننده:
                                        </span>
                                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">
                                            {netRemainingPrev.toLocaleString()} T
                                        </span>
                                    </div>
                                )}
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const drvId = prevAccountDriverId;
                                            setPrevAccountDriverId(null);
                                            openPaymentModal(drvId, true, 'PREVIOUS_ACCOUNT');
                                        }}
                                        className="px-3 py-1.5 bg-purple-600/15 hover:bg-purple-600/25 text-purple-700 dark:text-purple-300 rounded-lg font-bold text-[11px] transition-all"
                                    >
                                        + ثبت فیش واریزی جدید بابت حساب قبلی این راننده
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPrevAccountDriverId(null)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                                >
                                    انصراف
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 text-xs"
                                >
                                    <Save size={16} />
                                    ذخیره حساب قبلی راننده
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        })()}
        
        {/* Edit Driver Modal */}
        {editDriverId && (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-[60] flex items-center justify-center p-4 print:hidden backdrop-blur-sm overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Pencil size={18} className="text-blue-600 dark:text-blue-400"/>ویرایش اطلاعات و حساب قبلی راننده</h3>
                        <button onClick={() => setEditDriverId(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[82vh] overflow-y-auto">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نام و نام خانوادگی</label><input value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تلفن تماس</label><input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">کد ملی</label><input value={editForm.nationalId} onChange={e => setEditForm({...editForm, nationalId: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره پلاک</label><input value={editForm.plateNumber} onChange={e => setEditForm({...editForm, plateNumber: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره تانکر</label><input value={editForm.tankNumber} onChange={e => setEditForm({...editForm, tankNumber: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره گواهینامه</label><input value={editForm.licenseNo} onChange={e => setEditForm({...editForm, licenseNo: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره شبا بانکی</label><input value={editForm.shebaNumber} onChange={e => setEditForm({...editForm, shebaNumber: e.target.value})} placeholder="IR..." dir="ltr" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره کارت بانکی (۱۶ رقمی)</label><input value={editForm.cardNumber} onChange={e => setEditForm({...editForm, cardNumber: e.target.value})} placeholder="---- ---- ---- ----" dir="ltr" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left tracking-widest" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نام بانک</label><input value={editForm.bankName} onChange={e => setEditForm({...editForm, bankName: e.target.value})} placeholder="مثال: ملی، ملت..." className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" id="editIsAccountDriver" checked={editForm.isAccountHolderDriver} onChange={e => setEditForm({...editForm, isAccountHolderDriver: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                                <label htmlFor="editIsAccountDriver" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">کارت/حساب اعلامی به نام خود راننده است</label>
                            </div>
                            {!editForm.isAccountHolderDriver && (
                                <div>
                                    <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">نام صاحب کارت/حساب اعلامی:</label>
                                    <input value={editForm.accountHolderName} onChange={e => setEditForm({...editForm, accountHolderName: e.target.value})} placeholder="مثال: زهرا احمدی (همسر)" className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs outline-none" />
                                </div>
                            )}
                        </div>

                        {/* حساب قبلی در ویرایش راننده */}
                        <div className="md:col-span-2 p-3.5 bg-purple-50/60 dark:bg-purple-950/25 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-3">
                            <label className="block text-xs font-black text-purple-900 dark:text-purple-200">
                                وضعیت حساب قبلی راننده:
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, previousBalanceType: 'NONE', previousBalanceAmount: '' })}
                                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border ${
                                        editForm.previousBalanceType === 'NONE'
                                            ? 'bg-slate-800 text-white border-slate-800'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    بدون حساب قبلی
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, previousBalanceType: 'CREDITOR' })}
                                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border ${
                                        editForm.previousBalanceType === 'CREDITOR'
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    طلب قبلی راننده
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, previousBalanceType: 'DEBTOR' })}
                                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border ${
                                        editForm.previousBalanceType === 'DEBTOR'
                                            ? 'bg-rose-600 text-white border-rose-600'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    بدهی قبلی راننده
                                </button>
                            </div>
                            {editForm.previousBalanceType !== 'NONE' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                            مبلغ حساب قبلی (تومان)
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            dir="ltr"
                                            value={formatNumberInput(editForm.previousBalanceAmount)}
                                            onChange={e =>
                                                setEditForm({
                                                    ...editForm,
                                                    previousBalanceAmount: cleanNumberInput(e.target.value)
                                                })
                                            }
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-left"
                                            placeholder="25,000,000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                            توضیحات حساب قبلی
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.previousBalanceDescription}
                                            onChange={e =>
                                                setEditForm({
                                                    ...editForm,
                                                    previousBalanceDescription: e.target.value
                                                })
                                            }
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                                            placeholder="مانده سال قبل..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 pt-4 flex gap-2">
                             <button type="button" onClick={() => setEditDriverId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">انصراف</button>
                             <button type="submit" className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"><Save size={18}/> ذخیره تغییرات</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Driver Freight Calculation Modal (No Load Registration) */}
        {transDriverId && (() => {
            const transDriver = drivers.find(d => d.id === transDriverId);
            const freightCalc = calculateFreightTotal();

            return (
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 print:hidden backdrop-blur-sm overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-4 sm:my-6 animate-in zoom-in-95 duration-200">
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 border-b border-emerald-700 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                                <Calculator size={22} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-base sm:text-lg text-white">محاسبه کرایه حمل راننده</h3>
                                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold text-emerald-50">فقط محاسبه کرایه (بدون ثبت بار)</span>
                                </div>
                                <p className="text-xs text-emerald-100 flex items-center gap-2 mt-0.5">
                                    <span>{transDriver?.fullName || 'راننده'}</span>
                                    <span className="opacity-75">|</span>
                                    <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-[11px]">{transDriver?.plateNumber}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setTransDriverId(null)} 
                            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    </div>

                    <form onSubmit={handleTransaction} className="p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                        
                        {/* تاریخ و بارنامه */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاریخ و ساعت بارگیری</label>
                                <DatePicker 
                                    value={transDate} 
                                    onChange={setTransDate} 
                                    calendar={persian} 
                                    locale={persian_fa} 
                                    format="YYYY/MM/DD HH:mm" 
                                    plugins={[<TimePicker hideSeconds />]} 
                                    inputClass="rmdp-input !text-xs !h-10 !w-full" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">شماره بارنامه</label>
                                <input 
                                    type="text" 
                                    value={transBillOfLading} 
                                    onChange={e => setTransBillOfLading(e.target.value)} 
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono" 
                                    placeholder="مثال: BL-98432" 
                                />
                            </div>
                        </div>

                        {/* وزن بار، نرخ دلار به تومان و نرخ تبدیل صرافی دلار به درهم */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    وزن بار / تناژ <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        required
                                        value={transVolume} 
                                        onChange={e => setTransVolume(e.target.value)} 
                                        className="w-full p-2.5 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold font-mono" 
                                        placeholder="مثال: 22.50" 
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">تن</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">دلار به تومان</label>
                                    <button 
                                        type="button"
                                        onClick={() => setTransExchangeRate(exchangeRates.usd ? exchangeRates.usd.toString() : '60000')}
                                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                        title="بازگردانی به نرخ صرافی سیستم"
                                    >
                                        <RotateCcw size={9} />
                                        ({exchangeRates.usd?.toLocaleString()} T)
                                    </button>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        inputMode="decimal"
                                        dir="ltr"
                                        value={formatNumberInput(transExchangeRate)} 
                                        onChange={e => setTransExchangeRate(cleanNumberInput(e.target.value))} 
                                        className="w-full p-2.5 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono font-bold text-left" 
                                        placeholder="60,000" 
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">تومان</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نرخ صرافی (دلار به درهم)</label>
                                    <button 
                                        type="button"
                                        onClick={() => setTransUsdAedRate('3.67')}
                                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                        title="تنظیم مجدد به نرخ رسمی ۳.۶۷"
                                    >
                                        <RotateCcw size={9} />
                                        نرخ پایه (۳.۶۷)
                                    </button>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.001"
                                        value={transUsdAedRate} 
                                        onChange={e => setTransUsdAedRate(e.target.value)} 
                                        className="w-full p-2.5 pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400" 
                                        placeholder="3.67" 
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-600">AED/$</span>
                                </div>
                            </div>
                        </div>

                        {/* بخش ویژه انتخاب ارز نرخ کرایه راننده (دلار، درهم با ضریب ۳.۶۷ یا ریال/تومان) */}
                        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 dark:border-emerald-800/60 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                    <span className="text-xs font-black text-emerald-950 dark:text-emerald-300">
                                        تعیین نرخ کرایه حمل راننده:
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm gap-1">
                                    <button 
                                        type="button" 
                                        onClick={() => setTransFreightCurrency('TOMAN')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                            transFreightCurrency === 'TOMAN' 
                                                ? 'bg-emerald-600 text-white shadow-sm' 
                                                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700'
                                        }`}
                                    >
                                        تومان / ریال
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setTransFreightCurrency('USD')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                            transFreightCurrency === 'USD' 
                                                ? 'bg-blue-600 text-white shadow-sm' 
                                                : 'text-slate-600 dark:text-slate-400 hover:text-blue-700'
                                        }`}
                                    >
                                        <DollarSign size={12} />
                                        دلار ($)
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setTransFreightCurrency('AED')}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                                            transFreightCurrency === 'AED' 
                                                ? 'bg-amber-600 text-white shadow-sm' 
                                                : 'text-slate-600 dark:text-slate-400 hover:text-amber-700'
                                        }`}
                                    >
                                        <span>درهم (AED ۳.۶۷)</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        {transFreightCurrency === 'USD' 
                                            ? 'نرخ کرایه دلاری هر تن ($)' 
                                            : transFreightCurrency === 'AED'
                                                ? 'نرخ کرایه درهمی هر تن (AED)'
                                                : 'نرخ کرایه هر تن (تومان)'}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            inputMode="decimal"
                                            dir="ltr"
                                            value={formatNumberInput(transFreightRate)} 
                                            onChange={e => setTransFreightRate(cleanNumberInput(e.target.value))} 
                                            placeholder={transFreightCurrency === 'USD' ? 'مثال: 25.00' : transFreightCurrency === 'AED' ? 'مثال: 91.75' : 'مثال: 1,200,000'}
                                            className="w-full p-2.5 pl-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-left" 
                                        />
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black ${
                                            transFreightCurrency === 'USD' 
                                                ? 'text-blue-600' 
                                                : transFreightCurrency === 'AED'
                                                    ? 'text-amber-600'
                                                    : 'text-slate-400'
                                        }`}>
                                            {transFreightCurrency === 'USD' ? 'USD $' : transFreightCurrency === 'AED' ? 'AED' : 'تومان'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        مبلغ کل کرایه بستانکار راننده
                                    </label>
                                    <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        <span>{freightCalc.toman.toLocaleString()}</span>
                                        <span className="text-[11px] font-normal text-slate-400">تومان</span>
                                    </div>
                                </div>
                            </div>

                            {/* تبدیل لحظه‌ای با نرخ صرافی ۳.۶۷ و نمایش معادل ریالی، درهمی و دلاری */}
                            {(parseFloat(transFreightRate) || 0) > 0 && (
                                <div className="p-3 bg-white/95 dark:bg-slate-900/95 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-[11px] space-y-2 shadow-sm">
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                        <span>معادل هر تن با نرخ صرافی ({parseFloat(transUsdAedRate) || 3.67}):</span>
                                        <div className="flex items-center gap-2 font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                            <span className="text-blue-600 font-bold">${freightCalc.rateUsd}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-amber-600 font-bold">{freightCalc.rateAed} AED</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{freightCalc.rateToman.toLocaleString()} T</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 gap-2">
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">کرایه کل در واحدهای مختلف:</span>
                                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs font-bold" dir="ltr">
                                            <span className="text-blue-600 dark:text-blue-400 font-black">${freightCalc.usd.toLocaleString()}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-black">{freightCalc.aed.toLocaleString()} AED</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-emerald-700 dark:text-emerald-400">{freightCalc.rial.toLocaleString()} ریال</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 text-left" dir="ltr">
                                        * Exchange rate conversion parity: 1 USD = {parseFloat(transUsdAedRate) || 3.67} AED
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* توضیحات */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات / مسیر حمل</label>
                            <input 
                                type="text" 
                                value={transDesc} 
                                onChange={e => setTransDesc(e.target.value)} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none text-sm" 
                                placeholder="مثال: کرایه حمل مسیر مهران..." 
                            />
                        </div>

                        {/* خلاصه محاسبات نهایی کرایه راننده */}
                        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-lg space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-emerald-400">کرایه محاسبه‌شده راننده:</span>
                                <div className="font-mono font-black text-base text-emerald-400 flex items-center gap-2" dir="ltr">
                                    <span>{freightCalc.toman.toLocaleString()} تومان</span>
                                    <span className="text-xs text-slate-400 font-normal">({freightCalc.rial.toLocaleString()} ریال)</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs border-t border-slate-700/80 pt-2">
                                <span className="text-slate-400">معادل ارزی کرایه (با ضریب صرافی {parseFloat(transUsdAedRate) || 3.67}):</span>
                                <div className="font-mono font-bold flex items-center gap-2" dir="ltr">
                                    <span className="text-blue-400">${freightCalc.usd.toLocaleString()} USD</span>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-amber-400">{freightCalc.aed.toLocaleString()} AED</span>
                                </div>
                            </div>
                            <div className="text-[11px] text-amber-300/90 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                در این بخش صرفاً کرایه راننده محاسبه می‌شود و هیچ باری در انبار یا فروش ثبت نمی‌گردد.
                            </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => setTransDriverId(null)} 
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
                            >
                                بستن
                            </button>
                            <button 
                                type="submit" 
                                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
                            >
                                <Calculator size={18} />
                                تایید و ثبت کرایه راننده (بدون ثبت بار)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            );
        })()}
        
        {/* History Modal */}
        {historyDriverId && historyDriver && (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                    <div className="bg-indigo-600 dark:bg-indigo-700 p-4 border-b border-indigo-700 dark:border-indigo-800 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-indigo-500 dark:bg-indigo-800 rounded-lg shadow-inner"><History size={20} /></div>
                             <div>
                                 <h3 className="font-bold text-lg text-white">ریز حساب: {historyDriver.fullName}</h3>
                                 <div className="text-xs opacity-80 mt-1">{historyDriver.plateNumber} | {historyDriver.phone}</div>
                             </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleHistoryExportPDF} disabled={isExportingHistoryPdf} className="p-2 bg-indigo-500 dark:bg-indigo-800 hover:bg-indigo-400 dark:hover:bg-indigo-600 rounded-lg transition-colors border border-indigo-400 dark:border-indigo-600" title="PDF">{isExportingHistoryPdf ? '...' : <FileDown size={18}/>}</button>
                            <button onClick={handleHistoryExportCSV} className="p-2 bg-indigo-500 dark:bg-indigo-800 hover:bg-indigo-400 dark:hover:bg-indigo-600 rounded-lg transition-colors border border-indigo-400 dark:border-indigo-600" title="اکسل"><Download size={18}/></button>
                            <button onClick={handleHistoryPrint} className="p-2 bg-indigo-500 dark:bg-indigo-800 hover:bg-indigo-400 dark:hover:bg-indigo-600 rounded-lg transition-colors border border-indigo-400 dark:border-indigo-600" title="چاپ"><Printer size={18}/></button>
                            <div className="w-px h-6 bg-indigo-400 dark:bg-indigo-600 mx-1"></div>
                            <button onClick={() => setHistoryDriverId(null)} className="hover:bg-red-500 p-1.5 rounded-lg transition-colors text-white"><X size={20}/></button>
                        </div>
                    </div>

                    {/* Filter Bar Inside Modal */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">فیلتر بازه زمانی:</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-700 shadow-sm">
                            <DatePicker 
                                value={historyStartDate}
                                onChange={setHistoryStartDate}
                                calendar={persian}
                                locale={persian_fa}
                                inputClass="rmdp-input !h-8 !text-xs !w-28" 
                                placeholder="از تاریخ..."
                            />
                            <span className="text-slate-400">تا</span>
                            <DatePicker 
                                value={historyEndDate}
                                onChange={setHistoryEndDate}
                                calendar={persian}
                                locale={persian_fa}
                                inputClass="rmdp-input !h-8 !text-xs !w-28" 
                                placeholder="تا تاریخ..."
                            />
                            {(historyStartDate || historyEndDate) && (
                                <button onClick={clearHistoryFilters} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="پاکسازی فیلتر">
                                    <RotateCcw size={14} />
                                </button>
                            )}
                        </div>
                        <div className="mr-auto text-xs font-medium text-slate-500 dark:text-slate-400">
                             تعداد موارد یافت شده: <span className="text-indigo-600 dark:text-indigo-400 font-black">{historyData.length}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0 bg-white dark:bg-slate-900" id="driver-history-table-container">
                         <table className="w-full text-right text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0 z-10 border-b dark:border-slate-700 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3">تاریخ</th>
                                    <th className="px-4 py-3">شرح عملیات</th>
                                    <th className="px-4 py-3">جزئیات بار (تن / فی)</th>
                                    <th className="px-4 py-3">بدهکار (T)</th>
                                    <th className="px-4 py-3">بستانکار (T)</th>
                                    <th className="px-4 py-3">توضیحات / بارنامه</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(historyDriver.previousBalanceAmount || 0) > 0 &&
                                  historyDriver.previousBalanceType &&
                                  historyDriver.previousBalanceType !== 'NONE' && (
                                    <tr className="bg-purple-50/60 dark:bg-purple-950/25 text-slate-800 dark:text-slate-200">
                                        <td className="px-4 py-3 text-purple-700 dark:text-purple-400 whitespace-nowrap font-mono text-[10px]" dir="ltr">
                                            {historyDriver.previousBalanceDate || 'مانده اولیه'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                                <span className="font-black text-purple-800 dark:text-purple-300">
                                                    حساب قبلی ({historyDriver.previousBalanceType === 'CREDITOR' ? 'طلب قبلی راننده' : 'بدهی قبلی راننده'})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">مانده انتقالی از قبل</td>
                                        <td className="px-4 py-3 font-black text-red-600 dark:text-red-400" dir="ltr">
                                            {historyDriver.previousBalanceType === 'DEBTOR'
                                                ? (historyDriver.previousBalanceAmount || 0).toLocaleString()
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                                            {historyDriver.previousBalanceType === 'CREDITOR'
                                                ? (historyDriver.previousBalanceAmount || 0).toLocaleString()
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-purple-700 dark:text-purple-300 font-medium">
                                            {historyDriver.previousBalanceDescription || 'مانده حساب قبلی'}
                                        </td>
                                    </tr>
                                )}
                                {historyData.map((item) => {
                                    const isExpense = item.type === 'expense';
                                    const isStandaloneExcluded = item.type === 'payment' && (item as any).deductFromWaybillBalance === false;
                                    const isDebit = (item.type === 'payment' && !isStandaloneExcluded) || (isExpense && (item as any).impactOnBalance === 'DEDUCT_FROM_DRIVER');
                                    const isCredit = item.type === 'freight' || item.type === 'transaction' || (isExpense && (item as any).impactOnBalance === 'REIMBURSE_TO_DRIVER');
                                    const isCompanyOverhead = isExpense && (item as any).impactOnBalance === 'COMPANY_OVERHEAD';
                                    const paymentCatCfg = item.type === 'payment' && (item as any).paymentCategory ? getDepositCategoryConfig((item as any).paymentCategory) : null;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 group transition-colors text-slate-800 dark:text-slate-200">
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-500 whitespace-nowrap font-mono text-[10px]" dir="ltr">{item.date}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {item.type === 'payment' && <span className={`w-2 h-2 rounded-full ${(item as any).isStandaloneDeposit ? 'bg-purple-500' : 'bg-red-500'} shadow-sm`}></span>}
                                                        {item.type === 'freight' && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>}
                                                        {item.type === 'transaction' && <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>}
                                                        {item.type === 'expense' && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm"></span>}
                                                        <span className="font-medium">
                                                            {item.type === 'payment' 
                                                              ? ((item as any).isStandaloneDeposit ? (paymentCatCfg?.shortLabel || 'واریزی جدا از بارنامه') : 'پرداخت وجه (تسویه)') 
                                                              : item.type === 'freight' ? 'کرایه حمل' : item.type === 'transaction' ? 'حمل گاز (کرایه)' : 'هزینه راننده/ماشین'}
                                                        </span>
                                                    </div>
                                                    {item.type === 'payment' && (item as any).isStandaloneDeposit && (
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                                                                جدا از حساب بارنامه
                                                            </span>
                                                            {isStandaloneExcluded && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                                                    ثبت مستقل (بدون کسر از تراز جاری)
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.volume > 0 ? (
                                                    <div className="flex flex-col text-[10px] gap-0.5">
                                                        <span className="font-black text-slate-700 dark:text-slate-300">وزن: {item.volume.toLocaleString()} تن</span>
                                                        {(item as any).freightRate ? (
                                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                {(item as any).freightCurrency === 'USD' 
                                                                    ? `نرخ کرایه: $${(item as any).freightRateUSD || (item as any).freightRate}/تن`
                                                                    : `نرخ کرایه: ${((item as any).freightRate).toLocaleString()} تومان/تن`
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="opacity-60">فی گاز: {item.price.toLocaleString()} تومان</span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-slate-300">---</span>}
                                            </td>
                                            <td className="px-4 py-3 font-black text-red-600 dark:text-red-400" dir="ltr">
                                                {isDebit ? item.amount.toLocaleString() : isStandaloneExcluded ? (
                                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/40 px-1.5 py-0.5 rounded" title="واریزی جدا از حساب بارنامه">
                                                        واریزی جدا ({item.amount.toLocaleString()})
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                                                {isCredit ? item.amount.toLocaleString() : isCompanyOverhead ? (
                                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/40 px-1.5 py-0.5 rounded">
                                                        سهم شرکت ({item.amount.toLocaleString()})
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs relative">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="truncate text-xs">{item.description || '-'}</span>
                                                        <button onClick={() => handleEditHistoryClick(item)} className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all print:hidden"><Pencil size={12} /></button>
                                                    </div>
                                                    {(item as any).billOfLading && <div className="text-[10px] font-mono opacity-60">بارنامه: {(item as any).billOfLading}</div>}
                                                    {(item as any).trackingCode && <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">کد رهگیری: {(item as any).trackingCode}</div>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {historyData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center text-slate-400 dark:text-slate-600 italic">هیچ موردی در این بازه زمانی یافت نشد.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-indigo-50 dark:bg-indigo-900/30 font-bold border-t border-indigo-100 dark:border-indigo-800 sticky bottom-0 text-slate-900 dark:text-slate-100 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <td colSpan={3} className="px-4 py-4 text-center">مجموع بازه انتخابی:</td>
                                    <td className="px-4 py-4 text-red-600 dark:text-red-400" dir="ltr">
                                        {historyData.filter(i => i.type === 'payment' || (i.type === 'expense' && (i as any).impactOnBalance === 'DEDUCT_FROM_DRIVER')).reduce((a, b) => a + b.amount, 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-emerald-600 dark:text-emerald-400" dir="ltr">
                                        {historyData.filter(i => i.type === 'freight' || i.type === 'transaction' || (i.type === 'expense' && (i as any).impactOnBalance === 'REIMBURSE_TO_DRIVER')).reduce((a, b) => a + b.amount, 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-indigo-700 dark:text-indigo-400 text-lg font-black" dir="ltr">{getDriverBalance(historyDriverId).toLocaleString()} T</td>
                                </tr>
                            </tfoot>
                         </table>
                    </div>
                </div>
            </div>
        )}

        {/* Edit History Description Modal */}
        {editHistoryItem && (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Pencil size={18} className="text-blue-600 dark:text-blue-400"/>ویرایش توضیحات سابقه</h3>
                        <button onClick={() => setEditHistoryItem(null)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleSaveHistoryDescription} className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">توضیحات</label>
                            <textarea value={editHistoryItem.description} onChange={e => setEditHistoryItem({...editHistoryItem!, description: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none outline-none text-slate-900 dark:text-slate-100 shadow-inner" autoFocus />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setEditHistoryItem(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">انصراف</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors font-bold">
                                <Save size={16} /> ذخیره تغییرات
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        
        {/* Payment / Settlement Voucher Modal with Bill of Lading & Standalone Deposit Mode */}
        {selectedDriverId && (() => {
            const payDriver = drivers.find(d => d.id === selectedDriverId);
            const driverBills = [
                ...transactions.filter(t => t.driverId === selectedDriverId),
                ...freights.filter(f => f.driverId === selectedDriverId)
            ].sort((a, b) => parseInt(b.id || '0') - parseInt(a.id || '0'));
            return (
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6 animate-in zoom-in-95 duration-200">
                    <div className={`p-4 border-b flex justify-between items-center text-white ${payIsStandalone ? 'bg-gradient-to-r from-purple-700 to-indigo-700 border-purple-800' : 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-700'}`}>
                        <div>
                            <h3 className="font-bold text-base text-white">
                                {payIsStandalone ? 'ثبت واریزی به راننده (جدا از حساب بارنامه)' : 'تنظیم فیش پرداختی و تسویه بارنامه راننده'}
                            </h3>
                            <p className="text-xs text-blue-100 mt-0.5">{payDriver?.fullName} | {payDriver?.plateNumber}</p>
                        </div>
                        <button onClick={() => setSelectedDriverId(null)} className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"><X size={20}/></button>
                    </div>
                    <form onSubmit={handlePayment} className="p-5 space-y-4">
                        {/* انتخاب نوع عملیات: تسویه بارنامه یا واریزی جدا از بارنامه */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => {
                                    setPayIsStandalone(false);
                                    setPayCategory('WAYBILL');
                                    setPayDeductFromBalance(true);
                                }}
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                    !payIsStandalone
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/50'
                                }`}
                            >
                                ۱. تسویه حساب بارنامه
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPayIsStandalone(true);
                                    setPayCategory('PREVIOUS_ACCOUNT');
                                    setPayDeductFromBalance(false);
                                    setPaySelectedTxId('');
                                    setPayBillOfLading('');
                                    setPayCargoWeight('');
                                    setPayRatePerTon('');
                                }}
                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                    payIsStandalone
                                        ? 'bg-purple-600 text-white shadow'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/50'
                                }`}
                            >
                                ۲. واریزی جدا از بارنامه (حساب قبلی / پیش‌کرایه)
                            </button>
                        </div>

                        {payIsStandalone ? (
                            <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60 space-y-3">
                                <label className="block text-xs font-black text-purple-900 dark:text-purple-300">
                                    علت واریزی جدا از بارنامه را انتخاب کنید:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPayCategory('PREVIOUS_ACCOUNT');
                                            setPayDeductFromBalance(false);
                                        }}
                                        className={`p-2.5 rounded-xl border text-right transition-all ${
                                            payCategory === 'PREVIOUS_ACCOUNT'
                                                ? 'bg-purple-600 text-white border-purple-600 shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-purple-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-black">حساب قبلی واریزشده</div>
                                        <div className={`text-[10px] mt-0.5 ${payCategory === 'PREVIOUS_ACCOUNT' ? 'text-purple-100' : 'text-slate-400'}`}>
                                            بدهی/حساب قدیمی جدا از بارنامه
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPayCategory('ADVANCE_BEFORE_DELIVERY');
                                            setPayDeductFromBalance(true);
                                        }}
                                        className={`p-2.5 rounded-xl border text-right transition-all ${
                                            payCategory === 'ADVANCE_BEFORE_DELIVERY'
                                                ? 'bg-amber-600 text-white border-amber-600 shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-amber-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-black">کرایه قبل از تحویل بار</div>
                                        <div className={`text-[10px] mt-0.5 ${payCategory === 'ADVANCE_BEFORE_DELIVERY' ? 'text-amber-100' : 'text-slate-400'}`}>
                                            درخواست راننده پیش از تخلیه
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPayCategory('ON_ACCOUNT');
                                            setPayDeductFromBalance(true);
                                        }}
                                        className={`p-2.5 rounded-xl border text-right transition-all ${
                                            payCategory === 'ON_ACCOUNT'
                                                ? 'bg-teal-600 text-white border-teal-600 shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-teal-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <div className="text-xs font-black">واریزی علی‌الحساب</div>
                                        <div className={`text-[10px] mt-0.5 ${payCategory === 'ON_ACCOUNT' ? 'text-teal-100' : 'text-slate-400'}`}>
                                            پرداخت آزاد بدون بارنامه
                                        </div>
                                    </button>
                                </div>

                                {/* نحوه تاثیر روی مانده حساب جاری بارنامه‌ها */}
                                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                        نحوه محاسبه در تراز بارنامه‌های جاری راننده:
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setPayDeductFromBalance(false)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                !payDeductFromBalance
                                                    ? 'bg-purple-700 text-white border-purple-700'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            جدا از حساب بارنامه (کسر نشود)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPayDeductFromBalance(true)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                payDeductFromBalance
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                            }`}
                                        >
                                            کسر از طلب کل راننده
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">کد رهگیری بانکی / فیش (اختیاری)</label>
                                        <input
                                            type="text"
                                            value={payTrackingCode}
                                            onChange={e => setPayTrackingCode(e.target.value)}
                                            placeholder="مثال: 140398234"
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">شماره مرجع / بارنامه مرتبط (اختیاری)</label>
                                        <input
                                            type="text"
                                            value={payBillOfLading}
                                            onChange={e => setPayBillOfLading(e.target.value)}
                                            placeholder="در صورت نیاز..."
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* انتخاب بارنامه راننده */}
                                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-300">
                                        انتخاب بارنامه / کرایه راننده (فراخوانی خودکار وزن و نرخ کرایه):
                                    </label>
                                    <select
                                        value={paySelectedTxId}
                                        onChange={(e) => handleSelectPayBillOfLading(e.target.value)}
                                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-amber-500"
                                    >
                                        <option value="">-- انتخاب از بارنامه‌ها و کرایه‌های ثبت‌شده راننده ({driverBills.length} مورد) --</option>
                                        {driverBills.map(tx => {
                                            const bolLabel = (tx as any).billOfLading || (tx as any).trackingCode || `BL-${tx.id.slice(-5).toUpperCase()}`;
                                            const volLabel = (tx as any).volume ? `وزن: ${(tx as any).volume} تن | ` : '';
                                            const rLabel = (tx as any).freightCurrency === 'USD'
                                              ? `$${(tx as any).freightRateUSD || (tx as any).freightRate}/تن`
                                              : (tx as any).freightCurrency === 'AED'
                                                ? `${(tx as any).freightRateAED || (tx as any).freightRate} AED/تن`
                                                : (tx as any).freightRate
                                                  ? `${(tx as any).freightRate.toLocaleString()} ت/تن`
                                                  : '';
                                            return (
                                                <option key={tx.id} value={tx.id}>
                                                    بارنامه: {bolLabel} | {volLabel}تاریخ: {tx.date.split(' ')[0]} {rLabel ? `| ${rLabel}` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">شماره بارنامه</label>
                                            <input
                                                type="text"
                                                value={payBillOfLading}
                                                onChange={e => setPayBillOfLading(e.target.value)}
                                                placeholder="مثال: BL-98432"
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">وزن بار (تن)</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={payCargoWeight}
                                                onChange={e => {
                                                    setPayCargoWeight(e.target.value);
                                                    recalculatePayAmount(e.target.value, payRatePerTon, payRateCurrency, payExchangeRate, payUsdAedRate);
                                                }}
                                                placeholder="22.50"
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* تعیین نرخ روز ارز و فی کرایه */}
                                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                                    <div className="flex items-center justify-between border-b border-emerald-200/70 dark:border-emerald-800/60 pb-2">
                                        <span className="text-xs font-black text-emerald-900 dark:text-emerald-300">تعیین نرخ روز و واحد کرایه:</span>
                                        <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-emerald-200 dark:border-slate-700 gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPayRateCurrency('TOMAN');
                                                    recalculatePayAmount(payCargoWeight, payRatePerTon, 'TOMAN', payExchangeRate, payUsdAedRate);
                                                }}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${payRateCurrency === 'TOMAN' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                                            >
                                                تومان/ریال
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPayRateCurrency('USD');
                                                    recalculatePayAmount(payCargoWeight, payRatePerTon, 'USD', payExchangeRate, payUsdAedRate);
                                                }}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${payRateCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                                            >
                                                دلار ($)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPayRateCurrency('AED');
                                                    recalculatePayAmount(payCargoWeight, payRatePerTon, 'AED', payExchangeRate, payUsdAedRate);
                                                }}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${payRateCurrency === 'AED' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
                                            >
                                                درهم (۳.۶۷)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">نرخ روز دلار (تومان)</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                dir="ltr"
                                                value={formatNumberInput(payExchangeRate)}
                                                onChange={e => {
                                                    const cleaned = cleanNumberInput(e.target.value);
                                                    setPayExchangeRate(cleaned);
                                                    recalculatePayAmount(payCargoWeight, payRatePerTon, payRateCurrency, cleaned, payUsdAedRate);
                                                }}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-600 outline-none text-left"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">ضریب صرافی (درهم)</label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={payUsdAedRate}
                                                onChange={e => {
                                                    setPayUsdAedRate(e.target.value);
                                                    recalculatePayAmount(payCargoWeight, payRatePerTon, payRateCurrency, payExchangeRate, e.target.value);
                                                }}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-600 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                فی کرایه ({payRateCurrency === 'USD' ? '$' : payRateCurrency === 'AED' ? 'AED' : 'تومان'})
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                dir="ltr"
                                                value={formatNumberInput(payRatePerTon)}
                                                onChange={e => {
                                                    const cleaned = cleanNumberInput(e.target.value);
                                                    setPayRatePerTon(cleaned);
                                                    recalculatePayAmount(payCargoWeight, cleaned, payRateCurrency, payExchangeRate, payUsdAedRate);
                                                }}
                                                placeholder={payRateCurrency === 'USD' ? '25' : payRateCurrency === 'AED' ? '91.75' : '1,200,000'}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none text-left"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاریخ و زمان واریز</label><DatePicker value={payDate} onChange={setPayDate} calendar={persian} locale={persian_fa} format="YYYY/MM/DD HH:mm" plugins={[<TimePicker hideSeconds />]} inputClass="rmdp-input !text-xs !h-10 !w-full" /></div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">مبلغ واریزی (تومان)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    dir="ltr"
                                    required
                                    value={formatNumberInput(payAmount)}
                                    onChange={e => setPayAmount(cleanNumberInput(e.target.value))}
                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-emerald-400 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-emerald-700 dark:text-emerald-400 font-mono font-black h-10 text-left tracking-wider"
                                    placeholder="مثال: 15,000,000"
                                />
                                {payAmount && parseFloat(payAmount) > 0 && (
                                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                                        معادل: {numberToPersianWords(parseFloat(payAmount))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات</label><input value={payDesc} onChange={e => setPayDesc(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white text-xs" placeholder={payIsStandalone ? "مثال: واریزی بابت حساب قبلی یا پیش‌پرداخت کرایه قبل از تحویل بار..." : "شرح پرداخت..."} /></div>
                        <button type="submit" className={`w-full py-3 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 text-sm ${payIsStandalone ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>
                            {payIsStandalone ? 'ثبت واریزی جدا از حساب بارنامه' : 'ثبت فیش پرداختی و تسویه'}
                        </button>
                    </form>
                </div>
            </div>
            );
        })()}

        {/* Driver & Vehicle Expenses Manager Modal */}
        {showExpenseModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0">
                <div className="w-full max-w-5xl my-auto animate-in fade-in zoom-in-95 duration-150">
                    <DriverExpensesManager 
                        initialDriverId={expenseModalDriverId}
                        onClose={() => {
                            setShowExpenseModal(false);
                            setExpenseModalDriverId(null);
                        }}
                        isModal={true}
                    />
                </div>
            </div>
        )}

        {/* Driver Debt & Loads/Prepayments Breakdown Report Modal */}
        {showDebtBreakdownModal && (
            <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto print:p-0">
                <div className="w-full max-w-6xl my-auto animate-in fade-in zoom-in-95 duration-150">
                    <DriverDebtBreakdownReport
                        initialDriverId={breakdownDriverId}
                        onClose={() => {
                            setShowDebtBreakdownModal(false);
                            setBreakdownDriverId(null);
                        }}
                        isModal={true}
                        onOpenPaymentModal={(driverId, standalone) => {
                            setShowDebtBreakdownModal(false);
                            openPaymentModal(driverId, standalone, standalone ? 'ADVANCE_BEFORE_DELIVERY' : 'WAYBILL');
                        }}
                    />
                </div>
            </div>
        )}
    </div>
  );
};

export default DriversList;
