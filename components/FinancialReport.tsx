
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  FileText, 
  Filter, 
  Printer, 
  ChevronDown, 
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Landmark,
  Pencil,
  X,
  Save,
  Calendar
} from 'lucide-react';

type ReportType = 'sales' | 'driver_ledger' | 'company_purchases' | 'expenses' | 'freights' | 'monthly_pnl' | 'exchange';
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
    exchangeTransactions,
    getDriverName,
    getCompanyName,
    updateTransaction,
    updateFreight,
    updateDriverPayment,
    updatePurchase,
    updateExpense,
    updateExchangeTransaction
  } = useData();

  const [reportType, setReportType] = useState<ReportType>('sales');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateRange>('month');
  const [editItem, setEditItem] = useState<{id: string, type: string, description: string} | null>(null);

  // --- Quick Summary Calculation for Current Month ---
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const currentMonthIncome = transactions
        .filter(t => parseInt(t.id) >= startOfMonth)
        .reduce((acc, t) => acc + t.totalPrice, 0);

    const currentMonthExpenses = expenses
        .filter(e => parseInt(e.id) >= startOfMonth)
        .reduce((acc, e) => acc + e.amount, 0) + 
        freights
        .filter(f => parseInt(f.id) >= startOfMonth)
        .reduce((acc, f) => acc + f.amount, 0);

    return { income: currentMonthIncome, expenses: currentMonthExpenses };
  }, [transactions, expenses, freights]);

  const reportData = useMemo(() => {
    let data: any[] = [];
    let summary = { totalIn: 0, totalOut: 0, balance: 0, count: 0 };

    switch (reportType) {
      case 'sales':
        data = transactions.filter(t => (selectedEntityId === 'all' || t.driverId === selectedEntityId)).map(t => ({ ...t, type: 'sale', entityName: getDriverName(t.driverId) }));
        summary.totalIn = data.reduce((acc, curr) => acc + curr.totalPrice, 0);
        summary.balance = summary.totalIn;
        break;

      case 'driver_ledger':
        const dTrans = transactions.filter(t => selectedEntityId === 'all' || t.driverId === selectedEntityId).map(t => ({...t, type: 'credit_transaction', amount: t.freightPrice || 0, entityName: getDriverName(t.driverId)}));
        const dPays = driverPayments.filter(p => selectedEntityId === 'all' || p.driverId === selectedEntityId).map(p => ({...p, type: 'credit_payment', amount: p.amount, entityName: getDriverName(p.driverId)}));
        const dFreights = freights.filter(f => selectedEntityId === 'all' || f.driverId === selectedEntityId).map(f => ({...f, type: 'credit_freight', amount: f.amount, entityName: getDriverName(f.driverId)}));
        data = [...dTrans, ...dPays, ...dFreights].sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
        const lCredits = dFreights.reduce((acc, curr) => acc + curr.amount, 0) + dTrans.reduce((acc, curr) => acc + curr.amount, 0);
        const lDebits = dPays.reduce((acc, curr) => acc + curr.amount, 0);
        summary.totalIn = lCredits; summary.totalOut = lDebits; summary.balance = lCredits - lDebits;
        break;

      case 'exchange':
        data = exchangeTransactions.map(t => ({ ...t, type: 'exchange', entityName: t.exchangeName, amount: t.amountToman }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.amountToman, 0);
        summary.totalIn = data.reduce((acc, curr) => acc + curr.aedAmount, 0); 
        summary.balance = -summary.totalOut;
        break;

      case 'freights':
        data = freights.filter(f => (selectedEntityId === 'all' || f.driverId === selectedEntityId)).map(f => ({ ...f, type: 'freight', entityName: getDriverName(f.driverId) }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.amount, 0);
        break;

      case 'company_purchases':
        data = purchases.filter(p => (selectedEntityId === 'all' || p.companyId === selectedEntityId)).map(p => ({ ...p, type: 'purchase', entityName: getCompanyName(p.companyId) }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.totalPrice, 0);
        break;

      case 'expenses':
        data = expenses.map(e => ({ ...e, type: 'expense', entityName: e.category }));
        summary.totalOut = data.reduce((acc, curr) => acc + curr.amount, 0);
        break;

      case 'monthly_pnl':
        const pnlMap = new Map<string, { sortKey: string, label: string, income: number, cost: number, expense: number, freight: number }>();
        const agg = (id: string, amount: number, field: any) => {
            const ts = parseInt(id); if (isNaN(ts)) return;
            const d = new Date(ts); const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!pnlMap.has(sortKey)) pnlMap.set(sortKey, { sortKey, label: d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' }), income: 0, cost: 0, expense: 0, freight: 0 });
            pnlMap.get(sortKey)![field as 'income'|'cost'|'expense'|'freight'] += amount;
        };
        transactions.forEach(t => { agg(t.id, t.totalPrice, 'income'); if (t.freightPrice) agg(t.id, t.freightPrice, 'freight'); });
        purchases.forEach(p => agg(p.id, p.totalPrice, 'cost'));
        expenses.forEach(e => agg(e.id, e.amount, 'expense'));
        freights.forEach(f => agg(f.id, f.amount, 'freight'));
        data = Array.from(pnlMap.values()).map(i => ({ ...i, netProfit: i.income - (i.cost + i.expense + i.freight), id: i.sortKey })).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
        summary.totalIn = data.reduce((acc, c) => acc + c.income, 0);
        summary.totalOut = data.reduce((acc, c) => acc + c.cost + c.expense + c.freight, 0);
        summary.balance = summary.totalIn - summary.totalOut;
        break;
    }
    
    if (dateFilter !== 'all' && reportType !== 'monthly_pnl') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        data = data.filter(d => {
            const ts = parseInt(d.id); if (isNaN(ts)) return false;
            if (dateFilter === 'today') return ts >= startOfDay;
            if (dateFilter === 'week') return ts >= startOfWeek;
            if (dateFilter === 'month') return ts >= startOfMonth;
            return true;
        });
    }
    summary.count = data.length;
    return { data, summary };
  }, [reportType, selectedEntityId, dateFilter, transactions, driverPayments, freights, purchases, expenses, exchangeTransactions, getDriverName, getCompanyName]);

  const handlePrint = () => window.print();

  const handleEditClick = (item: any) => setEditItem({ id: item.id, type: item.type, description: item.description || item.desc || '' });

  const handleSaveDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const { id, type, description } = editItem;
    switch(type) {
        case 'sale': case 'credit_transaction': updateTransaction(id, { description }); break;
        case 'freight': case 'credit_freight': updateFreight(id, { description }); break;
        case 'credit_payment': updateDriverPayment(id, { description }); break;
        case 'purchase': updatePurchase(id, { description }); break;
        case 'expense': updateExpense(id, { description }); break;
        case 'exchange': updateExchangeTransaction(id, { description } as any); break;
    }
    setEditItem(null);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Monthly Summary Cards - Simplified Request View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div>
                  <h3 className="text-emerald-800 font-bold text-lg mb-1">درآمد کل این ماه</h3>
                  <p className="text-emerald-600 text-xs">مجموع فروش و ورودی‌های جاری</p>
              </div>
              <div className="text-3xl font-black text-emerald-700 flex items-center gap-2" dir="ltr">
                  {monthlySummary.income.toLocaleString()}
                  <ArrowUpRight size={28} className="text-emerald-500" />
              </div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div>
                  <h3 className="text-rose-800 font-bold text-lg mb-1">هزینه کل این ماه</h3>
                  <p className="text-rose-600 text-xs">مجموع هزینه‌های جاری و کرایه‌ها</p>
              </div>
              <div className="text-3xl font-black text-rose-700 flex items-center gap-2" dir="ltr">
                  {monthlySummary.expenses.toLocaleString()}
                  <ArrowDownLeft size={28} className="text-rose-500" />
              </div>
          </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-5 print:hidden">
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Filter size={24} /></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">گزارشات تفصیلی</h2>
                    <p className="text-xs text-slate-500">مشاهده ریز تراکنش‌ها و اسناد مالی</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium">
                    <Printer size={16} /> چاپ گزارش
                </button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">نوع گزارش</label>
                <div className="relative">
                    <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm appearance-none pr-10">
                        <option value="sales">💰 فروش گاز</option>
                        <option value="freights">🚛 کرایه حمل</option>
                        <option value="driver_ledger">📒 صورت‌حساب رانندگان</option>
                        <option value="company_purchases">🏭 خرید از شرکت‌ها</option>
                        <option value="exchange">🏛️ تراکنش‌های صرافی</option>
                        <option value="expenses">🧾 هزینه‌های جاری</option>
                        <option value="monthly_pnl">📈 سود و زیان ماهانه</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">بازه زمانی</label>
                <div className="relative">
                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateRange)} className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm appearance-none pr-10">
                        <option value="all">کل تاریخچه</option>
                        <option value="today">امروز</option>
                        <option value="week">این هفته</option>
                        <option value="month">این ماه</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
            </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                {reportType === 'exchange' ? <><Landmark size={18}/> گزارش صرافی</> : <><FileText size={18}/> لیست تراکنش‌ها</>}
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                {reportData.summary.count} مورد یافت شد
            </span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                    <tr>
                        <th className="px-6 py-4 w-32">تاریخ</th>
                        <th className="px-6 py-4">{reportType === 'expenses' ? 'عنوان' : 'طرف حساب'}</th>
                        {reportType === 'exchange' ? (
                            <>
                                <th className="px-6 py-4">مبلغ (تومان)</th>
                                <th className="px-6 py-4">تحویل (AED)</th>
                                <th className="px-6 py-4">نرخ</th>
                            </>
                        ) : reportType === 'sales' ? (
                            <>
                                <th className="px-6 py-4">حجم</th>
                                <th className="px-6 py-4">مبلغ کل (تومان)</th>
                            </>
                        ) : (
                            <th className="px-6 py-4">مبلغ</th>
                        )}
                        <th className="px-6 py-4">شرح</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reportData.data.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-400 italic">داده‌ای برای نمایش یافت نشد.</td></tr>
                    ) : (
                        reportData.data.map((row: any) => (
                            <tr key={row.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr">{row.date || row.label}</td>
                                <td className="px-6 py-4 font-medium">{row.entityName || row.label}</td>
                                {reportType === 'exchange' ? (
                                    <>
                                        <td className="px-6 py-4 font-bold" dir="ltr">{row.amountToman.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-emerald-700 font-bold" dir="ltr">{row.aedAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-500" dir="ltr">{row.aedRate.toLocaleString()}</td>
                                    </>
                                ) : reportType === 'sales' ? (
                                    <>
                                        <td className="px-6 py-4 font-mono">{row.volume.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600" dir="ltr">{row.totalPrice.toLocaleString()}</td>
                                    </>
                                ) : (
                                    <td className="px-6 py-4 font-bold" dir="ltr">{(row.amount || row.totalPrice || 0).toLocaleString()}</td>
                                )}
                                <td className="px-6 py-4 text-slate-500 max-w-xs relative">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate">{row.description || row.desc || '-'}</span>
                                        <button onClick={() => handleEditClick(row)} className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 print:hidden transition-opacity">
                                            <Pencil size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {editItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Pencil size={18} className="text-blue-600"/>ویرایش توضیحات</h3>
                      <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveDescription} className="p-4 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">توضیحات</label>
                          <textarea value={editItem.description} onChange={e => setEditItem({...editItem!, description: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none outline-none" autoFocus />
                      </div>
                      <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">انصراف</button>
                          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors">
                              <Save size={16} /> ذخیره تغییرات
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
