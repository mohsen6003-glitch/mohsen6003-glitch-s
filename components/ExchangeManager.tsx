
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Landmark, Plus, Calendar, Hash, User, RefreshCw, Printer, Download, Trash2, Coins, Calculator, FileDown, History, Settings2, CheckSquare, Square, X, Building2, Phone, MapPin, Pencil, Save, FileText, Filter, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

type DateFilterType = 'all' | 'today' | 'week' | 'month';

const ExchangeManager: React.FC = () => {
  const { exchangeTransactions, addExchangeTransaction, updateExchangeTransaction, deleteExchangeTransaction, exchangeRates, exchanges, addExchange, deleteExchange } = useData();
  const [activeTab, setActiveTab] = useState<'transactions' | 'offices'>('transactions');
  
  // Filtering States
  const [nameFilter, setNameFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  // Transaction Form
  const [form, setForm] = useState({
    exchangeName: '',
    amountToman: '',
    accountHolder: '',
    aedRate: '',
    aedDepositDate: '',
    aedAmount: '',
    aedDeliveryDate: '',
    receiverName: '',
    accountCode: '',
    description: ''
  });

  // Exchange Office Form
  const [officeForm, setOfficeForm] = useState({
      name: '',
      phone: '',
      address: ''
  });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [editItem, setEditItem] = useState<{id: string, description: string} | null>(null);

  // --- History Modal States ---
  const [historyExchangeName, setHistoryExchangeName] = useState<string | null>(null);
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);

  // Filtered Data logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return exchangeTransactions.filter(t => {
        // Name Filter
        if (nameFilter !== 'all' && t.exchangeName !== nameFilter) return false;

        // Date Filter
        if (dateFilter === 'all') return true;
        const ts = parseInt(t.id);
        if (isNaN(ts)) return false;
        if (dateFilter === 'today') return ts >= startOfDay;
        if (dateFilter === 'week') return ts >= startOfWeek;
        if (dateFilter === 'month') return ts >= startOfMonth;
        return true;
    }).slice().reverse();
  }, [exchangeTransactions, nameFilter, dateFilter]);

  // Stats based on filtered data
  const stats = useMemo(() => {
    const totalToman = filteredTransactions.reduce((acc, t) => acc + t.amountToman, 0);
    const totalAed = filteredTransactions.reduce((acc, t) => acc + t.aedAmount, 0);
    const avgRate = totalAed > 0 ? (totalToman / totalAed) : 0;
    return { totalToman, totalAed, avgRate };
  }, [filteredTransactions]);

  useEffect(() => {
      if (!form.aedRate && exchangeRates.aed > 0) {
          setForm(prev => ({...prev, aedRate: exchangeRates.aed.toString()}));
      }
  }, [exchangeRates.aed]);

  const estimatedAed = () => {
      const tom = parseFloat(form.amountToman) || 0;
      const rate = parseFloat(form.aedRate) || 0;
      if (tom > 0 && rate > 0) return (tom / rate).toFixed(2);
      return '0';
  };

  const handleOfficeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!officeForm.name) return alert("نام صرافی الزامی است.");
      addExchange(officeForm);
      setOfficeForm({ name: '', phone: '', address: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.exchangeName || !form.amountToman || !form.aedRate || !form.aedAmount) {
        return alert("لطفا فیلدهای ستاره‌دار را تکمیل کنید.");
    }

    addExchangeTransaction({
        exchangeName: form.exchangeName,
        amountToman: parseFloat(form.amountToman),
        accountHolder: form.accountHolder,
        aedRate: parseFloat(form.aedRate),
        aedDepositDate: form.aedDepositDate || new Date().toLocaleDateString('fa-IR'),
        aedAmount: parseFloat(form.aedAmount),
        aedDeliveryDate: form.aedDeliveryDate,
        receiverName: form.receiverName,
        accountCode: form.accountCode,
        description: form.description
    });

    setForm({
        exchangeName: '', amountToman: '', accountHolder: '', aedRate: form.aedRate,
        aedDepositDate: '', aedAmount: '', aedDeliveryDate: '', receiverName: '', accountCode: '', description: ''
    });
    alert("تراکنش صرافی با موفقیت ثبت شد.");
  };

  const handleDelete = (id: string) => {
      if (window.confirm('آیا از حذف این تراکنش اطمینان دارید؟')) deleteExchangeTransaction(id);
  };
  
  const handleDeleteOffice = (id: string, name: string) => {
       if (window.confirm(`آیا از حذف صرافی "${name}" اطمینار دارید؟`)) deleteExchange(id);
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
      if (filteredTransactions.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      const headers = ['نام صرافی', 'مبلغ (تومان)', 'واریز حساب شخص', 'نرخ درهم', 'تاریخ واریز درهم', 'تحویل درهم', 'تاریخ تحویل درهم', 'نام گیرنده', 'کد حساب', 'توضیحات'];
      const rows = filteredTransactions.map(t => [t.exchangeName, t.amountToman, t.accountHolder, t.aedRate, t.aedDepositDate, t.aedAmount, t.aedDeliveryDate, t.receiverName, t.accountCode, t.description]);
      const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `exchange_transactions_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
      const input = document.getElementById('exchange-table-container');
      if (input) {
          setIsExportingPdf(true);
          try {
              const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff', onclone: (clonedDoc) => {
                  const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden');
                  hiddenElements.forEach((el: any) => el.style.display = 'none');
              }});
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`exchange_transactions.pdf`);
          } catch (err) { alert("خطا در ایجاد PDF"); } finally { setIsExportingPdf(false); }
      }
  };

  const handleEditClick = (t: any) => setEditItem({ id: t.id, description: t.description || '' });

  const handleSaveDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
        updateExchangeTransaction(editItem.id, { description: editItem.description } as any);
        setEditItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                  <h3 className="text-indigo-800 font-bold text-lg mb-1">کل حواله (تومان)</h3>
                  <p className="text-indigo-600 text-xs">مجموع حواله در دوره انتخابی</p>
              </div>
              <div className="text-xl font-bold text-indigo-700" dir="ltr">{stats.totalToman.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                  <h3 className="text-emerald-800 font-bold text-lg mb-1">کل دریافتی (AED)</h3>
                  <p className="text-emerald-600 text-xs">مجموع درهم دریافتی در دوره</p>
              </div>
              <div className="text-xl font-bold text-emerald-700 font-mono" dir="ltr">{stats.totalAed.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                  <h3 className="text-slate-800 font-bold text-lg mb-1">میانگین نرخ</h3>
                  <p className="text-slate-600 text-xs">نرخ موثر در دوره انتخابی</p>
              </div>
              <div className="text-xl font-bold text-slate-700" dir="ltr">{Math.round(stats.avgRate).toLocaleString()}</div>
          </div>
      </div>
      
      {/* Tabs */}
      <div className="flex p-1 bg-slate-200 rounded-lg w-fit print:hidden">
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'transactions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>تراکنش‌ها</button>
        <button onClick={() => setActiveTab('offices')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'offices' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>لیست صرافی‌ها</button>
      </div>

      {activeTab === 'offices' && (
          <div className="space-y-6 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Building2 size={24} /></div>
                    <h2 className="text-xl font-bold text-slate-800">تعریف صرافی جدید</h2>
                 </div>
                 <form onSubmit={handleOfficeSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">نام صرافی</label><input value={officeForm.name} onChange={e => setOfficeForm({...officeForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="نام..." /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">تلفن</label><input value={officeForm.phone} onChange={e => setOfficeForm({...officeForm, phone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="تلفن..." /></div>
                    <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label><input value={officeForm.address} onChange={e => setOfficeForm({...officeForm, address: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="آدرس..." /></div>
                    <button type="submit" className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2"><Plus size={18} /> ثبت</button>
                 </form>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exchanges.map(ex => (
                      <div key={ex.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                          <div><div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg text-slate-800">{ex.name}</h3><button onClick={() => handleDeleteOffice(ex.id, ex.name)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                          <div className="space-y-1 text-sm text-slate-500"><div className="flex items-center gap-2"><Phone size={14}/> {ex.phone || '-'}</div><div className="flex items-center gap-2"><MapPin size={14}/> {ex.address || '-'}</div></div></div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'transactions' && (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden animate-in fade-in">
            <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Landmark size={24} /></div><h2 className="text-xl font-bold text-slate-800">ثبت تراکنش جدید</h2></div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">صرافی *</label>{exchanges.length > 0 ? (<select value={form.exchangeName} onChange={e => setForm({...form, exchangeName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg"><option value="">انتخاب کنید...</option>{exchanges.map(ex => (<option key={ex.id} value={ex.name}>{ex.name}</option>))}</select>) : (<input value={form.exchangeName} onChange={e => setForm({...form, exchangeName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="نام صرافی..." />)}</div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">مبلغ (تومان) *</label><input type="number" value={form.amountToman} onChange={e => setForm({...form, amountToman: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">نرخ درهم *</label><input type="number" value={form.aedRate} onChange={e => setForm({...form, aedRate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">تحویل درهم * (تخمین: {estimatedAed()})</label><input type="number" value={form.aedAmount} onChange={e => setForm({...form, aedAmount: e.target.value})} className="w-full p-2 border border-slate-600 bg-slate-700 text-white rounded-lg font-bold" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">واریز حساب شخص</label><input value={form.accountHolder} onChange={e => setForm({...form, accountHolder: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">نام گیرنده</label><input value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" /></div>
                <div className="lg:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="شرح تراکنش..." /></div>
                <div className="lg:col-span-4"><button type="submit" className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2"><Plus size={18} /> ثبت تراکنش</button></div>
            </form>
        </div>

        {/* Filter Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500">
                    <Filter size={18} />
                </div>
                <div className="relative flex-1 md:flex-none md:w-64">
                    <select 
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="all">همه صرافی‌ها</option>
                        {exchanges.map(ex => (
                            <option key={ex.id} value={ex.name}>{ex.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <Landmark className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
                </div>
                <div className="relative flex-1 md:flex-none md:w-48">
                    <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                        className="w-full pr-10 pl-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="all">همه زمان‌ها</option>
                        <option value="today">امروز</option>
                        <option value="week">یک هفته اخیر</option>
                        <option value="month">یک ماه اخیر</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handleExportPDF} disabled={isExportingPdf} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                    <FileDown size={18} /> PDF
                </button>
                <button onClick={handleExportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium">
                    <Download size={18} /> اکسل
                </button>
                <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium">
                    <Printer size={18} /> چاپ
                </button>
            </div>
        </div>

        <div id="exchange-table-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                        <tr>
                            <th className="px-4 py-3">نام صرافی</th>
                            <th className="px-4 py-3">مبلغ (T)</th>
                            <th className="px-4 py-3">نرخ</th>
                            <th className="px-4 py-3">تحویل (AED)</th>
                            <th className="px-4 py-3">تاریخ تحویل</th>
                            <th className="px-4 py-3">گیرنده / حساب</th>
                            <th className="px-4 py-3">شرح</th>
                            <th className="px-4 py-3 print:hidden">عملیات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 italic">تراکنشی با فیلترهای انتخابی یافت نشد.</td>
                            </tr>
                        ) : (
                            filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
                                    <td className="px-4 py-3 font-medium flex items-center justify-between">{t.exchangeName} <button onClick={() => setHistoryExchangeName(t.exchangeName)} className="opacity-0 group-hover:opacity-100 p-1 bg-slate-100 rounded-full hover:bg-indigo-100 hover:text-indigo-600 transition-all" title="مشاهده تاریخچه"><History size={12}/></button></td>
                                    <td className="px-4 py-3 font-bold text-slate-700" dir="ltr">{t.amountToman.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-600" dir="ltr">{t.aedRate.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-bold text-emerald-700" dir="ltr">{t.aedAmount.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-500">{t.aedDeliveryDate || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600"><div>{t.receiverName}</div><div className="text-[10px] text-slate-400">{t.accountHolder}</div></td>
                                    <td className="px-4 py-3 text-slate-500 max-w-xs relative"><div className="flex items-center justify-between gap-2"><span className="truncate">{t.description || '-'}</span><button onClick={() => handleEditClick(t)} className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all print:hidden"><Pencil size={12} /></button></div></td>
                                    <td className="px-4 py-3 print:hidden"><button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-500 p-1.5 transition-colors"><Trash2 size={16} /></button></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </>
      )}

      {/* Edit Description Modal */}
      {editItem && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-slate-50 p-4 border-b flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Pencil size={18} className="text-blue-600"/>ویرایش توضیحات تراکنش</h3><button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button></div>
                  <form onSubmit={handleSaveDescription} className="p-4 space-y-4">
                      <div><label className="block text-sm font-medium text-slate-700 mb-2">توضیحات</label><textarea value={editItem.description} onChange={e => setEditItem({...editItem!, description: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none shadow-inner" autoFocus /></div>
                      <div className="flex gap-2 justify-end pt-2"><button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">انصراف</button><button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors"><Save size={16} /> ذخیره</button></div>
                  </form>
              </div>
          </div>
      )}

      {/* Mini History Modal (Reused for Name filter visualization shortcut) */}
      {historyExchangeName && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                  <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <History size={20}/>
                          <h3 className="font-bold text-lg">تاریخچه کامل: {historyExchangeName}</h3>
                      </div>
                      <button onClick={() => setHistoryExchangeName(null)} className="hover:bg-indigo-500 p-1 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                       <table className="w-full text-right text-sm">
                           <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b">
                               <tr>
                                   <th className="px-4 py-3">تاریخ حواله</th>
                                   <th className="px-4 py-3">مبلغ (T)</th>
                                   <th className="px-4 py-3">درهم (AED)</th>
                                   <th className="px-4 py-3">نرخ</th>
                                   <th className="px-4 py-3">شرح</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y">
                               {exchangeTransactions.filter(t => t.exchangeName === historyExchangeName).slice().reverse().map(t => (
                                   <tr key={t.id} className="hover:bg-slate-50">
                                       <td className="px-4 py-3 text-slate-500" dir="ltr">{t.aedDepositDate}</td>
                                       <td className="px-4 py-3 font-bold" dir="ltr">{t.amountToman.toLocaleString()}</td>
                                       <td className="px-4 py-3 text-emerald-700 font-bold" dir="ltr">{t.aedAmount.toLocaleString()}</td>
                                       <td className="px-4 py-3 text-slate-400">{t.aedRate.toLocaleString()}</td>
                                       <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{t.description}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                      <div className="text-sm font-bold text-slate-700">
                          مجموع حواله: {exchangeTransactions.filter(t => t.exchangeName === historyExchangeName).reduce((a,b)=>a+b.amountToman,0).toLocaleString()} تومان
                      </div>
                      <button onClick={() => { setNameFilter(historyExchangeName); setHistoryExchangeName(null); }} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-colors">
                          اعمال به عنوان فیلتر اصلی
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExchangeManager;
