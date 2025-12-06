
import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Tab } from './types';
import { 
  Truck, 
  Users, 
  UserPlus, 
  FileText, 
  Fuel, 
  Bot, 
  Menu, 
  X,
  Building2,
  ShoppingCart,
  Handshake,
  Wallet,
  Coins
} from 'lucide-react';

import DriverRegistration from './components/DriverRegistration';
import QueueManager from './components/QueueManager';
import TransactionEntry from './components/TransactionEntry';
import DriversList from './components/DriversList';
import FinancialReport from './components/FinancialReport';
import AIChat from './components/AIChat';
import CompanyManager from './components/CompanyManager';
import PurchaseEntry from './components/PurchaseEntry';
import PartnerManager from './components/PartnerManager';
import ExpenseManager from './components/ExpenseManager';

const HeaderContent: React.FC<{ 
    setSidebarOpen: (o: boolean) => void, 
    activeTab: Tab 
}> = ({ setSidebarOpen, activeTab }) => {
    const { exchangeRates, updateExchangeRates } = useData();
    const [localRates, setLocalRates] = useState(exchangeRates);

    const handleRateChange = (curr: 'usd' | 'aed', val: string) => {
        const newRates = { ...localRates, [curr]: parseFloat(val) || 0 };
        setLocalRates(newRates);
        updateExchangeRates(newRates);
    };

    const getTabName = (tab: Tab) => {
        switch(tab) {
            case 'register': return 'ثبت راننده';
            case 'queue': return 'صف بارگیری';
            case 'entry': return 'ثبت ورود گاز';
            case 'drivers': return 'لیست رانندگان';
            case 'reports': return 'گزارش‌های مالی';
            case 'companies': return 'مدیریت شرکت‌ها';
            case 'purchases': return 'خرید از شرکت‌ها';
            case 'partners': return 'مدیریت شرکا';
            case 'expenses': return 'مدیریت هزینه‌ها';
            case 'ai-chat': return 'دستیار هوشمند';
            default: return '';
        }
    }

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 print:hidden">
             <div className="flex items-center gap-4">
               <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 hover:text-slate-900">
                 <Menu size={24} />
               </button>
               <h2 className="text-xl font-semibold text-slate-800 whitespace-nowrap">
                 {getTabName(activeTab)}
               </h2>
             </div>

             {/* Currency Rates Widget */}
             <div className="flex items-center gap-4 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 overflow-x-auto">
                <div className="flex items-center gap-2 text-slate-600">
                    <Coins size={16} className="text-amber-500" />
                    <span className="text-xs font-bold">نرخ ارز:</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">دلار:</span>
                    <input 
                        type="number" 
                        value={localRates.usd} 
                        onChange={(e) => handleRateChange('usd', e.target.value)}
                        className="w-20 text-xs p-1 border border-slate-300 rounded text-center focus:ring-1 focus:ring-blue-500 outline-none" 
                    />
                </div>
                <div className="w-px h-4 bg-slate-300"></div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">درهم:</span>
                    <input 
                        type="number" 
                        value={localRates.aed} 
                        onChange={(e) => handleRateChange('aed', e.target.value)}
                        className="w-20 text-xs p-1 border border-slate-300 rounded text-center focus:ring-1 focus:ring-blue-500 outline-none" 
                    />
                </div>
             </div>

             <div className="flex items-center gap-3 hidden sm:flex">
               <div className="text-sm text-left">
                 <p className="font-medium text-slate-700">مدیر سیستم</p>
                 <p className="text-xs text-slate-500">ایستگاه #۴۲</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm">
                 م
               </div>
             </div>
        </header>
    );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('register');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
        activeTab === tab 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'register': return <DriverRegistration />;
      case 'queue': return <QueueManager />;
      case 'entry': return <TransactionEntry />;
      case 'drivers': return <DriversList />;
      case 'reports': return <FinancialReport />;
      case 'companies': return <CompanyManager />;
      case 'purchases': return <PurchaseEntry />;
      case 'partners': return <PartnerManager />;
      case 'expenses': return <ExpenseManager />;
      case 'ai-chat': return <AIChat />;
      default: return <DriverRegistration />;
    }
  };

  return (
    <DataProvider>
      <div className="min-h-screen bg-slate-50 flex" dir="rtl">
        {/* Sidebar for Desktop - Moved to Right */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 fixed right-0 h-full z-10 transition-all print:hidden">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white tracking-wide">مدیریت<span className="text-blue-500">صادرات‌گاز</span></h1>
            <p className="text-xs text-slate-500 mt-1">نسخه ۲.۲.۰ سازمانی</p>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">عملیات</div>
            <NavItem tab="register" icon={UserPlus} label="ثبت راننده" />
            <NavItem tab="queue" icon={Truck} label="صف بارگیری" />
            <NavItem tab="entry" icon={Fuel} label="ورود گاز" />
            
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">بازرگانی</div>
            <NavItem tab="companies" icon={Building2} label="شرکت‌ها" />
            <NavItem tab="purchases" icon={ShoppingCart} label="خرید گاز" />
            <NavItem tab="expenses" icon={Wallet} label="هزینه‌های جاری" />
            <NavItem tab="partners" icon={Handshake} label="شرکا و سود" />

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">داده‌ها و گزارش‌ها</div>
            <NavItem tab="drivers" icon={Users} label="لیست رانندگان" />
            <NavItem tab="reports" icon={FileText} label="گزارش‌های مالی" />

            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">دستیار</div>
            <NavItem tab="ai-chat" icon={Bot} label="دستیار هوشمند" />
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden print:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        
        {/* Mobile Sidebar - Moved to Right */}
        <aside className={`fixed top-0 right-0 w-64 bg-slate-900 text-slate-300 h-full z-30 transform transition-transform duration-300 lg:hidden print:hidden ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="p-6 border-b border-slate-800 flex justify-between items-center">
             <div>
                <h1 className="text-xl font-bold text-white">مدیریت‌گاز</h1>
             </div>
             <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
               <X size={24} />
             </button>
          </div>
          <nav className="p-4 space-y-2 overflow-y-auto max-h-screen pb-20">
            <NavItem tab="register" icon={UserPlus} label="ثبت راننده" />
            <NavItem tab="queue" icon={Truck} label="صف بارگیری" />
            <NavItem tab="entry" icon={Fuel} label="ورود گاز" />
            <NavItem tab="companies" icon={Building2} label="شرکت‌ها" />
            <NavItem tab="purchases" icon={ShoppingCart} label="خرید گاز" />
            <NavItem tab="expenses" icon={Wallet} label="هزینه‌ها" />
            <NavItem tab="partners" icon={Handshake} label="شرکا و سود" />
            <NavItem tab="drivers" icon={Users} label="لیست رانندگان" />
            <NavItem tab="reports" icon={FileText} label="گزارش‌های مالی" />
            <NavItem tab="ai-chat" icon={Bot} label="دستیار هوشمند" />
          </nav>
        </aside>

        {/* Main Content - Adjusted margin for RTL */}
        <main className="flex-1 lg:mr-64 flex flex-col min-h-screen transition-all print:mr-0">
            <HeaderContent setSidebarOpen={setSidebarOpen} activeTab={activeTab} />
          <div className="p-6 flex-1 overflow-x-hidden print:p-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </DataProvider>
  );
};

export default App;
