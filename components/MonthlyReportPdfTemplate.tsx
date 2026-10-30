import React from 'react';
import { Transaction, Purchase, Expense, Freight, ExchangeTransaction } from '../types';

export interface MonthlyReportData {
  year: number;
  month: number;
  monthName: string;
  reportCode: string;
  generatedDate: string;
  
  // Gas Sales
  transactions: (Transaction & { driverName?: string })[];
  totalSalesVolume: number;
  totalSalesIncome: number;
  salesCount: number;
  
  // Gas Purchases
  purchases: (Purchase & { companyName?: string })[];
  totalPurchaseVolume: number;
  totalPurchaseCost: number;
  purchasesCount: number;
  
  // Freights & Transport
  freights: Freight[];
  totalFreightsCost: number;
  freightCount: number;
  
  // Operational Expenses
  expenses: Expense[];
  totalExpensesCost: number;
  expensesByCategory: { category: string; amount: number; count: number }[];
  
  // Exchange
  exchangeTransactions: ExchangeTransaction[];
  totalExchangeToman: number;
  totalExchangeAed: number;
  
  // Profits & Margin
  grossProfit: number;
  netProfit: number;
  netMarginPercentage: number;
  profitPerTon: number;
}

interface MonthlyReportPdfTemplateProps {
  data: MonthlyReportData;
}

