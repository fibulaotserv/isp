import { supabase } from '../lib/supabase';
import type { Invoice, PaymentSlip, BillingSettings } from '../types/billing';

export async function getBillingSettings(): Promise<BillingSettings> {
  const { data, error } = await supabase
    .from('billing_settings')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching billing settings:', error);
    throw new Error('Erro ao carregar configurações de faturamento');
  }

  return data;
}

export async function getCustomerInvoices(customerId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_id', customerId)
    .order('due_date', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    throw new Error('Erro ao carregar faturas');
  }

  return data || [];
}

export async function generateInvoice(
  customerId: string,
  dueDate: string,
  paymentType: 'slip' | 'manual'
): Promise<Invoice> {
  const { data, error } = await supabase
    .rpc('generate_invoice', {
      p_customer_id: customerId,
      p_due_date: dueDate,
      p_payment_type: paymentType
    })
    .single();

  if (error) {
    console.error('Error generating invoice:', error);
    throw new Error('Erro ao gerar fatura');
  }

  return data;
}

export async function getPaymentSlip(invoiceId: string): Promise<PaymentSlip> {
  const { data, error } = await supabase
    .from('payment_slips')
    .select('*')
    .eq('invoice_id', invoiceId)
    .single();

  if (error) {
    console.error('Error fetching payment slip:', error);
    throw new Error('Erro ao carregar boleto');
  }

  return data;
}

export async function registerManualPayment(
  invoiceId: string,
  paymentDate: string
): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_date: paymentDate
    })
    .eq('id', invoiceId);

  if (error) {
    console.error('Error registering payment:', error);
    throw new Error('Erro ao registrar pagamento');
  }
}

export async function updateCustomerStatus(
  customerId: string,
  status: 'active' | 'blocked' | 'cancelled'
): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ status })
    .eq('id', customerId);

  if (error) {
    console.error('Error updating customer status:', error);
    throw new Error('Erro ao atualizar status do cliente');
  }
}