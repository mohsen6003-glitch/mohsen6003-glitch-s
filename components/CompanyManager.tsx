import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  Building2,
  Plus,
  Phone,
  MapPin,
  BarChart3,
  Droplets,
  Printer,
  Download,
  History,
  X,
  FileDown,
  Truck,
  Filter,
  ChevronDown,
  Calendar,
  Scale,
  Container,
  Layers,
  CheckCircle2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PurchaseEntry from './PurchaseEntry';

type DateFilterType = 'all' | 'today' | 'week' | 'month';

const CompanyManager: React.FC = () => {
  const { companies, addCompany, transactions, drivers, purchases, getReceiverName } = useData();
  const [activeSubView, setActiveSubView] = useState<'LOAD_REGISTRATION' | 'COMPANY_CARDS'>('LOAD_REGISTRATION');
  const [preselectedCompanyId, setPreselectedCompanyId] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [toast, setToast] = useState<string | null>(null);

  // History Modal State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to calculate unified stats for each company (combining purchases & unlinked transactions)
  const getFilteredCompanyStats = (companyId: string) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const isWithinRange = (id: string) => {
      if (dateFilter === 'all') return true;
      const ts = parseInt(id);
      if (isNaN(ts)) return false;
      if (dateFilter === 'today') return ts >= startOfDay;
      if (dateFilter === 'week') return ts >= startOfWeek;
      if (dateFilter === 'month') return ts >= startOfMonth;
      return true;
    };

    const companyPurchases = purchases.filter(
      p => p.companyId === companyId && p.loadingStatus !== 'PENDING_SCALE' && isWithinRange(p.id)
    );
    const linkedTxIds = new Set(
      purchases.map(p => p.linkedTransactionId).filter((id): id is string => Boolean(id))
    );
    const companyUnlinkedExports = transactions.filter(
      t => t.companyId === companyId && !linkedTxIds.has(t.id) && isWithinRange(t.id)
    );

    const totalLoadsCount = companyPurchases.length + companyUnlinkedExports.length;
    const totalVolumeTons =
      companyPurchases.reduce((acc, p) => acc + (Number(p.volume) || 0), 0) +
      companyUnlinkedExports.reduce((acc, t) => acc + (Number(t.volume) || 0), 0);
    const totalAmountUSD =
      companyPurchases.reduce(
        (acc, p) => acc + (Number(p.volume) || 0) * (Number(p.declaredRateUSD || p.declaredRate || p.price) || 0),
        0
      ) +
      companyUnlinkedExports.reduce(
        (acc, t) => acc + (Number(t.volume) || 0) * (Number(t.declaredRate || t.price) || 0),
        0
      );
    const totalAmountAED =
      companyPurchases.reduce((acc, p) => {
        const vol = Number(p.volume) || 0;
        const factor = p.exchangeRateUSD_AED || 3.67;
        const rUsd = Number(p.declaredRateUSD || p.declaredRate || p.price) || 0;
        const rAed = p.declaredRateAED && p.declaredRateAED > 0 ? Number(p.declaredRateAED) : parseFloat((rUsd * factor).toFixed(2));
        return acc + vol * rAed;
      }, 0) +
      companyUnlinkedExports.reduce((acc, t) => {
        const vol = Number(t.volume) || 0;
        const factor = t.exchangeRateUSD_AED || 3.67;
        const rUsd = Number(t.declaredRate || t.price) || 0;
        const rAed = t.gasPriceAED && t.gasPriceAED > 0 ? Number(t.gasPriceAED) : parseFloat((rUsd * factor).toFixed(2));
        return acc + vol * rAed;
      }, 0);

    // Breakdown by Receiver & Rate for this company card
    const receiverSummaryMap = new Map<
      string,
      { receiverName: string; count: number; tons: number; amountUSD: number; amountAED: number; rates: Set<string> }
    >();

    companyPurchases.forEach(p => {
      const rName = p.receiverId ? getReceiverName(p.receiverId) : 'عمومی';
      if (!receiverSummaryMap.has(rName)) {
        receiverSummaryMap.set(rName, { receiverName: rName, count: 0, tons: 0, amountUSD: 0, amountAED: 0, rates: new Set() });
      }
      const entry = receiverSummaryMap.get(rName)!;
      const vol = Number(p.volume) || 0;
      const factor = p.exchangeRateUSD_AED || 3.67;
      const rVal = Number(p.declaredRateUSD || p.declaredRate || p.price) || 0;
      const rAed = p.declaredRateAED && p.declaredRateAED > 0 ? Number(p.declaredRateAED) : parseFloat((rVal * factor).toFixed(2));
      entry.count += 1;
      entry.tons += vol;
      entry.amountUSD += vol * rVal;
      entry.amountAED += vol * rAed;
      if (rVal > 0) entry.rates.add(`$${rVal.toLocaleString()} (${rAed.toLocaleString()} AED)`);
    });

    companyUnlinkedExports.forEach(t => {
      const rName = t.receiverId ? getReceiverName(t.receiverId) : 'عمومی';
      if (!receiverSummaryMap.has(rName)) {
        receiverSummaryMap.set(rName, { receiverName: rName, count: 0, tons: 0, amountUSD: 0, amountAED: 0, rates: new Set() });
      }
      const entry = receiverSummaryMap.get(rName)!;
      const vol = Number(t.volume) || 0;
      const factor = t.exchangeRateUSD_AED || 3.67;
      const rVal = Number(t.declaredRate || t.price) || 0;
      const rAed = t.gasPriceAED && t.gasPriceAED > 0 ? Number(t.gasPriceAED) : parseFloat((rVal * factor).toFixed(2));
      entry.count += 1;
      entry.tons += vol;
      entry.amountUSD += vol * rVal;
      entry.amountAED += vol * rAed;
      if (rVal > 0) entry.rates.add(`$${rVal.toLocaleString()} (${rAed.toLocaleString()} AED)`);
    });

    return {
      totalLoadsCount,
      totalVolumeTons,
      totalAmountUSD,
      totalAmountAED,
      receiversSummary: Array.from(receiverSummaryMap.values())
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showNotice('نام شرکت فرستنده الزامی است');
      return;
    }
    addCompany({
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim()
    });
    setForm({ name: '', phone: '', address: '' });
    showNotice('شرکت جدید با موفقیت ثبت شد');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (companies.length === 0) {
      showNotice('داده‌ای برای خروجی وجود ندارد.');
      return;
    }

    const headers = [
      'نام شرکت فرستنده',
      'تلفن',
      'آدرس',
      'تعداد کل بار ارسالی',
      'جمع وزن باسکول (تن)',
      'جمع مبلغ کل دلاری ($)',
      'جمع مبلغ کل درهمی (AED - 3.67)'
    ];
    const rows = companies.map(c => {
      const stats = getFilteredCompanyStats(c.id);
      return [
        c.name,
        c.phone,
        c.address,
        stats.totalLoadsCount,
        stats.totalVolumeTons,
        `$${stats.totalAmountUSD.toFixed(2)}`,
        `${stats.totalAmountAED.toFixed(2)} AED`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `companies_${dateFilter}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
    link.click();
  };

  // Unified History Data for Selected Company Modal
  const historyData = useMemo(() => {
    if (!selectedCompanyId) return [];
    const linkedTxIds = new Set(
      purchases.map(p => p.linkedTransactionId).filter((id): id is string => Boolean(id))
    );

    const fromPurchases = purchases
      .filter(p => p.companyId === selectedCompanyId && p.loadingStatus !== 'PENDING_SCALE')
      .map(p => {
        const driver = p.driverId ? drivers.find(d => d.id === p.driverId) : undefined;
        const factor = p.exchangeRateUSD_AED || 3.67;
        const rateUsd = Number(p.declaredRateUSD || p.declaredRate || p.price) || 0;
        const rateAed =
          p.declaredRateAED && p.declaredRateAED > 0
            ? Number(p.declaredRateAED)
            : parseFloat((rateUsd * factor).toFixed(2));
        return {
          id: p.id,
          date: p.date,
          receiverName: p.receiverId ? getReceiverName(p.receiverId) : 'تعیین نشده',
          driverName: driver?.fullName || p.driverNameManual || 'ثبت نشده',
          plateNumber: driver?.plateNumber || p.plateNumberManual || '-',
          billOfLading: p.scaleTicketNo || '-',
          volume: p.volume,
          declaredRate: rateUsd,
          declaredRateAED: rateAed
        };
      });

    const fromTx = transactions
      .filter(t => t.companyId === selectedCompanyId && !linkedTxIds.has(t.id))
      .map(t => {
        const driver = drivers.find(d => d.id === t.driverId);
        const factor = t.exchangeRateUSD_AED || 3.67;
        const rateUsd = Number(t.declaredRate || t.price) || 0;
        const rateAed =
          t.gasPriceAED && t.gasPriceAED > 0
            ? Number(t.gasPriceAED)
            : parseFloat((rateUsd * factor).toFixed(2));
        return {
          id: t.id,
          date: t.date,
          receiverName: t.receiverId ? getReceiverName(t.receiverId) : 'تعیین نشده',
          driverName: driver?.fullName || t.driverNameManual || 'ناشناس',
          plateNumber: driver?.plateNumber || t.plateNumberManual || '-',
          billOfLading: t.scaleTicketNo || t.billOfLading || '-',
          volume: t.volume,
          declaredRate: rateUsd,
          declaredRateAED: rateAed
        };
      });

    return [...fromPurchases, ...fromTx].sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
  }, [selectedCompanyId, purchases, transactions, drivers, getReceiverName]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleHistoryExportCSV = () => {
    if (historyData.length === 0) return;
    const headers = [
      'تاریخ',
      'گیرنده بار (مقصد)',
      'نام راننده',
      'شماره پلاک',
      'قبض باسکول',
      'وزن باسکول (تن)',
      'نرخ اعلامی دلاری ($)',
      'نرخ درهمی (AED - فرمول 3.67)',
      'جمع مبلغ دلاری ($)',
      'جمع مبلغ درهمی (AED - فرمول 3.67)'
    ];
    const rows = historyData.map(item => {
      const vol = Number(item.volume) || 0;
      const totalUSD = vol * (Number(item.declaredRate) || 0);
      const totalAED = vol * (Number(item.declaredRateAED) || 0);
      return [
        item.date,
        item.receiverName,
        item.driverName,
        item.plateNumber,
        item.billOfLading,
        item.volume,
        item.declaredRate ? `$${item.declaredRate}` : '',
        item.declaredRateAED ? `${item.declaredRateAED} AED` : '',
        totalUSD > 0 ? `$${totalUSD.toFixed(2)}` : '$0',
        totalAED > 0 ? `${totalAED.toFixed(2)} AED` : '0 AED'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `company_history_${selectedCompany?.name}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
    link.click();
  };

  const handleHistoryExportPDF = async () => {
    const input = document.getElementById('company-history-table');
    if (input) {
      setIsExportingHistoryPdf(true);
      try {
        const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
        pdf.save(`history-${selectedCompany?.name}.pdf`);
      } catch (err) {
        console.error(err);
      } finally {
        setIsExportingHistoryPdf(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold print:hidden">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Top View Switcher */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5 px-2">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-xl">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="font-black text-slate-800 dark:text-white text-base">
              مدیریت شرکت‌ها و ثبت بار بر اساس باسکول بارگیری
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ثبت باسکول بارگیری ارسالی راننده و گزارش تفکیکی هر شرکت برای هر گیرنده و نرخ اعلامی (دلار و درهم ۳.۶۷)
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubView('LOAD_REGISTRATION')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeSubView === 'LOAD_REGISTRATION'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Scale size={15} />
            ثبت بار شرکت‌ها (باسکول) و گزارش نرخ‌ها
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('COMPANY_CARDS')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeSubView === 'COMPANY_CARDS'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Building2 size={15} />
            فهرست و کارت‌های شرکت‌ها ({companies.length})
          </button>
        </div>
      </div>

      {activeSubView === 'LOAD_REGISTRATION' ? (
        <PurchaseEntry initialCompanyId={preselectedCompanyId} />
      ) : (
        <>
          {/* Print Header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">لیست شرکت‌های فرستنده بار و خلاصه عملکرد</h1>
            <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print:hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
                <Building2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">تعریف شرکت فرستنده جدید</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نام شرکت فرستنده</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  placeholder="نام شرکت"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تلفن</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  placeholder="تلفن تماس"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">آدرس / مبدأ بارگیری</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  placeholder="آدرس شرکت"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full p-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-bold"
                >
                  <Plus size={18} /> ثبت شرکت
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                <Filter size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">لیست شرکت‌های فرستنده</h3>
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value as DateFilterType)}
                  className="pr-8 pl-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="all">کل تاریخچه</option>
                  <option value="today">امروز</option>
                  <option value="week">این هفته</option>
                  <option value="month">این ماه</option>
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
              >
                <Download size={16} /> اکسل
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
              >
                <Printer size={16} /> چاپ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(company => {
              const stats = getFilteredCompanyStats(company.id);
              return (
                <div
                  key={company.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow flex flex-col justify-between gap-4 print:border print:border-slate-300 print:shadow-none break-inside-avoid"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-lg text-slate-800 dark:text-white">{company.name}</h3>
                      <div className="flex items-center gap-1 print:hidden">
                        <button
                          onClick={() => {
                            setPreselectedCompanyId(company.id);
                            setActiveSubView('LOAD_REGISTRATION');
                          }}
                          className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-colors"
                        >
                          <Plus size={13} /> ثبت بار باسکول
                        </button>
                        <button
                          onClick={() => setSelectedCompanyId(company.id)}
                          className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-slate-600 dark:text-slate-400 hover:text-cyan-700 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <History size={14} /> ریز بارها
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs space-y-1 mb-3">
                      <div className="flex items-center gap-2">
                        <Phone size={13} /> {company.phone || '---'}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={13} /> {company.address || '---'}
                      </div>
                    </div>

                    {/* Receiver breakdown preview on company card */}
                    {stats.receiversSummary.length > 0 && (
                      <div className="mb-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <span className="text-[11px] font-bold text-slate-500 block">
                          گیرندگان بار این شرکت و نرخ‌های اعلامی:
                        </span>
                        {stats.receiversSummary.map((r, i) => (
                          <div
                            key={i}
                            className="bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg text-xs flex flex-wrap items-center justify-between gap-1"
                          >
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                              <Container size={12} /> {r.receiverName}:
                            </span>
                            <span className="font-black text-slate-800 dark:text-slate-200">
                              {r.count} بار ({(r.tons || 0).toLocaleString()} تن)
                            </span>
                            {r.rates.size > 0 && (
                              <span className="w-full text-[11px] text-emerald-700 dark:text-emerald-400 font-mono text-left flex flex-wrap justify-between items-center pt-0.5 gap-1" dir="ltr">
                                <span>Rate: {Array.from(r.rates).join(' | ')}</span>
                                <span className="font-black">
                                  ${(r.amountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} / {(r.amountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                                </span>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-cyan-50 dark:bg-cyan-900/10 rounded-xl p-3 space-y-2 print:bg-slate-50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Truck size={14} /> تعداد کل بار ارسالی:
                      </span>
                      <span className="font-black text-cyan-800 dark:text-cyan-300">
                        {stats.totalLoadsCount} سرویس
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-cyan-100 dark:border-cyan-900/30 pt-2 print:border-slate-200">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Scale size={14} /> جمع وزن باسکول بارگیری:
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">
                        {(stats.totalVolumeTons || 0).toLocaleString()} Ton
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-cyan-100 dark:border-cyan-900/30 pt-2 print:border-slate-200">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        جمع مبلغ کل (دلار / درهم ۳.۶۷):
                      </span>
                      <div className="text-left font-mono" dir="ltr">
                        <div className="font-black text-emerald-700 dark:text-emerald-400">
                          ${(stats.totalAmountUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          {(stats.totalAmountAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {companies.length === 0 && (
              <p className="text-slate-400 text-center col-span-full py-8">هیچ شرکتی ثبت نشده است.</p>
            )}
          </div>
        </>
      )}

      {/* History Modal */}
      {selectedCompanyId && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <Building2 size={20} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                    ریز باسکول‌ها و بارهای ارسالی شرکت: {selectedCompany.name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    تفکیک گیرنده، راننده، وزن باسکول بارگیری، نرخ دلاری ($) و نرخ درهمی (فرمول ۳.۶۷)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHistoryExportPDF}
                  disabled={isExportingHistoryPdf}
                  className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
                  title="خروجی PDF"
                >
                  <FileDown size={18} />
                </button>
                <button
                  onClick={handleHistoryExportCSV}
                  className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800"
                  title="خروجی اکسل"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setSelectedCompanyId(null)}
                  className="text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 p-2 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0" id="company-history-table">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">تاریخ</th>
                    <th className="px-4 py-3 font-semibold">گیرنده بار (مقصد)</th>
                    <th className="px-4 py-3 font-semibold">راننده و پلاک</th>
                    <th className="px-4 py-3 font-semibold">قبض باسکول</th>
                    <th className="px-4 py-3 font-semibold">وزن باسکول (تن)</th>
                    <th className="px-4 py-3 font-semibold">نرخ اعلامی دلاری ($)</th>
                    <th className="px-4 py-3 font-semibold">نرخ درهم (فرمول ۳.۶۷)</th>
                    <th className="px-4 py-3 font-semibold">جمع مبلغ دلاری ($)</th>
                    <th className="px-4 py-3 font-semibold">جمع مبلغ درهمی (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                        هیچ سابقه‌ای یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    historyData.map(item => {
                      const vol = Number(item.volume) || 0;
                      const totalUSD = vol * (Number(item.declaredRate) || 0);
                      const totalAED = vol * (Number(item.declaredRateAED) || 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono" dir="ltr">
                            {item.date}
                          </td>
                          <td className="px-4 py-3 font-bold text-indigo-700 dark:text-indigo-300">{item.receiverName}</td>
                          <td className="px-4 py-3 font-medium">
                            {item.driverName} <span className="text-xs text-slate-400">({item.plateNumber})</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{item.billOfLading}</td>
                          <td className="px-4 py-3 font-bold font-mono" dir="ltr">
                            {item.volume}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                            {item.declaredRate ? `$${(item.declaredRate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '---'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-700 dark:text-indigo-400" dir="ltr">
                            {item.declaredRateAED ? `${(item.declaredRateAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED` : '---'}
                          </td>
                          <td className="px-4 py-3 font-mono font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                            {totalUSD > 0 ? `$${(totalUSD || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '---'}
                          </td>
                          <td className="px-4 py-3 font-mono font-black text-indigo-700 dark:text-indigo-300" dir="ltr">
                            {totalAED > 0 ? `${(totalAED || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} AED` : '---'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-medium"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManager;