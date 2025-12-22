
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { UserPlus, Save } from 'lucide-react';

const DriverRegistration: React.FC = () => {
  const { addDriver } = useData();
  const [form, setForm] = useState({
    fullName: '',
    nationalId: '',
    licenseNo: '',
    phone: '',
    plateNumber: '',
    tankNumber: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.plateNumber) {
      alert("نام و شماره پلاک الزامی هستند.");
      return;
    }
    addDriver(form);
    setForm({ fullName: '', nationalId: '', licenseNo: '', phone: '', plateNumber: '', tankNumber: '' });
    alert("راننده با موفقیت ثبت شد!");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <UserPlus size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">ثبت راننده جدید</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">نام و نام خانوادگی</label>
            <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="مثال: علی رضایی" />
          </div>
          <div>
            <label htmlFor="nationalId" className="block text-sm font-medium text-slate-700 mb-1">کد ملی</label>
            <input id="nationalId" name="nationalId" value={form.nationalId} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="کد ملی ۱۰ رقمی" />
          </div>
          <div>
            <label htmlFor="licenseNo" className="block text-sm font-medium text-slate-700 mb-1">شماره گواهینامه</label>
            <input id="licenseNo" name="licenseNo" value={form.licenseNo} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="شماره گواهینامه" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">شماره تماس</label>
            <input id="phone" name="phone" value={form.phone} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="0912..." />
          </div>
          <div>
            <label htmlFor="plateNumber" className="block text-sm font-medium text-slate-700 mb-1">شماره پلاک</label>
            <input id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="۱۲ الف ۳۴۵ ایران ۶۶" />
          </div>
          <div>
            <label htmlFor="tankNumber" className="block text-sm font-medium text-slate-700 mb-1">شماره تانکر</label>
            <input id="tankNumber" name="tankNumber" value={form.tankNumber} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="شناسه تانکر" />
          </div>

          <div className="md:col-span-2 mt-4">
            <button type="submit" className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Save size={20} />
              ذخیره اطلاعات راننده
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverRegistration;
