export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  due_date?: string;
  status: TransactionStatus;
  category: string;
  customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyBalance {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
}