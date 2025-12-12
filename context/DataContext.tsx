
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Driver, Transaction, QueueItem, Company, Purchase, Partner, QueueStatus, Expense, DriverPayment, PartnerPayment, ExchangeRates, Freight } from '../types';

interface DataContextType {
  drivers: Driver[];
  transactions: Transaction[];
  driverPayments: DriverPayment[];
  freights: Freight[];
  queue: QueueItem[];
  companies: Company[];
  purchases: Purchase[];
  partners: Partner[];
  partnerPayments: PartnerPayment[];
  expenses: Expense[];
  exchangeRates: ExchangeRates;
  
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, updatedDriver: Partial<Driver>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void; // Added
  addDriverPayment: (payment: Omit<DriverPayment, 'id'>) => void;
  updateDriverPayment: (id: string, data: Partial<DriverPayment>) => void; // Added
  addFreight: (freight: Omit<Freight, 'id'>) => void;
  updateFreight: (id: string, data: Partial<Freight>) => void; // Added
  addToQueue: (item: Omit<QueueItem, 'id' | 'status'>) => void;
  updateQueueStatus: (id: string, status: QueueStatus) => void;
  addCompany: (company: Omit<Company, 'id'>) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  updatePurchase: (id: string, data: Partial<Purchase>) => void; // Added
  addPartner: (partner: Omit<Partner, 'id'>) => void;
  addPartnerPayment: (payment: Omit<PartnerPayment, 'id'>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void; // Added
  updateExchangeRates: (rates: ExchangeRates) => void;
  
  getDriverName: (id: string) => string;
  getCompanyName: (id: string) => string;
  getDriverBalance: (id: string) => number;
  getCompanyStats: (id: string) => { totalVolume: number; totalPaid: number };
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
  PURCHASES: 'gas_app_purchases',
  PARTNERS: 'gas_app_partners',
  PARTNER_PAYMENTS: 'gas_app_partner_payments',
  EXPENSES: 'gas_app_expenses',
  RATES: 'gas_app_rates',
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [driverPayments, setDriverPayments] = useState<DriverPayment[]>([]);
  const [freights, setFreights] = useState<Freight[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerPayments, setPartnerPayments] = useState<PartnerPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ usd: 60000, aed: 16000 });

  // Load initial data
  useEffect(() => {
    const loadedDrivers = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    const loadedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const loadedDriverPayments = localStorage.getItem(STORAGE_KEYS.DRIVER_PAYMENTS);
    const loadedFreights = localStorage.getItem(STORAGE_KEYS.FREIGHTS);
    const loadedQueue = localStorage.getItem(STORAGE_KEYS.QUEUE);
    const loadedCompanies = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    const loadedPurchases = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    const loadedPartners = localStorage.getItem(STORAGE_KEYS.PARTNERS);
    const loadedPartnerPayments = localStorage.getItem(STORAGE_KEYS.PARTNER_PAYMENTS);
    const loadedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const loadedRates = localStorage.getItem(STORAGE_KEYS.RATES);

    if (loadedDrivers) setDrivers(JSON.parse(loadedDrivers));
    else {
      const seedDrivers: Driver[] = [
        { id: '1', fullName: 'علی رضایی', nationalId: '1234567890', licenseNo: '98765', phone: '09123456789', plateNumber: '۱۲الف۳۴۵-۶۷', tankNumber: 'T-100' },
        { id: '2', fullName: 'محمد کریمی', nationalId: '0987654321', licenseNo: '54321', phone: '09198765432', plateNumber: '۹۹ب۱۱۱-۲۲', tankNumber: 'T-102' },
      ];
      setDrivers(seedDrivers);
      localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(seedDrivers));
    }
    
    if (loadedTransactions) setTransactions(JSON.parse(loadedTransactions));
    if (loadedDriverPayments) setDriverPayments(JSON.parse(loadedDriverPayments));
    if (loadedFreights) setFreights(JSON.parse(loadedFreights));
    if (loadedQueue) setQueue(JSON.parse(loadedQueue));
    if (loadedCompanies) setCompanies(JSON.parse(loadedCompanies));
    if (loadedPurchases) setPurchases(JSON.parse(loadedPurchases));
    if (loadedPartners) setPartners(JSON.parse(loadedPartners));
    if (loadedPartnerPayments) setPartnerPayments(JSON.parse(loadedPartnerPayments));
    if (loadedExpenses) setExpenses(JSON.parse(loadedExpenses));
    if (loadedRates) setExchangeRates(JSON.parse(loadedRates));
  }, []);

  // Persist data
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers)); }, [drivers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DRIVER_PAYMENTS, JSON.stringify(driverPayments)); }, [driverPayments]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FREIGHTS, JSON.stringify(freights)); }, [freights]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue)); }, [queue]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PARTNERS, JSON.stringify(partners)); }, [partners]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PARTNER_PAYMENTS, JSON.stringify(partnerPayments)); }, [partnerPayments]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(exchangeRates)); }, [exchangeRates]);

  const addDriver = (driver: Omit<Driver, 'id'>) => {
    const newDriver = { ...driver, id: Date.now().toString() };
    setDrivers(prev => [...prev, newDriver]);
  };

  const updateDriver = (id: string, updatedDriver: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updatedDriver } : d));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...transaction, id: Date.now().toString() };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const updateTransaction = (id: string, data: Partial<Transaction>) => {
    setTransactions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };

  const addDriverPayment = (payment: Omit<DriverPayment, 'id'>) => {
    const newPayment = { ...payment, id: Date.now().toString() };
    setDriverPayments(prev => [...prev, newPayment]);
  };

  const updateDriverPayment = (id: string, data: Partial<DriverPayment>) => {
    setDriverPayments(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };

  const addFreight = (freight: Omit<Freight, 'id'>) => {
    const newFreight = { ...freight, id: Date.now().toString() };
    setFreights(prev => [...prev, newFreight]);
  };

  const updateFreight = (id: string, data: Partial<Freight>) => {
    setFreights(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };

  const addToQueue = (item: Omit<QueueItem, 'id' | 'status'>) => {
    const newItem: QueueItem = { ...item, id: Date.now().toString(), status: 'WAIT' };
    setQueue(prev => [...prev, newItem]);
  };

  const updateQueueStatus = (id: string, status: QueueStatus) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const addCompany = (company: Omit<Company, 'id'>) => {
    const newCompany = { ...company, id: Date.now().toString() };
    setCompanies(prev => [...prev, newCompany]);
  };

  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const newPurchase = { ...purchase, id: Date.now().toString() };
    setPurchases(prev => [...prev, newPurchase]);
  };

  const updatePurchase = (id: string, data: Partial<Purchase>) => {
    setPurchases(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };

  const addPartner = (partner: Omit<Partner, 'id'>) => {
    const newPartner = { ...partner, id: Date.now().toString() };
    setPartners(prev => [...prev, newPartner]);
  };

  const addPartnerPayment = (payment: Omit<PartnerPayment, 'id'>) => {
    const newPayment = { ...payment, id: Date.now().toString() };
    setPartnerPayments(prev => [...prev, newPayment]);
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    setExpenses(prev => [...prev, newExpense]);
  };

  const updateExpense = (id: string, data: Partial<Expense>) => {
    setExpenses(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  };
  
  const updateExchangeRates = (rates: ExchangeRates) => {
      setExchangeRates(rates);
  };

  const getDriverName = (id: string) => {
    return drivers.find(d => d.id === id)?.fullName || 'نامشخص';
  };

  const getCompanyName = (id: string) => {
    return companies.find(c => c.id === id)?.name || 'نامشخص';
  };

  // Calculate Driver Balance
  // UPDATED LOGIC:
  // Balance = Total Freights (Earned) + Total Transactions (Gas Loads/Cost) - Total Payments (Received by driver)
  // Transactions (Gas Sales) are now considered as credit/earnings for the driver (Load Cost).
  const getDriverBalance = (id: string) => {
    const totalPaidToDriver = driverPayments
      .filter(p => p.driverId === id)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalFreightEarnings = freights
      .filter(f => f.driverId === id)
      .reduce((sum, f) => sum + f.amount, 0);
      
    const totalTransactionEarnings = transactions
      .filter(t => t.driverId === id)
      .reduce((sum, t) => sum + t.totalPrice, 0);

    return (totalFreightEarnings + totalTransactionEarnings) - totalPaidToDriver;
  };

  // Calculate Total Volume and Money for a Company
  const getCompanyStats = (id: string) => {
      const companyPurchases = purchases.filter(p => p.companyId === id);
      const totalVolume = companyPurchases.reduce((acc, p) => acc + p.volume, 0);
      const totalPaid = companyPurchases.reduce((acc, p) => acc + p.totalPrice, 0);
      return { totalVolume, totalPaid };
  };

  const getSystemFinancials = () => {
    const totalIncome = transactions.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const totalCost = purchases.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = totalIncome - totalCost - totalExpense;
    return { totalIncome, totalCost, totalExpense, netProfit };
  };

  const getAllData = () => {
    return {
      drivers,
      transactions,
      driverPayments,
      freights,
      queue,
      companies,
      purchases,
      partners,
      partnerPayments,
      expenses,
      exchangeRates,
      backupDate: new Date().toISOString(),
      version: '2.2.0'
    };
  };

  const importData = (data: any) => {
    if (data.drivers) setDrivers(data.drivers);
    if (data.transactions) setTransactions(data.transactions);
    if (data.driverPayments) setDriverPayments(data.driverPayments);
    if (data.freights) setFreights(data.freights);
    if (data.queue) setQueue(data.queue);
    if (data.companies) setCompanies(data.companies);
    if (data.purchases) setPurchases(data.purchases);
    if (data.partners) setPartners(data.partners);
    if (data.partnerPayments) setPartnerPayments(data.partnerPayments);
    if (data.expenses) setExpenses(data.expenses);
    if (data.exchangeRates) setExchangeRates(data.exchangeRates);
  };

  return (
    <DataContext.Provider value={{ 
      drivers, transactions, driverPayments, freights, queue, companies, purchases, partners, partnerPayments, expenses, exchangeRates,
      addDriver, updateDriver, addTransaction, updateTransaction, addDriverPayment, updateDriverPayment, addFreight, updateFreight, addToQueue, updateQueueStatus, 
      addCompany, addPurchase, updatePurchase, addPartner, addPartnerPayment, addExpense, updateExpense, updateExchangeRates,
      getDriverName, getCompanyName, getDriverBalance, getCompanyStats, getSystemFinancials,
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
