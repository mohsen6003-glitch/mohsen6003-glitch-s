
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Truck, CheckCircle, Clock, PlayCircle, XCircle, AlertTriangle, Printer, Download, User, FileText, Hash, History, Droplets, FileDown, Settings2, CheckSquare, Square } from 'lucide-react';
import { QueueStatus } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const QueueManager: React.FC = () => {
  const { drivers, queue, addToQueue, updateQueueStatus, transactions } = useData();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [destination, setDestination] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Column Selection State
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
      'rowNumber', 'driverDetails', 'carDetails', 'lastLoad', 'destination', 'entryTime', 'status', 'actions'
  ]);

  const availableColumns = [
      { id: 'rowNumber', label: 'نوبت' },
      { id: 'driverDetails', label: 'مشخصات راننده' },
      { id: 'carDetails', label: 'مشخصات خودرو' },
      { id: 'lastLoad', label: 'آخرین بارگیری' },
      { id: 'destination', label: 'مقصد' },
      { id: 'entryTime', label: 'زمان ورود' },
      { id: 'status', label: 'وضعیت' },
      { id: 'actions', label: 'تغییر وضعیت' },
  ];

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => {
        let newSet;
        if (prev.includes(id)) {
            newSet = prev.filter(c => c !== id);
        } else {
            newSet = [...prev, id];
        }
        // Ensure column order follows availableColumns definition
        return availableColumns.filter(c => newSet.includes(c.id)).map(c => c.id);
    });
  };

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
    
    // Clear fields automatically
    setDestination('');
    setSelectedDriver('');
    
    // Show success message
    alert("راننده با موفقیت به صف اضافه شد.");
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

  const getLastDriverActivity = (driverId: string) => {
    // Filter transactions for this driver and sort by ID (descending) as ID is timestamp
    const history = transactions
        .filter(t => t.driverId === driverId)
        .sort((a, b) => parseInt(b.id) - parseInt(a.id));
    
    return history.length > 0 ? history[0] : null;
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportCSV = () => {
      if (activeQueue.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');

      // Only export visible columns logic could be applied here, 
      // but usually CSV export includes standard fields. 
      // For consistency with view, we could filter, but let's keep full export for now or adapt if needed.
      // Let's stick to full export as implemented previously for robust data backup.
      
      const headers = ['نوبت', 'نام راننده', 'کد ملی', 'تلفن', 'شماره گواهینامه', 'پلاک خودرو', 'شماره تانک', 'مقصد', 'زمان ورود', 'وضعیت', 'آخرین بارگیری'];
      
      const rows = activeQueue.map((item, index) => {
          const driver = drivers.find(d => d.id === item.driverId);
          const lastActivity = getLastDriverActivity(item.driverId);
          const lastActivityStr = lastActivity ? `${lastActivity.date} (حجم: ${lastActivity.volume})` : 'بدون سابقه';

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
            item.status === 'WAIT' ? 'در انتظار' : 'در حال بارگیری',
            lastActivityStr
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

  const handleExportPDF = async () => {
      if (activeQueue.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      
      setIsExportingPdf(true);
      const input = document.getElementById('queue-report-container');
      
      if (input) {
          try {
              // Temporarily adjust styles for capture
              const originalOverflow = input.style.overflow;
              input.style.overflow = 'visible';
              
              // Capture using html2canvas
              const canvas = await html2canvas(input, {
                  scale: 2, 
                  useCORS: true,
                  backgroundColor: '#ffffff',
                  onclone: (clonedDoc) => {
                      const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden');
                      hiddenElements.forEach((el: any) => el.style.display = 'none');
                  }
              });
              
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`queue-report-${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.pdf`);
              
              input.style.overflow = originalOverflow;
          } catch (error) {
              console.error("PDF Export Error:", error);
              alert("خطا در ایجاد فایل PDF");
          } finally {
              setIsExportingPdf(false);
          }
      }
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
      <div id="queue-report-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 print:border-b-2 print:border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="text-slate-400" size={20}/>
                    <h3 className="text-lg font-bold text-slate-800">وضعیت سکوی بارگیری</h3>
                 </div>
                 <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium print:hidden">{activeQueue.length} فعال</span>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto items-center print:hidden" data-html2canvas-ignore="true">
                {/* Column Selector */}
                <div className="relative">
                    <button 
                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        <Settings2 size={16} /> <span className="hidden xl:inline">ستون‌ها</span>
                    </button>
                    
                    {showColumnSelector && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)}></div>
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-20 p-2 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-xs font-bold text-slate-500 mb-2 px-2">نمایش ستون‌ها</div>
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {availableColumns.map(col => (
                                        <button
                                            key={col.id}
                                            onClick={() => toggleColumn(col.id)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded text-sm text-slate-700 transition-colors"
                                        >
                                            {visibleColumns.includes(col.id) 
                                                ? <CheckSquare size={16} className="text-blue-600"/> 
                                                : <Square size={16} className="text-slate-300"/>}
                                            {col.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-px h-6 bg-slate-300 mx-1"></div>

                <button 
                    onClick={handleExportPDF}
                    disabled={isExportingPdf}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    {isExportingPdf ? <span className="animate-spin text-lg">⌛</span> : <FileDown size={16} />} 
                    PDF
                </button>
                <button 
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                >
                    <Download size={16} /> اکسل
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
                {visibleColumns.includes('rowNumber') && <th className="px-6 py-4">نوبت</th>}
                {visibleColumns.includes('driverDetails') && <th className="px-6 py-4">مشخصات راننده</th>}
                {visibleColumns.includes('carDetails') && <th className="px-6 py-4">مشخصات خودرو</th>}
                {visibleColumns.includes('lastLoad') && <th className="px-6 py-4">آخرین بارگیری</th>}
                {visibleColumns.includes('destination') && <th className="px-6 py-4">مقصد</th>}
                {visibleColumns.includes('entryTime') && <th className="px-6 py-4">زمان ورود</th>}
                {visibleColumns.includes('status') && <th className="px-6 py-4">وضعیت</th>}
                {visibleColumns.includes('actions') && <th className="px-6 py-4 text-center print:hidden" data-html2canvas-ignore="true">تغییر وضعیت</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {activeQueue.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-8 text-center text-slate-400 italic">هیچ راننده‌ای در صف نیست</td>
                </tr>
              ) : (
                activeQueue.map((item, index) => {
                    const driver = drivers.find(d => d.id === item.driverId);
                    const lastActivity = getLastDriverActivity(item.driverId);

                    return (
                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors print:hover:bg-transparent ${item.status === 'LOADING' ? 'bg-blue-50/50 print:bg-transparent' : ''}`}>
                            {visibleColumns.includes('rowNumber') && (
                                <td className="px-6 py-4 font-mono text-slate-500 font-bold">#{index + 1}</td>
                            )}
                            {visibleColumns.includes('driverDetails') && (
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{driver?.fullName || 'ناشناس'}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                                        <span className="flex items-center gap-1"><Hash size={12}/> کد ملی: {driver?.nationalId || '-'}</span>
                                        <span className="flex items-center gap-1"><User size={12}/> تلفن: {driver?.phone || '-'}</span>
                                        {driver?.licenseNo && <span className="flex items-center gap-1"><FileText size={12}/> گواهینامه: {driver.licenseNo}</span>}
                                    </div>
                                </td>
                            )}
                            {visibleColumns.includes('carDetails') && (
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs text-slate-500">پلاک:</div>
                                        <div className="font-mono bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200 text-slate-800 font-semibold print:bg-transparent print:border-black">
                                            {driver?.plateNumber || '-'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">تانکر: <span className="font-mono font-medium text-slate-700">{driver?.tankNumber || '-'}</span></div>
                                    </div>
                                </td>
                            )}
                            {visibleColumns.includes('lastLoad') && (
                                <td className="px-6 py-4">
                                    {lastActivity ? (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                                                <History size={12} className="text-slate-400" />
                                                <span>{lastActivity.date.split(' ')[0]}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 w-fit">
                                                <Droplets size={12} className="text-emerald-500" />
                                                <span dir="ltr">{lastActivity.volume.toLocaleString()}</span>
                                                <span className="text-[10px] opacity-75">واحد</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">بدون سابقه</span>
                                    )}
                                </td>
                            )}
                            {visibleColumns.includes('destination') && (
                                <td className="px-6 py-4 text-slate-600">{item.destination}</td>
                            )}
                            {visibleColumns.includes('entryTime') && (
                                <td className="px-6 py-4 text-slate-500 text-sm" dir="ltr">{item.entryTime}</td>
                            )}
                            {visibleColumns.includes('status') && (
                                <td className="px-6 py-4">
                                    {getStatusBadge(item.status)}
                                </td>
                            )}
                            {visibleColumns.includes('actions') && (
                                <td className="px-6 py-4 print:hidden" data-html2canvas-ignore="true">
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
                            )}
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
