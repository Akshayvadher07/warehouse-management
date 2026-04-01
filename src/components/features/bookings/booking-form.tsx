'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Truck, MapPin, Users, Tags, Calculator, ChevronRight, Scale } from 'lucide-react';
import { DetailedLogisticsSchema, DetailedLogisticsValues } from '@/lib/validations/booking';
import { createDetailedBooking } from '@/app/actions/billing';
import { calculateInvoiceTotal } from '@/lib/pricing-engine';
import { MongoCommodity } from '@/lib/validations/commodity';

interface BookingFormProps {
  commodities: MongoCommodity[];
}

export default function BookingForm({ commodities }: BookingFormProps) {
  const [isSubmittingEngine, setIsSubmittingEngine] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors, isValid } } = useForm<DetailedLogisticsValues>({
    resolver: zodResolver(DetailedLogisticsSchema),
    mode: 'onTouched',
  });

  // Watch fields strictly for the Live Invoice Estimator Preview
  const watchedMT = watch('mt') || 0;
  const watchedDays = watch('storageDays') || 1;
  const watchedDate = watch('date');
  const watchedCommodity = watch('commodityName');
  const selectedRate = commodities.find(c => c.name === watchedCommodity)?.baseRate ?? 0;

  let previewTotal = 0;
  if (watchedDate && watchedMT > 0 && selectedRate > 0) {
    try {
      const mockEndDate = new Date(new Date(watchedDate).getTime() + (watchedDays * 86400000)).toISOString().split('T')[0];
      const math = calculateInvoiceTotal(watchedDate, mockEndDate, watchedMT, selectedRate);
      previewTotal = math.totalAmount;
    } catch { } // Fails silently mid-typing
  }

  const onSubmit = async (data: DetailedLogisticsValues) => {
    setIsSubmittingEngine(true);
    try {
      const result = await createDetailedBooking(data);
      if (result.success) {
        toast.success(`Success: Ledger saved as S.No #${result.serialNo}!`);
        reset(); 
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification Failed.');
    } finally {
      setIsSubmittingEngine(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="bg-white border-b border-slate-200 px-8 py-5 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center">
          <Truck className="w-6 h-6 mr-3 text-indigo-600" />
          Logistics & Cargo Entry Ledger
        </h2>
        <p className="text-slate-500 text-sm mt-1">Deep structure mirroring EXACT Excel workflow (18 Headers).</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* === CARD 1: Flow & Location === */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
            <h3 className="text-md font-semibold text-slate-800 flex items-center mb-4 border-b pb-2">
              <MapPin className="w-4 h-4 mr-2" /> 1. Flow & Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Inward/Outward *</label>
                <select {...register('direction')} className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Direction...</option>
                  <option value="INWARD">Internal (INWARD)</option>
                  <option value="OUTWARD">External (OUTWARD)</option>
                </select>
                {errors.direction && <p className="text-red-500 text-[10px] mt-1">{errors.direction.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date *</label>
                <input type="date" {...register('date')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                {errors.date && <p className="text-red-500 text-[10px] mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Warehouse Name *</label>
                <input {...register('warehouseName')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Central Depot" />
                {errors.warehouseName && <p className="text-red-500 text-[10px] mt-1">{errors.warehouseName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">LOCATION *</label>
                <input {...register('location')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Zone C" />
                {errors.location && <p className="text-red-500 text-[10px] mt-1">{errors.location.message}</p>}
              </div>
            </div>
          </div>

          {/* === CARD 2: Stakeholders === */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
            <h3 className="text-md font-semibold text-slate-800 flex items-center mb-4 border-b pb-2">
              <Users className="w-4 h-4 mr-2" /> 2. Key Stakeholders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">CLIENT NAME *</label>
                <input {...register('clientName')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Acme Logistics Corp" />
                {errors.clientName && <p className="text-red-500 text-[10px] mt-1">{errors.clientName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Client Location</label>
                <input {...register('clientLocation')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Delhi HQ" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Suppliers</label>
                <input {...register('suppliers')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Supplier Firm Ltd" />
              </div>
            </div>
          </div>

          {/* === CARD 3: Tracking Specs === */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 border-l-4 border-l-blue-500">
            <h3 className="text-md font-semibold text-slate-800 flex items-center mb-4 border-b pb-2">
              <Tags className="w-4 h-4 mr-2" /> 3. Deep Tracking & Specs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Commodity Name *</label>
                <select {...register('commodityName')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select Commodity...</option>
                  {commodities.map(c => (
                    <option key={c._id} value={c.name}>
                      {c.name} — ₹{c.baseRate}/{c.unit}
                    </option>
                  ))}
                </select>
                {errors.commodityName && <p className="text-red-500 text-[10px] mt-1">{errors.commodityName.message}</p>}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">CAD No</label>
                <input {...register('cadNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="---" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">Stack No.</label>
                <input {...register('stackNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="---" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">LOT NO</label>
                <input {...register('lotNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="L-000" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">DO Number</label>
                <input {...register('doNumber')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="DO-000" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">CDF No</label>
                <input {...register('cdfNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="CDF-000" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">GATE PASS *</label>
                <input {...register('gatePass')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase border-blue-200 bg-blue-50" placeholder="GP-123456" />
                {errors.gatePass && <p className="text-red-500 text-[10px] mt-1">{errors.gatePass.message}</p>}
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1">Pass</label>
                <input {...register('pass')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="---" />
              </div>
            </div>
          </div>

          {/* === CARD 4: Cargo Quants & Math === */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 border-l-4 border-l-emerald-500">
            <h3 className="text-md font-semibold text-slate-800 flex items-center mb-4 border-b pb-2">
              <Scale className="w-4 h-4 mr-2" /> 4. Scale Quantities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Bag (Qty)</label>
                <input type="number" {...register('bags')} className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50" placeholder="0" />
                {errors.bags && <p className="text-red-500 text-[10px] mt-1">{errors.bags.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">PALA BAG (Qty)</label>
                <input type="number" {...register('palaBags')} className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">mt (Total Metric Tons) *</label>
                <input type="number" step="0.01" {...register('mt')} className="w-full rounded-md border-2 border-emerald-400 p-3 text-lg font-bold text-emerald-900 bg-emerald-50 focus:ring-0 focus:border-emerald-500" placeholder="0.00" />
                {errors.mt && <p className="text-red-500 text-[10px] mt-1">{errors.mt.message}</p>}
              </div>
            </div>

            {/* Billing Engine Mini Config */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center">
                  Base Storage Duration (Days)
                </label>
                <input type="number" {...register('storageDays')} className="w-32 rounded-md border border-slate-300 p-2 text-sm text-center" placeholder="1" />
                <p className="text-[10px] text-slate-400 mt-1">Used to generate automatic Invoice</p>
              </div>

               {previewTotal > 0 && (
                <div className="bg-slate-900 rounded-lg p-3 px-6 flex items-center text-white shadow-md">
                   <Calculator className="w-5 h-5 mr-3 text-emerald-400" />
                   <div>
                     <p className="text-xs text-slate-400 uppercase font-semibold">Live Invoice Generation Cost</p>
                     <p className="text-xl font-black">${previewTotal.toFixed(2)}</p>
                   </div>
                </div>
               )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-6 flex justify-end">
            <button type="submit" disabled={!isValid || isSubmittingEngine} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center">
              {isSubmittingEngine ? 'Locking Ledger...' : 'Insert Row & Generate Invoice'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
