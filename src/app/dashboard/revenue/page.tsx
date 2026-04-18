'use client';

import { useState, useEffect } from 'react';
import { getRevenueAnalytics } from '@/app/actions/transaction-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, HandCoins, Receipt, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function RevenueDashboard() {
  const [data, setData] = useState<{ summary: any; recentLogs: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const analytics = await getRevenueAnalytics();
    setData(analytics);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-slate-500">Calculating revenue splits...</div>;
  }

  const { summary, recentLogs } = data!;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Revenue Distribution</h1>
        <p className="text-slate-500">Monitor the 60/40 profit split between Warehouse Owners and the Platform.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-l-4 border-l-indigo-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4" /> Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">₹{summary.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Total billing generated across all clients.</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <Wallet className="h-4 w-4" /> Owner Earnings (60%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">₹{summary.ownerEarnings.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Net profit disbursed to warehouse operators.</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
              <HandCoins className="h-4 w-4" /> Platform Comm. (40%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">₹{summary.platformCommissions.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Management fees and platform service charges.</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Log */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <div>
            <CardTitle className="text-lg font-bold">Distribution Audit Log</CardTitle>
            <p className="text-xs text-slate-500">Live feed of revenue splits for every inward entry.</p>
          </div>
          <Badge variant="outline" className="flex gap-2 py-1 px-3">
            <Filter className="h-3 w-3" /> Recent Transactions
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Client & Warehouse</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead className="text-emerald-600">Owner (60%)</TableHead>
                <TableHead className="text-amber-600">Platform (40%)</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log: any) => (
                <TableRow key={log._id} className="hover:bg-slate-50/50">
                  <TableCell className="text-xs font-medium text-slate-600">
                    {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-900">{log.clientId?.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{log.warehouseId?.name}</p>
                  </TableCell>
                  <TableCell className="font-bold">₹{log.totalAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-emerald-600 font-bold">₹{log.ownerShare.toLocaleString()}</TableCell>
                  <TableCell className="text-amber-600 font-bold">₹{log.platformShare.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Receipt className="h-4 w-4 text-slate-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {recentLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                    No revenue log entries found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
