import { supabase } from '../lib/supabase';
import type { Customer } from '../types/customer';

const sanitizeSearchQuery = (query: string): string => {
  return query.replace(/[%,]/g, '');
};

export async function searchCustomers(query: string): Promise<Customer[]> {
  const sanitizedQuery = sanitizeSearchQuery(query);
  const searchPattern = `%${sanitizedQuery}%`;

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.${searchPattern},document.ilike.${searchPattern}`)
    .limit(5);

  if (error) {
    throw error;
  }

  return data || [];
}