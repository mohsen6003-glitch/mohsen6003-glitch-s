
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Users, DollarSign, X, History, FileText, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, TrendingUp, TrendingDown, Truck, WalletCards, Search, Printer, ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, Fuel, Pencil, Save, Download, ListPlus } from 'lucide-react';
import { Driver } from '../types';

type SortKey = 'fullName' | 'plateNumber' | 'balance';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const DriversList: React.FC = () => {
  const { drivers, transactions, driverPayments, freights, getDriverBalance, addDriverPayment, addTransaction, addFreight, updateDriver, exchangeRates, addToQueue, queue } = useData();
  
  // State for Payment Modal
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');

  // State for Freight Modal
  const [freightDriverId, setFreightDriverId] = useState<string | null>(null);
  const [freightAmount, setFreightAmount] = useState('');
  const [freightOrigin, setFreightOrigin] = useState('');
  const [freightDest, setFreightDest] = useState('');
  const [freightDesc, setFreightDesc] = useState('');
  const [freightTrackingCode, setFreightTrackingCode] = useState('');

  // State for Transaction (Load) Modal
  const [transDriverId, setTransDriverId] = useState<string | null>(null);
  const [transVolume, setTransVolume] = useState('');
  const [transPrice, setTransPrice] = useState('');
  const [transCurrency, setTransCurrency] = useState<'toman' | 'usd' | 'aed'>('toman');
  const [transBillOfLading, setTransBillOfLading] = useState('');
  const [transDesc, setTransDesc] = useState('');

  // State for History Modal
  const [historyDriverId, setHistoryDriverId] = useState<string | null>(null);
  
  // State for Adjustment Modal
  const [adjustDriverId, setAdjustDriverId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit'); // credit = payment/freight, debit = withdrawal
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');

  // State for Queue Modal
  const [queueDriverId, setQueueDriverId] = useState<string | null>(null);
  const [queueDestination, setQueueDestination] = useState('');

  // State for Edit Driver Modal
  const [editDriverId, setEditDriverId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', plateNumber: '', tankNumber: '' });

  const [viewCurrency, setViewCurrency] = useState<'toman' | 'usd' | 'aed'>('toman');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Stats calculation
  const totalPayments = driverPayments.reduce((sum, p) => sum + p.amount, 0);
  // Total Freights + Transactions
  const totalEarnings = freights.reduce((sum, f) => sum + f.amount, 0) + transactions.reduce((sum, t) => sum + t.totalPrice, 0);

  // Handle Sort Click
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and Sort Drivers
  const sortedDrivers = useMemo(() => {
    // 1. Filter based on search
    let result = drivers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
          (d.fullName || '').toLowerCase().includes(term) ||
          (d.phone || '').includes(term) ||
          (d.plateNumber || '').includes(term) ||
          (d.nationalId || '').includes(term)
      );
    }

    // 2. Attach balance for sorting purposes
    const driversWithBalance = result.map(d => ({
        ...d,
        balance: getDriverBalance(d.id)
    }));

    // 3. Sort
    if (sortConfig !== null) {
        driversWithBalance.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof typeof a];
            let bValue: any = b[sortConfig.key as keyof typeof b];

            // Handle string comparisons
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return driversWithBalance;
  }, [drivers, searchTerm, sortConfig, getDriverBalance, transactions, driverPayments, freights]);


  // Handle Payment (Settlement to Driver)
  const handlePayment = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedDriverId || !payAmount) return;
      
      addDriverPayment({
          driverId: selectedDriverId,
          amount: parseFloat(payAmount),
          date: new Date().toLocaleString('fa-IR'),
          description: payDesc
      });
      
      alert('پرداخت وجه (تسویه) با موفقیت ثبت شد.');
      setSelectedDriverId(null);
      setPayAmount('');
      setPayDesc('');
  };

  // Handle Freight
  const handleFreight = (e: React.FormEvent) => {
      e.preventDefault();
      if(!freightDriverId || !freightAmount) {
          alert("لطفاً مبلغ کرایه را وارد کنید.");
          return;
      }
      if(!freightOrigin || !freightDest) {
          alert("لطفاً مبدا و مقصد بار را وارد کنید.");
          return;
      }

      addFreight({
          driverId: freightDriverId,
          amount: parseFloat(freightAmount),
          date: new Date().toLocaleString('fa-IR'),
          origin: freightOrigin,
          destination: freightDest,
          description: freightDesc,
          trackingCode: freightTrackingCode
      });

      alert('کرایه با موفقیت ثبت شد.');
      setFreightDriverId(null);
      setFreightAmount('');
      setFreightOrigin('');
      setFreightDest('');
      setFreightDesc('');
      setFreightTrackingCode('');
  };

  // Handle Transaction (Load Entry)
  const handleTransaction = (e: React.FormEvent) => {
      e.preventDefault();
      if (!transDriverId || !transVolume || !transPrice) {
          alert("لطفاً تمامی فیلدهای الزامی را پر کنید.");
          return;
      }

      const vol = parseFloat(transVolume);
      let unitPrice = parseFloat(transPrice);

      // Convert to Toman based on rate
      if (transCurrency === 'usd') {
          unitPrice = unitPrice * exchangeRates.usd;
      } else if (transCurrency === 'aed') {
          unitPrice = unitPrice * exchangeRates.aed;
      }

      const total = vol * unitPrice;

      addTransaction({
          driverId: transDriverId,
          date: new Date().toLocaleString('fa-IR'),
          volume: vol,
          price: unitPrice,
          totalPrice: total,
          description: `${transDesc} (نرخ: ${transCurrency === 'toman' ? 'تومان' : transCurrency === 'usd' ? '$'+transPrice : transPrice+' AED'})`,
          billOfLading: transBillOfLading
      });

      alert(`تراکنش ثبت شد. مبلغ کل: ${total.toLocaleString()} تومان`);
      setTransDriverId(null);
      setTransVolume('');
      setTransPrice('');
      setTransBillOfLading('');
      setTransDesc('');
      setTransCurrency('toman');
  };

  // Helper to preview total
  const calculateTransTotal = () => {
      const vol = parseFloat(transVolume || '0');
      const pri = parseFloat(transPrice || '0');
      let total = vol * pri;
      
      if (transCurrency !== 'toman') {
           const rate = transCurrency === 'usd' ? exchangeRates.usd : exchangeRates.aed;
           return {
               original: total,
               toman: total * rate
           };
      }
      return { original: total, toman: total };
  };

  // Handle Manual Adjustment
  const handleAdjustment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!adjustDriverId || !adjustAmount) return;

      const amount = parseFloat(adjustAmount);
      const date = new Date().toLocaleString('fa-IR');
      const desc = `[اصلاح دستی] ${adjustDesc}`;

      if (adjustType === 'credit') {
          // Increase Balance (Like Freight)
          addFreight({
              driverId: adjustDriverId,
              amount: amount,
              date: date,
              origin: 'اصلاح',
              destination: 'دستی',
              description: desc
          });
      } else {
          // Decrease Balance (Like Payment)
          addDriverPayment({
              driverId: adjustDriverId,
              amount: amount,
              date: date,
              description: desc
          });
      }

      alert('اصلاح حساب با موفقیت انجام شد.');
      setAdjustDriverId(null);
      setAdjustAmount('');
      setAdjustDesc('');
  };

  // Handle Add to Queue
  const handleAddToQueue = (e: React.FormEvent) => {
      e.preventDefault();
      if (!queueDriverId) return;

      // Check if already in queue
      const isInQueue = queue.some(q => q.driverId === queueDriverId && (q.status === 'WAIT' || q.status === 'LOADING'));
      if (isInQueue) {
          alert("این راننده قبلاً در صف یا در حال بارگیری است.");
          return;
      }

      addToQueue({
          driverId: queueDriverId,
          destination: queueDestination || 'نامشخص',
          entryTime: new Date().toLocaleString('fa-IR')
      });

      alert('راننده با موفقیت به صف اضافه شد.');
      setQueueDriverId(null);
      setQueueDestination('');
  };

  const handleOpenEdit = (driver: Driver) => {
      setEditDriverId(driver.id);
      setEditForm({
          fullName: driver.fullName,
          phone: driver.phone,
          plateNumber: driver.plateNumber,
          tankNumber: driver.tankNumber
      });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editDriverId) {
          updateDriver(editDriverId, editForm);
          setEditDriverId(null);
          alert("اطلاعات راننده بروزرسانی شد.");
      }
  };

  const formatBalance = (balanceToman: number) => {
      if (viewCurrency === 'usd') {
          const val = balanceToman / exchangeRates.usd;
          return `$${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
      } else if (viewCurrency === 'aed') {
          const val = balanceToman / exchangeRates.aed;
          return `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} د.ا`;
      }
      return `${balanceToman.toLocaleString()} تومان`;
  };

  const handleExportCSV = () => {
      if (sortedDrivers.length === 0) return alert('داده‌ای برای خروجی وجود ندارد.');

      const headers = ['نام راننده', 'کد ملی', 'شماره تماس', 'شماره گواهینامه', 'پلاک', 'شماره تانکر', 'تراز مالی (تومان)'];
      
      const rows = sortedDrivers.map(d => [
          d.fullName,
          d.nationalId,
          d.phone,
          d.licenseNo || '-',
          d.plateNumber,
          d.tankNumber || '-',
          d.balance
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `drivers_list_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`;
      link.click();
      document.body.removeChild(link);
  };

  // Calculate history data for the selected driver
  const historyData = useMemo(() => {
    if (!historyDriverId) return [];
    
    // Transactions (Loads) - Now Treated as Credits (Earnings)
    const drTransactions = transactions
      .filter(t => t.driverId === historyDriverId)
      .map(t => ({
        id: t.id,
        date: t.date,
        type: 'transaction' as const,
        amount: t.totalPrice, // Credit value
        volume: t.volume,
        description: t.description,
        billOfLading: t.billOfLading
      }));

    // Payments (Money paid TO driver -> Debits from his balance)
    const drPayments = driverPayments
      .filter(p => p.driverId === historyDriverId)
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'payment' as const,
        amount: p.amount,
        volume: 0,
        description: p.description,
      }));

    // Freights (Money earned BY driver -> Credits to his balance)
    const drFreights = freights
      .filter(f => f.driverId === historyDriverId)
      .map(f => ({
        id: f.id,
        date: f.date,
        type: 'freight' as const,
        amount: f.amount,
        volume: 0,
        description: `کرایه بار (${f.origin} به ${f.destination})${f.trackingCode ? ` [کد: ${f.trackingCode}]` : ''} - ${f.description}`,
      }));

    // Sort by ID
    return [...drTransactions, ...drPayments, ...drFreights].sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
  }, [historyDriverId, transactions, driverPayments, freights]);

  const historyDriver = drivers.find(d => d.id === historyDriverId);

  const handlePrint = () => {
      window.print();
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
      if (sortConfig?.key !== colKey) return <ArrowUpDown size={14} className="text-slate-400" />;
      if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="text-blue-600" />;
      return <ArrowDown size={14} className="text-blue-600" />;
  };

  return (
    <div className="space-y-6">
        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">لیست رانندگان و وضعیت مالی</h1>
            <p className="text-sm text-slate-500 mt-2">تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-emerald-800 font-bold text-lg mb-1">مجموع پرداختی (تسویه)</h3>
                    <p className="text-emerald-600 text-sm">کل مبالغ پرداخت شده به رانندگان</p>
                </div>
                <div className="text-2xl font-bold text-emerald-700 flex items-center gap-2" dir="ltr">
                    {totalPayments.toLocaleString()}
                    <WalletCards size={24} />
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-blue-800 font-bold text-lg mb-1">مجموع بستانکاری</h3>
                    <p className="text-blue-600 text-sm">کرایه‌ها + هزینه بارهای گاز</p>
                </div>
                <div className="text-2xl font-bold text-blue-700 flex items-center gap-2" dir="ltr">
                    {totalEarnings.toLocaleString()}
                    <Truck size={24} />
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-4 mt-6 print:hidden">
            <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Users size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">بانک اطلاعات رانندگان</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="جستجو (نام، پلاک، تلفن)..."
                        className="w-full pr-10 pl-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-shadow"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg w-full sm:w-auto justify-center">
                    <button 
                        onClick={() => setViewCurrency('toman')} 
                        className={`px-3 py-1 text-xs rounded transition-colors ${viewCurrency === 'toman' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        تومان
                    </button>
                    <button 
                        onClick={() => setViewCurrency('usd')} 
                        className={`px-3 py-1 text-xs rounded transition-colors ${viewCurrency === 'usd' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        دلار
                    </button>
                    <button 
                        onClick={() => setViewCurrency('aed')} 
                        className={`px-3 py-1 text-xs rounded transition-colors ${viewCurrency === 'aed' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        درهم
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                    >
                        <Download size={16} /> اکسل
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                    >
                        <Printer size={16} /> چاپ لیست
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
            <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800">
                <tr>
                    <th 
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('fullName')}
                    >
                        <div className="flex items-center gap-2">
                            نام کامل <SortIcon colKey="fullName" />
                        </div>
                    </th>
                    <th 
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('plateNumber')}
                    >
                        <div className="flex items-center gap-2">
                            پلاک <SortIcon colKey="plateNumber" />
                        </div>
                    </th>
                    <th className="px-6 py-4">تلفن</th>
                    <th 
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('balance')}
                    >
                        <div className="flex items-center gap-2">
                            تراز مالی (طلب راننده) <SortIcon colKey="balance" />
                        </div>
                    </th>
                    <th className="px-6 py-4 text-center print:hidden">عملیات</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {sortedDrivers.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">موردی یافت نشد</td>
                    </tr>
                ) : (
                    sortedDrivers.map((d) => {
                        const balance = d.balance;
                        const isDebtor = balance < 0; 
                        const isCreditor = balance > 0; 
                        const isSettled = balance === 0;

                        return (
                            <tr key={d.id} className="hover:bg-slate-50 transition-colors print:hover:bg-white">
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div>{d.fullName}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-1">{d.nationalId}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded font-mono text-sm text-slate-700 print:bg-transparent print:border-0 print:p-0">
                                        {d.plateNumber}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{d.phone}</td>
                                <td className="px-6 py-4" dir="ltr">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className={`font-bold ${isDebtor ? 'text-red-500' : isCreditor ? 'text-emerald-500' : 'text-slate-500'} print:text-black`}>
                                            {formatBalance(Math.abs(balance))}
                                        </div>
                                        {isDebtor && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold print:border print:border-red-500">بدهکار</span>}
                                        {isCreditor && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold print:border print:border-emerald-500">بستانکار</span>}
                                        {isSettled && <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">تسویه</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center print:hidden">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => setQueueDriverId(d.id)}
                                            className="text-xs bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 font-medium"
                                            title="افزودن به صف بارگیری"
                                        >
                                            <ListPlus size={14} /> نوبت‌دهی
                                        </button>
                                        <button 
                                            onClick={() => setTransDriverId(d.id)}
                                            className="text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 font-medium"
                                            title="ثبت ورود گاز (هزینه)"
                                        >
                                            <Fuel size={14} /> ثبت بار
                                        </button>
                                        <button 
                                            onClick={() => setFreightDriverId(d.id)}
                                            className="text-xs border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1 font-medium"
                                            title="ثبت کرایه بار (بستانکاری)"
                                        >
                                            <Truck size={14} /> ثبت کرایه
                                        </button>
                                        <button 
                                            onClick={() => setSelectedDriverId(d.id)}
                                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                            title="ثبت دریافت وجه"
                                        >
                                            <DollarSign size={14} /> تسویه
                                        </button>
                                        <button 
                                            onClick={() => setHistoryDriverId(d.id)}
                                            className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                            title="مشاهده ریز حساب"
                                        >
                                            <History size={14} /> سابقه
                                        </button>
                                        <button 
                                            onClick={() => handleOpenEdit(d)}
                                            className="text-xs bg-violet-50 text-violet-600 hover:bg-violet-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                            title="ویرایش مشخصات"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setAdjustDriverId(d.id)}
                                            className="text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                            title="اصلاح دستی مانده حساب"
                                        >
                                            <SlidersHorizontal size={14} />
                                        </button>
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

        {/* Queue Modal */}
        {queueDriverId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-amber-50 p-4 border-b border-amber-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-amber-800">
                             <ListPlus size={20} />
                             <h3 className="font-bold">افزودن راننده به صف</h3>
                        </div>
                        <button onClick={() => setQueueDriverId(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAddToQueue} className="p-6 space-y-4">
                        <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-2">
                            راننده انتخاب شده: <strong>{drivers.find(d => d.id === queueDriverId)?.fullName}</strong>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">مقصد</label>
                            <input 
                                type="text" 
                                autoFocus
                                value={queueDestination} 
                                onChange={e => setQueueDestination(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" 
                                placeholder="مثال: تهران..."
                            />
                        </div>
                        <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            <ListPlus size={18} /> افزودن به صف
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Payment Modal */}
        {selectedDriverId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">ثبت پرداخت وجه به راننده (تسویه)</h3>
                        <button onClick={() => setSelectedDriverId(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handlePayment} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ پرداختی (تومان)</label>
                            <input 
                                type="number" 
                                autoFocus
                                value={payAmount} 
                                onChange={e => setPayAmount(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <input 
                                type="text" 
                                value={payDesc} 
                                onChange={e => setPayDesc(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                                placeholder="مثال: نقدی، کارت به کارت..."
                            />
                        </div>
                        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            <DollarSign size={18} /> ثبت پرداخت
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Transaction Modal (Load Entry) */}
        {transDriverId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-emerald-800">
                             <Fuel size={20} />
                             <h3 className="font-bold">ثبت ورود گاز (هزینه بار)</h3>
                        </div>
                        <button onClick={() => setTransDriverId(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleTransaction} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">حجم گاز</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    autoFocus
                                    value={transVolume} 
                                    onChange={e => setTransVolume(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">بارنامه</label>
                                <input 
                                    type="text"
                                    value={transBillOfLading} 
                                    onChange={e => setTransBillOfLading(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="شماره..."
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">قیمت واحد (هزینه)</label>
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => setTransCurrency('toman')} className={`text-[10px] px-2 py-0.5 rounded ${transCurrency === 'toman' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>تومان</button>
                                    <button type="button" onClick={() => setTransCurrency('usd')} className={`text-[10px] px-2 py-0.5 rounded ${transCurrency === 'usd' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>دلار</button>
                                    <button type="button" onClick={() => setTransCurrency('aed')} className={`text-[10px] px-2 py-0.5 rounded ${transCurrency === 'aed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>درهم</button>
                                </div>
                            </div>
                            <div className="relative">
                                <input 
                                    type="number"
                                    step="0.01" 
                                    value={transPrice} 
                                    onChange={e => setTransPrice(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <input 
                                type="text" 
                                value={transDesc} 
                                onChange={e => setTransDesc(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                                placeholder="اختیاری..."
                            />
                        </div>

                        <div className="bg-slate-50 p-3 rounded text-sm flex justify-between items-center border border-slate-100">
                             <span className="text-slate-600">مبلغ کل (تومان):</span>
                             <span className="font-bold text-emerald-700">{calculateTransTotal().toman.toLocaleString()}</span>
                        </div>

                        <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            <Fuel size={18} /> ثبت ورود گاز
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Freight Modal */}
        {freightDriverId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-cyan-50 p-4 border-b border-cyan-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-cyan-800">
                             <Truck size={20} />
                             <h3 className="font-bold">ثبت کرایه بار (بستانکار)</h3>
                        </div>
                        <button onClick={() => setFreightDriverId(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleFreight} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ کرایه (تومان)</label>
                                <input 
                                    type="number" 
                                    autoFocus
                                    value={freightAmount} 
                                    onChange={e => setFreightAmount(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" 
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">کد رهگیری</label>
                                <input 
                                    type="text"
                                    value={freightTrackingCode} 
                                    onChange={e => setFreightTrackingCode(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" 
                                    placeholder="اختیاری"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4">
                             <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">مبدا</label>
                                <input 
                                    type="text"
                                    value={freightOrigin} 
                                    onChange={e => setFreightOrigin(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" 
                                    placeholder="مبدا..."
                                />
                             </div>
                             <div className="pt-9 text-slate-400">
                                <ArrowLeft size={20} />
                             </div>
                             <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">مقصد</label>
                                <input 
                                    type="text"
                                    value={freightDest} 
                                    onChange={e => setFreightDest(e.target.value)} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" 
                                    placeholder="مقصد..."
                                />
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">توضیحات</label>
                            <input 
                                type="text" 
                                value={freightDesc} 
                                onChange={e => setFreightDesc(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500" 
                                placeholder="اختیاری..."
                            />
                        </div>
                        <button type="submit" className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            <Truck size={18} /> ثبت کرایه
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Edit Driver Modal */}
        {editDriverId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-violet-50 p-4 border-b border-violet-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-violet-800">
                             <Pencil size={20} />
                             <h3 className="font-bold">ویرایش اطلاعات راننده</h3>
                        </div>
                        <button onClick={() => setEditDriverId(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">نام کامل</label>
                            <input 
                                type="text" 
                                value={editForm.fullName} 
                                onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">شماره تماس</label>
                            <input 
                                type="text" 
                                value={editForm.phone} 
                                onChange={e => setEditForm({ ...editForm, phone: e.target.value })} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">شماره پلاک</label>
                                <input 
                                    type="text" 
                                    value={editForm.plateNumber} 
                                    onChange={e => setEditForm({ ...editForm, plateNumber: e.target.value })} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500" 
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">شماره تانکر</label>
                                <input 
                                    type="text" 
                                    value={editForm.tankNumber} 
                                    onChange={e => setEditForm({ ...editForm, tankNumber: e.target.value })} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500" 
                                />
                             </div>
                        </div>

                        <button type="submit" className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            <Save size={18} /> ذخیره تغییرات
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Adjustment Modal */}
        {adjustDriverId && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-amber-50 p-4 border-b border-amber-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-amber-700">
                             <SlidersHorizontal size={20} />
                             <h3 className="font-bold">اصلاح دستی مانده حساب</h3>
                        </div>
                        <button onClick={() => setAdjustDriverId(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                    </div>
                    <form onSubmit={handleAdjustment} className="p-6 space-y-4">
                        <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                            <button
                                type="button"
                                onClick={() => setAdjustType('credit')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${adjustType === 'credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                <TrendingUp size={16}/> افزایش اعتبار (بستانکار)
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustType('debit')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${adjustType === 'debit' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                <TrendingDown size={16}/> کاهش اعتبار (بدهکار)
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">مبلغ اصلاحی (تومان)</label>
                            <input 
                                type="number" 
                                autoFocus
                                value={adjustAmount} 
                                onChange={e => setAdjustAmount(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" 
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">علت اصلاح</label>
                            <input 
                                type="text" 
                                value={adjustDesc} 
                                onChange={e => setAdjustDesc(e.target.value)} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500" 
                                placeholder="مثال: اشتباه در ثبت قبلی، مانده اول دوره..."
                            />
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 mb-2">
                            {adjustType === 'credit' 
                                ? 'این مبلغ به عنوان "درآمد/کرایه" ثبت شده و طلب راننده را افزایش می‌دهد.' 
                                : 'این مبلغ به عنوان "پرداخت/هزینه" ثبت شده و طلب راننده را کاهش می‌دهد.'}
                        </div>

                        <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                            <SlidersHorizontal size={18} /> اعمال اصلاحات
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* History Modal */}
        {historyDriverId && historyDriver && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <FileText size={20} className="text-slate-600"/>
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-800 text-lg">ریز حساب راننده: {historyDriver.fullName}</h3>
                                 <div className="text-xs text-slate-500 flex gap-3 mt-1">
                                     <span>کد ملی: {historyDriver.nationalId}</span>
                                     <span>|</span>
                                     <span>پلاک: {historyDriver.plateNumber}</span>
                                 </div>
                             </div>
                        </div>
                        <button onClick={() => setHistoryDriverId(null)} className="text-slate-400 hover:text-red-500 transition-colors bg-white p-2 rounded-lg border border-transparent hover:border-slate-200">
                            <X size={20}/>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-0">
                         <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 font-semibold w-32">تاریخ</th>
                                    <th className="px-4 py-3 font-semibold">شرح عملیات</th>
                                    <th className="px-4 py-3 font-semibold w-32 text-left text-red-600 bg-red-50/50">پرداخت (بدهکار)</th>
                                    <th className="px-4 py-3 font-semibold w-32 text-left text-green-600 bg-green-50/50">بستانکار (کرایه/گاز)</th>
                                    <th className="px-4 py-3 font-semibold w-40 text-left bg-slate-100/50">مانده (تومان)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">هیچ سابقه‌ای برای این راننده یافت نشد.</td>
                                    </tr>
                                ) : (
                                    (() => {
                                        let runningBalance = 0;
                                        let totalDebit = 0;
                                        let totalCredit = 0;

                                        return (
                                            <>
                                                {historyData.map((item) => {
                                                    const isFreight = item.type === 'freight';
                                                    const isPayment = item.type === 'payment';
                                                    const isLoad = item.type === 'transaction';
                                                    
                                                    // Load is now treated same as Freight (Credit)
                                                    if (isFreight || isLoad) {
                                                        runningBalance += item.amount;
                                                        totalCredit += item.amount;
                                                    } else if (isPayment) {
                                                        runningBalance -= item.amount;
                                                        totalDebit += item.amount;
                                                    }

                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap" dir="ltr">{item.date}</td>
                                                            <td className="px-4 py-3 text-slate-700">
                                                                <div className="flex items-start gap-2">
                                                                    <span className={`mt-0.5 ${isFreight || isLoad ? 'text-green-500' : isPayment ? 'text-red-500' : 'text-slate-400'}`}>
                                                                        {isPayment ? <ArrowDownLeft size={16} /> : isFreight ? <Truck size={16} /> : <Fuel size={16} />}
                                                                    </span>
                                                                    <div>
                                                                        <span className="font-medium">
                                                                            {isPayment ? 'پرداخت وجه' : isFreight ? 'کرایه حمل' : 'هزینه بار گاز'}
                                                                        </span>
                                                                        <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                                                                            <p>{item.description || '-'}</p>
                                                                            {isLoad && (
                                                                                <div className="flex gap-2">
                                                                                    {item.volume > 0 && <span className="bg-slate-100 px-1 rounded">حجم: {item.volume}</span>}
                                                                                    {item.billOfLading && <span className="bg-indigo-50 text-indigo-700 px-1 rounded">بارنامه: {item.billOfLading}</span>}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {/* Debit (Payment) */}
                                                            <td className="px-4 py-3 text-left bg-red-50/30 text-red-600 font-mono">
                                                                {isPayment && item.amount.toLocaleString()}
                                                            </td>
                                                            {/* Credit (Freight/Gas) */}
                                                            <td className="px-4 py-3 text-left bg-green-50/30 text-green-600 font-mono">
                                                                {(isFreight || isLoad) && item.amount.toLocaleString()}
                                                            </td>
                                                            {/* Balance */}
                                                            <td className="px-4 py-3 text-left font-bold font-mono text-slate-800 bg-slate-50/30" dir="ltr">
                                                                <span className={runningBalance < 0 ? 'text-red-600' : 'text-green-600'}>
                                                                    {runningBalance.toLocaleString()}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* Totals Row */}
                                                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                                    <td colSpan={2} className="px-4 py-3 text-left pl-8">جمع کل:</td>
                                                    <td className="px-4 py-3 text-left text-red-700 font-mono" dir="ltr">{totalDebit.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-left text-green-700 font-mono" dir="ltr">{totalCredit.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-left font-mono" dir="ltr">
                                                        <span className={runningBalance < 0 ? 'text-red-700' : 'text-green-700'}>
                                                            {runningBalance.toLocaleString()}
                                                        </span>
                                                        <span className="text-xs font-normal text-slate-500 block">
                                                            {runningBalance < 0 ? '(بدهکار)' : runningBalance > 0 ? '(بستانکار)' : '(تسویه)'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </>
                                        );
                                    })()
                                )}
                            </tbody>
                         </table>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="bg-white p-4 border-t border-slate-200 flex justify-end">
                        <button 
                            onClick={() => setHistoryDriverId(null)}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
                        >
                            بستن پنجره
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DriversList;
