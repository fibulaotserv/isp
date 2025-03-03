export interface BillingSettings {
  id: string;
  tenant_id: string;
  grace_period_days: number;
  late_fee_percentage: number;
  daily_interest_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  tenant_id: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_type: 'slip' | 'manual';
  late_fee?: number;
  interest?: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentSlip {
  id: string;
  invoice_id: string;
  tenant_id: string;
  barcode: string;
  our_number: string;
  document_number: string;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}