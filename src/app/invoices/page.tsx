'use client';

import React, { useState, useMemo } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WAREHOUSES = [
  { id: 'WH1', name: 'Warehouse 1' },
  { id: 'WH2', name: 'Warehouse 2' },
  { id: 'WH3', name: 'Warehouse 3' },
  { id: 'WH4', name: 'Warehouse 4' },
  { id: 'WH5', name: 'Warehouse 5' },
];

export default function InvoicesPage() {
  const { clients, commodities, bookings } = useWarehouse();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const filteredBookings = useMemo(() => {
    if (!selectedClientId || !selectedWarehouseId) return [];
    return bookings.filter(
      booking => booking.type === 'inward' &&
                 booking.clientId === selectedClientId &&
                 booking.warehouseId === selectedWarehouseId
    );
  }, [bookings, selectedClientId, selectedWarehouseId]);

  const invoiceItems = useMemo(() => {
    return filteredBookings.map(booking => {
      const commodity = commodities.find(c => c.id === booking.commodityId);
      const client = clients.find(c => c.id === booking.clientId);
      const warehouse = WAREHOUSES.find(w => w.id === booking.warehouseId);

      if (!commodity || !client || !warehouse) return null;

      const storageDays = booking.storageDays || 1;
      const amount = commodity.rate * booking.weight * storageDays;

      return {
        bookingId: booking.id,
        commodityName: commodity.name,
        weight: booking.weight,
        rate: commodity.rate,
        storageDays,
        amount,
        date: booking.date,
      };
    }).filter(Boolean);
  }, [filteredBookings, commodities, clients]);

  const totalAmount = invoiceItems.reduce((sum, item) => sum + (item?.amount || 0), 0);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedWarehouse = WAREHOUSES.find(w => w.id === selectedWarehouseId);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Invoices</h1>

        {/* Filters */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Filter Invoices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Warehouse</label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSES.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Invoice Display */}
        {selectedClientId && selectedWarehouseId && (
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Invoice</h2>
              <p className="text-slate-600">Client: {selectedClient?.name}</p>
              <p className="text-slate-600">Warehouse: {selectedWarehouse?.name}</p>
            </div>

            {invoiceItems.length === 0 ? (
              <p className="text-slate-500">No inward bookings found for this client and warehouse.</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Commodity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Weight (MT)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {invoiceItems.map(item => item && (
                        <tr key={item.bookingId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {item.commodityName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {item.weight}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            ₹{item.rate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {item.storageDays}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            ₹{item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">
                        Total: ₹{totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}