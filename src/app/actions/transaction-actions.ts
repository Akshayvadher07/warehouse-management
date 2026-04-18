'use server';

import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongoose';
import Inward from '@/lib/models/Inward';
import Outward from '@/lib/models/Outward';
import Warehouse from '@/lib/models/Warehouse';
import Commodity from '@/lib/models/Commodity';
import Invoice from '@/lib/models/Invoice';
import RevenueDistribution from '../../lib/models/RevenueDistribution';
import { revalidatePath } from 'next/cache';
import { calculateRent } from '@/lib/pricing-engine';

/**
 * Calculates current stock balance for Client + Commodity + Warehouse
 */
export async function getStockBalance(clientId: string, commodityId: string, warehouseId: string) {
  await connectToDatabase();

  const inwardResult = await Inward.aggregate([
    {
      $match: {
        clientId: new mongoose.Types.ObjectId(clientId),
        commodityId: new mongoose.Types.ObjectId(commodityId),
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
      },
    },
    { $group: { _id: null, total: { $sum: '$quantityMT' } } },
  ]);

  const outwardResult = await Outward.aggregate([
    {
      $match: {
        clientId: new mongoose.Types.ObjectId(clientId),
        commodityId: new mongoose.Types.ObjectId(commodityId),
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
      },
    },
    { $group: { _id: null, total: { $sum: '$quantityMT' } } },
  ]);

  const totalInwardValue = inwardResult[0]?.total || 0;
  const totalOutwardValue = outwardResult[0]?.total || 0;

  return totalInwardValue - totalOutwardValue;
}

/**
 * Processes Inward entry with Grouped Invoicing and Revenue Distribution
 */
export async function processInward(data: {
  clientId: string;
  commodityId: string;
  warehouseId: string;
  quantityMT: number;
  bagsCount: number;
  date?: string | Date;
  outwardDate: string | Date;
}) {
  await connectToDatabase();
  
  // NOTE: Transactions are disabled to support standalone MongoDB instances.
  // For production, it is highly recommended to use a Replica Set and re-enable transactions.
  
  try {
    const inwardDate = data.date ? new Date(data.date) : new Date();
    const outwardDate = new Date(data.outwardDate);
    console.log("Processing Inward:", { inwardDate, outwardDate });

    // 0. Fetch Commodity for Rate
    const commodity = await Commodity.findById(data.commodityId);
    if (!commodity) throw new Error('Commodity not found');

    // 1. Create Inward Record
    const [newInward] = await Inward.create([{
      ...data,
      date: inwardDate,
      outwardDate: outwardDate
    }]);

    // 2. Update Warehouse Capacity
    const warehouse = await Warehouse.findById(data.warehouseId);
    if (!warehouse) throw new Error('Warehouse not found');
    if (warehouse.occupiedCapacity + data.quantityMT > warehouse.totalCapacity) {
      throw new Error('Transaction exceeds warehouse total capacity');
    }
    warehouse.occupiedCapacity += data.quantityMT;
    if (warehouse.occupiedCapacity >= warehouse.totalCapacity) warehouse.status = 'FULL';
    await warehouse.save();

    // 3. Financial Calculations (Precise 60/40 Split)
    const rent = calculateRent(data.quantityMT, commodity.ratePerMtMonth, inwardDate, outwardDate);
    const totalAmount = rent.totalAmount;

    // Exact 60/40 Split
    const ownerShare = Number((totalAmount * 0.6).toFixed(2));
    const platformShare = Number((totalAmount - ownerShare).toFixed(2));

    await RevenueDistribution.create([{
      inwardId: newInward._id,
      clientId: data.clientId,
      warehouseId: data.warehouseId,
      totalAmount,
      ownerShare,
      platformShare,
    }]);

    // 4. Consolidated Invoicing Logic
    const cycleName = inwardDate.toISOString().slice(0, 7);
    const lineItem = {
      inwardId: newInward._id,
      commodityId: data.commodityId,
      commodityName: commodity.name,
      quantityMT: data.quantityMT,
      durationDays: rent.totalDays,
      rateApplied: commodity.ratePerMtMonth,
      subtotal: totalAmount,
      calculationPath: `${data.quantityMT}MT x ₹${commodity.ratePerMtMonth} x ${rent.totalDays}/30 days`,
    };

    const invoice = await Invoice.findOneAndUpdate(
      {
        clientId: data.clientId,
        warehouseId: data.warehouseId,
        status: 'OPEN'
      },
      {
        $push: { items: lineItem },
        $inc: { totalAmount: totalAmount },
        $setOnInsert: {
          invoiceId: `INV-${cycleName.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
          cycleName,
          status: 'OPEN',
          generatedAt: new Date()
        }
      },
      {
        new: true,
        upsert: true
        // session removed
      }
    );

    revalidatePath('/dashboard/inward');
    revalidatePath('/dashboard/warehouses');
    revalidatePath('/dashboard/ledger');
    revalidatePath('/dashboard/revenue');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newInward)),
      bookingId: newInward._id.toString(),
      invoiceId: invoice?._id.toString()
    };
  } catch (error: any) {
    console.error('Inward Processing Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Processes Outward withdrawal
 */
export async function processOutward(data: {
  clientId: string;
  commodityId: string;
  warehouseId: string;
  quantityMT: number;
  date?: string | Date;
}) {
  await connectToDatabase();

  try {
    const outwardDate = data.date ? new Date(data.date) : new Date();

    const currentBalance = await getStockBalance(data.clientId, data.commodityId, data.warehouseId);
    if (data.quantityMT > currentBalance) {
      throw new Error(`Insufficient stock. Available: ${currentBalance} MT`);
    }

    const [newOutward] = await Outward.create([{
      ...data,
      date: outwardDate
    }]);

    const warehouse = await Warehouse.findById(data.warehouseId);
    if (!warehouse) throw new Error('Warehouse not found');
    warehouse.occupiedCapacity -= data.quantityMT;
    if (warehouse.occupiedCapacity < warehouse.totalCapacity && warehouse.status === 'FULL') {
      warehouse.status = 'ACTIVE';
    }
    await warehouse.save();

    revalidatePath('/dashboard/outward');
    revalidatePath('/dashboard/warehouses');
    revalidatePath('/dashboard/ledger');

    return { success: true, data: JSON.parse(JSON.stringify(newOutward)) };
  } catch (error: any) {
    console.error('Outward Processing Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch detailed Ledger data for a client
 */
export async function getClientLedger(clientId: string) {
  await connectToDatabase();

  return Invoice.find({ clientId })
    .populate('warehouseId')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Fetch Revenue Distribution analytics
 */
export async function getRevenueAnalytics() {
  await connectToDatabase();

  const totalRevenue = await RevenueDistribution.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        ownerEarnings: { $sum: '$ownerShare' },
        platformCommissions: { $sum: '$platformShare' },
      }
    }
  ]);

  const recentLogs = await RevenueDistribution.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('warehouseId')
    .populate('clientId')
    .lean();

  return {
    summary: totalRevenue[0] || { totalRevenue: 0, ownerEarnings: 0, platformCommissions: 0 },
    recentLogs: JSON.parse(JSON.stringify(recentLogs))
  };
}
