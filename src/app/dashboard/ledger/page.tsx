'use client';

import { useState, useEffect } from 'react';
import { getClients } from '@/app/actions/client-actions';
import { getClientLedger } from '@/app/actions/transaction-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, FileText, ArrowLeft, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LedgerDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  };

  const handleDrillDown = async (client: any) => {
    setLoading(true);
    setSelectedClient(client);
    const data = await getClientLedger(client._id);
    setLedgerData(data);
    setLoading(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedClient) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedClient(null)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Client Directory
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{selectedClient.name}'s Ledger</h1>
            <p className="text-slate-500">Detailed financial breakdown of all warehouse transactions.</p>
          </div>
          <div className="flex gap-4">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{ledgerData.reduce((acc, inv) => acc + (inv.totalAmount - (inv.paidAmount || 0)), 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {ledgerData.length === 0 ? (
            <Card className="bg-white py-12 text-center">
              <p className="text-slate-500 italic">No historical transactions found for this client.</p>
            </Card>
          ) : (
            ledgerData.map((invoice) => (
              <Card key={invoice._id} className="bg-white overflow-hidden border-slate-200">
                <CardHeader className="bg-slate-50 border-b py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <span className="font-bold text-slate-700">{invoice.invoiceId}</span>
                      <Badge variant={invoice.status === 'PAID' ? 'secondary' : 'outline'}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      Cycle: {invoice.cycleName} | Warehouse: {invoice.warehouseId?.name}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Commodity</TableHead>
                        <TableHead>Qty (MT)</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Calculation Path</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.commodityName}</TableCell>
                          <TableCell>{item.quantityMT}</TableCell>
                          <TableCell>{item.durationDays}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">{item.calculationPath}</TableCell>
                          <TableCell className="text-right font-bold">₹{item.subtotal.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={4} className="text-right font-bold text-slate-600">Total Invoice Amount</TableCell>
                        <TableCell className="text-right font-black text-lg text-indigo-900">₹{invoice.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Financial Ledger</h1>
        <p className="text-slate-500">View consolidated balances and drill down into individual transaction math.</p>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <Search className="h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Search by client name or type..." 
          className="max-w-md border-none focus-visible:ring-0 shadow-none text-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-xl" />)
        ) : (
          filteredClients.map((client) => (
            <Card 
              key={client._id} 
              className="group hover:border-indigo-500 cursor-pointer transition-all duration-200 shadow-sm"
              onClick={() => handleDrillDown(client)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <Landmark className="h-6 w-6 text-indigo-600 group-hover:text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{client.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{client.type}</Badge>
                  <p className="text-xs text-slate-400 font-medium">{client.mobile}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
