'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Truck, MapPin, Users, Tags, Calculator, ChevronRight, Scale } from 'lucide-react';
import { DetailedLogisticsSchema, DetailedLogisticsValues } from '@/lib/validations/booking';
import { createDetailedBooking } from '@/app/actions/billing';
import { calculateRent } from '@/lib/pricing-engine';
import { MongoCommodity } from '@/lib/validations/commodity';
import { formatCurrency } from '@/lib/utils/currency';

// ── Static fallback list ──────────────────────────────────────────────────────
// Used when the Commodity Master DB collection is still empty or unreachable.
// To add a dynamic commodity, create it at /dashboard/commodities.
const STATIC_COMMODITIES: MongoCommodity[] = [
  { _id: 'static-wheat',    name: 'WHEAT',    baseRate: 85,  unit: 'MT', category: 'Grains',  createdAt: '', updatedAt: '' },
  { _id: 'static-rice',     name: 'RICE',     baseRate: 90,  unit: 'MT', category: 'Grains',  createdAt: '', updatedAt: '' },
  { _id: 'static-chana',    name: 'CHANA',    baseRate: 95,  unit: 'MT', category: 'Pulses',  createdAt: '', updatedAt: '' },
  { _id: 'static-soyabean', name: 'SOYABEAN', baseRate: 80,  unit: 'MT', category: 'Oilseeds',createdAt: '', updatedAt: '' },
  { _id: 'static-mustard',  name: 'MUSTARD',  baseRate: 88,  unit: 'MT', category: 'Oilseeds',createdAt: '', updatedAt: '' },
  { _id: 'static-corn',     name: 'CORN',     baseRate: 75,  unit: 'MT', category: 'Grains',  createdAt: '', updatedAt: '' },
  { _id: 'static-cotton',   name: 'COTTON',   baseRate: 120, unit: 'MT', category: 'Fibres',  createdAt: '', updatedAt: '' },
];

interface BookingFormProps {
  commodities: MongoCommodity[];
}

