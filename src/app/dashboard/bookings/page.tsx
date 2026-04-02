import BookingForm from '@/components/features/bookings/booking-form';
import { Toaster } from 'react-hot-toast';
import { fetchCommodities } from '@/app/actions/commodities';
import { MongoCommodity } from '@/lib/validations/commodity';

export default async function BookingsPage() {
  // Silently fallback to empty array if DB session fails; form uses static fallbacks
  let commodities: MongoCommodity[] = [];
  try {
    commodities = await fetchCommodities();
  } catch {
    // Static fallback list defined inside the form component handles this case
  }

  return (
    <div className="w-full">
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
