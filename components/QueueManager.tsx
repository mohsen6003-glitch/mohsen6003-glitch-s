
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Truck, CheckCircle, Clock, PlayCircle, XCircle, AlertTriangle, Printer, Download, User, FileText, Hash, History, Droplets, FileDown, Settings2, CheckSquare, Square } from 'lucide-react';
import { QueueStatus } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import ExportModal from './ExportModal';

const QueueManager: React.FC = () => {
  const { drivers, queue, addToQueue, updateQueueStatus, transactions } = useData();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [destination, setDestination] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');

  // Column Selection State
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Default visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
      'rowNumber', 'fullName', 'plateNumber', 'destination', 'entryTime', 'status', 'actions'
  ]);

  const availableColumns = [
      { id: 'rowNumber', label: 'نوبت' },
      { id: 'fullName', label: 'نام راننده' },
      { id: 'nationalId', label: 'کد ملی' },
      { id: 'phone', label: 'شماره تماس' },
      { id: 'licenseNo', label: 'شماره گواهینامه' },
      { id: 'plateNumber', label: 'شماره پلاک' },
      { id: 'tankNumber', label: 'شماره تانکر' },
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
        // Maintain order based on availableColumns
        return availableColumns.filter(c => newSet.includes(c.id)).map(c => c.id);
    });
  };

  const handleAddToQueue = () => {
    if (!selectedDriver) {
      alert("لطفاً یک راننده انتخاب کنید.");
      return;
    }
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
    alert("راننده با موفقیت به صف اضافه شد.");
  };

  const activeQueue = queue.filter(q => q.status === 'WAIT' || q.status === 'LOADING');
  activeQueue.sort((a, b) => {
      if (a.status === 'LOADING' && b.status === 'WAIT') return -1;
      if (a.status === 'WAIT' && b.status === 'LOADING') return 1;
      return 0;
  });

  const getStatusBadge = (status: QueueStatus) => {
      switch(status) {
          case 'WAIT': 
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">
                    <Clock size={12} /> در انتظار
                </span>
            );
          case 'LOADING':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    در حال بارگیری
                </span>
            );
          default: return null;
      }
  };

  const getLastDriverActivity = (driverId: string) => {
    const history = transactions
        .filter(t => t.driverId === driverId)
        .sort((a, b) => parseInt(b.id) - parseInt(a.id));
    return history.length > 0 ? history[0] : null;
  };

  const handlePrint = () => window.print();

  const openExportModal = (type: 'csv' | 'pdf') => {
      if (activeQueue.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      setExportType(type);
      setShowExportModal(true);
  };

  const handleExportConfirm = (selectedIds: string[]) => {
      if (exportType === 'csv') {
          // Filter out 'actions' from selected IDs for CSV
          const exportCols = availableColumns.filter(c => selectedIds.includes(c.id) && c.id !== 'actions');
          const headers = exportCols.map(c => c.label);
          
          const rows = activeQueue.map((item, index) => {
              const driver = drivers.find(d => d.id === item.driverId);
              const lastActivity = getLastDriverActivity(item.driverId);
              const lastActivityStr = lastActivity ? `${lastActivity.date} (حجم: ${lastActivity.volume})` : 'بدون سابقه';
              
              const rowData: any = {
                  rowNumber: index + 1,
                  fullName: driver?.fullName || 'نامشخص',
                  nationalId: driver?.nationalId || '-',
                  phone: driver?.phone || '-',
                  licenseNo: driver?.licenseNo || '-',
                  plateNumber: driver?.plateNumber || '-',
                  tankNumber: driver?.tankNumber || '-',
                  lastLoad: lastActivityStr,
                  destination: item.destination,
                  entryTime: item.entryTime,
                  status: item.status === 'WAIT' ? 'در انتظار' : 'در حال بارگیری'
              };

              return exportCols.map(col => rowData[col.id]);
          });

          const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `queue_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
          link.click();
          document.body.removeChild(link);
      } else {
          handleExportPDF();
      }
  };

  const handleExportPDF = async () => {
      if (activeQueue.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      setIsExportingPdf(true);
      const input = document.getElementById('queue-report-container');
      if (input) {
          try {
              const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff', onclone: (clonedDoc) => {
                  const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden');
                  hiddenElements.forEach((el: any) => el.style.display = 'none');
              }});
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, imgHeight);
              pdf.save(`queue-report.pdf`);
          } catch (error) { alert("خطا در ایجاد PDF"); } finally { setIsExportingPdf(false); }
      }
  };

  return (
    <div className="space-y-6">
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExport={handleExportConfirm} 
        columns={availableColumns.filter(c => c.id !== 'actions')} 
        title="خروجی صف بارگیری" 
        type={exportType} 
      />

      <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">لیست صف بارگیری فعال</h1>
          <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleString('fa-IR')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
            <Truck size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-vazir">مدیریت صف بارگیری</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">راننده</label>
            <select 
              value={selectedDriver} 
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">انتخاب راننده...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.fullName} | {d.plateNumber}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مقصد</label>
            <input 
              type="text" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="مثال: تهران مرکز"
            />
          </div>
          <button 
            onClick={handleAddToQueue}
            className="w-full md:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
          >
            افزودن به صف
          </button>
        </div>
      </div>

      <div id="queue-report-container" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={20}/>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">وضعیت سکوی بارگیری</h3>
                 </div>
                 <span className="text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-medium">{activeQueue.length} فعال</span>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto items-center print:hidden">
                <div className="relative">
                    <button 
                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                        <Settings2 size={16} /> <span className="hidden xl:inline">ستون‌ها</span>
                    </button>
                    {showColumnSelector && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)}></div>
                            <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 p-2">
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-2">نمایش ستون‌ها</div>
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {availableColumns.map(col => (
                                        <button
                                            key={col.id}
                                            onClick={() => toggleColumn(col.id)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 transition-colors"
                                        >
                                            {visibleColumns.includes(col.id) 
                                                ? <CheckSquare size={16} className="text-blue-600 dark:text-blue-400"/> 
                                                : <Square size={16} className="text-slate-300 dark:text-slate-600"/>}
                                            {col.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <button onClick={handleExportPDF} disabled={isExportingPdf} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium">{isExportingPdf ? '...' : <FileDown size={16} />} PDF</button>
                <button onClick={() => openExportModal('csv')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-medium"><Download size={16} /> اکسل</button>
                <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium"><Printer size={16} /> چاپ</button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b dark:border-slate-800">
              <tr>
                {visibleColumns.includes('rowNumber') && <th className="px-6 py-4">نوبت</th>}
                {visibleColumns.includes('fullName') && <th className="px-6 py-4">نام راننده</th>}
                {visibleColumns.includes('nationalId') && <th className="px-6 py-4">کد ملی</th>}
                {visibleColumns.includes('phone') && <th className="px-6 py-4">تلفن</th>}
                {visibleColumns.includes('licenseNo') && <th className="px-6 py-4">گواهینامه</th>}
                {visibleColumns.includes('plateNumber') && <th className="px-6 py-4">پلاک</th>}
                {visibleColumns.includes('tankNumber') && <th className="px-6 py-4">تانکر</th>}
                {visibleColumns.includes('lastLoad') && <th className="px-6 py-4">آخرین بارگیری</th>}
                {visibleColumns.includes('destination') && <th className="px-6 py-4">مقصد</th>}
                {visibleColumns.includes('entryTime') && <th className="px-6 py-4">زمان ورود</th>}
                {visibleColumns.includes('status') && <th className="px-6 py-4">وضعیت</th>}
                {visibleColumns.includes('actions') && <th className="px-6 py-4 text-center print:hidden">تغییر وضعیت</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeQueue.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-8 text-center text-slate-400 dark:text-slate-600 italic">هیچ راننده‌ای در صف نیست</td>
                </tr>
              ) : (
                activeQueue.map((item, index) => {
                    const driver = drivers.find(d => d.id === item.driverId);
                    const lastActivity = getLastDriverActivity(item.driverId);
                    return (
                        <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.status === 'LOADING' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                            {visibleColumns.includes('rowNumber') && <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 font-bold">#{index + 1}</td>}
                            
                            {visibleColumns.includes('fullName') && (
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{driver?.fullName || 'ناشناس'}</td>
                            )}
                            {visibleColumns.includes('nationalId') && (
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{driver?.nationalId || '-'}</td>
                            )}
                            {visibleColumns.includes('phone') && (
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{driver?.phone || '-'}</td>
                            )}
                            {visibleColumns.includes('licenseNo') && (
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{driver?.licenseNo || '-'}</td>
                            )}
                            {visibleColumns.includes('plateNumber') && (
                                <td className="px-6 py-4">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold">{driver?.plateNumber || '-'}</span>
                                </td>
                            )}
                            {visibleColumns.includes('tankNumber') && (
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono">{driver?.tankNumber || '-'}</td>
                            )}

                            {visibleColumns.includes('lastLoad') && (
                                <td className="px-6 py-4 text-xs">
                                    {lastActivity ? (
                                        <div className="text-slate-600 dark:text-slate-400">{lastActivity.date.split(' ')[0]} ( {lastActivity.volume} تن )</div>
                                    ) : <span className="text-slate-400 dark:text-slate-600">بدون سابقه</span>}
                                </td>
                            )}
                            {visibleColumns.includes('destination') && <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.destination}</td>}
                            {visibleColumns.includes('entryTime') && <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs font-mono" dir="ltr">{item.entryTime}</td>}
                            {visibleColumns.includes('status') && <td className="px-6 py-4">{getStatusBadge(item.status)}</td>}
                            {visibleColumns.includes('actions') && (
                                <td className="px-6 py-4 print:hidden text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {item.status === 'WAIT' && (
                                            <>
                                                <button onClick={() => updateQueueStatus(item.id, 'LOADING')} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="شروع بارگیری"><PlayCircle size={18} /></button>
                                                <button onClick={() => updateQueueStatus(item.id, 'CANCELLED')} className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="لغو"><XCircle size={18} /></button>
                                            </>
                                        )}
                                        {item.status === 'LOADING' && (
                                            <button onClick={() => updateQueueStatus(item.id, 'DONE')} className="px-3 py-1 bg-emerald-500 text-white rounded text-xs hover:bg-emerald-600 transition-colors">تکمیل</button>
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
