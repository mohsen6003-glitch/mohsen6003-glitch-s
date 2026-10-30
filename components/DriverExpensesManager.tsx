import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { DriverVehicleExpense, DriverExpenseCategory, Driver } from '../types';
import { 
  Wrench, Fuel, Droplets, Disc, Truck, AlertTriangle, Utensils, 
  Shield, Scale, Receipt, Plus, Search, Filter, Trash2, Edit3, 
  Printer, X, Check, ArrowUpDown, ChevronDown, CheckCircle2, 
  RotateCcw, FileText, Download, Building2, UserCheck, AlertCircle
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { numberToPersianWords, formatNumberInput, cleanNumberInput } from '../utils/numberUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface DriverExpensesManagerProps {
  initialDriverId?: string | null;
  onClose?: () => void;
  isModal?: boolean;
}

export const DRIVER_EXPENSE_CATEGORIES_CONFIG: Record<DriverExpenseCategory, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
  badgeClass: string;
  quickTitles: string[];
  defaultPayer: 'COMPANY' | 'DRIVER';
  defaultImpact: 'DEDUCT_FROM_DRIVER' | 'REIMBURSE_TO_DRIVER' | 'COMPANY_OVERHEAD';
}> = {
  FUEL: {
    label: 'سوخت و گازوئیل',
    icon: Fuel,
    colorClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    quickTitles: ['گازوئیل آزاد مسیر رفت', 'سوخت ترانزیت مرزی', 'باک سوخت کمکی', 'گازوئیل اضطراری جاده'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  OIL_CHANGE: {
    label: 'تعویض روغن و فیلترها',
    icon: Droplets,
    colorClass: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    quickTitles: ['روغن موتور ۲۰W۵۰ و فیلترها', 'واسکازین گیربکس و دیفرانسیل', 'فیلتر گازوئیل و آبگیر', 'گریس‌کاری کامل چرخ‌ها و شاسی'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  TIRES: {
    label: 'لاستیک و پنچرگیری',
    icon: Disc,
    colorClass: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    quickTitles: ['خرید ۲ حلقه لاستیک جلو', 'خرید ۲ حلقه لاستیک دیفرانسیل', 'پنچرگیری و آپارات لاستیک', 'تنظیم باد و بالانس چرخ‌ها'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  REPAIRS: {
    label: 'تعمیرات موتور، گیربکس و فنی',
    icon: Wrench,
    colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    quickTitles: ['تعمیر پمپ گازوئیل و سوزن‌ها', 'سرویس لنت و بوستر ترمز', 'تعویض دیسک و صفحه کلاچ', 'تعمیر دینام و استارت', 'تعمیر پمپ باد و شیرهای تانکر'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  TOLL_TRANSIT: {
    label: 'عوارض آزادراه، پل و ترانزیت',
    icon: Truck,
    colorClass: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    quickTitles: ['عوارض آزادراهی مسیر', 'ورودی پایانه مرزی و تیرپارک', 'عوارض پل و ترانزیت گمرک', 'هزینه توزین و نوبت‌دهی'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  FINE: {
    label: 'جریمه راهنمایی و رانندگی',
    icon: AlertTriangle,
    colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    quickTitles: ['جریمه سرعت غیرمجاز دوربین', 'جریمه اضافه تناژ و باسکول', 'جریمه توقف در محل ممنوع', 'خلافی خودرو در مسیر رفت'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'DEDUCT_FROM_DRIVER',
  },
  ALLOWANCE_FOOD: {
    label: 'مساعده، هزینه راه و غذا',
    icon: Utensils,
    colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    quickTitles: ['مساعده نقدی حین سفر', 'هزینه غذا و اقامت بین‌راهی', 'تنخواه سفر راننده', 'پاداش و انعام تحویل فوری'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'DEDUCT_FROM_DRIVER',
  },
  INSURANCE_INSPECTION: {
    label: 'بیمه، معاینه و تست مخزن',
    icon: Shield,
    colorClass: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    quickTitles: ['بیمه شخص ثالث کشنده', 'بیمه بدنه خودرو', 'معاینه فنی سالانه', 'تست هیدرواستاتیک و ضخامت مخزن گاز'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  PARKING_SCALE: {
    label: 'پارکینگ و باسکول توزین',
    icon: Scale,
    colorClass: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    quickTitles: ['قبض باسکول مبدأ و مقصد', 'هزینه توقف در پارکینگ تانکرها', 'هزینه توزین مجدد در پلیس راه'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  CAR_WASH: {
    label: 'کارواش و شستشوی تانکر',
    icon: Droplets,
    colorClass: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    quickTitles: ['شستشوی کامل تانکر و مخزن گاز', 'زیرشویی و روشویی کشنده', 'بخارزدایی و نظافت اتصالات گاز'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
  OTHER: {
    label: 'سایر هزینه‌های ناوگان',
    icon: Receipt,
    colorClass: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    quickTitles: ['خرید لوازم مصرفی کابین', 'تسمه و وسایل مهار بار', 'هزینه فورس ماژور مسیر', 'تعمیر قفل و درب‌های جعبه'],
    defaultPayer: 'COMPANY',
    defaultImpact: 'COMPANY_OVERHEAD',
  },
};

const DriverExpensesManager: React.FC<DriverExpensesManagerProps> = ({ 
  initialDriverId = null, 
  onClose,
  isModal = true 
}) => {
  const { 
    drivers, 
    driverVehicleExpenses, 
    addDriverVehicleExpense, 
    updateDriverVehicleExpense, 
    deleteDriverVehicleExpense,
    getDriverBalance 
  } = useData();

  // Active view tab: 'list' | 'add'
  const [activeTab, setActiveTab] = useState<'list' | 'add'>(initialDriverId ? 'add' : 'list');

  // Form State
  const [selectedDriverId, setSelectedDriverId] = useState<string>(initialDriverId || (drivers[0]?.id || ''));
  const [category, setCategory] = useState<DriverExpenseCategory>('FUEL');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState<DateObject | null>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [paidBy, setPaidBy] = useState<'COMPANY' | 'DRIVER'>('COMPANY');
  const [impactOnBalance, setImpactOnBalance] = useState<'DEDUCT_FROM_DRIVER' | 'REIMBURSE_TO_DRIVER' | 'COMPANY_OVERHEAD'>('COMPANY_OVERHEAD');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');

  // Editing state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Voucher print modal state
  const [voucherExpense, setVoucherExpense] = useState<DriverVehicleExpense | null>(null);
  const voucherPrintRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Filter States
  const [filterDriverId, setFilterDriverId] = useState<string>(initialDriverId || 'ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterImpact, setFilterImpact] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState<DateObject | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<DateObject | null>(null);

  // Find currently selected driver in the form
  const currentDriver = useMemo(() => {
    return drivers.find(d => d.id === selectedDriverId) || null;
  }, [drivers, selectedDriverId]);

  // Handle category change: update defaults if user hasn't overridden
  const handleCategorySelect = (cat: DriverExpenseCategory) => {
    setCategory(cat);
    const config = DRIVER_EXPENSE_CATEGORIES_CONFIG[cat];
    if (config) {
      setPaidBy(config.defaultPayer);
      setImpactOnBalance(config.defaultImpact);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle('');
    setAmount('');
    setInvoiceNumber('');
    setDescription('');
    setEditingExpenseId(null);
    setExpenseDate(new DateObject({ calendar: persian, locale: persian_fa }));
    setCategory('FUEL');
    setPaidBy('COMPANY');
    setImpactOnBalance('COMPANY_OVERHEAD');
  };

  // Populate form for editing
  const handleEditClick = (expense: DriverVehicleExpense) => {
    setEditingExpenseId(expense.id);
    setSelectedDriverId(expense.driverId);
    setCategory(expense.category);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setPaidBy(expense.paidBy);
    setImpactOnBalance(expense.impactOnBalance);
    setInvoiceNumber(expense.invoiceNumber || '');
    setDescription(expense.description || '');

    try {
      if (expense.date) {
        const parts = expense.date.split(' ')[0].split('/');
        if (parts.length === 3) {
          const d = new DateObject({
            calendar: persian,
            locale: persian_fa,
            year: parseInt(parts[0], 10),
            month: parseInt(parts[1], 10),
            day: parseInt(parts[2], 10),
          });
          setExpenseDate(d);
        }
      }
    } catch (e) {
      setExpenseDate(new DateObject({ calendar: persian, locale: persian_fa }));
    }

    setActiveTab('add');
  };

  // Submit Expense Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      alert('لطفاً یک راننده انتخاب کنید.');
      return;
    }
    const drv = drivers.find(d => d.id === selectedDriverId);
    if (!drv) {
      alert('راننده انتخاب شده نامعتبر است.');
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/,/g, ''));
    if (!cleanAmount || isNaN(cleanAmount) || cleanAmount <= 0) {
      alert('لطفاً مبلغ هزینه را به درستی وارد کنید.');
      return;
    }

    if (!title.trim()) {
      alert('لطفاً عنوان یا شرح کوتاه هزینه را وارد کنید.');
      return;
    }

    const formattedDate = expenseDate ? expenseDate.format('YYYY/MM/DD') : new DateObject({ calendar: persian, locale: persian_fa }).format('YYYY/MM/DD');

    if (editingExpenseId) {
      updateDriverVehicleExpense(editingExpenseId, {
        driverId: drv.id,
        driverName: drv.fullName,
        plateNumber: drv.plateNumber,
        category,
        title: title.trim(),
        amount: cleanAmount,
        date: formattedDate,
        paidBy,
        impactOnBalance,
        invoiceNumber: invoiceNumber.trim() || undefined,
        description: description.trim() || undefined,
      });
      alert('هزینه راننده و خودرو با موفقیت ویرایش شد.');
    } else {
      addDriverVehicleExpense({
        driverId: drv.id,
        driverName: drv.fullName,
        plateNumber: drv.plateNumber,
        category,
        title: title.trim(),
        amount: cleanAmount,
        date: formattedDate,
        paidBy,
        impactOnBalance,
        invoiceNumber: invoiceNumber.trim() || undefined,
        description: description.trim() || undefined,
      });
      alert('هزینه با موفقیت در پرونده راننده و ناوگان ثبت شد.');
    }

    resetForm();
    setActiveTab('list');
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return driverVehicleExpenses.filter(item => {
      // Driver filter
      if (filterDriverId !== 'ALL' && item.driverId !== filterDriverId) return false;

      // Category filter
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;

      // Impact filter
      if (filterImpact !== 'ALL' && item.impactOnBalance !== filterImpact) return false;

      // Search term
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDriver = item.driverName?.toLowerCase().includes(q);
        const matchPlate = item.plateNumber?.toLowerCase().includes(q);
        const matchInvoice = item.invoiceNumber?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDriver && !matchPlate && !matchInvoice && !matchDesc) {
          return false;
        }
      }

      // Date range filter
      if (filterStartDate || filterEndDate) {
        const itemDateStr = item.date?.split(' ')[0];
        if (itemDateStr) {
          if (filterStartDate) {
            const startStr = filterStartDate.format('YYYY/MM/DD');
            if (itemDateStr < startStr) return false;
          }
          if (filterEndDate) {
            const endStr = filterEndDate.format('YYYY/MM/DD');
            if (itemDateStr > endStr) return false;
          }
        }
      }

      return true;
    });
  }, [driverVehicleExpenses, filterDriverId, filterCategory, filterImpact, filterSearch, filterStartDate, filterEndDate]);

  // Statistics
  const stats = useMemo(() => {
    const list = filteredExpenses;
    const totalAmount = list.reduce((acc, curr) => acc + curr.amount, 0);
    const totalCount = list.length;
    
    // Deducted from drivers
    const deductedFromDriver = list
      .filter(i => i.impactOnBalance === 'DEDUCT_FROM_DRIVER')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Reimbursed to drivers (driver paid)
    const reimbursedToDriver = list
      .filter(i => i.impactOnBalance === 'REIMBURSE_TO_DRIVER')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Company overhead
    const companyOverhead = list
      .filter(i => i.impactOnBalance === 'COMPANY_OVERHEAD')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalAmount,
      totalCount,
      deductedFromDriver,
      reimbursedToDriver,
      companyOverhead,
    };
  }, [filteredExpenses]);

  // Print voucher as PDF or standard browser print
  const handlePrintVoucher = async () => {
    if (!voucherPrintRef.current) return;
    setIsExportingPdf(true);
    try {
      const element = voucherPrintRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`رسید_هزینه_${voucherExpense?.driverName}_${voucherExpense?.date?.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error('Print voucher error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintFullReport = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-300">
            <Wrench size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black">ثبت و مدیریت هزینه‌های راننده و ماشین</h2>
              <span className="text-[11px] bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-md font-mono">
                {driverVehicleExpenses.length} سند ثبت‌شده
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              سوخت و گازوئیل، قطعات یدکی، تعمیرگاه، لاستیک، تعویض روغن، عوارض، بیمه، جریمه‌ها و مساعده رانندگان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* View Tab Buttons */}
          <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              type="button"
              onClick={() => { resetForm(); setActiveTab('list'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'list' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText size={15} />
              فهرست هزینه‌ها ({filteredExpenses.length})
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setActiveTab('add'); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'add' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus size={15} />
              {editingExpenseId ? 'ویرایش سند' : 'ثبت هزینه جدید'}
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="بستن"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">کل هزینه‌های فیلترشده</div>
            <div className="text-base md:text-lg font-black text-slate-900 dark:text-white mt-1" dir="ltr">
              {stats.totalAmount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">تومان</span>
            </div>
            <div className="text-[10px] text-slate-400">{stats.totalCount} فقره هزینه</div>
          </div>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Receipt size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">کسر از حساب رانندگان</div>
            <div className="text-base md:text-lg font-black text-rose-600 dark:text-rose-400 mt-1" dir="ltr">
              {stats.deductedFromDriver.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">تومان</span>
            </div>
            <div className="text-[10px] text-rose-500/80">مساعده، جریمه و ...</div>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">طلب راننده (پرداخت از جیب)</div>
            <div className="text-base md:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1" dir="ltr">
              {stats.reimbursedToDriver.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">تومان</span>
            </div>
            <div className="text-[10px] text-emerald-500/80">افزایش بستانکاری راننده</div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/40 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400">هزینه ناوگان به عهده شرکت</div>
            <div className="text-base md:text-lg font-black text-purple-600 dark:text-purple-400 mt-1" dir="ltr">
              {stats.companyOverhead.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">تومان</span>
            </div>
            <div className="text-[10px] text-purple-500/80">استهلاک خودرو و ناوگان</div>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <Truck size={22} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6">
        {activeTab === 'add' ? (
          /* FORM VIEW */
          <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingExpenseId ? 'ویرایش سند هزینه راننده و خودرو' : 'فرم ثبت هزینه جدید برای راننده و ماشین'}
                </h3>
              </div>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold"
                >
                  انصراف از ویرایش
                </button>
              )}
            </div>

            {/* Row 1: Select Driver & Plate Number Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  انتخاب راننده و خودرو <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="" disabled>-- انتخاب راننده --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} | پلاک: {d.plateNumber} | تانکر: {d.tankNumber || '-'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver Quick Badge */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                {currentDriver ? (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">شماره پلاک:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white" dir="ltr">{currentDriver.plateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">تراز فعلی:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">
                        {getDriverBalance(currentDriver.id).toLocaleString()} T
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">راننده‌ای انتخاب نشده است</span>
                )}
              </div>
            </div>

            {/* Row 2: Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                دسته‌بندی و سرفصل هزینه <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {(Object.keys(DRIVER_EXPENSE_CATEGORIES_CONFIG) as DriverExpenseCategory[]).map((catKey) => {
                  const cfg = DRIVER_EXPENSE_CATEGORIES_CONFIG[catKey];
                  const IconComp = cfg.icon;
                  const isSelected = category === catKey;
                  return (
                    <button
                      type="button"
                      key={catKey}
                      onClick={() => handleCategorySelect(catKey)}
                      className={`p-2.5 rounded-lg border text-right transition-all flex flex-col gap-1.5 ${
                        isSelected 
                          ? `${cfg.colorClass} ring-2 ring-blue-500 font-bold shadow-sm` 
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <IconComp size={18} />
                        {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                      </div>
                      <span className="text-xs">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Quick Title Suggestions */}
            {DRIVER_EXPENSE_CATEGORIES_CONFIG[category]?.quickTitles?.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                  پیشنهادهای متداول برای «{DRIVER_EXPENSE_CATEGORIES_CONFIG[category].label}»:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DRIVER_EXPENSE_CATEGORIES_CONFIG[category].quickTitles.map((qt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTitle(qt)}
                      className="text-xs bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md transition-colors"
                    >
                      + {qt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Row 4: Title & Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان هزینه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تعویض روغن موتور و فیلترها در مشهد"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  مبلغ هزینه (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberInput(amount)}
                  onChange={(e) => {
                    setAmount(cleanNumberInput(e.target.value));
                  }}
                  placeholder="مبلغ به تومان..."
                  dir="ltr"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-mono text-left outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required
                />
                {amount && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1 block">
                    معادل: {numberToPersianWords(amount)}
                  </span>
                )}
              </div>
            </div>

            {/* Row 5: Date, Invoice Number, Payer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تاریخ ثبت هزینه <span className="text-rose-500">*</span>
                </label>
                <DatePicker
                  value={expenseDate}
                  onChange={setExpenseDate}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  شماره فاکتور / رسید / قبض
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="اختیاری - شماره ارجاع"
                  dir="ltr"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-mono text-left outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  پرداخت شده توسط <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidBy('COMPANY');
                      if (impactOnBalance === 'REIMBURSE_TO_DRIVER') {
                        setImpactOnBalance('COMPANY_OVERHEAD');
                      }
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      paidBy === 'COMPANY' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    🏢 شرکت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaidBy('DRIVER');
                      setImpactOnBalance('REIMBURSE_TO_DRIVER');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      paidBy === 'DRIVER' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    👤 راننده (از جیب)
                  </button>
                </div>
              </div>
            </div>

            {/* Row 6: Impact On Driver Balance Selection (Critical for accounting) */}
            <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                وضعیت مالی و تاثیر بر حساب راننده:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. DEDUCT_FROM_DRIVER */}
                <div
                  onClick={() => setImpactOnBalance('DEDUCT_FROM_DRIVER')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    impactOnBalance === 'DEDUCT_FROM_DRIVER'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle size={15} />
                      کسر از حساب راننده
                    </span>
                    {impactOnBalance === 'DEDUCT_FROM_DRIVER' && <Check size={14} className="text-rose-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    این مبلغ از درآمد/کرایه راننده کسر شده و راننده بدهکار می‌شود (مثلاً مساعده یا جریمه).
                  </p>
                </div>

                {/* 2. REIMBURSE_TO_DRIVER */}
                <div
                  onClick={() => setImpactOnBalance('REIMBURSE_TO_DRIVER')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    impactOnBalance === 'REIMBURSE_TO_DRIVER'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <UserCheck size={15} />
                      طلب راننده / استرداد وجه
                    </span>
                    {impactOnBalance === 'REIMBURSE_TO_DRIVER' && <Check size={14} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    راننده این مبلغ را از جیب خود برای خودرو خرج کرده و شرکت باید آن را بازپرداخت کند.
                  </p>
                </div>

                {/* 3. COMPANY_OVERHEAD */}
                <div
                  onClick={() => setImpactOnBalance('COMPANY_OVERHEAD')}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    impactOnBalance === 'COMPANY_OVERHEAD'
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 ring-2 ring-purple-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-purple-700 dark:text-purple-400 flex items-center gap-1">
                      <Truck size={15} />
                      هزینه ناوگان و استهلاک خودرو
                    </span>
                    {impactOnBalance === 'COMPANY_OVERHEAD' && <Check size={14} className="text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    مستقیماً به عهده شرکت است و تاثیری در تراز مالی یا طلب راننده نخواهد داشت.
                  </p>
                </div>
              </div>
            </div>

            {/* Row 7: Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                توضیحات و جزئیات تکمیلی
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات اختیاری، نام فروشگاه/تعمیرگاه، شماره بارنامه مرتبط یا شرایط پرداخت..."
                rows={2}
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => { resetForm(); setActiveTab('list'); }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                انصراف و بازگشت
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                {editingExpenseId ? 'بروزرسانی سند هزینه' : 'ثبت قطعی هزینه در سیستم'}
              </button>
            </div>
          </form>
        ) : (
          /* LIST & FILTER VIEW */
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 print:hidden">
              {/* Driver Filter */}
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  فیلتر بر اساس راننده:
                </label>
                <select
                  value={filterDriverId}
                  onChange={(e) => setFilterDriverId(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="ALL">همه رانندگان ناوگان</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="min-w-[160px]">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  سرفصل هزینه:
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="ALL">همه دسته‌بندی‌ها</option>
                  {(Object.keys(DRIVER_EXPENSE_CATEGORIES_CONFIG) as DriverExpenseCategory[]).map(catKey => (
                    <option key={catKey} value={catKey}>
                      {DRIVER_EXPENSE_CATEGORIES_CONFIG[catKey].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Impact Filter */}
              <div className="min-w-[160px]">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  وضعیت حساب:
                </label>
                <select
                  value={filterImpact}
                  onChange={(e) => setFilterImpact(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="ALL">همه وضعیت‌ها</option>
                  <option value="DEDUCT_FROM_DRIVER">کسر از حساب راننده</option>
                  <option value="REIMBURSE_TO_DRIVER">طلب راننده (استرداد)</option>
                  <option value="COMPANY_OVERHEAD">هزینه ناوگان شرکت</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  جستجو در عناوین و فاکتورها:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="عنوان، پلاک، فاکتور..."
                    className="w-full pr-8 pl-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  {filterSearch && (
                    <button
                      type="button"
                      onClick={() => setFilterSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Reset filter button */}
              {(filterDriverId !== 'ALL' || filterCategory !== 'ALL' || filterImpact !== 'ALL' || filterSearch || filterStartDate || filterEndDate) && (
                <div className="self-end pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDriverId('ALL');
                      setFilterCategory('ALL');
                      setFilterImpact('ALL');
                      setFilterSearch('');
                      setFilterStartDate(null);
                      setFilterEndDate(null);
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    title="پاکسازی فیلترها"
                  >
                    <RotateCcw size={14} />
                    پاکسازی
                  </button>
                </div>
              )}

              {/* Print full table button */}
              <div className="self-end pb-0.5 mr-auto">
                <button
                  type="button"
                  onClick={handlePrintFullReport}
                  className="px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-900 flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} />
                  چاپ گزارش
                </button>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b dark:border-slate-700">
                  <tr>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">راننده و خودرو</th>
                    <th className="p-3">سرفصل و عنوان هزینه</th>
                    <th className="p-3">مبلغ (تومان)</th>
                    <th className="p-3">پرداخت توسط</th>
                    <th className="p-3">تاثیر بر حساب</th>
                    <th className="p-3">فاکتور / شرح</th>
                    <th className="p-3 text-center print:hidden">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map((exp) => {
                    const catCfg = DRIVER_EXPENSE_CATEGORIES_CONFIG[exp.category] || DRIVER_EXPENSE_CATEGORIES_CONFIG.OTHER;
                    const IconComp = catCfg.icon;

                    return (
                      <tr 
                        key={exp.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-800 dark:text-slate-200"
                      >
                        {/* Date */}
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap" dir="ltr">
                          {exp.date}
                        </td>

                        {/* Driver & Plate */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{exp.driverName}</div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            پلاک: {exp.plateNumber}
                          </div>
                        </td>

                        {/* Category & Title */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-md border ${catCfg.colorClass}`}>
                              <IconComp size={14} />
                            </span>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{exp.title}</div>
                              <span className="text-[10px] text-slate-400">{catCfg.label}</span>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-3 font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                          {exp.amount.toLocaleString()}
                        </td>

                        {/* Paid By */}
                        <td className="p-3">
                          {exp.paidBy === 'COMPANY' ? (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                              شرکت
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                              راننده
                            </span>
                          )}
                        </td>

                        {/* Impact */}
                        <td className="p-3">
                          {exp.impactOnBalance === 'DEDUCT_FROM_DRIVER' && (
                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                              کسر از راننده (بدهکار)
                            </span>
                          )}
                          {exp.impactOnBalance === 'REIMBURSE_TO_DRIVER' && (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                              طلب راننده (بستانکار)
                            </span>
                          )}
                          {exp.impactOnBalance === 'COMPANY_OVERHEAD' && (
                            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                              استهلاک ناوگان شرکت
                            </span>
                          )}
                        </td>

                        {/* Invoice & Description */}
                        <td className="p-3 max-w-xs">
                          {exp.invoiceNumber && (
                            <div className="text-[10px] font-mono text-slate-500 mb-0.5">
                              فاکتور: {exp.invoiceNumber}
                            </div>
                          )}
                          <div className="truncate text-slate-600 dark:text-slate-400">
                            {exp.description || '-'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Voucher Print */}
                            <button
                              type="button"
                              onClick={() => setVoucherExpense(exp)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="چاپ رسید و فیش هزینه"
                            >
                              <Printer size={14} />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleEditClick(exp)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                              title="ویرایش هزینه"
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`آیا از حذف هزینه «${exp.title}» به مبلغ ${exp.amount.toLocaleString()} تومان اطمینان دارید؟`)) {
                                  deleteDriverVehicleExpense(exp.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="حذف سند هزینه"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Receipt size={36} className="mx-auto mb-2 opacity-40" />
                        <p className="font-bold">هیچ سندی با فیلترهای جاری یافت نشد.</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('add')}
                          className="mt-3 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 font-bold"
                        >
                          + ثبت اولین هزینه
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>

                {filteredExpenses.length > 0 && (
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t dark:border-slate-700">
                    <tr>
                      <td colSpan={3} className="p-3 text-left">
                        مجموع هزینه‌های فیلترشده ({filteredExpenses.length} سند):
                      </td>
                      <td className="p-3 font-mono text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                        {stats.totalAmount.toLocaleString()} T
                      </td>
                      <td colSpan={4} className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        کسر از راننده: {stats.deductedFromDriver.toLocaleString()} T | طلب راننده: {stats.reimbursedToDriver.toLocaleString()} T | سهم شرکت: {stats.companyOverhead.toLocaleString()} T
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* VOUCHER / RECEIPT MODAL */}
      {voucherExpense && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer size={18} />
                <h4 className="font-bold text-sm">رسید و فیش هزینه راننده و خودرو</h4>
              </div>
              <button
                type="button"
                onClick={() => setVoucherExpense(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Voucher Paper */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950 flex-1 overflow-y-auto">
              <div 
                ref={voucherPrintRef}
                className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-sm font-sans text-xs space-y-4"
                dir="rtl"
              >
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-base text-slate-900">سامانه مدیریت ترانزیت گاز مایع</h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">رسید پرداخت / هزینه ناوگان و رانندگان</p>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-600">
                    <div>شماره سند: #{voucherExpense.id.slice(-6)}</div>
                    <div>تاریخ ثبت: {voucherExpense.date}</div>
                    {voucherExpense.invoiceNumber && <div>فاکتور: {voucherExpense.invoiceNumber}</div>}
                  </div>
                </div>

                {/* Details Table */}
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">نام راننده:</span>
                    <span className="font-bold text-slate-900">{voucherExpense.driverName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">شماره پلاک کشنده:</span>
                    <span className="font-bold font-mono text-slate-900" dir="ltr">{voucherExpense.plateNumber}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">سرفصل هزینه:</span>
                    <span className="font-bold text-slate-900">
                      {DRIVER_EXPENSE_CATEGORIES_CONFIG[voucherExpense.category]?.label || voucherExpense.category}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">عنوان و شرح هزینه:</span>
                    <span className="font-bold text-slate-900">{voucherExpense.title}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">پرداخت شده توسط:</span>
                    <span className="font-bold text-slate-900">
                      {voucherExpense.paidBy === 'COMPANY' ? 'شرکت ترانزیت' : 'راننده (از جیب خود)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">وضعیت حساب:</span>
                    <span className="font-bold text-slate-900">
                      {voucherExpense.impactOnBalance === 'DEDUCT_FROM_DRIVER' && 'کسر از حساب راننده (بدهکار)'}
                      {voucherExpense.impactOnBalance === 'REIMBURSE_TO_DRIVER' && 'طلب راننده جهت استرداد (بستانکار)'}
                      {voucherExpense.impactOnBalance === 'COMPANY_OVERHEAD' && 'هزینه نگهداری ناوگان (به عهده شرکت)'}
                    </span>
                  </div>
                  {voucherExpense.description && (
                    <div className="py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 block mb-0.5">توضیحات تکمیلی:</span>
                      <p className="text-slate-800 leading-relaxed">{voucherExpense.description}</p>
                    </div>
                  )}

                  {/* Amount Highlight */}
                  <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between mt-3">
                    <span className="font-bold text-slate-800 text-sm">مبلغ هزینه:</span>
                    <div className="text-right">
                      <div className="text-base font-black font-mono text-slate-900" dir="ltr">
                        {voucherExpense.amount.toLocaleString()} تومان
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {numberToPersianWords(voucherExpense.amount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 gap-4 text-center text-[11px] text-slate-700">
                  <div className="border-t border-slate-400 pt-2">
                    امضای مسئول ترابری / مالی شرکت
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    امضا و اثر انگشت راننده
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoucherExpense(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={handlePrintVoucher}
                disabled={isExportingPdf}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Download size={14} />
                {isExportingPdf ? 'در حال تهیه PDF...' : 'دانلود و چاپ فیش (PDF)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverExpensesManager;
