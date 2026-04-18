import { ObjectId } from 'mongodb';

export interface IUser {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  createdAt: Date;
}

export interface IZone {
  _id?: ObjectId;
  name: string;
  totalCapacity: number;
  type: 'DRY_STORAGE' | 'COLD_STORAGE' | 'HAZARDOUS';
  pricePerSqFt: number;
}

export interface IWarehouse {
  _id?: ObjectId;
  name: string;
  ownerName: string;
  ownerEquity: number; // Percentage (e.g., 60 for 60%)
  location: string;
  capacity: number;
  type: 'DRY_STORAGE' | 'COLD_STORAGE' | 'HAZARDOUS';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClientAccount: Represents a unique ledger account for a client
 * Groups multiple bookings, commodities, and transactions under one account ID
 * Prevents name collisions by using unique bookingId as the account identifier
 */
export interface IClientAccount {
  _id?: ObjectId;
  bookingId: string; // Unique identifier (UUID or custom ID) - PRIMARY KEY for ledger grouping
  clientName: string;
  clientLocation?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    contactPerson?: string;
  };
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction: Individual warehouse transaction linked to a ClientAccount
 * All transactions under the same accountId roll up into one consolidated ledger
 */
export interface ITransaction {
  _id?: ObjectId;
  accountId: string; // Reference to IClientAccount.bookingId
  date: string; // ISO date string (YYYY-MM-DD)
  direction: 'INWARD' | 'OUTWARD';
  commodityName: string;
  quantityMT: number;
  gatePass: string;
  warehouseName?: string;
  location?: string;
  createdAt: Date;
}

/**
 * Payment: Payment record linked to a ClientAccount
 * All payments under the same accountId contribute to the account balance
 */
export interface IPayment {
  _id?: ObjectId;
  accountId: string; // Reference to IClientAccount.bookingId
  date: string; // ISO date string (YYYY-MM-DD)
  amount: number;
  paymentMethod?: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'NEFT' | 'RTGS';
  referenceNumber?: string;
  remarks?: string;
  recordedBy?: string;
  createdAt: Date;
}

export interface ILogisticsBooking {
  _id?: ObjectId;
  accountId?: string; // NEW: Reference to IClientAccount.bookingId for ledger grouping
  userId: ObjectId;
  customerName: string;      
  mobileNumber: string;      
  commodity: 'GRAINS' | 'ELECTRONICS' | 'CHEMICALS' | 'STEEL' | 'PERISHABLES'; 
  truckNumber: string;       
  weightTons: number;        
  startDate: Date;
  endDate: Date;
  warehouseId?: ObjectId; // Reference to warehouse
  warehouseName?: string; // Denormalized for performance
  
  // 1. Flow & Location
  direction: 'INWARD' | 'OUTWARD';
  date: string; // ISO Date String
  location: string;

  // 2. Stakeholders
  clientName: string;
  clientLocation?: string;
  suppliers?: string;

  // 3. Tracking Specs
  commodityName: string;
  cadNo?: string;
  stackNo?: string;
  lotNo?: string;
  doNumber?: string;
  cdfNo?: string;

  // 4. Gate & Quantities
  gatePass: string;
  pass?: string;
  bags: number;
  palaBags: number;
  mt: number;

  // 5. Billing Configuration
  storageDays: number;
  
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
}

export interface IInvoice {
  _id?: ObjectId;
  bookingId: ObjectId;
  sNo?: number; // Mapping backwards compatibility to Legacy Array
  clientEmail: string;
  customerName: string;
  commodity: string;
  warehouseId?: ObjectId; // Reference to warehouse
  warehouseName?: string; // Denormalized for performance
  durationDays?: number; // Legacy daily tracker
  daysStored?: number; // New outward withdrawal tracker
  billingCycles?: number; // Monthly calculation brackets
  rateApplied: number;
  baseStorageCost?: number; // Decoupled storage vs handling
  handlingFee?: number;
  subtotal: number;
  totalAmount?: number; // Final total (no tax)
  finalTotal?: number; // Final Settlement sum
  paidAmount?: number; // Amount already paid
  pendingAmount?: number; // Amount still due (calculated)
  status: 'OPEN' | 'UNPAID' | 'PAID' | 'PENDING_SETTLEMENT' | 'PARTIALLY_PAID';
  invoiceType?: 'STANDARD_STORAGE' | 'FINAL_WITHDRAWAL';
  generatedAt: Date;
  createdBy?: string;
}
