
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ShoppingCart, DollarSign, Printer, Download, Calendar } from 'lucide-react';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { formatNumberInput, cleanNumberInput } from '../utils/numberUtils';

const PurchaseEntry: React.FC = () => {
  const { companies, purchases, addPurchase, getCompanyName } = useData();
  const [form, setForm] = useState({
    companyId: '',
    volume: '',
    price: '',
    description: ''
  });
  const [purchaseDate, setPurchaseDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId || !form.volume || !form.price || !purchaseDate) return alert("اطلاعات ناقص است");
    
    const vol = parseFloat(form.volume);
    const pr = parseFloat(form.price);
    
    addPurchase({
        companyId: form.companyId,
        date: purchaseDate.format("YYYY/MM/DD HH:mm"),
        volume: vol,
        price: pr,
        totalPrice: vol * pr,
        description: form.description
    });
    alert("خرید ثبت شد");
    setForm({ companyId: '', volume: '', price: '', description: '' });
    setPurchaseDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      if (purchases.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      
      const headers = ['تاریخ', 'نام شرکت', 'حجم', 'قیمت واحد', 'مبلغ کل', 'توضیحات'];
      const rows = purchases.map(p => [
          p.date,
          getCompanyName(p.companyId),
          p.volume,
          p.price,
          p.totalPrice,
          p.description
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `purchases_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
       {/* Print Header */}
       <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">گزارش خریدهای گاز</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
       </div>

       <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print:hidden">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
            <ShoppingCart size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">ثبت خرید از شرکت‌ها</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاریخ و زمان خرید</label>
            <DatePicker 
                value={purchaseDate}
                onChange={setPurchaseDate}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker hideSeconds />]}
                inputClass="rmdp-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">انتخاب شرکت</label>
            <select value={form.companyId} onChange={e => setForm({...form, companyId: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
              <option value="">انتخاب کنید...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حجم خرید</label>
            <input type="number" step="0.01" value={form.volume} onChange={e => setForm({...form, volume: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">قیمت واحد</label>
            <input type="text" inputMode="decimal" dir="ltr" value={formatNumberInput(form.price)} onChange={e => setForm({...form, price: cleanNumberInput(e.target.value)})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold text-left" placeholder="0.00" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">توضیحات</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100" placeholder="توضیحات خرید..." />
          </div>
          <div className="md:col-span-2 mt-4">
            <button type="submit" className="w-full px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <DollarSign size={20} /> ثبت فاکتور خرید
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 print:bg-white print:border-b-2 print:border-slate-800">
             <h3 className="font-bold text-slate-700 dark:text-slate-200">لیست فاکتورهای خرید</h3>
             <div className="flex gap-2 print:hidden">
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm font-medium">
                    <Download size={16} /> اکسل
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors text-sm font-medium">
                    <Printer size={16} /> چاپ
                </button>
             </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold print:bg-white print:text-black print:border-b">
                    <tr>
                        <th className="px-6 py-4">تاریخ</th>
                        <th className="px-6 py-4">شرکت</th>
                        <th className="px-6 py-4">حجم</th>
                        <th className="px-6 py-4">مبلغ کل</th>
                        <th className="px-6 py-4">توضیحات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {purchases.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 print:hover:bg-transparent">
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400" dir="ltr">{p.date}</td>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{getCompanyName(p.companyId)}</td>
                            <td className="px-6 py-4 text-slate-800 dark:text-slate-300">{p.volume}</td>
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100" dir="ltr">${p.totalPrice.toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.description}</td>
                        </tr>
                    ))}
                    {purchases.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400 dark:text-slate-600 italic">هیچ خریدی ثبت نشده</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseEntry;
