import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  TruckOwner,
  OwnedTruckUnit,
  TruckOwnerLedgerEntry,
  TruckOwnerFreightMode,
  TruckOwnerLedgerEntryType,
  DriverPreviousBalanceType,
  Tab
} from '../types';
import {
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
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileText,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Container,
  History,
  Layers
} from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { formatNumberInput, cleanNumberInput, numberToPersianWords } from '../utils/numberUtils';

const FREIGHT_MODE_LABELS: Record<TruckOwnerFreightMode, string> = {
  FULL_TO_OWNER: 'واریز کامل کرایه به حساب صاحب کامیون (۱۰۰٪ کرایه)',
  PERCENTAGE_OF_FREIGHT: 'درصدی از کرایه هر سرویس برای صاحب کامیون',
  PER_TON: 'مبلغ مشخص به ازای هر تن بار برای صاحب کامیون',
  MANUAL_ONLY: 'ثبت دستی کرایه و برداشت‌ها'
};

const TRUCK_LEDGER_LABELS: Record<
  TruckOwnerLedgerEntryType,
  { label: string; shortLabel: string; badgeClass: string; isCreditForOwner: boolean }
> = {
  FREIGHT_DEPOSIT_TO_OWNER: {
    label: 'واریز کرایه به حساب صاحب کامیون',
    shortLabel: 'واریز کرایه',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
    isCreditForOwner: false
  },
  OWNER_WITHDRAWAL: {
    label: 'برداشت وجه / مساعده توسط صاحب کامیون',
    shortLabel: 'برداشت صاحب کامیون',
    badgeClass: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
    isCreditForOwner: false
  },
  TRUCK_EXPENSE_FOR_OWNER: {
    label: 'هزینه کامیون (لاستیک/تعمیرات/بیمه) به حساب صاحب کامیون',
    shortLabel: 'هزینه کامیون',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    isCreditForOwner: false
  },
  MANUAL_CREDIT: {
    label: 'ثبت کرایه / بستانکاری دستی برای صاحب کامیون',
    shortLabel: 'بستانکاری دستی',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
    isCreditForOwner: true
  }
};

interface TruckOwnersManagerProps {
  onNavigate?: (tab: Tab) => void;
}

