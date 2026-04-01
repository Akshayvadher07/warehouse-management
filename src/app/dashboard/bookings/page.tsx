import BookingForm from '@/components/features/bookings/booking-form';
import { Toaster } from 'react-hot-toast';
import { fetchCommodities } from '@/app/actions/commodities';

export default async function BookingsPage() {
  const commodities = await fetchCommodities();
  return (
    <div className="w-full">
      {/* Toast provider so notifications work on this page */}
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Book Warehouse Space
        </h1>
        <p className="text-slate-500 mt-1">
          Reserve specific zones in the facility for incoming shipments.
        </p>
      </div>

      <BookingForm commodities={commodities} />
    </div>
  );
}
