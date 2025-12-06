
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Truck, CheckCircle, Clock, PlayCircle, XCircle, AlertTriangle, Printer, Download, User, FileText, Hash } from 'lucide-react';
import { QueueStatus } from '../types';

const QueueManager: React.FC = () => {
  const { drivers, queue, addToQueue, updateQueueStatus, getDriverName } = useData();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [destination, setDestination] = useState('');

  const handleAddToQueue = () => {
    if (!selectedDriver) {
      alert("لطفاً یک راننده انتخاب کنید.");
      return;
    }
    // Check if already in queue (WAIT or LOADING)
    const isInQueue = queue.some(q => q.driverId === selectedDriver && (q.status === 'WAIT' || q.status === 'LOADING'));
    if (isInQueue) {
      alert("این راننده قبلاً در صف یا در حال بارگیری است.");
      return;
    }

    addToQueue({
      driverId: selectedDriver,
      destination: destination || 'نامشخص',
      entryTime: new Date().toLocaleString('fa-IR')
    });
    setDestination('');
    setSelectedDriver('');
  };

  // Filter active queue items
  const activeQueue = queue.filter(q => q.status === 'WAIT' || q.status === 'LOADING');
  // Sort: LOADING first, then WAIT
  activeQueue.sort((a, b) => {
      if (a.status === 'LOADING' && b.status === 'WAIT') return -1;
      if (a.status === 'WAIT' && b.status === 'LOADING') return 1;
      return 0; // Maintain insertion order otherwise
  });

  const getStatusBadge = (status: QueueStatus) => {
      switch(status) {
          case 'WAIT': 
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                    <Clock size={12} /> در انتظار
                </span>
            );
          case 'LOADING':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    در حال بارگیری
                </span>
            );
          default: return null;
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      if (activeQueue.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');

      const headers = ['نوبت', 'نام راننده', 'کد ملی', 'تلفن', 'شماره گواهینامه', 'پلاک خودرو', 'شماره تانک', 'مقصد', 'زمان ورود', 'وضعیت'];
      
      const rows = activeQueue.map((item, index) => {
          const driver = drivers.find(d => d.id === item.driverId);
          return [
            index + 1,
            driver ? driver.fullName : 'نامشخص',
            driver ? driver.nationalId : '-',
            driver ? driver.phone : '-',
            driver ? driver.licenseNo : '-',
            driver ? driver.plateNumber : '-',
            driver ? driver.tankNumber : '-',
            item.destination,
            item.entryTime,
            item.status === 'WAIT' ? 'در انتظار' : 'در حال بارگیری'
          ];
      });

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `queue_full_details_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">لیست صف بارگیری فعال (با جزئیات کامل)</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleString('fa-IR')}</p>
      </div>

      {/* Add to Queue - Hidden on Print */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
            <Truck size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت صف بارگیری</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">راننده</label>
            <select 
              value={selectedDriver} 
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">انتخاب راننده...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName} | {d.plateNumber}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">مقصد</label>
            <input 
              type="text" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="مثال: تهران مرکز"
            />
          </div>
          <button 
            onClick={handleAddToQueue}
            className="w-full md:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            افزودن به صف
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:border-b-2 print:border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="text-slate-400" size={20}/>
                    <h3 className="text-lg font-bold text-slate-800">وضعیت سکوی بارگیری</h3>
                 </div>
                 <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium print:hidden">{activeQueue.length} فعال</span>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto print:hidden">
                <button 
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                >
                    <Download size={16} /> اکسل کامل
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                >
                    <Printer size={16} /> چاپ
                </button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-600 text-xs font-semibold print:bg-white print:text-black print:border-b">
              <tr>
                <th className="px-6 py-4">نوبت</th>
                <th className="px-6 py-4">مشخصات راننده</th>
                <th className="px-6 py-4">مشخصات خودرو</th>
                <th className="px-6 py-4">مقصد</th>
                <th className="px-6 py-4">زمان ورود</th>
                <th className="px-6 py-4">وضعیت</th>
                <th className="px-6 py-4 text-center print:hidden">تغییر وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {activeQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">هیچ راننده‌ای در صف نیست</td>
                </tr>
              ) : (
                activeQueue.map((item, index) => {
                    const driver = drivers.find(d => d.id === item.driverId);
                    return (
                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors print:hover:bg-transparent ${item.status === 'LOADING' ? 'bg-blue-50/50 print:bg-transparent' : ''}`}>
                            <td className="px-6 py-4 font-mono text-slate-500 font-bold">#{index + 1}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{driver?.fullName || 'ناشناس'}</div>
                                <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1"><Hash size={12}/> کد ملی: {driver?.nationalId || '-'}</span>
                                    <span className="flex items-center gap-1"><User size={12}/> تلفن: {driver?.phone || '-'}</span>
                                    {driver?.licenseNo && <span className="flex items-center gap-1"><FileText size={12}/> گواهینامه: {driver.licenseNo}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                    <div className="text-xs text-slate-500">پلاک:</div>
                                    <div className="font-mono bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200 text-slate-800 font-semibold print:bg-transparent print:border-black">
                                        {driver?.plateNumber || '-'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">تانکر: <span className="font-mono font-medium text-slate-700">{driver?.tankNumber || '-'}</span></div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.destination}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm" dir="ltr">{item.entryTime}</td>
                            <td className="px-6 py-4">
                            {getStatusBadge(item.status)}
                            </td>
                            <td className="px-6 py-4 print:hidden">
                                <div className="flex items-center justify-center gap-2">
                                    {item.status === 'WAIT' && (
                                        <>
                                            <button 
                                                onClick={() => updateQueueStatus(item.id, 'LOADING')}
                                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded tooltip"
                                                title="شروع بارگیری"
                                            >
                                                <PlayCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm('آیا از لغو نوبت اطمینان دارید؟')) updateQueueStatus(item.id, 'CANCELLED')
                                                }}
                                                className="p-1.5 text-red-500 hover:bg-red-100 rounded"
                                                title="لغو نوبت"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </>
                                    )}
                                    
                                    {item.status === 'LOADING' && (
                                        <button 
                                            onClick={() => updateQueueStatus(item.id, 'DONE')}
                                            className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs"
                                        >
                                            <CheckCircle size={14} /> تکمیل
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QueueManager;
