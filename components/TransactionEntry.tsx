
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Fuel, DollarSign, FileText, Printer, Download, Truck, Calculator, FileDown, Building2, Container } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ExportModal from './ExportModal';

const TransactionEntry: React.FC = () => {
  const { drivers, companies, receivers, addTransaction, exchangeRates, transactions, getDriverName, getCompanyName, getReceiverName } = useData();
  const [form, setForm] = useState({
    driverId: '',
    companyId: '',
    receiverId: '',
    volume: '',
    price: '',
    freightRate: '', // Rate per ton
    freightPrice: '', // Total Freight
    description: '',
    billOfLading: ''
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');

  // Column Definitions
  const columns = [
      { id: 'date', label: 'تاریخ' },
      { id: 'driver', label: 'نام راننده' },
      { id: 'company', label: 'شرکت تامین‌کننده' },
      { id: 'receiver', label: 'تحویل‌گیرنده' },
      { id: 'billOfLading', label: 'شماره بارنامه' },
      { id: 'volume', label: 'حجم گاز' },
      { id: 'price', label: 'قیمت واحد' },
      { id: 'totalPrice', label: 'هزینه کل گاز' },
      { id: 'freightPrice', label: 'کرایه راننده' },
      { id: 'description', label: 'توضیحات' },
  ];

  // Auto-calculate freight price when volume or rate changes
  useEffect(() => {
      const vol = parseFloat(form.volume) || 0;
      const rate = parseFloat(form.freightRate) || 0;
      if (vol > 0 && rate > 0) {
          setForm(prev => ({ ...prev, freightPrice: (vol * rate).toString() }));
      }
  }, [form.volume, form.freightRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driverId || !form.volume || !form.price) {
      alert("لطفاً تمامی فیلدهای الزامی را پر کنید.");
      return;
    }
    
    const vol = parseFloat(form.volume);
    let unitPriceUsd = parseFloat(form.price);
    const freight = form.freightPrice ? parseFloat(form.freightPrice) : 0;
    const rate = form.freightRate ? parseFloat(form.freightRate) : 0;
    
    // Always convert from USD to Toman for internal tracking
    const unitPriceToman = unitPriceUsd * exchangeRates.usd;
    const totalToman = vol * unitPriceToman;

    addTransaction({
      driverId: form.driverId,
      companyId: form.companyId,
      receiverId: form.receiverId,
      date: new Date().toLocaleString('fa-IR'),
      volume: vol,
      price: unitPriceToman, // Save in Base Currency (Toman)
      totalPrice: totalToman,
      freightPrice: freight, // Add freight
      description: `${form.description} ${rate ? `(نرخ کرایه: ${rate.toLocaleString()} تومان/تن)` : ''} (نرخ خرید: $${form.price})`,
      billOfLading: form.billOfLading
    });
    
    alert(`تراکنش ثبت شد. مبلغ کل گاز: ${totalToman.toLocaleString()} تومان | کرایه راننده: ${freight.toLocaleString()} تومان`);
    setForm({ driverId: '', companyId: '', receiverId: '', volume: '', price: '', freightRate: '', freightPrice: '', description: '', billOfLading: '' });
  };

  const calculateTotalPreview = () => {
      const vol = parseFloat(form.volume || '0');
      const priUsd = parseFloat(form.price || '0');
      let totalUsd = vol * priUsd;
      
      return (
          <div className="flex flex-col items-end">
              <span dir="ltr">${totalUsd.toLocaleString()}</span>
              <span className="text-xs text-emerald-600 mt-1" dir="rtl">
                  معادل: {(totalUsd * exchangeRates.usd).toLocaleString()} تومان
              </span>
          </div>
      );
  };

  const handlePrint = () => {
      window.print();
  };

  const openExportModal = (type: 'csv' | 'pdf') => {
      if (transactions.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      setExportType(type);
      setShowExportModal(true);
  };

  const handleExportConfirm = (selectedIds: string[]) => {
      if (exportType === 'csv') {
          handleExportCSV(selectedIds);
      } else {
          handleExportPDF(selectedIds);
      }
  };

  const handleExportCSV = (selectedIds: string[]) => {
      const headers = columns.filter(c => selectedIds.includes(c.id)).map(c => c.label);
      
      const rows = transactions.map(t => {
          const rowData: Record<string, any> = {
              date: t.date,
              driver: getDriverName(t.driverId),
              company: t.companyId ? getCompanyName(t.companyId) : '-',
              receiver: t.receiverId ? getReceiverName(t.receiverId) : '-',
              billOfLading: t.billOfLading || '-',
              volume: t.volume,
              price: t.price,
              totalPrice: t.totalPrice,
              freightPrice: t.freightPrice || 0,
              description: t.description
          };
          return selectedIds.map(id => rowData[id]);
      });

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `transactions_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = async (selectedIds: string[]) => {
      setIsExportingPdf(true);
      const input = document.getElementById('transactions-report-container');
      const table = input?.querySelector('table');
      
      if (input && table) {
          const headerCells = table.querySelectorAll('thead th');
          const bodyRows = table.querySelectorAll('tbody tr');
          const hiddenIndices: number[] = [];

          columns.forEach((col, index) => {
              if (!selectedIds.includes(col.id)) {
                  hiddenIndices.push(index);
              }
          });

          const toggleVisibility = (hide: boolean) => {
              hiddenIndices.forEach(idx => {
                  if (headerCells[idx]) (headerCells[idx] as HTMLElement).style.display = hide ? 'none' : '';
                  bodyRows.forEach(row => {
                      const cells = row.children;
                      if (cells[idx]) (cells[idx] as HTMLElement).style.display = hide ? 'none' : '';
                  });
              });
          };

          try {
              toggleVisibility(true); 
              
              const originalOverflow = input.style.overflow;
              input.style.overflow = 'visible';

              const canvas = await html2canvas(input, { 
                  scale: 2, 
                  backgroundColor: '#ffffff',
                  onclone: (clonedDoc) => {
                      const hiddenElements = clonedDoc.querySelectorAll('[data-html2canvas-ignore="true"]');
                      hiddenElements.forEach((el: any) => el.style.display = 'none');
                  }
              });
              
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`transactions_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.pdf`);
              
              input.style.overflow = originalOverflow;
          } catch (err) {
              console.error(err);
              alert("خطا در ایجاد PDF");
          } finally {
              toggleVisibility(false); 
              setIsExportingPdf(false);
          }
      } else {
          setIsExportingPdf(false);
      }
  };

  return (
    <div className="space-y-6">
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
        columns={columns}
        title="تراکنش‌ها"
        type={exportType}
      />

      <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">گزارش ورود گاز و هزینه‌ها</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
      </div>

      <div className="max-w-4xl mx-auto print:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Fuel size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">ثبت محموله جدید گاز</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">انتخاب راننده <span className="text-red-500">*</span></label>
              <select 
                value={form.driverId} 
                onChange={(e) => setForm({...form, driverId: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">انتخاب کنید...</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.fullName} | {d.plateNumber}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Building2 size={14} className="text-slate-400"/> شرکت تامین‌کننده</label>
              <select 
                value={form.companyId} 
                onChange={(e) => setForm({...form, companyId: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">انتخاب کنید...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Container size={14} className="text-slate-400"/> تحویل‌گیرنده (مقصد)</label>
              <select 
                value={form.receiverId} 
                onChange={(e) => setForm({...form, receiverId: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">انتخاب کنید...</option>
                {receivers.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره بارنامه</label>
              <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <FileText size={16} />
                  </span>
                  <input 
                      type="text" 
                      value={form.billOfLading} 
                      onChange={(e) => setForm({...form, billOfLading: e.target.value})}
                      className="w-full p-2.5 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="شماره بارنامه..."
                  />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">حجم گاز (تن) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                step="0.01"
                value={form.volume} 
                onChange={(e) => setForm({...form, volume: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">قیمت واحد گاز (دلار) <span className="text-red-500">*</span></label>
              </div>
              <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input 
                  type="number" 
                  step="0.01"
                  value={form.price} 
                  onChange={(e) => setForm({...form, price: e.target.value})}
                  className="w-full p-2.5 pl-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                  />
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded text-[10px] text-slate-500 border border-slate-200">
                    تومان
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Truck size={16} className="text-blue-600"/> 
                    محاسبه کرایه راننده
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">نرخ کرایه (تومان به ازای هر تن)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                value={form.freightRate}
                                onChange={(e) => setForm({...form, freightRate: e.target.value})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="مثال: 500000"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">تومان/تن</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">کرایه کل (تومان)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                value={form.freightPrice}
                                onChange={(e) => setForm({...form, freightPrice: e.target.value})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                                placeholder="0"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">تومان</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات (اختیاری)</label>
              <input 
                type="text" 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="یادداشت درباره این محموله..."
              />
            </div>

            <div className="md:col-span-2 mt-4">
               <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-4 flex justify-between items-center">
                   <span className="text-emerald-800 font-medium">مبلغ کل برآوردی گاز (هزینه سیستم):</span>
                   <div className="text-2xl font-bold text-emerald-700">
                      {calculateTotalPreview()}
                   </div>
               </div>
              <button type="submit" className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <DollarSign size={20} />
                ثبت محموله
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="transactions-report-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
         <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 print:bg-white print:border-b-2 print:border-slate-800">
             <h3 className="font-bold text-slate-700">لیست بارها و هزینه‌ها</h3>
             <div className="flex gap-2 print:hidden" data-html2canvas-ignore="true">
                <button 
                    onClick={() => openExportModal('pdf')}
                    disabled={isExportingPdf}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    {isExportingPdf ? <span className="animate-spin text-sm">⌛</span> : <FileDown size={16} />} PDF
                </button>
                <button 
                    onClick={() => openExportModal('csv')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                >
                    <Download size={16} /> اکسل
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                >
                    <Printer size={16} /> چاپ
                </button>
             </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
               <thead className="bg-slate-100 text-slate-600 font-semibold print:bg-white print:text-black print:border-b">
                  <tr>
                     <th className="px-6 py-4">تاریخ</th>
                     <th className="px-6 py-4">راننده</th>
                     <th className="px-6 py-4">تامین‌کننده</th>
                     <th className="px-6 py-4">تحویل‌گیرنده</th>
                     <th className="px-6 py-4">بارنامه</th>
                     <th className="px-6 py-4">حجم (تن)</th>
                     <th className="px-6 py-4">قیمت واحد (T)</th>
                     <th className="px-6 py-4">هزینه کل گاز (T)</th>
                     <th className="px-6 py-4 text-blue-600">کرایه راننده</th>
                     <th className="px-6 py-4">توضیحات</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {transactions.slice().reverse().map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap" dir="ltr">{t.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{getDriverName(t.driverId)}</td>
                          <td className="px-6 py-4 text-slate-700">{t.companyId ? getCompanyName(t.companyId) : '-'}</td>
                          <td className="px-6 py-4 text-slate-700">{t.receiverId ? getReceiverName(t.receiverId) : '-'}</td>
                          <td className="px-6 py-4 font-mono text-slate-900">{t.billOfLading || '-'}</td>
                          <td className="px-6 py-4 text-slate-900">{t.volume}</td>
                          <td className="px-6 py-4 text-slate-600" dir="ltr">{t.price.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">{t.totalPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-blue-600" dir="ltr">{(t.freightPrice || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{t.description}</td>
                      </tr>
                  ))}
                  {transactions.length === 0 && (
                      <tr><td colSpan={10} className="text-center py-6 text-slate-400">هیچ باری ثبت نشده است</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default TransactionEntry;
