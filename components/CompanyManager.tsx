
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Building2, Plus, Phone, MapPin, BarChart3, Droplets, Printer, Download } from 'lucide-react';

const CompanyManager: React.FC = () => {
  const { companies, addCompany, getCompanyStats } = useData();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert("نام شرکت الزامی است");
    addCompany(form);
    setForm({ name: '', phone: '', address: '' });
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      if (companies.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      
      const headers = ['نام شرکت', 'تلفن', 'آدرس', 'حجم کل خرید', 'مجموع پرداختی'];
      const rows = companies.map(c => {
          const stats = getCompanyStats(c.id);
          return [c.name, c.phone, c.address, stats.totalVolume, stats.totalPaid];
      });

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `companies_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">لیست شرکت‌های طرف قرارداد</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
         <div className="flex items-center gap-2">
            <Building2 className="text-slate-400" size={20}/>
            <h3 className="text-lg font-bold text-slate-700">لیست شرکت‌ها</h3>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium">
                <Download size={16} /> اکسل
            </button>
            <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium">
                <Printer size={16} /> چاپ
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => {
            const stats = getCompanyStats(company.id);
            return (
                <div key={company.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between print:border print:border-slate-300 print:shadow-none break-inside-avoid">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2">{company.name}</h3>
                        <div className="text-slate-500 text-sm space-y-1 mb-4">
                            <div className="flex items-center gap-2"><Phone size={14}/> {company.phone || '---'}</div>
                            <div className="flex items-center gap-2"><MapPin size={14}/> {company.address || '---'}</div>
                        </div>
                    </div>
                    
                    <div className="bg-cyan-50 rounded-lg p-3 space-y-2 print:bg-slate-50">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 flex items-center gap-1"><Droplets size={14}/> حجم کل خرید:</span>
                            <span className="font-bold text-cyan-800" dir="ltr">{stats.totalVolume.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-cyan-100 pt-2 print:border-slate-200">
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
