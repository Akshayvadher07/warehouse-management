'use server';

import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { calculateInvoiceTotal } from '@/lib/pricing-engine';
import { DetailedLogisticsValues } from '@/lib/validations/booking'; 

export async function createDetailedBooking(formData: DetailedLogisticsValues) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, message: 'Unauthorized session.' };
    }
    const db = await getDb();

    // 1. ATOMIC AUTO-INCREMENT SNO (Replicating the Excel Row counter strictly)
    const counterDoc = await db.collection<{ _id: string; seq: number }>('counters').findOneAndUpdate(
      { _id: 'ledgerSerialNo' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    // Safely extract the new sequence number
    const sNo = counterDoc?.seq || counterDoc?.value?.seq || 1;

    // 2. PRICING ENGINE LOOKUP (Maintain backwards compatibility for Billing)
    const masterConfig = await db.collection('warehouse_config').findOne({});
    let ratePerTon = 12.50; 
    
    if (masterConfig && masterConfig.commodities) {
      const targetCommodity = masterConfig.commodities.find(
        (c: any) => c.name.toUpperCase() === formData.commodityName.toUpperCase()
      );
      if (targetCommodity) ratePerTon = targetCommodity.ratePerSqFt;
    }

    // The new deep ledger uses exactly 1 Date tracking field, but Billing requires `startDate` and `endDate`.
    // We construct a mock endDate dynamically based on the requested storage duration for billing purposes.
    const mockStartDate = formData.date;
    const mockEndDate = new Date(new Date(formData.date).getTime() + (formData.storageDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const invoiceCalculations = calculateInvoiceTotal(
      mockStartDate,
      mockEndDate,
      formData.mt,  // Pipe the precise Metric Tons directly into the pricing math
      ratePerTon        
    );

    // 3. MONGO LEDGER INSERTION (18 columns exact mapping)
    const newBooking = {
      sNo: sNo,
      userId: (session.user as any).id,
      userEmail: session.user.email,
      ...formData,
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    };
    
    const bookingRes = await db.collection('bookings').insertOne(newBooking);

    // 4. GENERATE IMMUTABLE FORMAL INVOICE
    const formalInvoice: any = {
      bookingId: bookingRes.insertedId,
      sNo: sNo,
      clientEmail: session.user.email,
      customerName: formData.clientName,
      commodity: formData.commodityName,
      ...invoiceCalculations,
      status: 'UNPAID',
      generatedAt: new Date(),
    };
    
    await db.collection('invoices').insertOne(formalInvoice);

    // Strip objectIds for Next.js strict SSR Client serialization
    const safeInvoiceFeedback = {
      ...formalInvoice,
      _id: formalInvoice._id?.toString(),
      bookingId: formalInvoice.bookingId.toString(),
      generatedAt: formalInvoice.generatedAt.toISOString(),
    };

    return { 
      success: true, 
      invoice: safeInvoiceFeedback, 
      serialNo: sNo 
    };
    
  } catch (error: any) {
    console.error('SERVER ACTION ERROR:', error);
    return { success: false, message: error.message || 'Internal Database Exception.' };
  }
}
