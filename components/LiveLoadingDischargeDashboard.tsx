import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Tab, QueueStatus } from '../types';
import {
  Truck,
  Fuel,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Flame,
  ChevronRight,
  Layers,
  Filter,
  Sparkles,
  Building2,
  Container,
  User,
  Calendar,
  Zap,
  TrendingUp,
  SlidersHorizontal,
  PlusCircle,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { getPersianDateInfo } from '../utils/dateUtils';

interface LiveLoadingDischargeDashboardProps {
  onNavigate?: (tab: Tab) => void;
}

type TimeFilter = 'today' | '7days' | '30days' | 'all';

export const LiveLoadingDischargeDashboard: React.FC<LiveLoadingDischargeDashboardProps> = ({ onNavigate }) => {
  const {
    queue,
    drivers,
    transactions,
    purchases,
    companies,
    receivers,
    updateQueueStatus,
    addToQueue,
    getDriverName,
    getCompanyName,
    getReceiverName
  } = useData();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>(() => new Date().toLocaleTimeString('fa-IR'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'volume' | 'count'>('volume');

  // Trigger manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toLocaleTimeString('fa-IR'));
      setIsRefreshing(false);
    }, 400);
  };

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefreshed(new Date().toLocaleTimeString('fa-IR'));
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Current Persian Date String
  const currentDateInfo = useMemo(() => getPersianDateInfo(new Date()), []);

  // Filter items by time range
  const filterDateMatch = (dateStr: string | undefined): boolean => {
    if (!dateStr || timeFilter === 'all') return true;
    const itemDate = getPersianDateInfo(dateStr);
    const today = currentDateInfo;

    if (timeFilter === 'today') {
      return itemDate.year === today.year && itemDate.month === today.month && itemDate.day === today.day;
    }
    if (timeFilter === '30days') {
      return itemDate.year === today.year && itemDate.month === today.month;
    }
    // 7 days approximation
    if (timeFilter === '7days') {
      if (itemDate.year !== today.year || itemDate.month !== today.month) return false;
      return Math.abs(today.day - itemDate.day) <= 7;
    }
    return true;
  };

  // Filtered transactions (بارگیری / خروج گاز)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => filterDateMatch(t.date));
  }, [transactions, timeFilter, currentDateInfo]);

  // Filtered purchases (تخلیه / ورود گاز از شرکت‌ها)
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => filterDateMatch(p.date));
  }, [purchases, timeFilter, currentDateInfo]);

  // Real-Time Queue status counts
  const queueStats = useMemo(() => {
    const loading = queue.filter(q => q.status === 'LOADING');
    const waiting = queue.filter(q => q.status === 'WAIT');
    const done = queue.filter(q => q.status === 'DONE');
    const cancelled = queue.filter(q => q.status === 'CANCELLED');
    const total = queue.length;
    return {
      loading,
      waiting,
      done,
      cancelled,
      total,
      loadingCount: loading.length,
      waitingCount: waiting.length,
      doneCount: done.length,
      cancelledCount: cancelled.length
    };
  }, [queue]);

  // Total Volumes (تناژ تخلیه و بارگیری)
  const volumeStats = useMemo(() => {
    const totalLoadedVolume = filteredTransactions.reduce((acc, t) => acc + (Number(t.volume) || 0), 0);
    const totalDischargedVolume = filteredPurchases.reduce((acc, p) => acc + (Number(p.volume) || 0), 0);
    const netBalance = totalDischargedVolume - totalLoadedVolume;
    const ratio = (totalDischargedVolume + totalLoadedVolume) > 0 
      ? Math.round((totalLoadedVolume / (totalDischargedVolume + totalLoadedVolume)) * 100) 
      : 50;

    return {
      totalLoadedVolume,
      totalDischargedVolume,
      netBalance,
      loadingRatio: ratio,
      dischargeRatio: 100 - ratio
    };
  }, [filteredTransactions, filteredPurchases]);

  // 1. Data for Pie Chart 1: وضعیت لحظه‌ای ناوگان و صف (Queue Status Breakdown)
  const queueStatusPieData = useMemo(() => {
    const rawData = [
      { name: 'در حال بارگیری', value: queueStats.loadingCount, color: '#3b82f6', icon: PlayCircle },
      { name: 'در انتظار نوبت', value: queueStats.waitingCount, color: '#f59e0b', icon: Clock },
      { name: 'بارگیری تکمیل‌شده', value: queueStats.doneCount, color: '#10b981', icon: CheckCircle2 },
      { name: 'لغو شده / انصراف', value: queueStats.cancelledCount, color: '#ef4444', icon: AlertCircle }
    ];
    // If no queue data at all, provide a preview indicator
    const hasData = rawData.some(d => d.value > 0);
    if (!hasData) {
      return [
        { name: 'بدون تانکر در صف', value: 1, color: '#94a3b8', icon: Clock }
      ];
    }
    return rawData.filter(d => d.value > 0);
  }, [queueStats]);

  // 2. Data for Pie Chart 2: موازنه تخلیه (ورود) در برابر بارگیری (خروج)
  const volumeBalancePieData = useMemo(() => {
    const discharge = Math.round(volumeStats.totalDischargedVolume * 100) / 100;
    const loading = Math.round(volumeStats.totalLoadedVolume * 100) / 100;
    if (discharge === 0 && loading === 0) {
      return [
        { name: 'تخلیه (ورودی مخازن)', value: 50, displayVal: 0, color: '#10b981' },
        { name: 'بارگیری (خروجی تانکرها)', value: 50, displayVal: 0, color: '#3b82f6' }
      ];
    }
    return [
      { name: 'تخلیه (ورودی از شرکت‌ها)', value: discharge || 0.001, displayVal: discharge, color: '#10b981' },
      { name: 'بارگیری (صادرات و تحویل)', value: loading || 0.001, displayVal: loading, color: '#3b82f6' }
    ];
  }, [volumeStats]);

  // 3. Data for Pie Chart 3: سهم تحویل‌گیرندگان از کل بارگیری‌ها
  const receiverDistributionPieData = useMemo(() => {
    const receiverMap: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const name = t.receiverId ? getReceiverName(t.receiverId) : 'سایر خریداران';
      const vol = Number(t.volume) || 0;
      receiverMap[name] = (receiverMap[name] || 0) + vol;
    });

    const palette = ['#6366f1', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#84cc16'];
    const entries = Object.entries(receiverMap).map(([name, value], idx) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: palette[idx % palette.length]
    })).sort((a, b) => b.value - a.value).slice(0, 6);

    if (entries.length === 0) {
      return [{ name: 'هنوز بارگیری ثبت نشده', value: 1, color: '#94a3b8' }];
    }
    return entries;
  }, [filteredTransactions, getReceiverName]);

  // 4. Data for Bar Chart 1: مقایسه روند روزانه / تاریخی تخلیه و بارگیری (Discharge vs Loading Trend)
  const comparisonBarData = useMemo(() => {
    const datesMap: Record<string, { date: string; discharge: number; loading: number; loadedCount: number; dischargeCount: number }> = {};

    // Inflow from Purchases (تخلیه)
    purchases.forEach(p => {
      const d = p.date ? p.date.trim().split(' ')[0] : 'نامشخص';
      if (!datesMap[d]) {
        datesMap[d] = { date: d, discharge: 0, loading: 0, loadedCount: 0, dischargeCount: 0 };
      }
      datesMap[d].discharge += Number(p.volume) || 0;
      datesMap[d].dischargeCount += 1;
    });

    // Outflow from Transactions (بارگیری)
    transactions.forEach(t => {
      const d = t.date ? t.date.trim().split(' ')[0] : 'نامشخص';
      if (!datesMap[d]) {
        datesMap[d] = { date: d, discharge: 0, loading: 0, loadedCount: 0, dischargeCount: 0 };
      }
      datesMap[d].loading += Number(t.volume) || 0;
      datesMap[d].loadedCount += 1;
    });

    const sortedDates = Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date));
    
    // Pick the most recent 7 to 10 entries for clear readable charts
    const recent = sortedDates.slice(-8);

    if (recent.length === 0) {
      // Demo fallback when empty
      return [
        { date: 'روز ۱', discharge: 45, loading: 42, loadedCount: 2, dischargeCount: 2 },
        { date: 'روز ۲', discharge: 60, loading: 55, loadedCount: 3, dischargeCount: 3 },
        { date: 'روز ۳', discharge: 50, loading: 62, loadedCount: 3, dischargeCount: 2 },
        { date: 'روز ۴', discharge: 75, loading: 70, loadedCount: 4, dischargeCount: 4 },
        { date: 'امروز', discharge: 30, loading: 28, loadedCount: 2, dischargeCount: 1 }
      ];
    }

    return recent.map(item => ({
      date: item.date,
      discharge: Math.round(item.discharge * 10) / 10,
      loading: Math.round(item.loading * 10) / 10,
      loadedCount: item.loadedCount,
      dischargeCount: item.dischargeCount
    }));
  }, [purchases, transactions]);

  // 5. Data for Bar Chart 2: برترین شرکت‌های تامین‌کننده (تخلیه) و تحویل‌گیرندگان (بارگیری)
  const topEntitiesBarData = useMemo(() => {
    const list: { name: string; volume: number; type: 'تخلیه' | 'بارگیری'; count: number }[] = [];

    // Top Receivers (بارگیری)
    const recMap: Record<string, { volume: number; count: number }> = {};
    transactions.forEach(t => {
      const name = t.receiverId ? getReceiverName(t.receiverId) : 'سایر مقاصد';
      if (!recMap[name]) recMap[name] = { volume: 0, count: 0 };
      recMap[name].volume += Number(t.volume) || 0;
      recMap[name].count += 1;
    });

    Object.entries(recMap).forEach(([name, val]) => {
      list.push({
        name: `تحویل: ${name}`,
        volume: Math.round(val.volume * 10) / 10,
        type: 'بارگیری',
        count: val.count
      });
    });

    // Top Suppliers (تخلیه)
    const compMap: Record<string, { volume: number; count: number }> = {};
    purchases.forEach(p => {
      const name = p.companyId ? getCompanyName(p.companyId) : 'سایر تامین‌کنندگان';
      if (!compMap[name]) compMap[name] = { volume: 0, count: 0 };
      compMap[name].volume += Number(p.volume) || 0;
      compMap[name].count += 1;
    });

    Object.entries(compMap).forEach(([name, val]) => {
      list.push({
        name: `تامین: ${name}`,
        volume: Math.round(val.volume * 10) / 10,
        type: 'تخلیه',
        count: val.count
      });
    });

    if (list.length === 0) {
      return [
        { name: 'پتروشیمی بوعلی', volume: 120, type: 'تخلیه' as const, count: 5 },
        { name: 'پالایشگاه ستاره', volume: 95, type: 'تخلیه' as const, count: 4 },
        { name: 'پایانه مرزی هرات', volume: 110, type: 'بارگیری' as const, count: 5 },
        { name: 'شرکت افغان گاز', volume: 85, type: 'بارگیری' as const, count: 4 }
      ];
    }

    return list.sort((a, b) => b.volume - a.volume).slice(0, 6);
  }, [transactions, purchases, getReceiverName, getCompanyName]);

  // Active Loading Bays (سکوهای بارگیری زنده)
  const activeBays = useMemo(() => {
    const loadingList = queue.filter(q => q.status === 'LOADING');
    // Pre-allocated bay count (e.g. 4 Bays in terminal)
    const bays = [
      { id: 1, name: 'سکوی بارگیری ۱', item: loadingList[0] || null },
      { id: 2, name: 'سکوی بارگیری ۲', item: loadingList[1] || null },
      { id: 3, name: 'سکوی بارگیری ۳', item: loadingList[2] || null },
      { id: 4, name: 'سکوی بارگیری ۴', item: loadingList[3] || null },
    ];
    return bays;
  }, [queue]);

  // Quick seed sample data if app is completely fresh
  const handleSeedDemoData = () => {
    if (drivers.length === 0) {
      alert("لطفاً ابتدا حداقل یک راننده در بخش «ثبت راننده» اضافه نمایید، یا از بخش نمونه استفاده کنید.");
      return;
    }
    const driverId = drivers[0].id;
    addToQueue({
      driverId,
      destination: 'پایانه مرزی اسلام قلعه / هرات',
      entryTime: new Date().toLocaleTimeString('fa-IR')
    });
    alert("یک تانکر نمونه به صف اضافه شد و نمودارها فوراً به‌روزرسانی شدند.");
  };

  return (
    <div className="space-y-6 text-right font-vazir" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. TOP REAL-TIME MONITORING HEADER & CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Ambient lighting decorative blur */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                پایش لحظه‌ای ایستگاه و پایانه (Live)
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Calendar size={14} className="text-blue-400" />
                امروز: {currentDateInfo.day} {currentDateInfo.monthName} {currentDateInfo.year}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono" dir="ltr">
                <Clock size={14} className="text-amber-400" />
                {lastRefreshed}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Activity className="text-blue-400" size={32} />
              وضعیت لحظه‌ای تخلیه و بارگیری گاز
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              داشبورد پایش آنی عملیات ناوگان، موازنه ورود (تخلیه از شرکت‌ها) و خروج (بارگیری صادراتی) به صورت نمودارهای آماری زنده Recharts.
            </p>
          </div>

          {/* Right Action Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Time Filter Buttons */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80 backdrop-blur-sm">
              <button
                onClick={() => setTimeFilter('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeFilter === 'today' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                امروز
              </button>
              <button
                onClick={() => setTimeFilter('7days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeFilter === '7days' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                ۷ روز اخیر
              </button>
              <button
                onClick={() => setTimeFilter('30days')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeFilter === '30days' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                ماه جاری
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                کل تاریخچه
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all flex items-center justify-center shadow-sm"
              title="بروزرسانی داده‌های نمودارها"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin text-blue-400" : ""} />
            </button>

            {/* Quick Actions Navigation */}
            {onNavigate && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('queue')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 active:scale-95"
                >
                  <Truck size={15} />
                  صف بارگیری
                </button>
                <button
                  onClick={() => onNavigate('entry')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 active:scale-95"
                >
                  <Fuel size={15} />
                  ورود و بارنامه
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME KPI SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tankers Loading Now */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">در حال بارگیری (سکوها)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <PlayCircle size={20} className="animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">
              {queueStats.loadingCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">تانکر متصل</span>
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 font-medium flex items-center gap-1">
            <Zap size={12} />
            {queueStats.loadingCount > 0 ? 'عملیات پمپاژ فعال است' : 'سکوها در انتظار تانکر'}
          </p>
        </div>

        {/* Card 2: Tankers Waiting in Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">در انتظار نوبت (صف)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">
              {queueStats.waitingCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">تانکر در محوطه</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-medium flex items-center gap-1">
            <span>نوبت بعدی آماده فراخوان</span>
          </p>
        </div>

        {/* Card 3: Total Outflow (بارگیری - Transactions) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">حجم بارگیری شده (خروج)</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono" dir="ltr">
              {volumeStats.totalLoadedVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">تن</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {filteredTransactions.length} محموله بارنامه شده
          </p>
        </div>

        {/* Card 4: Total Inflow (تخلیه - Purchases) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">حجم تخلیه شده (ورود)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
              {volumeStats.totalDischargedVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">تن</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {filteredPurchases.length} خرید از پالایشگاه/تامین
          </p>
        </div>

        {/* Card 5: Net Balance (موازنه مخازن) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-1.5 h-full ${volumeStats.netBalance >= 0 ? 'bg-teal-500' : 'bg-rose-500'}`} />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تراز موازنه مخزن</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${volumeStats.netBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`} dir="ltr">
              {volumeStats.netBalance > 0 ? `+${volumeStats.netBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}` : volumeStats.netBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">تن</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {volumeStats.netBalance >= 0 ? 'موجودی مثبت ورودی' : 'خروجی بیش از ورودی جدید'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RECHARTS PIE CHARTS SECTION (نمودارهای دایره‌ای) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* PIE CHART 1: وضعیت لحظه‌ای ناوگان در صف و اسکله‌های بارگیری */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <PieChartIcon size={20} className="text-blue-500" />
                وضعیت لحظه‌ای صف و ناوگان
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                {queueStats.total} تانکر
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              تفکیک تانکرهای متصل به سکوها، در انتظار و پایان‌یافته
            </p>
          </div>

          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={queueStatusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {queueStatusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} تانکر`, name]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.85rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label for Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {queueStats.total}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">کل ناوگان</span>
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30">
              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                در حال بارگیری:
              </span>
              <span className="font-mono font-bold text-blue-800 dark:text-blue-200">{queueStats.loadingCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30">
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                در انتظار صف:
              </span>
              <span className="font-mono font-bold text-amber-800 dark:text-amber-200">{queueStats.waitingCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                تکمیل شده:
              </span>
              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">{queueStats.doneCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/30">
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                لغو شده:
              </span>
              <span className="font-mono font-bold text-rose-800 dark:text-rose-200">{queueStats.cancelledCount}</span>
            </div>
          </div>
        </div>

        {/* PIE CHART 2: نسبت موازنه کل حجم تخلیه به بارگیری */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <PieChartIcon size={20} className="text-emerald-500" />
                نسبت تخلیه به بارگیری گاز
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
                موازنه حجمی
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              مقایسه درصد سهم تناژ ورودی (تخلیه) در برابر تناژ خروجی (بارگیری)
            </p>
          </div>

          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={volumeBalancePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {volumeBalancePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${(item.payload.displayVal !== undefined ? item.payload.displayVal : val).toLocaleString()} تن`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.85rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-slate-800 dark:text-white font-mono" dir="ltr">
                {volumeStats.loadingRatio}% / {volumeStats.dischargeRatio}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold">بارگیری / تخلیه</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30">
              <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                تخلیه (ورودی از شرکت‌ها)
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300" dir="ltr">
                {volumeStats.totalDischargedVolume.toLocaleString()} تن ({volumeStats.dischargeRatio}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30">
              <span className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-medium">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                بارگیری (خروجی تانکرها)
              </span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300" dir="ltr">
                {volumeStats.totalLoadedVolume.toLocaleString()} تن ({volumeStats.loadingRatio}%)
              </span>
            </div>
          </div>
        </div>

        {/* PIE CHART 3: سهم تحویل‌گیرندگان و مقاصد از بارگیری */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Container size={20} className="text-indigo-500" />
                سهم تحویل‌گیرندگان از بارگیری
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                مقاصد صادراتی
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              توزیع حجم گاز بارگیری شده بر حسب مقاصد و خریداران اصلی
            </p>
          </div>

          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={receiverDistributionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {receiverDistributionPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} تن`, name]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.85rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs max-h-28 overflow-y-auto scrollbar-thin">
            {receiverDistributionPieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0" dir="ltr">
                  {item.value.toLocaleString()} تن
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. RECHARTS BAR CHARTS SECTION (نمودارهای ستونی) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* BAR CHART 1: مقایسه روند روزانه حجم تخلیه و بارگیری (Discharge vs Loading Volume Over Days) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                مقایسه ستونی حجم تخلیه (ورودی) و بارگیری (خروجی)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                روند روزانه تناژ گاز تزریق‌شده به تانکرها در برابر گاز تخلیه‌شده در مخازن ایستگاه (بر حسب تن)
              </p>
            </div>

            {/* Legend Indicators */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                تخلیه (ورودی گاز)
              </span>
              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                <span className="w-3 h-3 rounded-md bg-blue-600"></span>
                بارگیری (خروجی گاز)
              </span>
            </div>
          </div>

          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonBarData}
                margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'inherit' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'inherit' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" تن"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(100, 116, 139, 0.08)' }}
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString()} تن`,
                    name === 'discharge' ? 'تخلیه به مخازن' : 'بارگیری تانکرها'
                  ]}
                  labelFormatter={(label) => `تاریخ: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.85rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                />
                <Bar
                  dataKey="discharge"
                  name="discharge"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
                <Bar
                  dataKey="loading"
                  name="loading"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART 2: برترین شرکت‌ها و تحویل‌گیرندگان از نظر تناژ */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                حجم به تفکیک مبادی و مقاصد
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                برترین‌ها
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              مقایسه تناژ ثبت شده برای شرکت‌های تامین‌کننده و خریداران گاز
            </p>
          </div>

          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topEntitiesBarData}
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  type="number"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'inherit' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" تن"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'inherit' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  width={90}
                />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} تن`, 'حجم کل']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.85rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                />
                <Bar
                  dataKey="volume"
                  radius={[0, 6, 6, 0]}
                  fill="#6366f1"
                >
                  {topEntitiesBarData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.type === 'تخلیه' ? '#10b981' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              تامین‌کننده (تخلیه)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              تحویل‌گیرنده (بارگیری)
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. LIVE LOADING BAYS & IMMEDIATE ACTIONS (سکوهای بارگیری و صف زنده) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-lg flex items-center gap-2">
              <Flame size={22} className="text-amber-500" />
              مانیتورینگ وضعیت زنده سکوهای بارگیری (Loading Bays)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              وضعیت استقرار تانکرها در بازوهای بارگیری، زمان ورود و تغییر وضعیت سریع
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('queue')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <span>مدیریت کامل صف</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 4 Loading Bays Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {activeBays.map(bay => {
            const isOccupied = bay.item !== null;
            const driver = isOccupied ? drivers.find(d => d.id === bay.item?.driverId) : null;

            return (
              <div
                key={bay.id}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isOccupied
                    ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 shadow-md shadow-blue-500/5'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      {bay.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isOccupied
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isOccupied ? '● در حال بارگیری' : 'آماده پذیرش'}
                    </span>
                  </div>

                  {isOccupied && bay.item ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-white text-sm truncate">
                          {driver?.fullName || 'راننده ناشناس'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <p className="flex justify-between">
                          <span>پلاک:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {driver?.plateNumber || '-'}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span>شماره تانکر:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {driver?.tankNumber || '-'}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span>مقصد:</span>
                          <span className="truncate max-w-[120px] text-slate-700 dark:text-slate-300">
                            {bay.item.destination}
                          </span>
                        </p>
                        <p className="flex justify-between font-mono text-[11px] text-slate-400 pt-1">
                          <span>ورود:</span>
                          <span>{bay.item.entryTime}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                      <Truck size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-medium">هیچ تانکری مستقر نیست</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  {isOccupied && bay.item ? (
                    <button
                      onClick={() => updateQueueStatus(bay.item!.id, 'DONE')}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <CheckCircle2 size={14} />
                      اتمام بارگیری و خروج
                    </button>
                  ) : (
                    queueStats.waitingCount > 0 ? (
                      <button
                        onClick={() => {
                          const nextWaiting = queue.find(q => q.status === 'WAIT');
                          if (nextWaiting) {
                            updateQueueStatus(nextWaiting.id, 'LOADING');
                          }
                        }}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <PlayCircle size={14} />
                        فراخوان نوبت بعدی ({queueStats.waitingCount})
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 text-center w-full block">
                        صف تانکرها خالی است
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tankers Waiting in Queue (Next in line) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              تانکرهای در انتظار ورود به سکو (صف فعال: {queueStats.waitingCount} دستگاه)
            </h4>
            {queue.length === 0 && (
              <button
                onClick={handleSeedDemoData}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <PlusCircle size={13} />
                درج تانکر نمونه برای تست صف
              </button>
            )}
          </div>

          {queueStats.waitingCount === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 text-center text-slate-400 text-xs border border-slate-100 dark:border-slate-800">
              در حال حاضر تانکری در انتظار نوبت نیست. کلیه سکوها آزاد یا بارگیری در جریان است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {queue.filter(q => q.status === 'WAIT').slice(0, 6).map((item, index) => {
                const driver = drivers.find(d => d.id === item.driverId);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        #{index + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate max-w-[140px]">
                          {driver?.fullName || 'راننده'}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          پلاک: {driver?.plateNumber || '-'} | مقصد: {item.destination}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => updateQueueStatus(item.id, 'LOADING')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <PlayCircle size={13} />
                      استقرار در سکو
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default LiveLoadingDischargeDashboard;
