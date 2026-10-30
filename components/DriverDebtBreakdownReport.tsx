import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  FileText,
  Truck,
  Wallet,
  TrendingDown,
  TrendingUp,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  CalendarDays,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Scale,
  Receipt,
  CreditCard,
  Wrench
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { getDepositCategoryConfig } from './DriverSettlements';
import { DRIVER_EXPENSE_CATEGORIES_CONFIG } from './DriverExpensesManager';

interface DriverDebtBreakdownReportProps {
  initialDriverId?: string | null;
  onClose?: () => void;
  isModal?: boolean;
  onOpenPaymentModal?: (driverId: string, standalone: boolean) => void;
}

type StatusFilter = 'ALL' | 'DEBTOR' | 'CREDITOR' | 'HAS_ADVANCE' | 'SETTLED';

export const DriverDebtBreakdownReport: React.FC<DriverDebtBreakdownReportProps> = ({
  initialDriverId = null,
  onClose,
  isModal = false,
  onOpenPaymentModal
}) => {
  const {
    drivers,
    transactions,
    freights,
    driverPayments,
    driverSettlements,
    driverVehicleExpenses
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>(initialDriverId || 'ALL');
  const [expandedDriverIds, setExpandedDriverIds] = useState<string[]>(
    initialDriverId ? [initialDriverId] : []
  );
  const [startDate, setStartDate] = useState<DateObject | null>(null);
  const [endDate, setEndDate] = useState<DateObject | null>(null);

  const toggleExpandDriver = (driverId: string) => {
    setExpandedDriverIds(prev =>
      prev.includes(driverId) ? prev.filter(id => id !== driverId) : [...prev, driverId]
    );
  };

  // Helper to check if an item falls within selected date range (using timestamp id or Persian date string)
  const isWithinDateRange = (idStr: string, dateStr?: string) => {
    if (!startDate && !endDate) return true;
    const numericId = parseInt(idStr.replace(/\D/g, '').slice(0, 13), 10);
    if (!isNaN(numericId) && numericId > 1600000000000 && numericId < 2500000000000) {
      if (startDate && numericId < startDate.toDate().setHours(0, 0, 0, 0)) return false;
      if (endDate && numericId > endDate.toDate().setHours(23, 59, 59, 999)) return false;
      return true;
    }
    if (dateStr) {
      const cleanDate = dateStr.split(' ')[0];
      if (startDate) {
        const startFormatted = startDate.format('YYYY/MM/DD');
        if (cleanDate < startFormatted) return false;
      }
      if (endDate) {
        const endFormatted = endDate.format('YYYY/MM/DD');
        if (cleanDate > endFormatted) return false;
      }
    }
    return true;
  };

  // Detect if a payment is an Advance / Prepayment
  const isAdvancePaymentItem = (p: {
    paymentCategory?: string;
    isStandaloneDeposit?: boolean;
    description?: string;
  }) => {
    if (
      p.paymentCategory === 'ADVANCE_BEFORE_DELIVERY' ||
      p.paymentCategory === 'ON_ACCOUNT'
    ) {
      return true;
    }
    const desc = (p.description || '').toLowerCase();
    if (
      desc.includes('پیش‌پرداخت') ||
      desc.includes('پیش پرداخت') ||
      desc.includes('قبل از تحویل') ||
      desc.includes('علی‌الحساب') ||
      desc.includes('علی الحساب') ||
      desc.includes('مساعده') ||
      desc.includes('پیش‌کرایه')
    ) {
      return true;
    }
    return false;
  };

  const driverBreakdowns = useMemo(() => {
    return drivers.map(driver => {
      // 1. Completed Loads (Transactions + Freights)
      const drTransactions = transactions
        .filter(t => t.driverId === driver.id && isWithinDateRange(t.id, t.date))
        .map(t => ({
          id: t.id,
          date: t.date,
          sourceType: 'TRANSACTION' as const,
          billOfLading: t.billOfLading || `BL-${t.id.slice(-5).toUpperCase()}`,
          volume: t.volume || 0,
          freightCurrency: t.freightCurrency || 'TOMAN',
          freightRate: t.freightRate || 0,
          freightRateUSD: t.freightRateUSD,
          freightRateAED: t.freightRateAED,
          exchangeRate: t.exchangeRate,
          amount: t.freightPrice || 0,
          description: t.description || 'حمل بار گاز مایع'
        }));

      const drFreights = freights
        .filter(f => f.driverId === driver.id && isWithinDateRange(f.id, f.date))
        .map(f => ({
          id: f.id,
          date: f.date,
          sourceType: 'FREIGHT' as const,
          billOfLading: f.billOfLading || f.trackingCode || `FR-${f.id.slice(-5).toUpperCase()}`,
          volume: f.volume || 0,
          freightCurrency: f.freightCurrency || 'TOMAN',
          freightRate: f.freightRate || 0,
          freightRateUSD: f.freightRateUSD,
          freightRateAED: f.freightRateAED,
          exchangeRate: f.exchangeRate,
          amount: f.amount || 0,
          description:
            f.origin || f.destination
              ? `کرایه حمل (${f.origin || ''} به ${f.destination || ''}) ${f.description || ''}`.trim()
              : f.description || 'کرایه حمل بار'
        }));

      const completedLoads = [...drTransactions, ...drFreights].sort(
        (a, b) => parseInt(b.id || '0') - parseInt(a.id || '0')
      );

      const totalLoadsCount = completedLoads.length;
      const totalLoadsWeight = completedLoads.reduce((sum, l) => sum + (l.volume || 0), 0);
      const totalLoadsFreight = completedLoads.reduce((sum, l) => sum + (l.amount || 0), 0);

      // 2. Reimbursements to Driver (expenses paid by driver from pocket)
      const drReimbursements = (driverVehicleExpenses || [])
        .filter(
          e =>
            e.driverId === driver.id &&
            e.impactOnBalance === 'REIMBURSE_TO_DRIVER' &&
            isWithinDateRange(e.id, e.date)
        )
        .map(e => ({
          id: e.id,
          date: e.date,
          title: e.title,
          category: e.category,
          amount: e.amount,
          description: e.description
        }));
      const totalReimbursements = drReimbursements.reduce((sum, e) => sum + e.amount, 0);

      // 3. Payments & Prepayments (from driverPayments)
      const drPayments = driverPayments.filter(
        p => p.driverId === driver.id && isWithinDateRange(p.id, p.date)
      );

      // Categorize payments:
      // 3A. Advance Payments / Prepayments (deducted from balance)
      const advancePayments = drPayments
        .filter(p => p.deductFromWaybillBalance !== false && isAdvancePaymentItem(p))
        .map(p => ({
          id: p.id,
          date: p.date,
          amount: p.amount,
          categoryLabel: getDepositCategoryConfig(
            p.paymentCategory || 'ADVANCE_BEFORE_DELIVERY',
            true
          ).shortLabel,
          trackingCode: p.trackingCode,
          description: p.description,
          source: 'PAYMENT' as const
        }));

      // Also include Driver Advances recorded in Vehicle Expenses (category === 'DRIVER_ADVANCE' && DEDUCT_FROM_DRIVER)
      const expenseAdvances = (driverVehicleExpenses || [])
        .filter(
          e =>
            e.driverId === driver.id &&
            e.impactOnBalance === 'DEDUCT_FROM_DRIVER' &&
            e.category === 'DRIVER_ADVANCE' &&
            isWithinDateRange(e.id, e.date)
        )
        .map(e => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          categoryLabel: 'مساعده و پیش‌پرداخت راننده',
          trackingCode: e.invoiceNumber,
          description: `${e.title}${e.description ? ` - ${e.description}` : ''}`,
          source: 'EXPENSE_ADVANCE' as const
        }));

      const allAdvanceItems = [...advancePayments, ...expenseAdvances].sort(
        (a, b) => parseInt(b.id || '0') - parseInt(a.id || '0')
      );
      const totalAdvances = allAdvanceItems.reduce((sum, a) => sum + a.amount, 0);

      // 3B. Waybill Settlements (regular payments that deduct from balance and are not advances)
      const waybillPayments = drPayments
        .filter(p => p.deductFromWaybillBalance !== false && !isAdvancePaymentItem(p))
        .map(p => ({
          id: p.id,
          date: p.date,
          amount: p.amount,
          categoryLabel: p.isStandaloneDeposit
            ? getDepositCategoryConfig(p.paymentCategory, true).shortLabel
            : 'تسویه بارنامه',
          trackingCode: p.trackingCode,
          description: p.description
        }));
      const totalWaybillPayments = waybillPayments.reduce((sum, p) => sum + p.amount, 0);

      // 3C. Other Deductible Vehicle Expenses (excluding DRIVER_ADVANCE which is already in advances)
      const otherDeductibleExpenses = (driverVehicleExpenses || [])
        .filter(
          e =>
            e.driverId === driver.id &&
            e.impactOnBalance === 'DEDUCT_FROM_DRIVER' &&
            e.category !== 'DRIVER_ADVANCE' &&
            isWithinDateRange(e.id, e.date)
        )
        .map(e => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          categoryLabel: DRIVER_EXPENSE_CATEGORIES_CONFIG[e.category]?.label || 'کسر هزینه',
          trackingCode: e.invoiceNumber,
          description: `${e.title}${e.description ? ` - ${e.description}` : ''}`
        }));
      const totalOtherDeductions = otherDeductibleExpenses.reduce((sum, e) => sum + e.amount, 0);

      // 3D. Standalone Previous Account Deposits excluded from current waybill balance
      const standaloneExcludedPayments = drPayments
        .filter(p => p.deductFromWaybillBalance === false)
        .map(p => ({
          id: p.id,
          date: p.date,
          amount: p.amount,
          categoryLabel: getDepositCategoryConfig(p.paymentCategory || 'PREVIOUS_ACCOUNT', true)
            .shortLabel,
          trackingCode: p.trackingCode,
          description: p.description
        }));
      const totalStandaloneExcluded = standaloneExcludedPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );

      // 3E. Pending Settlements (in queue to be paid, not yet in driverPayments)
      const pendingSettlements = driverSettlements.filter(
        s =>
          (s.driverId === driver.id || s.driverName === driver.fullName) &&
          s.status === 'PENDING' &&
          isWithinDateRange(s.id, s.date)
      );
      const totalPendingSettlements = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);

      // 3F. Driver's Registered Opening / Previous Balance (حساب قبلی ثبت‌شده روی پروفایل راننده)
      const hasPrevBalance =
        (driver.previousBalanceAmount || 0) > 0 &&
        driver.previousBalanceType &&
        driver.previousBalanceType !== 'NONE';
      const includePrevInNet = hasPrevBalance && driver.includePreviousBalanceInTotal !== false;
      const prevCredit =
        includePrevInNet && driver.previousBalanceType === 'CREDITOR'
          ? driver.previousBalanceAmount || 0
          : 0;
      const prevDebit =
        includePrevInNet && driver.previousBalanceType === 'DEBTOR'
          ? driver.previousBalanceAmount || 0
          : 0;

      // Total Credits (طلب راننده بابت بارهای انجام‌شده + بازپرداخت هزینه‌ها + طلب قبلی)
      const totalCredits = totalLoadsFreight + totalReimbursements + prevCredit;

      // Total Debits (کل مبالغ دریافتی راننده و کسورات: پیش‌پرداخت‌ها + تسویه‌های بارنامه + کسورات هزینه + بدهی قبلی)
      const totalDebits =
        totalAdvances +
        totalWaybillPayments +
        totalOtherDeductions +
        prevDebit +
        (includePrevInNet && driver.previousBalanceType === 'CREDITOR' ? totalStandaloneExcluded : 0);

      // Net Balance (positive = راننده طلبکار, negative = راننده بدهکار به شرکت)
      const netBalance = totalCredits - totalDebits;
      const driverDebtToCompany = netBalance < 0 ? Math.abs(netBalance) : 0;
      const companyDebtToDriver = netBalance > 0 ? netBalance : 0;

      return {
        driver,
        hasPrevBalance,
        prevBalanceType: driver.previousBalanceType || 'NONE',
        prevBalanceAmount: driver.previousBalanceAmount || 0,
        completedLoads,
        totalLoadsCount,
        totalLoadsWeight,
        totalLoadsFreight,
        drReimbursements,
        totalReimbursements,
        allAdvanceItems,
        totalAdvances,
        waybillPayments,
        totalWaybillPayments,
        otherDeductibleExpenses,
        totalOtherDeductions,
        standaloneExcludedPayments,
        totalStandaloneExcluded,
        pendingSettlements,
        totalPendingSettlements,
        totalCredits,
        totalDebits,
        netBalance,
        driverDebtToCompany,
        companyDebtToDriver
      };
    });
  }, [
    drivers,
    transactions,
    freights,
    driverPayments,
    driverSettlements,
    driverVehicleExpenses,
    startDate,
    endDate
  ]);

  const filteredBreakdowns = useMemo(() => {
    return driverBreakdowns.filter(item => {
      if (selectedDriverFilter !== 'ALL' && item.driver.id !== selectedDriverFilter) {
        return false;
      }

      if (statusFilter === 'DEBTOR' && item.netBalance >= 0) return false;
      if (statusFilter === 'CREDITOR' && item.netBalance <= 0) return false;
      if (statusFilter === 'HAS_ADVANCE' && item.totalAdvances <= 0) return false;
      if (statusFilter === 'SETTLED' && item.netBalance !== 0) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDriver =
          (item.driver.fullName || '').toLowerCase().includes(q) ||
          (item.driver.plateNumber || '').toLowerCase().includes(q) ||
          (item.driver.phone || '').includes(q) ||
          (item.driver.nationalId || '').includes(q);
        const matchBol = item.completedLoads.some(l =>
          (l.billOfLading || '').toLowerCase().includes(q)
        );
        if (!matchDriver && !matchBol) return false;
      }

      return true;
    });
  }, [driverBreakdowns, selectedDriverFilter, statusFilter, searchTerm]);

  // Overall Totals across filtered drivers
  const summaryStats = useMemo(() => {
    return filteredBreakdowns.reduce(
      (acc, curr) => {
        acc.totalLoadsCount += curr.totalLoadsCount;
        acc.totalLoadsWeight += curr.totalLoadsWeight;
        acc.totalLoadsFreight += curr.totalLoadsFreight;
        acc.totalReimbursements += curr.totalReimbursements;
        acc.totalAdvances += curr.totalAdvances;
        acc.totalWaybillPayments += curr.totalWaybillPayments;
        acc.totalOtherDeductions += curr.totalOtherDeductions;
        acc.totalStandaloneExcluded += curr.totalStandaloneExcluded;
        acc.totalDriverDebtToCompany += curr.driverDebtToCompany;
        acc.totalCompanyDebtToDriver += curr.companyDebtToDriver;
        if (curr.driverDebtToCompany > 0) acc.debtorDriversCount += 1;
        if (curr.companyDebtToDriver > 0) acc.creditorDriversCount += 1;
        if (curr.totalAdvances > 0) acc.driversWithAdvanceCount += 1;
        return acc;
      },
      {
        totalLoadsCount: 0,
        totalLoadsWeight: 0,
        totalLoadsFreight: 0,
        totalReimbursements: 0,
        totalAdvances: 0,
        totalWaybillPayments: 0,
        totalOtherDeductions: 0,
        totalStandaloneExcluded: 0,
        totalDriverDebtToCompany: 0,
        totalCompanyDebtToDriver: 0,
        debtorDriversCount: 0,
        creditorDriversCount: 0,
        driversWithAdvanceCount: 0
      }
    );
  }, [filteredBreakdowns]);

  const handleExportCSV = () => {
    if (filteredBreakdowns.length === 0) {
      alert('داده‌ای برای خروجی وجود ندارد.');
      return;
    }

    const headers = [
      'نام راننده',
      'شماره پلاک',
      'تلفن',
      'تعداد بارهای انجام‌شده',
      'مجموع تناژ (تن)',
      'جمع کرایه بارهای انجام‌شده (تومان)',
      'بازپرداخت هزینه به راننده (تومان)',
      'جمع پیش‌پرداخت‌ها و علی‌الحساب‌ها (تومان)',
      'جمع تسویه‌های بارنامه (تومان)',
      'سایر کسورات راننده (تومان)',
      'واریزی حساب قبلی مستقل (تومان)',
      'بدهی راننده به شرکت (تومان)',
      'طلب راننده از شرکت (تومان)',
      'وضعیت نهایی حساب'
    ];

    const rows = filteredBreakdowns.map(b => [
      b.driver.fullName,
      b.driver.plateNumber,
      b.driver.phone || '-',
      b.totalLoadsCount,
      b.totalLoadsWeight,
      b.totalLoadsFreight,
      b.totalReimbursements,
      b.totalAdvances,
      b.totalWaybillPayments,
      b.totalOtherDeductions,
      b.totalStandaloneExcluded,
      b.driverDebtToCompany,
      b.companyDebtToDriver,
      b.netBalance < 0
        ? 'بدهکار به شرکت (پیش‌پرداخت مازاد)'
        : b.netBalance > 0
        ? 'بستانکار / طلبکار از شرکت'
        : 'تسویه شده'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `گزارش_تفکیکی_بدهی_و_بار_رانندگان_${new Date()
      .toLocaleDateString('fa-IR')
      .replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 ${
        isModal
          ? 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[94vh] flex flex-col'
          : 'rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800'
      }`}
      dir="rtl"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/60">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
            <Layers size={26} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <span>گزارش تفکیکی بدهی و حساب رانندگان</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-bold">
                بر اساس بارهای انجام‌شده و پیش‌پرداخت‌ها
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              محاسبه و تفکیک دقیق کرایه سرویس‌های انجام‌شده، پیش‌پرداخت‌ها (قبل از تحویل بار / علی‌الحساب)، تسویه‌های بارنامه و مانده بدهی یا طلب هر راننده
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto print:hidden">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="خروجی اکسل گزارش تفکیکی"
          >
            <Download size={15} />
            <span>خروجی اکسل</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="چاپ گزارش"
          >
            <Printer size={15} />
            <span>چاپ گزارش</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white rounded-xl transition-all border border-rose-400/30"
              title="بستن"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Completed Loads Total */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70">
            <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 text-xs font-bold mb-1.5">
              <span>۱. کل بارهای انجام‌شده (کرایه بار)</span>
              <Truck size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono" dir="ltr">
              {summaryStats.totalLoadsFreight.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal">T</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 mt-1.5 font-bold">
              <span>{summaryStats.totalLoadsCount} سرویس حمل‌شده</span>
              <span>تناژ: {summaryStats.totalLoadsWeight.toLocaleString()} تن</span>
            </div>
          </div>

          {/* 2. Advance Payments / Prepayments Total */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-bold mb-1.5">
              <span>۲. مجموع پیش‌پرداخت‌ها و مساعده‌ها</span>
              <Wallet size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono" dir="ltr">
              {summaryStats.totalAdvances.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal">T</span>
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 font-bold">
              کرایه قبل از تحویل، علی‌الحساب و مساعده ({summaryStats.driversWithAdvanceCount} راننده)
            </div>
          </div>

          {/* 3. Driver Debts to Company (بدهی ثبت‌شده رانندگان به شرکت) */}
          <div className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800/80 shadow-sm">
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs font-black mb-1.5">
              <span>۳. مجموع بدهی رانندگان به شرکت</span>
              <TrendingDown size={18} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono" dir="ltr">
              {summaryStats.totalDriverDebtToCompany.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal">T</span>
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 font-bold">
              {summaryStats.debtorDriversCount} راننده بدهکار (پیش‌پرداخت مازاد بر بار انجام‌شده)
            </div>
          </div>

          {/* 4. Company Debt to Drivers (مانده طلب رانندگان بابت بارها) */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1.5">
              <span>۴. مانده طلب رانندگان (بابت بارها)</span>
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono" dir="ltr">
              {summaryStats.totalCompanyDebtToDriver.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal">T</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-bold">
              {summaryStats.creditorDriversCount} راننده بستانکار | تسویه بارنامه:{' '}
              {summaryStats.totalWaybillPayments.toLocaleString()} T
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="جستجوی نام راننده، پلاک، بارنامه..."
                className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Specific Driver Select */}
            <select
              value={selectedDriverFilter}
              onChange={e => {
                setSelectedDriverFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  setExpandedDriverIds([e.target.value]);
                }
              }}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="ALL">همه رانندگان ({drivers.length} نفر)</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.plateNumber})
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700">
              <CalendarDays size={14} className="text-indigo-500" />
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                calendar={persian}
                locale={persian_fa}
                inputClass="rmdp-input !h-7 !text-xs !w-24 !border-0"
                placeholder="از تاریخ..."
              />
              <span className="text-slate-400 text-xs">تا</span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                calendar={persian}
                locale={persian_fa}
                inputClass="rmdp-input !h-7 !text-xs !w-24 !border-0"
                placeholder="تا تاریخ..."
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                  title="پاک کردن تاریخ"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-indigo-600'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              همه ({driverBreakdowns.length})
            </button>
            <button
              onClick={() => setStatusFilter('DEBTOR')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                statusFilter === 'DEBTOR'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              بدهکاران به شرکت ({driverBreakdowns.filter(d => d.netBalance < 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('HAS_ADVANCE')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                statusFilter === 'HAS_ADVANCE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              دارای پیش‌پرداخت ({driverBreakdowns.filter(d => d.totalAdvances > 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('CREDITOR')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                statusFilter === 'CREDITOR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              طلبکاران بار ({driverBreakdowns.filter(d => d.netBalance > 0).length})
            </button>
          </div>
        </div>

        {/* Main Breakdown Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5">راننده و پلاک</th>
                  <th className="px-4 py-3.5 text-center bg-blue-50/50 dark:bg-blue-950/20">
                    بارهای انجام‌شده (تعداد / تناژ)
                  </th>
                  <th className="px-4 py-3.5 bg-blue-50/50 dark:bg-blue-950/20">
                    جمع کرایه بارهای انجام‌شده (طلب)
                  </th>
                  <th className="px-4 py-3.5 bg-amber-50/60 dark:bg-amber-950/20">
                    پیش‌پرداخت‌ها و مساعده (بدهی/دریافتی)
                  </th>
                  <th className="px-4 py-3.5">تسویه‌های بارنامه و کسورات</th>
                  <th className="px-4 py-3.5 bg-purple-50/40 dark:bg-purple-950/15">
                    حساب قبلی (مستقل)
                  </th>
                  <th className="px-4 py-3.5">وضعیت نهایی (بدهی / طلب راننده)</th>
                  <th className="px-4 py-3.5 text-center print:hidden">ریز جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBreakdowns.map(item => {
                  const isExpanded = expandedDriverIds.includes(item.driver.id);
                  const isDebtor = item.netBalance < 0;
                  const isCreditor = item.netBalance > 0;

                  return (
                    <React.Fragment key={item.driver.id}>
                      <tr
                        className={`transition-colors ${
                          isExpanded
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Driver Info */}
                        <td className="px-4 py-3.5">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {item.driver.fullName}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {item.driver.plateNumber}
                            </span>
                            {item.driver.phone && (
                              <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                {item.driver.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Loads Count & Weight */}
                        <td className="px-4 py-3.5 text-center bg-blue-50/25 dark:bg-blue-950/10">
                          <div className="font-black text-blue-700 dark:text-blue-400 text-xs">
                            {item.totalLoadsCount} سرویس بار
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {item.totalLoadsWeight.toLocaleString()} تن
                          </div>
                        </td>

                        {/* Total Freight of Completed Loads */}
                        <td className="px-4 py-3.5 bg-blue-50/25 dark:bg-blue-950/10">
                          <div
                            className="font-black text-blue-700 dark:text-blue-300 font-mono text-sm"
                            dir="ltr"
                          >
                            {item.totalLoadsFreight.toLocaleString()} T
                          </div>
                          {item.totalReimbursements > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                              + {item.totalReimbursements.toLocaleString()} بازپرداخت هزینه
                            </div>
                          )}
                        </td>

                        {/* Total Advance Payments / Prepayments */}
                        <td className="px-4 py-3.5 bg-amber-50/35 dark:bg-amber-950/15">
                          {item.totalAdvances > 0 ? (
                            <div>
                              <div
                                className="font-black text-amber-700 dark:text-amber-400 font-mono text-sm"
                                dir="ltr"
                              >
                                {item.totalAdvances.toLocaleString()} T
                              </div>
                              <div className="text-[10px] text-amber-600 dark:text-amber-500 font-bold mt-0.5">
                                {item.allAdvanceItems.length} فقره پیش‌پرداخت / مساعده
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">بدون پیش‌پرداخت</span>
                          )}
                        </td>

                        {/* Waybill Settlements & Deductions */}
                        <td className="px-4 py-3.5">
                          <div
                            className="font-bold text-slate-700 dark:text-slate-300 font-mono text-xs"
                            dir="ltr"
                          >
                            {(item.totalWaybillPayments + item.totalOtherDeductions).toLocaleString()} T
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.waybillPayments.length} تسویه بارنامه
                            {item.totalOtherDeductions > 0
                              ? ` | ${item.otherDeductibleExpenses.length} کسر هزینه`
                              : ''}
                          </div>
                        </td>

                        {/* Standalone Previous Account */}
                        <td className="px-4 py-3.5 bg-purple-50/25 dark:bg-purple-950/10">
                          {item.hasPrevBalance || item.totalStandaloneExcluded > 0 ? (
                            <div className="space-y-1">
                              {item.hasPrevBalance && (
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                      item.prevBalanceType === 'CREDITOR'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                    }`}
                                  >
                                    {item.prevBalanceType === 'CREDITOR' ? 'طلب قبلی:' : 'بدهی قبلی:'}
                                  </span>
                                  <span
                                    className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200"
                                    dir="ltr"
                                  >
                                    {item.prevBalanceAmount.toLocaleString()} T
                                  </span>
                                </div>
                              )}
                              {item.totalStandaloneExcluded > 0 && (
                                <div>
                                  <div
                                    className="font-bold text-purple-700 dark:text-purple-300 font-mono text-[11px]"
                                    dir="ltr"
                                  >
                                    واریزی: {item.totalStandaloneExcluded.toLocaleString()} T
                                  </div>
                                  <div className="text-[10px] text-purple-500">
                                    {item.standaloneExcludedPayments.length} واریزی حساب قبلی
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>

                        {/* Final Net Balance (Debt vs Credit) */}
                        <td className="px-4 py-3.5">
                          {isDebtor ? (
                            <div className="inline-flex flex-col p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                              <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-black text-xs">
                                <AlertCircle size={13} />
                                <span>بدهکار به شرکت (پیش‌پرداخت مازاد)</span>
                              </div>
                              <div
                                className="font-black font-mono text-rose-600 dark:text-rose-400 text-sm mt-0.5"
                                dir="ltr"
                              >
                                {item.driverDebtToCompany.toLocaleString()} T
                              </div>
                            </div>
                          ) : isCreditor ? (
                            <div className="inline-flex flex-col p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-black text-xs">
                                <CheckCircle2 size={13} />
                                <span>طلبکار از شرکت (مانده کرایه بار)</span>
                              </div>
                              <div
                                className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm mt-0.5"
                                dir="ltr"
                              >
                                {item.companyDebtToDriver.toLocaleString()} T
                              </div>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs">
                              تسویه کامل (۰)
                            </span>
                          )}
                        </td>

                        {/* Actions / Expand Button */}
                        <td className="px-4 py-3.5 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => toggleExpandDriver(item.driver.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                              }`}
                            >
                              <span>ریز بار و پیش‌پرداخت</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {onOpenPaymentModal && (
                              <button
                                onClick={() => onOpenPaymentModal(item.driver.id, true)}
                                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-all"
                                title="ثبت پیش‌پرداخت یا واریزی جدید برای این راننده"
                              >
                                + واریزی
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Master-Detail Row: Side-by-Side Completed Loads vs Advance Payments & Settlements */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-800/40">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="space-y-4">
                              {/* Formula Banner for this Driver */}
                              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/70 shadow-sm flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Receipt size={18} className="text-indigo-600 dark:text-indigo-400" />
                                  <span className="font-black text-slate-800 dark:text-white text-xs sm:text-sm">
                                    خلاصه تفکیکی حساب {item.driver.fullName}:
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    بارهای انجام‌شده:{' '}
                                    {(item.totalLoadsFreight + item.totalReimbursements).toLocaleString()}{' '}
                                    T
                                  </span>
                                  <span className="text-slate-400 font-black">−</span>
                                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    پیش‌پرداخت‌ها: {item.totalAdvances.toLocaleString()} T
                                  </span>
                                  <span className="text-slate-400 font-black">−</span>
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    تسویه بارنامه و کسورات:{' '}
                                    {(item.totalWaybillPayments + item.totalOtherDeductions).toLocaleString()}{' '}
                                    T
                                  </span>
                                  <span className="text-slate-400 font-black">=</span>
                                  <span
                                    className={`px-3 py-1 rounded-lg font-black ${
                                      isDebtor
                                        ? 'bg-rose-600 text-white'
                                        : isCreditor
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-700 text-white'
                                    }`}
                                  >
                                    {isDebtor
                                      ? `بدهی راننده به شرکت: ${item.driverDebtToCompany.toLocaleString()} T`
                                      : isCreditor
                                      ? `طلب راننده از شرکت: ${item.companyDebtToDriver.toLocaleString()} T`
                                      : 'تسویه کامل (۰ تومان)'}
                                  </span>
                                </div>
                              </div>

                              {/* Two-Column Breakdown: Right = Completed Loads | Left = Prepayments & Settlements */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Column 1: Completed Loads (بارهای انجام‌شده توسط راننده) */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 overflow-hidden shadow-sm">
                                  <div className="bg-blue-600/10 dark:bg-blue-900/30 px-4 py-3 border-b border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Truck size={16} className="text-blue-600 dark:text-blue-400" />
                                      <h4 className="font-black text-blue-900 dark:text-blue-200 text-xs sm:text-sm">
                                        ۱. ریز بارهای انجام‌شده و کرایه‌ها ({item.completedLoads.length}{' '}
                                        سرویس)
                                      </h4>
                                    </div>
                                    <span
                                      className="font-mono font-black text-xs text-blue-700 dark:text-blue-300"
                                      dir="ltr"
                                    >
                                      جمع: {item.totalLoadsFreight.toLocaleString()} T
                                    </span>
                                  </div>

                                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {item.completedLoads.length > 0 ? (
                                      item.completedLoads.map(load => (
                                        <div
                                          key={load.id}
                                          className="p-3 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-between gap-2 text-xs"
                                        >
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px]">
                                                بارنامه: {load.billOfLading}
                                              </span>
                                              <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                                                {load.date}
                                              </span>
                                              {load.volume > 0 && (
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                  وزن: {load.volume.toLocaleString()} تن
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                              {load.description}
                                              {load.freightCurrency === 'USD' && load.freightRateUSD ? (
                                                <span className="mr-2 text-indigo-600 dark:text-indigo-400 font-mono">
                                                  (فی: ${load.freightRateUSD}/تن)
                                                </span>
                                              ) : load.freightCurrency === 'AED' && load.freightRateAED ? (
                                                <span className="mr-2 text-amber-600 dark:text-amber-400 font-mono">
                                                  (فی: {load.freightRateAED} درهم/تن)
                                                </span>
                                              ) : load.freightRate > 0 ? (
                                                <span className="mr-2 text-slate-400 font-mono">
                                                  (فی: {load.freightRate.toLocaleString()} ت/تن)
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                          <div
                                            className="font-mono font-black text-blue-700 dark:text-blue-400 text-xs whitespace-nowrap"
                                            dir="ltr"
                                          >
                                            + {load.amount.toLocaleString()} T
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="py-10 text-center text-slate-400 text-xs">
                                        هیچ بار انجام‌شده‌ای برای این راننده ثبت نشده است.
                                      </div>
                                    )}

                                    {/* Reimbursements if any */}
                                    {item.drReimbursements.map(reimb => (
                                      <div
                                        key={reimb.id}
                                        className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div>
                                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] ml-2">
                                            بازپرداخت هزینه به راننده
                                          </span>
                                          <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {reimb.title}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono mr-2">
                                            ({reimb.date})
                                          </span>
                                        </div>
                                        <div
                                          className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap"
                                          dir="ltr"
                                        >
                                          + {reimb.amount.toLocaleString()} T
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Column 2: Advance Payments / Prepayments & Settlements (ریز پیش‌پرداخت‌ها و تسویه‌ها) */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 overflow-hidden shadow-sm">
                                  <div className="bg-amber-500/10 dark:bg-amber-900/30 px-4 py-3 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Wallet size={16} className="text-amber-600 dark:text-amber-400" />
                                      <h4 className="font-black text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                                        ۲. ریز پیش‌پرداخت‌ها، تسویه‌ها و کسورات
                                      </h4>
                                    </div>
                                    <span
                                      className="font-mono font-black text-xs text-rose-600 dark:text-rose-400"
                                      dir="ltr"
                                    >
                                      جمع کسر/دریافتی: {item.totalDebits.toLocaleString()} T
                                    </span>
                                  </div>

                                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {/* Section A: Advance Payments / Prepayments */}
                                    {item.allAdvanceItems.map(adv => (
                                      <div
                                        key={adv.id}
                                        className="p-3 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-black text-[10px]">
                                              پیش‌پرداخت: {adv.categoryLabel}
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                                              {adv.date}
                                            </span>
                                            {adv.trackingCode && (
                                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                                رهگیری: {adv.trackingCode}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                            {adv.description}
                                          </div>
                                        </div>
                                        <div
                                          className="font-mono font-black text-amber-700 dark:text-amber-400 text-xs whitespace-nowrap"
                                          dir="ltr"
                                        >
                                          − {adv.amount.toLocaleString()} T
                                        </div>
                                      </div>
                                    ))}

                                    {/* Section B: Waybill Settlements */}
                                    {item.waybillPayments.map(wp => (
                                      <div
                                        key={wp.id}
                                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                                              {wp.categoryLabel}
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                                              {wp.date}
                                            </span>
                                            {wp.trackingCode && (
                                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                                رهگیری: {wp.trackingCode}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {wp.description}
                                          </div>
                                        </div>
                                        <div
                                          className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap"
                                          dir="ltr"
                                        >
                                          − {wp.amount.toLocaleString()} T
                                        </div>
                                      </div>
                                    ))}

                                    {/* Section C: Other Deductible Expenses */}
                                    {item.otherDeductibleExpenses.map(exp => (
                                      <div
                                        key={exp.id}
                                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                                              کسر هزینه: {exp.categoryLabel}
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                                              {exp.date}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {exp.description}
                                          </div>
                                        </div>
                                        <div
                                          className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap"
                                          dir="ltr"
                                        >
                                          − {exp.amount.toLocaleString()} T
                                        </div>
                                      </div>
                                    ))}

                                    {/* Section D: Standalone Previous Account (Independent of Current Waybill Balance) */}
                                    {item.standaloneExcludedPayments.map(sp => (
                                      <div
                                        key={sp.id}
                                        className="p-3 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                                              {sp.categoryLabel} (ثبت مستقل - بدون کسر از بارنامه جاری)
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                                              {sp.date}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {sp.description}
                                          </div>
                                        </div>
                                        <div
                                          className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs whitespace-nowrap"
                                          dir="ltr"
                                        >
                                          {sp.amount.toLocaleString()} T (مستقل)
                                        </div>
                                      </div>
                                    ))}

                                    {item.allAdvanceItems.length === 0 &&
                                      item.waybillPayments.length === 0 &&
                                      item.otherDeductibleExpenses.length === 0 &&
                                      item.standaloneExcludedPayments.length === 0 && (
                                        <div className="py-10 text-center text-slate-400 text-xs">
                                          هیچ پیش‌پرداخت یا فیش تسویه‌ای برای این راننده ثبت نشده است.
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredBreakdowns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                      هیچ راننده‌ای با فیلترهای انتخاب‌شده یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer Totals */}
              {filteredBreakdowns.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-black text-xs">
                  <tr>
                    <td className="px-4 py-4">
                      جمع کل ({filteredBreakdowns.length} راننده):
                    </td>
                    <td className="px-4 py-4 text-center font-mono">
                      {summaryStats.totalLoadsCount} بار |{' '}
                      {summaryStats.totalLoadsWeight.toLocaleString()} تن
                    </td>
                    <td className="px-4 py-4 text-blue-300 font-mono" dir="ltr">
                      {summaryStats.totalLoadsFreight.toLocaleString()} T
                    </td>
                    <td className="px-4 py-4 text-amber-300 font-mono" dir="ltr">
                      {summaryStats.totalAdvances.toLocaleString()} T
                    </td>
                    <td className="px-4 py-4 text-slate-300 font-mono" dir="ltr">
                      {(
                        summaryStats.totalWaybillPayments + summaryStats.totalOtherDeductions
                      ).toLocaleString()}{' '}
                      T
                    </td>
                    <td className="px-4 py-4 text-purple-300 font-mono" dir="ltr">
                      {summaryStats.totalStandaloneExcluded.toLocaleString()} T
                    </td>
                    <td className="px-4 py-4" colSpan={2}>
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="text-rose-400">
                          جمع بدهی رانندگان به شرکت:{' '}
                          {summaryStats.totalDriverDebtToCompany.toLocaleString()} T
                        </span>
                        <span className="text-emerald-400">
                          جمع طلب رانندگان از شرکت:{' '}
                          {summaryStats.totalCompanyDebtToDriver.toLocaleString()} T
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDebtBreakdownReport;
