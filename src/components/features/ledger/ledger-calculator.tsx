'use client';

import React, { useEffect, useState } from 'react';
import { LedgerSummary } from '@/lib/ledger-engine';
import { LedgerTable } from './ledger-table';
import { InvoiceSummary } from './invoice-summary';
import { TransactionTimeline } from './transaction-timeline';
import { PaymentHistory } from './payment-history';
import { MatchedRecordsHeader } from './matched-records-header';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AggregatedLedgerData extends LedgerSummary {
  matchedRecords?: any[];
  recordCount?: number;
  isAggregated?: boolean;
}

interface LedgerCalculatorProps {
  clientId: string;
  clientName?: string;
}

export const LedgerCalculator: React.FC<LedgerCalculatorProps> = ({
  clientId,
  clientName = clientId,
}) => {
  // Prevent rendering if clientId is empty
  if (!clientId || !clientId.trim()) {
    return null;
  }

  const [ledgerData, setLedgerData] = useState<AggregatedLedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    const trimmedClientId = clientId.trim();
    if (!trimmedClientId) {
      setError('Client ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const encodedClientId = encodeURIComponent(trimmedClientId);
      const response = await fetch(`/api/reports/ledger/${encodedClientId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch ledger data (${response.status}): ${errorText || response.statusText}`
        );
      }

      const result = await response.json();
      if (result.success) {
        setLedgerData(result.data);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Error fetching ledger:', err);
      setError(err.message || 'Failed to load ledger');
      toast.error('Failed to load ledger data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [clientId]);

  const handleExportCSV = () => {
    if (!ledgerData) {
      toast.error('No data to export');
      return;
    }

    // Generate CSV
    const lines: string[] = [];
    lines.push(`Client Name,${ledgerData.clientName}`);
    lines.push(`Calculation Date,${ledgerData.calculationDate}`);
    if (ledgerData.isAggregated && ledgerData.matchedRecords) {
      lines.push(`Aggregated Records,${ledgerData.recordCount || 1}`);
      ledgerData.matchedRecords.forEach((record) => {
        lines.push(`  - ${record.clientName} (${record.date})`);
      });
    }
    lines.push('');
    lines.push('LEDGER STEPS');
    lines.push(
      'Step No,Start Date,End Date,Days,Quantity (MT),Rate (₹/day/MT),Rent Amount (₹)'
    );

    ledgerData.ledgerSteps.forEach((step) => {
      lines.push(
        `${step.stepNo},${step.startDate},${step.endDate},${step.daysDifference},${step.quantityMT},${step.ratePerDayPerMT},${step.rentAmount}`
      );
    });

    lines.push('');
    lines.push('SUMMARY');
    lines.push(`Total Rent,${ledgerData.totalRent}`);
    lines.push(`Total Paid,${ledgerData.totalPaid}`);
    lines.push(`Outstanding Balance,${ledgerData.balance}`);

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${clientId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ledger exported successfully');
  };

  if (error && !ledgerData) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
        <div className="inline-block h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-red-700 font-semibold mb-2">{error}</p>
        <button
          onClick={fetchLedger}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Ledger Report</h1>
          <p className="text-slate-600 mt-1">
            {clientName} - {ledgerData?.calculationDate || 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLedger}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isLoading || !ledgerData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Matched Records Header (if aggregated) */}
      {ledgerData && ledgerData.isAggregated && ledgerData.matchedRecords && (
        <MatchedRecordsHeader
          matchedRecords={ledgerData.matchedRecords}
          isAggregated={ledgerData.isAggregated}
        />
      )}

      {/* Invoice Summary */}
      {ledgerData && (
        <InvoiceSummary
          totalRent={ledgerData.totalRent}
          totalPaid={ledgerData.totalPaid}
          totalBalance={ledgerData.balance}
          isLoading={isLoading}
        />
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Transactions */}
        <div className="lg:col-span-1">
          {ledgerData && (
            <TransactionTimeline
              transactions={ledgerData.ledgerSteps
                .filter((step) => step.transaction)
                .map((step) => ({
                  _id: step.transaction?.id || '',
                  date: step.startDate,
                  direction: step.transaction?.direction || 'INWARD',
                  mt: step.quantityMT,
                  clientName: ledgerData.clientName,
                  commodityName: 'Various',
                  gatePass: step.transaction?.gatePass || '',
                }))}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ledger Table */}
          {ledgerData && (
            <LedgerTable
              steps={ledgerData.ledgerSteps}
              isLoading={isLoading}
            />
          )}

          {/* Payment History */}
          {ledgerData && (
            <PaymentHistory
              payments={ledgerData.paymentHistory}
              clientName={ledgerData.clientName}
              isLoading={isLoading}
              onPaymentAdded={fetchLedger}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LedgerCalculator;
