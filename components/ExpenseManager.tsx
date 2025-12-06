import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Wallet, Plus, Calendar, Filter, ChevronDown } from 'lucide-react';

type DateFilterType = 'all' | 'today' | 'week' | 'month';

const ExpenseManager: React.FC = () => {
  const { expenses, addExpense } = useData();
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'عمومی',
    description: ''
  });
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  const categories = ['حقوق و دستمزد', 'اجاره', 'تعمیرات و نگهداری', 'قبوض', 'حمل و نقل', 'خوراک', 'عمومی'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return alert("عنوان و مبلغ الزامی است");

    addExpense({
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      date: new Date().toLocaleString('fa-IR'),
      description: form.description
    });
    
    setForm({ title: '', amount: '', category: 'عمومی', description: '' });
  };

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
    
    const currentDay = now.getDay(); 
    // Simple logic: Go back to last Saturday or Sunday. Let's use simple "Last 7 days" style or Standard Week
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime(); 
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return expenses.filter(exp => {
      if (dateFilter === 'all') return true;

      // We use the ID as timestamp because it is generated via Date.now()
      const expTime = parseInt(exp.id);
      if (isNaN(expTime)) return false; // Safety check
      
      if (dateFilter === 'today') return expTime >= startOfDay;
      if (dateFilter === 'week') return expTime >= startOfWeek; 
      if (dateFilter === 'month') return expTime >= startOfMonth;
      
      return true;
    });
  }, [expenses, dateFilter]);

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg text-red-600">
            <Wallet size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت هزینه‌ها</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">عنوان هزینه</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="مثال: قبض برق" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">دسته‌بندی</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ (تومان/ریال)</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="مبلغ..." />
          </div>
           <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="توضیحات اختیاری" />
          </div>
          <div className="lg:col-span-1">
            <button type="submit" className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2">
              <Plus size={18} /> ثبت هزینه
            </button>
          </div>
        </form>
      </div>

      {/* Stats & Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
              <span className="text-red-800 font-bold">مجموع هزینه‌ها ({dateFilter === 'all' ? 'کل' : dateFilter === 'today' ? 'امروز' : dateFilter === 'week' ? 'این هفته' : 'این ماه'}):</span>
              <span className="text-2xl font-bold text-red-700" dir="ltr">{totalExpenses.toLocaleString()}</span>
          </div>
          
          <div className="relative w-full sm:w-auto min-w-[200px]">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <Filter size={16} />
              </div>
              <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                  className="w-full pl-4 pr-10 py-2 bg-white border border-red-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer"
              >
                  <option value="all">کل تاریخچه</option>
                  <option value="today">امروز</option>
                  <option value="week">این هفته</option>
                  <option value="month">این ماه</option>
              </select>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <ChevronDown size={16} />
              </div>
          </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">عنوان</th>
                <th className="px-6 py-4">دسته‌بندی</th>
                <th className="px-6 py-4">مبلغ</th>
                <th className="px-6 py-4">تاریخ</th>
                <th className="px-6 py-4">توضیحات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{exp.title}</td>
                  <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{exp.category}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-red-600">{exp.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm flex items-center gap-1">
                      <Calendar size={14}/> {exp.date}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{exp.description || '-'}</td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">هیچ هزینه‌ای برای این بازه زمانی یافت نشد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseManager;