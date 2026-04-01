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

export interface ILogisticsBooking {
  _id?: ObjectId;
  userId: ObjectId;
  customerName: string;      
  mobileNumber: string;      
  commodity: 'GRAINS' | 'ELECTRONICS' | 'CHEMICALS' | 'STEEL' | 'PERISHABLES'; 
  truckNumber: string;       
  weightTons: number;        
  startDate: Date;
  endDate: Date;
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
  durationDays?: number; // Legacy daily tracker
  daysStored?: number; // New outward withdrawal tracker
  billingCycles?: number; // Monthly calculation brackets
  rateApplied: number;
  baseStorageCost?: number; // Decoupled storage vs handling
  handlingFee?: number;
  subtotal: number;
  taxAmount: number;
  totalAmount?: number; // Legacy total
  finalTotal?: number; // Final Settlement sum
  status: 'UNPAID' | 'PAID' | 'PENDING_SETTLEMENT';
  invoiceType?: 'STANDARD_STORAGE' | 'FINAL_WITHDRAWAL';
  generatedAt: Date;
  createdBy?: string;
}
