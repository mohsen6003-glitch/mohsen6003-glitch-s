import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  TankerOwner,
  TankerUnit,
  TankerOwnerLedgerEntry,
  TankerContractType,
  TankerMountStatus,
  TankerOwnershipType,
  TankerLedgerEntryType,
  DriverPreviousBalanceType,
  Tab
} from '../types';
import {
  Container,
  Truck,
  UserPlus,
  Plus,
  Search,
  Wallet,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Printer,
  Link2,
  Unlink,
  CreditCard,
  TrendingUp,
  FileText,
  X,
  ArrowLeftRight,
  Layers,
  History,
  Hash,
  Building2,
  Sparkles,
  RefreshCw,
  CheckSquare
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { formatNumberInput, cleanNumberInput, numberToPersianWords } from '../utils/numberUtils';

const CONTRACT_TYPE_LABELS: Record<TankerContractType, string> = {
  COMPANY_OWNED_NONE: 'ملکی شرکت خودمان (بدون کسر اجاره/حق تانکر)',
  PERCENTAGE_OF_FREIGHT: 'درصدی از کرایه هر سرویس کامیون',
  PER_TON: 'مبلغ مشخص به ازای هر تن بار',
  PER_TRIP: 'مبلغ مشخص به ازای هر سرویس (بارنامه)',
  FIXED_RENT: 'اجاره ثابت ماهانه / توافقی'
};

const MOUNT_STATUS_CONFIG: Record<
  TankerMountStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  MOUNTED: {
    label: 'بسته شده روی کامیون (فعال)',
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    dotClass: 'bg-emerald-500'
  },
  STANDBY: {
    label: 'آزاد / باز شده (در پارکینگ)',
    badgeClass:
      'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    dotClass: 'bg-amber-500'
  },
  MAINTENANCE: {
    label: 'در حال تعمیر / تست مخزن',
    badgeClass:
      'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    dotClass: 'bg-rose-500'
  }
};

const LEDGER_ENTRY_LABELS: Record<
  TankerLedgerEntryType,
  { label: string; badgeClass: string; isCreditForOwner: boolean }
> = {
  PAYMENT_TO_OWNER: {
    label: 'واریزی / پرداخت به صاحب تانکر',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    isCreditForOwner: false
  },
  MANUAL_EARNING: {
    label: 'ثبت حق تانکر / اجاره دوره‌ای (بستانکاری)',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    isCreditForOwner: true
  },
  TANKER_EXPENSE: {
    label: 'هزینه تعمیرات / لاستیک / تست تانکر (کسر از صاحب تانکر)',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    isCreditForOwner: false
  }
};

interface TankerOwnersManagerProps {
  onNavigate?: (tab: Tab) => void;
}

