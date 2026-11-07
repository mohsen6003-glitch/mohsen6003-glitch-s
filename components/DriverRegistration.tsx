
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { UserPlus, Save, History, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { DriverPreviousBalanceType } from '../types';
import { formatNumberInput, cleanNumberInput, numberToPersianWords } from '../utils/numberUtils';

const DriverRegistration: React.FC = () => {
  const { addDriver, tankerOwners, tankerUnits, addTankerUnit, updateTankerUnit, truckOwners, addOwnedTruckUnit } = useData();
  const [form, setForm] = useState({
    fullName: '',
    nationalId: '',
    licenseNo: '',
    phone: '',
    plateNumber: '',
    tankNumber: '',
    tankerCode: '',
    isCompanyTanker: true,
    mountedTankerId: '',
    tankOwnerId: '',
    tankOwnerName: '',
    truckOwnerId: '',
    truckOwnerName: '',
    payFreightToTruckOwner: true,
    shebaNumber: '',
    cardNumber: '',
    accountHolderName: '',
    isAccountHolderDriver: true,
    bankName: '',
    previousBalanceType: 'NONE' as DriverPreviousBalanceType,
    previousBalanceAmount: '',
    previousBalanceDescription: '',
    includePreviousBalanceInTotal: true
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!form.fullName || !form.plateNumber) {
      setFeedback({ type: 'error', message: 'نام راننده و شماره پلاک الزامی هستند.' });
      return;
    }

    const prevAmountNum =
      form.previousBalanceType !== 'NONE'
        ? parseFloat(cleanNumberInput(form.previousBalanceAmount)) || 0
        : 0;

    const selectedOwner = tankerOwners.find(o => o.id === form.tankOwnerId);
    const selectedTruckOwner = truckOwners.find(o => o.id === form.truckOwnerId);

    const newDriverId = addDriver({
      fullName: form.fullName,
      nationalId: form.nationalId,
      licenseNo: form.licenseNo,
      phone: form.phone,
      plateNumber: form.plateNumber,
      tankNumber: form.tankNumber,
      tankerCode: form.tankerCode || undefined,
      isCompanyTanker: form.isCompanyTanker,
      mountedTankerId: form.mountedTankerId || undefined,
      tankOwnerId: form.tankOwnerId || (form.isCompanyTanker && form.tankNumber ? 'COMPANY' : undefined),
      tankOwnerName: selectedOwner?.fullName || form.tankOwnerName || (form.isCompanyTanker && form.tankNumber ? 'شرکت (تانکر ملکی)' : undefined),
      truckOwnerId: form.truckOwnerId || undefined,
      truckOwnerName: selectedTruckOwner?.fullName || form.truckOwnerName || undefined,
      payFreightToTruckOwner: form.truckOwnerId ? form.payFreightToTruckOwner : undefined,
      truckOwnerSharePercent: form.truckOwnerId ? 100 : undefined,
      shebaNumber: form.shebaNumber,
      cardNumber: form.cardNumber,
      accountHolderName: form.isAccountHolderDriver ? form.fullName : form.accountHolderName,
      isAccountHolderDriver: form.isAccountHolderDriver,
      bankName: form.bankName,
      previousBalanceType: prevAmountNum > 0 ? form.previousBalanceType : 'NONE',
      previousBalanceAmount: prevAmountNum,
      previousBalanceDate: prevAmountNum > 0 ? new Date().toLocaleDateString('fa-IR') : undefined,
      previousBalanceDescription:
        prevAmountNum > 0
          ? form.previousBalanceDescription ||
            (form.previousBalanceType === 'CREDITOR'
              ? 'مانده طلب از حساب قبلی'
              : 'مانده بدهی از حساب قبلی')
          : undefined,
      includePreviousBalanceInTotal: form.includePreviousBalanceInTotal
    });

    if (form.mountedTankerId) {
      updateTankerUnit(form.mountedTankerId, {
        status: 'MOUNTED',
        assignedDriverId: newDriverId,
        assignedDriverName: form.fullName,
        assignedTruckPlate: form.plateNumber,
        mountedDate: new Date().toLocaleDateString('fa-IR')
      });
    } else if (form.isCompanyTanker && (form.tankNumber.trim() || form.tankerCode.trim())) {
      const autoCode = form.tankerCode.trim() || `T-${101 + tankerUnits.length}`;
      addTankerUnit({
        ownershipType: 'COMPANY_OWNED',
        isCompanyOwned: true,
        ownerId: 'COMPANY',
        ownerName: 'شرکت (تانکر ملکی)',
        tankerCode: autoCode,
        tankNumber: form.tankNumber.trim() || autoCode,
        capacityTons: 24,
        tankType: '۴ محور صادراتی LPG',
        status: 'MOUNTED',
        assignedDriverId: newDriverId,
        assignedDriverName: form.fullName,
        assignedTruckPlate: form.plateNumber,
        mountedDate: new Date().toLocaleDateString('fa-IR'),
        contractType: 'COMPANY_OWNED_NONE',
        autoCalculateFromTruckLoads: true
      });
    }

    if (form.truckOwnerId && selectedTruckOwner) {
      addOwnedTruckUnit({
        ownerId: selectedTruckOwner.id,
        ownerName: selectedTruckOwner.fullName,
        driverId: newDriverId,
        driverName: form.fullName,
        plateNumber: form.plateNumber,
        tankNumber: form.tankNumber,
        freightMode: 'FULL_TO_OWNER',
        ownerSharePercentage: 100,
        depositFreightToOwnerAccount: form.payFreightToTruckOwner,
        syncBankInfoToDriver: true
      });
    }

    setForm({ 
      fullName: '', 
      nationalId: '', 
      licenseNo: '', 
      phone: '', 
      plateNumber: '', 
      tankNumber: '', 
      tankerCode: '',
      isCompanyTanker: true,
      mountedTankerId: '',
      tankOwnerId: '',
      tankOwnerName: '',
      truckOwnerId: '',
      truckOwnerName: '',
      payFreightToTruckOwner: true,
      shebaNumber: '', 
      cardNumber: '',
      accountHolderName: '',
      isAccountHolderDriver: true,
      bankName: '',
      previousBalanceType: 'NONE',
      previousBalanceAmount: '',
      previousBalanceDescription: '',
      includePreviousBalanceInTotal: true
    });
    setFeedback({ type: 'success', message: 'اطلاعات راننده و حساب قبلی با موفقیت ثبت شد!' });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const inputClasses = "w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none";

  const parsedPrevAmount = parseFloat(cleanNumberInput(form.previousBalanceAmount)) || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">ثبت راننده جدید</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ثبت مشخصات فردی، اطلاعات بانکی، صاحب کامیون، تانکر بسته شده و مانده حساب قبلی راننده
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center gap-2 text-sm font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نام و نام خانوادگی</label>
            <input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} className={inputClasses} placeholder="مثال: علی رضایی" />
          </div>
          <div>
            <label htmlFor="nationalId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">کد ملی</label>
            <input id="nationalId" name="nationalId" value={form.nationalId} onChange={handleChange} className={inputClasses} placeholder="کد ملی ۱۰ رقمی" />
          </div>
          <div>
            <label htmlFor="licenseNo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره گواهینامه</label>
            <input id="licenseNo" name="licenseNo" value={form.licenseNo} onChange={handleChange} className={inputClasses} placeholder="شماره گواهینامه" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره تماس</label>
            <input id="phone" name="phone" value={form.phone} onChange={handleChange} className={inputClasses} placeholder="0912..." />
          </div>
          <div>
            <label htmlFor="plateNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره پلاک کامیون (کشنده)</label>
            <input id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} className={inputClasses} placeholder="۱۲ الف ۳۴۵ ایران ۶۶" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tankerCode" className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-1">کد مخصوص تانکر</label>
              <input id="tankerCode" name="tankerCode" value={form.tankerCode} onChange={handleChange} className={`${inputClasses} font-mono font-bold`} placeholder="مثال: T-101" />
            </div>
            <div>
              <label htmlFor="tankNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره مخزن تانکر</label>
              <input id="tankNumber" name="tankNumber" value={form.tankNumber} onChange={handleChange} className={`${inputClasses} font-mono`} placeholder="شماره مخزن" />
            </div>
          </div>

          {truckOwners.length > 0 && (
            <div className="md:col-span-2 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-2">
              <label className="block text-xs font-black text-blue-900 dark:text-blue-200">
                انتخاب صاحب کامیون (در صورتی که کامیون متعلق به شخص دیگری است و کرایه به حساب صاحب کامیون واریز می‌شود - اختیاری)
              </label>
              <select
                value={form.truckOwnerId}
                onChange={(e) => {
                  const ownerId = e.target.value;
                  const owner = truckOwners.find(o => o.id === ownerId);
                  if (owner) {
                    setForm({
                      ...form,
                      truckOwnerId: owner.id,
                      truckOwnerName: owner.fullName,
                      payFreightToTruckOwner: true,
                      isAccountHolderDriver: false,
                      accountHolderName: owner.accountHolderName || owner.fullName,
                      cardNumber: owner.cardNumber || form.cardNumber,
                      shebaNumber: owner.shebaNumber || form.shebaNumber,
                      bankName: owner.bankName || form.bankName
                    });
                  } else {
                    setForm({
                      ...form,
                      truckOwnerId: '',
                      truckOwnerName: '',
                      isAccountHolderDriver: true,
                      accountHolderName: ''
                    });
                  }
                }}
                className={inputClasses}
              >
                <option value="">راننده خودش صاحب کامیون است / عدم انتخاب صاحب کامیون</option>
                {truckOwners.map(o => (
                  <option key={o.id} value={o.id}>
                    صاحب کامیون: {o.fullName} {o.bankName ? `(بانک: ${o.bankName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tankerUnits.length > 0 && (
            <div className="md:col-span-2 p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60">
              <label className="block text-xs font-black text-indigo-900 dark:text-indigo-200 mb-1.5">
                انتخاب تانکر از لیست ناوگان تانکرهای شرکت یا صاحبین تانکر (اختیاری)
              </label>
              <select
                value={form.mountedTankerId}
                onChange={(e) => {
                  const unitId = e.target.value;
                  const unit = tankerUnits.find(u => u.id === unitId);
                  if (unit) {
                    setForm({
                      ...form,
                      mountedTankerId: unit.id,
                      tankerCode: unit.tankerCode || form.tankerCode,
                      tankNumber: unit.tankNumber,
                      isCompanyTanker: unit.ownershipType === 'COMPANY_OWNED' || unit.isCompanyOwned || unit.ownerId === 'COMPANY',
                      tankOwnerId: unit.ownerId,
                      tankOwnerName: unit.ownerName
                    });
                  } else {
                    setForm({
                      ...form,
                      mountedTankerId: '',
                      tankOwnerId: '',
                      tankOwnerName: ''
                    });
                  }
                }}
                className={inputClasses}
              >
                <option value="">ثبت تانکر جدید با کد و شماره مخزن بالا (ملکی شرکت) / عدم انتخاب از لیست</option>
                {tankerUnits.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.tankerCode ? `[کد ${u.tankerCode}] ` : ''}مخزن شماره {u.tankNumber} — {u.ownerName} ({u.status === 'MOUNTED' ? `متصل به: ${u.assignedDriverName || 'کامیون'}` : 'آزاد در پارکینگ'})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره کارت بانکی (۱۶ رقمی)</label>
            <input 
              id="cardNumber" 
              name="cardNumber" 
              value={form.cardNumber} 
              onChange={handleChange} 
              className={`${inputClasses} font-mono text-left tracking-widest`} 
              placeholder="---- ---- ---- ----" 
              dir="ltr" 
              maxLength={19}
            />
          </div>
          <div>
            <label htmlFor="shebaNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">شماره شبا بانکی (اختیاری)</label>
            <div className="relative">
              <input id="shebaNumber" name="shebaNumber" value={form.shebaNumber} onChange={handleChange} className={`${inputClasses} font-mono text-left pl-10 tracking-wider`} placeholder="IR..." dir="ltr" />
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">IR</span>
            </div>
          </div>
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نام بانک</label>
            <input id="bankName" name="bankName" value={form.bankName} onChange={handleChange} className={inputClasses} placeholder="مثلاً: ملی، ملت، صادرات..." />
          </div>

          <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="isAccountHolderDriver"
                checked={form.isAccountHolderDriver}
                onChange={(e) => setForm({ ...form, isAccountHolderDriver: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <label htmlFor="isAccountHolderDriver" className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                شماره کارت و حساب اعلامی به نام خود راننده است
              </label>
            </div>
            {!form.isAccountHolderDriver && (
              <div>
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                  نام صاحب کارت/حساب اعلامی (در صورتی که به نام شخص دیگری است):
                </label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={form.accountHolderName}
                  onChange={handleChange}
                  placeholder="مثال: زهرا احمدی (همسر) یا حمید رضایی (صاحب خودرو)"
                  className={inputClasses}
                />
              </div>
            )}
          </div>

          {/* بخش ثبت حساب قبلی راننده (مانده حساب از قبل) */}
          <div className="md:col-span-2 p-5 bg-purple-50/60 dark:bg-purple-950/25 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200/70 dark:border-purple-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-600/15 text-purple-700 dark:text-purple-300 rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-purple-950 dark:text-purple-200">
                    حساب قبلی راننده (مانده حساب از دوره یا بارهای قبل - اختیاری)
                  </h3>
                  <p className="text-[11px] text-purple-700/80 dark:text-purple-400 mt-0.5">
                    در صورتی که راننده از قبل طلبکار یا بدهکار است، نوع و مبلغ آن را در این بخش وارد کنید
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, previousBalanceType: 'NONE', previousBalanceAmount: '' })}
                className={`p-3 rounded-xl border text-right transition-all ${
                  form.previousBalanceType === 'NONE'
                    ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700 shadow'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="text-xs font-black">بدون حساب قبلی (تسویه)</div>
                <div className="text-[10px] opacity-75 mt-0.5">شروع حساب از صفر</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, previousBalanceType: 'CREDITOR' })}
                className={`p-3 rounded-xl border text-right transition-all ${
                  form.previousBalanceType === 'CREDITOR'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-emerald-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <TrendingUp size={15} />
                  <span>طلبکار از شرکت (طلب قبلی راننده)</span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">راننده از حساب قبلی طلب دارد</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, previousBalanceType: 'DEBTOR' })}
                className={`p-3 rounded-xl border text-right transition-all ${
                  form.previousBalanceType === 'DEBTOR'
                    ? 'bg-rose-600 text-white border-rose-600 shadow'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-rose-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <TrendingDown size={15} />
                  <span>بدهکار به شرکت (بدهی قبلی راننده)</span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">راننده از قبل به شرکت بدهکار است</div>
              </button>
            </div>

            {form.previousBalanceType !== 'NONE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {form.previousBalanceType === 'CREDITOR'
                      ? 'مبلغ طلب قبلی راننده (تومان)'
                      : 'مبلغ بدهی قبلی راننده (تومان)'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    value={formatNumberInput(form.previousBalanceAmount)}
                    onChange={(e) =>
                      setForm({ ...form, previousBalanceAmount: cleanNumberInput(e.target.value) })
                    }
                    placeholder="مثال: 25,000,000"
                    className={`${inputClasses} font-mono font-black text-left tracking-wider`}
                  />
                  {parsedPrevAmount > 0 && (
                    <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 mt-1">
                      معادل: {numberToPersianWords(parsedPrevAmount)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    توضیحات حساب قبلی (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={form.previousBalanceDescription}
                    onChange={(e) => setForm({ ...form, previousBalanceDescription: e.target.value })}
                    placeholder="مثال: مانده کرایه سال قبل یا مساعده تسویه‌نشده..."
                    className={inputClasses}
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="includePrevBalanceReg"
                    checked={form.includePreviousBalanceInTotal}
                    onChange={(e) =>
                      setForm({ ...form, includePreviousBalanceInTotal: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label
                    htmlFor="includePrevBalanceReg"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    این مبلغ در تراز کل جاری راننده لحاظ و جمع/کسر شود
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 mt-4">
            <button type="submit" className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
              <Save size={20} />
              ذخیره اطلاعات راننده
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverRegistration;

