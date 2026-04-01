'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#334155' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, borderBottom: '1px solid #e2e8f0', paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  companyDetails: { fontSize: 10, color: '#64748b', marginTop: 4 },
  billTo: { marginBottom: 30 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#0f172a' },
  table: { width: '100%', borderTop: '1px solid #e2e8f0', marginTop: 20 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', paddingVertical: 10 },
  tableColHeader: { width: '25%', fontWeight: 'bold', color: '#0f172a' },
  tableCol: { width: '25%' },
  totalsContainer: { marginTop: 30, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: '40%', paddingVertical: 4 },
  grandTotal: { fontWeight: 'bold', borderTop: '1px solid #0f172a', paddingTop: 8, marginTop: 4 }
});

export const InvoiceDocument = ({ invoice }: { invoice: any }) => {
  // Safe Fallbacks for Legacy Database Rows created before the Logistics update
  const cargoName = invoice.commodity || invoice.zone || 'General Freight';
  const duration = invoice.durationDays || 1;
  const rate = invoice.rateApplied || 0;
  
  // Backwards compatibility with old invoices that only had `amount`
  const baseSubtotal = invoice.subtotal || invoice.amount || 0;
  const taxes = invoice.taxAmount || 0;
  const grandTotal = invoice.totalAmount || invoice.amount || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>WMS Pro Logistics</Text>
            <Text style={styles.companyDetails}>123 Warehouse Lane, Industry City, 90210</Text>
            <Text style={styles.companyDetails}>billing@wmspro.com | 1-800-STORAGE</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 20, color: '#3b82f6' }}>INVOICE</Text>
            <Text>#{invoice.id ? invoice.id.substring(0, 8).toUpperCase() : 'UNKNOWN'}</Text>
            <Text style={{ marginTop: 8 }}>
              Date: {invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString() : new Date().toLocaleDateString()}
            </Text>
            <Text>Status: {invoice.status || 'UNKNOWN'}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.sectionTitle}>Billed To:</Text>
          <Text>{invoice.customerName || 'N/A'}</Text>
          <Text>{invoice.clientEmail || 'N/A'}</Text>
          <Text>Account ID: ACC-{invoice.id ? invoice.id.substring(8, 14) : '000000'}</Text>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Description</Text>
            <Text style={styles.tableColHeader}>Duration</Text>
            <Text style={styles.tableColHeader}>Cargo Rate</Text>
            <Text style={styles.tableColHeader}>Line Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol}>Logistics: {cargoName}</Text>
            <Text style={styles.tableCol}>{duration} Days</Text>
            <Text style={styles.tableCol}>${rate.toFixed(2)}/Unit</Text>
            <Text style={styles.tableCol}>${baseSubtotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>${baseSubtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax (18% GST):</Text>
            <Text>${taxes.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total Due:</Text>
            <Text>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};
