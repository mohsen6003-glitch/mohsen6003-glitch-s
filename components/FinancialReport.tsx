import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { 
  FileText, 
  Filter, 
  Printer, 
  Download, 
  Share2, 
  Settings, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Fuel, 
  Truck, 
  Building2, 
  Receipt, 
  Landmark, 
  Archive, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Trash2, 
  Eye, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Layers
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

import { 
  getPersianDateInfo, 
  isItemInPersianMonth, 
  getCurrentPersianYearAndMonth, 
  getPreviousPersianYearAndMonth, 
  PERSIAN_MONTH_NAMES 
} from '../utils/dateUtils';
import { 
  MonthlyReportPdfTemplate, 
  MonthlyReportData 
} from './MonthlyReportPdfTemplate';
import { 
  MonthlyReportShareModal 
} from './MonthlyReportShareModal';
import { 
  MonthlyReportSettingsModal, 
  MonthlyReportSettings 
} from './MonthlyReportSettingsModal';

type MainViewTab = 'monthly_statement' | 'detailed_transactions' | 'reports_archive';
type DetailedReportType = 'sales' | 'freights' | 'driver_ledger' | 'company_purchases' | 'expenses' | 'exchange';
type DateRange = 'all' | 'today' | 'week' | 'month';

interface ArchivedReportItem {
  id: string;
  year: number;
  month: number;
  monthName: string;
  reportCode: string;
  createdAt: string;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  salesVolume: number;
}

const SETTINGS_STORAGE_KEY = 'gas_app_monthly_report_settings';
const ARCHIVE_STORAGE_KEY = 'gas_app_monthly_reports_archive';

const DEFAULT_SETTINGS: MonthlyReportSettings = {
  autoGenerateEnabled: true,
  scheduleDay: 1,
  autoNotifyEmail: true,
  defaultEmail: 'accountant@gasexport.com',
  autoNotifyWhatsapp: true,
  defaultWhatsapp: '09120000000',
  companyName: 'سیستم جامع مدیریت صادرات گاز',
  includeDetailedTransactions: true
};

const FinancialReport: React.FC = () => {
  const { 
    drivers, 
    transactions, 
    driverPayments, 
    driverSettlements,
    driverVehicleExpenses,
    freights, 
    companies, 
    purchases, 
    expenses,
    exchangeTransactions,
    getDriverName,
    getCompanyName
  } = useData();

  // Current Active Main View
  const [activeMainTab, setActiveMainTab] = useState<MainViewTab>('monthly_statement');
  const [chartDriverFilter, setChartDriverFilter] = useState<string>('ALL');
  const [showOnlyActiveMonths, setShowOnlyActiveMonths] = useState<boolean>(false);

  // Month & Year Selection for Monthly Report
  const currentPersian = useMemo(() => getCurrentPersianYearAndMonth(), []);
  const [selectedYear, setSelectedYear] = useState<number>(currentPersian.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentPersian.month);

  // Sub tab inside monthly statement view
  const [monthlySubTab, setMonthlySubTab] = useState<'summary' | 'sales' | 'purchases' | 'expenses' | 'exchange'>('summary');

  // Modals & Exporting State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Settings & Archive State from LocalStorage
  const [reportSettings, setReportSettings] = useState<MonthlyReportSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [archivedReports, setArchivedReports] = useState<ArchivedReportItem[]>(() => {
    try {
      const saved = localStorage.getItem(ARCHIVE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save Settings handler
  const handleSaveSettings = (newSettings: MonthlyReportSettings) => {
    setReportSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  };

  // Detailed Transaction View Filters
  const [detailedType, setDetailedType] = useState<DetailedReportType>('sales');
  const [detailedDateFilter, setDetailedDateFilter] = useState<DateRange>('month');
  const [detailedSearchTerm, setDetailedSearchTerm] = useState('');

  // 1. Calculate Monthly Financial Report Data for the selected Persian Month
  const monthlyReportData = useMemo<MonthlyReportData>(() => {
    const monthName = PERSIAN_MONTH_NAMES[selectedMonth - 1] || `ماه ${selectedMonth}`;
    const reportCode = `GER-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${(Math.abs(selectedYear * 31 + selectedMonth * 79) % 9000 + 1000)}`;
    const todayPersian = getPersianDateInfo(Date.now());

    // Filter transactions in this Persian month
    const mTransactions = transactions.filter(t => isItemInPersianMonth(t, selectedYear, selectedMonth)).map(t => ({
      ...t,
      driverName: getDriverName(t.driverId)
    }));

    const totalSalesVolume = mTransactions.reduce((acc, t) => acc + (t.volume || 0), 0);
    const totalSalesIncome = mTransactions.reduce((acc, t) => acc + (t.totalPrice || 0), 0);
    const salesCount = mTransactions.length;

    // Filter purchases in this Persian month
    const mPurchases = purchases.filter(p => isItemInPersianMonth(p, selectedYear, selectedMonth)).map(p => ({
      ...p,
      companyName: getCompanyName(p.companyId)
    }));
    const totalPurchaseVolume = mPurchases.reduce((acc, p) => acc + (p.volume || 0), 0);
    const totalPurchaseCost = mPurchases.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
    const purchasesCount = mPurchases.length;

    // Filter freights in this Persian month + freight price attached to sales
    const mFreights = freights.filter(f => isItemInPersianMonth(f, selectedYear, selectedMonth));
    const transFreightsCost = mTransactions.reduce((acc, t) => acc + (t.freightPrice || 0), 0);
    const directFreightsCost = mFreights.reduce((acc, f) => acc + (f.amount || 0), 0);
    const totalFreightsCost = directFreightsCost + transFreightsCost;
    const freightCount = mFreights.length + mTransactions.filter(t => (t.freightPrice || 0) > 0).length;

    // Filter expenses in this Persian month
    const mExpenses = expenses.filter(e => isItemInPersianMonth(e, selectedYear, selectedMonth));
    const totalExpensesCost = mExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Group expenses by category
    const expCategoryMap: Record<string, { amount: number; count: number }> = {};
    mExpenses.forEach(e => {
      const cat = e.category || 'سایر هزینه‌ها';
      if (!expCategoryMap[cat]) expCategoryMap[cat] = { amount: 0, count: 0 };
      expCategoryMap[cat].amount += e.amount;
      expCategoryMap[cat].count += 1;
    });
    const expensesByCategory = Object.entries(expCategoryMap).map(([category, val]) => ({
      category,
      amount: val.amount,
      count: val.count
    })).sort((a, b) => b.amount - a.amount);

    // Filter exchange transactions in this Persian month
    const mExchange = exchangeTransactions.filter(et => isItemInPersianMonth(et, selectedYear, selectedMonth));
    const totalExchangeToman = mExchange.reduce((acc, et) => acc + (et.amountToman || 0), 0);
    const totalExchangeAed = mExchange.reduce((acc, et) => acc + (et.aedAmount || 0), 0);

    // Profit Calculations
    const grossProfit = totalSalesIncome - totalPurchaseCost;
    const netProfit = totalSalesIncome - totalPurchaseCost - totalFreightsCost - totalExpensesCost;
    const netMarginPercentage = totalSalesIncome > 0 ? (netProfit / totalSalesIncome) * 100 : 0;
    const profitPerTon = totalSalesVolume > 0 ? Math.round(netProfit / totalSalesVolume) : 0;

    return {
      year: selectedYear,
      month: selectedMonth,
      monthName,
      reportCode,
      generatedDate: todayPersian.formatted,
      transactions: mTransactions,
      totalSalesVolume,
      totalSalesIncome,
      salesCount,
      purchases: mPurchases,
      totalPurchaseVolume,
      totalPurchaseCost,
      purchasesCount,
      freights: mFreights,
      totalFreightsCost,
      freightCount,
      expenses: mExpenses,
      totalExpensesCost,
      expensesByCategory,
      exchangeTransactions: mExchange,
      totalExchangeToman,
      totalExchangeAed,
      grossProfit,
      netProfit,
      netMarginPercentage,
      profitPerTon
    };
  }, [selectedYear, selectedMonth, transactions, purchases, freights, expenses, exchangeTransactions, getDriverName, getCompanyName]);

  // Previous Month data for comparison
  const previousMonthData = useMemo(() => {
    const prev = getPreviousPersianYearAndMonth(selectedYear, selectedMonth);
    const prevTransactions = transactions.filter(t => isItemInPersianMonth(t, prev.year, prev.month));
    const prevSalesIncome = prevTransactions.reduce((acc, t) => acc + (t.totalPrice || 0), 0);
    const prevPurchases = purchases.filter(p => isItemInPersianMonth(p, prev.year, prev.month));
    const prevPurchaseCost = prevPurchases.reduce((acc, p) => acc + (p.totalPrice || 0), 0);
    const prevFreights = freights.filter(f => isItemInPersianMonth(f, prev.year, prev.month)).reduce((acc, f) => acc + f.amount, 0) + prevTransactions.reduce((acc, t) => acc + (t.freightPrice || 0), 0);
    const prevExpenses = expenses.filter(e => isItemInPersianMonth(e, prev.year, prev.month)).reduce((acc, e) => acc + e.amount, 0);
    const prevNetProfit = prevSalesIncome - prevPurchaseCost - prevFreights - prevExpenses;

    const incomeGrowth = prevSalesIncome > 0 ? ((monthlyReportData.totalSalesIncome - prevSalesIncome) / prevSalesIncome) * 100 : 0;
    const profitGrowth = prevNetProfit !== 0 ? ((monthlyReportData.netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;

    return {
      prevMonthName: prev.monthName,
      prevSalesIncome,
      prevNetProfit,
      incomeGrowth,
      profitGrowth
    };
  }, [selectedYear, selectedMonth, transactions, purchases, freights, expenses, monthlyReportData.totalSalesIncome, monthlyReportData.netProfit]);

  // Auto PDF Generation & Save to Archive
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setExportSuccessMessage(null);
    try {
      const element = document.getElementById('monthly-financial-report-pdf-canvas');
      if (!element) {
        throw new Error('المان قالب PDF یافت نشد.');
      }

      // Capture at scale 2 for crystal clear Persian text
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `گزارش_مالی_${monthlyReportData.monthName}_${monthlyReportData.year}.pdf`;
      pdf.save(fileName);

      // Auto archive record in state & localStorage
      const newArchiveItem: ArchivedReportItem = {
        id: Date.now().toString(),
        year: monthlyReportData.year,
        month: monthlyReportData.month,
        monthName: monthlyReportData.monthName,
        reportCode: monthlyReportData.reportCode,
        createdAt: new Date().toLocaleDateString('fa-IR'),
        totalSales: monthlyReportData.totalSalesIncome,
        totalExpenses: monthlyReportData.totalPurchaseCost + monthlyReportData.totalFreightsCost + monthlyReportData.totalExpensesCost,
        netProfit: monthlyReportData.netProfit,
        salesVolume: monthlyReportData.totalSalesVolume
      };

      setArchivedReports(prev => {
        // filter duplicate of same month/year
        const filtered = prev.filter(a => !(a.year === newArchiveItem.year && a.month === newArchiveItem.month));
        const updated = [newArchiveItem, ...filtered];
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      setExportSuccessMessage(`فایل PDF گزارش ${monthlyReportData.monthName} ${monthlyReportData.year} با موفقیت تولید و دانلود شد.`);
      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('خطا در ایجاد فایل PDF. لطفا مجددا تلاش کنید.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDeleteArchive = (id: string) => {
    if (window.confirm('آیا از حذف این گزارش از آرشیو اطمینان دارید؟')) {
      setArchivedReports(prev => {
        const updated = prev.filter(r => r.id !== id);
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Switch to specific archived month
  const handleLoadArchiveMonth = (item: ArchivedReportItem) => {
    setSelectedYear(item.year);
    setSelectedMonth(item.month);
    setActiveMainTab('monthly_statement');
  };

  // Visual Chart Data
  const financialCompositionData = useMemo(() => {
    return [
      { name: 'فروش گاز (درآمد)', value: monthlyReportData.totalSalesIncome, color: '#10b981' },
      { name: 'خرید گاز (بها)', value: monthlyReportData.totalPurchaseCost, color: '#f59e0b' },
      { name: 'کرایه حمل', value: monthlyReportData.totalFreightsCost, color: '#ef4444' },
      { name: 'هزینه‌های جاری', value: monthlyReportData.totalExpensesCost, color: '#ec4899' },
    ].filter(item => item.value > 0);
  }, [monthlyReportData]);

  const pnlBarData = useMemo(() => {
    return [
      {
        name: monthlyReportData.monthName,
        'درآمد کل': monthlyReportData.totalSalesIncome,
        'مجموع هزینه‌ها': monthlyReportData.totalPurchaseCost + monthlyReportData.totalFreightsCost + monthlyReportData.totalExpensesCost,
        'سود خالص': Math.max(0, monthlyReportData.netProfit)
      }
    ];
  }, [monthlyReportData]);

  // Monthly Driver Earnings (Receivables) vs Payments (Disbursements) Comparison for Selected Year
  const driverMonthlyChartData = useMemo(() => {
    const monthsData = PERSIAN_MONTH_NAMES.map((monthName, idx) => {
      const mNumber = idx + 1;

      // 1. Driver Freight Earnings / Receivables in this month (طلب/کارکرد بار رانندگان)
      const mTrans = transactions.filter(
        t =>
          isItemInPersianMonth(t, selectedYear, mNumber) &&
          (chartDriverFilter === 'ALL' || t.driverId === chartDriverFilter)
      );
      const mFrts = freights.filter(
        f =>
          isItemInPersianMonth(f, selectedYear, mNumber) &&
          (chartDriverFilter === 'ALL' || f.driverId === chartDriverFilter)
      );
      const mReimbursements = (driverVehicleExpenses || []).filter(
        e =>
          isItemInPersianMonth(e, selectedYear, mNumber) &&
          e.impactOnBalance === 'REIMBURSE_TO_DRIVER' &&
          (chartDriverFilter === 'ALL' || e.driverId === chartDriverFilter)
      );

      const transFreightSum = mTrans.reduce((sum, t) => sum + (t.freightPrice || 0), 0);
      const directFreightSum = mFrts.reduce((sum, f) => sum + (f.amount || 0), 0);
      const reimbSum = mReimbursements.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalEarned = transFreightSum + directFreightSum + reimbSum;
      const loadsCount = mTrans.filter(t => (t.freightPrice || 0) > 0).length + mFrts.length;

      // 2. Payments to Drivers / Driver Cash Received in this month (پرداختی به رانندگان / دریافتی رانندگان)
      const mPayments = driverPayments.filter(
        p =>
          isItemInPersianMonth(p, selectedYear, mNumber) &&
          (chartDriverFilter === 'ALL' || p.driverId === chartDriverFilter)
      );
      const mDeductions = (driverVehicleExpenses || []).filter(
        e =>
          isItemInPersianMonth(e, selectedYear, mNumber) &&
          e.impactOnBalance === 'DEDUCT_FROM_DRIVER' &&
          (chartDriverFilter === 'ALL' || e.driverId === chartDriverFilter)
      );

      const waybillPaidSum = mPayments
        .filter(p => !p.isStandaloneDeposit && (!p.paymentCategory || p.paymentCategory === 'WAYBILL'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const advanceAndStandaloneSum = mPayments
        .filter(p => p.isStandaloneDeposit || (p.paymentCategory && p.paymentCategory !== 'WAYBILL'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const deductionsSum = mDeductions.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPaid = waybillPaidSum + advanceAndStandaloneSum + deductionsSum;

      return {
        monthNumber: mNumber,
        monthName,
        earned: totalEarned,
        paid: totalPaid,
        waybillPaid: waybillPaidSum,
        advancePaid: advanceAndStandaloneSum + deductionsSum,
        balance: totalEarned - totalPaid,
        loadsCount,
        paymentsCount: mPayments.length + mDeductions.length
      };
    });

    if (showOnlyActiveMonths) {
      const active = monthsData.filter(m => m.earned > 0 || m.paid > 0);
      return active.length > 0 ? active : monthsData;
    }
    return monthsData;
  }, [
    selectedYear,
    chartDriverFilter,
    showOnlyActiveMonths,
    transactions,
    freights,
    driverPayments,
    driverVehicleExpenses
  ]);

  const driverYearlyTotals = useMemo(() => {
    return driverMonthlyChartData.reduce(
      (acc, cur) => {
        acc.totalEarned += cur.earned;
        acc.totalPaid += cur.paid;
        acc.totalWaybillPaid += cur.waybillPaid;
        acc.totalAdvancePaid += cur.advancePaid;
        acc.totalLoads += cur.loadsCount;
        acc.totalPaymentsCount += cur.paymentsCount;
        return acc;
      },
      {
        totalEarned: 0,
        totalPaid: 0,
        totalWaybillPaid: 0,
        totalAdvancePaid: 0,
        totalLoads: 0,
        totalPaymentsCount: 0
      }
    );
  }, [driverMonthlyChartData]);

  // Detailed Transaction View Data
  const detailedReportData = useMemo(() => {
    let data: any[] = [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const isWithinRange = (id: string) => {
      if (detailedDateFilter === 'all') return true;
      const ts = parseInt(id, 10);
      if (isNaN(ts)) return false;
      if (detailedDateFilter === 'today') return ts >= startOfDay;
      if (detailedDateFilter === 'week') return ts >= startOfWeek;
      if (detailedDateFilter === 'month') return ts >= startOfMonth;
      return true;
    };

    switch (detailedType) {
      case 'sales':
        data = transactions.filter(t => isWithinRange(t.id)).map(t => ({
          ...t,
          type: 'sale',
          entityName: getDriverName(t.driverId),
          amount: t.totalPrice,
          desc: `بارنامه: ${t.billOfLading || '-'} | حجم: ${t.volume} تن | ${t.description || ''}`
        }));
        break;
      case 'company_purchases':
        data = purchases.filter(p => isWithinRange(p.id)).map(p => ({
          ...p,
          type: 'purchase',
          entityName: getCompanyName(p.companyId),
          amount: p.totalPrice,
          desc: `حجم: ${p.volume} تن | فی: ${p.price?.toLocaleString()} | ${p.description || ''}`
        }));
        break;
      case 'freights':
        data = freights.filter(f => isWithinRange(f.id)).map(f => ({
          ...f,
          type: 'freight',
          entityName: getDriverName(f.driverId),
          amount: f.amount,
          desc: `مسیر: ${f.origin} به ${f.destination} ${f.trackingCode ? `[کد: ${f.trackingCode}]` : ''} | ${f.description || ''}`
        }));
        break;
      case 'expenses':
        data = expenses.filter(e => isWithinRange(e.id)).map(e => ({
          ...e,
          type: 'expense',
          entityName: e.category,
          amount: e.amount,
          desc: `${e.title} - ${e.description || ''}`
        }));
        break;
      case 'exchange':
        data = exchangeTransactions.filter(et => isWithinRange(et.id)).map(et => ({
          ...et,
          type: 'exchange',
          entityName: et.receiverName || 'حواله صرافی',
          amount: et.amountToman,
          desc: `معادل: ${et.aedAmount?.toLocaleString()} AED | نرخ: ${et.aedRate?.toLocaleString()} | وضعیت: ${et.status || 'تکمیل'}`
        }));
        break;
      case 'driver_ledger':
        const dTrans = transactions.filter(t => isWithinRange(t.id)).map(t => ({
          id: t.id,
          date: t.date,
          entityName: getDriverName(t.driverId),
          amount: t.freightPrice || 0,
          type: 'credit',
          desc: `کرایه حمل گاز (بارنامه ${t.billOfLading || '-'})`
        }));
        const dPays = driverPayments.filter(p => isWithinRange(p.id)).map(p => ({
          id: p.id,
          date: p.date,
          entityName: getDriverName(p.driverId),
          amount: p.amount,
          type: 'debit',
          desc: `پرداخت وجه / تسویه - ${p.description || ''}`
        }));
        const dFrt = freights.filter(f => isWithinRange(f.id)).map(f => ({
          id: f.id,
          date: f.date,
          entityName: getDriverName(f.driverId),
          amount: f.amount,
          type: 'credit',
          desc: `کرایه حمل (${f.origin} به ${f.destination})`
        }));
        data = [...dTrans, ...dPays, ...dFrt].sort((a, b) => parseInt(b.id || '0', 10) - parseInt(a.id || '0', 10));
        break;
      default:
        data = [];
    }

    if (detailedSearchTerm.trim()) {
      const term = detailedSearchTerm.toLowerCase();
      data = data.filter(item => 
        (item.entityName || '').toLowerCase().includes(term) ||
        (item.desc || '').toLowerCase().includes(term) ||
        (item.date || '').includes(term)
      );
    }

    const totalIn = data.filter(d => d.type === 'sale' || d.type === 'credit').reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalOut = data.filter(d => d.type === 'expense' || d.type === 'purchase' || d.type === 'debit' || d.type === 'freight' || d.type === 'exchange').reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      items: data,
      totalIn,
      totalOut,
      count: data.length
    };
  }, [detailedType, detailedDateFilter, detailedSearchTerm, transactions, purchases, freights, expenses, exchangeTransactions, driverPayments, getDriverName, getCompanyName]);

  return (
    <div className="space-y-6 pb-24 optimize-render">
      {/* Hidden Off-Screen PDF Template Container */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <MonthlyReportPdfTemplate data={monthlyReportData} />
      </div>

      {/* Share & Send Modal */}
      <MonthlyReportShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        reportData={monthlyReportData}
        onDownloadPdf={handleDownloadPdf}
        isExportingPdf={isExportingPdf}
      />

      {/* Auto-Generation Settings Modal */}
      <MonthlyReportSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={reportSettings}
      />

      {/* Notification Toast for PDF Export */}
      {exportSuccessMessage && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300 print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 size={20} />
            <span>{exportSuccessMessage}</span>
          </div>
          <button onClick={() => setExportSuccessMessage(null)} className="text-white/80 hover:text-white text-xs font-bold">
            بستن
          </button>
        </div>
      )}

      {/* Main Mode Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveMainTab('monthly_statement')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
              activeMainTab === 'monthly_statement'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 size={16} />
            صورت سود و زیان و گزارش ماهانه
          </button>

          <button
            onClick={() => setActiveMainTab('detailed_transactions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
              activeMainTab === 'detailed_transactions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers size={16} />
            ریز تراکنش‌ها و اسناد تفصیلی
          </button>

          <button
            onClick={() => setActiveMainTab('reports_archive')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
              activeMainTab === 'reports_archive'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive size={16} />
            آرشیو گزارش‌های ماهانه ({archivedReports.length})
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
            title="تنظیمات ارسال خودکار"
          >
            <Settings size={15} />
            تنظیمات ارسال خودکار
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MONTHLY FINANCIAL STATEMENT & AUTOMATIC PDF GENERATOR */}
      {/* ========================================================================= */}
      {activeMainTab === 'monthly_statement' && (
        <div className="space-y-6">
          {/* Month Selector & Generator Control Header */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 print:hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Title & Month Pickers */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                  <Calendar size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    تولید خودکار صورت وضعیت مالی ماهانه
                    <span className="text-xs px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                      {monthlyReportData.monthName} {selectedYear}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تحلیل اتوماتیک درآمدها، بهای خرید، کرایه‌ها، هزینه‌های جاری و سود خالص
                  </p>
                </div>
              </div>

              {/* Year & Month Pickers & Quick Generators */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Year Select */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1402}>سال ۱۴۰۲</option>
                  <option value={1403}>سال ۱۴۰۳</option>
                  <option value={1404}>سال ۱۴۰۴</option>
                  <option value={1405}>سال ۱۴۰۵</option>
                </select>

                {/* Month Select */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PERSIAN_MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Quick Switch to Current Month */}
                <button
                  onClick={() => {
                    setSelectedYear(currentPersian.year);
                    setSelectedMonth(currentPersian.month);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedYear === currentPersian.year && selectedMonth === currentPersian.month
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <Clock size={14} />
                  ماه جاری
                </button>

                {/* PDF and Share Actions */}
                <div className="flex items-center gap-2 mr-auto lg:mr-2">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-red-500/20 active:scale-95 disabled:opacity-50"
                  >
                    <Download size={16} />
                    {isExportingPdf ? 'در حال تولید PDF...' : 'دانلود فایل PDF'}
                  </button>

                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                  >
                    <Share2 size={16} />
                    ارسال و اشتراک‌گذاری
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                    title="چاپ"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Key KPI Metric Cards for the Selected Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Revenue */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Fuel size={16} /> درآمد کل فروش گاز
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold rounded-full">
                  {monthlyReportData.salesCount} بارنامه
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1" dir="ltr">
                {monthlyReportData.totalSalesIncome.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-500 mt-2">
                <span>تناژ: {monthlyReportData.totalSalesVolume.toFixed(2)} تن</span>
                {previousMonthData.incomeGrowth !== 0 && (
                  <span className="flex items-center gap-0.5 font-bold" dir="ltr">
                    {previousMonthData.incomeGrowth > 0 ? '+' : ''}{previousMonthData.incomeGrowth.toFixed(1)}% نسبت به ماه قبل
                  </span>
                )}
              </div>
            </div>

            {/* Gas Purchases (Cost) */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Building2 size={16} /> بهای خرید گاز
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold rounded-full">
                  {monthlyReportData.purchasesCount} پارت
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1" dir="ltr">
                {monthlyReportData.totalPurchaseCost.toLocaleString()}
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-500 mt-2">
                تناژ خریداری شده: {monthlyReportData.totalPurchaseVolume.toFixed(2)} تن
              </div>
            </div>

            {/* Freights & Operational Costs */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <Receipt size={16} /> کرایه‌ها و هزینه‌های جاری
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold rounded-full">
                  {monthlyReportData.expenses.length} فقره هزینه
                </span>
              </div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1" dir="ltr">
                {(monthlyReportData.totalFreightsCost + monthlyReportData.totalExpensesCost).toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-500 mt-2">
                <span>کرایه: {monthlyReportData.totalFreightsCost.toLocaleString()} T</span>
                <span>جاری: {monthlyReportData.totalExpensesCost.toLocaleString()} T</span>
              </div>
            </div>

            {/* Net Operational Profit */}
            <div className={`border rounded-2xl p-5 shadow-sm relative overflow-hidden ${
              monthlyReportData.netProfit >= 0
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-500" /> سود خالص عملیاتی
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold rounded-full">
                  حاشیه: {monthlyReportData.netMarginPercentage.toFixed(1)}%
                </span>
              </div>
              <div className={`text-2xl font-black mt-1 ${monthlyReportData.netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`} dir="ltr">
                {monthlyReportData.netProfit.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                <span>سود هر تن: {monthlyReportData.profitPerTon.toLocaleString()} T</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {monthlyReportData.netProfit >= 0 ? 'سودده' : 'زیان‌ده'}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Analytics & Summary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* P&L Statement Summary Card */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  صورت سود و زیان تجمیعی ({monthlyReportData.monthName} {monthlyReportData.year})
                </h3>
                <span className="text-xs text-slate-400 font-mono">کد سند: {monthlyReportData.reportCode}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">۱. درآمد ناخالص فروش گاز</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">
                    +{monthlyReportData.totalSalesIncome.toLocaleString()} تومان
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-xs text-slate-600 dark:text-slate-400">۲. بهای تمام‌شده خرید گاز از شرکت‌ها</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm" dir="ltr">
                    -{monthlyReportData.totalPurchaseCost.toLocaleString()} تومان
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/40">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">سود ناخالص عملیاتی (فروش - خرید)</span>
                  <span className="font-mono font-black text-amber-800 dark:text-amber-300 text-sm" dir="ltr">
                    {monthlyReportData.grossProfit.toLocaleString()} تومان
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-xs text-slate-600 dark:text-slate-400">۳. هزینه‌های کرایه و حمل‌ونقل رانندگان</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm" dir="ltr">
                    -{monthlyReportData.totalFreightsCost.toLocaleString()} تومان
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-xs text-slate-600 dark:text-slate-400">۴. هزینه‌های عمومی و جاری ایستگاه</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm" dir="ltr">
                    -{monthlyReportData.totalExpensesCost.toLocaleString()} تومان
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border-2 border-blue-500/30 dark:border-blue-500/30">
                  <div>
                    <span className="text-sm font-black text-blue-900 dark:text-blue-200 block">
                      ★ سود خالص نهایی دوره ({monthlyReportData.monthName})
                    </span>
                    <span className="text-[10px] text-blue-700 dark:text-blue-400">
                      حاشیه سود خالص: {monthlyReportData.netMarginPercentage.toFixed(1)}% | سود هر تن: {monthlyReportData.profitPerTon.toLocaleString()} تومان
                    </span>
                  </div>
                  <span className="font-mono font-black text-lg text-blue-700 dark:text-blue-300" dir="ltr">
                    {monthlyReportData.netProfit.toLocaleString()} تومان
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Pie & Composition Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-2 flex items-center gap-2">
                  <PieChartIcon size={18} className="text-indigo-600" />
                  ترکیب مالی و هزینه‌ها
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  سهم سرفصل‌های درآمد و هزینه در ماه {monthlyReportData.monthName}
                </p>
              </div>

              {financialCompositionData.length > 0 ? (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialCompositionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {financialCompositionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`${Number(val).toLocaleString()} تومان`, '']}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  داده‌ای برای ترسیم نمودار وجود ندارد
                </div>
              )}

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {financialCompositionData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {item.value.toLocaleString()} T
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Driver Receivables vs Payments Bar Chart (Recharts) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <span>نمودار میله‌ای مقایسه ماهانه دریافتی (کارکرد بار) و پرداختی رانندگان</span>
                    <span className="text-xs px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full font-bold border border-indigo-200 dark:border-indigo-800">
                      سال {selectedYear}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مقایسه ماه‌به‌ماه مجموع کرایه بارهای انجام‌شده رانندگان در برابر کل مبالغ پرداختی (تسویه بارنامه + پیش‌پرداخت و واریزی جدا)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {/* Driver Filter */}
                <select
                  value={chartDriverFilter}
                  onChange={e => setChartDriverFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">همه رانندگان ({drivers.length} راننده)</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.plateNumber})
                    </option>
                  ))}
                </select>

                {/* Active Months Toggle */}
                <button
                  onClick={() => setShowOnlyActiveMonths(prev => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    showOnlyActiveMonths
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {showOnlyActiveMonths ? 'نمایش همه ۱۲ ماه' : 'فقط ماه‌های دارای تراکنش'}
                </button>
              </div>
            </div>

            {/* Yearly Summary Strip above BarChart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60">
                <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center justify-between">
                  <span>کل کارکرد / طلب بار رانندگان ({selectedYear})</span>
                  <Truck size={15} className="text-blue-600" />
                </div>
                <div className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono mt-1" dir="ltr">
                  {driverYearlyTotals.totalEarned.toLocaleString()} T
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-bold">
                  از مجموع {driverYearlyTotals.totalLoads} سرویس حمل بار
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>کل پرداختی به رانندگان ({selectedYear})</span>
                  <DollarSign size={15} className="text-emerald-600" />
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1" dir="ltr">
                  {driverYearlyTotals.totalPaid.toLocaleString()} T
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                  طی {driverYearlyTotals.totalPaymentsCount} فیش واریزی و کسر حساب
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60">
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>سهم پیش‌پرداخت و واریزی جدا از بارنامه</span>
                  <Receipt size={15} className="text-amber-600" />
                </div>
                <div className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono mt-1" dir="ltr">
                  {driverYearlyTotals.totalAdvancePaid.toLocaleString()} T
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold">
                  تسویه مستقیم بارنامه: {driverYearlyTotals.totalWaybillPaid.toLocaleString()} T
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  driverYearlyTotals.totalEarned - driverYearlyTotals.totalPaid >= 0
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/60'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/60'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>تراز خالص سالانه رانندگان</span>
                  <TrendingUp size={15} className="text-indigo-600" />
                </div>
                <div
                  className={`text-lg font-black font-mono mt-1 ${
                    driverYearlyTotals.totalEarned - driverYearlyTotals.totalPaid >= 0
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                  dir="ltr"
                >
                  {Math.abs(driverYearlyTotals.totalEarned - driverYearlyTotals.totalPaid).toLocaleString()} T
                </div>
                <div className="text-[10px] font-bold mt-0.5 text-slate-500 dark:text-slate-400">
                  {driverYearlyTotals.totalEarned - driverYearlyTotals.totalPaid > 0
                    ? 'مانده طلب رانندگان بابت بارها'
                    : driverYearlyTotals.totalEarned - driverYearlyTotals.totalPaid < 0
                    ? 'بدهی رانندگان به شرکت (پیش‌پرداخت مازاد)'
                    : 'تسویه کامل در این سال'}
                </div>
              </div>
            </div>

            {/* Recharts BarChart Container */}
            <div className="h-80 w-full mt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={driverMonthlyChartData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 10 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedMonth = state.activePayload[0].payload?.monthNumber;
                      if (clickedMonth) {
                        setSelectedMonth(clickedMonth);
                      }
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                  <XAxis
                    dataKey="monthName"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    width={85}
                    tickFormatter={(val: number) => Number(val || 0).toLocaleString('en-US')}
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const rowData = payload[0].payload;
                      return (
                        <div
                          className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[230px]"
                          dir="rtl"
                        >
                          <div className="font-black text-sm border-b border-slate-700 pb-1.5 flex items-center justify-between">
                            <span>ماه {label} {selectedYear}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {rowData.loadsCount} بار | {rowData.paymentsCount} پرداخت
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-blue-300 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                              کارکرد / کرایه بار:
                            </span>
                            <span className="font-mono font-black text-blue-300" dir="ltr">
                              {Number(rowData.earned || 0).toLocaleString()} T
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                              کل پرداختی به راننده:
                            </span>
                            <span className="font-mono font-black text-emerald-300" dir="ltr">
                              {Number(rowData.paid || 0).toLocaleString()} T
                            </span>
                          </div>
                          {(rowData.waybillPaid > 0 || rowData.advancePaid > 0) && (
                            <div className="pr-4 text-[11px] text-slate-300 space-y-1 border-r-2 border-slate-700">
                              <div className="flex justify-between">
                                <span>• تسویه بارنامه:</span>
                                <span className="font-mono" dir="ltr">
                                  {Number(rowData.waybillPaid || 0).toLocaleString()} T
                                </span>
                              </div>
                              <div className="flex justify-between text-amber-300">
                                <span>• پیش‌پرداخت / واریزی جدا:</span>
                                <span className="font-mono" dir="ltr">
                                  {Number(rowData.advancePaid || 0).toLocaleString()} T
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="pt-1.5 border-t border-slate-700 flex items-center justify-between font-black">
                            <span>تراز این ماه:</span>
                            <span
                              className={`font-mono ${
                                rowData.balance >= 0 ? 'text-indigo-300' : 'text-rose-400'
                              }`}
                              dir="ltr"
                            >
                              {rowData.balance >= 0 ? '+' : ''}
                              {Number(rowData.balance || 0).toLocaleString()} T
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '10px' }}
                  />
                  <Bar
                    dataKey="earned"
                    name="کارکرد و کرایه بار رانندگان (طلب)"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="paid"
                    name="پرداختی به رانندگان (دریافتی نقدی و پیش‌پرداخت)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-sections tabs for Detailed Breakdown of this month */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Sub Tabs Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ریز اسناد ماه:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setMonthlySubTab('summary')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthlySubTab === 'summary' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    هزینه‌های جاری ({monthlyReportData.expenses.length})
                  </button>
                  <button
                    onClick={() => setMonthlySubTab('sales')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthlySubTab === 'sales' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    فروش گاز ({monthlyReportData.transactions.length})
                  </button>
                  <button
                    onClick={() => setMonthlySubTab('purchases')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthlySubTab === 'purchases' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    خرید از شرکت‌ها ({monthlyReportData.purchases.length})
                  </button>
                  <button
                    onClick={() => setMonthlySubTab('exchange')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      monthlySubTab === 'exchange' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    صرافی و ارزی ({monthlyReportData.exchangeTransactions.length})
                  </button>
                </div>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                دوره: {monthlyReportData.monthName} {monthlyReportData.year}
              </span>
            </div>

            {/* Sub Tab Contents */}
            <div className="p-4 overflow-x-auto">
              {/* 1. Expenses Table */}
              {monthlySubTab === 'summary' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">عنوان هزینه</th>
                      <th className="p-3">دسته‌بندی</th>
                      <th className="p-3">مبلغ (تومان)</th>
                      <th className="p-3">توضیحات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyReportData.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">هیچ هزینه‌ای در این ماه ثبت نشده است.</td>
                      </tr>
                    ) : (
                      monthlyReportData.expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500" dir="ltr">{e.date || '-'}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{e.title}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">{e.category}</span></td>
                          <td className="p-3 font-bold text-rose-600 dark:text-rose-400 font-mono" dir="ltr">{e.amount.toLocaleString()}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{e.description || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 2. Sales Table */}
              {monthlySubTab === 'sales' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">نام راننده</th>
                      <th className="p-3">بارنامه</th>
                      <th className="p-3">حجم (تن)</th>
                      <th className="p-3">کرایه حمل</th>
                      <th className="p-3">مبلغ کل فروش (تومان)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyReportData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">هیچ فروش گازی در این ماه ثبت نشده است.</td>
                      </tr>
                    ) : (
                      monthlyReportData.transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500" dir="ltr">{t.date || '-'}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{t.driverName}</td>
                          <td className="p-3 font-mono">{t.billOfLading || '-'}</td>
                          <td className="p-3 font-mono font-bold">{t.volume}</td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400" dir="ltr">{(t.freightPrice || 0).toLocaleString()}</td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">{t.totalPrice.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 3. Purchases Table */}
              {monthlySubTab === 'purchases' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">شرکت تامین‌کننده</th>
                      <th className="p-3">حجم گاز (تن)</th>
                      <th className="p-3">قیمت واحد</th>
                      <th className="p-3">مبلغ کل خرید (تومان)</th>
                      <th className="p-3">توضیحات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyReportData.purchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">هیچ خرید گازی در این ماه ثبت نشده است.</td>
                      </tr>
                    ) : (
                      monthlyReportData.purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500" dir="ltr">{p.date || '-'}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{p.companyName}</td>
                          <td className="p-3 font-mono font-bold">{p.volume}</td>
                          <td className="p-3 font-mono" dir="ltr">{p.price?.toLocaleString()}</td>
                          <td className="p-3 font-bold text-amber-600 dark:text-amber-400 font-mono" dir="ltr">{p.totalPrice.toLocaleString()}</td>
                          <td className="p-3 text-slate-500">{p.description || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 4. Exchange Table */}
              {monthlySubTab === 'exchange' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3">تاریخ</th>
                      <th className="p-3">صرافی / تحویل‌گیرنده</th>
                      <th className="p-3">مبلغ تومان</th>
                      <th className="p-3">معادل درهم (AED)</th>
                      <th className="p-3">نرخ تبدیل</th>
                      <th className="p-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyReportData.exchangeTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">هیچ تراکنش صرافی در این ماه ثبت نشده است.</td>
                      </tr>
                    ) : (
                      monthlyReportData.exchangeTransactions.map((et) => (
                        <tr key={et.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500" dir="ltr">{et.date || '-'}</td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{et.receiverName || 'صرافی'}</td>
                          <td className="p-3 font-mono font-bold" dir="ltr">{et.amountToman?.toLocaleString()} T</td>
                          <td className="p-3 font-mono font-bold text-blue-600" dir="ltr">{et.aedAmount?.toLocaleString()} AED</td>
                          <td className="p-3 font-mono text-slate-500" dir="ltr">{et.aedRate?.toLocaleString()}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full font-bold">
                              {et.status || 'تکمیل'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DETAILED TRANSACTIONS LEDGER */}
      {/* ========================================================================= */}
      {activeMainTab === 'detailed_transactions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 print:hidden">
            <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Filter size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">ریز تراکنش‌ها و دفاتر تفصیلی</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">جستجو و فیلتر اسناد مالی بر اساس سرفصل</p>
                </div>
              </div>
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm"
              >
                <Printer size={16} /> چاپ جدول
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">نوع گزارش تفصیلی</label>
                <select 
                  value={detailedType} 
                  onChange={(e) => setDetailedType(e.target.value as DetailedReportType)} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="sales">💰 فروش گاز (صادرات)</option>
                  <option value="company_purchases">🏢 خرید گاز از شرکت‌ها</option>
                  <option value="freights">🚛 کرایه حمل تانکرها</option>
                  <option value="driver_ledger">📒 صورت‌حساب و مانده رانندگان</option>
                  <option value="exchange">🏛️ حواله‌ها و تراکنش‌های صرافی</option>
                  <option value="expenses">🧾 هزینه‌های جاری و اداری</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">بازه زمانی</label>
                <select 
                  value={detailedDateFilter} 
                  onChange={(e) => setDetailedDateFilter(e.target.value as DateRange)} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="all">کل تاریخچه</option>
                  <option value="today">امروز</option>
                  <option value="week">این هفته</option>
                  <option value="month">این ماه</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">جستجو در ریز اسناد</label>
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={detailedSearchTerm}
                    onChange={(e) => setDetailedSearchTerm(e.target.value)}
                    placeholder="جستجوی نام، بارنامه، شرح..."
                    className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-slate-700 dark:text-slate-200 font-bold">
              <h3 className="flex items-center gap-2 text-xs font-black">
                <FileText size={18} /> نتایج ({detailedReportData.count} سند)
              </h3>
              <div className="flex items-center gap-3">
                {detailedReportData.totalIn > 0 && (
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg font-mono">
                    ورودی: {detailedReportData.totalIn.toLocaleString()} T
                  </span>
                )}
                {detailedReportData.totalOut > 0 && (
                  <span className="text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-lg font-mono">
                    خروجی: {detailedReportData.totalOut.toLocaleString()} T
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">تاریخ</th>
                    <th className="px-6 py-4">طرف حساب / عنوان</th>
                    <th className="px-6 py-4">مبلغ (تومان)</th>
                    <th className="px-6 py-4">شرح سند</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detailedReportData.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic">
                        سندی برای نمایش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    detailedReportData.items.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-800 dark:text-slate-200">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-mono" dir="ltr">
                          {row.date || row.label || '-'}
                        </td>
                        <td className="px-6 py-4 font-bold">{row.entityName || '-'}</td>
                        <td className={`px-6 py-4 font-mono font-black ${
                          (row.type === 'expense' || row.type === 'purchase' || row.type === 'debit')
                            ? 'text-rose-600 dark:text-rose-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`} dir="ltr">
                          {(row.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-sm truncate">{row.desc || row.description || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: SAVED MONTHLY REPORTS ARCHIVE */}
      {/* ========================================================================= */}
      {activeMainTab === 'reports_archive' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Archive size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">آرشیو گزارش‌های مالی ماهانه</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">تاریخچه فایل‌های PDF و صورت‌های مالی تولید شده</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedYear(currentPersian.year);
                  setSelectedMonth(currentPersian.month);
                  setActiveMainTab('monthly_statement');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
              >
                <Sparkles size={16} />
                تولید گزارش ماه جاری
              </button>
            </div>

            {archivedReports.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Archive size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">هنوز گزارشی در آرشیو ذخیره نشده است</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  با کلیک روی «دانلود فایل PDF» در بخش صورت وضعیت، گزارش‌های ماهانه به صورت خودکار در این بخش بایگانی می‌شوند.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedReports.map((report) => (
                  <div 
                    key={report.id}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg">
                          {report.monthName} {report.year}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{report.reportCode}</span>
                      </div>

                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">فروش گاز:</span>
                          <span className="font-mono font-bold text-emerald-600" dir="ltr">{report.totalSales.toLocaleString()} T</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">سود خالص:</span>
                          <span className={`font-mono font-bold ${report.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} dir="ltr">
                            {report.netProfit.toLocaleString()} T
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">تناژ صادرات:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">{report.salesVolume.toFixed(2)} تن</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span>تاریخ ثبت:</span>
                          <span>{report.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => handleLoadArchiveMonth(report)}
                        className="flex-1 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye size={14} /> مشاهده جزئیات
                      </button>

                      <button
                        onClick={() => handleDeleteArchive(report.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="حذف از آرشیو"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReport;
