
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Building2, Plus, Phone, MapPin, BarChart3, Droplets, Printer, Download, Upload, History, X, FileText, FileDown, Truck, WalletCards, Filter, ChevronDown, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type DateFilterType = 'all' | 'today' | 'week' | 'month';

const CompanyManager: React.FC = () => {
  const { companies, addCompany, transactions, drivers, purchases } = useData();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  
  // History Modal State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);

  // Helper to calculate stats based on date filter
  const getFilteredCompanyStats = (companyId: string) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const isWithinRange = (id: string) => {
      if (dateFilter === 'all') return true;
      const ts = parseInt(id);
      if (isNaN(ts)) return false;
      if (dateFilter === 'today') return ts >= startOfDay;
      if (dateFilter === 'week') return ts >= startOfWeek;
      if (dateFilter === 'month') return ts >= startOfMonth;
      return true;
    };

    const companyPurchases = purchases.filter(p => p.companyId === companyId && isWithinRange(p.id));
    const totalVolumePurchased = companyPurchases.reduce((acc, p) => acc + p.volume, 0);
    const totalPaid = companyPurchases.reduce((acc, p) => acc + p.totalPrice, 0);
    
    const companyExports = transactions.filter(t => t.companyId === companyId && isWithinRange(t.id));
    const totalVolumeSupplied = companyExports.reduce((acc, t) => acc + t.volume, 0);

    return { totalVolumePurchased, totalPaid, totalVolumeSupplied };
  };

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
      
      const headers = ['نام شرکت', 'تلفن', 'آدرس', 'حجم کل خرید', 'تامین برای صادرات', 'مجموع پرداختی خرید'];
      const rows = companies.map(c => {
          const stats = getFilteredCompanyStats(c.id);
          return [c.name, c.phone, c.address, stats.totalVolumePurchased, stats.totalVolumeSupplied, stats.totalPaid];
      });

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `companies_${dateFilter}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  // --- History Logic ---
  
  const historyData = useMemo(() => {
      if (!selectedCompanyId) return [];
      // Filter transactions where this company was the SUPPLIER
      return transactions
          .filter(t => t.companyId === selectedCompanyId)
          .map(t => {
              const driver = drivers.find(d => d.id === t.driverId);
              return {
                  ...t,
                  driverName: driver?.fullName || 'ناشناس',
                  plateNumber: driver?.plateNumber || '-',
                  tankNumber: driver?.tankNumber || '-',
                  licenseNo: driver?.licenseNo || '-'
              };
          })
          .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Newest first
  }, [selectedCompanyId, transactions, drivers]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleHistoryExportCSV = () => {
      if (historyData.length === 0) return alert('داده‌ای وجود ندارد.');
      const headers = ['تاریخ', 'نام راننده', 'شماره پلاک', 'شماره تانکر', 'حجم (تن)', 'قیمت واحد', 'مبلغ کل', 'بارنامه'];
      const rows = historyData.map(item => [
          item.date,
          item.driverName,
          item.plateNumber,
          item.tankNumber,
          item.volume,
          item.price,
          item.totalPrice,
          item.billOfLading || '-'
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `company_history_${selectedCompany?.name}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  const handleHistoryExportPDF = async () => {
      const input = document.getElementById('company-history-table');
      if (input) {
          setIsExportingHistoryPdf(true);
          try {
              const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`history-${selectedCompany?.name}.pdf`);
          } catch (err) {
              console.error(err);
              alert("خطا در ایجاد PDF");
          } finally {
              setIsExportingHistoryPdf(false);
          }
      }
  };

  const handleHistoryPrint = () => {
      const printContent = document.getElementById('company-history-table');
      if (printContent && selectedCompany) {
          const windowUrl = 'about:blank';
          const uniqueName = new Date().getTime();
          const windowName = 'Print' + uniqueName;
          const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

          if (printWindow) {
              printWindow.document.write(`
                  <html dir="rtl">
                      <head>
                          <title>تاریخچه شرکت - ${selectedCompany.name}</title>
                          <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap" rel="stylesheet">
                          <style>
                              body { font-family: 'Vazirmatn', sans-serif; padding: 20px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                              th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: right; }
                              th { background-color: #f8fafc; color: #475569; }
                              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #334155; padding-bottom: 10px; }
                              .info { margin-bottom: 20px; display: flex; gap: 20px; font-size: 14px; }
                          </style>
                      </head>
                      <body>
                          <div class="header">
                              <h2>تاریخچه بارگیری از شرکت: ${selectedCompany.name}</h2>
                              <p>تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}</p>
                          </div>
                          ${printContent.innerHTML}
                      </body>
                  </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
              }, 500);
          }
      }
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
         <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                <Filter size={20}/>
            </div>
            <h3 className="text-lg font-bold text-slate-700">لیست شرکت‌ها</h3>
            <div className="relative">
                <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
                    className="pr-8 pl-4 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none appearance-none cursor-pointer"
                >
                    <option value="all">کل تاریخچه</option>
                    <option value="today">امروز</option>
                    <option value="week">این هفته</option>
                    <option value="month">این ماه</option>
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
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
            const stats = getFilteredCompanyStats(company.id);
            return (
                <div key={company.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between print:border print:border-slate-300 print:shadow-none break-inside-avoid animate-in fade-in duration-300">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-slate-800">{company.name}</h3>
                            <button 
                                onClick={() => setSelectedCompanyId(company.id)}
                                className="text-xs bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 px-2 py-1 rounded flex items-center gap-1 transition-colors print:hidden"
                            >
                                <History size={14} /> سابقه
                            </button>
                        </div>
                        <div className="text-slate-500 text-sm space-y-1 mb-4">
                            <div className="flex items-center gap-2"><Phone size={14}/> {company.phone || '---'}</div>
                            <div className="flex items-center gap-2"><MapPin size={14}/> {company.address || '---'}</div>
                        </div>
                    </div>
                    
                    <div className="bg-cyan-50 rounded-lg p-3 space-y-2 print:bg-slate-50">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 flex items-center gap-1"><Droplets size={14}/> حجم کل خرید ({dateFilter === 'all' ? 'کل' : 'دوره'}):</span>
                            <span className="font-bold text-cyan-800" dir="ltr">{stats.totalVolumePurchased.toLocaleString()}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 flex items-center gap-1"><Upload size={14}/> تامین صادرات:</span>
                            <span className="font-bold text-emerald-700" dir="ltr">{stats.totalVolumeSupplied.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-cyan-100 pt-2 print:border-slate-200">
                            <span className="text-slate-600 flex items-center gap-1"><BarChart3 size={14}/> مبلغ پرداختی خرید:</span>
                            <span className="font-bold text-cyan-800" dir="ltr">{stats.totalPaid.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            );
        })}
         {companies.length === 0 && <p className="text-slate-400 text-center col-span-full">هیچ شرکتی ثبت نشده است.</p>}
      </div>

      {/* History Modal */}
      {selectedCompanyId && selectedCompany && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
                  {/* Header */}
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                           <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                              <Building2 size={20} className="text-cyan-600"/>
                           </div>
                           <div>
                               <h3 className="font-bold text-slate-800 text-lg">تاریخچه بارگیری‌ها: {selectedCompany.name}</h3>
                               <div className="text-xs text-slate-500 mt-1">لیست بارهای تامین شده از این شرکت</div>
                           </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={handleHistoryExportPDF} 
                              disabled={isExportingHistoryPdf}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200" 
                              title="خروجی PDF"
                          >
                              {isExportingHistoryPdf ? <span className="animate-spin text-sm">⌛</span> : <FileDown size={18}/>}
                          </button>
                          <button 
                              onClick={handleHistoryExportCSV} 
                              className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200" 
                              title="خروجی اکسل"
                          >
                              <Download size={18}/>
                          </button>
                          <button 
                              onClick={handleHistoryPrint} 
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200" 
                              title="چاپ"
                          >
                              <Printer size={18}/>
                          </button>
                          <div className="w-px h-6 bg-slate-300 mx-1"></div>
                          <button onClick={() => setSelectedCompanyId(null)} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-lg border border-transparent hover:border-slate-200">
                              <X size={20}/>
                          </button>
                      </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-0" id="company-history-table">
                       <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                              <tr>
                                  <th className="px-4 py-3 font-semibold">تاریخ</th>
                                  <th className="px-4 py-3 font-semibold">راننده</th>
                                  <th className="px-4 py-3 font-semibold">مشخصات خودرو</th>
                                  <th className="px-4 py-3 font-semibold">بارنامه</th>
                                  <th className="px-4 py-3 font-semibold">حجم (تن)</th>
                                  <th className="px-4 py-3 font-semibold">قیمت واحد</th>
                                  <th className="px-4 py-3 font-semibold">مبلغ کل</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {historyData.length === 0 ? (
                                  <tr>
                                      <td colSpan={7} className="py-12 text-center text-slate-400">هیچ سابقه‌ای یافت نشد.</td>
                                  </tr>
                              ) : (
                                  historyData.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap" dir="ltr">{item.date}</td>
                                          <td className="px-4 py-3 font-medium text-slate-800">{item.driverName}</td>
                                          <td className="px-4 py-3 text-slate-600 text-xs">
                                              <div className="flex flex-col gap-1">
                                                  <span className="flex items-center gap-1"><Truck size={12}/> پلاک: {item.plateNumber}</span>
                                                  <span className="flex items-center gap-1"><Truck size={12} className="opacity-0"/> تانکر: {item.tankNumber}</span>
                                              </div>
                                          </td>
                                          <td className="px-4 py-3 font-mono text-slate-600">{item.billOfLading || '-'}</td>
                                          <td className="px-4 py-3 font-bold text-slate-700">{item.volume}</td>
                                          <td className="px-4 py-3 text-slate-600" dir="ltr">{item.price.toLocaleString()}</td>
                                          <td className="px-4 py-3 font-bold text-emerald-700 bg-emerald-50/50" dir="ltr">{item.totalPrice.toLocaleString()}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                          {historyData.length > 0 && (
                              <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                                  <tr>
                                      <td colSpan={4} className="px-4 py-3 text-center">مجموع کل</td>
                                      <td className="px-4 py-3 text-right" dir="ltr">{historyData.reduce((acc, curr) => acc + curr.volume, 0).toLocaleString()}</td>
                                      <td></td>
                                      <td className="px-4 py-3 text-right text-emerald-700" dir="ltr">{historyData.reduce((acc, curr) => acc + curr.totalPrice, 0).toLocaleString()}</td>
                                  </tr>
                              </tfoot>
                          )}
                       </table>
                  </div>
                  
                  {/* Footer Actions */}
                  <div className="bg-white p-4 border-t border-slate-200 flex justify-end">
                      <button 
                          onClick={() => setSelectedCompanyId(null)}
                          className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
                      >
                          بستن
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CompanyManager;
