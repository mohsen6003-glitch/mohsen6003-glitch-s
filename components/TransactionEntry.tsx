
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Fuel, DollarSign, FileText, Printer, Download } from 'lucide-react';

const TransactionEntry: React.FC = () => {
  const { drivers, addTransaction, exchangeRates, transactions, getDriverName } = useData();
  const [form, setForm] = useState({
    driverId: '',
    volume: '',
    price: '',
    description: '',
    billOfLading: ''
  });
  const [inputCurrency, setInputCurrency] = useState<'toman' | 'usd' | 'aed'>('toman');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driverId || !form.volume || !form.price) {
      alert("لطفاً تمامی فیلدهای الزامی را پر کنید.");
      return;
    }
    
    const vol = parseFloat(form.volume);
    let unitPrice = parseFloat(form.price);
    
    // Convert to Toman based on rate
    if (inputCurrency === 'usd') {
        unitPrice = unitPrice * exchangeRates.usd;
    } else if (inputCurrency === 'aed') {
        unitPrice = unitPrice * exchangeRates.aed;
    }

    const total = vol * unitPrice;

    addTransaction({
      driverId: form.driverId,
      date: new Date().toLocaleString('fa-IR'),
      volume: vol,
      price: unitPrice, // Save in Base Currency (Toman)
      totalPrice: total,
      description: `${form.description} (نرخ ثبت: ${inputCurrency === 'toman' ? 'تومان' : inputCurrency === 'usd' ? '$'+form.price : form.price+' درهم'})`,
      billOfLading: form.billOfLading
    });
    
    alert(`تراکنش ثبت شد. مبلغ کل: ${total.toLocaleString()} تومان`);
    setForm({ driverId: '', volume: '', price: '', description: '', billOfLading: '' });
  };

  const calculateTotalPreview = () => {
      const vol = parseFloat(form.volume || '0');
      const pri = parseFloat(form.price || '0');
      let total = vol * pri;
      
      // If foreign currency, show converted total too
      if (inputCurrency !== 'toman') {
          return (
              <div className="flex flex-col items-end">
                 <span dir="ltr">{inputCurrency === 'usd' ? '$' : ''}{total.toLocaleString()}{inputCurrency === 'aed' ? ' AED' : ''}</span>
                 <span className="text-xs text-emerald-600 mt-1" dir="rtl">
                     معادل: {(total * (inputCurrency === 'usd' ? exchangeRates.usd : exchangeRates.aed)).toLocaleString()} تومان
                 </span>
              </div>
          );
      }
      return <span dir="ltr">{total.toLocaleString()} تومان</span>;
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      if (transactions.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');

      const headers = ['تاریخ', 'نام راننده', 'شماره بارنامه', 'حجم گاز', 'قیمت واحد (تومان)', 'هزینه کل (تومان)', 'توضیحات'];
      
      const rows = transactions.map(t => [
          t.date,
          getDriverName(t.driverId),
          t.billOfLading || '-',
          t.volume,
          t.price,
          t.totalPrice,
          t.description
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `transactions_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">گزارش ورود گاز و هزینه‌ها</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
      </div>

      <div className="max-w-4xl mx-auto print:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Fuel size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">ثبت محموله جدید گاز</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">انتخاب راننده <span className="text-red-500">*</span></label>
              <select 
                value={form.driverId} 
                onChange={(e) => setForm({...form, driverId: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">انتخاب کنید...</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.fullName} | {d.plateNumber}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره بارنامه</label>
              <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <FileText size={16} />
                  </span>
                  <input 
                      type="text" 
                      value={form.billOfLading} 
                      onChange={(e) => setForm({...form, billOfLading: e.target.value})}
                      className="w-full p-2.5 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="شماره بارنامه..."
                  />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حجم گاز (تن/لیتر) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                step="0.01"
                value={form.volume} 
                onChange={(e) => setForm({...form, volume: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">قیمت واحد (هزینه) <span className="text-red-500">*</span></label>
                  <div className="flex gap-1">
                      <button type="button" onClick={() => setInputCurrency('toman')} className={`text-[10px] px-2 py-0.5 rounded ${inputCurrency === 'toman' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>تومان</button>
                      <button type="button" onClick={() => setInputCurrency('usd')} className={`text-[10px] px-2 py-0.5 rounded ${inputCurrency === 'usd' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>دلار</button>
                      <button type="button" onClick={() => setInputCurrency('aed')} className={`text-[10px] px-2 py-0.5 rounded ${inputCurrency === 'aed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>درهم</button>
                  </div>
              </div>
              <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      {inputCurrency === 'toman' ? 'T' : inputCurrency === 'usd' ? '$' : 'AED'}
                  </span>
                  <input 
                  type="number" 
                  step="0.01"
                  value={form.price} 
                  onChange={(e) => setForm({...form, price: e.target.value})}
                  className="w-full p-2.5 pl-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                  />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات (اختیاری)</label>
              <input 
                type="text" 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="یادداشت درباره این محموله..."
              />
            </div>

            <div className="md:col-span-2 mt-4">
               <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-4 flex justify-between items-center">
                   <span className="text-emerald-800 font-medium">مبلغ کل برآوردی (هزینه بار):</span>
                   <div className="text-2xl font-bold text-emerald-700">
                      {calculateTotalPreview()}
                   </div>
               </div>
              <button type="submit" className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <DollarSign size={20} />
                ثبت محموله
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List of Loads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
         <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 print:bg-white print:border-b-2 print:border-slate-800">
             <h3 className="font-bold text-slate-700">لیست بارها و هزینه‌ها</h3>
             <div className="flex gap-2 print:hidden">
                <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                >
                    <Download size={16} /> اکسل
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                >
                    <Printer size={16} /> چاپ
                </button>
             </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
               <thead className="bg-slate-100 text-slate-600 font-semibold print:bg-white print:text-black print:border-b">
                  <tr>
                     <th className="px-6 py-4">تاریخ</th>
                     <th className="px-6 py-4">راننده</th>
                     <th className="px-6 py-4">بارنامه</th>
                     <th className="px-6 py-4">حجم</th>
                     <th className="px-6 py-4">قیمت واحد</th>
                     <th className="px-6 py-4">هزینه کل</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {transactions.slice().reverse().map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr">{t.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{getDriverName(t.driverId)}</td>
                          <td className="px-6 py-4 font-mono text-slate-900">{t.billOfLading || '-'}</td>
                          <td className="px-6 py-4 text-slate-900">{t.volume}</td>
                          <td className="px-6 py-4 text-slate-500" dir="ltr">{t.price.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">{t.totalPrice.toLocaleString()}</td>
                      </tr>
                  ))}
                  {transactions.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-6 text-slate-400">هیچ باری ثبت نشده است</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default TransactionEntry;
