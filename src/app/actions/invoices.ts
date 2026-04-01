'use server';

import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

export async function fetchUserInvoices() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const db = await getDb();
  
  // Fetch actual formal invoices from the database
  const invoices = await db.collection('invoices')
    .find({ clientEmail: session.user.email })
    .sort({ generatedAt: -1 })
    .toArray();

  // MUST stringify ObjectIds and Dates to avoid "Only plain objects can be passed to Client Components" error
  return invoices.map(inv => ({
    id: inv._id.toString(),
    bookingId: inv.bookingId.toString(),
    clientEmail: inv.clientEmail,
    customerName: inv.customerName,
    commodity: inv.commodity,
    durationDays: inv.durationDays,
    rateApplied: inv.rateApplied,
    subtotal: inv.subtotal,
    taxAmount: inv.taxAmount,
    totalAmount: inv.totalAmount,
    status: inv.status,
    generatedAt: inv.generatedAt ? inv.generatedAt.toISOString() : new Date().toISOString()
  }));
}

// NEW: Dynamically update Invoice Status (Pending <-> Paid)
export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const db = await getDb();
    await db.collection('invoices').updateOne(
      { _id: new ObjectId(invoiceId) },
      { $set: { status: newStatus } }
    );

    // Forces Next.js to immediately refetch and redraw the server-rendered table
    revalidatePath('/dashboard/invoices');
    return { success: true };
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return { success: false, message: 'Database error' };
  }
}
