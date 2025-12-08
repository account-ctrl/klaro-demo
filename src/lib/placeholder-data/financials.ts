
import { FinancialTransaction } from '@/lib/types';

export const generateFinancialRecords = (count: number): FinancialTransaction[] => {
    return Array.from({ length: 10 }).map((_, i) => ({
        transactionId: `TRX-${100 + i}`,
        transactionType: i % 2 === 0 ? 'Income' : 'Expense',
        amount: (i + 1) * 1000,
        transaction_date: new Date().toISOString(),
        payor_payee: 'Sample Entity',
        category: 'General',
        description: 'Sample transaction',
        status: 'Posted'
    }));
};
