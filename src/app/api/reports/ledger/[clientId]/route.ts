import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateLedger } from '@/lib/ledger-engine';
import type { Transaction, Payment, MatchedRecord } from '@/lib/ledger-engine';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const clientId = url.pathname.split('/').pop() || '';
    if (!clientId) {
      return NextResponse.json({ success: false, message: 'Client ID is required' }, { status: 400 });
    }
    const trimmedClientId = clientId.trim();
    if (!trimmedClientId) {
      return NextResponse.json({ success: false, message: 'Client ID is required' }, { status: 400 });
    }

    const db = await getDb();

    const accountId = trimmedClientId;

    const [bookings, transactionDocs, paymentsDocs] = await Promise.all([
      db.collection('bookings')
        .find({ accountId, direction: { $in: ['INWARD', 'OUTWARD'] } })
        .sort({ date: 1 })
        .toArray(),
      db.collection('transactions')
        .find({ accountId })
        .sort({ date: 1 })
        .toArray(),
      db.collection('payments')
        .find({ accountId })
        .sort({ date: 1 })
        .toArray(),
    ]);

    const transactionData: Transaction[] = Array.from(
      new Map(
        [
          ...bookings.map((txn) => ({
            _id: txn._id?.toString() || '',
            date: txn.date,
            direction: txn.direction,
            mt: txn.mt,
            clientName: txn.clientName,
            commodityName: txn.commodityName,
            gatePass: txn.gatePass,
          })),
          ...transactionDocs.map((txn) => ({
            _id: txn._id?.toString() || '',
            date: txn.date,
            direction: txn.direction,
            mt: txn.quantityMT,
            clientName: txn.clientName || bookings[0]?.clientName || clientId,
            commodityName: txn.commodityName,
            gatePass: txn.gatePass || '',
          })),
        ].map((item) => [item._id, item])
      ).values()
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const paymentData: Payment[] = paymentsDocs.map((pay) => ({
      _id: pay._id?.toString() || '',
      date: pay.date,
      amount: pay.amount,
      clientName: pay.clientName || bookings[0]?.clientName || clientId,
    }));

    const matchedRecords: MatchedRecord[] = bookings.map((booking) => ({
      _id: booking._id?.toString() || '',
      clientName: booking.clientName,
      date: booking.date,
      location: booking.location || '',
      commodity: booking.commodityName || '',
      totalMT: booking.direction === 'INWARD' ? booking.mt : -booking.mt,
    }));

    const ledgerSummary = calculateLedger(
      transactionData,
      paymentData,
      bookings[0]?.clientName || clientId
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...ledgerSummary,
          matchedRecords,
          recordCount: matchedRecords.length,
          isAggregated: matchedRecords.length > 1,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/reports/ledger/[clientId] error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
