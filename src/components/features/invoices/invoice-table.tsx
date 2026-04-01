'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { InvoiceDocument } from './invoice-pdf';
import { updateInvoiceStatus } from '@/app/actions/invoices'; // New Dynamic Server Action
import { FileDown, Package, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="text-slate-400 text-sm">Loading PDF Engine...</span> }
);

export default function InvoiceTable({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // NEW: Optimistic UI Hook / Toggle Logic
  const handleStatusChange = async (id: string, newStatus: string) => {
    // 1. Mandatory Safeguard Confirmation
    if (!window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;

    // 2. Optimistic Rendering: Instantly visually update before server finishes
    const previousInvoices = [...invoices];
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
    setUpdatingId(id);

    // 3. Database Execution
    try {
      const result = await updateInvoiceStatus(id, newStatus);
      if (result.success) {
        toast.success(`Invoice marked as ${newStatus}`);
      } else {
        toast.error('Failed to update. Reverting changes.');
        setInvoices(previousInvoices); // Revert UI if DB fails
      }
    } catch {
      toast.error('Network Error. Reverting changes.');
      setInvoices(previousInvoices);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Invoice ID</th>
              <th className="px-6 py-4 font-semibold">Customer & Cargo</th>
              <th className="px-6 py-4 font-semibold">Total Amount</th>
              <th className="px-6 py-4 font-semibold">Payment Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No invoices found.</td></tr>
            ) : null}
            
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  #{inv.id.substring(0, 8).toUpperCase()}
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-800">{inv.customerName || 'N/A'}</div>
                  <div className="text-xs text-slate-500 flex items-center mt-1">
                    <Package className="w-3 h-3 mr-1" /> {inv.commodity || 'General'}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">
                  ${inv.totalAmount?.toFixed(2) || inv.amount?.toFixed(2) || '0.00'}
                </td>
                
                {/* 💥 THE NEW STATUS BADGE DROPDOWN 💥 */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <select
                      value={inv.status}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      disabled={updatingId === inv.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full outline-none cursor-pointer border shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 appearance-none text-center
                        ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-orange-50 text-orange-800 border-orange-200'}
                      `}
                    >
                      <option value="UNPAID">🕒 PENDING</option>
                      <option value="PAID">✅ COMPLETED</option>
                    </select>
                    
                    {updatingId === inv.id && (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 text-right space-x-3">
                  {/* Styled PDF Download Action */}
                  {isClient && (
                    <PDFDownloadLink
                      document={<InvoiceDocument invoice={inv} />}
                      fileName={`Invoice_${inv.id.substring(0, 8)}.pdf`}
                      className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                    >
                      {({ loading }: any) => loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> ...</>
                      ) : (
                        <><FileDown className="w-4 h-4 mr-2 text-indigo-500" /> Export PDF</>
                      )}
                    </PDFDownloadLink>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