export const MonthlyReportPdfTemplate: React.FC<MonthlyReportPdfTemplateProps> = ({ data }) => {
  return (
    <div 
      id="monthly-financial-report-pdf-canvas" 
      className="bg-white text-slate-900 p-8 w-[800px] mx-auto text-right font-vazir leading-normal text-xs"
      style={{ direction: 'rtl' }}
    >
      {/* Document Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
              GER
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">سیستم جامع مدیریت صادرات گاز</h1>
              <p className="text-[10px] text-slate-600 font-semibold">گزارش رسمی صورت وضعیت مالی و سود و زیان ماهانه</p>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-[10px] space-y-1 min-w-[190px]">
            <div className="flex justify-between text-slate-700">
              <span className="font-semibold">شماره سند:</span>
              <span className="font-mono font-bold">{data.reportCode}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="font-semibold">دوره مالی:</span>
              <span className="font-bold text-blue-700">{data.monthName} {data.year}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="font-semibold">تاریخ صدور:</span>
              <span className="font-mono">{data.generatedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-center mb-6">
        <h2 className="text-sm font-black text-slate-800">
          صورت عملکرد مالی و تراز عملیاتی ماهانه ({data.monthName} ماه سال {data.year})
        </h2>
        <p className="text-[10px] text-slate-600 mt-0.5">
          خلاصه مبادلات بازرگانی، فروش گاز، خرید از شرکت‌ها، کرایه حمل، هزینه‌های جاری و سود خالص
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-800">درآمد کل فروش گاز</div>
          <div className="text-sm font-black text-emerald-700 mt-1" dir="ltr">{data.totalSalesIncome.toLocaleString()}</div>
          <div className="text-[9px] text-emerald-600 mt-0.5">تومان ({data.totalSalesVolume.toFixed(2)} تن)</div>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-amber-800">بهای خرید گاز</div>
          <div className="text-sm font-black text-amber-700 mt-1" dir="ltr">{data.totalPurchaseCost.toLocaleString()}</div>
          <div className="text-[9px] text-amber-600 mt-0.5">تومان ({data.totalPurchaseVolume.toFixed(2)} تن)</div>
        </div>

        <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-rose-800">کرایه حمل و هزینه‌های جاری</div>
          <div className="text-sm font-black text-rose-700 mt-1" dir="ltr">{(data.totalFreightsCost + data.totalExpensesCost).toLocaleString()}</div>
          <div className="text-[9px] text-rose-600 mt-0.5">تومان</div>
        </div>

        <div className={`border rounded-lg p-3 text-center ${data.netProfit >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
          <div className="text-[10px] font-bold text-slate-800">سود خالص عملیاتی</div>
          <div className={`text-sm font-black mt-1 ${data.netProfit >= 0 ? 'text-blue-800' : 'text-red-700'}`} dir="ltr">
            {data.netProfit.toLocaleString()}
          </div>
          <div className="text-[9px] text-slate-600 mt-0.5">
            تومان (حاشیه: {data.netMarginPercentage.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* P&L Statement Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-800 bg-slate-200 px-3 py-1.5 rounded-t-lg border border-slate-300">
          جدول ۱: صورت سود و زیان تفکیکی دوره ({data.monthName} {data.year})
        </h3>
        <table className="w-full text-right border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <th className="p-2 border-l border-slate-300 w-12 text-center">ردیف</th>
              <th className="p-2 border-l border-slate-300">شرح سرفصل مالی</th>
              <th className="p-2 border-l border-slate-300 text-center w-28">مقدار / تعداد</th>
              <th className="p-2 text-center w-36">مبلغ (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="p-2 border-l border-slate-300 text-center font-mono">۱</td>
              <td className="p-2 border-l border-slate-300 font-bold text-emerald-800">درآمد حاصل از فروش گاز (صادرات)</td>
              <td className="p-2 border-l border-slate-300 text-center font-mono">{data.salesCount} بارنامه ({data.totalSalesVolume.toFixed(2)} تن)</td>
              <td className="p-2 text-left font-mono font-bold text-emerald-700" dir="ltr">{data.totalSalesIncome.toLocaleString()}</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="p-2 border-l border-slate-300 text-center font-mono">۲</td>
              <td className="p-2 border-l border-slate-300 text-amber-800">بهای تمام‌شده خرید گاز از شرکت‌ها</td>
              <td className="p-2 border-l border-slate-300 text-center font-mono">{data.purchasesCount} پارت ({data.totalPurchaseVolume.toFixed(2)} تن)</td>
              <td className="p-2 text-left font-mono font-bold text-amber-700" dir="ltr">({data.totalPurchaseCost.toLocaleString()})</td>
            </tr>
            <tr className="bg-amber-100/60 font-bold">
              <td className="p-2 border-l border-slate-300 text-center"></td>
              <td className="p-2 border-l border-slate-300">سود ناخالص عملیاتی (فروش - خرید)</td>
              <td className="p-2 border-l border-slate-300 text-center font-mono">-</td>
              <td className="p-2 text-left font-mono" dir="ltr">{data.grossProfit.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="p-2 border-l border-slate-300 text-center font-mono">۳</td>
              <td className="p-2 border-l border-slate-300 text-rose-800">هزینه‌های کرایه حمل و نقل تانکرها</td>
              <td className="p-2 border-l border-slate-300 text-center font-mono">{data.freightCount} سرویس</td>
              <td className="p-2 text-left font-mono text-rose-700" dir="ltr">({data.totalFreightsCost.toLocaleString()})</td>
            </tr>
            <tr className="bg-slate-50">
              <td className="p-2 border-l border-slate-300 text-center font-mono">۴</td>
              <td className="p-2 border-l border-slate-300 text-rose-800">هزینه‌های جاری، اداری و عملیاتی</td>
              <td className="p-2 border-l border-slate-300 text-center font-mono">{data.expenses.length} فقره</td>
              <td className="p-2 text-left font-mono text-rose-700" dir="ltr">({data.totalExpensesCost.toLocaleString()})</td>
            </tr>
            <tr className="bg-blue-100/80 font-black text-slate-900 border-t-2 border-slate-800">
              <td className="p-2 border-l border-slate-300 text-center">★</td>
              <td className="p-2 border-l border-slate-300 text-sm">سود خالص نهایی دوره ({data.monthName} {data.year})</td>
              <td className="p-2 border-l border-slate-300 text-center font-mono text-xs">سود هر تن: {data.profitPerTon.toLocaleString()} T</td>
              <td className="p-2 text-left font-mono text-sm text-blue-900" dir="ltr">{data.netProfit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenses by Category & Currency summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-xs font-bold text-slate-800 bg-slate-200 px-3 py-1 rounded-t-lg border border-slate-300">
            تفکیک هزینه‌های جاری ماه
          </h3>
          <table className="w-full text-right border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="p-1.5 border-l border-slate-300">دسته‌بندی</th>
                <th className="p-1.5 border-l border-slate-300 text-center w-16">تعداد</th>
                <th className="p-1.5 text-center w-28">مبلغ (تومان)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.expensesByCategory.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-2 text-center text-slate-400">هزینه‌ای ثبت نشده است</td>
                </tr>
              ) : (
                data.expensesByCategory.map((cat, idx) => (
                  <tr key={idx}>
                    <td className="p-1.5 border-l border-slate-300 font-medium">{cat.category}</td>
                    <td className="p-1.5 border-l border-slate-300 text-center font-mono">{cat.count}</td>
                    <td className="p-1.5 text-left font-mono font-semibold" dir="ltr">{cat.amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-800 bg-slate-200 px-3 py-1 rounded-t-lg border border-slate-300">
            وضعیت مبادلات ارزی و صرافی
          </h3>
          <table className="w-full text-right border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="p-1.5 border-l border-slate-300">عنوان شاخص</th>
                <th className="p-1.5 text-center">مقدار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-1.5 border-l border-slate-300">تعداد حواله‌های صرافی</td>
                <td className="p-1.5 text-center font-mono font-bold">{data.exchangeTransactions.length} فقره</td>
              </tr>
              <tr>
                <td className="p-1.5 border-l border-slate-300">مجموع واریزی تومانی</td>
                <td className="p-1.5 text-left font-mono font-bold" dir="ltr">{data.totalExchangeToman.toLocaleString()} T</td>
              </tr>
              <tr>
                <td className="p-1.5 border-l border-slate-300">مجموع دریافتی درهم (AED)</td>
                <td className="p-1.5 text-left font-mono font-bold" dir="ltr">{data.totalExchangeAed.toLocaleString()} AED</td>
              </tr>
              <tr>
                <td className="p-1.5 border-l border-slate-300">میانگین نرخ تبدیل درهم</td>
                <td className="p-1.5 text-left font-mono font-bold" dir="ltr">
                  {data.totalExchangeAed > 0 ? Math.round(data.totalExchangeToman / data.totalExchangeAed).toLocaleString() : 0} T
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions in this Month (Summary Sample) */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-800 bg-slate-200 px-3 py-1 rounded-t-lg border border-slate-300">
          جدول ۲: ریز بارنامه‌ها و تراکنش‌های فروش ماه ({data.transactions.length} مورد)
        </h3>
        <table className="w-full text-right border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-slate-300">
              <th className="p-1 border-l border-slate-300 text-center w-8">#</th>
              <th className="p-1 border-l border-slate-300 w-24">تاریخ</th>
              <th className="p-1 border-l border-slate-300">نام راننده</th>
              <th className="p-1 border-l border-slate-300 text-center w-20">بارنامه</th>
              <th className="p-1 border-l border-slate-300 text-center w-16">تناژ (تن)</th>
              <th className="p-1 border-l border-slate-300 text-center w-24">کرایه (تومان)</th>
              <th className="p-1 text-center w-28">مبلغ گاز (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-3 text-center text-slate-400 italic">هیچ تراکنش فروشی در این ماه ثبت نشده است.</td>
              </tr>
            ) : (
              data.transactions.slice(0, 15).map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-1 border-l border-slate-300 text-center font-mono">{i + 1}</td>
                  <td className="p-1 border-l border-slate-300 font-mono" dir="ltr">{t.date || '-'}</td>
                  <td className="p-1 border-l border-slate-300 font-semibold">{t.driverName || 'راننده'}</td>
                  <td className="p-1 border-l border-slate-300 text-center font-mono">{t.billOfLading || '-'}</td>
                  <td className="p-1 border-l border-slate-300 text-center font-mono">{t.volume}</td>
                  <td className="p-1 border-l border-slate-300 text-left font-mono" dir="ltr">{(t.freightPrice || 0).toLocaleString()}</td>
                  <td className="p-1 text-left font-mono font-bold text-emerald-700" dir="ltr">{t.totalPrice.toLocaleString()}</td>
                </tr>
              ))
            )}
            {data.transactions.length > 15 && (
              <tr className="bg-slate-100 italic text-[9px] text-slate-600">
                <td colSpan={7} className="p-1.5 text-center">
                  + {data.transactions.length - 15} مورد تراکنش دیگر در پایگاه داده ثبت شده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Official Signatures & Stamp Footer */}
      <div className="mt-8 pt-4 border-t-2 border-slate-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 border border-dashed border-slate-400 rounded-lg">
            <div className="font-bold text-[11px] text-slate-800">تنظیم کننده:</div>
            <div className="text-[10px] text-slate-500 mt-1">واحد حسابداری و امور مالی</div>
            <div className="h-12 flex items-end justify-center text-[10px] text-slate-400">امضا و تاریخ</div>
          </div>

          <div className="p-3 border border-dashed border-slate-400 rounded-lg">
            <div className="font-bold text-[11px] text-slate-800">تایید کننده:</div>
            <div className="text-[10px] text-slate-500 mt-1">مدیر امور مالی و بازرگانی</div>
            <div className="h-12 flex items-end justify-center text-[10px] text-slate-400">امضا و تایید</div>
          </div>

          <div className="p-3 border border-dashed border-slate-400 rounded-lg">
            <div className="font-bold text-[11px] text-slate-800">مهر ایستگاه صادرات گاز:</div>
            <div className="text-[10px] text-slate-500 mt-1">ایستگاه مرکزی صادرات</div>
            <div className="h-12 flex items-end justify-center text-[10px] text-slate-400">محل مهر رسمی</div>
          </div>
        </div>
        
        <div className="mt-4 text-center text-[9px] text-slate-400">
          این گزارش به صورت خودکار توسط سیستم مدیریت صادرات گاز (GER) تولید و دارای شناسه یکتای اعتبارسنجی می‌باشد.
        </div>
      </div>
    </div>
  );
};