export default function BookingForm({ commodities }: BookingFormProps) {
  const [isSubmittingEngine, setIsSubmittingEngine] = useState(false);
  // Synchronous guard — fires BEFORE React's async state batching can process,
  // preventing rapid-click double submissions from reaching the database.
  const isSubmittingRef = useRef(false);

  // Merge DB commodities with static fallbacks — DB commodities take priority.
  // Static items are ONLY shown when there is no matching DB entry with the same name.
  const dbNames = new Set(commodities.map(c => c.name));
  const mergedCommodities: MongoCommodity[] = [
    ...commodities,
    ...STATIC_COMMODITIES.filter(s => !dbNames.has(s.name)),
  ];

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<DetailedLogisticsValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(DetailedLogisticsSchema) as any,
    mode: 'onTouched',
    defaultValues: {
      storageDays: 1,  // Must be ≥1 to pass z.coerce.number().min(1)
      bags: 0,
      palaBags: 0,
    },
  });

  // Watch fields strictly for the Live Invoice Estimator Preview
  const watchedMT = watch('mt') || 0;
  const watchedDays = watch('storageDays') || 1;
  const watchedDate = watch('date');
  const watchedDateOutward = watch('dateOutward' as any);
  const watchedCommodity = watch('commodityName');
  const selectedRate = mergedCommodities.find(c => c.name === watchedCommodity)?.baseRate ?? 0;

  // Auto-calculate storageDays from the date range whenever either date changes
  useEffect(() => {
    if (watchedDate && watchedDateOutward) {
      const inward = new Date(watchedDate);
      const outward = new Date(watchedDateOutward as string);
      if (outward > inward) {
        const diffMs = outward.getTime() - inward.getTime();
        const diffDays = Math.ceil(diffMs / 86400000); // Ceiling so partial days bill as full days
        setValue('storageDays', diffDays);
      } else {
        setValue('storageDays', 1); // Minimum 1 even if same-day
      }
    } else {
      // No outward date yet — reset to minimum 1 so validation always passes
      setValue('storageDays', 1);
    }
  }, [watchedDate, watchedDateOutward, setValue]);

  // Live preview using the pro-rata engine — mirrors what billing.ts will calculate
  let rentPreview: ReturnType<typeof calculateRent> | null = null;
  if (watchedDate && watchedMT > 0 && selectedRate > 0) {
    try {
      // Use actual outward date if set, else project from storageDays
      const outwardForPreview = watchedDateOutward
        ? watchedDateOutward as string
        : new Date(new Date(watchedDate).getTime() + watchedDays * 86400000)
            .toISOString().slice(0, 10);
      rentPreview = calculateRent(watchedMT, selectedRate, watchedDate, outwardForPreview);
    } catch { } // Fails silently while dates are mid-entry
  }

  const onSubmit = async (data: DetailedLogisticsValues) => {
    console.log('[Form] Data validated — sending to server:', data); // Debug: inspect payload
    try {
      const result = await createDetailedBooking(data);
      if (result.success) {
        toast.success(`✓ Ledger saved as S.No #${result.serialNo}!`);
        reset({ storageDays: 1, bags: 0, palaBags: 0 }); // Keep defaults after reset
      } else {
        toast.error(result.message || 'Server rejected the entry.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Network error. Please retry.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingEngine(false);
    }
  };

  // Intercept the native form submit event BEFORE react-hook-form's handleSubmit
  // queues multiple async calls. This is the only reliable synchronous gate.
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isSubmittingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmittingEngine(true);

    // CRITICAL: Pass an onError handler — if Zod validation fails, onSubmit never runs,
    // so we must reset the lock here or the button becomes permanently dead.
    handleSubmit(onSubmit, (validationErrors) => {
      console.warn('[Form] Validation failed — fields with errors:', Object.keys(validationErrors));
      console.warn('[Form] Error details:', validationErrors);
      isSubmittingRef.current = false;
      setIsSubmittingEngine(false);
    })(e);
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
        <form onSubmit={handleFormSubmit} className="space-y-8">
          
          {/* === CARD 1: Flow & Location === */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
            <h3 className="text-md font-semibold text-slate-800 flex items-center mb-4 border-b pb-2">
              <MapPin className="w-4 h-4 mr-2" /> 1. Flow & Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label htmlFor="direction" className="block text-xs font-bold text-slate-600 mb-1">Inward/Outward *</label>
                <select id="direction" {...register('direction')} className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Direction...</option>
                  <option value="INWARD">Internal (INWARD)</option>
                  <option value="OUTWARD">External (OUTWARD)</option>
                </select>
                {errors.direction && <p className="text-red-500 text-[10px] mt-1">{errors.direction.message}</p>}
              </div>
              <div>
                <label htmlFor="date" className="block text-xs font-bold text-slate-600 mb-1">Date *</label>
                <input id="date" type="date" {...register('date')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                {errors.date && <p className="text-red-500 text-[10px] mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label htmlFor="warehouseName" className="block text-xs font-bold text-slate-600 mb-1">Warehouse Name *</label>
                <input id="warehouseName" {...register('warehouseName')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Central Depot" />
                {errors.warehouseName && <p className="text-red-500 text-[10px] mt-1">{errors.warehouseName.message}</p>}
              </div>
              <div>
                <label htmlFor="location" className="block text-xs font-bold text-slate-600 mb-1">LOCATION *</label>
                <input id="location" {...register('location')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Zone C" />
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
                <label htmlFor="clientName" className="block text-xs font-bold text-slate-600 mb-1">CLIENT NAME *</label>
                <input id="clientName" {...register('clientName')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Acme Logistics Corp" />
                {errors.clientName && <p className="text-red-500 text-[10px] mt-1">{errors.clientName.message}</p>}
              </div>
              <div>
                <label htmlFor="clientLocation" className="block text-xs font-bold text-slate-600 mb-1">Client Location</label>
                <input id="clientLocation" {...register('clientLocation')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Delhi HQ" />
              </div>
              <div>
                <label htmlFor="suppliers" className="block text-xs font-bold text-slate-600 mb-1">Suppliers</label>
                <input id="suppliers" {...register('suppliers')} className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Supplier Firm Ltd" />
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
                <label htmlFor="commodityName" className="block text-xs font-bold text-slate-600 mb-1">Commodity Name *</label>
                <select
                  id="commodityName"
                  {...register('commodityName', { required: 'Commodity is required' })}
                  className="w-full rounded-md border border-blue-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50 font-semibold uppercase"
                >
                  <option value="">— Select Commodity —</option>
                  {mergedCommodities.map(c => (
                    <option key={c._id} value={c.name}>
                      {c.name} — ₹{c.baseRate}/{c.unit}
                    </option>
                  ))}
                </select>
                {watchedCommodity && selectedRate > 0 && (
                  <p className="text-[10px] text-blue-600 font-bold mt-1">
                    ✓ Active rate: ₹{selectedRate}/MT — will be used for billing
                  </p>
                )}
                {errors.commodityName && <p className="text-red-500 text-[10px] mt-1">{errors.commodityName.message}</p>}
              </div>
              <div className="col-span-1">
                <label htmlFor="cadNo" className="block text-xs font-bold text-slate-600 mb-1">CAD No</label>
                <input id="cadNo" {...register('cadNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="---" />
              </div>
              <div className="col-span-1">
                <label htmlFor="stackNo" className="block text-xs font-bold text-slate-600 mb-1">Stack No.</label>
                <input id="stackNo" {...register('stackNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="---" />
              </div>
              <div className="col-span-1">
                <label htmlFor="lotNo" className="block text-xs font-bold text-slate-600 mb-1">LOT NO</label>
                <input id="lotNo" {...register('lotNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="L-000" />
              </div>
              <div className="col-span-1">
                <label htmlFor="doNumber" className="block text-xs font-bold text-slate-600 mb-1">DO Number</label>
                <input id="doNumber" {...register('doNumber')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="DO-000" />
              </div>
              <div className="col-span-1">
                <label htmlFor="cdfNo" className="block text-xs font-bold text-slate-600 mb-1">CDF No</label>
                <input id="cdfNo" {...register('cdfNo')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="CDF-000" />
              </div>
              <div className="col-span-2">
                <label htmlFor="gatePass" className="block text-xs font-bold text-slate-600 mb-1">GATE PASS *</label>
                <input id="gatePass" {...register('gatePass')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase border-blue-200 bg-blue-50" placeholder="GP-123456" />
                {errors.gatePass && <p className="text-red-500 text-[10px] mt-1">{errors.gatePass.message}</p>}
              </div>
              <div className="col-span-1">
                <label htmlFor="pass" className="block text-xs font-bold text-slate-600 mb-1">Pass</label>
                <input id="pass" {...register('pass')} className="w-full rounded-md border border-slate-300 p-2 text-sm uppercase" placeholder="---" />
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
                <label htmlFor="bags" className="block text-xs font-bold text-slate-600 mb-1">Bag (Qty)</label>
                <input id="bags" type="number" {...register('bags')} className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50" placeholder="0" />
                {errors.bags && <p className="text-red-500 text-[10px] mt-1">{errors.bags.message}</p>}
              </div>
              <div>
                <label htmlFor="palaBags" className="block text-xs font-bold text-slate-600 mb-1">PALA BAG (Qty)</label>
                <input id="palaBags" type="number" {...register('palaBags')} className="w-full rounded-md border border-slate-300 p-2 text-sm bg-slate-50" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label htmlFor="mt" className="block text-xs font-bold text-slate-600 mb-1">mt (Total Metric Tons) *</label>
                <input id="mt" type="number" step="0.01" {...register('mt')} className="w-full rounded-md border-2 border-emerald-400 p-3 text-lg font-bold text-emerald-900 bg-emerald-50 focus:ring-0 focus:border-emerald-500" placeholder="0.00" />
                {errors.mt && <p className="text-red-500 text-[10px] mt-1">{errors.mt.message}</p>}
              </div>
            </div>

            {/* Billing Engine: Outward Date + Auto-Calculated Duration */}
            <div className="mt-8 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 justify-between">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div>
                    <label htmlFor="dateOutward" className="block text-xs font-bold text-slate-600 mb-1">
                      Expected Outward Date
                    </label>
                    <input
                      id="dateOutward"
                      type="date"
                      {...register('dateOutward' as any)}
                      min={watchedDate || undefined}
                      className="rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Leave blank to default to 1 day</p>
                  </div>

                  {/* Read-only auto-calculated field */}
                  <div>
                    <label htmlFor="storageDays" className="block text-xs font-bold text-slate-600 mb-1">
                      Storage Duration (Auto)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="storageDays"
                        type="number"
                        {...register('storageDays')}
                        readOnly
                        className="w-24 rounded-md border border-slate-200 px-3 py-2 text-sm text-center font-bold bg-slate-100 text-slate-700 cursor-default"
                      />
                      <span className="text-sm font-semibold text-slate-500">Days</span>
                    </div>
                    {errors.storageDays && (
                      <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.storageDays.message}</p>
                    )}
                  </div>
                </div>

                {/* Live Invoice Preview — shows only when MT + rate + date are all filled */}
                {rentPreview && (
                  <div className="bg-slate-900 rounded-xl p-4 px-6 text-white shadow-md min-w-[260px]">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Estimated Rent</p>
                    </div>
                    {/* Breakdown rows */}
                    <div className="space-y-1 text-xs text-slate-400 mb-3 border-b border-slate-700 pb-3">
                      <div className="flex justify-between">
                        <span>Formula</span>
                        <span className="text-slate-300 font-mono">({rentPreview.weightMT}MT × ₹{rentPreview.appliedRate} × {rentPreview.totalDays}d) / 30</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Storage Rent</span>
                        <span className="text-slate-200">{formatCurrency(rentPreview.storageRent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (18%)</span>
                        <span className="text-slate-200">{formatCurrency(rentPreview.gstAmount)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">Total Due</span>
                      <p className="text-2xl font-black text-emerald-400">{formatCurrency(rentPreview.totalAmount)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingEngine}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg transition-all flex items-center
                ${isSubmittingEngine ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
            >
              {isSubmittingEngine ? 'Locking Ledger...' : 'Insert Row & Generate Invoice'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
