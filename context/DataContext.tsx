
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { 
  Driver, Transaction, QueueItem, Company, Purchase, Partner, QueueStatus, 
  Expense, DriverPayment, PartnerPayment, ExchangeRates, Freight, Receiver, 
  ExchangeTransaction, Exchange, Sender, DriverSettlement,
  FiscalYear, FiscalYearClosingSummary, ResetSystemOptions,
  DriverVehicleExpense, TankerOwner, TankerUnit, TankerOwnerLedgerEntry, TankerTransferRecord,
  TruckOwner, OwnedTruckUnit, TruckOwnerLedgerEntry
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
  tankerOwners: TankerOwner[];
  tankerUnits: TankerUnit[];
  tankerLedgerEntries: TankerOwnerLedgerEntry[];
  truckOwners: TruckOwner[];
  ownedTruckUnits: OwnedTruckUnit[];
  truckOwnerLedgerEntries: TruckOwnerLedgerEntry[];
  fiscalYears: FiscalYear[];
  activeFiscalYearId: string | null;
  activeFiscalYear: FiscalYear | null;
  
  addDriver: (driver: Omit<Driver, 'id'>) => string;
  updateDriver: (id: string, updatedDriver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, data: Partial<Transaction>) => void; 
  deleteTransaction: (id: string) => void;
  addDriverPayment: (payment: Omit<DriverPayment, 'id'>) => void;
  updateDriverPayment: (id: string, data: Partial<DriverPayment>) => void; 
  deleteDriverPayment: (id: string) => void;
  addFreight: (freight: Omit<Freight, 'id'>) => void;
  updateFreight: (id: string, data: Partial<Freight>) => void; 
  addToQueue: (item: Omit<QueueItem, 'id' | 'status'>) => void;
  updateQueueStatus: (id: string, status: QueueStatus) => void;
  addCompany: (company: Omit<Company, 'id'>) => string;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  addReceiver: (receiver: Omit<Receiver, 'id'>) => string;
  updateReceiver: (id: string, data: Partial<Receiver>) => void;
  deleteReceiver: (id: string) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => string;
  updatePurchase: (id: string, data: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void; 
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

  addTankerOwner: (owner: Omit<TankerOwner, 'id' | 'createdAt'>) => string;
  updateTankerOwner: (id: string, data: Partial<TankerOwner>) => void;
  deleteTankerOwner: (id: string) => void;
  addTankerUnit: (unit: Omit<TankerUnit, 'id' | 'createdAt'>) => string;
  updateTankerUnit: (id: string, data: Partial<TankerUnit>) => void;
  deleteTankerUnit: (id: string) => void;
  transferOrSwapTanker: (params: {
    tankerId: string;
    targetDriverId?: string;
    mode: 'TRANSFER_REPLACE' | 'SWAP_TANKERS' | 'UNMOUNT_TO_STANDBY' | 'UNMOUNT_TO_MAINTENANCE';
    date: string;
    note?: string;
  }) => void;
  addTankerLedgerEntry: (entry: Omit<TankerOwnerLedgerEntry, 'id' | 'createdAt'>) => string;
  updateTankerLedgerEntry: (id: string, data: Partial<TankerOwnerLedgerEntry>) => void;
  deleteTankerLedgerEntry: (id: string) => void;

  addTruckOwner: (owner: Omit<TruckOwner, 'id' | 'createdAt'>) => string;
  updateTruckOwner: (id: string, data: Partial<TruckOwner>) => void;
  deleteTruckOwner: (id: string) => void;
  addOwnedTruckUnit: (unit: Omit<OwnedTruckUnit, 'id' | 'createdAt'>) => string;
  updateOwnedTruckUnit: (id: string, data: Partial<OwnedTruckUnit>) => void;
  deleteOwnedTruckUnit: (id: string) => void;
  addTruckOwnerLedgerEntry: (entry: Omit<TruckOwnerLedgerEntry, 'id' | 'createdAt'>) => string;
  updateTruckOwnerLedgerEntry: (id: string, data: Partial<TruckOwnerLedgerEntry>) => void;
  deleteTruckOwnerLedgerEntry: (id: string) => void;
  
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
  TANKER_OWNERS: 'gas_app_tanker_owners',
  TANKER_UNITS: 'gas_app_tanker_units',
  TANKER_LEDGER_ENTRIES: 'gas_app_tanker_ledger_entries',
  TRUCK_OWNERS: 'gas_app_truck_owners',
  OWNED_TRUCK_UNITS: 'gas_app_owned_truck_units',
  TRUCK_OWNER_LEDGER_ENTRIES: 'gas_app_truck_owner_ledger_entries',
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
  const [tankerOwners, setTankerOwners] = useState<TankerOwner[]>(() => getStored(STORAGE_KEYS.TANKER_OWNERS, []));
  const [tankerUnits, setTankerUnits] = useState<TankerUnit[]>(() => getStored(STORAGE_KEYS.TANKER_UNITS, []));
  const [tankerLedgerEntries, setTankerLedgerEntries] = useState<TankerOwnerLedgerEntry[]>(() => getStored(STORAGE_KEYS.TANKER_LEDGER_ENTRIES, []));
  const [truckOwners, setTruckOwners] = useState<TruckOwner[]>(() => getStored(STORAGE_KEYS.TRUCK_OWNERS, []));
  const [ownedTruckUnits, setOwnedTruckUnits] = useState<OwnedTruckUnit[]>(() => getStored(STORAGE_KEYS.OWNED_TRUCK_UNITS, []));
  const [truckOwnerLedgerEntries, setTruckOwnerLedgerEntries] = useState<TruckOwnerLedgerEntry[]>(() => getStored(STORAGE_KEYS.TRUCK_OWNER_LEDGER_ENTRIES, []));

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
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.TANKER_OWNERS, tankerOwners), 300); return () => clearTimeout(t); }, [tankerOwners, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.TANKER_UNITS, tankerUnits), 300); return () => clearTimeout(t); }, [tankerUnits, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.TANKER_LEDGER_ENTRIES, tankerLedgerEntries), 300); return () => clearTimeout(t); }, [tankerLedgerEntries, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.TRUCK_OWNERS, truckOwners), 300); return () => clearTimeout(t); }, [truckOwners, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.OWNED_TRUCK_UNITS, ownedTruckUnits), 300); return () => clearTimeout(t); }, [ownedTruckUnits, saveToStorage]);
  useEffect(() => { const t = setTimeout(() => saveToStorage(STORAGE_KEYS.TRUCK_OWNER_LEDGER_ENTRIES, truckOwnerLedgerEntries), 300); return () => clearTimeout(t); }, [truckOwnerLedgerEntries, saveToStorage]);

  const addDriver = (driver: Omit<Driver, 'id'>) => {
    const id = Date.now().toString();
    setDrivers(prev => [...prev, { ...driver, id }]);
    return id;
  };
  const updateDriver = (id: string, updatedDriver: Partial<Driver>) => setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updatedDriver } : d));
  const deleteDriver = (id: string) => setDrivers(prev => prev.filter(d => d.id !== id));
  
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const id = Date.now().toString();
    setTransactions(prev => [...prev, { ...transaction, id }]);
    return id;
  };
  const updateTransaction = (id: string, data: Partial<Transaction>) => setTransactions(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addDriverPayment = (payment: Omit<DriverPayment, 'id'>) => setDriverPayments(prev => [...prev, { ...payment, id: Date.now().toString() }]);
  const updateDriverPayment = (id: string, data: Partial<DriverPayment>) => setDriverPayments(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  const deleteDriverPayment = (id: string) => setDriverPayments(prev => prev.filter(item => item.id !== id));
  
  const addFreight = (freight: Omit<Freight, 'id'>) => setFreights(prev => [...prev, { ...freight, id: Date.now().toString() }]);
  const updateFreight = (id: string, data: Partial<Freight>) => setFreights(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  
  const addToQueue = (item: Omit<QueueItem, 'id' | 'status'>) => setQueue(prev => [...prev, { ...item, id: Date.now().toString(), status: 'WAIT' }]);
  const updateQueueStatus = (id: string, status: QueueStatus) => setQueue(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  
  const addCompany = (company: Omit<Company, 'id'>) => {
    const id = Date.now().toString();
    setCompanies(prev => [...prev, { ...company, id }]);
    return id;
  };
  const updateCompany = (id: string, data: Partial<Company>) => setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteCompany = (id: string) => setCompanies(prev => prev.filter(c => c.id !== id));

  const addReceiver = (receiver: Omit<Receiver, 'id'>) => {
    const id = Date.now().toString();
    setReceivers(prev => [...prev, { ...receiver, id }]);
    return id;
  };
  const updateReceiver = (id: string, data: Partial<Receiver>) => setReceivers(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  const deleteReceiver = (id: string) => setReceivers(prev => prev.filter(r => r.id !== id));
  
  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const id = Date.now().toString();
    setPurchases(prev => [...prev, { ...purchase, id }]);
    return id;
  };
  const updatePurchase = (id: string, data: Partial<Purchase>) => setPurchases(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
  const deletePurchase = (id: string) => setPurchases(prev => prev.filter(item => item.id !== id));
  
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

  const addTankerOwner = (owner: Omit<TankerOwner, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newOwner: TankerOwner = { ...owner, id, createdAt: new Date().toISOString() };
    setTankerOwners(prev => [newOwner, ...prev]);
    return id;
  };

  const updateTankerOwner = (id: string, data: Partial<TankerOwner>) => {
    setTankerOwners(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    if (data.fullName) {
      setTankerUnits(prev => prev.map(u => u.ownerId === id ? { ...u, ownerName: data.fullName! } : u));
      setDrivers(prev => prev.map(d => d.tankOwnerId === id ? { ...d, tankOwnerName: data.fullName! } : d));
    }
  };

  const deleteTankerOwner = (id: string) => {
    setTankerOwners(prev => prev.filter(o => o.id !== id));
    setTankerUnits(prev => prev.filter(u => u.ownerId !== id));
    setTankerLedgerEntries(prev => prev.filter(e => e.ownerId !== id));
    setDrivers(prev => prev.map(d => d.tankOwnerId === id ? { ...d, tankOwnerId: undefined, tankOwnerName: undefined, mountedTankerId: undefined } : d));
  };

  const addTankerUnit = (unit: Omit<TankerUnit, 'id' | 'createdAt'>) => {
    const id = (Date.now() + Math.floor(Math.random() * 1000)).toString();
    const initialHistory: TankerTransferRecord[] = unit.mountHistory ? [...unit.mountHistory] : [];
    if (unit.status === 'MOUNTED' && (unit.assignedDriverId || unit.assignedTruckPlate)) {
      initialHistory.unshift({
        id: 'hist-' + Date.now(),
        date: unit.mountedDate || new Date().toLocaleDateString('fa-IR'),
        actionType: 'MOUNT',
        toDriverId: unit.assignedDriverId,
        toDriverName: unit.assignedDriverName,
        toTruckPlate: unit.assignedTruckPlate,
        note: 'ثبت اولیه و بستن تانکر روی کامیون'
      });
    }
    const newUnit: TankerUnit = {
      ...unit,
      id,
      mountHistory: initialHistory,
      createdAt: new Date().toISOString()
    };

    setTankerUnits(prev => {
      // اگر کامیون مقصد قبلاً تانکر دیگری رویش بسته بوده، آن تانکر قبلی را به حالت آزاد (STANDBY) درآوریم
      const cleaned = prev.map(u => {
        if (unit.status === 'MOUNTED' && unit.assignedDriverId && u.assignedDriverId === unit.assignedDriverId && u.status === 'MOUNTED') {
          return {
            ...u,
            status: 'STANDBY' as const,
            assignedDriverId: undefined,
            assignedDriverName: undefined,
            assignedTruckPlate: undefined,
            unmountedDate: unit.mountedDate || new Date().toLocaleDateString('fa-IR')
          };
        }
        return u;
      });
      return [newUnit, ...cleaned];
    });

    if (unit.status === 'MOUNTED' && unit.assignedDriverId) {
      const isCompany = unit.ownershipType === 'COMPANY_OWNED' || unit.isCompanyOwned || unit.ownerId === 'COMPANY';
      setDrivers(prev => prev.map(d => d.id === unit.assignedDriverId ? {
        ...d,
        tankNumber: unit.tankNumber || d.tankNumber,
        tankerCode: unit.tankerCode || d.tankerCode,
        isCompanyTanker: isCompany,
        mountedTankerId: id,
        tankOwnerId: isCompany ? 'COMPANY' : unit.ownerId,
        tankOwnerName: isCompany ? 'شرکت (تانکر ملکی)' : unit.ownerName
      } : d));
    }
    return id;
  };

  const updateTankerUnit = (id: string, data: Partial<TankerUnit>) => {
    const existing = tankerUnits.find(u => u.id === id);
    const updated = existing ? { ...existing, ...data } : null;
    setTankerUnits(prev => prev.map(u => {
      if (u.id === id) return { ...u, ...data };
      if (updated && updated.status === 'MOUNTED' && updated.assignedDriverId && u.assignedDriverId === updated.assignedDriverId && u.status === 'MOUNTED') {
        return {
          ...u,
          status: 'STANDBY' as const,
          assignedDriverId: undefined,
          assignedDriverName: undefined,
          assignedTruckPlate: undefined,
          unmountedDate: updated.mountedDate || new Date().toLocaleDateString('fa-IR')
        };
      }
      return u;
    }));

    if (updated) {
      const isCompany = updated.ownershipType === 'COMPANY_OWNED' || updated.isCompanyOwned || updated.ownerId === 'COMPANY';
      setDrivers(prev => prev.map(d => {
        if (updated.status === 'MOUNTED' && updated.assignedDriverId === d.id) {
          return {
            ...d,
            tankNumber: updated.tankNumber || d.tankNumber,
            tankerCode: updated.tankerCode || d.tankerCode,
            isCompanyTanker: isCompany,
            mountedTankerId: updated.id,
            tankOwnerId: isCompany ? 'COMPANY' : updated.ownerId,
            tankOwnerName: isCompany ? 'شرکت (تانکر ملکی)' : updated.ownerName
          };
        }
        if (d.mountedTankerId === id && (updated.status !== 'MOUNTED' || updated.assignedDriverId !== d.id)) {
          return {
            ...d,
            mountedTankerId: undefined,
            tankerCode: undefined,
            isCompanyTanker: undefined,
            tankOwnerId: undefined,
            tankOwnerName: undefined
          };
        }
        return d;
      }));
    }
  };

  const transferOrSwapTanker = (params: {
    tankerId: string;
    targetDriverId?: string;
    mode: 'TRANSFER_REPLACE' | 'SWAP_TANKERS' | 'UNMOUNT_TO_STANDBY' | 'UNMOUNT_TO_MAINTENANCE';
    date: string;
    note?: string;
  }) => {
    const { tankerId, targetDriverId, mode, date, note } = params;
    const sourceTanker = tankerUnits.find(u => u.id === tankerId);
    if (!sourceTanker) return;

    const sourceDriver = sourceTanker.assignedDriverId
      ? drivers.find(d => d.id === sourceTanker.assignedDriverId)
      : undefined;

    // حالت ۱: فک تانکر از کامیون و انتقال به پارکینگ یا تعمیرگاه
    if (mode === 'UNMOUNT_TO_STANDBY' || mode === 'UNMOUNT_TO_MAINTENANCE') {
      const newStatus = mode === 'UNMOUNT_TO_MAINTENANCE' ? 'MAINTENANCE' : 'STANDBY';
      const record: TankerTransferRecord = {
        id: 'tr-' + Date.now(),
        date,
        actionType: 'UNMOUNT',
        fromDriverId: sourceDriver?.id || sourceTanker.assignedDriverId,
        fromDriverName: sourceDriver?.fullName || sourceTanker.assignedDriverName,
        fromTruckPlate: sourceDriver?.plateNumber || sourceTanker.assignedTruckPlate,
        note: note || (newStatus === 'MAINTENANCE' ? 'باز شدن از کامیون و انتقال به تعمیرگاه / تست مخزن' : 'باز شدن از کامیون و انتقال به پارکینگ (آزاد)')
      };

      setTankerUnits(prev => prev.map(u => u.id === tankerId ? {
        ...u,
        status: newStatus,
        assignedDriverId: undefined,
        assignedDriverName: undefined,
        assignedTruckPlate: undefined,
        unmountedDate: date,
        mountHistory: [record, ...(u.mountHistory || [])]
      } : u));

      if (sourceTanker.assignedDriverId) {
        setDrivers(prev => prev.map(d => d.id === sourceTanker.assignedDriverId ? {
          ...d,
          mountedTankerId: undefined,
          tankerCode: undefined,
          tankNumber: '',
          isCompanyTanker: undefined,
          tankOwnerId: undefined,
          tankOwnerName: undefined
        } : d));
      }
      return;
    }

    // حالت ۲ و ۳: انتقال یا جابه‌جایی ضربدری (Swap) به کامیون مقصد
    const targetDriver = targetDriverId ? drivers.find(d => d.id === targetDriverId) : undefined;
    if (!targetDriver) return;

    const targetTanker = tankerUnits.find(
      u => u.id !== tankerId && u.status === 'MOUNTED' && u.assignedDriverId === targetDriver.id
    );

    if (mode === 'SWAP_TANKERS' && targetTanker && sourceDriver) {
      // جابه‌جایی دوطرفه (تعویض ضربدری دو تانکر بین دو کامیون)
      const recordForSource: TankerTransferRecord = {
        id: 'tr-1-' + Date.now(),
        date,
        actionType: 'SWAP',
        fromDriverId: sourceDriver.id,
        fromDriverName: sourceDriver.fullName,
        fromTruckPlate: sourceDriver.plateNumber,
        toDriverId: targetDriver.id,
        toDriverName: targetDriver.fullName,
        toTruckPlate: targetDriver.plateNumber,
        swappedWithTankerId: targetTanker.id,
        swappedWithTankerCode: targetTanker.tankerCode,
        swappedWithTankNumber: targetTanker.tankNumber,
        note: note || `تعویض ضربدری با تانکر ${targetTanker.tankerCode ? `[${targetTanker.tankerCode}] ` : ''}${targetTanker.tankNumber}`
      };

      const recordForTarget: TankerTransferRecord = {
        id: 'tr-2-' + Date.now(),
        date,
        actionType: 'SWAP',
        fromDriverId: targetDriver.id,
        fromDriverName: targetDriver.fullName,
        fromTruckPlate: targetDriver.plateNumber,
        toDriverId: sourceDriver.id,
        toDriverName: sourceDriver.fullName,
        toTruckPlate: sourceDriver.plateNumber,
        swappedWithTankerId: sourceTanker.id,
        swappedWithTankerCode: sourceTanker.tankerCode,
        swappedWithTankNumber: sourceTanker.tankNumber,
        note: note || `تعویض ضربدری با تانکر ${sourceTanker.tankerCode ? `[${sourceTanker.tankerCode}] ` : ''}${sourceTanker.tankNumber}`
      };

      setTankerUnits(prev => prev.map(u => {
        if (u.id === sourceTanker.id) {
          return {
            ...u,
            status: 'MOUNTED',
            assignedDriverId: targetDriver.id,
            assignedDriverName: targetDriver.fullName,
            assignedTruckPlate: targetDriver.plateNumber,
            mountedDate: date,
            mountHistory: [recordForSource, ...(u.mountHistory || [])]
          };
        }
        if (u.id === targetTanker.id) {
          return {
            ...u,
            status: 'MOUNTED',
            assignedDriverId: sourceDriver.id,
            assignedDriverName: sourceDriver.fullName,
            assignedTruckPlate: sourceDriver.plateNumber,
            mountedDate: date,
            mountHistory: [recordForTarget, ...(u.mountHistory || [])]
          };
        }
        return u;
      }));

      const isSourceCompany = sourceTanker.ownershipType === 'COMPANY_OWNED' || sourceTanker.isCompanyOwned || sourceTanker.ownerId === 'COMPANY';
      const isTargetCompany = targetTanker.ownershipType === 'COMPANY_OWNED' || targetTanker.isCompanyOwned || targetTanker.ownerId === 'COMPANY';

      setDrivers(prev => prev.map(d => {
        if (d.id === targetDriver.id) {
          return {
            ...d,
            mountedTankerId: sourceTanker.id,
            tankNumber: sourceTanker.tankNumber,
            tankerCode: sourceTanker.tankerCode,
            isCompanyTanker: isSourceCompany,
            tankOwnerId: isSourceCompany ? 'COMPANY' : sourceTanker.ownerId,
            tankOwnerName: isSourceCompany ? 'شرکت (تانکر ملکی)' : sourceTanker.ownerName
          };
        }
        if (d.id === sourceDriver.id) {
          return {
            ...d,
            mountedTankerId: targetTanker.id,
            tankNumber: targetTanker.tankNumber,
            tankerCode: targetTanker.tankerCode,
            isCompanyTanker: isTargetCompany,
            tankOwnerId: isTargetCompany ? 'COMPANY' : targetTanker.ownerId,
            tankOwnerName: isTargetCompany ? 'شرکت (تانکر ملکی)' : targetTanker.ownerName
          };
        }
        return d;
      }));
    } else {
      // انتقال تانکر به کامیون مقصد (و در صورت وجود تانکر قبلی روی کامیون مقصد، باز شدن آن به پارکینگ)
      const recordForSource: TankerTransferRecord = {
        id: 'tr-' + Date.now(),
        date,
        actionType: sourceDriver ? 'TRANSFER' : 'MOUNT',
        fromDriverId: sourceDriver?.id || sourceTanker.assignedDriverId,
        fromDriverName: sourceDriver?.fullName || sourceTanker.assignedDriverName,
        fromTruckPlate: sourceDriver?.plateNumber || sourceTanker.assignedTruckPlate,
        toDriverId: targetDriver.id,
        toDriverName: targetDriver.fullName,
        toTruckPlate: targetDriver.plateNumber,
        note: note || (sourceDriver ? `انتقال از کامیون ${sourceDriver.plateNumber} به کامیون ${targetDriver.plateNumber}` : `بستن تانکر روی کامیون ${targetDriver.plateNumber}`)
      };

      setTankerUnits(prev => prev.map(u => {
        if (u.id === sourceTanker.id) {
          return {
            ...u,
            status: 'MOUNTED',
            assignedDriverId: targetDriver.id,
            assignedDriverName: targetDriver.fullName,
            assignedTruckPlate: targetDriver.plateNumber,
            mountedDate: date,
            mountHistory: [recordForSource, ...(u.mountHistory || [])]
          };
        }
        if (targetTanker && u.id === targetTanker.id) {
          const unmountRec: TankerTransferRecord = {
            id: 'tr-unmount-' + Date.now(),
            date,
            actionType: 'UNMOUNT',
            fromDriverId: targetDriver.id,
            fromDriverName: targetDriver.fullName,
            fromTruckPlate: targetDriver.plateNumber,
            note: `باز شدن خودکار به دلیل بسته شدن تانکر ${sourceTanker.tankerCode || sourceTanker.tankNumber} روی این کامیون`
          };
          return {
            ...u,
            status: 'STANDBY',
            assignedDriverId: undefined,
            assignedDriverName: undefined,
            assignedTruckPlate: undefined,
            unmountedDate: date,
            mountHistory: [unmountRec, ...(u.mountHistory || [])]
          };
        }
        return u;
      }));

      const isSourceCompany = sourceTanker.ownershipType === 'COMPANY_OWNED' || sourceTanker.isCompanyOwned || sourceTanker.ownerId === 'COMPANY';

      setDrivers(prev => prev.map(d => {
        if (d.id === targetDriver.id) {
          return {
            ...d,
            mountedTankerId: sourceTanker.id,
            tankNumber: sourceTanker.tankNumber,
            tankerCode: sourceTanker.tankerCode,
            isCompanyTanker: isSourceCompany,
            tankOwnerId: isSourceCompany ? 'COMPANY' : sourceTanker.ownerId,
            tankOwnerName: isSourceCompany ? 'شرکت (تانکر ملکی)' : sourceTanker.ownerName
          };
        }
        if (sourceDriver && d.id === sourceDriver.id && sourceDriver.id !== targetDriver.id) {
          return {
            ...d,
            mountedTankerId: undefined,
            tankerCode: undefined,
            tankNumber: '',
            isCompanyTanker: undefined,
            tankOwnerId: undefined,
            tankOwnerName: undefined
          };
        }
        return d;
      }));
    }
  };

  const deleteTankerUnit = (id: string) => {
    setTankerUnits(prev => prev.filter(u => u.id !== id));
    setDrivers(prev => prev.map(d => d.mountedTankerId === id ? {
      ...d,
      mountedTankerId: undefined,
      tankerCode: undefined,
      isCompanyTanker: undefined,
      tankOwnerId: undefined,
      tankOwnerName: undefined
    } : d));
  };

  const addTankerLedgerEntry = (entry: Omit<TankerOwnerLedgerEntry, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newEntry: TankerOwnerLedgerEntry = { ...entry, id, createdAt: new Date().toISOString() };
    setTankerLedgerEntries(prev => [newEntry, ...prev]);
    return id;
  };

  const updateTankerLedgerEntry = (id: string, data: Partial<TankerOwnerLedgerEntry>) => {
    setTankerLedgerEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteTankerLedgerEntry = (id: string) => {
    setTankerLedgerEntries(prev => prev.filter(e => e.id !== id));
  };

  const addTruckOwner = (owner: Omit<TruckOwner, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newOwner: TruckOwner = { ...owner, id, createdAt: new Date().toISOString() };
    setTruckOwners(prev => [newOwner, ...prev]);
    return id;
  };

  const updateTruckOwner = (id: string, data: Partial<TruckOwner>) => {
    setTruckOwners(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
    if (data.fullName) {
      setOwnedTruckUnits(prev => prev.map(u => u.ownerId === id ? { ...u, ownerName: data.fullName! } : u));
      setDrivers(prev => prev.map(d => d.truckOwnerId === id ? { ...d, truckOwnerName: data.fullName! } : d));
    }
  };

  const deleteTruckOwner = (id: string) => {
    setTruckOwners(prev => prev.filter(o => o.id !== id));
    setOwnedTruckUnits(prev => prev.filter(u => u.ownerId !== id));
    setTruckOwnerLedgerEntries(prev => prev.filter(e => e.ownerId !== id));
    setDrivers(prev => prev.map(d => d.truckOwnerId === id ? {
      ...d,
      truckOwnerId: undefined,
      truckOwnerName: undefined,
      payFreightToTruckOwner: undefined,
      truckOwnerSharePercent: undefined
    } : d));
  };

  const addOwnedTruckUnit = (unit: Omit<OwnedTruckUnit, 'id' | 'createdAt'>) => {
    const id = (Date.now() + Math.floor(Math.random() * 1000)).toString();
    const newUnit: OwnedTruckUnit = { ...unit, id, createdAt: new Date().toISOString() };
    setOwnedTruckUnits(prev => [newUnit, ...prev]);

    const owner = truckOwners.find(o => o.id === unit.ownerId);
    if (unit.driverId) {
      setDrivers(prev => prev.map(d => {
        if (d.id === unit.driverId) {
          const bankSync = unit.syncBankInfoToDriver && owner ? {
            cardNumber: owner.cardNumber || d.cardNumber,
            shebaNumber: owner.shebaNumber || d.shebaNumber,
            bankName: owner.bankName || d.bankName,
            accountHolderName: owner.accountHolderName || owner.fullName,
            isAccountHolderDriver: false
          } : {};
          return {
            ...d,
            truckOwnerId: unit.ownerId,
            truckOwnerName: unit.ownerName,
            payFreightToTruckOwner: unit.depositFreightToOwnerAccount,
            truckOwnerSharePercent: unit.freightMode === 'FULL_TO_OWNER' ? 100 : (unit.ownerSharePercentage || 100),
            ...bankSync
          };
        }
        return d;
      }));
    }
    return id;
  };

  const updateOwnedTruckUnit = (id: string, data: Partial<OwnedTruckUnit>) => {
    const existing = ownedTruckUnits.find(u => u.id === id);
    const updated = existing ? { ...existing, ...data } : null;
    setOwnedTruckUnits(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));

    if (updated) {
      const owner = truckOwners.find(o => o.id === updated.ownerId);
      setDrivers(prev => prev.map(d => {
        if (updated.driverId && d.id === updated.driverId) {
          const bankSync = updated.syncBankInfoToDriver && owner ? {
            cardNumber: owner.cardNumber || d.cardNumber,
            shebaNumber: owner.shebaNumber || d.shebaNumber,
            bankName: owner.bankName || d.bankName,
            accountHolderName: owner.accountHolderName || owner.fullName,
            isAccountHolderDriver: false
          } : {};
          return {
            ...d,
            truckOwnerId: updated.ownerId,
            truckOwnerName: updated.ownerName,
            payFreightToTruckOwner: updated.depositFreightToOwnerAccount,
            truckOwnerSharePercent: updated.freightMode === 'FULL_TO_OWNER' ? 100 : (updated.ownerSharePercentage || 100),
            ...bankSync
          };
        }
        return d;
      }));
    }
  };

  const deleteOwnedTruckUnit = (id: string) => {
    const existing = ownedTruckUnits.find(u => u.id === id);
    setOwnedTruckUnits(prev => prev.filter(u => u.id !== id));
    if (existing?.driverId) {
      setDrivers(prev => prev.map(d => d.id === existing.driverId ? {
        ...d,
        truckOwnerId: undefined,
        truckOwnerName: undefined,
        payFreightToTruckOwner: undefined,
        truckOwnerSharePercent: undefined
      } : d));
    }
  };

  const addTruckOwnerLedgerEntry = (entry: Omit<TruckOwnerLedgerEntry, 'id' | 'createdAt'>) => {
    const id = Date.now().toString();
    const newEntry: TruckOwnerLedgerEntry = { ...entry, id, createdAt: new Date().toISOString() };
    setTruckOwnerLedgerEntries(prev => [newEntry, ...prev]);

    // اگر گزینه ثبت همزمان در پرداختی‌های کامیون/راننده فعال باشد تا از مانده بارنامه کامیون هم کسر شود
    if (entry.alsoRecordInDriverPayments && entry.driverId && (entry.entryType === 'FREIGHT_DEPOSIT_TO_OWNER' || entry.entryType === 'OWNER_WITHDRAWAL')) {
      const owner = truckOwners.find(o => o.id === entry.ownerId);
      const paymentDesc = entry.entryType === 'FREIGHT_DEPOSIT_TO_OWNER'
        ? `واریز کرایه به حساب صاحب کامیون (${owner?.fullName || ''}) - ${entry.description || ''}`
        : `برداشت توسط صاحب کامیون (${owner?.fullName || ''}) - ${entry.description || ''}`;
      addDriverPayment({
        driverId: entry.driverId,
        date: entry.date,
        amount: entry.amount,
        description: paymentDesc,
        isStandaloneDeposit: entry.entryType === 'OWNER_WITHDRAWAL',
        paymentCategory: entry.entryType === 'FREIGHT_DEPOSIT_TO_OWNER' ? 'WAYBILL' : 'ON_ACCOUNT',
        deductFromWaybillBalance: true,
        trackingCode: entry.trackingCode,
        cardNumber: entry.cardNumber || owner?.cardNumber,
        shebaNumber: entry.shebaNumber || owner?.shebaNumber,
        accountHolderName: owner?.accountHolderName || owner?.fullName,
        bankName: entry.bankName || owner?.bankName
      });
    }
    return id;
  };

  const updateTruckOwnerLedgerEntry = (id: string, data: Partial<TruckOwnerLedgerEntry>) => {
    setTruckOwnerLedgerEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteTruckOwnerLedgerEntry = (id: string) => {
    setTruckOwnerLedgerEntries(prev => prev.filter(e => e.id !== id));
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
      setTankerLedgerEntries([]);
      setTruckOwnerLedgerEntries([]);

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
      saveToStorage(STORAGE_KEYS.TANKER_LEDGER_ENTRIES, []);
      saveToStorage(STORAGE_KEYS.TRUCK_OWNER_LEDGER_ENTRIES, []);

      return {
        success: true,
        message: 'اسناد و تراکنش‌های عملیاتی با موفقیت پاکسازی شدند. اطلاعات پایه رانندگان، شرکت‌ها، شرکا، صاحبین کامیون و تانکر و صرافی‌ها حفظ گردید.',
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
      setTankerOwners([]);
      setTankerUnits([]);
      setTankerLedgerEntries([]);
      setTruckOwners([]);
      setOwnedTruckUnits([]);
      setTruckOwnerLedgerEntries([]);

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
    exchangeRates, driverSettlements, driverVehicleExpenses,
    tankerOwners, tankerUnits, tankerLedgerEntries,
    truckOwners, ownedTruckUnits, truckOwnerLedgerEntries,
    fiscalYears, activeFiscalYearId,
    backupDate: new Date().toISOString(), version: '3.0.0' 
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
        if (data.tankerOwners && Array.isArray(data.tankerOwners)) setTankerOwners(data.tankerOwners);
        if (data.tankerUnits && Array.isArray(data.tankerUnits)) setTankerUnits(data.tankerUnits);
        if (data.tankerLedgerEntries && Array.isArray(data.tankerLedgerEntries)) setTankerLedgerEntries(data.tankerLedgerEntries);
        if (data.truckOwners && Array.isArray(data.truckOwners)) setTruckOwners(data.truckOwners);
        if (data.ownedTruckUnits && Array.isArray(data.ownedTruckUnits)) setOwnedTruckUnits(data.ownedTruckUnits);
        if (data.truckOwnerLedgerEntries && Array.isArray(data.truckOwnerLedgerEntries)) setTruckOwnerLedgerEntries(data.truckOwnerLedgerEntries);
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
      tankerOwners, tankerUnits, tankerLedgerEntries,
      truckOwners, ownedTruckUnits, truckOwnerLedgerEntries,
      fiscalYears, activeFiscalYearId, activeFiscalYear,
      addDriver, updateDriver, deleteDriver, addTransaction, updateTransaction, deleteTransaction, addDriverPayment, updateDriverPayment, deleteDriverPayment, addFreight, updateFreight, addToQueue, updateQueueStatus, 
      addCompany, updateCompany, deleteCompany, addReceiver, updateReceiver, deleteReceiver, addPurchase, updatePurchase, deletePurchase, addPartner, addPartnerPayment, addExpense, updateExpense, addExchangeTransaction, updateExchangeTransaction, deleteExchangeTransaction, addExchange, updateExchange, deleteExchange, addSender, deleteSender, updateExchangeRates,
      addDriverSettlement, updateDriverSettlement, deleteDriverSettlement,
      addDriverVehicleExpense, updateDriverVehicleExpense, deleteDriverVehicleExpense, getDriverVehicleExpenses,
      addTankerOwner, updateTankerOwner, deleteTankerOwner,
      addTankerUnit, updateTankerUnit, deleteTankerUnit, transferOrSwapTanker,
      addTankerLedgerEntry, updateTankerLedgerEntry, deleteTankerLedgerEntry,
      addTruckOwner, updateTruckOwner, deleteTruckOwner,
      addOwnedTruckUnit, updateOwnedTruckUnit, deleteOwnedTruckUnit,
      addTruckOwnerLedgerEntry, updateTruckOwnerLedgerEntry, deleteTruckOwnerLedgerEntry,
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