const TankerOwnersManager: React.FC<TankerOwnersManagerProps> = ({ onNavigate }) => {
  const {
    tankerOwners,
    tankerUnits,
    tankerLedgerEntries,
    drivers,
    transactions,
    freights,
    purchases,
    exchangeRates,
    addTankerOwner,
    updateTankerOwner,
    deleteTankerOwner,
    addTankerUnit,
    updateTankerUnit,
    deleteTankerUnit,
    transferOrSwapTanker,
    addTankerLedgerEntry,
    deleteTankerLedgerEntry
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<
    'company_fleet' | 'owners' | 'mounted_trucks' | 'ledger'
  >('company_fleet');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('ALL');
  const [filterOwnership, setFilterOwnership] = useState<'ALL' | 'COMPANY_OWNED' | 'EXTERNAL_OWNER'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | TankerMountStatus>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals State
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);

  const [showTankerModal, setShowTankerModal] = useState(false);
  const [editingTankerId, setEditingTankerId] = useState<string | null>(null);

  // Swap / Transfer Tanker Between Trucks Modal
  const [swapModalTankerId, setSwapModalTankerId] = useState<string | null>(null);
  const [swapTargetDriverId, setSwapTargetDriverId] = useState<string>('');
  const [swapActionMode, setSwapActionMode] = useState<
    'TRANSFER_OR_SWAP' | 'UNMOUNT_TO_STANDBY' | 'UNMOUNT_TO_MAINTENANCE'
  >('TRANSFER_OR_SWAP');
  const [swapConflictResolution, setSwapConflictResolution] = useState<
    'SWAP_TANKERS' | 'TRANSFER_REPLACE'
  >('SWAP_TANKERS');
  const [swapNote, setSwapNote] = useState<string>('');
  const [swapDateObj, setSwapDateObj] = useState<DateObject | null>(
    new DateObject({ calendar: persian, locale: persian_fa })
  );

  // History Modal for a Tanker
  const [historyModalTankerId, setHistoryModalTankerId] = useState<string | null>(null);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [statementOwnerId, setStatementOwnerId] = useState<string | null>(null);

  // Owner Form State
  const [ownerForm, setOwnerForm] = useState({
    fullName: '',
    nationalId: '',
    phone: '',
    cardNumber: '',
    shebaNumber: '',
    bankName: '',
    accountHolderName: '',
    previousBalanceType: 'NONE' as DriverPreviousBalanceType,
    previousBalanceAmount: '',
    previousBalanceDescription: '',
    description: ''
  });

  // Helper to generate next unique tanker code (e.g. T-101, T-102...)
  const generateNextTankerCode = (existingCountOffset = 0) => {
    const existingCodes = new Set(
      tankerUnits.map((u) => (u.tankerCode || '').toUpperCase().trim()).filter(Boolean)
    );
    let num = 101 + tankerUnits.length + existingCountOffset;
    while (existingCodes.has(`T-${num}`)) {
      num++;
    }
    return `T-${num}`;
  };

  // Tanker Unit Form State
  const [tankerForm, setTankerForm] = useState({
    ownershipType: 'COMPANY_OWNED' as TankerOwnershipType,
    ownerId: 'COMPANY',
    tankerCode: '',
    tankNumber: '',
    serialOrChassis: '',
    capacityTons: '24',
    tankType: '۴ محور صادراتی LPG',
    status: 'MOUNTED' as TankerMountStatus,
    assignedDriverId: '',
    assignedDriverName: '',
    assignedTruckPlate: '',
    contractType: 'COMPANY_OWNED_NONE' as TankerContractType,
    sharePercentage: '25',
    ratePerTon: '',
    ratePerTrip: '',
    fixedMonthlyRent: '',
    rateCurrency: 'TOMAN' as 'TOMAN' | 'USD' | 'AED',
    autoCalculateFromTruckLoads: true,
    deductFromDriverFreight: false,
    hydroTestExpiry: '',
    description: ''
  });
  const [mountedDateObj, setMountedDateObj] = useState<DateObject | null>(
    new DateObject({ calendar: persian, locale: persian_fa })
  );

  // Ledger Entry Form State (Payments / Manual Rent / Expenses)
  const [ledgerForm, setLedgerForm] = useState({
    ownerId: '',
    tankerId: '',
    driverId: '',
    entryType: 'PAYMENT_TO_OWNER' as TankerLedgerEntryType,
    amount: '',
    currency: 'TOMAN' as 'TOMAN' | 'USD' | 'AED',
    foreignAmount: '',
    exchangeRate: exchangeRates.usd ? exchangeRates.usd.toString() : '60000',
    exchangeRateUSD_AED: exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67',
    trackingCode: '',
    cardNumber: '',
    shebaNumber: '',
    bankName: '',
    description: ''
  });
  const [ledgerDateObj, setLedgerDateObj] = useState<DateObject | null>(
    new DateObject({ calendar: persian, locale: persian_fa })
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const isUnitCompanyOwned = (unit: TankerUnit) =>
    unit.ownershipType === 'COMPANY_OWNED' ||
    unit.isCompanyOwned === true ||
    unit.ownerId === 'COMPANY';

  // Detect drivers who have a tankNumber in drivers list that is not yet registered in tankerUnits
  const unregisteredDriversWithTank = useMemo(() => {
    return drivers.filter((drv) => {
      const tNum = (drv.tankNumber || '').trim();
      if (!tNum) return false;
      const alreadyLinked = tankerUnits.some(
        (u) =>
          u.assignedDriverId === drv.id ||
          u.id === drv.mountedTankerId ||
          u.tankNumber.trim().toLowerCase() === tNum.toLowerCase()
      );
      return !alreadyLinked;
    });
  }, [drivers, tankerUnits]);

  // 1-Click Auto-Import existing tankers from drivers list as Company-Owned Tankers with dedicated codes
  const handleAutoSyncDriverTankers = () => {
    if (unregisteredDriversWithTank.length === 0) return;
    const today = new Date().toLocaleDateString('fa-IR');
    unregisteredDriversWithTank.forEach((drv, idx) => {
      const code = drv.tankerCode || generateNextTankerCode(idx);
      addTankerUnit({
        ownershipType: 'COMPANY_OWNED',
        isCompanyOwned: true,
        ownerId: 'COMPANY',
        ownerName: 'شرکت (تانکر ملکی)',
        tankerCode: code,
        tankNumber: drv.tankNumber.trim(),
        capacityTons: 24,
        tankType: '۴ محور صادراتی LPG',
        status: 'MOUNTED',
        assignedDriverId: drv.id,
        assignedDriverName: drv.fullName,
        assignedTruckPlate: drv.plateNumber,
        mountedDate: today,
        contractType: 'COMPANY_OWNED_NONE',
        autoCalculateFromTruckLoads: true,
        description: 'ثبت و کدگذاری خودکار از لیست کامیون‌ها و رانندگان'
      });
    });
    showToast(
      'success',
      `${unregisteredDriversWithTank.length} دستگاه تانکر به عنوان تانکر ملکی شرکت کدگذاری و به کامیون‌هایشان متصل شدند.`
    );
  };

  // Helper: convert foreign rate to Toman
  const convertToToman = (amount: number, currency?: 'TOMAN' | 'USD' | 'AED') => {
    const usdRate = exchangeRates.usd || 60000;
    const usdAed = exchangeRates.usdAed || 3.67;
    if (!currency || currency === 'TOMAN') return Math.round(amount);
    if (currency === 'USD') return Math.round(amount * usdRate);
    if (currency === 'AED') return Math.round((amount / (usdAed || 3.67)) * usdRate);
    return Math.round(amount);
  };

  // Calculate all loads/trips performed by each mounted tanker based on its assigned truck (driverId)
  const tankerCalculatedLoadsMap = useMemo(() => {
    const map: Record<
      string,
      {
        loads: Array<{
          id: string;
          source: 'TRANSACTION' | 'FREIGHT' | 'PURCHASE';
          date: string;
          driverName: string;
          plateNumber: string;
          volume: number;
          truckFreightToman: number;
          tankerShareToman: number;
          formulaText: string;
          billOfLading?: string;
          description: string;
        }>;
        totalVolume: number;
        totalTrips: number;
        totalShareToman: number;
      }
    > = {};

    tankerUnits.forEach((unit) => {
      map[unit.id] = { loads: [], totalVolume: 0, totalTrips: 0, totalShareToman: 0 };

      if (!unit.assignedDriverId || unit.autoCalculateFromTruckLoads === false) {
        return;
      }

      const driver = drivers.find((d) => d.id === unit.assignedDriverId);
      const driverName = driver?.fullName || unit.assignedDriverName || 'نامشخص';
      const plateNumber = driver?.plateNumber || unit.assignedTruckPlate || '---';

      const driverTxs = transactions.filter((t) => t.driverId === unit.assignedDriverId);
      const driverFreights = freights.filter((f) => f.driverId === unit.assignedDriverId);
      const driverPurchases = purchases.filter(
        (p) => p.driverId === unit.assignedDriverId && !p.linkedTransactionId
      );

      const computeTankerShare = (volume: number, truckFreightToman: number) => {
        if (unit.contractType === 'COMPANY_OWNED_NONE' || isUnitCompanyOwned(unit)) {
          if (unit.contractType === 'COMPANY_OWNED_NONE') {
            return {
              share: 0,
              formulaText: 'تانکر ملکی شرکت خودمان'
            };
          }
        }
        if (unit.contractType === 'PERCENTAGE_OF_FREIGHT') {
          const pct = unit.sharePercentage || 0;
          const share = Math.round((truckFreightToman * pct) / 100);
          return {
            share,
            formulaText: `${pct}% از کرایه کامیون (${truckFreightToman.toLocaleString()} T)`
          };
        }
        if (unit.contractType === 'PER_TON') {
          const rate = unit.ratePerTon || 0;
          const cur = unit.rateCurrency || 'TOMAN';
          const rawAmount = volume * rate;
          const share = convertToToman(rawAmount, cur);
          return {
            share,
            formulaText: `${volume} تن × ${rate.toLocaleString()} ${
              cur === 'USD' ? '$' : cur === 'AED' ? 'AED' : 'تومان'
            }`
          };
        }
        if (unit.contractType === 'PER_TRIP') {
          const rate = unit.ratePerTrip || 0;
          const cur = unit.rateCurrency || 'TOMAN';
          const share = convertToToman(rate, cur);
          return {
            share,
            formulaText: `نرخ هر سرویس: ${rate.toLocaleString()} ${
              cur === 'USD' ? '$' : cur === 'AED' ? 'AED' : 'تومان'
            }`
          };
        }
        return {
          share: 0,
          formulaText: 'اجاره ثابت ماهانه / توافقی'
        };
      };

      driverTxs.forEach((tx) => {
        const vol = tx.volume || 0;
        const freightToman = tx.freightPrice || 0;
        const { share, formulaText } = computeTankerShare(vol, freightToman);
        map[unit.id].loads.push({
          id: `tx-${tx.id}`,
          source: 'TRANSACTION',
          date: tx.date,
          driverName,
          plateNumber,
          volume: vol,
          truckFreightToman: freightToman,
          tankerShareToman: share,
          formulaText,
          billOfLading: tx.billOfLading || tx.scaleTicketNo,
          description: tx.description || 'ورود گاز'
        });
      });

      driverFreights.forEach((fr) => {
        const vol = fr.volume || 0;
        const freightToman = fr.amount || 0;
        const { share, formulaText } = computeTankerShare(vol, freightToman);
        map[unit.id].loads.push({
          id: `fr-${fr.id}`,
          source: 'FREIGHT',
          date: fr.date,
          driverName,
          plateNumber,
          volume: vol,
          truckFreightToman: freightToman,
          tankerShareToman: share,
          formulaText,
          billOfLading: fr.billOfLading || fr.trackingCode,
          description:
            fr.origin || fr.destination
              ? `سرویس ${fr.origin || ''} به ${fr.destination || ''} - ${fr.description || ''}`
              : fr.description || 'کرایه حمل'
        });
      });

      driverPurchases.forEach((pu) => {
        const vol = pu.volume || 0;
        const freightToman = pu.freightPrice || 0;
        const { share, formulaText } = computeTankerShare(vol, freightToman);
        map[unit.id].loads.push({
          id: `pu-${pu.id}`,
          source: 'PURCHASE',
          date: pu.date,
          driverName,
          plateNumber,
          volume: vol,
          truckFreightToman: freightToman,
          tankerShareToman: share,
          formulaText,
          billOfLading: pu.scaleTicketNo,
          description: pu.description || 'بارگیری از شرکت'
        });
      });

      map[unit.id].totalTrips = map[unit.id].loads.length;
      map[unit.id].totalVolume = map[unit.id].loads.reduce((s, l) => s + (l.volume || 0), 0);
      map[unit.id].totalShareToman = map[unit.id].loads.reduce(
        (s, l) => s + (l.tankerShareToman || 0),
        0
      );
    });

    return map;
  }, [tankerUnits, drivers, transactions, freights, purchases, exchangeRates]);

  // Calculate financial summary per TankerOwner
  const ownerFinancialsMap = useMemo(() => {
    const map: Record<
      string,
      {
        prevCredit: number;
        prevDebit: number;
        autoEarningsFromLoads: number;
        manualEarnings: number;
        totalPaidToOwner: number;
        totalTankerExpenses: number;
        totalTrips: number;
        totalVolume: number;
        mountedTankersCount: number;
        totalTankersCount: number;
        netBalance: number;
      }
    > = {};

    tankerOwners.forEach((owner) => {
      const prevCredit =
        owner.previousBalanceType === 'CREDITOR' ? owner.previousBalanceAmount || 0 : 0;
      const prevDebit =
        owner.previousBalanceType === 'DEBTOR' ? owner.previousBalanceAmount || 0 : 0;

      const ownerUnits = tankerUnits.filter((u) => u.ownerId === owner.id);
      const mountedTankersCount = ownerUnits.filter((u) => u.status === 'MOUNTED').length;

      let autoEarningsFromLoads = 0;
      let totalTrips = 0;
      let totalVolume = 0;

      ownerUnits.forEach((u) => {
        const calc = tankerCalculatedLoadsMap[u.id];
        if (calc) {
          autoEarningsFromLoads += calc.totalShareToman;
          totalTrips += calc.totalTrips;
          totalVolume += calc.totalVolume;
        }
      });

      const ownerEntries = tankerLedgerEntries.filter((e) => e.ownerId === owner.id);
      const manualEarnings = ownerEntries
        .filter((e) => e.entryType === 'MANUAL_EARNING')
        .reduce((s, e) => s + (e.amount || 0), 0);
      const totalPaidToOwner = ownerEntries
        .filter((e) => e.entryType === 'PAYMENT_TO_OWNER')
        .reduce((s, e) => s + (e.amount || 0), 0);
      const totalTankerExpenses = ownerEntries
        .filter((e) => e.entryType === 'TANKER_EXPENSE')
        .reduce((s, e) => s + (e.amount || 0), 0);

      const netBalance =
        prevCredit +
        autoEarningsFromLoads +
        manualEarnings -
        (prevDebit + totalPaidToOwner + totalTankerExpenses);

      map[owner.id] = {
        prevCredit,
        prevDebit,
        autoEarningsFromLoads,
        manualEarnings,
        totalPaidToOwner,
        totalTankerExpenses,
        totalTrips,
        totalVolume,
        mountedTankersCount,
        totalTankersCount: ownerUnits.length,
        netBalance
      };
    });

    return map;
  }, [tankerOwners, tankerUnits, tankerLedgerEntries, tankerCalculatedLoadsMap]);

  // Global KPI stats
  const globalStats = useMemo(() => {
    const totalOwners = tankerOwners.length;
    const totalTankers = tankerUnits.length;
    const companyOwnedCount = tankerUnits.filter((u) => isUnitCompanyOwned(u)).length;
    const externalOwnedCount = totalTankers - companyOwnedCount;
    const mountedTankers = tankerUnits.filter((u) => u.status === 'MOUNTED').length;
    const standbyTankers = tankerUnits.filter((u) => u.status === 'STANDBY').length;
    let totalEarnings = 0;
    let totalPaid = 0;
    let totalNetBalance = 0;
    let totalVolume = 0;

    tankerUnits.forEach((u) => {
      const calc = tankerCalculatedLoadsMap[u.id];
      if (calc) totalVolume += calc.totalVolume;
    });

    Object.values(ownerFinancialsMap).forEach((fin) => {
      totalEarnings += fin.autoEarningsFromLoads + fin.manualEarnings;
      totalPaid += fin.totalPaidToOwner + fin.totalTankerExpenses;
      totalNetBalance += fin.netBalance;
    });

    return {
      totalOwners,
      totalTankers,
      companyOwnedCount,
      externalOwnedCount,
      mountedTankers,
      standbyTankers,
      totalEarnings,
      totalPaid,
      totalNetBalance,
      totalVolume
    };
  }, [tankerOwners, tankerUnits, ownerFinancialsMap, tankerCalculatedLoadsMap]);

  // Filtered Tanker Units for Fleet Tab
  const filteredTankerUnits = useMemo(() => {
    return tankerUnits.filter((unit) => {
      const isComp = isUnitCompanyOwned(unit);
      if (filterOwnership === 'COMPANY_OWNED' && !isComp) return false;
      if (filterOwnership === 'EXTERNAL_OWNER' && isComp) return false;
      if (filterStatus !== 'ALL' && unit.status !== filterStatus) return false;
      if (filterOwnerId !== 'ALL') {
        if (filterOwnerId === 'COMPANY' && !isComp) return false;
        if (filterOwnerId !== 'COMPANY' && unit.ownerId !== filterOwnerId) return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      const drv = drivers.find((d) => d.id === unit.assignedDriverId);
      return (
        (unit.tankerCode || '').toLowerCase().includes(q) ||
        (unit.tankNumber || '').toLowerCase().includes(q) ||
        (unit.serialOrChassis || '').toLowerCase().includes(q) ||
        (unit.ownerName || '').toLowerCase().includes(q) ||
        (drv?.fullName || unit.assignedDriverName || '').toLowerCase().includes(q) ||
        (drv?.plateNumber || unit.assignedTruckPlate || '').toLowerCase().includes(q)
      );
    });
  }, [tankerUnits, drivers, filterOwnership, filterStatus, filterOwnerId, searchTerm]);

  // Open Swap / Transfer Modal for a specific Tanker
  const handleOpenSwapModal = (unit: TankerUnit, preselectedTargetDriverId?: string) => {
    setSwapModalTankerId(unit.id);
    setSwapActionMode('TRANSFER_OR_SWAP');
    setSwapTargetDriverId(preselectedTargetDriverId || '');
    setSwapConflictResolution('SWAP_TANKERS');
    setSwapNote('');
    setSwapDateObj(new DateObject({ calendar: persian, locale: persian_fa }));
  };

  const handleConfirmSwapOrTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapModalTankerId) return;
    const unit = tankerUnits.find((u) => u.id === swapModalTankerId);
    if (!unit) return;

    const dateStr = swapDateObj
      ? swapDateObj.format('YYYY/MM/DD')
      : new Date().toLocaleDateString('fa-IR');

    if (
      swapActionMode === 'UNMOUNT_TO_STANDBY' ||
      swapActionMode === 'UNMOUNT_TO_MAINTENANCE'
    ) {
      transferOrSwapTanker({
        tankerId: unit.id,
        mode: swapActionMode,
        date: dateStr,
        note: swapNote.trim()
      });
      showToast(
        'success',
        `تانکر ${unit.tankerCode ? `[کد ${unit.tankerCode}] ` : ''}شماره مخزن ${unit.tankNumber} از کامیون فک شد.`
      );
      setSwapModalTankerId(null);
      return;
    }

    if (!swapTargetDriverId) {
      showToast('error', 'لطفاً کامیون / راننده مقصد را انتخاب کنید.');
      return;
    }

    if (swapTargetDriverId === unit.assignedDriverId && unit.status === 'MOUNTED') {
      showToast('error', 'این تانکر هم‌اکنون روی همین کامیون بسته شده است.');
      return;
    }

    const targetDriver = drivers.find((d) => d.id === swapTargetDriverId);
    const targetMountedTanker = tankerUnits.find(
      (u) =>
        u.id !== unit.id &&
        u.status === 'MOUNTED' &&
        u.assignedDriverId === swapTargetDriverId
    );

    const finalMode =
      targetMountedTanker && unit.assignedDriverId && swapConflictResolution === 'SWAP_TANKERS'
        ? 'SWAP_TANKERS'
        : 'TRANSFER_REPLACE';

    transferOrSwapTanker({
      tankerId: unit.id,
      targetDriverId: swapTargetDriverId,
      mode: finalMode,
      date: dateStr,
      note: swapNote.trim()
    });

    if (finalMode === 'SWAP_TANKERS' && targetMountedTanker) {
      showToast(
        'success',
        `جابه‌جایی ضربدری انجام شد: تانکر ${unit.tankerCode || unit.tankNumber} و تانکر ${
          targetMountedTanker.tankerCode || targetMountedTanker.tankNumber
        } بین دو کامیون تعویض شدند.`
      );
    } else {
      showToast(
        'success',
        `تانکر ${unit.tankerCode ? `[${unit.tankerCode}] ` : ''}(مخزن ${
          unit.tankNumber
        }) با موفقیت روی کامیون «${targetDriver?.fullName || ''} - پلاک ${
          targetDriver?.plateNumber || ''
        }» بسته شد.`
      );
    }
    setSwapModalTankerId(null);
  };

  // Open Owner Modal (Add or Edit)
  const handleOpenOwnerModal = (owner?: TankerOwner) => {
    if (owner) {
      setEditingOwnerId(owner.id);
      setOwnerForm({
        fullName: owner.fullName,
        nationalId: owner.nationalId || '',
        phone: owner.phone || '',
        cardNumber: owner.cardNumber || '',
        shebaNumber: owner.shebaNumber || '',
        bankName: owner.bankName || '',
        accountHolderName: owner.accountHolderName || owner.fullName,
        previousBalanceType: owner.previousBalanceType || 'NONE',
        previousBalanceAmount: owner.previousBalanceAmount
          ? owner.previousBalanceAmount.toString()
          : '',
        previousBalanceDescription: owner.previousBalanceDescription || '',
        description: owner.description || ''
      });
    } else {
      setEditingOwnerId(null);
      setOwnerForm({
        fullName: '',
        nationalId: '',
        phone: '',
        cardNumber: '',
        shebaNumber: '',
        bankName: '',
        accountHolderName: '',
        previousBalanceType: 'NONE',
        previousBalanceAmount: '',
        previousBalanceDescription: '',
        description: ''
      });
    }
    setShowOwnerModal(true);
  };

  const handleSaveOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerForm.fullName.trim()) {
      showToast('error', 'لطفاً نام و نام خانوادگی صاحب تانکر را وارد کنید.');
      return;
    }

    const prevAmount =
      ownerForm.previousBalanceType !== 'NONE'
        ? parseFloat(cleanNumberInput(ownerForm.previousBalanceAmount)) || 0
        : 0;

    const payload = {
      fullName: ownerForm.fullName.trim(),
      nationalId: ownerForm.nationalId.trim(),
      phone: ownerForm.phone.trim(),
      cardNumber: ownerForm.cardNumber.trim(),
      shebaNumber: ownerForm.shebaNumber.trim(),
      bankName: ownerForm.bankName.trim(),
      accountHolderName: ownerForm.accountHolderName.trim() || ownerForm.fullName.trim(),
      previousBalanceType: prevAmount > 0 ? ownerForm.previousBalanceType : 'NONE',
      previousBalanceAmount: prevAmount,
      previousBalanceDate: prevAmount > 0 ? new Date().toLocaleDateString('fa-IR') : undefined,
      previousBalanceDescription: ownerForm.previousBalanceDescription.trim(),
      description: ownerForm.description.trim()
    };

    if (editingOwnerId) {
      updateTankerOwner(editingOwnerId, payload);
      showToast('success', 'اطلاعات صاحب تانکر با موفقیت ویرایش شد.');
    } else {
      addTankerOwner(payload);
      showToast('success', 'صاحب تانکر جدید با موفقیت ثبت شد.');
    }
    setShowOwnerModal(false);
  };

  // Open Tanker Unit Modal (Add or Edit)
  const handleOpenTankerModal = (
    unit?: TankerUnit,
    preselectedOwnerId?: string,
    preselectedDriverId?: string
  ) => {
    if (unit) {
      const isComp = isUnitCompanyOwned(unit);
      setEditingTankerId(unit.id);
      setTankerForm({
        ownershipType: isComp ? 'COMPANY_OWNED' : 'EXTERNAL_OWNER',
        ownerId: isComp ? 'COMPANY' : unit.ownerId,
        tankerCode: unit.tankerCode || '',
        tankNumber: unit.tankNumber,
        serialOrChassis: unit.serialOrChassis || '',
        capacityTons: unit.capacityTons ? unit.capacityTons.toString() : '24',
        tankType: unit.tankType || '۴ محور صادراتی LPG',
        status: unit.status,
        assignedDriverId: unit.assignedDriverId || '',
        assignedDriverName: unit.assignedDriverName || '',
        assignedTruckPlate: unit.assignedTruckPlate || '',
        contractType: unit.contractType,
        sharePercentage: unit.sharePercentage ? unit.sharePercentage.toString() : '25',
        ratePerTon: unit.ratePerTon ? unit.ratePerTon.toString() : '',
        ratePerTrip: unit.ratePerTrip ? unit.ratePerTrip.toString() : '',
        fixedMonthlyRent: unit.fixedMonthlyRent ? unit.fixedMonthlyRent.toString() : '',
        rateCurrency: unit.rateCurrency || 'TOMAN',
        autoCalculateFromTruckLoads: unit.autoCalculateFromTruckLoads !== false,
        deductFromDriverFreight: Boolean(unit.deductFromDriverFreight),
        hydroTestExpiry: unit.hydroTestExpiry || '',
        description: unit.description || ''
      });
    } else {
      setEditingTankerId(null);
      const isExternalPreselected = Boolean(preselectedOwnerId && preselectedOwnerId !== 'COMPANY');
      const drv = preselectedDriverId ? drivers.find((d) => d.id === preselectedDriverId) : undefined;
      setTankerForm({
        ownershipType: isExternalPreselected ? 'EXTERNAL_OWNER' : 'COMPANY_OWNED',
        ownerId: isExternalPreselected ? preselectedOwnerId! : 'COMPANY',
        tankerCode: generateNextTankerCode(),
        tankNumber: drv?.tankNumber || '',
        serialOrChassis: '',
        capacityTons: '24',
        tankType: '۴ محور صادراتی LPG',
        status: 'MOUNTED',
        assignedDriverId: drv?.id || '',
        assignedDriverName: drv?.fullName || '',
        assignedTruckPlate: drv?.plateNumber || '',
        contractType: isExternalPreselected ? 'PERCENTAGE_OF_FREIGHT' : 'COMPANY_OWNED_NONE',
        sharePercentage: '25',
        ratePerTon: '',
        ratePerTrip: '',
        fixedMonthlyRent: '',
        rateCurrency: 'TOMAN',
        autoCalculateFromTruckLoads: true,
        deductFromDriverFreight: false,
        hydroTestExpiry: '',
        description: ''
      });
      setMountedDateObj(new DateObject({ calendar: persian, locale: persian_fa }));
    }
    setShowTankerModal(true);
  };

  const handleDriverSelectionInTankerForm = (driverId: string) => {
    const drv = drivers.find((d) => d.id === driverId);
    if (drv) {
      setTankerForm((prev) => ({
        ...prev,
        assignedDriverId: drv.id,
        assignedDriverName: drv.fullName,
        assignedTruckPlate: drv.plateNumber,
        tankNumber: prev.tankNumber || drv.tankNumber || ''
      }));
    } else {
      setTankerForm((prev) => ({
        ...prev,
        assignedDriverId: '',
        assignedDriverName: '',
        assignedTruckPlate: ''
      }));
    }
  };

  const handleSaveTankerUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const isComp = tankerForm.ownershipType === 'COMPANY_OWNED';
    if (!isComp && !tankerForm.ownerId) {
      showToast('error', 'لطفاً صاحب تانکر را انتخاب کنید یا مالکیت را روی «ملکی شرکت» قرار دهید.');
      return;
    }
    if (!tankerForm.tankNumber.trim()) {
      showToast('error', 'لطفاً شماره مخزن تانکر را وارد کنید.');
      return;
    }

    const owner = isComp ? null : tankerOwners.find((o) => o.id === tankerForm.ownerId);
    const selectedDriver = drivers.find((d) => d.id === tankerForm.assignedDriverId);
    const finalCode = tankerForm.tankerCode.trim() || generateNextTankerCode();

    const payload: Omit<TankerUnit, 'id' | 'createdAt'> = {
      ownershipType: tankerForm.ownershipType,
      isCompanyOwned: isComp,
      ownerId: isComp ? 'COMPANY' : tankerForm.ownerId,
      ownerName: isComp ? 'شرکت (تانکر ملکی)' : owner?.fullName || 'نامشخص',
      tankerCode: finalCode,
      tankNumber: tankerForm.tankNumber.trim(),
      serialOrChassis: tankerForm.serialOrChassis.trim(),
      capacityTons: parseFloat(cleanNumberInput(tankerForm.capacityTons)) || 0,
      tankType: tankerForm.tankType.trim(),
      status: tankerForm.status,
      assignedDriverId:
        tankerForm.status === 'MOUNTED' ? tankerForm.assignedDriverId || undefined : undefined,
      assignedDriverName:
        tankerForm.status === 'MOUNTED'
          ? selectedDriver?.fullName || tankerForm.assignedDriverName.trim()
          : undefined,
      assignedTruckPlate:
        tankerForm.status === 'MOUNTED'
          ? selectedDriver?.plateNumber || tankerForm.assignedTruckPlate.trim()
          : undefined,
      mountedDate: mountedDateObj ? mountedDateObj.format('YYYY/MM/DD') : undefined,
      contractType: isComp ? 'COMPANY_OWNED_NONE' : tankerForm.contractType,
      sharePercentage:
        !isComp && tankerForm.contractType === 'PERCENTAGE_OF_FREIGHT'
          ? parseFloat(cleanNumberInput(tankerForm.sharePercentage)) || 0
          : undefined,
      ratePerTon:
        !isComp && tankerForm.contractType === 'PER_TON'
          ? parseFloat(cleanNumberInput(tankerForm.ratePerTon)) || 0
          : undefined,
      ratePerTrip:
        !isComp && tankerForm.contractType === 'PER_TRIP'
          ? parseFloat(cleanNumberInput(tankerForm.ratePerTrip)) || 0
          : undefined,
      fixedMonthlyRent:
        !isComp && tankerForm.contractType === 'FIXED_RENT'
          ? parseFloat(cleanNumberInput(tankerForm.fixedMonthlyRent)) || 0
          : undefined,
      rateCurrency: tankerForm.rateCurrency,
      autoCalculateFromTruckLoads: tankerForm.autoCalculateFromTruckLoads,
      deductFromDriverFreight: tankerForm.deductFromDriverFreight,
      hydroTestExpiry: tankerForm.hydroTestExpiry.trim(),
      description: tankerForm.description.trim()
    };

    if (editingTankerId) {
      updateTankerUnit(editingTankerId, payload);
      showToast(
        'success',
        `تانکر کد ${finalCode} (شماره مخزن ${payload.tankNumber}) با موفقیت بروزرسانی شد.`
      );
    } else {
      addTankerUnit(payload);
      showToast(
        'success',
        `تانکر جدید با کد اختصاصی ${finalCode} و شماره مخزن ${payload.tankNumber} ثبت شد.`
      );
    }
    setShowTankerModal(false);
  };

  // Open Ledger Modal (Payment / Earning / Expense)
  const handleOpenLedgerModal = (
    preselectedOwnerId?: string,
    preselectedEntryType: TankerLedgerEntryType = 'PAYMENT_TO_OWNER',
    preselectedTankerId?: string
  ) => {
    const targetOwnerId = preselectedOwnerId || tankerOwners[0]?.id || '';
    const owner = tankerOwners.find((o) => o.id === targetOwnerId);
    const ownerTankers = tankerUnits.filter((u) => u.ownerId === targetOwnerId);
    const defaultTanker =
      ownerTankers.find((u) => u.id === preselectedTankerId) || ownerTankers[0];

    setLedgerForm({
      ownerId: targetOwnerId,
      tankerId: defaultTanker?.id || '',
      driverId: defaultTanker?.assignedDriverId || '',
      entryType: preselectedEntryType,
      amount: '',
      currency: 'TOMAN',
      foreignAmount: '',
      exchangeRate: exchangeRates.usd ? exchangeRates.usd.toString() : '60000',
      exchangeRateUSD_AED: exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67',
      trackingCode: '',
      cardNumber: owner?.cardNumber || '',
      shebaNumber: owner?.shebaNumber || '',
      bankName: owner?.bankName || '',
      description: ''
    });
    setLedgerDateObj(new DateObject({ calendar: persian, locale: persian_fa }));
    setShowLedgerModal(true);
  };

  const handleLedgerForeignChange = (
    foreignVal: string,
    currency: 'TOMAN' | 'USD' | 'AED',
    exRateStr: string,
    usdAedStr: string
  ) => {
    const cleanForeign = cleanNumberInput(foreignVal);
    const foreignNum = parseFloat(cleanForeign) || 0;
    const exRate = parseFloat(cleanNumberInput(exRateStr)) || exchangeRates.usd || 60000;
    const usdAed = parseFloat(cleanNumberInput(usdAedStr)) || 3.67;

    let tomanAmount = '';
    if (foreignNum > 0) {
      if (currency === 'USD') {
        tomanAmount = Math.round(foreignNum * exRate).toString();
      } else if (currency === 'AED') {
        tomanAmount = Math.round((foreignNum / (usdAed || 3.67)) * exRate).toString();
      }
    }
    setLedgerForm((prev) => ({
      ...prev,
      foreignAmount: cleanForeign,
      currency,
      exchangeRate: cleanNumberInput(exRateStr),
      exchangeRateUSD_AED: cleanNumberInput(usdAedStr),
      amount: currency === 'TOMAN' ? prev.amount : tomanAmount
    }));
  };

  const handleSaveLedgerEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(cleanNumberInput(ledgerForm.amount)) || 0;
    if (!ledgerForm.ownerId || amountNum <= 0) {
      showToast('error', 'انتخاب صاحب تانکر و وارد کردن مبلغ معتبر الزامی است.');
      return;
    }

    const selectedTanker = tankerUnits.find((u) => u.id === ledgerForm.tankerId);

    addTankerLedgerEntry({
      ownerId: ledgerForm.ownerId,
      tankerId: ledgerForm.tankerId || undefined,
      driverId: selectedTanker?.assignedDriverId || ledgerForm.driverId || undefined,
      entryType: ledgerForm.entryType,
      date: ledgerDateObj
        ? ledgerDateObj.format('YYYY/MM/DD')
        : new Date().toLocaleDateString('fa-IR'),
      amount: amountNum,
      currency: ledgerForm.currency,
      foreignAmount:
        ledgerForm.currency !== 'TOMAN'
          ? parseFloat(cleanNumberInput(ledgerForm.foreignAmount)) || undefined
          : undefined,
      exchangeRate:
        ledgerForm.currency !== 'TOMAN'
          ? parseFloat(cleanNumberInput(ledgerForm.exchangeRate)) || undefined
          : undefined,
      exchangeRateUSD_AED:
        ledgerForm.currency === 'AED'
          ? parseFloat(cleanNumberInput(ledgerForm.exchangeRateUSD_AED)) || 3.67
          : undefined,
      trackingCode: ledgerForm.trackingCode.trim() || undefined,
      cardNumber: ledgerForm.cardNumber.trim() || undefined,
      shebaNumber: ledgerForm.shebaNumber.trim() || undefined,
      bankName: ledgerForm.bankName.trim() || undefined,
      description:
        ledgerForm.description.trim() || LEDGER_ENTRY_LABELS[ledgerForm.entryType].label
    });

    showToast('success', 'سند مالی صاحب تانکر با موفقیت ثبت شد.');
    setShowLedgerModal(false);
  };

  // Filtered Owners
  const filteredOwners = useMemo(() => {
    return tankerOwners.filter((owner) => {
      if (filterOwnerId !== 'ALL' && filterOwnerId !== 'COMPANY' && owner.id !== filterOwnerId)
        return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const ownerUnits = tankerUnits.filter((u) => u.ownerId === owner.id);
      const matchesTankerOrTruck = ownerUnits.some(
        (u) =>
          (u.tankerCode || '').toLowerCase().includes(q) ||
          u.tankNumber.toLowerCase().includes(q) ||
          (u.assignedDriverName || '').toLowerCase().includes(q) ||
          (u.assignedTruckPlate || '').toLowerCase().includes(q)
      );
      return (
        owner.fullName.toLowerCase().includes(q) ||
        (owner.phone || '').includes(q) ||
        matchesTankerOrTruck
      );
    });
  }, [tankerOwners, tankerUnits, filterOwnerId, searchTerm]);

  const inputClasses =
    'w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all';

  return (
    <div className="space-y-6">
      {/* Top Switcher Bar between Truck Owners & Tanker Fleet/Owners */}
      {onNavigate && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('truck-owners')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Truck size={18} />
              <span>مدیریت صاحبین کامیون‌ها (واریز کرایه و برداشت)</span>
            </button>
            <button
              onClick={() => onNavigate('tanker-owners')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Container size={18} />
              <span>مدیریت تانکرهای شرکت، کد مخزن و جابه‌جایی بین کامیون‌ها</span>
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">
            کدگذاری اختصاصی هر تانکر، شماره مخزن و تعویض/جابه‌جایی تانکر بین کامیون‌ها
          </span>
        </div>
      )}

      {/* Header Banner & Action Buttons */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
              <Container size={30} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                مدیریت ناوگان تانکرهای شرکت، شماره مخزن و جابه‌جایی بین کامیون‌ها
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200/80 mt-1">
                تعریف کد مخصوص برای هر تانکر، رهگیری تانکرهای ملکی شرکت و استیجاری روی کامیون‌ها، و تعویض یا جابه‌جایی آنی بین کشنده‌ها
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => handleOpenTankerModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>+ تعریف تانکر جدید (کد مخصوص و شماره مخزن)</span>
            </button>
            <button
              onClick={() => handleOpenOwnerModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <UserPlus size={18} />
              <span>+ ثبت صاحب تانکر (اشخاص)</span>
            </button>
            <button
              onClick={() => handleOpenLedgerModal(undefined, 'PAYMENT_TO_OWNER')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Wallet size={18} />
              <span>ثبت واریزی / هزینه تانکر</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-cyan-500/15 border border-cyan-400/30 rounded-xl p-3.5">
            <div className="text-[11px] text-cyan-200">تانکرهای ملکی شرکت خودمان</div>
            <div className="text-lg font-black text-cyan-300 mt-1">
              {globalStats.companyOwnedCount} دستگاه{' '}
              <span className="text-xs font-normal text-cyan-200/80">
                (از کل {globalStats.totalTankers} تانکر)
              </span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-3.5">
            <div className="text-[11px] text-emerald-200">تانکرهای بسته شده روی کامیون</div>
            <div className="text-lg font-black text-emerald-300 mt-1">
              {globalStats.mountedTankers} دستگاه فعال
            </div>
            <div className="text-[10px] text-emerald-200/70 mt-0.5">
              آزاد در پارکینگ: {globalStats.standbyTankers} دستگاه
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] text-indigo-200">تانکرهای اشخاص (استیجاری/شراکتی)</div>
            <div className="text-lg font-black text-indigo-200 mt-1">
              {globalStats.externalOwnedCount} دستگاه{' '}
              <span className="text-xs font-normal text-indigo-300">
                ({globalStats.totalOwners} مالک)
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] text-indigo-200">مجموع تناژ حمل‌شده با تانکرها</div>
            <div className="text-lg font-black text-sky-300 mt-1 font-mono" dir="ltr">
              {globalStats.totalVolume.toLocaleString()} Ton
            </div>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-xl p-3.5 col-span-2 md:col-span-1">
            <div className="text-[11px] text-amber-200">تراز حساب صاحبین تانکر (اشخاص)</div>
            <div
              className={`text-lg font-black mt-1 font-mono ${
                globalStats.totalNetBalance >= 0 ? 'text-amber-300' : 'text-rose-300'
              }`}
              dir="ltr"
            >
              {Math.abs(globalStats.totalNetBalance).toLocaleString()} T
            </div>
            <div className="text-[10px] text-indigo-200 mt-0.5">
              {globalStats.totalNetBalance > 0
                ? 'طلب صاحبین تانکر از شرکت'
                : globalStats.totalNetBalance < 0
                ? 'بدهی صاحبین تانکر به شرکت'
                : 'تسویه کامل'}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Sync Banner if there are trucks with tankNumber in Drivers List not yet in TankerUnits */}
      {unregisteredDriversWithTank.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-50 via-teal-50 to-emerald-50 dark:from-cyan-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-teal-300 dark:border-teal-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm print:hidden">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shrink-0 mt-0.5">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-teal-950 dark:text-teal-200">
                شناسایی {unregisteredDriversWithTank.length} تانکر ثبت‌شده در لیست رانندگان (بدون کد اختصاصی تانکر)
              </h3>
              <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                با یک کلیک، تمام تانکرهای موجود روی کامیون‌ها را به عنوان «تانکر ملکی شرکت» با کد اختصاصی (T-101، T-102 و...) ثبت کنید تا بتوانید آن‌ها را بین کامیون‌ها جابه‌جا کنید.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoSyncDriverTankers}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-teal-600/20 shrink-0 cursor-pointer transition-all"
          >
            <RefreshCw size={15} />
            <span>کدگذاری و ثبت خودکار ({unregisteredDriversWithTank.length} تانکر)</span>
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2 text-sm font-bold print:hidden ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs & Fast Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button
            onClick={() => setActiveSubTab('company_fleet')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'company_fleet'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <ArrowLeftRight size={17} />
            <span>ناوگان تانکرها، کد مخزن و جابه‌جایی بین کامیون‌ها ({tankerUnits.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('owners')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'owners'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Container size={17} />
            <span>کارت صاحبین تانکر (اشخاص: {tankerOwners.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mounted_trucks')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'mounted_trucks'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Truck size={17} />
            <span>ریز سرویس‌ها و بارهای تانکرها</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText size={17} />
            <span>دفتر واریزی‌ها و هزینه‌های تانکر ({tankerLedgerEntries.length})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی سریع با کد تانکر (T-101)، شماره مخزن، پلاک کامیون یا راننده..."
              className="w-full pr-9 pl-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-TAB 0 (DEFAULT): COMPANY TANKER FLEET, TANK CODES & TRUCK SWAP BOARD */}
      {activeSubTab === 'company_fleet' && (
        <div className="space-y-6">
          {/* Quick Filters Row */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 ml-1">فیلتر مالکیت:</span>
              <button
                onClick={() => setFilterOwnership('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterOwnership === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                همه تانکرها ({tankerUnits.length})
              </button>
              <button
                onClick={() => setFilterOwnership('COMPANY_OWNED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterOwnership === 'COMPANY_OWNED'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                }`}
              >
                <Building2 size={14} />
                <span>تانکرهای ملکی شرکت خودمان ({globalStats.companyOwnedCount})</span>
              </button>
              <button
                onClick={() => setFilterOwnership('EXTERNAL_OWNER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterOwnership === 'EXTERNAL_OWNER'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                تانکرهای اشخاص / استیجاری ({globalStats.externalOwnedCount})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 ml-1">وضعیت اتصال:</span>
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setFilterStatus('MOUNTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  filterStatus === 'MOUNTED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                بسته شده روی کامیون ({globalStats.mountedTankers})
              </button>
              <button
                onClick={() => setFilterStatus('STANDBY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  filterStatus === 'STANDBY'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                آزاد در پارکینگ ({globalStats.standbyTankers})
              </button>
              <button
                onClick={() => setFilterStatus('MAINTENANCE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  filterStatus === 'MAINTENANCE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                در تعمیرگاه / تست
              </button>
            </div>
          </div>

          {/* Main Tanker Fleet Table & Swap Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Hash size={19} className="text-emerald-600" />
                  <span>جدول شناسایی تانکرها (کد مخصوص، شماره مخزن) و کامیون‌های متصل</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  مشاهده اینکه هر تانکر با چه کد و شماره مخزنی روی کدام کامیون بسته شده است و امکان جابه‌جایی یا تعویض ضربدری بین کامیون‌ها
                </p>
              </div>
              <button
                onClick={() => handleOpenTankerModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>+ تعریف تانکر جدید</span>
              </button>
            </div>

            {filteredTankerUnits.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                  <Container size={32} />
                </div>
                <h4 className="text-base font-black text-slate-800 dark:text-white">
                  هیچ تانکری با این مشخصات یافت نشد
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                  تانکرهای شرکت یا تانکرهای استیجاری را با کد اختصاصی (مثلاً T-101) و شماره مخزن تعریف کنید و مشخص نمایید روی کدام کامیون بسته شده‌اند.
                </p>
                <button
                  onClick={() => handleOpenTankerModal()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  <Plus size={16} />
                  <span>ثبت اولین تانکر شرکت</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">کد مخصوص تانکر</th>
                      <th className="px-4 py-3.5">شماره مخزن / شاسی</th>
                      <th className="px-4 py-3.5">مالکیت تانکر</th>
                      <th className="px-4 py-3.5">وضعیت فعلی</th>
                      <th className="px-4 py-3.5">کامیون متصل (کشنده و راننده)</th>
                      <th className="px-4 py-3.5">ظرفیت / مشخصات</th>
                      <th className="px-4 py-3.5">کارکرد روی کامیون</th>
                      <th className="px-4 py-3.5 text-center">جابه‌جایی بین کامیون‌ها و عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTankerUnits.map((unit) => {
                      const isComp = isUnitCompanyOwned(unit);
                      const statusCfg = MOUNT_STATUS_CONFIG[unit.status];
                      const drv = drivers.find((d) => d.id === unit.assignedDriverId);
                      const calc = tankerCalculatedLoadsMap[unit.id] || {
                        loads: [],
                        totalVolume: 0,
                        totalTrips: 0,
                        totalShareToman: 0
                      };

                      return (
                        <tr
                          key={unit.id}
                          className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 transition-colors"
                        >
                          {/* Dedicated Tanker Code */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-mono font-black text-xs sm:text-sm shadow-sm">
                              <Hash size={13} className="text-emerald-400 dark:text-indigo-200" />
                              {unit.tankerCode || 'بدون کد'}
                            </span>
                          </td>

                          {/* Tank Number (شماره مخزن) */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                              مخزن: {unit.tankNumber}
                            </div>
                            {unit.serialOrChassis && (
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                شاسی/سریال: {unit.serialOrChassis}
                              </div>
                            )}
                          </td>

                          {/* Ownership */}
                          <td className="px-4 py-3.5">
                            {isComp ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 text-xs font-black">
                                <Building2 size={13} />
                                <span>ملکی شرکت خودمان</span>
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-bold">
                                  صاحب تانکر: {unit.ownerName}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Mount Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                              {statusCfg.label}
                            </span>
                          </td>

                          {/* Connected Truck & Driver */}
                          <td className="px-4 py-3.5">
                            {unit.status === 'MOUNTED' ? (
                              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/70 inline-flex flex-col gap-1 min-w-[200px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                                    <Truck size={15} className="text-emerald-600 shrink-0" />
                                    {drv?.fullName || unit.assignedDriverName || 'نامشخص'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded font-mono text-xs font-bold">
                                    پلاک: {drv?.plateNumber || unit.assignedTruckPlate || '---'}
                                  </span>
                                  {unit.mountedDate && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      از {unit.mountedDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span>متصل به کامیون نیست</span>
                                <button
                                  onClick={() => handleOpenSwapModal(unit)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Link2 size={12} />
                                  <span>بستن روی کامیون</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Specs */}
                          <td className="px-4 py-3.5 text-xs">
                            <div className="font-bold text-slate-700 dark:text-slate-200">
                              {unit.capacityTons ? `${unit.capacityTons} تن` : '---'}
                            </div>
                            <div className="text-[11px] text-slate-400">{unit.tankType || ''}</div>
                          </td>

                          {/* Trips & Tonnage */}
                          <td className="px-4 py-3.5 font-mono text-xs">
                            <span className="font-bold">{calc.totalTrips} سرویس</span>
                            <span className="block text-[11px] text-slate-500">
                              {calc.totalVolume.toLocaleString()} تن بار
                            </span>
                          </td>

                          {/* Swap / Transfer / Actions */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenSwapModal(unit)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer transition-all"
                                title="انتقال این تانکر به کامیون دیگر یا جابه‌جایی ضربدری با تانکر کامیون دیگر"
                              >
                                <ArrowLeftRight size={14} />
                                <span>جابه‌جایی / تغییر کامیون</span>
                              </button>

                              {unit.status === 'MOUNTED' && (
                                <button
                                  onClick={() => {
                                    transferOrSwapTanker({
                                      tankerId: unit.id,
                                      mode: 'UNMOUNT_TO_STANDBY',
                                      date: new Date().toLocaleDateString('fa-IR'),
                                      note: 'فک سریع از کامیون و انتقال به پارکینگ'
                                    });
                                    showToast(
                                      'success',
                                      `تانکر کد ${unit.tankerCode || unit.tankNumber} از کامیون فک شد و به وضعیت آزاد در پارکینگ منتقل گردید.`
                                    );
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="فک تانکر از کامیون و انتقال به پارکینگ"
                                >
                                  <Unlink size={13} />
                                  <span>فک</span>
                                </button>
                              )}

                              <button
                                onClick={() => setHistoryModalTankerId(unit.id)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg cursor-pointer"
                                title="مشاهده تاریخچه جابه‌جایی‌های این تانکر بین کامیون‌ها"
                              >
                                <History size={15} />
                              </button>

                              <button
                                onClick={() => handleOpenTankerModal(unit)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="ویرایش کد مخصوص، شماره مخزن و مشخصات"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `آیا از حذف تانکر کد "${
                                        unit.tankerCode || unit.tankNumber
                                      }" اطمینان دارید؟`
                                    )
                                  ) {
                                    deleteTankerUnit(unit.id);
                                    showToast('success', 'تانکر حذف شد.');
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="حذف تانکر"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Truck-Centric Overview Matrix: Which Tanker is on Which Truck right now */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck size={19} className="text-blue-600" />
                  <span>نمای کلی کامیون‌های ناوگان و تانکر بسته شده روی هر کامیون ({drivers.length} کامیون)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  در یک نگاه ببینید روی هر کامیون (کشنده) کدام تانکر با چه کد و شماره مخزنی بسته شده است
                </p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {drivers.map((drv) => {
                const mountedUnit = tankerUnits.find(
                  (u) => u.status === 'MOUNTED' && u.assignedDriverId === drv.id
                );
                const isComp = mountedUnit ? isUnitCompanyOwned(mountedUnit) : drv.isCompanyTanker;

                return (
                  <div
                    key={drv.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      mountedUnit
                        ? 'bg-slate-50/70 dark:bg-slate-800/40 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-50/30 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Truck size={15} className="text-blue-600 shrink-0" />
                          <span>{drv.fullName}</span>
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded font-mono text-xs font-bold">
                          پلاک کشنده: {drv.plateNumber}
                        </span>
                      </div>

                      {mountedUnit ? (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-mono font-black text-xs shadow-sm">
                          کد: {mountedUnit.tankerCode || '---'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 text-[11px] font-bold">
                          بدون تانکر ثبت‌شده
                        </span>
                      )}
                    </div>

                    {mountedUnit ? (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">شماره مخزن:</span>
                          <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
                            {mountedUnit.tankNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">مالکیت تانکر:</span>
                          <span className="font-bold text-cyan-700 dark:text-cyan-300">
                            {isComp ? 'ملکی شرکت خودمان' : mountedUnit.ownerName}
                          </span>
                        </div>
                      </div>
                    ) : drv.tankNumber ? (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between">
                        <span>شماره تانکر دستی: {drv.tankNumber}</span>
                        <button
                          onClick={() => handleOpenTankerModal(undefined, 'COMPANY', drv.id)}
                          className="text-teal-700 dark:text-teal-300 font-black hover:underline cursor-pointer"
                        >
                          + تعریف کد تانکر
                        </button>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      {mountedUnit ? (
                        <button
                          onClick={() => handleOpenSwapModal(mountedUnit)}
                          className="w-full py-1.5 px-3 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowLeftRight size={13} />
                          <span>تعویض یا انتقال تانکر این کامیون</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenTankerModal(undefined, 'COMPANY', drv.id)}
                          className="w-full py-1.5 px-3 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Link2 size={13} />
                          <span>بستن تانکر روی این کامیون</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: TANKER OWNERS & THEIR MOUNTED TANKERS */}
      {activeSubTab === 'owners' && (
        <div className="space-y-5">
          {filteredOwners.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                <Container size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                هنوز صاحب تانکر (اشخاص) ثبت نشده است
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                تانکرهای ملکی شرکت در تب «ناوگان تانکرها و جابه‌جایی بین کامیون‌ها» قرار دارند. اگر تانکری متعلق به شخص دیگری است و بابت آن اجاره یا سهم کرایه می‌پردازید، مشخصات صاحب تانکر را اینجا ثبت کنید.
              </p>
              <button
                onClick={() => handleOpenOwnerModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <UserPlus size={18} />
                <span>ثبت صاحب تانکر جدید</span>
              </button>
            </div>
          ) : (
            filteredOwners.map((owner) => {
              const fin = ownerFinancialsMap[owner.id] || {
                prevCredit: 0,
                prevDebit: 0,
                autoEarningsFromLoads: 0,
                manualEarnings: 0,
                totalPaidToOwner: 0,
                totalTankerExpenses: 0,
                totalTrips: 0,
                totalVolume: 0,
                mountedTankersCount: 0,
                totalTankersCount: 0,
                netBalance: 0
              };
              const ownerUnits = tankerUnits.filter((u) => u.ownerId === owner.id);

              return (
                <div
                  key={owner.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all"
                >
                  {/* Owner Top Header */}
                  <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                        {owner.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {owner.fullName}
                          </h3>
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                            {ownerUnits.length} دستگاه تانکر ({fin.mountedTankersCount} بسته شده روی کامیون)
                          </span>
                          {owner.phone && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              تلفن: {owner.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {owner.bankName && <span>بانک: {owner.bankName}</span>}
                          {owner.cardNumber && (
                            <span className="font-mono bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded" dir="ltr">
                              کارت: {owner.cardNumber}
                            </span>
                          )}
                          {owner.shebaNumber && (
                            <span className="font-mono bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded" dir="ltr">
                              شبا: {owner.shebaNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for this Owner */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                      <button
                        onClick={() => handleOpenTankerModal(undefined, owner.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>افزودن تانکر / اتصال به کامیون</span>
                      </button>

                      <button
                        onClick={() => handleOpenLedgerModal(owner.id, 'PAYMENT_TO_OWNER')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CreditCard size={15} />
                        <span>ثبت واریزی</span>
                      </button>

                      <button
                        onClick={() => handleOpenLedgerModal(owner.id, 'MANUAL_EARNING')}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <TrendingUp size={15} />
                        <span>ثبت اجاره/کارکرد</span>
                      </button>

                      <button
                        onClick={() => handleOpenLedgerModal(owner.id, 'TANKER_EXPENSE')}
                        className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Wrench size={14} />
                        <span>هزینه تعمیرات تانکر</span>
                      </button>

                      <button
                        onClick={() => setStatementOwnerId(owner.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>ریز حساب و چاپ</span>
                      </button>

                      <button
                        onClick={() => handleOpenOwnerModal(owner)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                        title="ویرایش مشخصات صاحب تانکر"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `آیا از حذف "${owner.fullName}" و تانکرهای مرتبط اطمینان دارید؟`
                            )
                          ) {
                            deleteTankerOwner(owner.id);
                            showToast('success', 'صاحب تانکر حذف شد.');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                        title="حذف صاحب تانکر"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Summary Strip for Owner */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block mb-1">
                        مانده حساب قبلی
                      </span>
                      {fin.prevCredit > 0 ? (
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                          +{fin.prevCredit.toLocaleString()} T (طلب)
                        </span>
                      ) : fin.prevDebit > 0 ? (
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400" dir="ltr">
                          -{fin.prevDebit.toLocaleString()} T (بدهی)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-400">صفر (تسویه)</span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                      <span className="text-emerald-800 dark:text-emerald-300 block mb-1">
                        حق تانکر از سرویس‌های کامیون ({fin.totalTrips} بار)
                      </span>
                      <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400" dir="ltr">
                        {(fin.autoEarningsFromLoads + fin.manualEarnings).toLocaleString()} T
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                      <span className="text-blue-800 dark:text-blue-300 block mb-1">
                        مجموع واریزی ما به صاحب تانکر
                      </span>
                      <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-400" dir="ltr">
                        {fin.totalPaidToOwner.toLocaleString()} T
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                      <span className="text-amber-800 dark:text-amber-300 block mb-1">
                        هزینه‌های تعمیرات و تست تانکر
                      </span>
                      <span className="font-mono font-black text-sm text-amber-700 dark:text-amber-400" dir="ltr">
                        {fin.totalTankerExpenses.toLocaleString()} T
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border col-span-2 sm:col-span-1 ${
                        fin.netBalance > 0
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800'
                          : fin.netBalance < 0
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                        تراز نهایی حساب صاحب تانکر
                      </span>
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono font-black text-sm ${
                            fin.netBalance > 0
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : fin.netBalance < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600'
                          }`}
                          dir="ltr"
                        >
                          {Math.abs(fin.netBalance).toLocaleString()} T
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            fin.netBalance > 0
                              ? 'bg-indigo-200/70 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200'
                              : fin.netBalance < 0
                              ? 'bg-rose-200/70 dark:bg-rose-900 text-rose-900 dark:text-rose-200'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {fin.netBalance > 0
                            ? 'طلبکار از شرکت'
                            : fin.netBalance < 0
                            ? 'بدهکار به شرکت'
                            : 'تسویه'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* List of Tankers Owned by this Person & Mounted Truck Info */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />
                        <span>لیست تانکرها و وضعیت اتصال روی کامیون‌ها:</span>
                      </h4>
                    </div>

                    {ownerUnits.length === 0 ? (
                      <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          هنوز تانکری برای «{owner.fullName}» ثبت نشده است.
                        </p>
                        <button
                          onClick={() => handleOpenTankerModal(undefined, owner.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>ثبت تانکر و اتصال به کامیون</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ownerUnits.map((unit) => {
                          const statusCfg = MOUNT_STATUS_CONFIG[unit.status];
                          const calc = tankerCalculatedLoadsMap[unit.id] || {
                            loads: [],
                            totalVolume: 0,
                            totalTrips: 0,
                            totalShareToman: 0
                          };
                          const connectedDriver = drivers.find(
                            (d) => d.id === unit.assignedDriverId
                          );

                          return (
                            <div
                              key={unit.id}
                              className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex flex-col justify-between gap-3 hover:border-indigo-400/60 transition-all"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {unit.tankerCode && (
                                      <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs">
                                        کد: {unit.tankerCode}
                                      </span>
                                    )}
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-mono font-black text-xs">
                                      شماره مخزن: {unit.tankNumber}
                                    </span>
                                    {unit.capacityTons ? (
                                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded">
                                        ظرفیت: {unit.capacityTons} تن
                                      </span>
                                    ) : null}
                                  </div>

                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.badgeClass}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                                    />
                                    {statusCfg.label}
                                  </span>
                                </div>

                                {/* Mounted Truck Box */}
                                {unit.status === 'MOUNTED' ? (
                                  <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                        <Truck size={18} />
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                          بسته شده روی کامیون (کشنده):
                                        </div>
                                        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                                          <span>
                                            {connectedDriver?.fullName ||
                                              unit.assignedDriverName ||
                                              'راننده انتخاب نشده'}
                                          </span>
                                          {(connectedDriver?.plateNumber ||
                                            unit.assignedTruckPlate) && (
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded font-mono text-xs">
                                              پلاک:{' '}
                                              {connectedDriver?.plateNumber ||
                                                unit.assignedTruckPlate}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {unit.mountedDate && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                        تاریخ اتصال: <span className="font-bold">{unit.mountedDate}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      این تانکر در حال حاضر روی هیچ کامیونی بسته نشده است.
                                    </span>
                                    <button
                                      onClick={() => handleOpenSwapModal(unit)}
                                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Link2 size={13} />
                                      <span>بستن روی کامیون</span>
                                    </button>
                                  </div>
                                )}

                                {/* Contract & Calculated Performance */}
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 px-3 py-2 rounded-lg">
                                  <div>
                                    <span className="text-slate-400">مدل توافق: </span>
                                    <span className="font-bold">
                                      {CONTRACT_TYPE_LABELS[unit.contractType]}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span>
                                      سرویس‌ها: <strong>{calc.totalTrips}</strong>
                                    </span>
                                    <span>
                                      تناژ: <strong>{calc.totalVolume.toLocaleString()} تن</strong>
                                    </span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-black" dir="ltr">
                                      {calc.totalShareToman.toLocaleString()} T
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Tanker Footer Actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenSwapModal(unit)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <ArrowLeftRight size={13} />
                                    <span>جابه‌جایی بین کامیون‌ها</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenTankerModal(unit)}
                                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Pencil size={13} />
                                    <span>ویرایش مشخصات</span>
                                  </button>
                                </div>

                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `آیا از حذف تانکر شماره "${unit.tankNumber}" اطمینان دارید؟`
                                      )
                                    ) {
                                      deleteTankerUnit(unit.id);
                                      showToast('success', 'تانکر حذف شد.');
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                                  title="حذف تانکر"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 2: TABLE OF ALL TANKERS MOUNTED ON TRUCKS & TRIP BREAKDOWN */}
      {activeSubTab === 'mounted_trucks' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History size={19} className="text-indigo-600" />
                <span>ریز بارها و سرویس‌های انجام‌شده توسط کامیون‌های دارای تانکر</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                محاسبه خودکار کارکرد هر تانکر از روی سرویس‌ها و بارنامه‌های کامیونی که تانکر روی آن بسته شده است
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold">
                  <tr>
                    <th className="px-4 py-3">تاریخ</th>
                    <th className="px-4 py-3">کد تانکر / شماره مخزن</th>
                    <th className="px-4 py-3">مالکیت تانکر</th>
                    <th className="px-4 py-3">کامیون / راننده</th>
                    <th className="px-4 py-3">وزن بار (تن)</th>
                    <th className="px-4 py-3">کرایه کل کامیون (تومان)</th>
                    <th className="px-4 py-3">نحوه محاسبه سهم تانکر</th>
                    <th className="px-4 py-3">سهم تانکر (تومان)</th>
                    <th className="px-4 py-3">توضیحات / بارنامه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tankerUnits
                    .filter((u) => filterOwnerId === 'ALL' || u.ownerId === filterOwnerId)
                    .flatMap((unit) => {
                      const calc = tankerCalculatedLoadsMap[unit.id];
                      if (!calc) return [];
                      return calc.loads.map((load) => ({
                        ...load,
                        tankerCode: unit.tankerCode,
                        tankNumber: unit.tankNumber,
                        ownerName: unit.ownerName
                      }));
                    })
                    .map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{row.date}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {row.tankerCode ? `[${row.tankerCode}] ` : ''}
                          {row.tankNumber}
                        </td>
                        <td className="px-4 py-3 font-bold">{row.ownerName}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold">{row.driverName}</span>
                          <span className="block text-[11px] font-mono text-slate-500">
                            {row.plateNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{row.volume} تن</td>
                        <td className="px-4 py-3 font-mono" dir="ltr">
                          {row.truckFreightToman.toLocaleString()} T
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {row.formulaText}
                        </td>
                        <td
                          className="px-4 py-3 font-mono font-black text-emerald-700 dark:text-emerald-400"
                          dir="ltr"
                        >
                          {row.tankerShareToman.toLocaleString()} T
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.billOfLading ? `[بارنامه/قبض: ${row.billOfLading}] ` : ''}
                          {row.description}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LEDGER ENTRIES (PAYMENTS, MANUAL RENT, TANKER EXPENSES) */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet size={19} className="text-amber-500" />
                <span>دفتر اسناد مالی صاحبین تانکر (واریزی‌ها، کارکرد/اجاره و هزینه‌های تانکر)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تمامی پرداختی‌ها به صاحب تانکر، اجاره‌های دوره‌ای و هزینه‌های تعمیرات تانکر
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenLedgerModal(undefined, 'PAYMENT_TO_OWNER')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>ثبت واریزی یا سند جدید</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold">
                <tr>
                  <th className="px-4 py-3.5">تاریخ</th>
                  <th className="px-4 py-3.5">صاحب تانکر</th>
                  <th className="px-4 py-3.5">تانکر مرتبط</th>
                  <th className="px-4 py-3.5">نوع سند</th>
                  <th className="px-4 py-3.5">مبلغ (تومان)</th>
                  <th className="px-4 py-3.5">معادل ارزی</th>
                  <th className="px-4 py-3.5">شماره پیگیری / بانک</th>
                  <th className="px-4 py-3.5">توضیحات</th>
                  <th className="px-4 py-3.5 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tankerLedgerEntries
                  .filter((e) => filterOwnerId === 'ALL' || e.ownerId === filterOwnerId)
                  .map((entry) => {
                    const owner = tankerOwners.find((o) => o.id === entry.ownerId);
                    const tanker = tankerUnits.find((u) => u.id === entry.tankerId);
                    const cfg = LEDGER_ENTRY_LABELS[entry.entryType];

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs">{entry.date}</td>
                        <td className="px-4 py-3.5 font-bold">{owner?.fullName || 'نامشخص'}</td>
                        <td className="px-4 py-3.5 font-mono text-xs">
                          {tanker
                            ? `${tanker.tankerCode ? `[${tanker.tankerCode}] ` : ''}مخزن ${tanker.tankNumber}`
                            : 'عمومی'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badgeClass}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3.5 font-mono font-black ${
                            cfg.isCreditForOwner
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                          dir="ltr"
                        >
                          {entry.amount.toLocaleString()} T
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs" dir="ltr">
                          {entry.currency && entry.currency !== 'TOMAN' && entry.foreignAmount
                            ? `${entry.foreignAmount.toLocaleString()} ${entry.currency}`
                            : '---'}
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          {entry.trackingCode && (
                            <span className="font-mono block">کد: {entry.trackingCode}</span>
                          )}
                          {entry.bankName && (
                            <span className="text-slate-400">{entry.bankName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm('آیا از حذف این سند مالی اطمینان دارید؟')) {
                                deleteTankerLedgerEntry(entry.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {tankerLedgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      هنوز هیچ سند واریزی یا کارکردی ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: SWAP / TRANSFER TANKER BETWEEN TRUCKS */}
      {swapModalTankerId && (() => {
        const sourceTanker = tankerUnits.find((u) => u.id === swapModalTankerId);
        if (!sourceTanker) return null;

        const currentDriver = drivers.find((d) => d.id === sourceTanker.assignedDriverId);
        const targetDriver = drivers.find((d) => d.id === swapTargetDriverId);
        const targetMountedTanker = swapTargetDriverId
          ? tankerUnits.find(
              (u) =>
                u.id !== sourceTanker.id &&
                u.status === 'MOUNTED' &&
                u.assignedDriverId === swapTargetDriverId
            )
          : undefined;

        return (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-teal-700 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/15 rounded-xl">
                    <ArrowLeftRight size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg">
                      تغییر و جابه‌جایی تانکر بین کامیون‌ها
                    </h3>
                    <p className="text-xs text-indigo-100 mt-0.5">
                      انتقال تانکر به کامیون دیگر، تعویض ضربدری دو تانکر بین دو کامیون یا فک به پارکینگ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSwapModalTankerId(null)}
                  className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmSwapOrTransfer} className="p-6 space-y-5">
                {/* Selected Tanker Info Banner */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-mono font-black text-xs sm:text-sm">
                        کد مخصوص: {sourceTanker.tankerCode || 'بدون کد'}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs sm:text-sm">
                        شماره مخزن: {sourceTanker.tankNumber}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      مالکیت:{' '}
                      <strong>
                        {isUnitCompanyOwned(sourceTanker)
                          ? 'ملکی شرکت خودمان'
                          : sourceTanker.ownerName}
                      </strong>{' '}
                      | ظرفیت: {sourceTanker.capacityTons || 24} تن
                    </div>
                  </div>

                  <div className="text-right sm:text-left">
                    <div className="text-[11px] text-slate-500">کامیون فعلی متصل به این تانکر:</div>
                    {sourceTanker.status === 'MOUNTED' &&
                    (currentDriver || sourceTanker.assignedDriverName) ? (
                      <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {currentDriver?.fullName || sourceTanker.assignedDriverName} (پلاک:{' '}
                        {currentDriver?.plateNumber || sourceTanker.assignedTruckPlate})
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-amber-600 mt-0.5">
                        آزاد در پارکینگ (روی کامیونی بسته نیست)
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Mode Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    نوع عملیات جابه‌جایی را انتخاب کنید:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSwapActionMode('TRANSFER_OR_SWAP')}
                      className={`p-3 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer ${
                        swapActionMode === 'TRANSFER_OR_SWAP'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black">
                        <ArrowLeftRight size={15} />
                        <span>انتقال / جابه‌جایی به کامیون دیگر</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        بستن روی کامیون جدید یا تعویض با تانکر کامیون دیگر
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSwapActionMode('UNMOUNT_TO_STANDBY')}
                      className={`p-3 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer ${
                        swapActionMode === 'UNMOUNT_TO_STANDBY'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black">
                        <Unlink size={15} />
                        <span>فک تانکر (آزاد در پارکینگ)</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        باز کردن تانکر از کامیون فعلی و توقف در پارکینگ
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSwapActionMode('UNMOUNT_TO_MAINTENANCE')}
                      className={`p-3 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer ${
                        swapActionMode === 'UNMOUNT_TO_MAINTENANCE'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black">
                        <Wrench size={15} />
                        <span>ارسال به تعمیرگاه / تست مخزن</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        باز کردن از کامیون جهت تعمیرات یا تست هیدرواستاتیک
                      </div>
                    </button>
                  </div>
                </div>

                {swapActionMode === 'TRANSFER_OR_SWAP' && (
                  <div className="space-y-4 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-800/70">
                    <div>
                      <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200 mb-1.5">
                        انتخاب کامیون (کشنده) مقصد که تانکر روی آن بسته شود *
                      </label>
                      <select
                        value={swapTargetDriverId}
                        onChange={(e) => setSwapTargetDriverId(e.target.value)}
                        className={inputClasses}
                        required
                      >
                        <option value="">-- انتخاب کامیون / راننده مقصد از لیست --</option>
                        {drivers
                          .filter((d) => d.id !== sourceTanker.assignedDriverId)
                          .map((drv) => {
                            const drvMounted = tankerUnits.find(
                              (u) => u.status === 'MOUNTED' && u.assignedDriverId === drv.id
                            );
                            return (
                              <option key={drv.id} value={drv.id}>
                                {drv.fullName} — پلاک کامیون: {drv.plateNumber}{' '}
                                {drvMounted
                                  ? `[دارای تانکر کد ${drvMounted.tankerCode || ''} مخزن ${
                                      drvMounted.tankNumber
                                    }]`
                                  : '[بدون تانکر / آزاد]'}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    {/* If the target truck already has another tanker mounted, offer SWAP vs REPLACE */}
                    {targetMountedTanker && sourceTanker.assignedDriverId && (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-3">
                        <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                          <AlertCircle size={16} className="text-amber-600 shrink-0" />
                          <span>
                            توجه: روی کامیون مقصد ({targetDriver?.fullName}) هم‌اکنون تانکر{' '}
                            <span className="underline font-mono">
                              کد {targetMountedTanker.tankerCode || '---'} (مخزن{' '}
                              {targetMountedTanker.tankNumber})
                            </span>{' '}
                            بسته شده است! چگونه عمل شود؟
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSwapConflictResolution('SWAP_TANKERS')}
                            className={`p-3 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer ${
                              swapConflictResolution === 'SWAP_TANKERS'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <div className="font-black">
                              ۱. تعویض ضربدری دو تانکر بین دو کامیون (پیشنهادی)
                            </div>
                            <div className="text-[10px] opacity-90 mt-1">
                              تانکر {sourceTanker.tankerCode || sourceTanker.tankNumber} برود روی کامیون{' '}
                              {targetDriver?.fullName}، و تانکر{' '}
                              {targetMountedTanker.tankerCode || targetMountedTanker.tankNumber} بسته
                              شود روی کامیون {currentDriver?.fullName}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSwapConflictResolution('TRANSFER_REPLACE')}
                            className={`p-3 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer ${
                              swapConflictResolution === 'TRANSFER_REPLACE'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <div className="font-black">
                              ۲. جایگزینی و فک تانکر قبلی به پارکینگ
                            </div>
                            <div className="text-[10px] opacity-90 mt-1">
                              تانکر {sourceTanker.tankerCode || sourceTanker.tankNumber} برود روی کامیون{' '}
                              {targetDriver?.fullName}، و تانکر قبلی آن ({targetMountedTanker.tankNumber})
                              آزاد شود
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تاریخ جابه‌جایی / تغییر
                    </label>
                    <DatePicker
                      value={swapDateObj}
                      onChange={setSwapDateObj}
                      calendar={persian}
                      locale={persian_fa}
                      format="YYYY/MM/DD"
                      inputClass={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      علت یا توضیحات جابه‌جایی (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={swapNote}
                      onChange={(e) => setSwapNote(e.target.value)}
                      placeholder="مثال: تعمیر کشنده قبلی / تعویض شیفت سرویس..."
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSwapModalTankerId(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                  >
                    <ArrowLeftRight size={16} />
                    <span>ثبت نهایی جابه‌جایی تانکر</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: TANKER TRANSFER HISTORY */}
      {historyModalTankerId && (() => {
        const unit = tankerUnits.find((u) => u.id === historyModalTankerId);
        if (!unit) return null;
        const historyList = unit.mountHistory || [];

        return (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8">
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History size={22} className="text-emerald-400" />
                  <div>
                    <h3 className="font-black text-base">
                      سوابق اتصال و جابه‌جایی تانکر کد {unit.tankerCode || '---'} (مخزن {unit.tankNumber})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      فهرست کامیون‌هایی که این تانکر روی آن‌ها بسته یا جابه‌جا شده است
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalTankerId(null)}
                  className="p-1.5 hover:bg-white/15 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
                {historyList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    هنوز سابقه جابه‌جایی برای این تانکر ثبت نشده است.
                  </div>
                ) : (
                  historyList.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-black text-[11px] ${
                            rec.actionType === 'SWAP'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : rec.actionType === 'TRANSFER'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                              : rec.actionType === 'UNMOUNT'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {rec.actionType === 'SWAP'
                            ? 'تعویض ضربدری بین دو کامیون'
                            : rec.actionType === 'TRANSFER'
                            ? 'انتقال به کامیون جدید'
                            : rec.actionType === 'UNMOUNT'
                            ? 'فک از کامیون'
                            : 'بستن اولیه روی کامیون'}
                        </span>
                        <span className="font-mono font-bold text-slate-500">{rec.date}</span>
                      </div>

                      <div className="text-slate-700 dark:text-slate-200 font-bold">
                        {rec.fromDriverName && (
                          <span>
                            از کامیون: {rec.fromDriverName} ({rec.fromTruckPlate || '---'}){' '}
                          </span>
                        )}
                        {rec.toDriverName && (
                          <span>
                            &larr; به کامیون: {rec.toDriverName} ({rec.toTruckPlate || '---'})
                          </span>
                        )}
                      </div>

                      {rec.note && <div className="text-slate-500">{rec.note}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: ADD / EDIT TANKER OWNER */}
      {showOwnerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus size={22} />
                <h3 className="font-black text-base sm:text-lg">
                  {editingOwnerId ? 'ویرایش مشخصات صاحب تانکر' : 'ثبت صاحب تانکر جدید'}
                </h3>
              </div>
              <button
                onClick={() => setShowOwnerModal(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOwner} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام و نام خانوادگی صاحب تانکر *
                  </label>
                  <input
                    type="text"
                    value={ownerForm.fullName}
                    onChange={(e) => setOwnerForm({ ...ownerForm, fullName: e.target.value })}
                    placeholder="مثال: حاج محمد کریمی"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره تماس
                  </label>
                  <input
                    type="text"
                    value={ownerForm.phone}
                    onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                    placeholder="0912..."
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    کد ملی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={ownerForm.nationalId}
                    onChange={(e) => setOwnerForm({ ...ownerForm, nationalId: e.target.value })}
                    placeholder="کد ملی ۱۰ رقمی"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام بانک و صاحب حساب
                  </label>
                  <input
                    type="text"
                    value={ownerForm.bankName}
                    onChange={(e) => setOwnerForm({ ...ownerForm, bankName: e.target.value })}
                    placeholder="مثال: بانک ملت - به نام محمد کریمی"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره کارت بانکی (۱۶ رقمی)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={ownerForm.cardNumber}
                    onChange={(e) => setOwnerForm({ ...ownerForm, cardNumber: e.target.value })}
                    placeholder="6037-..."
                    className={`${inputClasses} font-mono text-left`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره شبا (IR)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={ownerForm.shebaNumber}
                    onChange={(e) => setOwnerForm({ ...ownerForm, shebaNumber: e.target.value })}
                    placeholder="IR..."
                    className={`${inputClasses} font-mono text-left`}
                  />
                </div>
              </div>

              {/* Previous Balance Section */}
              <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <label className="block text-xs font-black text-purple-900 dark:text-purple-200">
                  مانده حساب قبلی صاحب تانکر (اختیاری)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOwnerForm({
                        ...ownerForm,
                        previousBalanceType: 'NONE',
                        previousBalanceAmount: ''
                      })
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      ownerForm.previousBalanceType === 'NONE'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    بدون مانده قبلی
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOwnerForm({ ...ownerForm, previousBalanceType: 'CREDITOR' })
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      ownerForm.previousBalanceType === 'CREDITOR'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    طلبکار از شرکت (طلب قبلی)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOwnerForm({ ...ownerForm, previousBalanceType: 'DEBTOR' })
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      ownerForm.previousBalanceType === 'DEBTOR'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    بدهکار به شرکت (بدهی قبلی)
                  </button>
                </div>

                {ownerForm.previousBalanceType !== 'NONE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        مبلغ حساب قبلی (تومان)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formatNumberInput(ownerForm.previousBalanceAmount)}
                        onChange={(e) =>
                          setOwnerForm({
                            ...ownerForm,
                            previousBalanceAmount: cleanNumberInput(e.target.value)
                          })
                        }
                        placeholder="مثال: 50,000,000"
                        className={`${inputClasses} font-mono font-bold text-left`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        توضیحات مانده قبلی
                      </label>
                      <input
                        type="text"
                        value={ownerForm.previousBalanceDescription}
                        onChange={(e) =>
                          setOwnerForm({
                            ...ownerForm,
                            previousBalanceDescription: e.target.value
                          })
                        }
                        placeholder="بابت..."
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOwnerModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  ذخیره اطلاعات صاحب تانکر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT TANKER UNIT & MOUNT ON TRUCK */}
      {showTankerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Container size={22} />
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    {editingTankerId
                      ? 'ویرایش کد مخصوص، شماره مخزن و کامیون متصل'
                      : 'تعریف تانکر جدید (کد مخصوص، شماره مخزن و اتصال به کامیون)'}
                  </h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    کد اختصاصی و شماره مخزن تانکر را وارد کنید و مشخص نمایید روی کدام کامیون بسته شده است
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTankerModal(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTankerUnit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Ownership Selection: Company Owned vs External Owner */}
              <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/25 border border-cyan-200 dark:border-cyan-800/60 space-y-3">
                <label className="block text-xs font-black text-cyan-950 dark:text-cyan-200">
                  نوع مالکیت تانکر را مشخص کنید:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setTankerForm({
                        ...tankerForm,
                        ownershipType: 'COMPANY_OWNED',
                        ownerId: 'COMPANY',
                        contractType: 'COMPANY_OWNED_NONE'
                      })
                    }
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      tankerForm.ownershipType === 'COMPANY_OWNED'
                        ? 'bg-cyan-700 text-white border-cyan-700 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
                      <Building2 size={17} />
                      <span>متعلق به شرکت خودمان (تانکر ملکی شرکت)</span>
                    </div>
                    <div className="text-[11px] opacity-85 mt-1">
                      تانکر مال شرکت خودمان است و روی کامیون بسته می‌شود
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTankerForm({
                        ...tankerForm,
                        ownershipType: 'EXTERNAL_OWNER',
                        ownerId: tankerOwners[0]?.id || '',
                        contractType:
                          tankerForm.contractType === 'COMPANY_OWNED_NONE'
                            ? 'PERCENTAGE_OF_FREIGHT'
                            : tankerForm.contractType
                      })
                    }
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      tankerForm.ownershipType === 'EXTERNAL_OWNER'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
                      <UserPlus size={17} />
                      <span>متعلق به صاحب تانکر دیگر (اشخاص / استیجاری)</span>
                    </div>
                    <div className="text-[11px] opacity-85 mt-1">
                      محاسبه سهم کرایه یا اجاره برای صاحب تانکر
                    </div>
                  </button>
                </div>

                {tankerForm.ownershipType === 'EXTERNAL_OWNER' && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      انتخاب صاحب تانکر *
                    </label>
                    <select
                      value={tankerForm.ownerId === 'COMPANY' ? '' : tankerForm.ownerId}
                      onChange={(e) => setTankerForm({ ...tankerForm, ownerId: e.target.value })}
                      className={inputClasses}
                      required
                    >
                      <option value="">انتخاب صاحب تانکر...</option>
                      {tankerOwners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step 1: Tanker Code & Tank Number (شماره مخزن و کد مخصوص تانکر) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                      کد مخصوص تانکر (جهت جستجوی سریع) *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setTankerForm({ ...tankerForm, tankerCode: generateNextTankerCode() })
                      }
                      className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      پیشنهاد کد خودکار
                    </button>
                  </div>
                  <input
                    type="text"
                    value={tankerForm.tankerCode}
                    onChange={(e) => setTankerForm({ ...tankerForm, tankerCode: e.target.value })}
                    placeholder="مثال: T-101 یا کد ۱"
                    className={`${inputClasses} font-mono font-black border-indigo-400 dark:border-indigo-600`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                    شماره مخزن / پلاک تانکر *
                  </label>
                  <input
                    type="text"
                    value={tankerForm.tankNumber}
                    onChange={(e) => setTankerForm({ ...tankerForm, tankNumber: e.target.value })}
                    placeholder="شماره مخزن (مثلاً 45892)"
                    className={`${inputClasses} font-mono font-bold`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ظرفیت مخزن (تن)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={tankerForm.capacityTons}
                    onChange={(e) =>
                      setTankerForm({ ...tankerForm, capacityTons: e.target.value })
                    }
                    placeholder="مثال: 24"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع تانکر / مخزن
                  </label>
                  <input
                    type="text"
                    value={tankerForm.tankType}
                    onChange={(e) => setTankerForm({ ...tankerForm, tankType: e.target.value })}
                    placeholder="مثال: ۴ محور صادراتی LPG"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره شاسی / سریال مخزن (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={tankerForm.serialOrChassis}
                    onChange={(e) =>
                      setTankerForm({ ...tankerForm, serialOrChassis: e.target.value })
                    }
                    placeholder="شماره شاسی تانکر"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اعتبار تست هیدرواستاتیک (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={tankerForm.hydroTestExpiry}
                    onChange={(e) =>
                      setTankerForm({ ...tankerForm, hydroTestExpiry: e.target.value })
                    }
                    placeholder="مثال: ۱۴۰۵/۰۶/۳۰"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Step 2: Mounting on Truck (کامیونی که تانکر روی آن بسته شده است) */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                    <Truck size={18} className="text-emerald-600" />
                    <span>وضعیت اتصال تانکر و کامیون (کشنده) حامل این تانکر</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['MOUNTED', 'STANDBY', 'MAINTENANCE'] as TankerMountStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTankerForm({ ...tankerForm, status: st })}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        tankerForm.status === st
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {MOUNT_STATUS_CONFIG[st].label}
                    </button>
                  ))}
                </div>

                {tankerForm.status === 'MOUNTED' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        انتخاب کامیون / راننده از لیست رانندگان سیستم (که این تانکر روی کامیونش بسته شده)
                      </label>
                      <select
                        value={tankerForm.assignedDriverId}
                        onChange={(e) => handleDriverSelectionInTankerForm(e.target.value)}
                        className={inputClasses}
                      >
                        <option value="">-- انتخاب از لیست کامیون‌ها و رانندگان ثبت‌شده --</option>
                        {drivers.map((drv) => (
                          <option key={drv.id} value={drv.id}>
                            {drv.fullName} — پلاک کامیون: {drv.plateNumber}{' '}
                            {drv.tankNumber ? `(شماره مخزن فعلی: ${drv.tankNumber})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نام راننده / صاحب کشنده
                      </label>
                      <input
                        type="text"
                        value={tankerForm.assignedDriverName}
                        onChange={(e) =>
                          setTankerForm({ ...tankerForm, assignedDriverName: e.target.value })
                        }
                        placeholder="نام راننده کامیون"
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        شماره پلاک کامیون (کشنده)
                      </label>
                      <input
                        type="text"
                        value={tankerForm.assignedTruckPlate}
                        onChange={(e) =>
                          setTankerForm({ ...tankerForm, assignedTruckPlate: e.target.value })
                        }
                        placeholder="مثال: ۱۲ ع ۳۴۵ ایران ۶۶"
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        تاریخ بستن تانکر روی کامیون
                      </label>
                      <DatePicker
                        value={mountedDateObj}
                        onChange={setMountedDateObj}
                        calendar={persian}
                        locale={persian_fa}
                        format="YYYY/MM/DD"
                        inputClass={inputClasses}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Financial Contract & Share Calculation (Only for External Owner) */}
              {tankerForm.ownershipType === 'EXTERNAL_OWNER' && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-4">
                  <h4 className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">
                    مدل محاسبه حق تانکر / سهم صاحب تانکر از بارهای این کامیون
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        'PERCENTAGE_OF_FREIGHT',
                        'PER_TON',
                        'PER_TRIP',
                        'FIXED_RENT'
                      ] as TankerContractType[]
                    ).map((ct) => (
                      <button
                        key={ct}
                        type="button"
                        onClick={() => setTankerForm({ ...tankerForm, contractType: ct })}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-right transition-all cursor-pointer ${
                          tankerForm.contractType === ct
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {CONTRACT_TYPE_LABELS[ct]}
                      </button>
                    ))}
                  </div>

                  {tankerForm.contractType === 'PERCENTAGE_OF_FREIGHT' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        درصد سهم صاحب تانکر از کل کرایه هر سرویس کامیون (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={tankerForm.sharePercentage}
                        onChange={(e) =>
                          setTankerForm({ ...tankerForm, sharePercentage: e.target.value })
                        }
                        placeholder="مثال: 25"
                        className={`${inputClasses} font-mono font-bold`}
                      />
                    </div>
                  )}

                  {tankerForm.contractType === 'PER_TON' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          مبلغ حق تانکر به ازای هر تن بار
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={formatNumberInput(tankerForm.ratePerTon)}
                          onChange={(e) =>
                            setTankerForm({
                              ...tankerForm,
                              ratePerTon: cleanNumberInput(e.target.value)
                            })
                          }
                          placeholder="مثال: 500,000 یا 10"
                          className={`${inputClasses} font-mono font-bold text-left`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          واحد ارز نرخ
                        </label>
                        <select
                          value={tankerForm.rateCurrency}
                          onChange={(e) =>
                            setTankerForm({
                              ...tankerForm,
                              rateCurrency: e.target.value as 'TOMAN' | 'USD' | 'AED'
                            })
                          }
                          className={inputClasses}
                        >
                          <option value="TOMAN">تومان (Toman)</option>
                          <option value="USD">دلار ($ USD)</option>
                          <option value="AED">درهم (AED)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {tankerForm.contractType === 'PER_TRIP' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          مبلغ حق تانکر به ازای هر سرویس
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={formatNumberInput(tankerForm.ratePerTrip)}
                          onChange={(e) =>
                            setTankerForm({
                              ...tankerForm,
                              ratePerTrip: cleanNumberInput(e.target.value)
                            })
                          }
                          placeholder="مثال: 12,000,000"
                          className={`${inputClasses} font-mono font-bold text-left`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          واحد ارز نرخ
                        </label>
                        <select
                          value={tankerForm.rateCurrency}
                          onChange={(e) =>
                            setTankerForm({
                              ...tankerForm,
                              rateCurrency: e.target.value as 'TOMAN' | 'USD' | 'AED'
                            })
                          }
                          className={inputClasses}
                        >
                          <option value="TOMAN">تومان (Toman)</option>
                          <option value="USD">دلار ($ USD)</option>
                          <option value="AED">درهم (AED)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {tankerForm.contractType === 'FIXED_RENT' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        مبلغ اجاره ثابت ماهانه توافقی (تومان)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formatNumberInput(tankerForm.fixedMonthlyRent)}
                        onChange={(e) =>
                          setTankerForm({
                            ...tankerForm,
                            fixedMonthlyRent: cleanNumberInput(e.target.value)
                          })
                        }
                        placeholder="مثال: 60,000,000"
                        className={`${inputClasses} font-mono font-bold text-left`}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات یا نکات فنی مخزن (اختیاری)
                </label>
                <input
                  type="text"
                  value={tankerForm.description}
                  onChange={(e) => setTankerForm({ ...tankerForm, description: e.target.value })}
                  placeholder="توضیحات..."
                  className={inputClasses}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTankerModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  ذخیره تانکر و اتصال به کامیون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LEDGER ENTRY (PAYMENT / MANUAL EARNING / EXPENSE) */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet size={22} />
                <h3 className="font-black text-base sm:text-lg">
                  ثبت سند مالی صاحب تانکر (واریزی / اجاره / هزینه تانکر)
                </h3>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLedgerEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    'PAYMENT_TO_OWNER',
                    'MANUAL_EARNING',
                    'TANKER_EXPENSE'
                  ] as TankerLedgerEntryType[]
                ).map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => setLedgerForm({ ...ledgerForm, entryType: et })}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      ledgerForm.entryType === et
                        ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500 shadow'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {LEDGER_ENTRY_LABELS[et].label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    صاحب تانکر *
                  </label>
                  <select
                    value={ledgerForm.ownerId}
                    onChange={(e) => {
                      const oid = e.target.value;
                      const owner = tankerOwners.find((o) => o.id === oid);
                      const firstUnit = tankerUnits.find((u) => u.ownerId === oid);
                      setLedgerForm({
                        ...ledgerForm,
                        ownerId: oid,
                        tankerId: firstUnit?.id || '',
                        cardNumber: owner?.cardNumber || '',
                        shebaNumber: owner?.shebaNumber || '',
                        bankName: owner?.bankName || ''
                      });
                    }}
                    className={inputClasses}
                    required
                  >
                    <option value="">انتخاب صاحب تانکر...</option>
                    {tankerOwners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تانکر مرتبط (اختیاری)
                  </label>
                  <select
                    value={ledgerForm.tankerId}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, tankerId: e.target.value })}
                    className={inputClasses}
                  >
                    <option value="">همه تانکرها / حساب کلی</option>
                    {tankerUnits
                      .filter((u) => u.ownerId === ledgerForm.ownerId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          تانکر {u.tankerCode ? `[${u.tankerCode}] ` : ''}
                          {u.tankNumber}{' '}
                          {u.assignedDriverName ? `(کامیون ${u.assignedDriverName})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاریخ ثبت
                  </label>
                  <DatePicker
                    value={ledgerDateObj}
                    onChange={setLedgerDateObj}
                    calendar={persian}
                    locale={persian_fa}
                    format="YYYY/MM/DD"
                    inputClass={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    واحد ارز مبنا
                  </label>
                  <select
                    value={ledgerForm.currency}
                    onChange={(e) =>
                      handleLedgerForeignChange(
                        ledgerForm.foreignAmount,
                        e.target.value as 'TOMAN' | 'USD' | 'AED',
                        ledgerForm.exchangeRate,
                        ledgerForm.exchangeRateUSD_AED
                      )
                    }
                    className={inputClasses}
                  >
                    <option value="TOMAN">تومان (Toman)</option>
                    <option value="USD">دلار ($ USD)</option>
                    <option value="AED">درهم (AED)</option>
                  </select>
                </div>
              </div>

              {ledgerForm.currency !== 'TOMAN' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مبلغ ارزی ({ledgerForm.currency === 'USD' ? 'دلار' : 'درهم'})
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formatNumberInput(ledgerForm.foreignAmount)}
                      onChange={(e) =>
                        handleLedgerForeignChange(
                          e.target.value,
                          ledgerForm.currency,
                          ledgerForm.exchangeRate,
                          ledgerForm.exchangeRateUSD_AED
                        )
                      }
                      className={`${inputClasses} font-mono font-bold text-left`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نرخ تبدیل دلار به تومان
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formatNumberInput(ledgerForm.exchangeRate)}
                      onChange={(e) =>
                        handleLedgerForeignChange(
                          ledgerForm.foreignAmount,
                          ledgerForm.currency,
                          e.target.value,
                          ledgerForm.exchangeRateUSD_AED
                        )
                      }
                      className={`${inputClasses} font-mono font-bold text-left`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مبلغ نهایی به تومان *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formatNumberInput(ledgerForm.amount)}
                  onChange={(e) =>
                    setLedgerForm({ ...ledgerForm, amount: cleanNumberInput(e.target.value) })
                  }
                  placeholder="مثال: 35,000,000"
                  className={`${inputClasses} font-mono font-black text-left text-base`}
                  required
                />
                {parseFloat(ledgerForm.amount) > 0 && (
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                    معادل: {numberToPersianWords(parseFloat(ledgerForm.amount))}
                  </p>
                )}
              </div>

              {ledgerForm.entryType === 'PAYMENT_TO_OWNER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شماره پیگیری / فیش واریزی
                    </label>
                    <input
                      type="text"
                      value={ledgerForm.trackingCode}
                      onChange={(e) =>
                        setLedgerForm({ ...ledgerForm, trackingCode: e.target.value })
                      }
                      placeholder="شماره مرجع بانکی"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      بانک / شماره کارت مقصد
                    </label>
                    <input
                      type="text"
                      value={ledgerForm.bankName}
                      onChange={(e) => setLedgerForm({ ...ledgerForm, bankName: e.target.value })}
                      placeholder="نام بانک"
                      className={inputClasses}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شرح و توضیحات سند
                </label>
                <input
                  type="text"
                  value={ledgerForm.description}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })}
                  placeholder="مثال: واریز علی‌الحساب بابت حق تانکر / تعویض لاستیک تانکر..."
                  className={inputClasses}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg cursor-pointer"
                >
                  ثبت سند مالی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAILED PRINTABLE STATEMENT FOR A TANKER OWNER */}
      {statementOwnerId && (() => {
        const owner = tankerOwners.find((o) => o.id === statementOwnerId);
        if (!owner) return null;
        const fin = ownerFinancialsMap[owner.id];
        const ownerUnits = tankerUnits.filter((u) => u.ownerId === owner.id);
        const ownerLoads = ownerUnits.flatMap((u) =>
          (tankerCalculatedLoadsMap[u.id]?.loads || []).map((l) => ({
            ...l,
            tankNumber: u.tankerCode ? `[${u.tankerCode}] ${u.tankNumber}` : u.tankNumber
          }))
        );
        const ownerEntries = tankerLedgerEntries.filter((e) => e.ownerId === owner.id);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden my-8">
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                  <FileText size={22} className="text-indigo-400" />
                  <h3 className="font-black text-base sm:text-lg">
                    صورت‌حساب جامع صاحب تانکر: {owner.fullName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>چاپ صورت‌حساب</span>
                  </button>
                  <button
                    onClick={() => setStatementOwnerId(null)}
                    className="p-1.5 hover:bg-white/15 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      صورت‌حساب کارکرد تانکرها و وضعیت مالی — {owner.fullName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      تلفن: {owner.phone || '---'} | کارت: {owner.cardNumber || '---'} | شبا:{' '}
                      {owner.shebaNumber || '---'}
                    </p>
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-slate-500">
                      تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}
                    </div>
                    <div
                      className={`text-lg font-black font-mono mt-1 ${
                        fin.netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'
                      }`}
                      dir="ltr"
                    >
                      مانده نهایی: {Math.abs(fin.netBalance).toLocaleString()} T (
                      {fin.netBalance >= 0 ? 'طلبکار' : 'بدهکار'})
                    </div>
                  </div>
                </div>

                {/* Connected Tankers Summary */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">
                    ۱. تانکرهای متعلق به ایشان و کامیون‌های متصل:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ownerUnits.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-black">
                            تانکر کد {u.tankerCode || '---'} (مخزن {u.tankNumber})
                          </span>{' '}
                          ({u.tankType})
                          <div className="text-slate-500 mt-0.5">
                            کامیون متصل: {u.assignedDriverName || '---'} | پلاک:{' '}
                            {u.assignedTruckPlate || '---'}
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600">
                          {MOUNT_STATUS_CONFIG[u.status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loads Table */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">
                    ۲. ریز سرویس‌ها و بارهای کامیون‌های متصل ({ownerLoads.length} سرویس):
                  </h4>
                  <table className="w-full text-right text-xs border border-slate-200 dark:border-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 border">تاریخ</th>
                        <th className="p-2 border">تانکر</th>
                        <th className="p-2 border">کامیون / راننده</th>
                        <th className="p-2 border">وزن (تن)</th>
                        <th className="p-2 border">فرمول محاسبه</th>
                        <th className="p-2 border">سهم تانکر (تومان)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerLoads.map((l) => (
                        <tr key={l.id}>
                          <td className="p-2 border font-mono">{l.date}</td>
                          <td className="p-2 border font-mono font-bold">{l.tankNumber}</td>
                          <td className="p-2 border">
                            {l.driverName} ({l.plateNumber})
                          </td>
                          <td className="p-2 border font-mono">{l.volume}</td>
                          <td className="p-2 border">{l.formulaText}</td>
                          <td className="p-2 border font-mono font-bold" dir="ltr">
                            {l.tankerShareToman.toLocaleString()} T
                          </td>
                        </tr>
                      ))}
                      {ownerLoads.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            سرویسی ثبت نشده است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payments & Expenses Table */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">
                    ۳. ریز واریزی‌ها، اجاره‌های دستی و هزینه‌های تانکر:
                  </h4>
                  <table className="w-full text-right text-xs border border-slate-200 dark:border-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 border">تاریخ</th>
                        <th className="p-2 border">نوع سند</th>
                        <th className="p-2 border">مبلغ (تومان)</th>
                        <th className="p-2 border">شماره پیگیری / توضیحات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerEntries.map((e) => (
                        <tr key={e.id}>
                          <td className="p-2 border font-mono">{e.date}</td>
                          <td className="p-2 border font-bold">
                            {LEDGER_ENTRY_LABELS[e.entryType].label}
                          </td>
                          <td className="p-2 border font-mono font-bold" dir="ltr">
                            {e.amount.toLocaleString()} T
                          </td>
                          <td className="p-2 border">
                            {e.trackingCode ? `[کد: ${e.trackingCode}] ` : ''}
                            {e.description}
                          </td>
                        </tr>
                      ))}
                      {ownerEntries.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            سندی ثبت نشده است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TankerOwnersManager;
