
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Driver, Transaction, QueueItem, Company, Purchase, Partner, QueueStatus, Expense, DriverPayment, PartnerPayment, ExchangeRates, Freight, Receiver, ExchangeTransaction, Exchange } from '../types';

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
  exchangeRates: ExchangeRates;
  
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, updatedDriver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void; 
  addDriverPayment: (payment: Omit<DriverPayment, 'id'>) => void;
  updateDriverPayment: (id: string, data: Partial<DriverPayment>) => void; 
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
  deleteExchange: (id: string) => void;
  updateExchangeRates: (rates: ExchangeRates) => void;
  
  getDriverName: (id: string) => string;
  getCompanyName: (id: string) => string;
  getReceiverName: (id: string) => string;
  getDriverBalance: (id: string) => number;
  getCompanyStats: (id: string) => { totalVolumePurchased: number; totalPaid: number; totalVolumeSupplied: number };
  getReceiverStats: (id: string) => { totalVolumeReceived: number; totalLoads: number };
  getSystemFinancials: () => { totalIncome: number; totalCost: number; totalExpense: number; netProfit: number };
  
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
  RATES: 'gas_app_rates',
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
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(() => getStored(STORAGE_KEYS.RATES, { usd: 60000, aed: 16000 }));

  // Helper for safe debounced storage
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Storage error for ${key}:`, e);
    }
  }, []);

  // Use effects with short delays to prevent UI blocking during rapid data entry
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
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.RATES, exchangeRates), 300); return () => clearTimeout(t); }, [exchangeRates, saveToStorage]);

  const addDriver = (driver: Omit<Driver, 'id'>) => setDrivers(prev => [...prev, { ...driver, id: Date.now().toString() }]);
  const updateDriver = (id: string, updatedDriver: Partial<Driver>) => setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updatedDriver } : d));
  const deleteDriver = (id: string) => setDrivers(prev => prev.filter(d => d.id !== id));
  
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => setTransactions(prev => [...prev, { ...transaction, id: Date.now().toString() }]);
  const updateTransaction = (id: string, data: Partial<Transaction>) => setTransactions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  
  const addDriverPayment = (payment: Omit<DriverPayment, 'id'>) => setDriverPayments(prev => [...prev, { ...payment, id: Date.now().toString() }]);
  const updateDriverPayment = (id: string, data: Partial<DriverPayment>) => setDriverPayments(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  
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
  const deleteExchange = (id: string) => setExchanges(prev => prev.filter(e => e.id !== id));
  const updateExchangeRates = (rates: ExchangeRates) => setExchangeRates(rates);

  const getDriverName = (id: string) => drivers.find(d => d.id === id)?.fullName || 'نامشخص';
  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name || 'نامشخص';
  const getReceiverName = (id: string) => receivers.find(r => r.id === id)?.name || 'نامشخص';

  const getDriverBalance = (id: string) => {
    const paid = driverPayments.filter(p => p.driverId === id).reduce((sum, p) => sum + p.amount, 0);
    const freight = freights.filter(f => f.driverId === id).reduce((sum, f) => sum + f.amount, 0);
    const transFreight = transactions.filter(t => t.driverId === id).reduce((sum, t) => sum + (t.freightPrice || 0), 0);
    return (freight + transFreight) - paid;
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
    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalFreights = freights.reduce((acc, f) => acc + f.amount, 0) + transactions.reduce((acc, t) => acc + (t.freightPrice || 0), 0);
    return { totalIncome, totalCost, totalExpense, totalFreights, netProfit: totalIncome - totalCost - totalExpense - totalFreights };
  };

  const getAllData = () => ({ drivers, transactions, driverPayments, freights, queue, companies, receivers, purchases, partners, partnerPayments, expenses, exchangeTransactions, exchanges, exchangeRates, backupDate: new Date().toISOString(), version: '2.5.0' });

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
        if (data.exchangeRates) setExchangeRates(data.exchangeRates);
    } catch (e) {
        console.error("Import error:", e);
        alert("خطا در بازگردانی داده‌ها");
    }
  };

  return (
    <DataContext.Provider value={{ 
      drivers, transactions, driverPayments, freights, queue, companies, receivers, purchases, partners, partnerPayments, expenses, exchangeTransactions, exchanges, exchangeRates,
      addDriver, updateDriver, deleteDriver, addTransaction, updateTransaction, addDriverPayment, updateDriverPayment, addFreight, updateFreight, addToQueue, updateQueueStatus, 
      addCompany, addReceiver, addPurchase, updatePurchase, addPartner, addPartnerPayment, addExpense, updateExpense, addExchangeTransaction, updateExchangeTransaction, deleteExchangeTransaction, addExchange, deleteExchange, updateExchangeRates,
      getDriverName, getCompanyName, getReceiverName, getDriverBalance, getCompanyStats, getReceiverStats, getSystemFinancials,
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
