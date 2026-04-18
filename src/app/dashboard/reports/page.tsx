import React, { Suspense } from 'react';
import ReportDataWrapper from './report-data-wrapper';
import ReportSkeleton from '@/components/features/reports/report-skeleton';
import ReportsTabs from './reports-tabs';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Logistics Reports | WMS Pro',
  description: 'Aggregated warehouse bookings and movement history.',
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const rawLedgerClient = params.ledgerClient;
  const ledgerClient = Array.isArray(rawLedgerClient)
    ? rawLedgerClient[0] || ''
    : rawLedgerClient || '';

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-8 md:px-0">
      <Toaster position="top-right" />
      
      <ReportsTabs
        initialLedgerClient={ledgerClient}
        logisticsContent={
          <Suspense fallback={<ReportSkeleton />}>
            <ReportDataWrapper searchParams={params} />
          </Suspense>
        }
      />
    </div>
  );
}
