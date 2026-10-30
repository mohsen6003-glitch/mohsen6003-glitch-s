
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Fuel, Truck, Building2, Container, Pencil, Trash2, X, Save, Printer, Download, FileDown } from 'lucide-react';
import ExportModal from './ExportModal';
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { Transaction } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatNumberInput, cleanNumberInput } from '../utils/numberUtils';

const TransactionEntry: React.FC = () => {
  const { drivers, companies, receivers, addTransaction, updateTransaction, deleteTransaction, exchangeRates, transactions, getDriverName, getCompanyName, getReceiverName } = useData();
  
  const [form, setForm] = useState({
    driverId: '',
    companyId: '',
    receiverId: '',
    volume: '',
    price: '',
    freightRate: '',
    freightPrice: '',
    description: '',
    billOfLading: ''
  });
  
  // انتخاب نرخ دلار، درهم (با نرخ صرافی ۳.۶۷) و نرخ ریال/تومان برای کرایه و گاز
  const [freightCurrency, setFreightCurrency] = useState<'TOMAN' | 'USD' | 'AED'>('TOMAN');
  const [gasCurrency, setGasCurrency] = useState<'USD' | 'TOMAN'>('USD');
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('');
  const [usdAedRateInput, setUsdAedRateInput] = useState<string>('3.67');

  useEffect(() => {
    if (!exchangeRateInput && exchangeRates.usd) {
      setExchangeRateInput(exchangeRates.usd.toString());
    }
  }, [exchangeRates.usd]);

  const [entryDate, setEntryDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [editId, setEditId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  // محاسبه خودکار کرایه بر اساس نرخ، حجم و نرخ تبدیل صرافی ۳.۶۷
  useEffect(() => {
      const vol = parseFloat(form.volume) || 0;
      const rate = parseFloat(form.freightRate) || 0;
      const exRate = parseFloat(exchangeRateInput) || exchangeRates.usd || 60000;
      const usdAed = parseFloat(usdAedRateInput) || 3.67;

      if (vol > 0 && rate > 0) {
          if (freightCurrency === 'USD') {
              const totalUsd = vol * rate;
              const totalToman = Math.round(totalUsd * exRate);
              setForm(prev => ({ ...prev, freightPrice: totalToman.toString() }));
          } else if (freightCurrency === 'AED') {
              const totalUsd = usdAed > 0 ? (vol * rate) / usdAed : 0;
              const totalToman = Math.round(totalUsd * exRate);
              setForm(prev => ({ ...prev, freightPrice: totalToman.toString() }));
          } else {
              setForm(prev => ({ ...prev, freightPrice: Math.round(vol * rate).toString() }));
          }
      }
  }, [form.volume, form.freightRate, freightCurrency, exchangeRateInput, usdAedRateInput, exchangeRates.usd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driverId || !form.volume || !form.price || !entryDate) return alert("اطلاعات ناقص است. لطفاً راننده، حجم، قیمت و تاریخ را پر کنید.");
    
    const vol = parseFloat(form.volume) || 0;
    const exRate = parseFloat(exchangeRateInput) || exchangeRates.usd || 60000;
    const usdAed = parseFloat(usdAedRateInput) || 3.67;

    let unitPriceToman = 0;
    let unitPriceUsd = 0;
    if (gasCurrency === 'USD') {
        unitPriceUsd = parseFloat(form.price) || 0;
        unitPriceToman = Math.round(unitPriceUsd * exRate);
    } else {
        unitPriceToman = parseFloat(form.price) || 0;
        unitPriceUsd = exRate > 0 ? parseFloat((unitPriceToman / exRate).toFixed(2)) : 0;
    }
    const totalToman = Math.round(vol * unitPriceToman);

    const rateVal = parseFloat(form.freightRate) || 0;
    let freightPriceVal = 0;
    let rateUsd = 0;
    let rateAed = 0;
    let totalUsdFreight = 0;
    let totalAedFreight = 0;

    if (freightCurrency === 'USD') {
        rateUsd = rateVal;
        rateAed = parseFloat((rateVal * usdAed).toFixed(2));
        totalUsdFreight = vol * rateVal;
        totalAedFreight = parseFloat((totalUsdFreight * usdAed).toFixed(2));
        freightPriceVal = Math.round(totalUsdFreight * exRate);
    } else if (freightCurrency === 'AED') {
        rateAed = rateVal;
        rateUsd = usdAed > 0 ? parseFloat((rateVal / usdAed).toFixed(2)) : 0;
        totalAedFreight = vol * rateVal;
        totalUsdFreight = usdAed > 0 ? (vol * rateVal) / usdAed : 0;
        freightPriceVal = Math.round(totalUsdFreight * exRate);
    } else {
        freightPriceVal = form.freightPrice ? parseFloat(form.freightPrice) : Math.round(vol * rateVal);
        rateUsd = exRate > 0 ? parseFloat((rateVal / exRate).toFixed(2)) : 0;
        rateAed = parseFloat((rateUsd * usdAed).toFixed(2));
        totalUsdFreight = exRate > 0 ? freightPriceVal / exRate : 0;
        totalAedFreight = parseFloat((totalUsdFreight * usdAed).toFixed(2));
    }

    let freightDescPart = '';
    if (freightCurrency === 'USD') {
        freightDescPart = `کرایه: $${rateVal}/تن ($${totalUsdFreight.toFixed(1)} | صرافی ۳.۶۷: ${totalAedFreight.toLocaleString()} AED | ${freightPriceVal.toLocaleString()} تومان)`;
    } else if (freightCurrency === 'AED') {
        freightDescPart = `کرایه: ${rateVal} AED/تن (${totalAedFreight.toLocaleString()} AED | معادل صرافی ۳.۶۷: $${totalUsdFreight.toFixed(1)} | ${freightPriceVal.toLocaleString()} تومان)`;
    } else {
        freightDescPart = `کرایه: ${rateVal.toLocaleString()} تومان/تن (${freightPriceVal.toLocaleString()} تومان | معادل $${totalUsdFreight.toFixed(1)} - ${totalAedFreight.toLocaleString()} AED)`;
    }

    const transactionData = {
      driverId: form.driverId, 
      companyId: form.companyId, 
      receiverId: form.receiverId,
      date: entryDate.format("YYYY/MM/DD HH:mm"), 
      volume: vol, 
      price: unitPriceToman, 
      totalPrice: totalToman, 
      freightPrice: freightPriceVal,
      freightRate: rateVal,
      freightCurrency,
      freightRateUSD: rateUsd,
      freightRateAED: rateAed,
      exchangeRate: exRate,
      exchangeRateUSD_AED: usdAed,
      gasCurrency,
      gasPriceUSD: unitPriceUsd,
      description: `${form.description ? `${form.description} | ` : ''}${freightDescPart}`, 
      billOfLading: form.billOfLading
    };

    if (editId) {
        updateTransaction(editId, transactionData);
        alert("تراکنش با موفقیت ویرایش شد.");
        setEditId(null);
    } else {
        addTransaction(transactionData);
        alert("تراکنش جدید ثبت شد.");
    }

    setForm({ driverId: '', companyId: '', receiverId: '', volume: '', price: '', freightRate: '', freightPrice: '', description: '', billOfLading: '' });
    setEntryDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const handleEdit = (t: Transaction) => {
      setEditId(t.id);
      const exRate = t.exchangeRate || exchangeRates.usd || 60000;
      setExchangeRateInput(exRate.toString());
      setUsdAedRateInput(t.exchangeRateUSD_AED ? t.exchangeRateUSD_AED.toString() : '3.67');

      if (t.freightCurrency) {
          setFreightCurrency(t.freightCurrency);
      }
      if (t.gasCurrency === 'TOMAN' || t.gasCurrency === 'USD') {
          setGasCurrency(t.gasCurrency);
      }

      let priceVal = '';
      if (t.gasCurrency === 'TOMAN') {
          priceVal = t.price.toString();
      } else {
          priceVal = t.gasPriceUSD ? t.gasPriceUSD.toString() : (t.price / exRate).toFixed(2);
      }

      let freightRateCalc = '';
      if (t.freightCurrency === 'USD' && t.freightRateUSD) {
          freightRateCalc = t.freightRateUSD.toString();
      } else if (t.freightCurrency === 'AED' && t.freightRateAED) {
          freightRateCalc = t.freightRateAED.toString();
      } else if (t.freightRate) {
          freightRateCalc = t.freightRate.toString();
      } else if (t.volume > 0 && t.freightPrice) {
          freightRateCalc = (t.freightPrice / t.volume).toFixed(0);
      }

      setForm({
          driverId: t.driverId,
          companyId: t.companyId || '',
          receiverId: t.receiverId || '',
          volume: t.volume.toString(),
          price: priceVal,
          freightRate: freightRateCalc,
          freightPrice: (t.freightPrice || 0).toString(),
          description: t.description,
          billOfLading: t.billOfLading || ''
      });

      setEntryDate(new DateObject({ date: t.date, format: "YYYY/MM/DD HH:mm", calendar: persian, locale: persian_fa }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
      if (window.confirm("آیا از حذف این تراکنش اطمینان دارید؟")) {
          deleteTransaction(id);
      }
  };

  const handleCancelEdit = () => {
      setEditId(null);
      setForm({ driverId: '', companyId: '', receiverId: '', volume: '', price: '', freightRate: '', freightPrice: '', description: '', billOfLading: '' });
      setEntryDate(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const calculateTotalPreview = () => {
      const vol = parseFloat(form.volume || '0');
      const exRate = parseFloat(exchangeRateInput) || exchangeRates.usd || 60000;
      let totalUsd = 0;
      let totalToman = 0;

      if (gasCurrency === 'USD') {
          totalUsd = vol * parseFloat(form.price || '0');
          totalToman = Math.round(totalUsd * exRate);
      } else {
          totalToman = Math.round(vol * parseFloat(form.price || '0'));
          totalUsd = exRate > 0 ? parseFloat((totalToman / exRate).toFixed(2)) : 0;
      }

      return (
          <div className="flex flex-col items-end">
              <span dir="ltr" className="text-lg font-bold">${totalUsd.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-mono">({totalToman.toLocaleString()} تومان)</span>
          </div>
      );
  };

  const handlePrint = () => window.print();
  
  const openExportModal = (type: 'csv' | 'pdf') => {
      if (transactions.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');
      setExportType(type); 
      setShowExportModal(true);
  };

  const handleExportConfirm = (selectedIds: string[]) => {
      if (exportType === 'csv') {
          const headers = columns.filter(c => selectedIds.includes(c.id)).map(c => c.label);
          const rows = transactions.map(t => {
              const data: any = {
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
              return columns.filter(c => selectedIds.includes(c.id)).map(c => data[c.id]);
          });
          
          const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `transactions.csv`; 
          link.click();
      } else {
          handleExportPDF();
      }
  };

  const handleExportPDF = async () => {
      setIsExportingPdf(true);
      const input = document.getElementById('transaction-table-container');
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
              pdf.save(`transactions-report.pdf`);
          } catch (error) {
              alert("خطا در ایجاد PDF");
              console.error(error);
          } finally {
              setIsExportingPdf(false);
          }
      } else {
          setIsExportingPdf(false);
          alert("خطا: جدول پیدا نشد.");
      }
  };

  return (
    <div className="space-y-6">
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExportConfirm} columns={columns} title="تراکنش‌ها" type={exportType} />
      
      <div className="max-w-4xl mx-auto print:hidden">
        <div className={`rounded-xl shadow-sm border p-6 transition-all ${editId ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${editId ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                    {editId ? <Pencil size={24} /> : <Fuel size={24} />}
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    {editId ? 'ویرایش اطلاعات محموله' : 'ثبت محموله جدید گاز'}
                </h2>
            </div>
            {editId && (
                <button onClick={handleCancelEdit} className="text-sm flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors">
                    <X size={16}/> انصراف
                </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاریخ و زمان بارگیری</label>
              <DatePicker 
                value={entryDate}
                onChange={setEntryDate}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker hideSeconds />]}
                inputClass="rmdp-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">انتخاب راننده</label>
              <select value={form.driverId} onChange={(e) => setForm({...form, driverId: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none">
                <option value="">انتخاب کنید...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName} | {d.plateNumber}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شرکت تامین‌کننده</label>
              <select value={form.companyId} onChange={(e) => setForm({...form, companyId: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none">
                <option value="">(اختیاری) انتخاب کنید...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تحویل‌گیرنده (مقصد)</label>
              <select value={form.receiverId} onChange={(e) => setForm({...form, receiverId: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none">
                <option value="">(اختیاری) انتخاب کنید...</option>
                {receivers.map(r => <option key={r.id} value={r.id}>{r.name} - {r.address}</option>)}
              </select>
            </div>

            {/* حجم بار و نرخ ارز روز و نرخ صرافی ۳.۶۷ */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حجم گاز / وزن بار (تن) <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" required value={form.volume} onChange={(e) => setForm({...form, volume: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none font-bold font-mono" placeholder="0.00" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">نرخ دلار به تومان</label>
                  <button 
                    type="button" 
                    onClick={() => setExchangeRateInput(exchangeRates.usd ? exchangeRates.usd.toString() : '60000')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    نرخ صرافی ({exchangeRates.usd?.toLocaleString()} T)
                  </button>
                </div>
                <input type="text" inputMode="decimal" dir="ltr" value={formatNumberInput(exchangeRateInput)} onChange={(e) => setExchangeRateInput(cleanNumberInput(e.target.value))} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none font-bold font-mono text-left" placeholder="60,000" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">نرخ تبدیل صرافی (دلار به درهم)</label>
                  <button 
                    type="button" 
                    onClick={() => setUsdAedRateInput('3.67')}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    نرخ پایه (۳.۶۷)
                  </button>
                </div>
                <input type="number" step="0.001" value={usdAedRateInput} onChange={(e) => setUsdAedRateInput(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 rounded-lg outline-none font-bold font-mono" placeholder="3.67" />
              </div>
            </div>

            {/* قیمت واحد گاز */}
            <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">قیمت واحد گاز / بار:</label>
                <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button 
                    type="button" 
                    onClick={() => setGasCurrency('USD')}
                    className={`px-2.5 py-1 text-xs rounded ${gasCurrency === 'USD' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500'}`}
                  >
                    دلار ($)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setGasCurrency('TOMAN')}
                    className={`px-2.5 py-1 text-xs rounded ${gasCurrency === 'TOMAN' ? 'bg-slate-700 text-white font-bold' : 'text-slate-500'}`}
                  >
                    تومان / ریال
                  </button>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  required
                  value={formatNumberInput(form.price)} 
                  onChange={(e) => setForm({...form, price: cleanNumberInput(e.target.value)})} 
                  className="w-full p-2.5 pl-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none font-mono font-bold text-left" 
                  placeholder={gasCurrency === 'USD' ? 'مثال: 450.00' : 'مثال: 27,000,000'} 
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {gasCurrency === 'USD' ? 'USD $' : 'تومان'}
                </span>
              </div>
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره بارنامه</label>
                <input type="text" value={form.billOfLading} onChange={(e) => setForm({...form, billOfLading: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none font-mono" placeholder="شماره بارنامه..." />
            </div>

            {/* بخش انتخاب واحد نرخ کرایه راننده (دلار، درهم با ضریب ۳.۶۷ یا ریال/تومان) */}
            <div className="md:col-span-2 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-2">
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                      <Truck size={18} className="text-emerald-600"/> 
                      تعیین نرخ کرایه حمل راننده:
                    </h3>
                    <div className="flex flex-wrap items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-sm gap-1">
                      <button 
                        type="button" 
                        onClick={() => setFreightCurrency('TOMAN')}
                        className={`px-3 py-1 text-xs font-bold rounded ${freightCurrency === 'TOMAN' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        تومان / ریال
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFreightCurrency('USD')}
                        className={`px-3 py-1 text-xs font-bold rounded ${freightCurrency === 'USD' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        دلار ($)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFreightCurrency('AED')}
                        className={`px-3 py-1 text-xs font-bold rounded ${freightCurrency === 'AED' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        درهم (AED ۳.۶۷)
                      </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {freightCurrency === 'USD' 
                          ? 'نرخ کرایه دلاری هر تن ($)' 
                          : freightCurrency === 'AED'
                            ? 'نرخ کرایه درهمی هر تن (AED)'
                            : 'نرخ کرایه هر تن (تومان)'}
                      </label>
                      <div className="relative">
                        <input 
                          type="text"
                          inputMode="decimal"
                          dir="ltr"
                          value={formatNumberInput(form.freightRate)} 
                          onChange={(e) => setForm({...form, freightRate: cleanNumberInput(e.target.value)})} 
                          className="w-full p-2.5 pl-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-left" 
                          placeholder={freightCurrency === 'USD' ? '25.00' : freightCurrency === 'AED' ? '91.75' : '1,200,000'} 
                        />
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                          freightCurrency === 'USD' ? 'text-blue-600' : freightCurrency === 'AED' ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {freightCurrency === 'USD' ? 'USD $' : freightCurrency === 'AED' ? 'AED' : 'تومان'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">کل کرایه محاسبه‌شده (تومان)</label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        value={formatNumberInput(form.freightPrice)} 
                        onChange={(e) => setForm({...form, freightPrice: cleanNumberInput(e.target.value)})} 
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono text-left" 
                        placeholder="کل (تومان)" 
                      />
                    </div>
                </div>

                {parseFloat(form.freightRate || '0') > 0 && (() => {
                  const vol = parseFloat(form.volume || '0') || 1;
                  const rate = parseFloat(form.freightRate || '0');
                  const exRate = parseFloat(exchangeRateInput) || exchangeRates.usd || 60000;
                  const usdAed = parseFloat(usdAedRateInput) || 3.67;
                  const totalTomanVal = parseFloat(form.freightPrice || '0') || 0;
                  const totalUsdVal = freightCurrency === 'USD' 
                    ? vol * rate 
                    : freightCurrency === 'AED'
                      ? (usdAed > 0 ? (vol * rate) / usdAed : 0)
                      : (exRate > 0 ? totalTomanVal / exRate : 0);
                  const totalAedVal = freightCurrency === 'AED'
                    ? vol * rate
                    : totalUsdVal * usdAed;

                  return (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/70 p-2.5 rounded-lg space-y-1.5 border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>معادل کل کرایه با نرخ صرافی ({usdAed}):</span>
                        <div className="flex items-center gap-2 font-mono font-bold" dir="ltr">
                          <span className="text-blue-600 font-black">${totalUsdVal.toFixed(1)}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-amber-600 font-black">{totalAedVal.toFixed(1)} AED</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-600">{(Math.round(totalTomanVal * 10)).toLocaleString()} ریال</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
            
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">توضیحات تکمیلی</label>
                <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none" placeholder="یادداشت..." />
            </div>

            <div className="md:col-span-2 mt-4">
               <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-4 mb-4 flex justify-between items-center text-emerald-800 dark:text-emerald-300 font-medium">
                   <span>مبلغ کل برآوردی گاز:</span> {calculateTotalPreview()}
               </div>
              <button type="submit" className={`w-full px-6 py-3 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${editId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                  {editId ? <><Save size={20}/> ذخیره تغییرات</> : 'ثبت محموله'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div id="transaction-table-container" className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
         <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center print:bg-white print:border-b-2">
             <h3 className="font-bold text-slate-700 dark:text-slate-200">لیست بارها</h3>
             <div className="flex gap-2 print:hidden">
                <button onClick={() => openExportModal('pdf')} disabled={isExportingPdf} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium">{isExportingPdf ? '...' : <FileDown size={16} />} PDF</button>
                <button onClick={() => openExportModal('csv')} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm"><Download size={16} /> اکسل</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm"><Printer size={16} /> چاپ</button>
             </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
               <thead className="bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 font-semibold border-b dark:border-slate-800">
                  <tr>
                     <th className="px-6 py-4">تاریخ</th>
                     <th className="px-6 py-4">راننده</th>
                     <th className="px-6 py-4">تامین / مقصد</th>
                     <th className="px-6 py-4">حجم (تن)</th>
                     <th className="px-6 py-4">قیمت واحد ($)</th>
                     <th className="px-6 py-4">هزینه کل گاز (T)</th>
                     <th className="px-6 py-4">کرایه راننده (T)</th>
                     <th className="px-6 py-4 text-center print:hidden">عملیات</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.slice().reverse().map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 group">
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap" dir="ltr">{t.date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{getDriverName(t.driverId)}</td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                              <div className="flex flex-col gap-1">
                                  <span className="flex items-center gap-1"><Building2 size={10}/> {t.companyId ? getCompanyName(t.companyId) : '-'}</span>
                                  <span className="flex items-center gap-1"><Container size={10}/> {t.receiverId ? getReceiverName(t.receiverId) : '-'}</span>
                              </div>
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-slate-200">{t.volume}</td>
                          <td className="px-6 py-4 font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                              ${(t.price / exchangeRates.usd).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100" dir="ltr">{t.totalPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400" dir="ltr">{(t.freightPrice || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-center print:hidden">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEdit(t)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors" title="ویرایش">
                                      <Pencil size={16}/>
                                  </button>
                                  <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors" title="حذف">
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {transactions.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-slate-400 italic">هیچ تراکنشی ثبت نشده است</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default TransactionEntry;
