
export interface Driver {
  id: string;
  fullName: string;
  nationalId: string;
  licenseNo: string;
  phone: string;
  plateNumber: string;
  tankNumber: string;
}

export interface Transaction {
  id: string;
  driverId: string;
  companyId?: string; // Supplier Company (New)
  receiverId?: string; // Receiver/Destination (New)
  date: string;
  volume: number;
  price: number;
  totalPrice: number;
  freightPrice?: number; 
  description: string;
  billOfLading?: string;
}

export interface DriverPayment {
  id: string;
  driverId: string;
  date: string;
  amount: number;
  description: string;
}

export interface Freight {
  id: string;
  driverId: string;
  date: string;
  amount: number;
  origin: string;
  destination: string;
  description: string;
  trackingCode?: string;
}

export type QueueStatus = 'WAIT' | 'LOADING' | 'DONE' | 'CANCELLED';

export interface QueueItem {
  id: string;
  driverId: string;
  destination: string;
  entryTime: string;
  status: QueueStatus;
}

export interface Company {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Receiver {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Purchase {
  id: string;
  companyId: string;
  date: string;
  volume: number;
  price: number;
  totalPrice: number;
  description: string;
}

export interface Partner {
  id: string;
  fullName: string;
  phone: string;
  sharePercentage: number;
}

export interface PartnerPayment {
  id: string;
  partnerId: string;
  date: string;
  amount: number;
  description: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface Exchange {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface ExchangeTransaction {
  id: string;
  exchangeName: string;       // نام صرافی
  amountToman: number;        // مبلغ به تومان
  accountHolder: string;      // واریز حساب شخص
  aedRate: number;            // نرخ درهم
  aedDepositDate: string;     // تاریخ واریز درهم
  aedAmount: number;          // تحویل درهم
  aedDeliveryDate: string;    // تاریخ تحویل درهم
  receiverName: string;       // نام گیرنده
  accountCode: string;        // کد حساب شخصی
  description: string;        // توضیحات
}

export interface ExchangeRates {
  usd: number;
  aed: number;
}

export type Tab = 'register' | 'queue' | 'entry' | 'drivers' | 'reports' | 'companies' | 'receivers' | 'purchases' | 'partners' | 'expenses' | 'exchange' | 'ai-chat' | 'backup';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingMetadata?: GroundingMetadata;
  isLoading?: boolean;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            reviewText: string;
            authorAttribution?: {
                displayName: string;
            }
        }[]
    }
  };
}

export enum AIModelMode {
  CHAT_PRO = 'gemini-3-pro-preview',
  SEARCH_FLASH = 'gemini-2.5-flash-search',
  MAPS_FLASH = 'gemini-2.5-flash-maps',
}
