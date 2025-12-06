
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
  Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

type ReportType = 'sales' | 'driver_ledger' | 'company_purchases' | 'expenses';
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
    getCompanyName
  } = useData();

  // --- Filter States ---
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateRange>('all');

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
        const dTrans = transactions.filter(t => selectedEntityId === 'all' || t.driverId === selectedEntityId).map(t => ({...t, type: 'debit_sale', amount: t.totalPrice, date: t.date, desc: t.description, entityName: getDriverName(t.driverId)}));
        const dPays = driverPayments.filter(p => selectedEntityId === 'all' || p.driverId === selectedEntityId).map(p => ({...p, type: 'credit_payment', amount: p.amount, date: p.date, desc: p.description, entityName: getDriverName(p.driverId)}));
        const dFreights = freights.filter(f => selectedEntityId === 'all' || f.driverId === selectedEntityId).map(f => ({...f, type: 'credit_freight', amount: f.amount, date: f.date, desc: f.description, entityName: getDriverName(f.driverId)}));
        
        data = [...dTrans, ...dPays, ...dFreights].sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
        
        summary.totalOut = dTrans.reduce((acc, curr) => acc + curr.amount, 0); 
        summary.totalIn = [...dPays, ...dFreights].reduce((acc, curr) => acc + curr.amount, 0); 
        summary.balance = summary.totalIn - summary.totalOut; 
        summary.count = data.length;
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
    }
    
    // Apply Precise Date Filter
    if (dateFilter !== 'all') {
        const now = new Date();
        // Start of Today (00:00:00)
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        // Last 7 Days
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        // Start of Current Month
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
        if (reportType === 'sales') {
             summary.totalIn = data.reduce((acc: any, curr: any) => acc + curr.totalPrice, 0);
             summary.balance = summary.totalIn;
        } else if (reportType === 'driver_ledger') {
             const filteredTrans = data.filter((x: any) => x.type === 'debit_sale');
             const filteredCredits = data.filter((x: any) => x.type === 'credit_payment' || x.type === 'credit_freight');
             summary.totalOut = filteredTrans.reduce((acc: any, curr: any) => acc + curr.amount, 0);
             summary.totalIn = filteredCredits.reduce((acc: any, curr: any) => acc + curr.amount, 0);
             summary.balance = summary.totalIn - summary.totalOut;
        } else if (reportType === 'company_purchases') {
             summary.totalOut = data.reduce((acc: any, curr: any) => acc + curr.totalPrice, 0);
             summary.balance = -summary.totalOut;
        } else if (reportType === 'expenses') {
             summary.totalOut = data.reduce((acc: any, curr: any) => acc + curr.amount, 0);
             summary.balance = -summary.totalOut;
        }
        summary.count = data.length;
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
                profit: 0 
            });
        } catch (e) {
            console.error("Date error in initialization", e);
        }
    }

    const processItem = (id: string, amount: number, type: 'income' | 'cost' | 'expense') => {
        const ts = parseInt(id);
        if (isNaN(ts)) return; // Invalid ID
        const date = new Date(ts);
        if (isNaN(date.getTime())) return; // Invalid Date

        try {
            const key = date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'numeric' });
            
            if (monthsMap.has(key)) {
                const entry = monthsMap.get(key)!;
                entry[type] += amount;
                entry.profit = entry.income - entry.cost - entry.expense;
            }
        } catch (e) {
            // Ignore items with date errors
        }
    };

    transactions.forEach(t => processItem(t.id, t.totalPrice, 'income'));
    purchases.forEach(p => processItem(p.id, p.totalPrice, 'cost'));
    expenses.forEach(e => processItem(e.id, e.amount, 'expense'));

    return Array.from(monthsMap.values());
  }, [transactions, purchases, expenses]);


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
        headers = ['تاریخ', 'راننده', 'شرح', 'نوع عملیات', 'بدهکار', 'بستانکار', 'مانده'];
        let balance = 0;
        rows = reportData.data.map((row: any) => {
             const isCredit = row.type === 'credit_payment' || row.type === 'credit_freight';
             if (isCredit) balance += row.amount;
             else balance -= row.amount;
             
             let typeLabel = '';
             if (row.type === 'debit_sale') typeLabel = 'خرید گاز';
             else if (row.type === 'credit_payment') typeLabel = 'واریز وجه';
             else if (row.type === 'credit_freight') typeLabel = 'کرایه حمل';

             return [
                row.date,
                row.entityName,
                row.description || row.desc,
                typeLabel,
                !isCredit ? row.amount : '0',
                isCredit ? row.amount : '0',
                balance
             ]
        });
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
                    <option value="driver_ledger">🚛 صورت‌حساب رانندگان</option>
                    <option value="company_purchases">🏭 خرید از شرکت‌ها</option>
                    <option value="expenses">🧾 هزینه‌های جاری</option>
                </select>
                <ChevronDown className="absolute left-3 top-[34px] text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1">فیلتر بر اساس</label>
                <select 
                    value={selectedEntityId} 
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    disabled={reportType === 'expenses'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg appearance-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                    <option value="all">همه موارد</option>
                    {(reportType === 'sales' || reportType === 'driver_ledger') && (
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg appearance-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">تعداد رکورد</p>
              <h3 className="text-2xl font-bold text-slate-800">{reportData.summary.count}</h3>
          </div>
          
          {reportType === 'driver_ledger' ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">گردش کل</p>
                    <h3 className="text-2xl font-bold text-slate-800" dir="ltr">{(reportData.summary.totalIn + reportData.summary.totalOut).toLocaleString()}</h3>
                </div>
                <div className={`p-4 rounded-xl shadow-sm border ${reportData.summary.balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`${reportData.summary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'} text-xs font-bold uppercase mb-1`}>تراز نهایی</p>
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
                        {reportType === 'sales' ? reportData.summary.totalIn.toLocaleString() : reportData.summary.totalOut.toLocaleString()}
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
                {reportType === 'company_purchases' && <><Building2 size={18}/> لیست خرید از شرکت‌ها</>}
                {reportType === 'expenses' && <><Wallet size={18}/> لیست هزینه‌ها</>}
            </h3>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 w-32">تاریخ</th>
                        <th className="px-6 py-4">{reportType === 'expenses' ? 'عنوان هزینه' : 'طرف حساب'}</th>
                        <th className="px-6 py-4">شرح</th>
                        
                        {reportType === 'sales' && (
                            <>
                                <th className="px-6 py-4">بارنامه</th>
                                <th className="px-6 py-4">حجم</th>
                                <th className="px-6 py-4">مبلغ کل</th>
                            </>
                        )}

                        {reportType === 'driver_ledger' && (
                            <>
                                <th className="px-6 py-4 text-left text-red-600">بدهکار</th>
                                <th className="px-6 py-4 text-left text-emerald-600">بستانکار</th>
                                <th className="px-6 py-4 text-left">مانده</th>
                            </>
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
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reportData.data.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-slate-400">داده‌ای یافت نشد</td></tr>
                    ) : (
                        (() => {
                            let runningBalance = 0;
                            return reportData.data.map((row: any) => {
                                if (reportType === 'driver_ledger') {
                                    if (row.type === 'credit_payment' || row.type === 'credit_freight') {
                                        runningBalance += row.amount;
                                    } else {
                                        runningBalance -= row.amount;
                                    }
                                }

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr">{row.date}</td>
                                        
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {reportType === 'expenses' ? row.title : row.entityName}
                                        </td>
                                        
                                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                            {reportType === 'driver_ledger' ? (
                                                <div className="flex items-center gap-1">
                                                    {row.type === 'debit_sale' && <span className="text-xs bg-slate-200 px-1 rounded">گاز</span>}
                                                    {row.type === 'credit_payment' && <span className="text-xs bg-emerald-100 text-emerald-700 px-1 rounded">واریز</span>}
                                                    {row.type === 'credit_freight' && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">کرایه</span>}
                                                    <span>{row.description || row.desc}</span>
                                                </div>
                                            ) : (
                                                row.description || row.desc || '-'
                                            )}
                                        </td>

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
                                                    {row.type === 'debit_sale' ? row.amount.toLocaleString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-left font-mono text-emerald-600 bg-emerald-50/20">
                                                    {(row.type === 'credit_payment' || row.type === 'credit_freight') ? row.amount.toLocaleString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-left font-mono font-bold" dir="ltr">
                                                    <span className={runningBalance < 0 ? 'text-red-600' : 'text-emerald-600'}>
                                                        {runningBalance.toLocaleString()}
                                                    </span>
                                                </td>
                                            </>
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
                                    </tr>
                                );
                            });
                        })()
                    )}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

export default FinancialReport;
