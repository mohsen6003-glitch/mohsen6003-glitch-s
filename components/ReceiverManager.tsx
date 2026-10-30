
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Container, Plus, Phone, MapPin, Droplets, Printer, Download, ArrowDownToLine, History, X, FileDown, Truck, WalletCards, TrendingUp, TrendingDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ReceiverManager: React.FC = () => {
  const { receivers, addReceiver, getReceiverStats, transactions, drivers, getReceiverBalance } = useData();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  // History Modal State
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return alert("نام تحویل‌گیرنده الزامی است");
    addReceiver(form);
    setForm({ name: '', phone: '', address: '' });
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      if (receivers.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      
      const headers = ['نام تحویل‌گیرنده', 'تلفن', 'آدرس', 'حجم کل دریافتی', 'تعداد بار', 'تراز مالی (AED)'];
      const rows = receivers.map(r => {
          const stats = getReceiverStats(r.id);
          const balance = getReceiverBalance(r.id);
          return [r.name, r.phone, r.address, stats.totalVolumeReceived, stats.totalLoads, balance];
      });

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `receivers_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  // --- History Logic ---
  
  const historyData = useMemo(() => {
      if (!selectedReceiverId) return [];
      return transactions
          .filter(t => t.receiverId === selectedReceiverId)
          .map(t => {
              const driver = drivers.find(d => d.id === t.driverId);
              return {
                  ...t,
                  driverName: driver?.fullName || 'ناشناس',
                  plateNumber: driver?.plateNumber || '-',
                  tankNumber: driver?.tankNumber || '-',
              };
          })
          .sort((a, b) => parseInt(b.id) - parseInt(a.id)); 
  }, [selectedReceiverId, transactions, drivers]);

  const selectedReceiver = receivers.find(r => r.id === selectedReceiverId);

  const handleHistoryExportCSV = () => {
      if (historyData.length === 0) return alert('داده‌ای وجود ندارد.');
      const headers = ['تاریخ', 'نام راننده', 'شماره پلاک', 'شماره تانکر', 'حجم دریافتی (تن)', 'ارزش بار', 'بارنامه'];
      const rows = historyData.map(item => [
          item.date,
          item.driverName,
          item.plateNumber,
          item.tankNumber,
          item.volume,
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
      link.download = `receiver_history_${selectedReceiver?.name}_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  const handleHistoryExportPDF = async () => {
      const input = document.getElementById('receiver-history-table');
      if (input) {
          setIsExportingHistoryPdf(true);
          try {
              const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`history-${selectedReceiver?.name}.pdf`);
          } catch (err) {
              console.error(err);
              alert("خطا در ایجاد PDF");
          } finally {
              setIsExportingHistoryPdf(false);
          }
      }
  };

  const handleHistoryPrint = () => {
      const printContent = document.getElementById('receiver-history-table');
      if (printContent && selectedReceiver) {
          const windowUrl = 'about:blank';
          const uniqueName = new Date().getTime();
          const windowName = 'Print' + uniqueName;
          const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

          if (printWindow) {
              printWindow.document.write(`
                  <html dir="rtl">
                      <head>
                          <title>تاریخچه تحویل‌گیرنده - ${selectedReceiver.name}</title>
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
                              <h2>تاریخچه بارهای دریافتی: ${selectedReceiver.name}</h2>
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
      <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">لیست تحویل‌گیرندگان گاز (مقصد)</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print:hidden">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Container size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">مدیریت تحویل‌گیرندگان</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نام تحویل‌گیرنده</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100" placeholder="نام شرکت/شخص" />
            </div>
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تلفن</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100" placeholder="تلفن تماس" />
            </div>
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">آدرس</label>
                <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100" placeholder="آدرس / مقصد" />
            </div>
            <div className="md:col-span-1">
                <button type="submit" className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
                    <Plus size={18} /> ثبت گیرنده
                </button>
            </div>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
         <div className="flex items-center gap-2">
            <Container className="text-slate-400 dark:text-slate-500" size={20}/>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">لیست مقاصد و تحویل‌گیرندگان</h3>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleExportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-sm font-medium">
                <Download size={16} /> اکسل
            </button>
            <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors text-sm font-medium">
                <Printer size={16} /> چاپ
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receivers.map(receiver => {
            const stats = getReceiverStats(receiver.id);
            const balance = getReceiverBalance(receiver.id);
            return (
                <div key={receiver.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow flex flex-col justify-between print:border print:border-slate-300 print:shadow-none break-inside-avoid">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{receiver.name}</h3>
                            <button 
                                onClick={() => setSelectedReceiverId(receiver.id)}
                                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-1 rounded flex items-center gap-1 transition-colors print:hidden"
                            >
                                <History size={14} /> سابقه
                            </button>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-sm space-y-1 mb-4">
                            <div className="flex items-center gap-2"><Phone size={14}/> {receiver.phone || '---'}</div>
                            <div className="flex items-center gap-2"><MapPin size={14}/> {receiver.address || '---'}</div>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-lg p-3 space-y-2 print:bg-slate-50">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Droplets size={14}/> حجم کل دریافتی:</span>
                            <span className="font-bold text-indigo-800 dark:text-indigo-300" dir="ltr">{stats.totalVolumeReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-t border-indigo-100 dark:border-indigo-900/30 pt-2 print:border-slate-200">
                            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><WalletCards size={14}/> تراز (صرافی):</span>
                            <div className={`font-black flex items-center gap-1 ${balance === 0 ? 'text-slate-500' : balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {balance < 0 ? <TrendingDown size={14}/> : balance > 0 ? <TrendingUp size={14}/> : null}
                                <span dir="ltr">{Math.abs(balance).toLocaleString()}</span>
                                <span className="text-[10px] opacity-70">{balance < 0 ? '(بدهکار)' : balance > 0 ? '(بستانکار)' : '(تسویه)'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
         {receivers.length === 0 && <p className="text-slate-400 text-center col-span-full">هیچ تحویل‌گیرنده‌ای ثبت نشده است.</p>}
      </div>

      {/* History Modal */}
      {selectedReceiverId && selectedReceiver && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                           <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                              <Container size={20} className="text-indigo-600 dark:text-indigo-400"/>
                           </div>
                           <div>
                               <h3 className="font-bold text-slate-800 dark:text-white text-lg">تاریخچه دریافتی‌ها: {selectedReceiver.name}</h3>
                               <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">لیست بارهای تحویل شده به این مقصد</div>
                           </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={handleHistoryExportPDF} 
                              disabled={isExportingHistoryPdf}
                              className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800" 
                              title="خروجی PDF"
                          >
                              {isExportingHistoryPdf ? <span className="animate-spin text-sm">⌛</span> : <FileDown size={18}/>}
                          </button>
                          <button 
                              onClick={handleHistoryExportCSV} 
                              className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800" 
                              title="خروجی اکسل"
                          >
                              <Download size={18}/>
                          </button>
                          <button 
                              onClick={handleHistoryPrint} 
                              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700" 
                              title="چاپ"
                          >
                              <Printer size={18}/>
                          </button>
                          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                          <button onClick={() => setSelectedReceiverId(null)} className="text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                              <X size={20}/>
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0" id="receiver-history-table">
                       <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                              <tr>
                                  <th className="px-4 py-3 font-semibold">تاریخ</th>
                                  <th className="px-4 py-3 font-semibold">راننده</th>
                                  <th className="px-4 py-3 font-semibold">مشخصات خودرو</th>
                                  <th className="px-4 py-3 font-semibold">بارنامه</th>
                                  <th className="px-4 py-3 font-semibold">حجم (تن)</th>
                                  <th className="px-4 py-3 font-semibold">ارزش بار</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {historyData.length === 0 ? (
                                  <tr>
                                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-600 italic">هیچ سابقه‌ای یافت نشد.</td>
                                  </tr>
                              ) : (
                                  historyData.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-200">
                                          <td className="px-4 py-3 text-slate-500 dark:text-slate-500 whitespace-nowrap" dir="ltr">{item.date}</td>
                                          <td className="px-4 py-3 font-medium">{item.driverName}</td>
                                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                              <div className="flex flex-col gap-1">
                                                  <span className="flex items-center gap-1"><Truck size={12}/> پلاک: {item.plateNumber}</span>
                                                  <span className="flex items-center gap-1"><Truck size={12} className="opacity-0"/> تانکر: {item.tankNumber}</span>
                                              </div>
                                          </td>
                                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-500">{item.billOfLading || '-'}</td>
                                          <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{item.volume}</td>
                                          <td className="px-4 py-3 font-bold text-indigo-700 dark:text-indigo-400" dir="ltr">{item.totalPrice.toLocaleString()}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                          {historyData.length > 0 && (
                              <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                  <tr>
                                      <td colSpan={4} className="px-4 py-3 text-center">مجموع کل</td>
                                      <td className="px-4 py-3 text-right" dir="ltr">{historyData.reduce((acc, curr) => acc + curr.volume, 0).toLocaleString()}</td>
                                      <td className="px-4 py-3 text-right text-indigo-700 dark:text-indigo-400" dir="ltr">{historyData.reduce((acc, curr) => acc + curr.totalPrice, 0).toLocaleString()}</td>
                                  </tr>
                              </tfoot>
                          )}
                       </table>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                      <button 
                          onClick={() => setSelectedReceiverId(null)}
                          className="px-6 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
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

export default ReceiverManager;
