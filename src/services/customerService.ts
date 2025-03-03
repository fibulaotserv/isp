import { supabase } from '../lib/supabase';
import type { Customer } from '../types/customer';

export async function getActiveCustomersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching active customers count:', error);
    throw new Error('Erro ao buscar quantidade de clientes ativos');
  }

  return count || 0;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer:', error);
    throw new Error('Erro ao buscar cliente');
  }

  // Verificar se data é válido antes de retornar
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new Error('Erro ao buscar cliente: resposta inválida do servidor');
  }

  return data as unknown as Customer;
}

export async function updateCustomer(
  id: string,
  customerData: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'tenant_id'>>
): Promise<Customer> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id || !user.user_metadata) {
    throw new Error('Empresa não encontrada. Por favor, faça login novamente.');
  }

  const { data, error } = await supabase
    .from('customers')
    .update({
      ...customerData,
      tenant_id
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw new Error('Erro ao atualizar cliente');
  }

  // Verificar se data é válido antes de retornar
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new Error('Erro ao atualizar cliente: resposta inválida do servidor');
  }

  return data as unknown as Customer;
}

export async function createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'tenant_id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id || !user.user_metadata) {
    throw new Error('Empresa não encontrada. Por favor, faça login novamente.');
  }

  // Remove empty plan_id to avoid UUID conversion error
  const dataToSend = {
    ...customerData,
    plan_id: customerData.plan_id || null,
    tenant_id
  };

  console.log('Dados a serem enviados para o Supabase:', JSON.stringify(dataToSend, null, 2));

  const { data, error } = await supabase
    .from('customers')
    .insert([dataToSend])
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    if (error.code === '23503') {
      throw new Error('Plano inválido ou pertence a outra empresa');
    }
    throw new Error('Erro ao criar cliente: ' + error.message);
  }

  // Verificar se data é válido antes de retornar
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new Error('Erro ao criar cliente: resposta inválida do servidor');
  }

  return data as unknown as Customer;
}