import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getConsolidatedLedger } from '@/app/actions/consolidated-ledger';
import type { IClientAccount } from '@/types/schemas';
import type { Payment } from '@/lib/ledger-engine';
import LedgerTable from '@/components/features/ledger/ledger-table';
import PaymentHistory from '@/components/features/ledger/payment-history';
import { ArrowLeft, Package, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';

interface UnifiedReportPageProps {
  params: Promise<{
    bookingId: string;
  }>;
}

export const metadata = {
  title: 'Unified Ledger Report | Warehouse Logistics',
};

export default async function UnifiedReportPage({ params }: UnifiedReportPageProps) {
  // Authenticate user
  const session = await getServerSession();
  if (!session) {
    notFound();
  }

  // Resolve params (Next.js 16 pattern)
  const { bookingId } = await params;

  if (!bookingId) {
    notFound();
  }

  // Fetch consolidated ledger
  const ledgerResponse = await getConsolidatedLedger(bookingId);

  if (!ledgerResponse.success || !ledgerResponse.data) {
    notFound();
  }

  const { account, transactions, payments, ledgerSummary, commoditySummary } = ledgerResponse.data;

  // Transform payments to include clientName for PaymentHistory component
  const transformedPayments: Payment[] = payments.map((payment: any) => ({
    _id: payment._id?.toString() || '',
    date: payment.date,
    amount: payment.amount,
    clientName: account?.clientName || 'Unknown',
  }));

  // Calculate key metrics
  const totalInboundMT = commoditySummary.reduce((sum, c) => sum + c.inboundMT, 0);
  const totalOutboundMT = commoditySummary.reduce((sum, c) => sum + c.outboundMT, 0);
  const balanceMT = totalInboundMT - totalOutboundMT;
  const rentAmount = ledgerSummary.totalRent || 0;
  const totalPayments = transformedPayments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = rentAmount - totalPayments;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      {/* Header Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/reports"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>
        <p className="text-sm text-gray-600">Unified Ledger Report</p>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto">
        {/* Account Header Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {account?.clientName || 'Unknown Client'}
              </h1>
              <div className="flex flex-col gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span>Account ID: <code className="bg-gray-100 px-2 py-1 rounded text-gray-900 font-mono">{account?.bookingId}</code></span>
                </div>
                {account?.clientLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{account.clientLocation}</span>
                  </div>
                )}
                {account?.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Created: {new Date(account.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-600">Inbound</p>
                <p className="text-lg font-bold text-blue-900">{totalInboundMT.toFixed(2)} MT</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-xs font-semibold text-purple-600">Outbound</p>
                <p className="text-lg font-bold text-purple-900">{totalOutboundMT.toFixed(2)} MT</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs font-semibold text-green-600">Balance</p>
                <p className="text-lg font-bold text-green-900">{balanceMT.toFixed(2)} MT</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-xs font-semibold text-orange-600">Due</p>
                <p className="text-lg font-bold text-orange-900">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Commodity Breakdown */}
        {commoditySummary.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {commoditySummary.map((commodity) => (
              <div
                key={commodity.commodity}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <h3 className="font-semibold text-gray-900 mb-3">{commodity.commodity}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inbound:</span>
                    <span className="font-medium text-gray-900">{commodity.inboundMT.toFixed(2)} MT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outbound:</span>
                    <span className="font-medium text-gray-900">{commodity.outboundMT.toFixed(2)} MT</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="text-gray-600 font-medium">Balance:</span>
                    <span className="font-bold text-blue-600">{commodity.totalMT.toFixed(2)} MT</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ledger Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Consolidated Ledger</h2>
          {ledgerSummary && ledgerSummary.steps && ledgerSummary.steps.length > 0 ? (
            <LedgerTable steps={ledgerSummary.steps} />
          ) : (
            <div className="py-8 text-center text-gray-500">
              No ledger entries found for this account.
            </div>
          )}
        </div>

        {/* Payment History Section */}
        {transformedPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
            <PaymentHistory payments={transformedPayments} clientName={account?.clientName || 'Unknown'} />
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-300 p-4">
            <p className="text-sm font-semibold text-green-700 mb-1">Total Rent Due</p>
            <p className="text-2xl font-bold text-green-900">₹{rentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-300 p-4">
            <p className="text-sm font-semibold text-blue-700 mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-blue-900">₹{totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className={`rounded-lg shadow-sm border-2 p-4 ${
            balanceDue > 0
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
              : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
          }`}>
            <p className={`text-sm font-semibold mb-1 ${
              balanceDue > 0 ? 'text-red-700' : 'text-green-700'
            }`}>
              {balanceDue > 0 ? 'Balance Due' : 'Paid'}
            </p>
            <p className={`text-2xl font-bold ${
              balanceDue > 0 ? 'text-red-900' : 'text-green-900'
            }`}>
              ₹{Math.abs(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
