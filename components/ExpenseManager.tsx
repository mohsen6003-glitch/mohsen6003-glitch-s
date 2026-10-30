import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Wallet, Plus, Calendar, Filter, ChevronDown } from 'lucide-react';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { formatNumberInput, cleanNumberInput, numberToPersianWords } from '../utils/numberUtils';

type DateFilterType = 'all' | 'today' | 'week' | 'month';

const ExpenseManager: React.FC = () => {
  const { expenses, addExpense } = useData();
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'عمومی',
    description: ''
  });
  
  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  const categories = ['حقوق و دستمزد', 'اجاره', 'تعمیرات و نگهداری', 'قبوض', 'حمل و نقل', 'خوراک', 'عمومی'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return alert("عنوان و مبلغ الزامی است");
    if (!selectedDate) return alert("لطفا تاریخ را انتخاب کنید");

    // Format date nicely: "1402/05/10 ساعت 14:30"
    const formattedDate = selectedDate.format("YYYY/MM/DD HH:mm");

    addExpense({
      title: form.title,
      amount: parseFloat(form.amount),
      category: form.category,
      date: formattedDate,
      description: form.description
    });
    
    setForm({ title: '', amount: '', category: 'عمومی', description: '' });
    // Reset date to now
    setSelectedDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return expenses.filter(exp => {
      if (dateFilter === 'all') return true;

      const expTime = parseInt(exp.id);
      if (isNaN(expTime)) return false;
      
      if (dateFilter === 'today') return expTime >= startOfDay;
      if (dateFilter === 'week') return expTime >= startOfWeek; 
      if (dateFilter === 'month') return expTime >= startOfMonth;
      
      return true;
    }).slice().reverse();
  }, [expenses, dateFilter]);

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
            <Wallet size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">مدیریت هزینه‌ها</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان هزینه</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="مثال: قبض برق" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">دسته‌بندی</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-rose-500">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاریخ پرداخت</label>
             <DatePicker 
                value={selectedDate}
                onChange={setSelectedDate}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="rmdp-input" 
                placeholder="انتخاب تاریخ..."
             />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مبلغ (تومان)</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={formatNumberInput(form.amount)}
              onChange={e => setForm({ ...form, amount: cleanNumberInput(e.target.value) })}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-mono font-bold text-left"
              placeholder="مثال: 2,500,000"
            />
            {form.amount && parseFloat(form.amount) > 0 && (
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 truncate">
                {numberToPersianWords(parseFloat(form.amount))}
              </div>
            )}
          </div>
           <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">توضیحات</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" placeholder="اختیاری" />
          </div>
          <div className="lg:col-span-1">
            <button type="submit" className="w-full p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-500/20 active:scale-95">
              <Plus size={18} /> ثبت هزینه
            </button>
          </div>
        </form>
      </div>

      {/* Stats & Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 shadow-sm transition-colors">
          <div className="flex items-center gap-2">
              <span className="text-rose-800 dark:text-rose-300 font-bold">مجموع هزینه‌ها ({dateFilter === 'all' ? 'کل' : dateFilter === 'today' ? 'امروز' : dateFilter === 'week' ? 'این هفته' : 'این ماه'}):</span>
              <span className="text-2xl font-black text-rose-700 dark:text-rose-400" dir="ltr">{totalExpenses.toLocaleString()}</span>
          </div>
          
          <div className="relative w-full sm:w-auto min-w-[200px]">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <Filter size={16} />
              </div>
              <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                  className="w-full pl-4 pr-10 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer shadow-sm"
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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">عنوان</th>
                <th className="px-6 py-4">دسته‌بندی</th>
                <th className="px-6 py-4">مبلغ (T)</th>
                <th className="px-6 py-4">تاریخ پرداخت</th>
                <th className="px-6 py-4">توضیحات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-800 dark:text-slate-200">
                  <td className="px-6 py-4 font-bold">{exp.title}</td>
                  <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium">{exp.category}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-rose-600 dark:text-rose-400" dir="ltr">{exp.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-500 font-mono text-xs flex items-center gap-1.5" dir="ltr">
                      <Calendar size={14} className="text-slate-400 dark:text-slate-600"/> 
                      <span>{exp.date}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs italic">{exp.description || '-'}</td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-600 italic bg-slate-50/50 dark:bg-slate-900/50">هیچ هزینه‌ای برای این بازه زمانی ثبت نشده است.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseManager;