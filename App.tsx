
import React, { useState, useEffect } from 'react';
import { DataProvider } from './context/DataContext';
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
  Database,
  Container,
  Landmark,
  Moon,
  Sun,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  LayoutDashboard,
  ChevronRight,
  CreditCard,
  ShieldAlert,
  Wrench
} from 'lucide-react';

// Static imports so all tabs and UI components are pre-bundled and work 100% offline
import DriverRegistration from './components/DriverRegistration';
import QueueManager from './components/QueueManager';
import TransactionEntry from './components/TransactionEntry';
import DriversList from './components/DriversList';
import DriverSettlements from './components/DriverSettlements';
import DriverExpensesManager from './components/DriverExpensesManager';
import FinancialReport from './components/FinancialReport';
import AIChat from './components/AIChat';
import CompanyManager from './components/CompanyManager';
import ReceiverManager from './components/ReceiverManager';
import PurchaseEntry from './components/PurchaseEntry';
import PartnerManager from './components/PartnerManager';
import ExpenseManager from './components/ExpenseManager';
import BackupManager from './components/BackupManager';
import ExchangeManager from './components/ExchangeManager';
import LicenseGenerator from './components/LicenseGenerator';
import LiveLoadingDischargeDashboard from './components/LiveLoadingDischargeDashboard';
import SystemAdminManager from './components/SystemAdminManager';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

import LicenseGuard from './components/LicenseGuard';
import { getAppLicenseStatus } from './services/licensing';

const HeaderContent: React.FC<{ 
    setSidebarOpen: (o: boolean) => void, 
    activeTab: Tab,
    isDark: boolean,
    toggleTheme: () => void
}> = ({ setSidebarOpen, activeTab, isDark, toggleTheme }) => {
    const [licenseStatus, setLicenseStatus] = useState(getAppLicenseStatus());

    useEffect(() => {
        const updateStatus = () => setLicenseStatus(getAppLicenseStatus());
        const interval = setInterval(updateStatus, 60000);
        window.addEventListener('license-updated', updateStatus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('license-updated', updateStatus);
        };
    }, []);

    const getTabName = (tab: Tab) => {
        switch(tab) {
            case 'dashboard': return 'داشبورد وضعیت لحظه‌ای تخلیه و بارگیری';
            case 'register': return 'ثبت راننده';
            case 'queue': return 'صف بارگیری';
            case 'entry': return 'ثبت ورود گاز';
            case 'drivers': return 'لیست رانندگان';
            case 'driver-settlements': return 'تنظیم و پرداخت رانندگان (شبا و وزن)';
            case 'driver-expenses': return 'ثبت و مدیریت هزینه‌های راننده و خودرو';
            case 'reports': return 'گزارش‌های مالی';
            case 'companies': return 'مدیریت شرکت‌ها';
            case 'receivers': return 'مدیریت تحویل‌گیرندگان';
            case 'purchases': return 'خرید از شرکت‌ها';
            case 'partners': return 'مدیریت شرکا';
            case 'expenses': return 'مدیریت هزینه‌ها';
            case 'exchange': return 'امور صرافی';
            case 'ai-chat': return 'دستیار هوشمند و نقشه';
            case 'backup': return 'پشتیبان‌گیری';
            case 'system-admin': return 'مدیریت سال مالی و ریست برنامه';
            case 'admin': return 'مدیریت لایسنس';
            default: return '';
        }
    }

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm print:hidden transition-colors">
             <div className="flex items-center gap-4">
               <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                 <Menu size={24} />
               </button>
               <div className="flex flex-col">
                   <h2 className="text-xl font-bold text-slate-800 dark:text-white whitespace-nowrap">
                     {getTabName(activeTab)}
                   </h2>
                   <span className="text-[10px] text-slate-400 dark:text-slate-500">Gas Export Management System</span>
               </div>
             </div>

             <div className="flex items-center gap-3">
               <PWAInstallButton />

               <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                   (licenseStatus.remainingDays || 0) < 10 
                   ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' 
                   : 'bg-emerald-50 text-emerald-600 border-emerald-200'
               }`}>
                   {(licenseStatus.remainingDays || 0) < 10 ? <AlertTriangle size={12}/> : <ShieldCheck size={12}/>}
                   <span>{licenseStatus.message}</span>
               </div>

               <button 
                 onClick={toggleTheme}
                 className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent dark:border-slate-700"
                 title={isDark ? "تم روشن" : "تم تاریک"}
               >
                 {isDark ? <Sun size={20} /> : <Moon size={20} />}
               </button>

               <div className="flex items-center gap-3 hidden sm:flex pl-2 border-r dark:border-slate-700 pr-4 mr-2">
                 <div className="text-sm text-left">
                   <p className="font-bold text-slate-700 dark:text-slate-200">مدیر سیستم</p>
                   <p className="text-[10px] text-slate-500 dark:text-slate-400">ایستگاه مرکزی</p>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                   M
                 </div>
               </div>
             </div>
        </header>
    );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setSidebarOpen(false);
      }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
        activeTab === tab 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
          <Icon size={20} className={activeTab === tab ? "animate-pulse" : ""} />
          <span className="font-medium text-sm">{label}</span>
      </div>
      {activeTab === tab && <ChevronRight size={16} />}
    </button>
  );

  const renderContent = () => {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {(() => {
          switch (activeTab) {
            case 'dashboard': return <LiveLoadingDischargeDashboard onNavigate={(tab: Tab) => setActiveTab(tab)} />;
            case 'register': return <DriverRegistration />;
            case 'queue': return <QueueManager />;
            case 'entry': return <TransactionEntry />;
            case 'drivers': return <DriversList />;
            case 'driver-settlements': return <DriverSettlements />;
            case 'driver-expenses': return <DriverExpensesManager isModal={false} />;
            case 'reports': return <FinancialReport />;
            case 'companies': return <CompanyManager />;
            case 'receivers': return <ReceiverManager />;
            case 'purchases': return <PurchaseEntry />;
            case 'partners': return <PartnerManager />;
            case 'expenses': return <ExpenseManager />;
            case 'exchange': return <ExchangeManager />; 
            case 'ai-chat': return <AIChat />;
            case 'backup': return <BackupManager />;
            case 'system-admin': return <SystemAdminManager />;
            case 'admin': return <LicenseGenerator />;
            default: return <DriverRegistration />;
          }
        })()}
      </div>
    );
  };

  return (
    <DataProvider>
      <LicenseGuard>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors font-vazir" dir="rtl">
            <OfflineIndicator />
            
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-slate-300 fixed right-0 h-full z-40 transition-all print:hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <LayoutDashboard className="text-white" size={24}/>
                        </div>
                        <h1 className="text-xl font-black text-white tracking-wide">مدیریت<span className="text-blue-500">گاز</span></h1>
                    </div>
                    <p className="text-[10px] text-slate-500 pr-11">نسخه سازمانی ۲.۶.۰</p>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">عملیات و مانیتورینگ زنده</div>
                    <NavItem tab="dashboard" icon={LayoutDashboard} label="صفحه اصلی (تخلیه و بارگیری)" />
                    <NavItem tab="register" icon={UserPlus} label="ثبت راننده" />
                    <NavItem tab="queue" icon={Truck} label="صف بارگیری" />
                    <NavItem tab="entry" icon={Fuel} label="ورود گاز" />
                    
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">بازرگانی و مالی</div>
                    <NavItem tab="companies" icon={Building2} label="شرکت‌ها" />
                    <NavItem tab="receivers" icon={Container} label="تحویل‌گیرندگان" />
                    <NavItem tab="purchases" icon={ShoppingCart} label="خرید گاز" />
                    <NavItem tab="expenses" icon={Wallet} label="هزینه‌ها جاری" />
                    <NavItem tab="partners" icon={Handshake} label="شرکا و سود" />
                    <NavItem tab="exchange" icon={Landmark} label="امور صرافی" />

                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">گزارشات و رانندگان</div>
                    <NavItem tab="drivers" icon={Users} label="لیست رانندگان" />
                    <NavItem tab="driver-expenses" icon={Wrench} label="هزینه‌های راننده و ماشین" />
                    <NavItem tab="driver-settlements" icon={CreditCard} label="پرداختی رانندگان (کارت و شبا)" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">مدیریت سیستم</div>
                    <NavItem tab="backup" icon={Database} label="پشتیبان‌گیری" />
                    <NavItem tab="system-admin" icon={ShieldAlert} label="مدیریت سال مالی و ریست" />
                    <NavItem tab="admin" icon={KeyRound} label="مدیریت لایسنس" />
                </nav>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
            <div className="fixed inset-0 bg-black/60 z-40 lg:hidden print:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            )}
            
            {/* Mobile Sidebar */}
            <aside className={`fixed top-0 right-0 w-72 bg-slate-900 text-slate-300 h-full z-50 transform transition-transform duration-300 lg:hidden print:hidden shadow-2xl ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h1 className="text-xl font-bold text-white">منوی سیستم</h1>
                    <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-800 p-1 rounded-lg">
                    <X size={24} />
                    </button>
                </div>
                <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)] pb-20">
                    <NavItem tab="dashboard" icon={LayoutDashboard} label="صفحه اصلی (تخلیه و بارگیری)" />
                    <NavItem tab="register" icon={UserPlus} label="ثبت راننده" />
                    <NavItem tab="queue" icon={Truck} label="صف بارگیری" />
                    <NavItem tab="entry" icon={Fuel} label="ورود گاز" />
                    <div className="my-2 border-t border-slate-800"></div>
                    <NavItem tab="companies" icon={Building2} label="شرکت‌ها" />
                    <NavItem tab="receivers" icon={Container} label="تحویل‌گیرندگان" />
                    <NavItem tab="purchases" icon={ShoppingCart} label="خرید گاز" />
                    <NavItem tab="expenses" icon={Wallet} label="هزینه‌ها" />
                    <NavItem tab="partners" icon={Handshake} label="شرکا و سود" />
                    <NavItem tab="exchange" icon={Landmark} label="امور صرافی" />
                    <div className="my-2 border-t border-slate-800"></div>
                    <NavItem tab="drivers" icon={Users} label="لیست رانندگان" />
                    <NavItem tab="driver-expenses" icon={Wrench} label="هزینه‌های راننده و ماشین" />
                    <NavItem tab="driver-settlements" icon={CreditCard} label="پرداختی رانندگان (کارت و شبا)" />
                    <NavItem tab="reports" icon={FileText} label="گزارش‌های مالی" />
                    <NavItem tab="backup" icon={Database} label="پشتیبان‌گیری" />
                    <NavItem tab="system-admin" icon={ShieldAlert} label="مدیریت سال مالی و ریست" />
                    <div className="my-2 border-t border-slate-800"></div>
                    <NavItem tab="ai-chat" icon={Bot} label="دستیار نقشه" />
                    <NavItem tab="admin" icon={KeyRound} label="مدیریت لایسنس" />
                </nav>
            </aside>

            <main className="flex-1 lg:mr-72 flex flex-col min-h-screen transition-all print:mr-0 print:w-full">
                <HeaderContent 
                  setSidebarOpen={setSidebarOpen} 
                  activeTab={activeTab} 
                  isDark={isDark} 
                  toggleTheme={toggleTheme} 
                />
                <div className="p-6 flex-1 overflow-x-hidden print:p-0">
                    {renderContent()}
                </div>
            </main>
        </div>
      </LicenseGuard>
    </DataProvider>
  );
};

export default App;
