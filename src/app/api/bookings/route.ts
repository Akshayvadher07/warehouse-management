import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    // 1. Server-Side Protection
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { zoneId, startDate, endDate, requestedSpace } = body;
    const db = await getDb();

    // 2. Overbooking Logic Guide: Calculate Currently Occupied Space
    // We look for any APPROVED bookings in this zone where the dates overlap with the requested dates.
    const overlappingBookings = await db.collection('bookings').aggregate([
      {
        $match: {
          zoneId: new ObjectId(zoneId),
          status: 'APPROVED',
          // Date Overlap logic: (StartA <= EndB) and (EndA >= StartB)
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      },
      {
        $group: {
          _id: null,
          totalOccupied: { $sum: '$occupiedSpace' }
        }
      }
    ]).toArray();

    const currentOccupied = overlappingBookings[0]?.totalOccupied || 0;

    // 3. Fetch Zone Capacity
    const zone = await db.collection('zones').findOne({ _id: new ObjectId(zoneId) });
    if (!zone) return NextResponse.json({ success: false, message: 'Zone not found' }, { status: 404 });

    // 4. Capacity Validation Check
    if (currentOccupied + requestedSpace > zone.totalCapacity) {
      return NextResponse.json({ 
        success: false, 
        message: `Overbooking prevented. Zone only has ${zone.totalCapacity - currentOccupied} units available.` 
      }, { status: 400 });
    }

    // 5. Insert Booking
    const result = await db.collection('bookings').insertOne({
      userId: new ObjectId((session.user as any).id),
      zoneId: new ObjectId(zoneId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      occupiedSpace: requestedSpace,
      status: 'PENDING',
      createdAt: new Date()
    });

    return NextResponse.json({ success: true, data: result, message: 'Booking requested successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
