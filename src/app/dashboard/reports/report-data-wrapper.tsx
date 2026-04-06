import LogisticsReportClient from '@/components/features/reports/logistics-report-client';
import { getFilteredBookings, getFilterOptions } from '@/app/actions/reports';

interface Props {
  searchParams: { [key: string]: string | undefined };
}

export default async function ReportDataWrapper({ searchParams }: Props) {
  // Extract URL parameters for initial Server-Side load
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const commodity = searchParams.commodity || 'ALL';
  const warehouse = searchParams.warehouse || 'ALL';
  const startDate = searchParams.startDate || '';
  const endDate = searchParams.endDate || '';

  const initialFilters = { page, limit: 20, commodity, warehouse, startDate, endDate };
  
  // Parallel Fetching to prevent waterfall
  const [bookingsRes, optionsRes] = await Promise.all([
    getFilteredBookings(initialFilters),
    getFilterOptions()
  ]);

  return (
    <LogisticsReportClient 
      initialData={bookingsRes.data || []} 
      initialTotalPages={bookingsRes.totalPages || 0}
      initialTotalCount={bookingsRes.totalCount || 0}
      initialOptions={optionsRes} 
      initialFilters={initialFilters} 
    />
  );
}
