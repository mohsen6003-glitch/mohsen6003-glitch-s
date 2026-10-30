
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { 
  Driver, Transaction, QueueItem, Company, Purchase, Partner, QueueStatus, 
  Expense, DriverPayment, PartnerPayment, ExchangeRates, Freight, Receiver, 
  ExchangeTransaction, Exchange, Sender, DriverSettlement,
  FiscalYear, FiscalYearClosingSummary, ResetSystemOptions,
  DriverVehicleExpense 
} from '../types';

interface DataContextType {
  drivers: Driver[];
  transactions: Transaction[];
  driverPayments: DriverPayment[];
  freights: Freight[];
  queue: QueueItem[];
  companies: Company[];
  receivers: Receiver[];
  purchases: Purchase[];
  partners: Partner[];
  partnerPayments: PartnerPayment[];
  expenses: Expense[];
  exchangeTransactions: ExchangeTransaction[];
  exchanges: Exchange[];
  senders: Sender[];
  exchangeRates: ExchangeRates;
  driverSettlements: DriverSettlement[];
  driverVehicleExpenses: DriverVehicleExpense[];
  fiscalYears: FiscalYear[];
  activeFiscalYearId: string | null;
  activeFiscalYear: FiscalYear | null;
  
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, updatedDriver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void; 
  deleteTransaction: (id: string) => void; // Added deleteTransaction
  addDriverPayment: (payment: Omit<DriverPayment, 'id'>) => void;
  updateDriverPayment: (id: string, data: Partial<DriverPayment>) => void; 
  deleteDriverPayment: (id: string) => void;
  addFreight: (freight: Omit<Freight, 'id'>) => void;
  updateFreight: (id: string, data: Partial<Freight>) => void; 
  addToQueue: (item: Omit<QueueItem, 'id' | 'status'>) => void;
  updateQueueStatus: (id: string, status: QueueStatus) => void;
  addCompany: (company: Omit<Company, 'id'>) => void;
  addReceiver: (receiver: Omit<Receiver, 'id'>) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  updatePurchase: (id: string, data: Partial<Purchase>) => void; 
  addPartner: (partner: Omit<Partner, 'id'>) => void;
  addPartnerPayment: (payment: Omit<PartnerPayment, 'id'>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void; 
  addExchangeTransaction: (et: Omit<ExchangeTransaction, 'id'>) => void;
  updateExchangeTransaction: (id: string, data: Partial<ExchangeTransaction>) => void;
  deleteExchangeTransaction: (id: string) => void;
  addExchange: (exchange: Omit<Exchange, 'id'>) => void;
  updateExchange: (id: string, data: Partial<Exchange>) => void;
  deleteExchange: (id: string) => void;
  addSender: (sender: Omit<Sender, 'id'>) => void;
  deleteSender: (id: string) => void;
  updateExchangeRates: (rates: ExchangeRates) => void;
  addDriverSettlement: (settlement: Omit<DriverSettlement, 'id'>) => void;
  updateDriverSettlement: (id: string, data: Partial<DriverSettlement>) => void;
  deleteDriverSettlement: (id: string) => void;
  
  addDriverVehicleExpense: (expense: Omit<DriverVehicleExpense, 'id' | 'createdAt'>) => void;
  updateDriverVehicleExpense: (id: string, data: Partial<DriverVehicleExpense>) => void;
  deleteDriverVehicleExpense: (id: string) => void;
  getDriverVehicleExpenses: (driverId?: string) => DriverVehicleExpense[];
  
  addFiscalYear: (year: Omit<FiscalYear, 'id' | 'createdAt'>) => void;
  updateFiscalYear: (id: string, data: Partial<FiscalYear>) => void;
  deleteFiscalYear: (id: string) => void;
  setActiveFiscalYear: (id: string) => void;
  closeFiscalYear: (id: string, notes?: string, closedBy?: string) => FiscalYearClosingSummary;
  reopenFiscalYear: (id: string) => void;
  resetSystemData: (options: ResetSystemOptions) => { success: boolean; message: string; backupDownloaded: boolean };
  downloadBackupFile: (customName?: string) => void;

  getDriverName: (id: string) => string;
  getCompanyName: (id: string) => string;
  getReceiverName: (id: string) => string;
  getExchangeName: (id: string) => string;
  getSenderName: (id: string) => string;
  getDriverBalance: (id: string) => number;
  getExchangeBalance: (id: string) => number;
  getSenderBalance: (id: string) => number;
  getReceiverBalance: (id: string) => number;
  getCompanyStats: (id: string) => { totalVolumePurchased: number; totalPaid: number; totalVolumeSupplied: number };
  getReceiverStats: (id: string) => { totalVolumeReceived: number; totalLoads: number };
  getSystemFinancials: () => { totalIncome: number; totalCost: number; totalExpense: number; totalFreights: number; netProfit: number };
  
  getAllData: () => any;
  importData: (data: any) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  DRIVERS: 'gas_app_drivers',
  TRANSACTIONS: 'gas_app_transactions',
  DRIVER_PAYMENTS: 'gas_app_driver_payments',
  FREIGHTS: 'gas_app_freights',
  QUEUE: 'gas_app_queue',
  COMPANIES: 'gas_app_companies',
  RECEIVERS: 'gas_app_receivers',
  PURCHASES: 'gas_app_purchases',
  PARTNERS: 'gas_app_partners',
  PARTNER_PAYMENTS: 'gas_app_partner_payments',
  EXPENSES: 'gas_app_expenses',
  EXCHANGE_TRANSACTIONS: 'gas_app_exchange_transactions',
  EXCHANGES: 'gas_app_exchanges',
  SENDERS: 'gas_app_senders',
  RATES: 'gas_app_rates',
  DRIVER_SETTLEMENTS: 'gas_app_driver_settlements',
  DRIVER_VEHICLE_EXPENSES: 'gas_app_driver_vehicle_expenses',
  FISCAL_YEARS: 'gas_app_fiscal_years',
  ACTIVE_FISCAL_YEAR: 'gas_app_active_fiscal_year',
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getStored = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Error parsing localStorage key ${key}`, e);
      return defaultValue;
    }
  };

  const [drivers, setDrivers] = useState<Driver[]>(() => getStored(STORAGE_KEYS.DRIVERS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStored(STORAGE_KEYS.TRANSACTIONS, []));
  const [driverPayments, setDriverPayments] = useState<DriverPayment[]>(() => getStored(STORAGE_KEYS.DRIVER_PAYMENTS, []));
  const [freights, setFreights] = useState<Freight[]>(() => getStored(STORAGE_KEYS.FREIGHTS, []));
  const [queue, setQueue] = useState<QueueItem[]>(() => getStored(STORAGE_KEYS.QUEUE, []));
  const [companies, setCompanies] = useState<Company[]>(() => getStored(STORAGE_KEYS.COMPANIES, []));
  const [receivers, setReceivers] = useState<Receiver[]>(() => getStored(STORAGE_KEYS.RECEIVERS, []));
  const [purchases, setPurchases] = useState<Purchase[]>(() => getStored(STORAGE_KEYS.PURCHASES, []));
  const [partners, setPartners] = useState<Partner[]>(() => getStored(STORAGE_KEYS.PARTNERS, []));
  const [partnerPayments, setPartnerPayments] = useState<PartnerPayment[]>(() => getStored(STORAGE_KEYS.PARTNER_PAYMENTS, []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getStored(STORAGE_KEYS.EXPENSES, []));
  const [exchangeTransactions, setExchangeTransactions] = useState<ExchangeTransaction[]>(() => getStored(STORAGE_KEYS.EXCHANGE_TRANSACTIONS, []));
  const [exchanges, setExchanges] = useState<Exchange[]>(() => getStored(STORAGE_KEYS.EXCHANGES, []));
  const [senders, setSenders] = useState<Sender[]>(() => getStored(STORAGE_KEYS.SENDERS, []));
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(() => {
    const stored = getStored<ExchangeRates>(STORAGE_KEYS.RATES, { usd: 60000, aed: 16000, usdAed: 3.67 });
    return {
      usd: stored?.usd || 60000,
      aed: stored?.aed || 16000,
      usdAed: stored?.usdAed || 3.67
    };
  });
  const [driverSettlements, setDriverSettlements] = useState<DriverSettlement[]>(() => getStored(STORAGE_KEYS.DRIVER_SETTLEMENTS, []));
  const [driverVehicleExpenses, setDriverVehicleExpenses] = useState<DriverVehicleExpense[]>(() => getStored(STORAGE_KEYS.DRIVER_VEHICLE_EXPENSES, []));

  // Default initial fiscal year if none stored
  const defaultInitialFiscalYears: FiscalYear[] = [
    {
      id: 'fy-1403',
      title: 'سال مالی ۱۴۰۳',
      year: 1403,
      startDate: '1403/01/01',
      endDate: '1403/12/29',
      status: 'active',
      createdAt: '2024-03-20T00:00:00.000Z',
      notes: 'دوره مالی جاری سامانه'
    }
  ];

  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>(() => {
    const stored = getStored<FiscalYear[]>(STORAGE_KEYS.FISCAL_YEARS, []);
    return stored && stored.length > 0 ? stored : defaultInitialFiscalYears;
  });

  const [activeFiscalYearId, setActiveFiscalYearId] = useState<string | null>(() => {
    const stored = getStored<string | null>(STORAGE_KEYS.ACTIVE_FISCAL_YEAR, null);
    if (stored) return stored;
    return fiscalYears[0]?.id || 'fy-1403';
  });

  const activeFiscalYear = useMemo(() => {
    return fiscalYears.find(fy => fy.id === activeFiscalYearId) || fiscalYears.find(fy => fy.status === 'active') || fiscalYears[0] || null;
  }, [fiscalYears, activeFiscalYearId]);

  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Storage error for ${key}:`, e);
    }
  }, []);

  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.FISCAL_YEARS, fiscalYears), 300); return () => clearTimeout(t); }, [fiscalYears, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.ACTIVE_FISCAL_YEAR, activeFiscalYearId), 300); return () => clearTimeout(t); }, [activeFiscalYearId, saveToStorage]);

  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.DRIVERS, drivers), 300); return () => clearTimeout(t); }, [drivers, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions), 300); return () => clearTimeout(t); }, [transactions, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.DRIVER_PAYMENTS, driverPayments), 300); return () => clearTimeout(t); }, [driverPayments, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.FREIGHTS, freights), 300); return () => clearTimeout(t); }, [freights, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.QUEUE, queue), 300); return () => clearTimeout(t); }, [queue, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.COMPANIES, companies), 300); return () => clearTimeout(t); }, [companies, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.RECEIVERS, receivers), 300); return () => clearTimeout(t); }, [receivers, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.PURCHASES, purchases), 300); return () => clearTimeout(t); }, [purchases, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.PARTNERS, partners), 300); return () => clearTimeout(t); }, [partners, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.PARTNER_PAYMENTS, partnerPayments), 300); return () => clearTimeout(t); }, [partnerPayments, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.EXPENSES, expenses), 300); return () => clearTimeout(t); }, [expenses, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.EXCHANGE_TRANSACTIONS, exchangeTransactions), 300); return () => clearTimeout(t); }, [exchangeTransactions, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.EXCHANGES, exchanges), 300); return () => clearTimeout(t); }, [exchanges, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.SENDERS, senders), 300); return () => clearTimeout(t); }, [senders, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.RATES, exchangeRates), 300); return () => clearTimeout(t); }, [exchangeRates, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.DRIVER_SETTLEMENTS, driverSettlements), 300); return () => clearTimeout(t); }, [driverSettlements, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.DRIVER_VEHICLE_EXPENSES, driverVehicleExpenses), 300); return () => clearTimeout(t); }, [driverVehicleExpenses, saveToStorage]);

  const addDriver = (driver: Omit<Driver, 'id'>) => setDrivers(prev => [...prev, { ...driver, id: Date.now().toString() }]);
  const updateDriver = (id: string, updatedDriver: Partial<Driver>) => setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updatedDriver } : d));
  const deleteDriver = (id: string) => setDrivers(prev => prev.filter(d => d.id !== id));
  
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => setTransactions(prev => [...prev, { ...transaction, id: Date.now().toString() }]);
  const updateTransaction = (id: string, data: Partial<Transaction>) => setTransactions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addDriverPayment = (payment: Omit<DriverPayment, 'id'>) => setDriverPayments(prev => [...prev, { ...payment, id: Date.now().toString() }]);
  const updateDriverPayment = (id: string, data: Partial<DriverPayment>) => setDriverPayments(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  const deleteDriverPayment = (id: string) => setDriverPayments(prev => prev.filter(item => item.id !== id));
  
  const addFreight = (freight: Omit<Freight, 'id'>) => setFreights(prev => [...prev, { ...freight, id: Date.now().toString() }]);
  const updateFreight = (id: string, data: Partial<Freight>) => setFreights(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  
  const addToQueue = (item: Omit<QueueItem, 'id' | 'status'>) => setQueue(prev => [...prev, { ...item, id: Date.now().toString(), status: 'WAIT' }]);
  const updateQueueStatus = (id: string, status: QueueStatus) => setQueue(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  
  const addCompany = (company: Omit<Company, 'id'>) => setCompanies(prev => [...prev, { ...company, id: Date.now().toString() }]);
  const addReceiver = (receiver: Omit<Receiver, 'id'>) => setReceivers(prev => [...prev, { ...receiver, id: Date.now().toString() }]);
  
  const addPurchase = (purchase: Omit<Purchase, 'id'>) => setPurchases(prev => [...prev, { ...purchase, id: Date.now().toString() }]);
  const updatePurchase = (id: string, data: Partial<Purchase>) => setPurchases(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  
  const addPartner = (partner: Omit<Partner, 'id'>) => setPartners(prev => [...prev, { ...partner, id: Date.now().toString() }]);
  const addPartnerPayment = (payment: Omit<PartnerPayment, 'id'>) => setPartnerPayments(prev => [...prev, { ...payment, id: Date.now().toString() }]);
  
  const addExpense = (expense: Omit<Expense, 'id'>) => setExpenses(prev => [...prev, { ...expense, id: Date.now().toString() }]);
  const updateExpense = (id: string, data: Partial<Expense>) => setExpenses(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  
  const addExchangeTransaction = (et: Omit<ExchangeTransaction, 'id'>) => setExchangeTransactions(prev => [...prev, { ...et, id: Date.now().toString() }]);
  const updateExchangeTransaction = (id: string, data: Partial<ExchangeTransaction>) => setExchangeTransactions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  const deleteExchangeTransaction = (id: string) => setExchangeTransactions(prev => prev.filter(t => t.id !== id));
  
  const addExchange = (exchange: Omit<Exchange, 'id'>) => setExchanges(prev => [...prev, { ...exchange, id: Date.now().toString() }]);
  const updateExchange = (id: string, data: Partial<Exchange>) => setExchanges(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  const deleteExchange = (id: string) => setExchanges(prev => prev.filter(e => e.id !== id));
  
  const addSender = (sender: Omit<Sender, 'id'>) => setSenders(prev => [...prev, { ...sender, id: Date.now().toString() }]);
  const deleteSender = (id: string) => setSenders(prev => prev.filter(s => s.id !== id));
  
  const updateExchangeRates = (rates: ExchangeRates) => setExchangeRates(rates);

  const addDriverSettlement = (settlement: Omit<DriverSettlement, 'id'>) => {
    setDriverSettlements(prev => [{ ...settlement, id: Date.now().toString() }, ...prev]);
  };
  const updateDriverSettlement = (id: string, data: Partial<DriverSettlement>) => {
    setDriverSettlements(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };
  const deleteDriverSettlement = (id: string) => {
    setDriverSettlements(prev => prev.filter(item => item.id !== id));
  };

  const addDriverVehicleExpense = (expense: Omit<DriverVehicleExpense, 'id' | 'createdAt'>) => {
    const newExpense: DriverVehicleExpense = {
      ...expense,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setDriverVehicleExpenses(prev => [newExpense, ...prev]);
  };

  const updateDriverVehicleExpense = (id: string, data: Partial<DriverVehicleExpense>) => {
    setDriverVehicleExpenses(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };

  const deleteDriverVehicleExpense = (id: string) => {
    setDriverVehicleExpenses(prev => prev.filter(item => item.id !== id));
  };

  const getDriverVehicleExpenses = (driverId?: string) => {
    if (!driverId) return driverVehicleExpenses;
    return driverVehicleExpenses.filter(e => e.driverId === driverId);
  };

  const getDriverName = (id: string) => drivers.find(d => d.id === id)?.fullName || 'نامشخص';
  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name || 'نامشخص';
  const getReceiverName = (id: string) => receivers.find(r => r.id === id)?.name || 'نامشخص';
  const getExchangeName = (id: string) => exchanges.find(e => e.id === id)?.name || 'نامشخص';
  const getSenderName = (id: string) => senders.find(s => s.id === id)?.name || 'نامشخص';

  const getDriverBalance = (id: string) => {
    const drv = drivers.find(d => d.id === id);
    const hasIncludedPrevBalance =
      drv &&
      (drv.previousBalanceAmount || 0) > 0 &&
      drv.previousBalanceType &&
      drv.previousBalanceType !== 'NONE' &&
      drv.includePreviousBalanceInTotal !== false;

    const prevCredit =
      hasIncludedPrevBalance && drv?.previousBalanceType === 'CREDITOR'
        ? drv.previousBalanceAmount || 0
        : 0;
    const prevDebit =
      hasIncludedPrevBalance && drv?.previousBalanceType === 'DEBTOR'
        ? drv.previousBalanceAmount || 0
        : 0;

    const paid = driverPayments
      .filter(
        p =>
          p.driverId === id &&
          (p.deductFromWaybillBalance !== false ||
            (hasIncludedPrevBalance && p.paymentCategory === 'PREVIOUS_ACCOUNT'))
      )
      .reduce((sum, p) => sum + p.amount, 0);
    const freight = freights.filter(f => f.driverId === id).reduce((sum, f) => sum + f.amount, 0);
    const transFreight = transactions.filter(t => t.driverId === id).reduce((sum, t) => sum + (t.freightPrice || 0), 0);
    
    // کسر از راننده (بدهکار شدن راننده به دلیل مساعده، جریمه پرداختی شرکت و ...)
    const driverDeductions = driverVehicleExpenses
      .filter(e => e.driverId === id && e.impactOnBalance === 'DEDUCT_FROM_DRIVER')
      .reduce((sum, e) => sum + e.amount, 0);

    // بستانکار شدن راننده (پرداخت هزینه خودرو توسط راننده از جیب خود که شرکت باید به او بازگرداند)
    const driverReimbursements = driverVehicleExpenses
      .filter(e => e.driverId === id && e.impactOnBalance === 'REIMBURSE_TO_DRIVER')
      .reduce((sum, e) => sum + e.amount, 0);

    return (prevCredit + freight + transFreight + driverReimbursements) - (prevDebit + paid + driverDeductions);
  };

  const getExchangeBalance = (id: string) => {
    return exchangeTransactions
      .filter(t => t.exchangeId === id)
      .reduce((sum, t) => sum + (t.actualDeliveredAmount - t.aedAmount), 0);
  };

  const getReceiverBalance = (id: string) => {
    return exchangeTransactions
      .filter(t => t.receiverId === id)
      .reduce((sum, t) => sum + (t.aedAmount - t.actualDeliveredAmount), 0);
  };

  const getSenderBalance = (id: string) => {
    return exchangeTransactions
      .filter(t => t.senderId === id)
      .reduce((sum, t) => sum + t.amountToman, 0);
  };

  const getCompanyStats = (id: string) => {
      const companyPurchases = purchases.filter(p => p.companyId === id);
      return {
          totalVolumePurchased: companyPurchases.reduce((acc, p) => acc + p.volume, 0),
          totalPaid: companyPurchases.reduce((acc, p) => acc + p.totalPrice, 0),
          totalVolumeSupplied: transactions.filter(t => t.companyId === id).reduce((acc, t) => acc + t.volume, 0)
      };
  };

  const getReceiverStats = (id: string) => {
      const trans = transactions.filter(t => t.receiverId === id);
      return { totalVolumeReceived: trans.reduce((acc, t) => acc + t.volume, 0), totalLoads: trans.length };
  };

  const getSystemFinancials = () => {
    const totalIncome = transactions.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const totalCost = purchases.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const generalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    // هزینه‌های تقبل‌شده توسط شرکت (استهلاک خودرو + بازپرداخت به راننده)
    const companyVehicleExpenses = driverVehicleExpenses
      .filter(e => e.impactOnBalance === 'COMPANY_OVERHEAD' || e.impactOnBalance === 'REIMBURSE_TO_DRIVER')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = generalExpense + companyVehicleExpenses;
    const totalFreights = freights.reduce((acc, f) => acc + f.amount, 0) + transactions.reduce((acc, t) => acc + (t.freightPrice || 0), 0);
    return { totalIncome, totalCost, totalExpense, totalFreights, netProfit: totalIncome - totalCost - totalExpense - totalFreights };
  };

  // Fiscal Year Management Methods
  const addFiscalYear = (yearData: Omit<FiscalYear, 'id' | 'createdAt'>) => {
    const newYear: FiscalYear = {
      ...yearData,
      id: 'fy-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setFiscalYears(prev => [...prev, newYear]);
    if (yearData.status === 'active') {
      setActiveFiscalYearId(newYear.id);
    }
  };

  const updateFiscalYear = (id: string, data: Partial<FiscalYear>) => {
    setFiscalYears(prev => prev.map(fy => fy.id === id ? { ...fy, ...data } : fy));
  };

  const deleteFiscalYear = (id: string) => {
    setFiscalYears(prev => {
      const filtered = prev.filter(fy => fy.id !== id);
      if (activeFiscalYearId === id) {
        setActiveFiscalYearId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  const setActiveFiscalYear = (id: string) => {
    setActiveFiscalYearId(id);
    setFiscalYears(prev => prev.map(fy => ({
      ...fy,
      status: fy.id === id ? 'active' : fy.status === 'closed' ? 'closed' : 'active'
    })));
  };

  const closeFiscalYear = (id: string, notes?: string, closedBy?: string): FiscalYearClosingSummary => {
    const financials = getSystemFinancials();
    const totalVolumeDelivered = transactions.reduce((acc, t) => acc + (t.volume || 0), 0);
    const summary: FiscalYearClosingSummary = {
      closedAt: new Date().toISOString(),
      closedBy: closedBy || 'مدیر سیستم',
      totalGasIncome: financials.totalIncome,
      totalGasPurchaseCost: financials.totalCost,
      totalExpenses: financials.totalExpense,
      totalFreights: financials.totalFreights,
      netProfit: financials.netProfit,
      totalVolumeDelivered,
      totalTransactionsCount: transactions.length,
      notes: notes || 'بستن سال مالی با محاسبه سود و زیان نهایی و ترازنامه انبار'
    };

    setFiscalYears(prev => prev.map(fy => {
      if (fy.id === id) {
        return {
          ...fy,
          status: 'closed',
          closingSummary: summary
        };
      }
      return fy;
    }));

    return summary;
  };

  const reopenFiscalYear = (id: string) => {
    setFiscalYears(prev => prev.map(fy => {
      if (fy.id === id) {
        const { closingSummary, ...rest } = fy;
        return {
          ...rest,
          status: 'active'
        };
      }
      return fy;
    }));
  };

  // Safe Backup Download Helper
  const downloadBackupFile = (customName?: string) => {
    try {
      const data = getAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = customName || `gas_app_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download backup error:', e);
    }
  };

  // Safe System Reset & Data Wipe for Administrator
  const resetSystemData = (options: ResetSystemOptions): { success: boolean; message: string; backupDownloaded: boolean } => {
    if (!options.adminConfirmation || options.adminConfirmation.trim().toUpperCase() !== 'RESET') {
      return { success: false, message: 'کد تایید امنیتی معتبر نیست. لطفاً عبارت RESET را دقیق وارد کنید.', backupDownloaded: false };
    }

    let backupDownloaded = false;
    // 1. Mandatory Auto-Backup before any wipe to prevent accidental data loss
    if (options.createBackup !== false) {
      try {
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadBackupFile(`backup_before_reset_${options.mode}_${dateStr}.json`);
        backupDownloaded = true;
      } catch (err) {
        console.error('Error auto-downloading backup before reset:', err);
      }
    }

    // 2. Perform reset based on mode
    if (options.mode === 'operations_only') {
      // Clear ONLY operational documents and transactional ledgers
      setTransactions([]);
      setPurchases([]);
      setExpenses([]);
      setDriverPayments([]);
      setFreights([]);
      setQueue([]);
      setPartnerPayments([]);
      setExchangeTransactions([]);
      setDriverSettlements([]);
      setDriverVehicleExpenses([]);

      // Immediate local storage flush
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, []);
      saveToStorage(STORAGE_KEYS.PURCHASES, []);
      saveToStorage(STORAGE_KEYS.EXPENSES, []);
      saveToStorage(STORAGE_KEYS.DRIVER_PAYMENTS, []);
      saveToStorage(STORAGE_KEYS.FREIGHTS, []);
      saveToStorage(STORAGE_KEYS.QUEUE, []);
      saveToStorage(STORAGE_KEYS.PARTNER_PAYMENTS, []);
      saveToStorage(STORAGE_KEYS.EXCHANGE_TRANSACTIONS, []);
      saveToStorage(STORAGE_KEYS.DRIVER_SETTLEMENTS, []);
      saveToStorage(STORAGE_KEYS.DRIVER_VEHICLE_EXPENSES, []);

      return {
        success: true,
        message: 'اسناد و تراکنش‌های عملیاتی با موفقیت پاکسازی شدند. اطلاعات پایه رانندگان، شرکت‌ها، شرکا و صرافی‌ها حفظ گردید.',
        backupDownloaded
      };
    } else {
      // Full Factory Reset: Wipe everything
      setDrivers([]);
      setTransactions([]);
      setDriverPayments([]);
      setFreights([]);
      setQueue([]);
      setCompanies([]);
      setReceivers([]);
      setPurchases([]);
      setPartners([]);
      setPartnerPayments([]);
      setExpenses([]);
      setExchangeTransactions([]);
      setExchanges([]);
      setSenders([]);
      setDriverSettlements([]);
      setDriverVehicleExpenses([]);

      const freshYear: FiscalYear = {
        id: 'fy-' + Date.now(),
        title: 'سال مالی جدید',
        year: 1404,
        startDate: '1404/01/01',
        endDate: '1404/12/29',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      setFiscalYears([freshYear]);
      setActiveFiscalYearId(freshYear.id);

      // Clean all app storage keys
      Object.values(STORAGE_KEYS).forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      });

      return {
        success: true,
        message: 'تمام اطلاعات سیستم به طور کامل بازنشانی و ریست کارخانه‌ای شد.',
        backupDownloaded
      };
    }
  };

  const getAllData = () => ({ 
    drivers, transactions, driverPayments, freights, queue, 
    companies, receivers, purchases, partners, partnerPayments, 
    expenses, exchangeTransactions, exchanges, senders, 
    exchangeRates, driverSettlements, driverVehicleExpenses, fiscalYears, activeFiscalYearId,
    backupDate: new Date().toISOString(), version: '2.8.0' 
  });

  const importData = (data: any) => {
    if (!data) return;
    try {
        if (data.drivers) setDrivers(data.drivers);
        if (data.transactions) setTransactions(data.transactions);
        if (data.driverPayments) setDriverPayments(data.driverPayments);
        if (data.freights) setFreights(data.freights);
        if (data.queue) setQueue(data.queue);
        if (data.companies) setCompanies(data.companies);
        if (data.receivers) setReceivers(data.receivers);
        if (data.purchases) setPurchases(data.purchases);
        if (data.partners) setPartners(data.partners);
        if (data.partnerPayments) setPartnerPayments(data.partnerPayments);
        if (data.expenses) setExpenses(data.expenses);
        if (data.exchangeTransactions) setExchangeTransactions(data.exchangeTransactions);
        if (data.exchanges) setExchanges(data.exchanges);
        if (data.senders) setSenders(data.senders);
        if (data.exchangeRates) setExchangeRates(data.exchangeRates);
        if (data.driverSettlements) setDriverSettlements(data.driverSettlements);
        if (data.driverVehicleExpenses && Array.isArray(data.driverVehicleExpenses)) setDriverVehicleExpenses(data.driverVehicleExpenses);
        if (data.fiscalYears && Array.isArray(data.fiscalYears)) setFiscalYears(data.fiscalYears);
        if (data.activeFiscalYearId) setActiveFiscalYearId(data.activeFiscalYearId);
    } catch (e) {
        console.error("Import error:", e);
        alert("خطا در بازگردانی داده‌ها");
    }
  };

  return (
    <DataContext.Provider value={{ 
      drivers, transactions, driverPayments, freights, queue, companies, receivers, purchases, partners, partnerPayments, expenses, exchangeTransactions, exchanges, senders, exchangeRates, driverSettlements, driverVehicleExpenses,
      fiscalYears, activeFiscalYearId, activeFiscalYear,
      addDriver, updateDriver, deleteDriver, addTransaction, updateTransaction, deleteTransaction, addDriverPayment, updateDriverPayment, deleteDriverPayment, addFreight, updateFreight, addToQueue, updateQueueStatus, 
      addCompany, addReceiver, addPurchase, updatePurchase, addPartner, addPartnerPayment, addExpense, updateExpense, addExchangeTransaction, updateExchangeTransaction, deleteExchangeTransaction, addExchange, updateExchange, deleteExchange, addSender, deleteSender, updateExchangeRates,
      addDriverSettlement, updateDriverSettlement, deleteDriverSettlement,
      addDriverVehicleExpense, updateDriverVehicleExpense, deleteDriverVehicleExpense, getDriverVehicleExpenses,
      addFiscalYear, updateFiscalYear, deleteFiscalYear, setActiveFiscalYear, closeFiscalYear, reopenFiscalYear,
      resetSystemData, downloadBackupFile,
      getDriverName, getCompanyName, getReceiverName, getExchangeName, getSenderName, getDriverBalance, getExchangeBalance, getSenderBalance, getReceiverBalance, getCompanyStats, getReceiverStats, getSystemFinancials,
      getAllData, importData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};
