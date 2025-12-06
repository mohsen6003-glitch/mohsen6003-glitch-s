
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Fuel, DollarSign, FileText } from 'lucide-react';

const TransactionEntry: React.FC = () => {
  const { drivers, addTransaction, exchangeRates } = useData();
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

  return (
    <div className="max-w-4xl mx-auto">
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
                <label className="block text-sm font-medium text-slate-700">قیمت واحد <span className="text-red-500">*</span></label>
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
                 <span className="text-emerald-800 font-medium">مبلغ کل برآوردی:</span>
                 <div className="text-2xl font-bold text-emerald-700">
                    {calculateTotalPreview()}
                 </div>
             </div>
            <button type="submit" className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <DollarSign size={20} />
              ثبت تراکنش
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionEntry;
