import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ShoppingCart, DollarSign } from 'lucide-react';

const PurchaseEntry: React.FC = () => {
  const { companies, purchases, addPurchase, getCompanyName } = useData();
  const [form, setForm] = useState({
    companyId: '',
    volume: '',
    price: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId || !form.volume || !form.price) return alert("اطلاعات ناقص است");
    
    const vol = parseFloat(form.volume);
    const pr = parseFloat(form.price);
    
    addPurchase({
        companyId: form.companyId,
        date: new Date().toLocaleString('fa-IR'),
        volume: vol,
        price: pr,
        totalPrice: vol * pr,
        description: form.description
    });
    alert("خرید ثبت شد");
    setForm({ companyId: '', volume: '', price: '', description: '' });
  };

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
            <ShoppingCart size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">ثبت خرید از شرکت‌ها</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">انتخاب شرکت</label>
            <select value={form.companyId} onChange={e => setForm({...form, companyId: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg">
              <option value="">انتخاب کنید...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">حجم خرید</label>
            <input type="number" step="0.01" value={form.volume} onChange={e => setForm({...form, volume: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">قیمت واحد</label>
            <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="0.00" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="توضیحات خرید..." />
          </div>
          <div className="md:col-span-2 mt-4">
            <button type="submit" className="w-full px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
              <DollarSign size={20} /> ثبت فاکتور خرید
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold">
                    <tr>
                        <th className="px-6 py-4">تاریخ</th>
                        <th className="px-6 py-4">شرکت</th>
                        <th className="px-6 py-4">حجم</th>
                        <th className="px-6 py-4">مبلغ کل</th>
                        <th className="px-6 py-4">توضیحات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {purchases.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm text-slate-500" dir="ltr">{p.date}</td>
                            <td className="px-6 py-4 font-medium">{getCompanyName(p.companyId)}</td>
                            <td className="px-6 py-4">{p.volume}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">${p.totalPrice.toLocaleString()}</td>
                            <td className="px-6 py-4 text-slate-500">{p.description}</td>
                        </tr>
                    ))}
                    {purchases.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400">هیچ خریدی ثبت نشده</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseEntry;