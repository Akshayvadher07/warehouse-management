'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { LedgerCalculator } from '@/components/features/ledger';

interface ReportsTabsProps {
  logisticsContent: React.ReactNode;
  initialLedgerClient?: string;
}

export default function ReportsTabs({ logisticsContent, initialLedgerClient = '' }: ReportsTabsProps) {
  const normalizedInitialLedgerClient = String(initialLedgerClient).trim();
  const [activeTab, setActiveTab] = useState<'logistics' | 'ledger'>(
    normalizedInitialLedgerClient ? 'ledger' : 'logistics'
  );
  const [clientName, setClientName] = useState(normalizedInitialLedgerClient);
  const [selectedClient, setSelectedClient] = useState<string | null>(
    normalizedInitialLedgerClient ? normalizedInitialLedgerClient : null
  );

  useEffect(() => {
    if (normalizedInitialLedgerClient) {
      setActiveTab('ledger');
      setClientName(normalizedInitialLedgerClient);
      setSelectedClient(normalizedInitialLedgerClient);
    }
  }, [normalizedInitialLedgerClient]);

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('logistics')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'logistics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          Logistics Report
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart className="h-5 w-5" />
          Ledger Information
        </button>
      </div>

      {/* Logistics Report Tab */}
      {activeTab === 'logistics' && logisticsContent}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="text-center">
              <PieChart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Ledger Information</h2>
              <p className="text-slate-600 mb-6">
                Enter a client name to view the computed rent ledger, payments, and balance.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Enter client name"
                  className="w-full sm:w-96 rounded-lg border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = clientName.trim();
                    setSelectedClient(trimmed || null);
                  }}
                  disabled={!clientName.trim()}
                  className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  Load Ledger
                </button>
              </div>
            </div>
          </div>

          {selectedClient ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <LedgerCalculator clientId={selectedClient} clientName={selectedClient} />
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500">
                Enter a client name above and click <strong>Load Ledger</strong> to show the ledger here.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
