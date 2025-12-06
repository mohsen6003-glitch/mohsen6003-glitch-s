
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Building2, Plus, Phone, MapPin, BarChart3, Droplets } from 'lucide-react';

const CompanyManager: React.FC = () => {
  const { companies, addCompany, getCompanyStats } = useData();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert("نام شرکت الزامی است");
    addCompany(form);
    setForm({ name: '', phone: '', address: '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600">
                <Building2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">مدیریت شرکت‌ها</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">نام شرکت</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="نام شرکت" />
            </div>
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">تلفن</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="تلفن تماس" />
            </div>
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">آدرس</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg" placeholder="آدرس شرکت" />
            </div>
            <div className="md:col-span-1">
                <button type="submit" className="w-full p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center gap-2">
                    <Plus size={18} /> ثبت شرکت
                </button>
            </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => {
            const stats = getCompanyStats(company.id);
            return (
                <div key={company.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2">{company.name}</h3>
                        <div className="text-slate-500 text-sm space-y-1 mb-4">
                            <div className="flex items-center gap-2"><Phone size={14}/> {company.phone || '---'}</div>
                            <div className="flex items-center gap-2"><MapPin size={14}/> {company.address || '---'}</div>
                        </div>
                    </div>
                    
                    <div className="bg-cyan-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 flex items-center gap-1"><Droplets size={14}/> حجم کل خرید:</span>
                            <span className="font-bold text-cyan-800" dir="ltr">{stats.totalVolume.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-cyan-100 pt-2">
                            <span className="text-slate-600 flex items-center gap-1"><BarChart3 size={14}/> مجموع پرداختی:</span>
                            <span className="font-bold text-cyan-800" dir="ltr">{stats.totalPaid.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            );
        })}
         {companies.length === 0 && <p className="text-slate-400 text-center col-span-full">هیچ شرکتی ثبت نشده است.</p>}
      </div>
    </div>
  );
};

export default CompanyManager;
