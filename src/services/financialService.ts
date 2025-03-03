import { supabase } from '../lib/supabase';
import type { Transaction, DailyBalance, FinancialSummary } from '../types/financial';

export async function getTransactions(
  startDate: string,
  endDate: string,
  type?: 'income' | 'expense'
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Erro ao buscar transações');
  }

  return data || [];
}

export async function getDailyBalance(
  startDate: string,
  endDate: string
): Promise<DailyBalance[]> {
  const { data, error } = await supabase
    .rpc('get_daily_balance', {
      start_date: startDate,
      end_date: endDate
    });

  if (error) {
    console.error('Error fetching daily balance:', error);
    throw new Error('Erro ao buscar balanço diário');
  }

  return data || [];
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const { data, error } = await supabase
    .rpc('get_financial_summary');

  if (error) {
    console.error('Error fetching financial summary:', error);
    throw new Error('Erro ao buscar resumo financeiro');
  }

  return data || {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpense: 0
  };
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    throw new Error('Tenant not found');
  }

  // Validate customer_id
  if (transaction.customer_id === '') {
    delete transaction.customer_id;
  }

  // Validate dates
  if (!transaction.date) {
    throw new Error('Data da transação é obrigatória');
  }

  // Remove empty due_date
  if (!transaction.due_date) {
    delete transaction.due_date;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      ...transaction,
      tenant_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    if (error.code === '23503') {
      throw new Error('Cliente inválido ou pertence a outro tenant');
    } else if (error.code === '23514') {
      throw new Error('Data de vencimento não pode ser anterior à data da transação');
    } else if (error.code === '22007') {
      throw new Error('Formato de data inválido');
    } else {
      throw new Error('Erro ao criar transação');
    }
  }

  return data;
}

export async function updateTransaction(
  id: string,
  transaction: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(transaction)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw new Error('Erro ao atualizar transação');
  }

  return data;
}