const TruckOwnersManager: React.FC<TruckOwnersManagerProps> = ({ onNavigate }) => {
  const {
    truckOwners,
    ownedTruckUnits,
    truckOwnerLedgerEntries,
    drivers,
    transactions,
    freights,
    purchases,
    exchangeRates,
    addTruckOwner,
    updateTruckOwner,
    deleteTruckOwner,
    addOwnedTruckUnit,
    updateOwnedTruckUnit,
    deleteOwnedTruckUnit,
    addTruckOwnerLedgerEntry,
    deleteTruckOwnerLedgerEntry
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'owners' | 'trucks_and_loads' | 'ledger'>('owners');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);

  const [showTruckUnitModal, setShowTruckUnitModal] = useState(false);
  const [editingTruckUnitId, setEditingTruckUnitId] = useState<string | null>(null);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [statementOwnerId, setStatementOwnerId] = useState<string | null>(null);

  // Owner Form
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

  // Owned Truck Unit Form
  const [truckUnitForm, setTruckUnitForm] = useState({
    ownerId: '',
    driverId: '',
    driverName: '',
    plateNumber: '',
    truckModel: 'کشنده ولوو FH500',
    tankNumber: '',
    freightMode: 'FULL_TO_OWNER' as TruckOwnerFreightMode,
    ownerSharePercentage: '100',
    ratePerTon: '',
    rateCurrency: 'TOMAN' as 'TOMAN' | 'USD' | 'AED',
    depositFreightToOwnerAccount: true,
    syncBankInfoToDriver: true,
    description: ''
  });

  // Ledger Entry Form (Deposit Freight / Owner Withdrawal / Expense)
  const [ledgerForm, setLedgerForm] = useState({
    ownerId: '',
    truckUnitId: '',
    driverId: '',
    selectedLoadId: '',
    entryType: 'FREIGHT_DEPOSIT_TO_OWNER' as TruckOwnerLedgerEntryType,
    amount: '',
    currency: 'TOMAN' as 'TOMAN' | 'USD' | 'AED',
    foreignAmount: '',
    exchangeRate: exchangeRates.usd ? exchangeRates.usd.toString() : '60000',
    exchangeRateUSD_AED: exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67',
    trackingCode: '',
    billOfLading: '',
    cardNumber: '',
    shebaNumber: '',
    bankName: '',
    alsoRecordInDriverPayments: true,
    description: ''
  });
  const [ledgerDateObj, setLedgerDateObj] = useState<DateObject | null>(
    new DateObject({ calendar: persian, locale: persian_fa })
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const convertToToman = (amount: number, currency?: 'TOMAN' | 'USD' | 'AED') => {
    const usdRate = exchangeRates.usd || 60000;
    const usdAed = exchangeRates.usdAed || 3.67;
    if (!currency || currency === 'TOMAN') return Math.round(amount);
    if (currency === 'USD') return Math.round(amount * usdRate);
    if (currency === 'AED') return Math.round((amount / (usdAed || 3.67)) * usdRate);
    return Math.round(amount);
  };

  // Calculate all loads/freights for each OwnedTruckUnit
  const truckUnitLoadsMap = useMemo(() => {
    const map: Record<
      string,
      {
        loads: Array<{
          id: string;
          date: string;
          driverName: string;
          plateNumber: string;
          volume: number;
          totalTruckFreightToman: number;
          ownerFreightShareToman: number;
          formulaText: string;
          billOfLading?: string;
          description: string;
        }>;
        totalTrips: number;
        totalVolume: number;
        totalOwnerShareToman: number;
      }
    > = {};

    ownedTruckUnits.forEach((unit) => {
      map[unit.id] = { loads: [], totalTrips: 0, totalVolume: 0, totalOwnerShareToman: 0 };
      if (!unit.driverId || unit.freightMode === 'MANUAL_ONLY') return;

      const drv = drivers.find((d) => d.id === unit.driverId);
      const driverName = drv?.fullName || unit.driverName || 'نامشخص';
      const plateNumber = drv?.plateNumber || unit.plateNumber || '---';

      const driverTxs = transactions.filter((t) => t.driverId === unit.driverId);
      const driverFreights = freights.filter((f) => f.driverId === unit.driverId);
      const driverPurchases = purchases.filter(
        (p) => p.driverId === unit.driverId && !p.linkedTransactionId
      );

      const computeOwnerShare = (volume: number, truckFreightToman: number) => {
        if (unit.freightMode === 'FULL_TO_OWNER') {
          return {
            share: truckFreightToman,
            formulaText: '۱۰۰٪ کرایه کامیون (واریز به صاحب کامیون)'
          };
        }
        if (unit.freightMode === 'PERCENTAGE_OF_FREIGHT') {
          const pct = unit.ownerSharePercentage || 100;
          const share = Math.round((truckFreightToman * pct) / 100);
          return {
            share,
            formulaText: `${pct}% از کل کرایه کامیون (${truckFreightToman.toLocaleString()} T)`
          };
        }
        if (unit.freightMode === 'PER_TON') {
          const rate = unit.ratePerTon || 0;
          const cur = unit.rateCurrency || 'TOMAN';
          const share = convertToToman(volume * rate, cur);
          return {
            share,
            formulaText: `${volume} تن × ${rate.toLocaleString()} ${
              cur === 'USD' ? '$' : cur === 'AED' ? 'AED' : 'تومان'
            }`
          };
        }
        return { share: 0, formulaText: 'ثبت دستی' };
      };

      driverTxs.forEach((tx) => {
        const vol = tx.volume || 0;
        const freightToman = tx.freightPrice || 0;
        const { share, formulaText } = computeOwnerShare(vol, freightToman);
        map[unit.id].loads.push({
          id: `tx-${tx.id}`,
          date: tx.date,
          driverName,
          plateNumber,
          volume: vol,
          totalTruckFreightToman: freightToman,
          ownerFreightShareToman: share,
          formulaText,
          billOfLading: tx.billOfLading || tx.scaleTicketNo,
          description: tx.description || 'ورود گاز'
        });
      });

      driverFreights.forEach((fr) => {
        const vol = fr.volume || 0;
        const freightToman = fr.amount || 0;
        const { share, formulaText } = computeOwnerShare(vol, freightToman);
        map[unit.id].loads.push({
          id: `fr-${fr.id}`,
          date: fr.date,
          driverName,
          plateNumber,
          volume: vol,
          totalTruckFreightToman: freightToman,
          ownerFreightShareToman: share,
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
        const { share, formulaText } = computeOwnerShare(vol, freightToman);
        map[unit.id].loads.push({
          id: `pu-${pu.id}`,
          date: pu.date,
          driverName,
          plateNumber,
          volume: vol,
          totalTruckFreightToman: freightToman,
          ownerFreightShareToman: share,
          formulaText,
          billOfLading: pu.scaleTicketNo,
          description: pu.description || 'بارگیری از شرکت'
        });
      });

      map[unit.id].totalTrips = map[unit.id].loads.length;
      map[unit.id].totalVolume = map[unit.id].loads.reduce((s, l) => s + (l.volume || 0), 0);
      map[unit.id].totalOwnerShareToman = map[unit.id].loads.reduce(
        (s, l) => s + (l.ownerFreightShareToman || 0),
        0
      );
    });

    return map;
  }, [ownedTruckUnits, drivers, transactions, freights, purchases, exchangeRates]);

  // Financial summary per TruckOwner
  const ownerFinancialsMap = useMemo(() => {
    const map: Record<
      string,
      {
        prevCredit: number;
        prevDebit: number;
        autoFreightEarnings: number;
        manualCredits: number;
        totalFreightDeposited: number;
        totalOwnerWithdrawals: number;
        totalTruckExpenses: number;
        totalTrips: number;
        totalVolume: number;
        trucksCount: number;
        netBalance: number; // > 0 owner is creditor (طلبکار از ما), < 0 owner is debtor (بدهکار به ما / اضافه برداشت)
      }
    > = {};

    truckOwners.forEach((owner) => {
      const prevCredit =
        owner.previousBalanceType === 'CREDITOR' ? owner.previousBalanceAmount || 0 : 0;
      const prevDebit =
        owner.previousBalanceType === 'DEBTOR' ? owner.previousBalanceAmount || 0 : 0;

      const ownerUnits = ownedTruckUnits.filter((u) => u.ownerId === owner.id);
      let autoFreightEarnings = 0;
      let totalTrips = 0;
      let totalVolume = 0;

      ownerUnits.forEach((u) => {
        const calc = truckUnitLoadsMap[u.id];
        if (calc) {
          autoFreightEarnings += calc.totalOwnerShareToman;
          totalTrips += calc.totalTrips;
          totalVolume += calc.totalVolume;
        }
      });

      const entries = truckOwnerLedgerEntries.filter((e) => e.ownerId === owner.id);
      const manualCredits = entries
        .filter((e) => e.entryType === 'MANUAL_CREDIT')
        .reduce((s, e) => s + (e.amount || 0), 0);
      const totalFreightDeposited = entries
        .filter((e) => e.entryType === 'FREIGHT_DEPOSIT_TO_OWNER')
        .reduce((s, e) => s + (e.amount || 0), 0);
      const totalOwnerWithdrawals = entries
        .filter((e) => e.entryType === 'OWNER_WITHDRAWAL')
        .reduce((s, e) => s + (e.amount || 0), 0);
      const totalTruckExpenses = entries
        .filter((e) => e.entryType === 'TRUCK_EXPENSE_FOR_OWNER')
        .reduce((s, e) => s + (e.amount || 0), 0);

      const netBalance =
        prevCredit +
        autoFreightEarnings +
        manualCredits -
        (prevDebit + totalFreightDeposited + totalOwnerWithdrawals + totalTruckExpenses);

      map[owner.id] = {
        prevCredit,
        prevDebit,
        autoFreightEarnings,
        manualCredits,
        totalFreightDeposited,
        totalOwnerWithdrawals,
        totalTruckExpenses,
        totalTrips,
        totalVolume,
        trucksCount: ownerUnits.length,
        netBalance
      };
    });

    return map;
  }, [truckOwners, ownedTruckUnits, truckOwnerLedgerEntries, truckUnitLoadsMap]);

  const globalStats = useMemo(() => {
    const totalOwners = truckOwners.length;
    const totalTrucks = ownedTruckUnits.length;
    let totalFreightEarned = 0;
    let totalDeposited = 0;
    let totalWithdrawals = 0;
    let totalNetBalance = 0;

    Object.values(ownerFinancialsMap).forEach((fin) => {
      totalFreightEarned += fin.autoFreightEarnings + fin.manualCredits;
      totalDeposited += fin.totalFreightDeposited;
      totalWithdrawals += fin.totalOwnerWithdrawals + fin.totalTruckExpenses;
      totalNetBalance += fin.netBalance;
    });

    return {
      totalOwners,
      totalTrucks,
      totalFreightEarned,
      totalDeposited,
      totalWithdrawals,
      totalNetBalance
    };
  }, [truckOwners, ownedTruckUnits, ownerFinancialsMap]);

  // Handlers for Truck Owner Modal
  const handleOpenOwnerModal = (owner?: TruckOwner) => {
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
      showToast('error', 'لطفاً نام و نام خانوادگی صاحب کامیون را وارد کنید.');
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
      updateTruckOwner(editingOwnerId, payload);
      showToast('success', 'اطلاعات صاحب کامیون ویرایش شد.');
    } else {
      addTruckOwner(payload);
      showToast('success', 'صاحب کامیون جدید با موفقیت ثبت شد.');
    }
    setShowOwnerModal(false);
  };

  // Handlers for Owned Truck Unit Modal
  const handleOpenTruckUnitModal = (unit?: OwnedTruckUnit, preselectedOwnerId?: string) => {
    if (unit) {
      setEditingTruckUnitId(unit.id);
      setTruckUnitForm({
        ownerId: unit.ownerId,
        driverId: unit.driverId || '',
        driverName: unit.driverName,
        plateNumber: unit.plateNumber,
        truckModel: unit.truckModel || 'کشنده ولوو FH500',
        tankNumber: unit.tankNumber || '',
        freightMode: unit.freightMode,
        ownerSharePercentage: unit.ownerSharePercentage
          ? unit.ownerSharePercentage.toString()
          : '100',
        ratePerTon: unit.ratePerTon ? unit.ratePerTon.toString() : '',
        rateCurrency: unit.rateCurrency || 'TOMAN',
        depositFreightToOwnerAccount: unit.depositFreightToOwnerAccount !== false,
        syncBankInfoToDriver: unit.syncBankInfoToDriver !== false,
        description: unit.description || ''
      });
    } else {
      setEditingTruckUnitId(null);
      setTruckUnitForm({
        ownerId: preselectedOwnerId || truckOwners[0]?.id || '',
        driverId: '',
        driverName: '',
        plateNumber: '',
        truckModel: 'کشنده ولوو FH500',
        tankNumber: '',
        freightMode: 'FULL_TO_OWNER',
        ownerSharePercentage: '100',
        ratePerTon: '',
        rateCurrency: 'TOMAN',
        depositFreightToOwnerAccount: true,
        syncBankInfoToDriver: true,
        description: ''
      });
    }
    setShowTruckUnitModal(true);
  };

  const handleSelectDriverForTruckUnit = (driverId: string) => {
    const drv = drivers.find((d) => d.id === driverId);
    if (drv) {
      setTruckUnitForm((prev) => ({
        ...prev,
        driverId: drv.id,
        driverName: drv.fullName,
        plateNumber: drv.plateNumber,
        tankNumber: drv.tankNumber || prev.tankNumber
      }));
    } else {
      setTruckUnitForm((prev) => ({
        ...prev,
        driverId: ''
      }));
    }
  };

  const handleSaveTruckUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckUnitForm.ownerId) {
      showToast('error', 'لطفاً صاحب کامیون را انتخاب کنید.');
      return;
    }
    if (!truckUnitForm.plateNumber.trim() && !truckUnitForm.driverId) {
      showToast('error', 'لطفاً کامیون/راننده را انتخاب کنید یا شماره پلاک را وارد نمایید.');
      return;
    }

    const owner = truckOwners.find((o) => o.id === truckUnitForm.ownerId);
    const drv = drivers.find((d) => d.id === truckUnitForm.driverId);

    const payload: Omit<OwnedTruckUnit, 'id' | 'createdAt'> = {
      ownerId: truckUnitForm.ownerId,
      ownerName: owner?.fullName || 'نامشخص',
      driverId: truckUnitForm.driverId || undefined,
      driverName: drv?.fullName || truckUnitForm.driverName.trim() || 'راننده کامیون',
      plateNumber: drv?.plateNumber || truckUnitForm.plateNumber.trim(),
      truckModel: truckUnitForm.truckModel.trim(),
      tankNumber: drv?.tankNumber || truckUnitForm.tankNumber.trim(),
      freightMode: truckUnitForm.freightMode,
      ownerSharePercentage:
        truckUnitForm.freightMode === 'FULL_TO_OWNER'
          ? 100
          : parseFloat(cleanNumberInput(truckUnitForm.ownerSharePercentage)) || 100,
      ratePerTon:
        truckUnitForm.freightMode === 'PER_TON'
          ? parseFloat(cleanNumberInput(truckUnitForm.ratePerTon)) || 0
          : undefined,
      rateCurrency: truckUnitForm.rateCurrency,
      depositFreightToOwnerAccount: truckUnitForm.depositFreightToOwnerAccount,
      syncBankInfoToDriver: truckUnitForm.syncBankInfoToDriver,
      description: truckUnitForm.description.trim()
    };

    if (editingTruckUnitId) {
      updateOwnedTruckUnit(editingTruckUnitId, payload);
      showToast('success', 'اطلاعات کامیون و نحوه تسویه کرایه با صاحب کامیون بروزرسانی شد.');
    } else {
      addOwnedTruckUnit(payload);
      showToast('success', 'کامیون به صاحب کامیون متصل شد و تنظیمات واریز کرایه ذخیره گردید.');
    }
    setShowTruckUnitModal(false);
  };

  // Handlers for Ledger Modal (Freight Deposit / Withdrawal / Expense)
  const handleOpenLedgerModal = (
    preselectedOwnerId?: string,
    preselectedEntryType: TruckOwnerLedgerEntryType = 'FREIGHT_DEPOSIT_TO_OWNER',
    preselectedTruckUnitId?: string
  ) => {
    const targetOwnerId = preselectedOwnerId || truckOwners[0]?.id || '';
    const owner = truckOwners.find((o) => o.id === targetOwnerId);
    const ownerUnits = ownedTruckUnits.filter((u) => u.ownerId === targetOwnerId);
    const defaultUnit =
      ownerUnits.find((u) => u.id === preselectedTruckUnitId) || ownerUnits[0];

    setLedgerForm({
      ownerId: targetOwnerId,
      truckUnitId: defaultUnit?.id || '',
      driverId: defaultUnit?.driverId || '',
      selectedLoadId: '',
      entryType: preselectedEntryType,
      amount: '',
      currency: 'TOMAN',
      foreignAmount: '',
      exchangeRate: exchangeRates.usd ? exchangeRates.usd.toString() : '60000',
      exchangeRateUSD_AED: exchangeRates.usdAed ? exchangeRates.usdAed.toString() : '3.67',
      trackingCode: '',
      billOfLading: '',
      cardNumber: owner?.cardNumber || '',
      shebaNumber: owner?.shebaNumber || '',
      bankName: owner?.bankName || '',
      alsoRecordInDriverPayments: true,
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
      showToast('error', 'انتخاب صاحب کامیون و وارد کردن مبلغ معتبر الزامی است.');
      return;
    }

    const selectedUnit = ownedTruckUnits.find((u) => u.id === ledgerForm.truckUnitId);

    addTruckOwnerLedgerEntry({
      ownerId: ledgerForm.ownerId,
      truckUnitId: ledgerForm.truckUnitId || undefined,
      driverId: selectedUnit?.driverId || ledgerForm.driverId || undefined,
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
      billOfLading: ledgerForm.billOfLading.trim() || undefined,
      cardNumber: ledgerForm.cardNumber.trim() || undefined,
      shebaNumber: ledgerForm.shebaNumber.trim() || undefined,
      bankName: ledgerForm.bankName.trim() || undefined,
      alsoRecordInDriverPayments: ledgerForm.alsoRecordInDriverPayments,
      description:
        ledgerForm.description.trim() || TRUCK_LEDGER_LABELS[ledgerForm.entryType].label
    });

    showToast(
      'success',
      ledgerForm.entryType === 'FREIGHT_DEPOSIT_TO_OWNER'
        ? 'واریز کرایه به حساب صاحب کامیون با موفقیت ثبت شد.'
        : ledgerForm.entryType === 'OWNER_WITHDRAWAL'
        ? 'برداشت صاحب کامیون با موفقیت ثبت شد.'
        : 'سند مالی صاحب کامیون ثبت شد.'
    );
    setShowLedgerModal(false);
  };

  const filteredOwners = useMemo(() => {
    return truckOwners.filter((owner) => {
      if (filterOwnerId !== 'ALL' && owner.id !== filterOwnerId) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const units = ownedTruckUnits.filter((u) => u.ownerId === owner.id);
      const matchesTruck = units.some(
        (u) =>
          u.driverName.toLowerCase().includes(q) ||
          u.plateNumber.toLowerCase().includes(q) ||
          (u.truckModel || '').toLowerCase().includes(q)
      );
      return (
        owner.fullName.toLowerCase().includes(q) ||
        (owner.phone || '').includes(q) ||
        matchesTruck
      );
    });
  }, [truckOwners, ownedTruckUnits, filterOwnerId, searchTerm]);

  const inputClasses =
    'w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all';

  return (
    <div className="space-y-6">
      {/* Top Switcher Bar between Truck Owners & Tanker Owners */}
      {onNavigate && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('truck-owners')}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Truck size={18} />
              <span>مدیریت صاحبین کامیون‌ها (واریز کرایه و برداشت)</span>
            </button>
            <button
              onClick={() => onNavigate('tanker-owners')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Container size={18} />
              <span>مدیریت صاحبین تانکرها (تانکرهای بسته شده روی کامیون)</span>
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden md:inline">
            مدیریت یکپارچه مالکین ناوگان (کامیون و تانکر)
          </span>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-blue-500/20 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-blue-300">
              <Truck size={30} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                مدیریت صاحبین کامیون‌ها (واریز کرایه به صاحب کامیون و ثبت برداشت‌ها)
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/80 mt-1">
                اختصاص کامیون‌ها و رانندگان به صاحب کامیون، واریز کرایه بارها به حساب صاحب کامیون، ثبت برداشت‌های دستی و مشاهده تراز مالی
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => handleOpenOwnerModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <UserPlus size={18} />
              <span>+ ثبت صاحب کامیون جدید</span>
            </button>

            <button
              onClick={() => handleOpenTruckUnitModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Link2 size={18} />
              <span>+ اتصال کامیون به صاحب کامیون</span>
            </button>

            <button
              onClick={() => handleOpenLedgerModal(undefined, 'FREIGHT_DEPOSIT_TO_OWNER')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
            >
              <CreditCard size={18} />
              <span>واریز کرایه به صاحب کامیون</span>
            </button>

            <button
              onClick={() => handleOpenLedgerModal(undefined, 'OWNER_WITHDRAWAL')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Wallet size={18} />
              <span>ثبت برداشت صاحب کامیون</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-[11px] text-blue-200">صاحبین کامیون / کامیون‌ها</div>
            <div className="text-lg font-black mt-1">
              {globalStats.totalOwners} نفر{' '}
              <span className="text-xs font-normal text-blue-300">
                ({globalStats.totalTrucks} دستگاه کامیون)
              </span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-3.5">
            <div className="text-[11px] text-emerald-200">مجموع کرایه بارها (سهم صاحبین)</div>
            <div className="text-lg font-black text-emerald-300 mt-1 font-mono" dir="ltr">
              {globalStats.totalFreightEarned.toLocaleString()} T
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-3.5">
            <div className="text-[11px] text-blue-200">کرایه واریزشده به حساب صاحبین</div>
            <div className="text-lg font-black text-sky-300 mt-1 font-mono" dir="ltr">
              {globalStats.totalDeposited.toLocaleString()} T
            </div>
          </div>

          <div className="bg-rose-500/10 border border-rose-400/20 rounded-xl p-3.5">
            <div className="text-[11px] text-rose-200">برداشت‌ها و هزینه‌های صاحبین</div>
            <div className="text-lg font-black text-rose-300 mt-1 font-mono" dir="ltr">
              {globalStats.totalWithdrawals.toLocaleString()} T
            </div>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-xl p-3.5 col-span-2 md:col-span-1">
            <div className="text-[11px] text-amber-200">تراز کل حساب صاحبین کامیون</div>
            <div
              className={`text-lg font-black mt-1 font-mono ${
                globalStats.totalNetBalance >= 0 ? 'text-amber-300' : 'text-rose-300'
              }`}
              dir="ltr"
            >
              {Math.abs(globalStats.totalNetBalance).toLocaleString()} T
            </div>
            <div className="text-[10px] text-blue-200 mt-0.5">
              {globalStats.totalNetBalance > 0
                ? 'طلب صاحبین کامیون از شرکت'
                : globalStats.totalNetBalance < 0
                ? 'بدهی / اضافه برداشت صاحبین کامیون'
                : 'تسویه کامل'}
            </div>
          </div>
        </div>
      </div>

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

      {/* Sub-Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('owners')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'owners'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Truck size={17} />
            <span>کارت صاحبین کامیون‌ها و کامیون‌های تحت مالکیت ({truckOwners.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('trucks_and_loads')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'trucks_and_loads'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers size={17} />
            <span>جدول کامیون‌ها و ریز کرایه سرویس‌ها ({ownedTruckUnits.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText size={17} />
            <span>دفتر واریز کرایه و برداشت‌های صاحبین کامیون ({truckOwnerLedgerEntries.length})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select
            value={filterOwnerId}
            onChange={(e) => setFilterOwnerId(e.target.value)}
            className="w-full sm:w-48 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">همه صاحبین کامیون</option>
            {truckOwners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجوی صاحب کامیون، پلاک، راننده..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* SUB-TAB 1: TRUCK OWNERS CARDS */}
      {activeSubTab === 'owners' && (
        <div className="space-y-5">
          {filteredOwners.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <Truck size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                هنوز صاحب کامیونی ثبت نشده است
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                مشخصات صاحبین کامیون‌ها (که کرایه بارها به حساب آن‌ها واریز می‌شود یا از حساب شرکت برداشت انجام می‌دهند) را ثبت کنید و کامیون‌های تحت مالکیت آن‌ها را مشخص نمایید.
              </p>
              <button
                onClick={() => handleOpenOwnerModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <UserPlus size={18} />
                <span>ثبت اولین صاحب کامیون</span>
              </button>
            </div>
          ) : (
            filteredOwners.map((owner) => {
              const fin = ownerFinancialsMap[owner.id] || {
                prevCredit: 0,
                prevDebit: 0,
                autoFreightEarnings: 0,
                manualCredits: 0,
                totalFreightDeposited: 0,
                totalOwnerWithdrawals: 0,
                totalTruckExpenses: 0,
                totalTrips: 0,
                totalVolume: 0,
                trucksCount: 0,
                netBalance: 0
              };
              const ownerUnits = ownedTruckUnits.filter((u) => u.ownerId === owner.id);
              const recentEntries = truckOwnerLedgerEntries
                .filter((e) => e.ownerId === owner.id)
                .slice(0, 4);

              return (
                <div
                  key={owner.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* Owner Header */}
                  <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                        {owner.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {owner.fullName}
                          </h3>
                          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            مالک {ownerUnits.length} دستگاه کامیون
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
                            <span
                              className="font-mono bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded"
                              dir="ltr"
                            >
                              کارت: {owner.cardNumber}
                            </span>
                          )}
                          {owner.shebaNumber && (
                            <span
                              className="font-mono bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded"
                              dir="ltr"
                            >
                              شبا: {owner.shebaNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions for this Truck Owner */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                      <button
                        onClick={() => handleOpenTruckUnitModal(undefined, owner.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus size={15} />
                        <span>افزودن کامیون</span>
                      </button>

                      <button
                        onClick={() =>
                          handleOpenLedgerModal(owner.id, 'FREIGHT_DEPOSIT_TO_OWNER')
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CreditCard size={15} />
                        <span>واریز کرایه به حساب صاحب کامیون</span>
                      </button>

                      <button
                        onClick={() => handleOpenLedgerModal(owner.id, 'OWNER_WITHDRAWAL')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ArrowUpRight size={15} />
                        <span>ثبت برداشت صاحب کامیون</span>
                      </button>

                      <button
                        onClick={() =>
                          handleOpenLedgerModal(owner.id, 'TRUCK_EXPENSE_FOR_OWNER')
                        }
                        className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Wrench size={14} />
                        <span>هزینه کامیون</span>
                      </button>

                      <button
                        onClick={() => setStatementOwnerId(owner.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Printer size={14} />
                        <span>صورت‌حساب و چاپ</span>
                      </button>

                      <button
                        onClick={() => handleOpenOwnerModal(owner)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                        title="ویرایش مشخصات صاحب کامیون"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `آیا از حذف صاحب کامیون "${owner.fullName}" اطمینان دارید؟`
                            )
                          ) {
                            deleteTruckOwner(owner.id);
                            showToast('success', 'صاحب کامیون حذف شد.');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                        title="حذف صاحب کامیون"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block mb-1">
                        مانده حساب قبلی
                      </span>
                      {fin.prevCredit > 0 ? (
                        <span
                          className="font-mono font-black text-emerald-600 dark:text-emerald-400"
                          dir="ltr"
                        >
                          +{fin.prevCredit.toLocaleString()} T (طلب)
                        </span>
                      ) : fin.prevDebit > 0 ? (
                        <span
                          className="font-mono font-black text-rose-600 dark:text-rose-400"
                          dir="ltr"
                        >
                          -{fin.prevDebit.toLocaleString()} T (بدهی)
                        </span>
                      ) : (
                        <span className="font-bold text-slate-400">صفر (تسویه)</span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                      <span className="text-emerald-800 dark:text-emerald-300 block mb-1">
                        کل کرایه کامیون‌ها ({fin.totalTrips} سرویس)
                      </span>
                      <span
                        className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400"
                        dir="ltr"
                      >
                        {(fin.autoFreightEarnings + fin.manualCredits).toLocaleString()} T
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                      <span className="text-blue-800 dark:text-blue-300 block mb-1">
                        کرایه واریزشده به حساب صاحب کامیون
                      </span>
                      <span
                        className="font-mono font-black text-sm text-blue-700 dark:text-blue-400"
                        dir="ltr"
                      >
                        {fin.totalFreightDeposited.toLocaleString()} T
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                      <span className="text-rose-800 dark:text-rose-300 block mb-1">
                        برداشت‌های صاحب کامیون + هزینه‌ها
                      </span>
                      <span
                        className="font-mono font-black text-sm text-rose-700 dark:text-rose-400"
                        dir="ltr"
                      >
                        {(fin.totalOwnerWithdrawals + fin.totalTruckExpenses).toLocaleString()} T
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
                        مانده نهایی حساب صاحب کامیون
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
                            ? 'طلبکار (مانده کرایه)'
                            : fin.netBalance < 0
                            ? 'بدهکار (اضافه برداشت)'
                            : 'تسویه کامل'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Owned Trucks & Recent Withdrawals/Deposits */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Truck size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>کامیون‌های تحت مالکیت و نحوه واریز کرایه:</span>
                      </h4>

                      {ownerUnits.length === 0 ? (
                        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            هنوز کامیونی برای «{owner.fullName}» ثبت و متصل نشده است.
                          </p>
                          <button
                            onClick={() => handleOpenTruckUnitModal(undefined, owner.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>انتخاب کامیون از لیست رانندگان یا ثبت کامیون</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ownerUnits.map((unit) => {
                            const calc = truckUnitLoadsMap[unit.id] || {
                              loads: [],
                              totalTrips: 0,
                              totalVolume: 0,
                              totalOwnerShareToman: 0
                            };
                            const drv = drivers.find((d) => d.id === unit.driverId);

                            return (
                              <div
                                key={unit.id}
                                className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex flex-col justify-between gap-3"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-sm text-slate-900 dark:text-white">
                                          راننده: {drv?.fullName || unit.driverName}
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded font-mono text-xs font-bold">
                                          پلاک: {drv?.plateNumber || unit.plateNumber}
                                        </span>
                                      </div>
                                      {unit.truckModel && (
                                        <span className="text-[11px] text-slate-500 block mt-0.5">
                                          مدل خودرو: {unit.truckModel}{' '}
                                          {unit.tankNumber ? `| تانکر: ${unit.tankNumber}` : ''}
                                        </span>
                                      )}
                                    </div>

                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                        unit.depositFreightToOwnerAccount
                                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300'
                                      }`}
                                    >
                                      {unit.depositFreightToOwnerAccount
                                        ? 'واریز کرایه به حساب صاحب کامیون'
                                        : 'حساب توافقی / جداگانه'}
                                    </span>
                                  </div>

                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                                    <div>
                                      <span className="text-slate-400">مدل کرایه: </span>
                                      <span className="font-bold">
                                        {FREIGHT_MODE_LABELS[unit.freightMode]}
                                      </span>
                                      {unit.freightMode === 'PERCENTAGE_OF_FREIGHT' && (
                                        <span className="mr-1 text-blue-600 dark:text-blue-400 font-black">
                                          ({unit.ownerSharePercentage || 100}%)
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span>
                                        سرویس: <strong>{calc.totalTrips}</strong>
                                      </span>
                                      <span>
                                        تناژ: <strong>{calc.totalVolume.toLocaleString()} تن</strong>
                                      </span>
                                      <span
                                        className="font-mono font-black text-emerald-700 dark:text-emerald-400"
                                        dir="ltr"
                                      >
                                        {calc.totalOwnerShareToman.toLocaleString()} T
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        handleOpenLedgerModal(
                                          owner.id,
                                          'FREIGHT_DEPOSIT_TO_OWNER',
                                          unit.id
                                        )
                                      }
                                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                                    >
                                      واریز کرایه این کامیون
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleOpenLedgerModal(
                                          owner.id,
                                          'OWNER_WITHDRAWAL',
                                          unit.id
                                        )
                                      }
                                      className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg font-bold cursor-pointer"
                                    >
                                      ثبت برداشت
                                    </button>
                                    <button
                                      onClick={() => handleOpenTruckUnitModal(unit)}
                                      className="text-slate-600 dark:text-slate-300 hover:text-blue-600 px-2 py-1 font-bold cursor-pointer"
                                    >
                                      ویرایش
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `آیا از حذف اتصال کامیون "${unit.plateNumber}" اطمینان دارید؟`
                                        )
                                      ) {
                                        deleteOwnedTruckUnit(unit.id);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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

                    {/* Recent Deposits & Withdrawals for this Owner */}
                    {recentEntries.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-black text-slate-600 dark:text-slate-400 mb-2">
                          آخرین واریزی‌های کرایه و برداشت‌های {owner.fullName}:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {recentEntries.map((entry) => {
                            const cfg = TRUCK_LEDGER_LABELS[entry.entryType];
                            return (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs"
                              >
                                <div>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${cfg.badgeClass}`}
                                  >
                                    {cfg.shortLabel}
                                  </span>
                                  <span className="mr-2 font-mono text-slate-500">
                                    {entry.date}
                                  </span>
                                  <div className="text-slate-600 dark:text-slate-300 mt-1 truncate max-w-[230px]">
                                    {entry.description}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <div
                                    className={`font-mono font-black ${
                                      cfg.isCreditForOwner
                                        ? 'text-emerald-600'
                                        : 'text-blue-600 dark:text-blue-400'
                                    }`}
                                    dir="ltr"
                                  >
                                    {entry.amount.toLocaleString()} T
                                  </div>
                                  {entry.trackingCode && (
                                    <div className="text-[10px] font-mono text-slate-400">
                                      کد: {entry.trackingCode}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 2: TABLE OF TRUCKS & DETAILED LOADS */}
      {activeSubTab === 'trucks_and_loads' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  جدول کامیون‌های متعلق به صاحبین کامیون و نحوه واریز کرایه
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  فهرست کامیون‌ها، راننده فعال روی کامیون، صاحب کامیون و سهم کرایه محاسبه‌شده
                </p>
              </div>
              <button
                onClick={() => handleOpenTruckUnitModal()}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>اتصال کامیون جدید</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold">
                  <tr>
                    <th className="px-4 py-3.5">صاحب کامیون</th>
                    <th className="px-4 py-3.5">راننده کامیون</th>
                    <th className="px-4 py-3.5">پلاک کامیون</th>
                    <th className="px-4 py-3.5">نحوه تسویه کرایه</th>
                    <th className="px-4 py-3.5">وضعیت واریز</th>
                    <th className="px-4 py-3.5">تعداد سرویس / تناژ</th>
                    <th className="px-4 py-3.5">کرایه صاحب کامیون (تومان)</th>
                    <th className="px-4 py-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ownedTruckUnits
                    .filter((u) => filterOwnerId === 'ALL' || u.ownerId === filterOwnerId)
                    .map((unit) => {
                      const calc = truckUnitLoadsMap[unit.id] || {
                        loads: [],
                        totalTrips: 0,
                        totalVolume: 0,
                        totalOwnerShareToman: 0
                      };
                      return (
                        <tr
                          key={unit.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                        >
                          <td className="px-4 py-3.5 font-black text-blue-700 dark:text-blue-300">
                            {unit.ownerName}
                          </td>
                          <td className="px-4 py-3.5 font-bold">{unit.driverName}</td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded font-mono text-xs font-bold">
                              {unit.plateNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <div className="font-bold">
                              {FREIGHT_MODE_LABELS[unit.freightMode]}
                            </div>
                            {unit.freightMode === 'PERCENTAGE_OF_FREIGHT' && (
                              <span className="text-slate-500">
                                سهم صاحب کامیون: {unit.ownerSharePercentage}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                unit.depositFreightToOwnerAccount
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                              }`}
                            >
                              {unit.depositFreightToOwnerAccount
                                ? 'واریز به حساب صاحب کامیون'
                                : 'حساب جداگانه'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {calc.totalTrips} سرویس | {calc.totalVolume.toLocaleString()} تن
                          </td>
                          <td
                            className="px-4 py-3.5 font-mono font-black text-emerald-700 dark:text-emerald-400"
                            dir="ltr"
                          >
                            {calc.totalOwnerShareToman.toLocaleString()} T
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleOpenLedgerModal(
                                    unit.ownerId,
                                    'FREIGHT_DEPOSIT_TO_OWNER',
                                    unit.id
                                  )
                                }
                                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                              >
                                واریز کرایه
                              </button>
                              <button
                                onClick={() => handleOpenTruckUnitModal(unit)}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                ویرایش
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {ownedTruckUnits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        کامیونی برای صاحبین کامیون ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Loads Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History size={19} className="text-blue-600" />
                <span>ریز بارها و کرایه‌های تعلق‌گرفته به صاحبین کامیون</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold">
                  <tr>
                    <th className="px-4 py-3">تاریخ</th>
                    <th className="px-4 py-3">صاحب کامیون</th>
                    <th className="px-4 py-3">راننده / پلاک کامیون</th>
                    <th className="px-4 py-3">وزن بار (تن)</th>
                    <th className="px-4 py-3">کل کرایه سرویس</th>
                    <th className="px-4 py-3">نحوه محاسبه</th>
                    <th className="px-4 py-3">سهم کرایه صاحب کامیون</th>
                    <th className="px-4 py-3">بارنامه / توضیحات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ownedTruckUnits
                    .filter((u) => filterOwnerId === 'ALL' || u.ownerId === filterOwnerId)
                    .flatMap((unit) =>
                      (truckUnitLoadsMap[unit.id]?.loads || []).map((l) => ({
                        ...l,
                        ownerName: unit.ownerName
                      }))
                    )
                    .map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{row.date}</td>
                        <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-300">
                          {row.ownerName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold">{row.driverName}</span>
                          <span className="block text-[11px] font-mono text-slate-500">
                            {row.plateNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{row.volume} تن</td>
                        <td className="px-4 py-3 font-mono" dir="ltr">
                          {row.totalTruckFreightToman.toLocaleString()} T
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{row.formulaText}</td>
                        <td
                          className="px-4 py-3 font-mono font-black text-emerald-700 dark:text-emerald-400"
                          dir="ltr"
                        >
                          {row.ownerFreightShareToman.toLocaleString()} T
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {row.billOfLading ? `[بارنامه: ${row.billOfLading}] ` : ''}
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

      {/* SUB-TAB 3: LEDGER OF FREIGHT DEPOSITS & WITHDRAWALS */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet size={19} className="text-blue-600" />
                <span>دفتر واریز کرایه به حساب صاحبین کامیون و برداشت‌های انجام‌شده</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ریز تمامی مبالغ واریزشده بابت کرایه به حساب صاحب کامیون، برداشت‌های دستی و هزینه‌های کامیون
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenLedgerModal(undefined, 'FREIGHT_DEPOSIT_TO_OWNER')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard size={15} />
                <span>واریز کرایه به صاحب کامیون</span>
              </button>
              <button
                onClick={() => handleOpenLedgerModal(undefined, 'OWNER_WITHDRAWAL')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight size={15} />
                <span>ثبت برداشت صاحب کامیون</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold">
                <tr>
                  <th className="px-4 py-3.5">تاریخ</th>
                  <th className="px-4 py-3.5">صاحب کامیون</th>
                  <th className="px-4 py-3.5">کامیون / راننده مرتبط</th>
                  <th className="px-4 py-3.5">نوع تراکنش</th>
                  <th className="px-4 py-3.5">مبلغ (تومان)</th>
                  <th className="px-4 py-3.5">معادل ارزی</th>
                  <th className="px-4 py-3.5">کد رهگیری / بارنامه</th>
                  <th className="px-4 py-3.5">توضیحات</th>
                  <th className="px-4 py-3.5 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {truckOwnerLedgerEntries
                  .filter((e) => filterOwnerId === 'ALL' || e.ownerId === filterOwnerId)
                  .map((entry) => {
                    const owner = truckOwners.find((o) => o.id === entry.ownerId);
                    const unit = ownedTruckUnits.find((u) => u.id === entry.truckUnitId);
                    const cfg = TRUCK_LEDGER_LABELS[entry.entryType];

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                      >
                        <td className="px-4 py-3.5 font-mono text-xs">{entry.date}</td>
                        <td className="px-4 py-3.5 font-bold">{owner?.fullName || 'نامشخص'}</td>
                        <td className="px-4 py-3.5 text-xs">
                          {unit ? `${unit.driverName} (${unit.plateNumber})` : 'حساب کلی صاحب کامیون'}
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
                              : entry.entryType === 'OWNER_WITHDRAWAL'
                              ? 'text-rose-600 dark:text-rose-400'
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
                        <td className="px-4 py-3.5 text-xs font-mono">
                          {entry.trackingCode && <div>پیگیری: {entry.trackingCode}</div>}
                          {entry.billOfLading && <div>بارنامه: {entry.billOfLading}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm('آیا از حذف این سند اطمینان دارید؟')) {
                                deleteTruckOwnerLedgerEntry(entry.id);
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
                {truckOwnerLedgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      هنوز هیچ واریزی کرایه یا برداشتی برای صاحبین کامیون ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT TRUCK OWNER */}
      {showOwnerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus size={22} />
                <h3 className="font-black text-base sm:text-lg">
                  {editingOwnerId ? 'ویرایش مشخصات صاحب کامیون' : 'ثبت صاحب کامیون جدید'}
                </h3>
              </div>
              <button
                onClick={() => setShowOwnerModal(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOwner} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام و نام خانوادگی صاحب کامیون *
                  </label>
                  <input
                    type="text"
                    value={ownerForm.fullName}
                    onChange={(e) => setOwnerForm({ ...ownerForm, fullName: e.target.value })}
                    placeholder="مثال: حاج حسن حسینی (مالک کامیون)"
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
                    نام بانک و صاحب حساب (جهت واریز کرایه)
                  </label>
                  <input
                    type="text"
                    value={ownerForm.bankName}
                    onChange={(e) => setOwnerForm({ ...ownerForm, bankName: e.target.value })}
                    placeholder="مثال: بانک ملت"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره کارت بانکی صاحب کامیون (۱۶ رقمی)
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
                    شماره شبا بانکی صاحب کامیون (IR)
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

              {/* Previous Balance */}
              <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 space-y-3">
                <label className="block text-xs font-black text-purple-900 dark:text-purple-200">
                  مانده حساب قبلی صاحب کامیون (اختیاری)
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
                    بدهکار به شرکت (برداشت قبلی)
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
                        placeholder="مثال: 80,000,000"
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
                >
                  ذخیره صاحب کامیون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT OWNED TRUCK UNIT */}
      {showTruckUnitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck size={22} />
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    {editingTruckUnitId
                      ? 'ویرایش کامیون و تنظیمات واریز کرایه به صاحب کامیون'
                      : 'اتصال کامیون به صاحب کامیون و تنظیم واریز کرایه'}
                  </h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    تعیین کنید کدام کامیون متعلق به این مالک است و کرایه بارها چگونه به حساب ایشان منظور شود
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTruckUnitModal(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTruckUnit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    صاحب کامیون (مالک خودرو) *
                  </label>
                  <select
                    value={truckUnitForm.ownerId}
                    onChange={(e) =>
                      setTruckUnitForm({ ...truckUnitForm, ownerId: e.target.value })
                    }
                    className={inputClasses}
                    required
                  >
                    <option value="">انتخاب صاحب کامیون...</option>
                    {truckOwners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    انتخاب کامیون / راننده از لیست رانندگان سیستم
                  </label>
                  <select
                    value={truckUnitForm.driverId}
                    onChange={(e) => handleSelectDriverForTruckUnit(e.target.value)}
                    className={inputClasses}
                  >
                    <option value="">-- انتخاب از لیست رانندگان ثبت‌شده --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} — پلاک: {d.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام راننده فعال روی کامیون
                  </label>
                  <input
                    type="text"
                    value={truckUnitForm.driverName}
                    onChange={(e) =>
                      setTruckUnitForm({ ...truckUnitForm, driverName: e.target.value })
                    }
                    placeholder="نام راننده"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره پلاک کامیون *
                  </label>
                  <input
                    type="text"
                    value={truckUnitForm.plateNumber}
                    onChange={(e) =>
                      setTruckUnitForm({ ...truckUnitForm, plateNumber: e.target.value })
                    }
                    placeholder="مثال: ۱۲ الف ۳۴۵ ایران ۶۶"
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    مدل کشنده (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={truckUnitForm.truckModel}
                    onChange={(e) =>
                      setTruckUnitForm({ ...truckUnitForm, truckModel: e.target.value })
                    }
                    placeholder="مثال: ولوو FH500"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره تانکر متصل (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={truckUnitForm.tankNumber}
                    onChange={(e) =>
                      setTruckUnitForm({ ...truckUnitForm, tankNumber: e.target.value })
                    }
                    placeholder="شماره تانکر"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Freight Settlement Mode */}
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-3">
                <label className="block text-xs font-black text-blue-950 dark:text-blue-200">
                  نحوه محاسبه و واریز کرایه این کامیون به حساب صاحب کامیون:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      'FULL_TO_OWNER',
                      'PERCENTAGE_OF_FREIGHT',
                      'PER_TON',
                      'MANUAL_ONLY'
                    ] as TruckOwnerFreightMode[]
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setTruckUnitForm({ ...truckUnitForm, freightMode: mode })
                      }
                      className={`p-2.5 rounded-xl text-xs font-bold border text-right transition-all cursor-pointer ${
                        truckUnitForm.freightMode === mode
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {FREIGHT_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>

                {truckUnitForm.freightMode === 'PERCENTAGE_OF_FREIGHT' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      درصد سهم صاحب کامیون از کرایه هر بار (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={truckUnitForm.ownerSharePercentage}
                      onChange={(e) =>
                        setTruckUnitForm({
                          ...truckUnitForm,
                          ownerSharePercentage: e.target.value
                        })
                      }
                      placeholder="مثال: 80"
                      className={`${inputClasses} font-mono font-bold`}
                    />
                  </div>
                )}

                {truckUnitForm.freightMode === 'PER_TON' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نرخ هر تن برای صاحب کامیون
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formatNumberInput(truckUnitForm.ratePerTon)}
                        onChange={(e) =>
                          setTruckUnitForm({
                            ...truckUnitForm,
                            ratePerTon: cleanNumberInput(e.target.value)
                          })
                        }
                        className={`${inputClasses} font-mono font-bold text-left`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ارز نرخ
                      </label>
                      <select
                        value={truckUnitForm.rateCurrency}
                        onChange={(e) =>
                          setTruckUnitForm({
                            ...truckUnitForm,
                            rateCurrency: e.target.value as 'TOMAN' | 'USD' | 'AED'
                          })
                        }
                        className={inputClasses}
                      >
                        <option value="TOMAN">تومان</option>
                        <option value="USD">دلار ($)</option>
                        <option value="AED">درهم (AED)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="depositToOwnerCheck"
                      checked={truckUnitForm.depositFreightToOwnerAccount}
                      onChange={(e) =>
                        setTruckUnitForm({
                          ...truckUnitForm,
                          depositFreightToOwnerAccount: e.target.checked
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="depositToOwnerCheck"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      کرایه بارهای این کامیون به حساب صاحب کامیون واریز می‌شود
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="syncBankToDriverCheck"
                      checked={truckUnitForm.syncBankInfoToDriver}
                      onChange={(e) =>
                        setTruckUnitForm({
                          ...truckUnitForm,
                          syncBankInfoToDriver: e.target.checked
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="syncBankToDriverCheck"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      ثبت خودکار شماره کارت و شبای صاحب کامیون روی پروفایل این راننده (جهت تسویه سریع)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTruckUnitModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
                >
                  ذخیره و اتصال کامیون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LEDGER ENTRY (FREIGHT DEPOSIT TO OWNER / WITHDRAWAL / EXPENSE) */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet size={22} />
                <h3 className="font-black text-base sm:text-lg">
                  ثبت واریز کرایه به حساب صاحب کامیون / ثبت برداشت
                </h3>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLedgerEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'FREIGHT_DEPOSIT_TO_OWNER',
                    'OWNER_WITHDRAWAL',
                    'TRUCK_EXPENSE_FOR_OWNER',
                    'MANUAL_CREDIT'
                  ] as TruckOwnerLedgerEntryType[]
                ).map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => setLedgerForm({ ...ledgerForm, entryType: et })}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-right transition-all cursor-pointer ${
                      ledgerForm.entryType === et
                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {TRUCK_LEDGER_LABELS[et].label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    صاحب کامیون *
                  </label>
                  <select
                    value={ledgerForm.ownerId}
                    onChange={(e) => {
                      const oid = e.target.value;
                      const owner = truckOwners.find((o) => o.id === oid);
                      const firstUnit = ownedTruckUnits.find((u) => u.ownerId === oid);
                      setLedgerForm({
                        ...ledgerForm,
                        ownerId: oid,
                        truckUnitId: firstUnit?.id || '',
                        driverId: firstUnit?.driverId || '',
                        cardNumber: owner?.cardNumber || '',
                        shebaNumber: owner?.shebaNumber || '',
                        bankName: owner?.bankName || ''
                      });
                    }}
                    className={inputClasses}
                    required
                  >
                    <option value="">انتخاب صاحب کامیون...</option>
                    {truckOwners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    کامیون / راننده مرتبط
                  </label>
                  <select
                    value={ledgerForm.truckUnitId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      const u = ownedTruckUnits.find((item) => item.id === uid);
                      setLedgerForm({
                        ...ledgerForm,
                        truckUnitId: uid,
                        driverId: u?.driverId || ''
                      });
                    }}
                    className={inputClasses}
                  >
                    <option value="">همه کامیون‌ها / حساب کلی صاحب کامیون</option>
                    {ownedTruckUnits
                      .filter((u) => u.ownerId === ledgerForm.ownerId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.driverName} — پلاک: {u.plateNumber}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Quick select from truck loads to auto-fill freight amount */}
                {ledgerForm.truckUnitId &&
                  (truckUnitLoadsMap[ledgerForm.truckUnitId]?.loads.length || 0) > 0 && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">
                        انتخاب سریع از سرویس‌های این کامیون جهت پر شدن خودکار مبلغ کرایه (اختیاری)
                      </label>
                      <select
                        value={ledgerForm.selectedLoadId}
                        onChange={(e) => {
                          const lid = e.target.value;
                          const load = truckUnitLoadsMap[ledgerForm.truckUnitId]?.loads.find(
                            (l) => l.id === lid
                          );
                          if (load) {
                            setLedgerForm({
                              ...ledgerForm,
                              selectedLoadId: lid,
                              amount: load.ownerFreightShareToman.toString(),
                              billOfLading: load.billOfLading || '',
                              description: `واریز کرایه سرویس ${load.date} (${load.volume} تن - راننده ${load.driverName})`
                            });
                          } else {
                            setLedgerForm({ ...ledgerForm, selectedLoadId: '' });
                          }
                        }}
                        className={inputClasses}
                      >
                        <option value="">-- انتخاب دستی مبلغ --</option>
                        {truckUnitLoadsMap[ledgerForm.truckUnitId]?.loads.map((l) => (
                          <option key={l.id} value={l.id}>
                            تاریخ {l.date} | وزن: {l.volume} تن | سهم کرایه صاحب کامیون:{' '}
                            {l.ownerFreightShareToman.toLocaleString()} تومان
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاریخ
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
                    واحد ارز
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
                  مبلغ به تومان *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formatNumberInput(ledgerForm.amount)}
                  onChange={(e) =>
                    setLedgerForm({ ...ledgerForm, amount: cleanNumberInput(e.target.value) })
                  }
                  placeholder="مثال: 45,000,000"
                  className={`${inputClasses} font-mono font-black text-left text-base`}
                  required
                />
                {parseFloat(ledgerForm.amount) > 0 && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                    معادل: {numberToPersianWords(parseFloat(ledgerForm.amount))}
                  </p>
                )}
              </div>

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
                    placeholder="کد پیگیری بانکی"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره بارنامه مرتبط (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={ledgerForm.billOfLading}
                    onChange={(e) =>
                      setLedgerForm({ ...ledgerForm, billOfLading: e.target.value })
                    }
                    placeholder="شماره بارنامه"
                    className={inputClasses}
                  />
                </div>
              </div>

              {(ledgerForm.entryType === 'FREIGHT_DEPOSIT_TO_OWNER' ||
                ledgerForm.entryType === 'OWNER_WITHDRAWAL') &&
                ledgerForm.driverId && (
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="alsoRecordInDriverCheck"
                      checked={ledgerForm.alsoRecordInDriverPayments}
                      onChange={(e) =>
                        setLedgerForm({
                          ...ledgerForm,
                          alsoRecordInDriverPayments: e.target.checked
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="alsoRecordInDriverCheck"
                      className="text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer"
                    >
                      ثبت همزمان در پرداختی‌های کامیون/راننده (کسر خودکار از مانده کرایه بارنامه کامیون)
                    </label>
                  </div>
                )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات (بابت کرایه بار / برداشت صاحب کامیون / علی‌الحساب)
                </label>
                <input
                  type="text"
                  value={ledgerForm.description}
                  onChange={(e) =>
                    setLedgerForm({ ...ledgerForm, description: e.target.value })
                  }
                  placeholder="توضیحات..."
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
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black shadow-lg cursor-pointer"
                >
                  ثبت نهایی سند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE STATEMENT FOR A TRUCK OWNER */}
      {statementOwnerId && (() => {
        const owner = truckOwners.find((o) => o.id === statementOwnerId);
        if (!owner) return null;
        const fin = ownerFinancialsMap[owner.id];
        const ownerUnits = ownedTruckUnits.filter((u) => u.ownerId === owner.id);
        const ownerLoads = ownerUnits.flatMap((u) => truckUnitLoadsMap[u.id]?.loads || []);
        const ownerEntries = truckOwnerLedgerEntries.filter((e) => e.ownerId === owner.id);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden my-8">
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                  <FileText size={22} className="text-blue-400" />
                  <h3 className="font-black text-base sm:text-lg">
                    صورت‌حساب جامع صاحب کامیون: {owner.fullName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
                      صورت‌حساب کرایه کامیون‌ها و برداشت‌ها — {owner.fullName}
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
                      {fin.netBalance >= 0 ? 'طلبکار' : 'بدهکار / اضافه برداشت'})
                    </div>
                  </div>
                </div>

                {/* Summary Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">کل کرایه بارها:</span>
                    <strong className="font-mono text-sm" dir="ltr">
                      {(fin.autoFreightEarnings + fin.manualCredits).toLocaleString()} T
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">کرایه واریزشده به حساب:</span>
                    <strong className="font-mono text-sm text-blue-600" dir="ltr">
                      {fin.totalFreightDeposited.toLocaleString()} T
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">برداشت‌های صاحب کامیون:</span>
                    <strong className="font-mono text-sm text-rose-600" dir="ltr">
                      {fin.totalOwnerWithdrawals.toLocaleString()} T
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 block">هزینه‌های کامیون:</span>
                    <strong className="font-mono text-sm text-amber-600" dir="ltr">
                      {fin.totalTruckExpenses.toLocaleString()} T
                    </strong>
                  </div>
                </div>

                {/* Loads Table */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">
                    ۱. ریز بارها و کرایه‌های کامیون‌های تحت مالکیت ({ownerLoads.length} سرویس):
                  </h4>
                  <table className="w-full text-right text-xs border border-slate-200 dark:border-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 border">تاریخ</th>
                        <th className="p-2 border">راننده / کامیون</th>
                        <th className="p-2 border">وزن (تن)</th>
                        <th className="p-2 border">نحوه محاسبه</th>
                        <th className="p-2 border">سهم کرایه صاحب کامیون (تومان)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerLoads.map((l) => (
                        <tr key={l.id}>
                          <td className="p-2 border font-mono">{l.date}</td>
                          <td className="p-2 border">
                            {l.driverName} ({l.plateNumber})
                          </td>
                          <td className="p-2 border font-mono">{l.volume}</td>
                          <td className="p-2 border">{l.formulaText}</td>
                          <td className="p-2 border font-mono font-bold" dir="ltr">
                            {l.ownerFreightShareToman.toLocaleString()} T
                          </td>
                        </tr>
                      ))}
                      {ownerLoads.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">
                            باری ثبت نشده است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Deposits & Withdrawals Table */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">
                    ۲. ریز واریزی‌های کرایه به حساب صاحب کامیون و برداشت‌ها:
                  </h4>
                  <table className="w-full text-right text-xs border border-slate-200 dark:border-slate-800">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 border">تاریخ</th>
                        <th className="p-2 border">نوع تراکنش</th>
                        <th className="p-2 border">مبلغ (تومان)</th>
                        <th className="p-2 border">شماره پیگیری / توضیحات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerEntries.map((e) => (
                        <tr key={e.id}>
                          <td className="p-2 border font-mono">{e.date}</td>
                          <td className="p-2 border font-bold">
                            {TRUCK_LEDGER_LABELS[e.entryType].label}
                          </td>
                          <td className="p-2 border font-mono font-bold" dir="ltr">
                            {e.amount.toLocaleString()} T
                          </td>
                          <td className="p-2 border">
                            {e.trackingCode ? `[پیگیری: ${e.trackingCode}] ` : ''}
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

export default TruckOwnersManager;
