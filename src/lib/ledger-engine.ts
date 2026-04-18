/**
 * Daily Average Inventory Ledger Calculation Engine
 * Implements the "Bucket" algorithm for warehouse storage rent calculation
 * Rent formula: ₹10 per day per MT
 */

export interface Transaction {
  _id: string;
  date: string; // ISO date string
  direction: 'INWARD' | 'OUTWARD';
  mt: number;
  clientName: string;
  commodityName: string;
  gatePass: string;
}

export interface Payment {
  _id: string;
  date: string; // ISO date string
  amount: number;
  clientName: string;
}

export interface LedgerStep {
  stepNo: number;
  startDate: string;
  endDate: string;
  daysDifference: number;
  quantityMT: number;
  ratePerDayPerMT: number;
  rentAmount: number;
  transaction?: {
    id: string;
    direction: 'INWARD' | 'OUTWARD';
    gatePass: string;
  };
}

export interface MatchedRecord {
  _id: string;
  clientName: string;
  date: string;
  location?: string;
  commodity?: string;
  totalMT?: number;
}

export interface LedgerSummary {
  clientName: string;
  ledgerSteps: LedgerStep[];
  totalRent: number;
  totalPaid: number;
  balance: number;
  paymentHistory: Payment[];
  calculationDate: string; // Today's date when calculation was run
}

export interface AggregatedLedgerSummary extends LedgerSummary {
  matchedRecords: MatchedRecord[];
  recordCount: number;
  isAggregated: boolean;
}

// Constant: ₹10 per day per MT
const RATE_PER_DAY_PER_MT = 10;

/**
 * Parse ISO date string to Date object, handling timezone correctly
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr.split('T')[0]);
}

/**
 * Calculate days between two dates (inclusive of start, exclusive of end)
 */
function calculateDaysDifference(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/**
 * Round to 2 decimal places for currency
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Main Ledger Calculation Engine
 * Implements the bucket algorithm: process all transactions chronologically,
 * calculate rent for each interval based on current stock
 */
export function calculateLedger(
  transactions: Transaction[],
  payments: Payment[],
  clientName: string
): LedgerSummary {
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const ledgerSteps: LedgerStep[] = [];
  let currentStock = 0;
  let stepNo = 1;

  // If no transactions, return empty ledger
  if (sortedTransactions.length === 0) {
    return {
      clientName,
      ledgerSteps: [],
      totalRent: 0,
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      balance: 0,
      paymentHistory: payments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      calculationDate: new Date().toISOString().split('T')[0],
    };
  }

  // Process each transaction interval
  for (let i = 0; i < sortedTransactions.length; i++) {
    const currentTxn = sortedTransactions[i];
    const currentDate = parseDate(currentTxn.date);
    
    // Get the previous date (or today if first transaction)
    let previousDate: Date;
    if (i === 0) {
      // For the first transaction, we assume storage started from transaction date
      // But in practice, rent calculation starts from inward date to now
      previousDate = currentDate;
    } else {
      previousDate = parseDate(sortedTransactions[i - 1].date);
    }

    // Calculate rent from previous date to current date
    if (i > 0) {
      const daysDiff = calculateDaysDifference(previousDate, currentDate);
      const rentAmount = roundCurrency(currentStock * RATE_PER_DAY_PER_MT * daysDiff);

      ledgerSteps.push({
        stepNo,
        startDate: sortedTransactions[i - 1].date.split('T')[0],
        endDate: currentTxn.date.split('T')[0],
        daysDifference: daysDiff,
        quantityMT: currentStock,
        ratePerDayPerMT: RATE_PER_DAY_PER_MT,
        rentAmount,
      });

      stepNo++;
    }

    // Update stock after transaction
    if (currentTxn.direction === 'INWARD') {
      currentStock += currentTxn.mt;
    } else {
      currentStock -= currentTxn.mt;
    }

    // Add transaction record
    const lastStep = ledgerSteps[ledgerSteps.length - 1];
    if (lastStep) {
      lastStep.transaction = {
        id: currentTxn._id,
        direction: currentTxn.direction,
        gatePass: currentTxn.gatePass,
      };
    }
  }

  // Final period: from last transaction to today
  if (sortedTransactions.length > 0) {
    const lastTxnDate = parseDate(sortedTransactions[sortedTransactions.length - 1].date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysDiff = calculateDaysDifference(lastTxnDate, today);
    if (daysDiff > 0 && currentStock > 0) {
      const rentAmount = roundCurrency(currentStock * RATE_PER_DAY_PER_MT * daysDiff);

      ledgerSteps.push({
        stepNo,
        startDate: sortedTransactions[sortedTransactions.length - 1].date.split('T')[0],
        endDate: today.toISOString().split('T')[0],
        daysDifference: daysDiff,
        quantityMT: currentStock,
        ratePerDayPerMT: RATE_PER_DAY_PER_MT,
        rentAmount,
      });
    }
  }

  // Calculate totals
  const totalRent = roundCurrency(ledgerSteps.reduce((sum, step) => sum + step.rentAmount, 0));
  const sortedPayments = payments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalPaid = roundCurrency(sortedPayments.reduce((sum, p) => sum + p.amount, 0));
  const balance = roundCurrency(totalRent - totalPaid);

  return {
    clientName,
    ledgerSteps,
    totalRent,
    totalPaid,
    balance,
    paymentHistory: sortedPayments,
    calculationDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Export ledger as CSV (for audit trails)
 */
export function exportLedgerAsCSV(summary: LedgerSummary): string {
  const lines: string[] = [];
  
  lines.push(`Client Name,${summary.clientName}`);
  lines.push(`Calculation Date,${summary.calculationDate}`);
  lines.push('');
  lines.push('LEDGER STEPS');
  lines.push('Step No,Start Date,End Date,Days,Quantity (MT),Rate (₹/day/MT),Rent Amount (₹)');
  
  summary.ledgerSteps.forEach(step => {
    lines.push(
      `${step.stepNo},${step.startDate},${step.endDate},${step.daysDifference},${step.quantityMT},${step.ratePerDayPerMT},${step.rentAmount}`
    );
  });
  
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`Total Rent,${summary.totalRent}`);
  lines.push(`Total Paid,${summary.totalPaid}`);
  lines.push(`Outstanding Balance,${summary.balance}`);
  
  return lines.join('\n');
}
