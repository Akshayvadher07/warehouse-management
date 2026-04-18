'use client';

import React, { useEffect, useState, useTransition, useRef, useId } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { processOutward, getStockBalance } from '@/app/actions/transaction-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Loader2, ArrowUpFromLine, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const outwardSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  commodityId: z.string().min(1, 'Commodity is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantityMT: z.coerce.number().positive('Withdrawal quantity must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
});

type OutwardFormValues = z.infer<typeof outwardSchema>;

interface OutwardFormProps {
  clients: any[];
  commodities: any[];
  warehouses: any[];
  onSuccess?: () => void;
}

export default function OutwardForm({ clients, commodities, warehouses, onSuccess }: OutwardFormProps) {
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const router = useRouter();

  // Hydration-safe IDs
  const clientIdId = useId();
  const commodityIdId = useId();
  const warehouseIdId = useId();
  const quantityId = useId();
  const dateId = useId();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<OutwardFormValues>({
    resolver: zodResolver(outwardSchema),
    defaultValues: {
      clientId: '',
      commodityId: '',
      warehouseId: '',
      quantityMT: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const watchedValues = useWatch({ control });

  // Automatically check stock when client/commodity/warehouse changes
  useEffect(() => {
    const { clientId, commodityId, warehouseId } = watchedValues;
    if (clientId && commodityId && warehouseId) {
      handleCheckStock(clientId, commodityId, warehouseId);
    } else {
      setCurrentStock(null);
    }
  }, [watchedValues.clientId, watchedValues.commodityId, watchedValues.warehouseId]);

  const handleCheckStock = async (cId: string, cmId: string, wId: string) => {
    setCheckingStock(true);
    try {
      const balance = await getStockBalance(cId, cmId, wId);
      setCurrentStock(balance);
    } catch (err) {
      toast.error('Failed to check stock balance');
    } finally {
      setCheckingStock(false);
    }
  };

  const onSubmit = async (data: OutwardFormValues) => {
    if (data.quantityMT <= 0) {
      toast.error('Withdrawal quantity must be greater than zero');
      return;
    }

    if (currentStock !== null && data.quantityMT > currentStock) {
      toast.error(`Insufficient stock. Max available: ${currentStock} MT`);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    startTransition(async () => {
      try {
        const res = await processOutward({
          clientId: data.clientId,
          commodityId: data.commodityId,
          warehouseId: data.warehouseId,
          quantityMT: data.quantityMT,
          date: data.date,
        });

        if (res.success) {
          toast.success('Stock withdrawal recorded');
          
          reset({
            clientId: '',
            commodityId: '',
            warehouseId: '',
            quantityMT: 0,
            date: new Date().toISOString().split('T')[0],
          });
          
          router.refresh();
          onSuccess?.();
          setTimeout(() => { submittingRef.current = false; }, 1000);
        } else {
          toast.error(res.error || 'Failed to process outward');
          submittingRef.current = false;
        }
      } catch (err: any) {
        console.error('Outward Error:', err);
        toast.error('Internal Server Error: ' + err.message);
        submittingRef.current = false;
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 border rounded-xl shadow-sm">
      <div className="flex items-center gap-2 border-b pb-4">
        <ArrowUpFromLine className="h-5 w-5 text-orange-600" />
        <h3 className="font-bold text-lg text-slate-900">Stock Withdrawal (Outward)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor={clientIdId} className="text-sm font-semibold text-slate-700">Client Name</label>
          <Controller
            name="clientId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id={clientIdId} name="clientId" className={errors.clientId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Search Client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {errors.clientId && <p className="text-xs text-red-500">{errors.clientId.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor={commodityIdId} className="text-sm font-semibold text-slate-700">Commodity</label>
          <Controller
            name="commodityId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id={commodityIdId} name="commodityId" className={errors.commodityId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Search Commodity..." />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {errors.commodityId && <p className="text-xs text-red-500">{errors.commodityId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label htmlFor={warehouseIdId} className="text-sm font-semibold text-slate-700">Warehouse</label>
          <Controller
            name="warehouseId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id={warehouseIdId} name="warehouseId" className={errors.warehouseId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select Warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.warehouseId && <p className="text-xs text-red-500">{errors.warehouseId.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor={quantityId} className="text-sm font-semibold text-slate-700 flex justify-between items-center">
            Quantity (MT)
            <div className="flex items-center gap-2">
              {checkingStock && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
              {currentStock !== null && (
                <Badge variant={currentStock > 0 ? 'secondary' : 'destructive'} className="text-[10px] py-0">
                  Max: {currentStock.toFixed(2)} MT
                </Badge>
              )}
            </div>
          </label>
          <Controller
            name="quantityMT"
            control={control}
            render={({ field }) => (
              <Input 
                id={quantityId}
                name="quantityMT"
                type="number" 
                step="0.01"
                placeholder="0.00"
                className={errors.quantityMT ? 'border-red-500' : ''}
                value={isNaN(field.value) ? '' : field.value}
                onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
              />
            )}
          />
          {errors.quantityMT && <p className="text-xs text-red-500">{errors.quantityMT.message}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor={dateId} className="text-sm font-semibold text-slate-700">Withdrawal Date</label>
          <Input 
            id={dateId}
            name="date"
            {...register('date')}
            type="date" 
          />
          {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
        </div>
      </div>

      <div className="flex gap-4 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1 border-slate-200"
          onClick={() => {
            const { clientId, commodityId, warehouseId } = watchedValues;
            if (clientId && commodityId && warehouseId) handleCheckStock(clientId, commodityId, warehouseId);
          }}
          disabled={checkingStock}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${checkingStock ? 'animate-spin' : ''}`} /> Sync Balance
        </Button>
        <Button 
          type="submit" 
          className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-bold h-10" 
          disabled={isPending || checkingStock || (currentStock !== null && currentStock <= 0)}
        >
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Withdrawal...</> : 'Confirm Withdrawal'}
        </Button>
      </div>
    </form>
  );
}
