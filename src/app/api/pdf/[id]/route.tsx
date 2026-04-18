import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';
import Client from '@/lib/models/Client';
import Warehouse from '@/lib/models/Warehouse';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a professional font if needed, or use defaults
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottom: 1, pb: 10, flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e1b4b' },
  section: { marginBottom: 15 },
  label: { color: '#64748b', marginBottom: 2 },
  value: { fontWeight: 'bold' },
  table: { display: 'flex', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', minHeight: 25, alignItems: 'center' },
  tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
  col1: { width: '35%', paddingLeft: 5 },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '20%', textAlign: 'center' },
  col5: { width: '15%', textAlign: 'right', paddingRight: 5 },
  footer: { marginTop: 30, borderTopWidth: 1, pt: 10, textAlign: 'center', color: '#94a3b8' },
  totalSection: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalLabel: { width: 100, fontWeight: 'bold' },
  totalValue: { width: 100, textAlign: 'right', fontWeight: 'bold', fontSize: 14, color: '#059669' }
});

const InvoicePDF = ({ invoice }: { invoice: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>WMS PRO INVOICE</Text>
          <Text style={styles.label}>Logistics & Storage Receipt</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.value}>{invoice.invoiceId}</Text>
          <Text style={styles.label}>{new Date(invoice.generatedAt).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>BILL TO</Text>
          <Text style={styles.value}>{invoice.clientId?.name}</Text>
          <Text>{invoice.clientId?.address}</Text>
          <Text>{invoice.clientId?.mobile}</Text>
        </View>
        <View style={{ flex: 1, textAlign: 'right' }}>
          <Text style={styles.label}>WAREHOUSE LOCATION</Text>
          <Text style={styles.value}>{invoice.warehouseId?.name}</Text>
          <Text>{invoice.warehouseId?.address}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>Commodity Description</Text>
          <Text style={styles.col2}>Weight (MT)</Text>
          <Text style={styles.col3}>Days</Text>
          <Text style={styles.col4}>Rate (₹/MT/Mo)</Text>
          <Text style={styles.col5}>Subtotal</Text>
        </View>
        {invoice.items.map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{item.commodityName}</Text>
            <Text style={styles.col2}>{item.quantityMT}</Text>
            <Text style={styles.col3}>{item.durationDays}</Text>
            <Text style={styles.col4}>₹{item.rateApplied}</Text>
            <Text style={styles.col5}>₹{item.subtotal.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Grand Total:</Text>
        <Text style={styles.totalValue}>₹{invoice.totalAmount.toLocaleString()}</Text>
      </View>

      <View style={styles.footer}>
        <Text>Thank you for choosing WMS Pro Logistics.</Text>
        <Text>This is a computer-generated document. No signature required.</Text>
      </View>
    </Page>
  </Document>
);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    await connectToDatabase();
    // Search by MongoDB _id as the action now returns the ObjectId
    const invoice = await Invoice.findById(params.id)
      .populate('clientId')
      .populate('warehouseId');

    if (!invoice) return new NextResponse('Invoice not found', { status: 404 });

    const stream = await renderToStream(<InvoicePDF invoice={invoice} />);
    
    // Convert stream to Buffer for response
    const chunks = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
