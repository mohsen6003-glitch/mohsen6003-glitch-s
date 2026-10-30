
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Handshake, Plus, PieChart as PieChartIcon, TrendingUp, DollarSign, Wallet, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { formatNumberInput, cleanNumberInput } from '../utils/numberUtils';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ef4444', '#14b8a6'];

const PartnerManager: React.FC = () => {
  const { partners, partnerPayments, addPartner, addPartnerPayment, getSystemFinancials } = useData();
  const [form, setForm] = useState({ fullName: '', phone: '', sharePercentage: '' });
  const [withdrawForm, setWithdrawForm] = useState({ partnerId: '', amount: '', description: '' });
  const [withdrawDate, setWithdrawDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));

  // Fix: Check for dark mode to style charts correctly
  const isDark = document.documentElement.classList.contains('dark');

  const { netProfit } = getSystemFinancials();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.sharePercentage) return alert("نام و درصد سهم الزامی است");
    
    addPartner({
        fullName: form.fullName,
        phone: form.phone,
        sharePercentage: parseFloat(form.sharePercentage)
    });
    setForm({ fullName: '', phone: '', sharePercentage: '' });
  };

  const handleWithdraw = (e: React.FormEvent) => {
      e.preventDefault();
      if(!withdrawForm.partnerId || !withdrawForm.amount || !withdrawDate) return alert("انتخاب شریک و مبلغ الزامی است");

      addPartnerPayment({
          partnerId: withdrawForm.partnerId,
          amount: parseFloat(withdrawForm.amount),
          date: withdrawDate.format("YYYY/MM/DD HH:mm"),
          description: withdrawForm.description
      });
      alert("برداشت وجه ثبت شد");
      setWithdrawForm({ partnerId: '', amount: '', description: '' });
      setWithdrawDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const chartData = partners.map(p => ({
    name: p.fullName,
    value: p.sharePercentage
  }));

  const getPartnerFinancials = (partnerId: string, sharePercent: number) => {
      const shareAmount = (netProfit * sharePercent) / 100;
      const withdrawn = partnerPayments
        .filter(p => p.partnerId === partnerId)
        .reduce((sum, p) => sum + p.amount, 0);
      return { shareAmount, withdrawn, balance: shareAmount - withdrawn };
  };

  return (
    <div className="space-y-6">
      
      {/* Top Stats */}
      <div className="bg-gradient-to-l from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white flex justify-between items-center">
          <div>
              <h2 className="text-purple-100 font-medium mb-1">سود خالص سیستم (قابل تقسیم)</h2>
              <div className="text-3xl font-bold flex items-center gap-2" dir="ltr">
                  ${netProfit.toLocaleString()}
                  <TrendingUp size={24} className="text-green-300"/>
              </div>
          </div>
          <div className="text-left opacity-80 text-sm">
              <p>درآمد کل - (هزینه خرید + هزینه جاری)</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Partner Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-white">
                <Plus className="text-purple-600 dark:text-purple-400" size={20}/>
                <h3 className="font-bold">افزودن شریک جدید</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">نام شریک</label>
                        <input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg" placeholder="نام" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">درصد سهم (%)</label>
                        <input type="number" step="0.1" value={form.sharePercentage} onChange={e => setForm({...form, sharePercentage: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg" placeholder="مثال: 20" />
                    </div>
                </div>
                <div>
                     <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">شماره تماس</label>
                     <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg" placeholder="09..." />
                </div>
                <button type="submit" className="w-full p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm transition-colors">
                    <Plus size={16} /> ثبت شریک
                </button>
            </form>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-white">
                <Wallet className="text-orange-600 dark:text-orange-400" size={20}/>
                <h3 className="font-bold">ثبت برداشت وجه (پرداخت سود)</h3>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاریخ و زمان برداشت</label>
                        <DatePicker 
                            value={withdrawDate}
                            onChange={setWithdrawDate}
                            calendar={persian}
                            locale={persian_fa}
                            format="YYYY/MM/DD HH:mm"
                            plugins={[<TimePicker hideSeconds />]}
                            inputClass="rmdp-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">انتخاب شریک</label>
                        <select value={withdrawForm.partnerId} onChange={e => setWithdrawForm({...withdrawForm, partnerId: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100">
                             <option value="">انتخاب کنید...</option>
                             {partners.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.sharePercentage}%)</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">مبلغ برداشت</label>
                        <input type="text" inputMode="decimal" dir="ltr" value={formatNumberInput(withdrawForm.amount)} onChange={e => setWithdrawForm({...withdrawForm, amount: cleanNumberInput(e.target.value)})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-left" placeholder="مبلغ..." />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">توضیحات</label>
                        <input value={withdrawForm.description} onChange={e => setWithdrawForm({...withdrawForm, description: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" placeholder="بابت..." />
                    </div>
                </div>
                <button type="submit" className="w-full p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center gap-2 text-sm transition-colors">
                    <DollarSign size={16} /> ثبت برداشت
                </button>
            </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
             <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="text-purple-500 dark:text-purple-400" size={20}/>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">توزیع سهام</h3>
             </div>
             {partners.length > 0 ? (
                 <div className="flex-1 w-full min-h-[250px]" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            {/* Check for dark mode to style charts correctly */}
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#fff' : '#000' }} formatter={(value: number) => [`${value}%`, 'سهم']} />
                            <Legend verticalAlign="bottom" />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
             ) : (
                 <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 italic">هنوز شریکی ثبت نشده است</div>
             )}
        </div>

        {/* Partners Financial Status */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            {partners.map((p, index) => {
                const financials = getPartnerFinancials(p.id, p.sharePercentage);
                return (
                    <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <div className="w-full sm:w-auto pr-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{p.fullName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-400">{p.sharePercentage}% سهام</span>
                                <span className="text-slate-400 dark:text-slate-500 text-sm">{p.phone}</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-6 w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                             <div className="text-center">
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">سهم از سود</div>
                                <div className="font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">{financials.shareAmount.toLocaleString()}</div>
                             </div>
                             <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                             <div className="text-center">
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">برداشت شده</div>
                                <div className="font-bold text-red-500 dark:text-red-400" dir="ltr">{financials.withdrawn.toLocaleString()}</div>
                             </div>
                             <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
                             <div className="text-center">
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">مانده</div>
                                <div className={`font-bold ${financials.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} dir="ltr">
                                    {financials.balance.toLocaleString()}
                                </div>
                             </div>
                        </div>
                    </div>
                );
            })}
             {partners.length === 0 && <p className="text-center text-slate-400 dark:text-slate-600 italic py-10">شریکی تعریف نشده است.</p>}
        </div>
      </div>
    </div>
  );
};

export default PartnerManager;
