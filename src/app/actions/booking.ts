'use server';

import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { calculateInvoiceTotal } from '@/lib/pricing-engine';
import { LogisticsBookingValues } from './booking'; // Import the new strict Zod types!

export async function createBookingWithInvoice(formData: LogisticsBookingValues) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const db = await getDb();

  // 1. SECURE FETCH: Get the live, Owner-defined Master Rates
  const masterConfig = await db.collection('warehouse_config').findOne({});
  if (!masterConfig) throw new Error('Warehouse configuration missing. Cannot calculate price.');

  // Look up "Master Configuration" matching the Commodity type selection
  const targetCommodity = masterConfig.commodities.find(
    (c: any) => c.name.toUpperCase() === formData.commodity.toUpperCase()
  );

  // If there's a custom rate for this commodity, use it. Otherwise, use a default base rate.
  const ratePerTon = targetCommodity ? targetCommodity.ratePerSqFt : 12.50;

  // 2. SERVER-SIDE MATH: Calculate Final Bill securely using Weight (Tons)
  const invoiceCalculations = calculateInvoiceTotal(
    formData.startDate,
    formData.endDate,
    formData.weight,  
    ratePerTon        
  );

  // 3. TRANSACTION / SAVE: Lock the booking into history
  const newBooking = {
    userId: (session.user as any).id,
    userEmail: session.user.email,
    customerName: formData.customerName,
    mobileNumber: formData.mobileNumber,
    commodity: formData.commodity,
    truckNumber: formData.truckNumber,
    weightTons: formData.weight,
    startDate: formData.startDate,
    endDate: formData.endDate,
    status: 'PENDING_APPROVAL',
    createdAt: new Date(),
  };

  const bookingRes = await db.collection('bookings').insertOne(newBooking);

  // 4. Generate the immutable formal invoice
  const formalInvoice = {
    bookingId: bookingRes.insertedId,
    clientEmail: session.user.email,
    customerName: formData.customerName,
    commodity: formData.commodity,
    ...invoiceCalculations, // Locks in rateApplied, subtotal, taxAmount, totalAmount
    status: 'UNPAID',
    generatedAt: new Date(),
  };

  await db.collection('invoices').insertOne(formalInvoice);

  return { success: true, invoice: formalInvoice };
}
