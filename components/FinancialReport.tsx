
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  FileText, 
  Filter, 
  Printer, 
  Calendar, 
  ChevronDown, 
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Truck,
  Building2,
  TrendingUp,
  Download,
  PieChart,
  Pencil,
  X,
  Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

type ReportType = 'sales' | 'driver_ledger' | 'company_purchases' | 'expenses' | 'freights' | 'monthly_pnl';
type DateRange = 'all' | 'today' | 'week' | 'month';

const FinancialReport: React.FC = () => {
  const { 
    drivers, 
    transactions, 
    driverPayments, 
    freights, 
    companies, 
    purchases, 
    expenses,
    getDriverName,
    getCompanyName,
    updateTransaction,
    updateFreight,
    updateDriverPayment,
    updatePurchase,
    updateExpense
  } = useData();

  // --- Filter States ---
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateRange>('all');
  
  // --- Edit Description State ---
  const [editItem, setEditItem] = useState<{id: string, type: string, description: string} | null>(null);

  // --- Data Processing for Table ---
  const reportData = useMemo(() => {
    let data: any[] = [];
    let summary = { totalIn: 0, totalOut: 0, balance: 0, count: 0 };

    switch (reportType) {
      case 'sales':
        data = transactions.filter(t => 
          (selectedEntityId === 'all' || t.driverId === selectedEntityId)
        ).map(t => ({
            ...t,
            type: 'sale',
            entityName: getDriverName(t.driverId)
        }));
        summary.totalIn = data.reduce((acc, curr) => acc + curr.totalPrice, 0);
        summary.count = data.length;
        summary.balance = summary.totalIn;
        break;

      case 'driver_ledger':
        // Updated Logic: Transactions are now CREDITS (Driver Earnings)
        const dTrans = transactions.filter(t => selectedEntityId === 'all' || t.driverId === selectedEntityId).map(t => ({...t, type: 'credit_transaction', amount: t.totalPrice, date: t.date, desc: t.description, entityName: getDriverName(t.driverId)}));
        const dPays = driverPayments.filter(p => selectedEntityId === 'all' || p.driverId === selectedEntityId).map(p => ({...p, type: 'credit_payment', amount: p.amount, date: p.date, desc: p.description, entityName: getDriverName(p.driverId)}));
        const dFreights = freights.filter(f => selectedEntityId === 'all' || f.driverId === selectedEntityId).map(f => ({...f, type: 'credit_freight', amount: f.amount, date: f.date, desc: f.description, entityName: getDriverName(f.driverId)}));
        
        data = [...dTrans, ...dPays, ...dFreights].sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
        
        const ledgerDebits = dPays.reduce((acc, curr) => acc + curr.amount, 0); // Payments to driver
        const ledgerCredits = dFreights.reduce((acc, curr) => acc + curr.amount, 0) + dTrans.reduce((acc, curr) => acc + curr.amount, 0); // Freights + Gas Load Costs
        
        summary.totalOut = ledgerDebits; 
        summary.totalIn = ledgerCredits; 
        summary.balance = ledgerCredits - ledgerDebits; // Balance owed to driver
        summary.count = data.length;
        break;

      case 'freights':
        data = freights.filter(f => 
           (selectedEntityId === 'all' || f.driverId === selectedEntityId)
        ).map(f => ({
            ...f,
            type: 'freight',
            entityName: getDriverName(f.driverId)
        }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.amount, 0);
        summary.count = data.length;
        summary.balance = -summary.totalOut;
        break;

      case 'company_purchases':
        data = purchases.filter(p => 
           (selectedEntityId === 'all' || p.companyId === selectedEntityId)
        ).map(p => ({
            ...p,
            type: 'purchase',
            entityName: getCompanyName(p.companyId)
        }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.totalPrice, 0);
        summary.count = data.length;
        summary.balance = -summary.totalOut;
        break;

      case 'expenses':
        data = expenses.map(e => ({
            ...e,
            type: 'expense',
            entityName: e.category
        }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.amount, 0);
        summary.count = data.length;
        summary.balance = -summary.totalOut;
        break;

      case 'monthly_pnl':
        const pnlMap = new Map<string, { sortKey: string, label: string, income: number, cost: number, expense: number, freight: number }>();
        
        const agg = (id: string, amount: number, field: 'income' | 'cost' | 'expense' | 'freight') => {
            const ts = parseInt(id);
            if (isNaN(ts)) return;
            const d = new Date(ts);
            // Group by Year-Month
            const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' });

            if (!pnlMap.has(sortKey)) {
                pnlMap.set(sortKey, { sortKey, label, income: 0, cost: 0, expense: 0, freight: 0 });
            }
            const rec = pnlMap.get(sortKey)!;
            rec[field] += amount;
        };

        // Note: Transactions are treated as Income here still, based on original logic, though they act as Cost for driver balance now.
        // If we want consistency, transactions should be COSTS here too, but that leaves no Income source defined in the app.
        // Assuming dual nature or keeping P&L separate from driver ledger for now.
        transactions.forEach(t => agg(t.id, t.totalPrice, 'income'));
        purchases.forEach(p => agg(p.id, p.totalPrice, 'cost'));
        expenses.forEach(e => agg(e.id, e.amount, 'expense'));
        freights.forEach(f => agg(f.id, f.amount, 'freight'));

        data = Array.from(pnlMap.values())
            .map(item => ({
                ...item,
                netProfit: item.income - (item.cost + item.expense + item.freight),
                id: item.sortKey
            }))
            .sort((a, b) => b.sortKey.localeCompare(a.sortKey));

        summary.totalIn = data.reduce((acc, c) => acc + c.income, 0);
        summary.totalOut = data.reduce((acc, c) => acc + c.cost + c.expense + c.freight, 0);
        summary.balance = summary.totalIn - summary.totalOut;
        summary.count = data.length;
        break;
    }
    
    // Apply Precise Date Filter (Skipped for monthly_pnl)
    if (dateFilter !== 'all' && reportType !== 'monthly_pnl') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        
        data = data.filter(d => {
            const ts = parseInt(d.id);
            if (isNaN(ts)) return false;

            if (dateFilter === 'today') return ts >= startOfDay;
            if (dateFilter === 'week') return ts >= startOfWeek;
            if (dateFilter === 'month') return ts >= startOfMonth;
            
            return true;
        });

        // Recalculate summary after filtering
        summary.totalIn = 0;
        summary.totalOut = 0;
        summary.balance = 0;
        summary.count = data.length;

        if (reportType === 'sales') {
             summary.totalIn = data.reduce((acc: any, curr: any) => acc + curr.totalPrice, 0);
             summary.balance = summary.totalIn;
        } else if (reportType === 'driver_ledger') {
             const ledgerCredits = data.filter((x:any) => x.type === 'credit_freight' || x.type === 'credit_transaction').reduce((acc:any, c:any) => acc + c.amount, 0);
             const ledgerDebits = data.filter((x:any) => x.type === 'credit_payment').reduce((acc:any, c:any) => acc + c.amount, 0);
             summary.totalIn = ledgerCredits;
             summary.totalOut = ledgerDebits;
             summary.balance = ledgerCredits - ledgerDebits;
        } else if (reportType === 'company_purchases' || reportType === 'expenses' || reportType === 'freights') {
             const amountKey = reportType === 'company_purchases' ? 'totalPrice' : 'amount';
             summary.totalOut = data.reduce((acc: any, curr: any) => acc + curr[amountKey], 0);
             summary.balance = -summary.totalOut;
        }
    }

    return { data, summary };
  }, [reportType, selectedEntityId, dateFilter, transactions, driverPayments, freights, purchases, expenses]);


  // --- 12-Month Net Profit Data Calculation ---
  const profitTrendData = useMemo(() => {
    const monthsMap = new Map<string, { 
        name: string, 
        sortKey: number, 
        income: number, 
        cost: number, 
        expense: number, 
        freight: number,
        profit: number 
    }>();

    // Initialize last 12 months buckets
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        try {
            const monthName = d.toLocaleDateString('fa-IR', { month: 'long' });
            const yearMonthKey = d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric' });
            
            monthsMap.set(yearMonthKey, { 
                name: monthName, 
                sortKey: i,
                income: 0, 
                cost: 0, 
                expense: 0, 
                freight: 0,
                profit: 0 
            });
        } catch (e) {
            console.error("Date error in initialization", e);
        }
    }

    const processItem = (id: string, amount: number, type: 'income' | 'cost' | 'expense' | 'freight') => {
        const ts = parseInt(id);
        if (isNaN(ts)) return; 
        const date = new Date(ts);
        if (isNaN(date.getTime())) return; 

        try {
            const key = date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric' });
            
            if (monthsMap.has(key)) {
                const entry = monthsMap.get(key)!;
                entry[type] += amount;
                entry.profit = entry.income - entry.cost - entry.expense - entry.freight;
            }
        } catch (e) {
            // Ignore
        }
    };

    transactions.forEach(t => processItem(t.id, t.totalPrice, 'income'));
    purchases.forEach(p => processItem(p.id, p.totalPrice, 'cost'));
    expenses.forEach(e => processItem(e.id, e.amount, 'expense'));
    freights.forEach(f => processItem(f.id, f.amount, 'freight'));

    return Array.from(monthsMap.values());
  }, [transactions, purchases, expenses, freights]);


  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData.data || reportData.data.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');

    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'sales') {
        headers = ['تاریخ', 'راننده', 'شرح', 'بارنامه', 'حجم', 'مبلغ کل'];
        rows = reportData.data.map((row: any) => [
            row.date,
            row.entityName,
            row.description,
            row.billOfLading || '',
            row.volume,
            row.totalPrice
        ]);
    } else if (reportType === 'driver_ledger') {
        headers = ['تاریخ', 'راننده', 'شرح', 'نوع عملیات', 'بدهکار', 'بستانکار'];
        rows = reportData.data.map((row: any) => {
             const isCredit = row.type === 'credit_payment' || row.type === 'credit_freight' || row.type === 'credit_transaction';
             let typeLabel = '';
             if (row.type === 'credit_transaction') typeLabel = 'هزینه بار گاز';
             else if (row.type === 'credit_payment') typeLabel = 'واریز وجه';
             else if (row.type === 'credit_freight') typeLabel = 'کرایه حمل';

             return [
                row.date,
                row.entityName,
                row.description || row.desc,
                typeLabel,
                row.type === 'credit_payment' ? row.amount : '0',
                row.type !== 'credit_payment' ? row.amount : '0',
             ]
        });
    } else if (reportType === 'freights') {
        headers = ['تاریخ', 'راننده', 'مبدا', 'مقصد', 'کد رهگیری', 'توضیحات', 'مبلغ کرایه'];
        rows = reportData.data.map((row: any) => [
            row.date,
            row.entityName,
            row.origin,
            row.destination,
            row.trackingCode || '',
            row.description,
            row.amount
        ]);
    } else if (reportType === 'company_purchases') {
        headers = ['تاریخ', 'شرکت', 'شرح', 'حجم', 'مبلغ کل'];
        rows = reportData.data.map((row: any) => [
            row.date,
            row.entityName,
            row.description,
            row.volume,
            row.totalPrice
        ]);
    } else if (reportType === 'expenses') {
        headers = ['تاریخ', 'عنوان', 'دسته‌بندی', 'شرح', 'مبلغ'];
        rows = reportData.data.map((row: any) => [
            row.date,
            row.title,
            row.category,
            row.description,
            row.amount
        ]);
    } else if (reportType === 'monthly_pnl') {
        headers = ['ماه', 'درآمد فروش', 'هزینه خرید', 'هزینه کرایه', 'هزینه جاری', 'سود خالص'];
        rows = reportData.data.map((row: any) => [
            row.label,
            row.income,
            row.cost,
            row.freight,
            row.expense,
            row.netProfit
        ]);
    }

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${reportType}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (item: any) => {
    setEditItem({
        id: item.id,
        type: item.type,
        description: item.description || item.desc || ''
    });
  };

  const handleSaveDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    
    const { id, type, description } = editItem;
    
    switch(type) {
        case 'sale':
        case 'credit_transaction':
             updateTransaction(id, { description });
             break;
        case 'freight':
        case 'credit_freight':
             updateFreight(id, { description });
             break;
        case 'credit_payment':
             updateDriverPayment(id, { description });
             break;
        case 'purchase':
             updatePurchase(id, { description });
             break;
        case 'expense':
             updateExpense(id, { description });
             break;
    }
    setEditItem(null);
  };

  return (
    <div className="space-y-6 min-h-screen pb-20">
      
      {/* Control Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Filter size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">گزارش‌گیری پیشرفته</h2>
                    <p className="text-xs text-slate-500">فیلتر و مشاهده جزئیات مالی سیستم</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                    <Download size={16} /> خروجی اکسل
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                >
                    <Printer size={16} /> چاپ گزارش
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">نوع گزارش</label>
                <select 
                    value={reportType} 
                    onChange={(e) => {
                        setReportType(e.target.value as ReportType);
                        setSelectedEntityId('all');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg appearance-none text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="sales">💰 فروش گاز (تراکنش‌ها)</option>
                    <option value="freights">🚛 کرایه حمل (هزینه)</option>
                    <option value="driver_ledger">📒 صورت‌حساب رانندگان</option>
                    <option value="company_purchases">🏭 خرید از شرکت‌ها</option>
                    <option value="expenses">🧾 هزینه‌های جاری</option>
                    <option value="monthly_pnl">📈 سود و زیان ماهانه</option>
                </select>
                <ChevronDown className="absolute left-3 top-[34px] text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">فیلتر بر اساس</label>
                <select 
                    value={selectedEntityId} 
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    disabled={reportType === 'expenses' || reportType === 'monthly_pnl'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg appearance-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                    <option value="all">همه موارد</option>
                    {(reportType === 'sales' || reportType === 'driver_ledger' || reportType === 'freights') && (
                        <optgroup label="رانندگان">
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.fullName}</option>
                            ))}
                        </optgroup>
                    )}
                    {(reportType === 'company_purchases') && (
                        <optgroup label="شرکت‌ها">
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>
                <Search className="absolute left-3 top-[34px] text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">بازه زمانی</label>
                <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value as DateRange)}
                    disabled={reportType === 'monthly_pnl'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg appearance-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                    <option value="all">کل تاریخچه</option>
                    <option value="today">امروز</option>
                    <option value="week">این هفته</option>
                    <option value="month">این ماه</option>
                </select>
                <Calendar className="absolute left-3 top-[34px] text-slate-400 pointer-events-none" size={16} />
            </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">{reportType === 'monthly_pnl' ? 'تعداد ماه‌ها' : 'تعداد رکورد'}</p>
              <h3 className="text-2xl font-bold text-slate-800">{reportData.summary.count}</h3>
          </div>
          
          {reportType === 'driver_ledger' ? (
               <>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">مانده طلب رانندگان</p>
                    <h3 className={`text-2xl font-bold ${reportData.summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} dir="ltr">
                        {Math.abs(reportData.summary.balance).toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                     <p className="text-slate-500 text-xs font-bold uppercase mb-1">وضعیت</p>
                     <h3 className="text-lg font-bold text-slate-700">
                         {reportData.summary.balance >= 0 ? 'بستانکار (طلبکار)' : 'بدهکار'}
                     </h3>
                </div>
               </>
          ) : reportType === 'monthly_pnl' ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">
                        مجموع درآمد کل
                    </p>
                    <h3 className="text-2xl font-bold text-emerald-600" dir="ltr">
                        {reportData.summary.totalIn.toLocaleString()}
                    </h3>
                </div>
                <div className={`p-4 rounded-xl shadow-sm border ${reportData.summary.balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`${reportData.summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'} text-xs font-bold uppercase mb-1`}>
                        سود خالص کل
                    </p>
                    <h3 className={`text-2xl font-bold ${reportData.summary.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`} dir="ltr">
                        {reportData.summary.balance.toLocaleString()}
                    </h3>
                </div>
              </>
          ) : (
              <>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">
                        {reportType === 'sales' ? 'جمع کل فروش' : 'جمع کل هزینه'}
                    </p>
                    <h3 className={`text-2xl font-bold ${reportType === 'sales' ? 'text-indigo-600' : 'text-rose-600'}`} dir="ltr">
                        {reportType === 'sales' 
                            ? reportData.summary.totalIn.toLocaleString() 
                            : reportData.summary.totalOut.toLocaleString()}
                    </h3>
                </div>
              </>
          )}
      </div>

      {/* Profit Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
        <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-slate-800">روند سود خالص (۱۲ ماه گذشته)</h3>
        </div>
        <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                    <YAxis fontSize={10} stroke="#94a3b8" tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} />
                    <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => value.toLocaleString()}
                            labelStyle={{ fontFamily: 'inherit' }}
                    />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {profitTrendData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Dynamic Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                {reportType === 'sales' && <><FileText size={18}/> لیست تراکنش‌های فروش</>}
                {reportType === 'driver_ledger' && <><Truck size={18}/> ریز حساب رانندگان</>}
                {reportType === 'freights' && <><Truck size={18}/> لیست کرایه‌های حمل (هزینه)</>}
                {reportType === 'company_purchases' && <><Building2 size={18}/> لیست خرید از شرکت‌ها</>}
                {reportType === 'expenses' && <><Wallet size={18}/> لیست هزینه‌ها</>}
                {reportType === 'monthly_pnl' && <><PieChart size={18}/> گزارش سود و زیان ماهانه</>}
            </h3>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 w-32">{reportType === 'monthly_pnl' ? 'ماه' : 'تاریخ'}</th>
                        
                        {reportType !== 'monthly_pnl' && (
                            <>
                                <th className="px-6 py-4">{reportType === 'expenses' ? 'عنوان هزینه' : 'طرف حساب'}</th>
                                {reportType === 'freights' && (
                                    <>
                                        <th className="px-6 py-4">مبدا</th>
                                        <th className="px-6 py-4">مقصد</th>
                                        <th className="px-6 py-4">کد رهگیری</th>
                                    </>
                                )}
                                <th className="px-6 py-4">شرح / عملیات</th>
                            </>
                        )}
                        
                        {reportType === 'sales' && (
                            <>
                                <th className="px-6 py-4">بارنامه</th>
                                <th className="px-6 py-4">حجم</th>
                                <th className="px-6 py-4">مبلغ کل</th>
                            </>
                        )}

                        {reportType === 'driver_ledger' && (
                            <>
                                <th className="px-6 py-4 text-left text-red-600">بدهکار (پرداخت)</th>
                                <th className="px-6 py-4 text-left text-emerald-600">بستانکار (کرایه/گاز)</th>
                            </>
                        )}

                        {reportType === 'freights' && (
                            <th className="px-6 py-4 font-bold">مبلغ کرایه</th>
                        )}

                        {reportType === 'company_purchases' && (
                            <>
                                <th className="px-6 py-4">حجم</th>
                                <th className="px-6 py-4">مبلغ کل</th>
                            </>
                        )}

                        {reportType === 'expenses' && (
                            <>
                                <th className="px-6 py-4">دسته‌بندی</th>
                                <th className="px-6 py-4">مبلغ</th>
                            </>
                        )}

                        {reportType === 'monthly_pnl' && (
                            <>
                                <th className="px-6 py-4">درآمد فروش</th>
                                <th className="px-6 py-4">هزینه خرید</th>
                                <th className="px-6 py-4 text-orange-600">هزینه کرایه</th>
                                <th className="px-6 py-4">هزینه‌های جاری</th>
                                <th className="px-6 py-4">سود خالص</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reportData.data.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-8 text-slate-400">داده‌ای یافت نشد</td></tr>
                    ) : (
                        reportData.data.map((row: any) => (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr">{reportType === 'monthly_pnl' ? row.label : row.date}</td>
                                
                                {reportType !== 'monthly_pnl' && (
                                    <>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {reportType === 'expenses' ? row.title : row.entityName}
                                        </td>

                                        {reportType === 'freights' && (
                                            <>
                                                <td className="px-6 py-4 text-slate-600">{row.origin}</td>
                                                <td className="px-6 py-4 text-slate-600">{row.destination}</td>
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{row.trackingCode || '-'}</td>
                                            </>
                                        )}
                                        
                                        <td className="px-6 py-4 text-slate-500 max-w-xs relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="truncate flex-1">
                                                    {reportType === 'driver_ledger' ? (
                                                        <div className="flex items-center gap-1">
                                                            {row.type === 'credit_transaction' && <span className="text-xs bg-slate-200 px-1 rounded">گاز</span>}
                                                            {row.type === 'credit_payment' && <span className="text-xs bg-emerald-100 text-emerald-700 px-1 rounded">واریز</span>}
                                                            {row.type === 'credit_freight' && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">کرایه</span>}
                                                            <span>{row.description || row.desc}</span>
                                                        </div>
                                                    ) : (
                                                        row.description || row.desc || '-'
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => handleEditClick(row)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all print:hidden"
                                                    title="ویرایش توضیحات"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}

                                {reportType === 'sales' && (
                                    <>
                                        <td className="px-6 py-4 font-mono text-xs">{row.billOfLading || '-'}</td>
                                        <td className="px-6 py-4">{row.volume}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">${row.totalPrice.toLocaleString()}</td>
                                    </>
                                )}

                                {reportType === 'driver_ledger' && (
                                    <>
                                        <td className="px-6 py-4 text-left font-mono text-red-600 bg-red-50/20">
                                            {row.type === 'credit_payment' ? row.amount.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-left font-mono text-emerald-600 bg-emerald-50/20">
                                            {row.type !== 'credit_payment' ? row.amount.toLocaleString() : '-'}
                                        </td>
                                    </>
                                )}

                                {reportType === 'freights' && (
                                    <td className="px-6 py-4 font-bold text-orange-600" dir="ltr">{row.amount.toLocaleString()}</td>
                                )}

                                {reportType === 'company_purchases' && (
                                    <>
                                        <td className="px-6 py-4">{row.volume}</td>
                                        <td className="px-6 py-4 font-bold text-rose-700" dir="ltr">${row.totalPrice.toLocaleString()}</td>
                                    </>
                                )}

                                {reportType === 'expenses' && (
                                    <>
                                        <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{row.category}</span></td>
                                        <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">${row.amount.toLocaleString()}</td>
                                    </>
                                )}

                                {reportType === 'monthly_pnl' && (
                                    <>
                                        <td className="px-6 py-4 text-emerald-600 font-medium" dir="ltr">{row.income.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-rose-500" dir="ltr">{row.cost.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-orange-500" dir="ltr">{row.freight.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-500" dir="ltr">{row.expense.toLocaleString()}</td>
                                        <td className={`px-6 py-4 font-bold ${row.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`} dir="ltr">
                                            {row.netProfit.toLocaleString()}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Edit Description Modal */}
      {editItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Pencil size={18} className="text-blue-600"/>
                          ویرایش توضیحات
                      </h3>
                      <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X size={20}/>
                      </button>
                  </div>
                  <form onSubmit={handleSaveDescription} className="p-4 space-y-4">
                      <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 mb-2">
                          در حال ویرایش جزئیات برای رکورد #{editItem.id.slice(-6)}
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">توضیحات / شرح</label>
                          <textarea 
                              value={editItem.description} 
                              onChange={e => setEditItem({...editItem, description: e.target.value})} 
                              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                              placeholder="توضیحات را وارد کنید..."
                              autoFocus
                          />
                      </div>
                      <div className="flex gap-2 justify-end">
                          <button 
                              type="button" 
                              onClick={() => setEditItem(null)}
                              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                          >
                              انصراف
                          </button>
                          <button 
                              type="submit" 
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                              <Save size={16} />
                              ذخیره تغییرات
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default FinancialReport;
