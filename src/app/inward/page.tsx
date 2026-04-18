'use client';

import React, { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InwardPage() {
  const { clients, commodities, warehouses, addTransaction } = useWarehouse();
  const [formData, setFormData] = useState({
    clientId: '',
    warehouseId: '',
    commodityId: '',
    quantity: 0,
    date: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.clientId && formData.warehouseId && formData.commodityId && formData.date && formData.quantity > 0) {
      const selectedWarehouse = warehouses.find(w => w.id === formData.warehouseId);
      if (selectedWarehouse && formData.quantity > selectedWarehouse.availableCapacity) {
        alert('Insufficient available capacity in the selected warehouse.');
        return;
      }

      addTransaction({
        ...formData,
        type: 'Inward',
      });
      setFormData({
        clientId: '',
        warehouseId: '',
        commodityId: '',
        quantity: 0,
        date: '',
      });
      alert('Inward transaction added successfully.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Inward Booking</h1>
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <Select value={formData.clientId} onValueChange={(value) => handleSelectChange('clientId', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse *</label>
              <Select value={formData.warehouseId} onValueChange={(value) => handleSelectChange('warehouseId', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.isActive).map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} (Available: {warehouse.availableCapacity} MT)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Commodity *</label>
              <Select value={formData.commodityId} onValueChange={(value) => handleSelectChange('commodityId', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map(commodity => (
                    <SelectItem key={commodity.id} value={commodity.id}>
                      {commodity.name} (₹{commodity.rate}/{commodity.rateUnit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">Quantity (MT) *</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                step="0.1"
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Submit Inward Booking
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}