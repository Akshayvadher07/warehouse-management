import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Box, CalendarCheck, TrendingUp } from 'lucide-react';
import BookingChart from '@/components/features/dashboard/booking-chart';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/'); 
  }

  // Quick Stat Cards Data Structure
  const stats = [
    { name: 'Total Bookings (MTD)', value: '1,020', icon: Box, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Advance Bookings', value: '840', icon: CalendarCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Est. Monthly Revenue', value: '$84,500', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Command Center
        </h1>
        <p className="text-slate-500">
          Welcome back, {session.user?.email} • Role: {(session.user as any)?.role}
        </p>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Visualization Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Booking Volume (Last 6 Months)</h3>
        <BookingChart />
      </div>
    </div>
  );
}
